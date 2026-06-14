/**
 * POST /api/v1/scan — public API endpoint for conversion audits.
 * Auth: Bearer token validated against api_keys table.
 * Returns structured findings, copy rewrites, and growth blueprint.
 *
 * NOTE: async=true background scans run within the Vercel Pro 300s
 * function timeout. True long-running jobs should use a queue in V2.
 */

import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { scrapeSite } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { extractPageData } from "@/lib/analyzePipeline";
import { saveReport } from "@/lib/supabase";
import { validateApiKey } from "@/lib/apiAuth";
import { logScanUsage, checkScanAllowed, deductCredits, InsufficientCreditsError } from "@/lib/usageTracking";
import { dispatchWebhook } from "@/lib/webhooks";
import { runMultiPageScan } from "@/lib/multiPageScan";
import { fetchAndFingerprint, fingerprintsMatch } from "@/lib/fingerprint";
import { buildApiPrompt } from "@/lib/apiPrompt";
import { getBenchmark, updateBenchmark, getDimensionBenchmarks, getPercentileLabel, getWeightProfile } from "@/lib/benchmarks";
import { apiError } from "@/lib/apiErrors";
import { calculateScanCost } from "@/lib/scanCost";
import type { ApiKeyRecord } from "@/lib/apiAuth";

export const maxDuration = 300;

const SCAN_LIMIT = 1000;
const BASE_URL = "https://weavn.app";
const ALL_FIELDS = ["summary", "findings", "copy_rewrites", "growth_blueprint", "benchmark"];

// ── helpers ──────────────────────────────────────────────────────────────────

function nextMonthUnix(): number {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000);
}

function rlHeaders(apiKey: ApiKeyRecord | null): Record<string, string> {
  if (!apiKey) return { "X-RateLimit-Limit": "0", "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(nextMonthUnix()), "X-RateLimit-Plan": "none" };
  return {
    "X-RateLimit-Limit": String(SCAN_LIMIT),
    "X-RateLimit-Remaining": String(Math.max(0, SCAN_LIMIT - apiKey.scans_used)),
    "X-RateLimit-Reset": String(nextMonthUnix()),
    "X-RateLimit-Plan": apiKey.plan,
  };
}

function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
}

function getDomain(urlStr: string): string {
  try { return new URL(urlStr).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

function scoreToVerdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Poor";
}

// ── scan executor (shared by sync path and async IIFE) ───────────────────────

interface ScanParams {
  normalizedUrl: string;
  domain: string;
  apiKeyId: string;
  pendingReportId: string | null;
  effectiveFields: string[];
  findingLimit: number;
  findingDepth: "brief" | "full";
  previousScore: number | null;
  cachedFingerprint: string | null;
  scanStart: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
}

interface ScanResult {
  reportId: string;
  score: number;
  verdict: string;
  scannedAt: string;
  pagesScanned: number;
  dimensions: Record<string, number>;
  summary?: string;
  findings?: unknown[];
  copyRewrites?: Record<string, string | undefined>;
  growthBlueprint?: unknown[];
  benchmark?: Record<string, number> | null;
  dimensionBenchmarks?: Record<string, { score: number; average: number; percentile_label: string; p10: number; p90: number }> | null;
  wordCount: number;
  ctaCount: number;
  techStack: string[];
  complexity: string;
  siteType: string;
  durationMs: number;
  tokensUsed?: number;
  newFingerprint: string | null;
  costUsd: number;
  pageCount: number;
  strengths?: unknown[];
  page_type?: string;
  findings_summary?: number;
  score_profile?: { weighted_score: number; profile_used: string; weights: Record<string, number> };
}

async function executeScan(p: ScanParams): Promise<ScanResult> {
  const {
    normalizedUrl, domain, apiKeyId, pendingReportId,
    effectiveFields, findingLimit, findingDepth,
    previousScore, cachedFingerprint, scanStart, supabaseAdmin,
  } = p;

  const markFailed = async () => {
    if (!pendingReportId) return;
    try { await supabaseAdmin.from("reports").update({ status: "failed" } as any).eq("id", pendingReportId); } catch {}
  };

  const globalDeadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("[TIMEOUT] Scan exceeded 240s deadline")), 240_000)
  );

  // Scrape
  let extraction: Awaited<ReturnType<typeof scrapeSite>> | undefined;
  let scrapeError: Error | null = null;
  try {
    extraction = await Promise.race([scrapeSite(normalizedUrl), globalDeadline]);
  } catch (err) {
    scrapeError = err instanceof Error ? err : new Error("Failed to fetch the site.");
  }
  if (scrapeError) {
    await new Promise(r => setTimeout(r, 8_000));
    try {
      extraction = await Promise.race([scrapeSite(normalizedUrl), globalDeadline]);
      scrapeError = null;
    } catch (err) {
      scrapeError = err instanceof Error ? err : new Error("Failed to fetch the site.");
    }
  }
  if (scrapeError || !extraction?.rawHtml) {
    await markFailed();
    void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error" });
    throw new Error("Could not extract content from this URL");
  }

  // Detect site type and extract metadata
  const site_type = detectSiteType(extraction);
  let wordCount = 0, ctaCount = 0, techStack: string[] = [];
  try {
    const pageData = extractPageData(extraction.rawHtml, normalizedUrl, "homepage");
    wordCount = pageData.wordCount;
    ctaCount = pageData.ctaCount;
    techStack = pageData.structured_data ?? [];
  } catch { /* best-effort */ }

  // Adaptive timeout
  const elapsed = Date.now() - scanStart;
  const complexity = extraction.complexity ?? "medium";
  const isMultiPage = (extraction.additionalPages?.length ?? 0) > 0;
  const baseTimeout = isMultiPage
    ? (complexity === "complex" ? 160_000 : complexity === "medium" ? 140_000 : 120_000)
    : (complexity === "complex" ? 200_000 : complexity === "medium" ? 130_000 : 90_000);
  const floor = isMultiPage ? 110_000 : 80_000;
  const ceiling = isMultiPage
    ? (complexity === "complex" ? 140_000 : complexity === "medium" ? 115_000 : 85_000)
    : (complexity === "complex" ? 150_000 : complexity === "medium" ? 95_000 : 72_000);
  const analyzeTimeoutMs = Math.min(ceiling, Math.max(floor, baseTimeout - elapsed));

  // Build prompt
  const pageCount = 1 + (extraction.additionalPages?.length ?? 0);
  const { systemPrompt } = buildApiPrompt({
    fields: effectiveFields,
    findingLimit,
    findingDepth,
    siteType: site_type,
    pageCount,
  });

  // Build user content (raw HTML, same approach as lib/analyze.ts)
  const hardCap = complexity === "simple" ? 40_000 : complexity === "medium" ? 55_000 : 70_000;
  const safeHtml = extraction.rawHtml.slice(0, hardCap);
  const homepageSection = `=== HOMEPAGE: ${normalizedUrl} ===\n${safeHtml}`;
  const subpageSections = (extraction.additionalPages ?? [])
    .map(({ url, rawHtml }) => `=== SUBPAGE: ${url} ===\n${rawHtml.slice(0, 20_000)}`)
    .join("\n\n");
  const userContent = subpageSections
    ? `Analyze ${pageCount} pages. Return JSON analysis.\n\n${homepageSection}\n\n${subpageSections}`
    : `Analyze the following website HTML and return JSON analysis:\n\n${homepageSection}`;

  // Direct Anthropic call
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: analyzeTimeoutMs });
  const analyzeDeadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("[TIMEOUT] Analysis timed out")), analyzeTimeoutMs)
  );

  let rawJson: string;
  let tokensUsed: number | undefined;
  try {
    const message = await Promise.race([
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: isMultiPage ? 8000 : 5000,
        temperature: 0,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userContent }],
      }),
      analyzeDeadline,
    ]);
    tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    const block = message.content.find(c => c.type === "text");
    if (!block || block.type !== "text") throw new Error("No text content from model.");
    rawJson = block.text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed.";
    console.error(`[API v1] ANALYZE ERROR | domain=${domain} | ${msg}`);
    await markFailed();
    void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error" });
    throw new Error(`Scan failed: ${msg}`);
  }

  // Parse response
  type ApiResponse = {
    score: number;
    verdict: string;
    dimensions: Record<string, number>;
    summary?: string;
    findings?: unknown[];
    copy_rewrites?: Record<string, string | undefined>;
    growth_blueprint?: unknown[];
    strengths?: unknown[];
    page_type?: string;
  };
  let parsed: ApiResponse;
  try {
    parsed = JSON.parse(rawJson) as ApiResponse;
  } catch {
    await markFailed();
    void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error" });
    throw new Error("Scan failed: invalid JSON response from model.");
  }

  const score = Math.min(100, Math.max(0, Math.round(parsed.score ?? 50)));
  const verdict = scoreToVerdict(score);
  const page_type = typeof parsed.page_type === "string" ? parsed.page_type : "homepage";
  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];

  // Save report — store a minimal ReportPayload-compatible object
  const reportPayload = {
    site_type,
    healthScore: score,
    conversionScore: score,
    growthScore: score,
    pagesAnalyzed: extraction.pagesAnalyzed,
    diagnosticBrief: parsed.summary ?? "",
    intelligenceBrief: parsed.summary ?? "",
    dimensionScores: parsed.dimensions
      ? Object.entries(parsed.dimensions).map(([label, s], i) => ({
          id: `dim-${i}`,
          label: Object.keys({ conversion_architecture: "Conversion Architecture", trust_signals: "Trust Signals", message_clarity: "Message Clarity", traffic_readiness: "Traffic Readiness", technical_foundation: "Technical Foundation" }).find(k => k === label) ?? label,
          description: "",
          score: typeof s === "number" ? s : 0,
          failCount: 0,
          totalCount: 1,
          status: (typeof s === "number" && s >= 80 ? "strong" : s >= 60 ? "fair" : s >= 40 ? "weak" : "critical") as "strong" | "fair" | "weak" | "critical",
        }))
      : [],
    leaks: [],
    api_findings: parsed.findings ? (parsed.findings as unknown[]).slice(0, findingLimit) : [],
    categoryScores: { psychology: 50, messaging: 50, conversion: score, seo: 50, ux: 50, trust: 50 },
    topLeak: undefined,
    heroRewrite: { currentHeadline: "", currentSubheadline: "", currentCta: "", suggestedHeadline: parsed.copy_rewrites?.headline ?? "", suggestedSubheadline: parsed.copy_rewrites?.subheadline ?? "", suggestedCta: parsed.copy_rewrites?.cta ?? "", psychologistsNote: "" },
    growthBlueprint: { weekOne: [], weekTwoToFour: [], monthTwo: "", projectedLift: "" },
    growthStrategy: { biggestOpportunity: "", trafficOpportunity: "", conversionOpportunity: "", trustOpportunity: "", quickWins: [], thirtyDayPlan: "" },
  };

  let reportId = "";
  try {
    reportId = await Promise.race([
      saveReport(domain, reportPayload as any, null, { source: "api", scan_type: "full", reportId: pendingReportId }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("saveReport timeout")), 10_000)),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save report.";
    await markFailed();
    void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error" });
    throw new Error(`Scan failed: ${msg}`);
  }

  // Tag report with api_key + fingerprint (fire and forget)
  const newFingerprint = cachedFingerprint ?? await fetchAndFingerprint(normalizedUrl);
  const scoreDelta = previousScore !== null ? score - previousScore : undefined;
  supabaseAdmin.from("reports").update({
    api_key_id: apiKeyId,
    ...(newFingerprint ? { content_fingerprint: newFingerprint } : {}),
    ...(previousScore !== null ? { previous_score: previousScore, score_delta: scoreDelta } : {}),
  } as any).eq("id", reportId).then(() => {}, () => {});

  // Post-scan hooks
  const durationMs = Date.now() - scanStart;
  const costUsd = calculateScanCost({ pageCount, cached: false });
  void logScanUsage(apiKeyId, { url: normalizedUrl, score, responseTimeMs: durationMs, status: "success", pageCount, costUsd, cached: false });
  updateBenchmark(site_type, score);

  // Benchmark
  const benchmark = await getBenchmark(site_type, score).catch(() => null);
  const rawDimBenchmarks = await getDimensionBenchmarks(site_type).catch(() => null);

  // Build dimension map
  const dimMap: Record<string, string> = {
    conversion_architecture: "Conversion Architecture",
    trust_signals: "Trust Signals",
    message_clarity: "Message Clarity",
    traffic_readiness: "Traffic Readiness",
    technical_foundation: "Technical Foundation",
    objection_handling: "Objection Handling",
    offer_clarity: "Offer Clarity",
  };
  const dimensions: Record<string, number> = { conversion_architecture: 0, trust_signals: 0, message_clarity: 0, traffic_readiness: 0, technical_foundation: 0, objection_handling: 0, offer_clarity: 0 };
  if (parsed.dimensions) {
    for (const [k, v] of Object.entries(parsed.dimensions)) {
      if (k in dimensions) dimensions[k] = typeof v === "number" ? v : 0;
    }
  }

  const weights = getWeightProfile(site_type, complexity);
  const weighted_score = Math.min(100, Math.max(0, Math.round(
    Object.entries(dimensions).reduce((sum, [key, val]) => sum + (weights[key] ?? 0) * val, 0)
  )));
  const score_profile = {
    weighted_score,
    profile_used: `${site_type}_${complexity}`,
    weights,
  };

  const findings_arr = parsed.findings ? (parsed.findings as unknown[]).slice(0, findingLimit) : [];
  const findings_summary = findings_arr.length;

  const dimensionBenchmarks = rawDimBenchmarks
    ? Object.entries(dimensions).reduce<Record<string, { score: number; average: number; percentile_label: string; p10: number; p90: number }>>((acc, [key, dimScore]) => {
        const bench = rawDimBenchmarks[key];
        if (bench) {
          acc[key] = {
            score: dimScore,
            average: bench.average,
            percentile_label: getPercentileLabel(dimScore, bench.p10, bench.p90, bench.average, site_type),
            p10: bench.p10,
            p90: bench.p90,
          };
        }
        return acc;
      }, {})
    : null;

  return {
    reportId,
    score,
    verdict,
    scannedAt: new Date().toISOString(),
    pagesScanned: extraction.pagesAnalyzed.length,
    dimensions,
    summary: parsed.summary,
    findings: parsed.findings ? (parsed.findings as unknown[]).slice(0, findingLimit) : undefined,
    copyRewrites: parsed.copy_rewrites,
    growthBlueprint: parsed.growth_blueprint,
    benchmark,
    dimensionBenchmarks,
    wordCount,
    ctaCount,
    techStack,
    complexity,
    siteType: site_type,
    durationMs,
    tokensUsed,
    newFingerprint,
    costUsd,
    pageCount,
    strengths,
    page_type,
    findings_summary,
    score_profile,
  };
}

// ── route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const scanStart = Date.now();
  console.log("[API v1] scan started", new Date().toISOString());

  // 1. Auth
  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return apiError("AUTH_INVALID", "Invalid API key", 401, rlHeaders(null));
  }

  // 2. Check scan allowed — must fire before any scrape/analysis cost
  const allowedResult = await checkScanAllowed(apiKey.id);
  if (!allowedResult.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "TRIAL_EXHAUSTED",
          message: `Your ${allowedResult.limit ?? 25}-scan free trial has been used. Upgrade your API key plan to continue.`,
          status: 402,
        },
        reason: allowedResult.reason,
        limit: allowedResult.limit,
        used: allowedResult.used,
      },
      { status: 402, headers: rlHeaders(apiKey) }
    );
  }

  // 3. Parse body
  let normalizedUrl: string;
  let pages: number;
  let fields: string[];
  let findingLimit: number;
  let findingDepth: "brief" | "full";
  let asyncMode: boolean;
  let callbackUrl: string | null;
  let multiPagePaths: string[] | null = null;

  try {
    const body = await req.json();
    const rawUrl = typeof body?.url === "string" ? body.url : "";
    if (!rawUrl) return apiError("INVALID_URL", "url is required", 400, rlHeaders(apiKey));
    normalizedUrl = normalizeUrl(rawUrl);
    pages = Math.max(1, Math.min(5, typeof body?.pages === "number" ? body.pages : 1));
    fields = Array.isArray(body?.fields) ? (body.fields as string[]).filter((f: string) => ALL_FIELDS.includes(f)) : [];
    findingLimit = Math.min(20, Math.max(1, typeof body?.finding_limit === "number" ? body.finding_limit : 10));
    const rawDepth = typeof body?.finding_depth === "string" ? body.finding_depth : "full";
    findingDepth = rawDepth === "brief" ? "brief" : "full";
    asyncMode = body?.async === true;
    callbackUrl = typeof body?.webhook_url === "string" ? body.webhook_url : null;
    const rawPagesList = Array.isArray(body?.pages)
      ? (body.pages as unknown[]).filter((p): p is string => typeof p === "string")
      : null;
    multiPagePaths = rawPagesList && rawPagesList.length > 0 ? rawPagesList : null;
  } catch {
    return apiError("INVALID_URL", "url is required", 400, rlHeaders(apiKey));
  }

  if (!normalizedUrl) return apiError("INVALID_URL", "url is required", 400, rlHeaders(apiKey));
  try { new URL(normalizedUrl); } catch {
    return apiError("INVALID_URL", "url is required", 400, rlHeaders(apiKey));
  }

  const domain = getDomain(normalizedUrl);
  if (!domain || !domain.includes(".")) {
    return apiError("INVALID_URL", "url is required", 400, rlHeaders(apiKey));
  }

  const cacheUrl = normalizedUrl.toLowerCase().replace(/\/+$/, "");
  const effectiveFields = fields.length === 0 ? ALL_FIELDS : fields;
  const wantsField = (f: string) => effectiveFields.includes(f);

  console.log(`[API v1] START | url=${normalizedUrl} domain=${domain} async=${asyncMode} multiPage=${multiPagePaths !== null}`);

  // ── Multi-page mode ───────────────────────────────────────────────────────────

  if (multiPagePaths !== null) {
    if (multiPagePaths.length > 5) {
      return apiError("INVALID_REQUEST", "pages must contain at most 5 entries", 400, rlHeaders(apiKey));
    }
    for (const p of multiPagePaths) {
      if (!p.startsWith("/")) {
        return apiError("INVALID_REQUEST", `pages entries must start with / — invalid: "${p}"`, 400, rlHeaders(apiKey));
      }
    }

    // Compute deduplicated URL count to reserve the right number of credits
    const baseNorm = normalizedUrl.replace(/\/+$/, "");
    const allRaw = [baseNorm, ...multiPagePaths.map(p => `${baseNorm}${p}`)];
    const creditCount = Math.min(5, new Set(allRaw.map(u => u.toLowerCase().replace(/\/+$/, ""))).size);

    try {
      await deductCredits(apiKey.user_id, creditCount);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return apiError("INSUFFICIENT_CREDITS", "Insufficient credits for multi-page scan", 402, rlHeaders(apiKey));
      }
      return apiError("INTERNAL_ERROR", "Failed to verify credits", 500, rlHeaders(apiKey));
    }

    const scanId = randomUUID();
    const pollUrl = `${BASE_URL}/api/v1/scans/${scanId}`;
    const capturedPaths = multiPagePaths;

    void (async () => {
      try {
        await runMultiPageScan(
          normalizedUrl,
          capturedPaths,
          apiKey.user_id,
          apiKey.id,
          { effectiveFields, findingLimit, findingDepth, creditsAlreadyDeducted: true, parentScanId: scanId }
        );
      } catch (err) {
        console.error("[API v1] multi-page scan failed:", err instanceof Error ? err.message : err);
      }
    })();

    return NextResponse.json({
      scan_id: scanId,
      status: "pending",
      poll_url: pollUrl,
      type: "multi",
    }, { status: 202, headers: rlHeaders(apiKey) });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── Cache check with fingerprint ─────────────────────────────────────────

  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: cachedRow } = await supabaseAdmin
    .from("reports")
    .select("id, domain, analysis, created_at, health_score, content_fingerprint")
    .eq("api_key_id", apiKey.id)
    .eq("domain", domain)
    .neq("status", "error")
    .neq("status", "pending")
    .neq("status", "failed")
    .gte("created_at", sixtyMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  type CachedRow = { id: string; domain: string; analysis: Record<string, unknown>; created_at: string; health_score: number | null; content_fingerprint: string | null };

  let previousScore: number | null = null;
  let cachedFingerprintForScan: string | null = null;

  if (cachedRow) {
    const cr = cachedRow as CachedRow;
    const liveFingerprint = await fetchAndFingerprint(normalizedUrl);

    // Branch A: fetch failed → return cache
    if (liveFingerprint === null) {
      console.log(`[API v1] CACHE HIT origin-unavailable | domain=${domain}`);
      return buildCacheResponse(cr, cacheUrl, apiKey, "HIT", "origin-unavailable", wantsField, effectiveFields, findingLimit);
    }

    // Branch B: fingerprint matches → return cache
    if (fingerprintsMatch(liveFingerprint, cr.content_fingerprint)) {
      console.log(`[API v1] CACHE HIT content-unchanged | domain=${domain}`);
      return buildCacheResponse(cr, cacheUrl, apiKey, "HIT", "content-unchanged", wantsField, effectiveFields, findingLimit);
    }

    // Branch C: fingerprint changed → full scan, capture previous score
    console.log(`[API v1] CACHE MISS content-changed | domain=${domain}`);
    previousScore = cr.health_score ?? null;
    cachedFingerprintForScan = liveFingerprint; // reuse below
  }

  // ── Insert pending record ────────────────────────────────────────────────

  let pendingReportId: string | null = null;
  try {
    const { data } = await supabaseAdmin.from("reports").insert({
      domain,
      user_id: null,
      status: "pending",
      health_score: 0,
      verdict: "pending",
      analysis: {},
      share_token: randomUUID(),
      api_key_id: apiKey.id,
    }).select("id").single();
    pendingReportId = (data as { id?: string } | null)?.id ?? null;
  } catch { /* non-fatal */ }

  // ── Async mode ───────────────────────────────────────────────────────────

  if (asyncMode) {
    const scanId = pendingReportId ?? randomUUID();
    const pollUrl = `${BASE_URL}/api/v1/scans/${scanId}`;

    // Detached background scan — runs within Vercel function timeout (300s Pro)
    void (async () => {
      try {
        const result = await executeScan({
          normalizedUrl, domain, apiKeyId: apiKey.id, pendingReportId: scanId,
          effectiveFields, findingLimit, findingDepth,
          previousScore, cachedFingerprint: cachedFingerprintForScan,
          scanStart, supabaseAdmin,
        });
        dispatchWebhook(apiKey.id, {
          event: "scan.completed",
          scan_id: result.reportId,
          url: normalizedUrl,
          score: result.score,
          data: { domain, verdict: result.verdict, score: result.score },
        });
        if (callbackUrl) {
          void fetch(callbackUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scan_id: result.reportId, status: "complete", score: result.score }) }).catch(() => {});
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Scan failed";
        const isBlocked = errMsg === "BOT_BLOCKED" || errMsg.includes("BOT_BLOCKED");
        console.error("[API v1] async scan failed:", errMsg);
        dispatchWebhook(apiKey.id, {
          event: "scan.failed",
          scan_id: scanId,
          url: normalizedUrl,
          score: null,
          data: isBlocked
            ? { domain, blocked: true, code: "BOT_BLOCKED" }
            : { domain, blocked: false, code: "SCAN_FAILED", error: errMsg },
        });
        if (callbackUrl) {
          void fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scan_id: scanId, status: "failed", blocked: isBlocked }),
          }).catch(() => {});
        }
      }
    })();

    return NextResponse.json({
      scan_id: scanId,
      status: "pending",
      poll_url: pollUrl,
      webhook_url: callbackUrl,
    }, { status: 202, headers: rlHeaders(apiKey) });
  }

  // ── Sync mode ─────────────────────────────────────────────────────────────

  let result: ScanResult;
  try {
    result = await executeScan({
      normalizedUrl, domain, apiKeyId: apiKey.id, pendingReportId,
      effectiveFields, findingLimit, findingDepth,
      previousScore, cachedFingerprint: cachedFingerprintForScan,
      scanStart, supabaseAdmin,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed.";
    if (message === "BOT_BLOCKED" || message.includes("BOT_BLOCKED")) {
      return NextResponse.json({
        error: { code: "BOT_BLOCKED", message: "This URL uses bot protection that prevents automated access. Try a different URL.", status: 422 },
        blocked: true,
      }, { status: 422, headers: rlHeaders(apiKey) });
    }
    if (message.includes("Could not extract")) {
      return NextResponse.json({
        error: { code: "EXTRACTION_FAILED", message: "Could not extract content from this URL.", status: 422 },
        blocked: false,
      }, { status: 422, headers: rlHeaders(apiKey) });
    }
    return NextResponse.json({
      error: { code: "SCAN_FAILED", message, status: 500 },
      blocked: false,
    }, { status: 500, headers: rlHeaders(apiKey) });
  }

  dispatchWebhook(apiKey.id, {
    event: "scan.completed",
    scan_id: result.reportId,
    url: normalizedUrl,
    score: result.score,
    data: { domain, verdict: result.verdict },
  });

  console.log(`[API v1] COMPLETE | domain=${domain} reportId=${result.reportId} elapsed=${result.durationMs}ms`);

  const scanMeta: Record<string, unknown> = {
    complexity: result.complexity,
    duration_ms: result.durationMs,
    cached: false,
    cache_reason: cachedRow ? "content-changed" : undefined,
    fingerprint_changed: cachedRow ? true : undefined,
    previous_score: previousScore ?? undefined,
    score_delta: previousScore !== null ? result.score - previousScore : undefined,
    finding_limit: findingLimit,
    finding_depth: findingDepth,
    site_type: result.siteType,
    cost_usd: result.costUsd,
    tokens_used: result.tokensUsed,
  };

  const response: Record<string, unknown> = {
    id: result.reportId,
    url: cacheUrl,
    score: result.score,
    verdict: result.verdict,
    scanned_at: result.scannedAt,
    pages_scanned: result.pagesScanned,
    dimensions: result.dimensions,
    metadata: { word_count: result.wordCount, cta_count: result.ctaCount, tech_stack: result.techStack },
    scan_meta: scanMeta,
  };

  response.page_type = result.page_type ?? "homepage";
  response.score_profile = result.score_profile;
  response.findings_summary = result.findings_summary;
  if (wantsField("summary")) response.summary = result.summary ?? "";
  if (wantsField("findings")) {
    response.findings = result.findings ?? [];
    response.strengths = result.strengths ?? [];
  }
  if (wantsField("copy_rewrites")) response.copy_rewrites = result.copyRewrites ?? {};
  if (wantsField("growth_blueprint")) response.growth_blueprint = result.growthBlueprint ?? [];
  if (wantsField("benchmark") && result.benchmark) response.benchmark = result.benchmark;
  if (wantsField("benchmark") && result.dimensionBenchmarks) response.dimension_benchmarks = result.dimensionBenchmarks;

  // Attach shareable report URL using the share_token set during pending insert
  const { data: tokenRow } = await supabaseAdmin
    .from("reports")
    .select("share_token")
    .eq("id", result.reportId)
    .maybeSingle();
  const shareToken = (tokenRow as { share_token?: string | null } | null)?.share_token;
  if (shareToken) response.report_url = `${BASE_URL}/reports/${shareToken}`;

  return NextResponse.json(response, { headers: { ...rlHeaders(apiKey), "X-Cache": "MISS", "X-Cache-Reason": cachedRow ? "content-changed" : "no-cache" } });
}

// ── Cache response builder ────────────────────────────────────────────────────

function buildCacheResponse(
  cr: { id: string; domain: string; analysis: Record<string, unknown>; created_at: string; health_score: number | null },
  cacheUrl: string,
  apiKey: ApiKeyRecord,
  cacheStatus: string,
  cacheReason: string,
  wantsField: (f: string) => boolean,
  effectiveFields: string[],
  findingLimit: number,
): NextResponse {
  const score = cr.health_score ?? 0;
  const response: Record<string, unknown> = {
    id: cr.id,
    url: cacheUrl,
    score,
    verdict: scoreToVerdict(score),
    scanned_at: cr.created_at,
    pages_scanned: 1,
    dimensions: { conversion_architecture: 0, trust_signals: 0, message_clarity: 0, traffic_readiness: 0, technical_foundation: 0 },
    metadata: { word_count: 0, cta_count: 0, tech_stack: [] as string[] },
    scan_meta: {
      cached: true,
      cache_reason: cacheReason,
      last_scan: cr.created_at,
    },
  };

  const ap = cr.analysis as Record<string, unknown>;
  if (wantsField("summary")) response.summary = String(ap.diagnosticBrief ?? ap.intelligenceBrief ?? "");
  if (wantsField("findings")) {
    const leaks = (ap.leaks as unknown[] | undefined) ?? [];
    response.findings = leaks.slice(0, findingLimit).map((l: unknown, i: number) => {
      const leak = l as Record<string, unknown>;
      return {
        id: `finding_${String(i + 1).padStart(3, "0")}`,
        title: leak.title ?? "",
        severity: leak.severity ?? "warning",
        dimension: leak.category ?? "",
        explanation: leak.whatWeFound ?? "",
        confidence: leak.severity === "critical" ? "high" : "medium",
      };
    });
  }
  if (wantsField("copy_rewrites")) response.copy_rewrites = {};
  if (wantsField("growth_blueprint")) response.growth_blueprint = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void effectiveFields;

  return NextResponse.json(response, {
    headers: { ...rlHeaders(apiKey), "X-Cache": cacheStatus, "X-Cache-Reason": cacheReason },
  });
}
