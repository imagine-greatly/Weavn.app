import { NextRequest, NextResponse } from "next/server";
import { scrapeSite } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { runAnalysis } from "@/lib/analyze";


export const maxDuration = 120;

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

  const site_type = detectSiteType(extraction);

  let payload;
  try {
    payload = await runAnalysis(extraction, site_type);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const topLeak = payload.leaks?.[0];
  const topFinding = topLeak
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
