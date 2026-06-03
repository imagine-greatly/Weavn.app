/**
 * POST /api/v1/scan — public API endpoint for conversion audits.
 * Auth: Bearer token validated against api_keys table.
 * Returns structured findings, copy rewrites, and growth blueprint.
 */

import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { scrapeSite } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { runAnalysis, buildPageSummary } from "@/lib/analyze";
import { extractPageData } from "@/lib/analyzePipeline";
import { saveReport } from "@/lib/supabase";
import { generateAndPersistAllFindingBriefs } from "@/lib/findingExtendedAnalysis";
import { validateApiKey } from "@/lib/apiAuth";
import { logScanUsage, checkScanAllowed } from "@/lib/usageTracking";
import { dispatchWebhook } from "@/lib/webhooks";
import type { Leak, DimensionScoreRow, ConversionTransformation, HeroRewrite, GrowthBlueprint, ReportPayload } from "@/lib/reportSchema";
import type { ApiKeyRecord } from "@/lib/apiAuth";

export const maxDuration = 300;

const SCAN_LIMIT = 1000;

function nextMonthUnix(): number {
  const now = new Date();
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000
  );
}

function rlHeaders(apiKey: ApiKeyRecord | null): Record<string, string> {
  if (!apiKey) {
    return {
      "X-RateLimit-Limit": "0",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(nextMonthUnix()),
    };
  }
  return {
    "X-RateLimit-Limit": String(SCAN_LIMIT),
    "X-RateLimit-Remaining": String(Math.max(0, SCAN_LIMIT - apiKey.scans_used)),
    "X-RateLimit-Reset": String(nextMonthUnix()),
  };
}

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

function scoreToVerdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

const DIMENSION_KEY_MAP: Record<string, string> = {
  "Conversion Architecture": "conversion_architecture",
  "Trust Signals": "trust_signals",
  "Message Clarity": "message_clarity",
  "Traffic Readiness": "traffic_readiness",
  "Technical Foundation": "technical_foundation",
};

function mapDimensions(scores: DimensionScoreRow[] | undefined): Record<string, number> {
  const out: Record<string, number> = {
    conversion_architecture: 0,
    trust_signals: 0,
    message_clarity: 0,
    traffic_readiness: 0,
    technical_foundation: 0,
  };
  if (!scores) return out;
  for (const row of scores) {
    const key = DIMENSION_KEY_MAP[row.label];
    if (key) out[key] = typeof row.score === "number" ? row.score : 0;
  }
  return out;
}

function mapFindings(leaks: Leak[] | undefined) {
  if (!leaks?.length) return [];
  return leaks.slice(0, 20).map((leak, i) => ({
    id: `finding_${String(i + 1).padStart(3, "0")}`,
    title: leak.title ?? "",
    severity: leak.severity ?? "warning",
    dimension: leak.category ?? "",
    impact: leak.impactStatement ?? leak.whyItMatters ?? "",
    explanation: leak.whatWeFound ?? "",
    recommendation: leak.howToFixIt ?? "",
    ...(leak.exampleFix ? { rewritten_copy: leak.exampleFix } : {}),
    confidence: leak.severity === "critical" ? "high" : leak.severity === "warning" ? "medium" : "low",
  }));
}

function mapGrowthBlueprint(blueprint: GrowthBlueprint | undefined) {
  if (!blueprint) return [];
  const items: Array<{ priority: number; action: string; effort: string; impact: string; timeframe: string }> = [];
  let priority = 1;
  const lift = blueprint.projectedLift ?? "";
  for (const action of (blueprint.weekOne ?? [])) {
    items.push({ priority: priority++, action, effort: "High", impact: lift, timeframe: "Week 1" });
  }
  for (const action of (blueprint.weekTwoToFour ?? [])) {
    items.push({ priority: priority++, action, effort: "Medium", impact: lift, timeframe: "Weeks 2-4" });
  }
  if (blueprint.monthTwo) {
    items.push({ priority: priority++, action: blueprint.monthTwo, effort: "Low", impact: lift, timeframe: "Month 2" });
  }
  return items;
}

function buildCopyRewrites(ct: ConversionTransformation | undefined, hr: HeroRewrite | undefined) {
  return {
    headline: ct?.rewrittenHeadline ?? hr?.suggestedHeadline ?? undefined,
    subheadline: ct?.rewrittenSubheadline ?? hr?.suggestedSubheadline ?? undefined,
    cta: ct?.rewrittenCta ?? hr?.suggestedCta ?? undefined,
  };
}

export async function POST(req: NextRequest) {
  const scanStart = Date.now();
  console.log("[API v1] scan started", new Date().toISOString());

  // 1. Authenticate
  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401, headers: rlHeaders(null) });
  }

  // 2. Check scan allowed
  const allowedResult = await checkScanAllowed(apiKey.id);
  if (!allowedResult.allowed) {
    return NextResponse.json({ error: "Scan limit reached" }, { status: 403, headers: rlHeaders(apiKey) });
  }

  // 3. Parse request body
  let normalizedUrl: string;
  let pages: number;
  try {
    const body = await req.json();
    const rawUrl = typeof body?.url === "string" ? body.url : "";
    if (!rawUrl) return NextResponse.json({ error: "url is required" }, { status: 400, headers: rlHeaders(apiKey) });
    normalizedUrl = normalizeUrl(rawUrl);
    const rawPages = typeof body?.pages === "number" ? body.pages : 1;
    pages = Math.max(1, Math.min(5, rawPages));
  } catch {
    return NextResponse.json({ error: "url is required" }, { status: 400, headers: rlHeaders(apiKey) });
  }

  if (!normalizedUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400, headers: rlHeaders(apiKey) });
  }
  try { new URL(normalizedUrl); } catch {
    return NextResponse.json({ error: "url is required" }, { status: 400, headers: rlHeaders(apiKey) });
  }

  const domain = getDomain(normalizedUrl);
  if (!domain || !domain.includes(".")) {
    return NextResponse.json({ error: "url is required" }, { status: 400, headers: rlHeaders(apiKey) });
  }

  // Normalize URL for cache key: lowercase, strip trailing slash
  const cacheUrl = normalizedUrl.toLowerCase().replace(/\/+$/, "");

  console.log(`[API v1] START | url=${normalizedUrl} domain=${domain} pages=${pages}`);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Cache check: return a stored result if the same key scanned this domain within 60 minutes.
  // Cache hits skip billing (no logScanUsage) and webhook dispatch.
  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: cachedRow } = await supabaseAdmin
    .from("reports")
    .select("id, domain, analysis, created_at")
    .eq("api_key_id", apiKey.id)
    .eq("domain", domain)
    .neq("status", "error")
    .neq("status", "pending")
    .neq("status", "failed")
    .gte("created_at", sixtyMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cachedRow?.analysis) {
    console.log(`[API v1] CACHE HIT | domain=${domain} cachedId=${cachedRow.id}`);
    const cp = cachedRow.analysis as ReportPayload;
    return NextResponse.json({
      id: cachedRow.id,
      url: cacheUrl,
      score: cp.healthScore,
      verdict: scoreToVerdict(cp.healthScore),
      scanned_at: cachedRow.created_at,
      pages_scanned: Array.isArray(cp.pagesAnalyzed) ? cp.pagesAnalyzed.length : 1,
      dimensions: mapDimensions(cp.dimensionScores),
      summary: cp.diagnosticBrief ?? cp.intelligenceBrief ?? (cp.executiveSummary as { diagnosis?: string } | undefined)?.diagnosis ?? "",
      findings: mapFindings(cp.moneyLeaks ?? cp.primaryFindings ?? cp.priorityFindings ?? cp.leaks),
      copy_rewrites: buildCopyRewrites(cp.conversionTransformation, cp.heroRewrite),
      growth_blueprint: mapGrowthBlueprint(cp.growthBlueprint),
      metadata: { word_count: 0, cta_count: 0, tech_stack: [] },
    }, { headers: { ...rlHeaders(apiKey), "X-Cache": "HIT" } });
  }

  // Insert pending row so status is trackable
  let pendingReportId: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("reports")
      .insert({
        domain,
        user_id: null,
        status: "pending",
        health_score: 0,
        verdict: "pending",
        analysis: {},
        share_token: randomUUID(),
      })
      .select("id")
      .single();
    pendingReportId = (data as { id?: string } | null)?.id ?? null;
  } catch { /* non-fatal */ }

  const markFailed = async () => {
    if (!pendingReportId) return;
    try { await supabaseAdmin.from("reports").update({ status: "failed" }).eq("id", pendingReportId); } catch {}
  };

  // Global deadline — cleared after analysis succeeds so saveReport can always complete
  let deadlineTimerId: ReturnType<typeof setTimeout>;
  const globalDeadline = new Promise<never>((_, reject) => {
    deadlineTimerId = setTimeout(
      () => reject(new Error("[TIMEOUT] Scan exceeded 240s deadline")),
      240_000
    );
  });

  // 4. Scrape (identical pipeline to app/api/scan/route.ts)
  let extraction: Awaited<ReturnType<typeof scrapeSite>> | undefined;
  let scrapeError: Error | null = null;

  try {
    extraction = await Promise.race([scrapeSite(normalizedUrl), globalDeadline]);
  } catch (err) {
    scrapeError = err instanceof Error ? err : new Error("Failed to fetch the site.");
  }

  // Single retry on scrape failure, matching reference route behaviour
  if (scrapeError) {
    console.log("[API v1] scrape failed — waiting 8s and retrying once");
    await new Promise(r => setTimeout(r, 8_000));
    try {
      extraction = await Promise.race([scrapeSite(normalizedUrl), globalDeadline]);
      scrapeError = null;
    } catch (retryErr) {
      scrapeError = retryErr instanceof Error ? retryErr : new Error("Failed to fetch the site.");
    }
  }

  if (scrapeError || !extraction?.rawHtml) {
    await markFailed();
    void logScanUsage(apiKey.id, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error" });
    return NextResponse.json({ error: "Could not extract content from this URL" }, { status: 422, headers: rlHeaders(apiKey) });
  }

  // 5. Detect site type
  const site_type = detectSiteType(extraction);
  console.log(`[API v1] SITE_TYPE | domain=${domain} site_type=${site_type}`);

  // 6. Extract page metadata (word count, CTA count, structured data)
  let wordCount = 0;
  let ctaCount = 0;
  let techStack: string[] = [];
  try {
    const pageData = extractPageData(extraction.rawHtml, normalizedUrl, "homepage");
    wordCount = pageData.wordCount;
    ctaCount = pageData.ctaCount;
    techStack = pageData.structured_data ?? [];
  } catch { /* non-fatal — metadata is best-effort */ }

  // 7. Adaptive analysis timeout (identical to reference route)
  const elapsed = Date.now() - scanStart;
  const complexity = extraction.complexity ?? "medium";
  const isMultiPage = (extraction.additionalPages?.length ?? 0) > 0;

  const baseTimeout = (() => {
    if (isMultiPage) {
      if (complexity === "complex") return 160_000;
      if (complexity === "medium") return 140_000;
      return 120_000;
    }
    if (complexity === "complex") return 200_000;
    if (complexity === "medium") return 130_000;
    return 90_000;
  })();

  const floor = isMultiPage ? 110_000 : 80_000;
  const ceiling = isMultiPage
    ? (complexity === "complex" ? 140_000 : complexity === "medium" ? 115_000 : 85_000)
    : (complexity === "complex" ? 150_000 : complexity === "medium" ? 95_000 : 72_000);

  const analyzeTimeoutMs = Math.min(ceiling, Math.max(floor, baseTimeout - elapsed));
  const analyzeDeadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("[TIMEOUT] Analysis timed out")), analyzeTimeoutMs)
  );

  console.log(`[API v1] ANALYZE START | domain=${domain} complexity=${complexity} analyzeTimeoutMs=${analyzeTimeoutMs}`);

  // 8. Claude analysis — claude-sonnet-4-6 (plan="pro" ensures full model)
  let payload: Awaited<ReturnType<typeof runAnalysis>>;
  try {
    payload = await Promise.race([runAnalysis(extraction, site_type, "pro", undefined), analyzeDeadline]);
    clearTimeout(deadlineTimerId!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    console.error(`[API v1] ANALYZE ERROR | domain=${domain} | ${message}`);
    await markFailed();
    void logScanUsage(apiKey.id, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error" });
    return NextResponse.json({ error: "Scan failed", message }, { status: 500, headers: rlHeaders(apiKey) });
  }

  console.log(`[API v1] ANALYZE DONE | domain=${domain} score=${payload.healthScore}`);

  // 9. Save to reports table (source="api")
  let reportId = "";
  try {
    reportId = await Promise.race([
      saveReport(domain, payload, null, { source: "api", scan_type: "full", reportId: pendingReportId }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("[API v1] saveReport timeout")), 10_000)),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save report.";
    console.error(`[API v1] SAVE ERROR | domain=${domain} | ${message}`);
    await markFailed();
    void logScanUsage(apiKey.id, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error" });
    return NextResponse.json({ error: "Scan failed", message }, { status: 500, headers: rlHeaders(apiKey) });
  }

  console.log(`[API v1] SAVE DONE | domain=${domain} reportId=${reportId}`);

  // Tag report with API key so GET /v1/scans can filter by owner (fire and forget)
  supabaseAdmin
    .from("reports")
    .update({ api_key_id: apiKey.id })
    .eq("id", reportId)
    .then(() => {})
    .catch(() => {});

  // 10. Post-scan hooks (fire and forget)
  const responseTimeMs = Date.now() - scanStart;
  void logScanUsage(apiKey.id, {
    url: normalizedUrl,
    score: payload.healthScore,
    responseTimeMs,
    status: "success",
  });
  dispatchWebhook(apiKey.id, {
    event: "scan.completed",
    scan_id: reportId,
    url: normalizedUrl,
    score: payload.healthScore,
    data: { domain, verdict: scoreToVerdict(payload.healthScore) },
  });

  // Fire-and-forget brief generation (same as reference route)
  const pageSummaryForBriefs = buildPageSummary(extraction);
  void generateAndPersistAllFindingBriefs(reportId, domain, payload, pageSummaryForBriefs).catch((err) => {
    console.log("[API v1] background brief generation failed:", err instanceof Error ? err.message : err);
  });

  console.log(`[API v1] COMPLETE | domain=${domain} reportId=${reportId} elapsed=${responseTimeMs}ms`);

  // 11. Shape and return response
  const findings = mapFindings(
    payload.moneyLeaks ?? payload.primaryFindings ?? payload.priorityFindings ?? payload.leaks
  );

  return NextResponse.json({
    id: reportId,
    url: normalizedUrl,
    score: payload.healthScore,
    verdict: scoreToVerdict(payload.healthScore),
    scanned_at: new Date().toISOString(),
    pages_scanned: extraction.pagesAnalyzed.length,
    dimensions: mapDimensions(payload.dimensionScores),
    summary: payload.diagnosticBrief ?? payload.intelligenceBrief ?? payload.executiveSummary?.diagnosis ?? "",
    findings,
    copy_rewrites: buildCopyRewrites(payload.conversionTransformation, payload.heroRewrite),
    growth_blueprint: mapGrowthBlueprint(payload.growthBlueprint),
    metadata: {
      word_count: wordCount,
      cta_count: ctaCount,
      tech_stack: techStack,
    },
  }, { headers: { ...rlHeaders(apiKey), "X-Cache": "MISS" } });
}
