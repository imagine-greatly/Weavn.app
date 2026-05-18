import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeSite } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { runPreviewAnalysis } from "@/lib/analyze";

export const maxDuration = 300;

const PREVIEW_HTML_CAP = 2_000;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function getDomain(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

type TopFinding = { title: string; description: string; severity: string } | null;
type CachedPreview = { conversionScore: number; topFinding: TopFinding } | null;

async function getCachedPreview(domain: string): Promise<CachedPreview> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data } = await supabase
    .from("reports")
    .select("analysis")
    .eq("domain", domain)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const analysis = data.analysis as Record<string, unknown> | null;
  if (!analysis) return null;

  const conversionScore =
    typeof analysis.conversionScore === "number" ? analysis.conversionScore : null;
  if (conversionScore === null) return null;

  const leaks = Array.isArray(analysis.leaks) ? analysis.leaks : [];
  const topLeak = leaks[0] as Record<string, unknown> | undefined;
  const topFinding: TopFinding = topLeak
    ? {
        title: String(topLeak.title ?? ""),
        description: String(topLeak.whatWeFound ?? ""),
        severity: String(topLeak.severity ?? "medium"),
      }
    : null;

  return { conversionScore, topFinding };
}

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get("x-internal-key");
  const expectedKey = process.env.INTERNAL_SCAN_KEY ?? "";
  const authorized =
    internalKey !== null &&
    expectedKey.length > 0 &&
    internalKey.length === expectedKey.length &&
    timingSafeEqual(Buffer.from(internalKey), Buffer.from(expectedKey));
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url : "";
    console.log("[preview] request received for:", body.url);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalized = normalizeUrl(url);
  console.log("[preview] normalized URL:", normalized);
  if (!normalized) {
    return NextResponse.json({ error: "Please enter a website URL." }, { status: 400 });
  }

  try {
    new URL(normalized);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const domain = getDomain(normalized);
  console.log("[preview] scanning domain:", domain);
  if (!domain || !domain.includes(".")) {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  // Return cached result if a scan for this domain exists within the last 30 days.
  try {
    const cached = await getCachedPreview(domain);
    console.log("[preview] cache check done, found:", !!cached);
    if (cached) {
      return NextResponse.json({ domain, ...cached });
    }
  } catch {
    // Cache miss on error — fall through to a fresh scan.
    console.log("[preview] cache check result: not found (error)");
  }

  let extraction;
  try {
    extraction = await scrapeSite(normalized);
    console.log("[preview] scrape done, rawHtml length:", extraction.rawHtml?.length ?? 0);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch the site.";
    const isBlocked =
      /block|forbidden|403|401|access denied|scraping|cannot fetch/i.test(message);
    return NextResponse.json(
      { error: isBlocked ? "This site blocks automated access." : message },
      { status: 422 }
    );
  }

  console.log("[preview] checking if rawHtml is empty");
  if (!extraction.rawHtml) {
    console.log("[preview] scrape failed - rawHtml empty for", domain);
    return NextResponse.json(
      { error: "No HTML content could be extracted from the URL." },
      { status: 422 }
    );
  }

  // Cap HTML for preview scans to reduce token cost.
  extraction.rawHtml = extraction.rawHtml.slice(0, PREVIEW_HTML_CAP);

  const site_type = detectSiteType(extraction);

  const { conversionScore, topFinding } = await runPreviewAnalysis(extraction, site_type);

  return NextResponse.json({ domain, conversionScore, topFinding });
}
