import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeSite } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { runAnalysis } from "@/lib/analyze";

export const maxDuration = 120;

const PREVIEW_MODEL = "claude-haiku-4-5-20251001";
const PREVIEW_HTML_CAP = 8_000;
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
  if (
    !internalKey ||
    !process.env.INTERNAL_SCAN_KEY ||
    internalKey !== process.env.INTERNAL_SCAN_KEY
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalized = normalizeUrl(url);
  if (!normalized) {
    return NextResponse.json({ error: "Please enter a website URL." }, { status: 400 });
  }

  try {
    new URL(normalized);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const domain = getDomain(normalized);
  if (!domain || !domain.includes(".")) {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  // Return cached result if a scan for this domain exists within the last 30 days.
  try {
    const cached = await getCachedPreview(domain);
    if (cached) {
      return NextResponse.json({ domain, ...cached });
    }
  } catch {
    // Cache miss on error — fall through to a fresh scan.
  }

  let extraction;
  try {
    extraction = await scrapeSite(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch the site.";
    const isBlocked =
      /block|forbidden|403|401|access denied|scraping|cannot fetch/i.test(message);
    return NextResponse.json(
      { error: isBlocked ? "This site blocks automated access." : message },
      { status: 422 }
    );
  }

  if (!extraction.rawHtml) {
    return NextResponse.json(
      { error: "No HTML content could be extracted from the URL." },
      { status: 422 }
    );
  }

  // Cap HTML for preview scans to reduce token cost.
  extraction.rawHtml = extraction.rawHtml.slice(0, PREVIEW_HTML_CAP);

  const site_type = detectSiteType(extraction);

  let payload;
  try {
    payload = await runAnalysis(extraction, site_type, PREVIEW_MODEL);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const topLeak = payload.leaks?.[0];
  const topFinding: TopFinding = topLeak
    ? {
        title: topLeak.title,
        description: topLeak.whatWeFound,
        severity: topLeak.severity,
      }
    : null;

  return NextResponse.json({
    domain,
    conversionScore: payload.conversionScore,
    topFinding,
  });
}
