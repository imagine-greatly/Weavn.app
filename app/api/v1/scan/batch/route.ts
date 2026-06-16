/**
 * POST /api/v1/scan/batch — run up to 10 scans in parallel.
 * Auth: Bearer token via validateApiKey.
 * Sync: Promise.allSettled — partial failures allowed.
 * Async: returns 202 with scan_ids; scans run in background.
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
import { logScanUsage, checkScanAllowed } from "@/lib/usageTracking";
import { apiError } from "@/lib/apiErrors";
import { dispatchWebhook } from "@/lib/webhooks";
import { fetchAndFingerprint, fingerprintsMatch } from "@/lib/fingerprint";
import { buildApiPrompt } from "@/lib/apiPrompt";
import { updateBenchmark } from "@/lib/benchmarks";
import { calculateScanCost, realScanCostUsd } from "@/lib/scanCost";
import type { ApiKeyRecord } from "@/lib/apiAuth";

export const maxDuration = 300;

const BASE_URL = "https://weavn.app";
const ALL_FIELDS = ["summary", "findings", "copy_rewrites", "growth_blueprint", "benchmark"];
const SCAN_LIMIT = 1000;

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

interface BatchScanOptions {
  url: string;
  apiKey: ApiKeyRecord;
  effectiveFields: string[];
  findingLimit: number;
  findingDepth: "brief" | "full";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
  pendingId?: string;
}

async function runOneScan(opts: BatchScanOptions): Promise<Record<string, unknown>> {
  const { url, apiKey, effectiveFields, findingLimit, findingDepth, supabaseAdmin } = opts;
  const scanStart = Date.now();
  const normalizedUrl = normalizeUrl(url);
  const domain = getDomain(normalizedUrl);

  // Cache check (identical to single scan route)
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

  type CRow = { id: string; analysis: Record<string, unknown>; created_at: string; health_score: number | null; content_fingerprint: string | null };
  let previousScore: number | null = null;
  let reusedFingerprint: string | null = null;

  if (cachedRow) {
    const cr = cachedRow as CRow;
    const live = await fetchAndFingerprint(normalizedUrl);
    if (live === null || fingerprintsMatch(live, cr.content_fingerprint)) {
      // Return cached
      const score = cr.health_score ?? 0;
      return { id: cr.id, url: normalizedUrl, score, verdict: scoreToVerdict(score), scanned_at: cr.created_at, cached: true };
    }
    previousScore = cr.health_score ?? null;
    reusedFingerprint = live;
  }

  // Pending record
  let pendingId = opts.pendingId ?? null;
  if (!pendingId) {
    try {
      const { data } = await supabaseAdmin.from("reports").insert({
        domain, user_id: null, status: "pending", health_score: 0, verdict: "pending", analysis: {}, share_token: randomUUID(), api_key_id: apiKey.id,
      }).select("id").single();
      pendingId = (data as { id?: string } | null)?.id ?? null;
    } catch { /* non-fatal */ }
  }

  const markFailed = async () => {
    if (!pendingId) return;
    try { await supabaseAdmin.from("reports").update({ status: "failed" } as any).eq("id", pendingId); } catch {}
  };

  // Scrape
  let extraction: Awaited<ReturnType<typeof scrapeSite>> | undefined;
  try {
    extraction = await scrapeSite(normalizedUrl);
  } catch {
    try {
      await new Promise(r => setTimeout(r, 4_000));
      extraction = await scrapeSite(normalizedUrl);
    } catch { /* fall through */ }
  }
  if (!extraction?.rawHtml) {
    await markFailed();
    throw new Error(`Could not extract content from ${url}`);
  }

  const site_type = detectSiteType(extraction);
  let wordCount = 0, ctaCount = 0, techStack: string[] = [];
  try {
    const pageData = extractPageData(extraction.rawHtml, normalizedUrl, "homepage");
    wordCount = pageData.wordCount; ctaCount = pageData.ctaCount; techStack = pageData.structured_data ?? [];
  } catch { /* best-effort */ }

  const complexity = extraction.complexity ?? "medium";
  const pageCount = 1 + (extraction.additionalPages?.length ?? 0);
  const { systemPrompt } = buildApiPrompt({ fields: effectiveFields, findingLimit, findingDepth, siteType: site_type, pageCount });

  const hardCap = complexity === "simple" ? 40_000 : complexity === "medium" ? 55_000 : 70_000;
  const safeHtml = extraction.rawHtml.slice(0, hardCap);
  const userContent = `Analyze the following website HTML and return JSON analysis:\n\n=== HOMEPAGE: ${normalizedUrl} ===\n${safeHtml}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 90_000 });
  let rawJson: string;
  let realCostUsd: number | undefined;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      temperature: 0,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });
    realCostUsd = realScanCostUsd(message.usage);
    const block = message.content.find(c => c.type === "text");
    if (!block || block.type !== "text") throw new Error("No text content.");
    rawJson = block.text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  } catch (err) {
    await markFailed();
    throw new Error(`Analysis failed for ${url}: ${err instanceof Error ? err.message : err}`);
  }

  type ApiResponse = { score: number; verdict: string; dimensions: Record<string, number>; summary?: string; findings?: unknown[]; copy_rewrites?: Record<string, string>; growth_blueprint?: unknown[] };
  let parsed: ApiResponse;
  try { parsed = JSON.parse(rawJson) as ApiResponse; } catch {
    await markFailed();
    throw new Error(`Invalid JSON response for ${url}`);
  }

  const score = Math.min(100, Math.max(0, Math.round(parsed.score ?? 50)));

  const reportPayload = {
    site_type, healthScore: score, conversionScore: score, growthScore: score,
    pagesAnalyzed: extraction.pagesAnalyzed, diagnosticBrief: parsed.summary ?? "", intelligenceBrief: parsed.summary ?? "",
    leaks: [], categoryScores: { psychology: 50, messaging: 50, conversion: score, seo: 50, ux: 50, trust: 50 },
    heroRewrite: { currentHeadline: "", currentSubheadline: "", currentCta: "", suggestedHeadline: "", suggestedSubheadline: "", suggestedCta: "", psychologistsNote: "" },
    growthBlueprint: { weekOne: [], weekTwoToFour: [], monthTwo: "", projectedLift: "" },
    growthStrategy: { biggestOpportunity: "", trafficOpportunity: "", conversionOpportunity: "", trustOpportunity: "", quickWins: [], thirtyDayPlan: "" },
  };

  let reportId = "";
  try {
    reportId = await saveReport(domain, reportPayload as any, null, { source: "api", scan_type: "full", reportId: pendingId });
  } catch (err) {
    await markFailed();
    throw new Error(`Failed to save report for ${url}: ${err instanceof Error ? err.message : err}`);
  }

  // Tag + fingerprint (fire and forget)
  const newFingerprint = reusedFingerprint ?? await fetchAndFingerprint(normalizedUrl);
  supabaseAdmin.from("reports").update({
    api_key_id: apiKey.id,
    ...(newFingerprint ? { content_fingerprint: newFingerprint } : {}),
    ...(previousScore !== null ? { previous_score: previousScore, score_delta: score - previousScore } : {}),
  } as any).eq("id", reportId).then(() => {}, () => {});

  const durationMs = Date.now() - scanStart;
  // Real model cost from token usage; fall back to the synthetic constant only if usage was unavailable.
  const costUsd = realCostUsd ?? calculateScanCost({ pageCount, cached: false });
  void logScanUsage(apiKey.id, { url: normalizedUrl, score, responseTimeMs: durationMs, status: "success", pageCount, costUsd, cached: false });
  updateBenchmark(site_type, score);

  const result: Record<string, unknown> = {
    id: reportId, url: normalizedUrl, score, verdict: scoreToVerdict(score),
    scanned_at: new Date().toISOString(), pages_scanned: pageCount, cached: false,
    metadata: { word_count: wordCount, cta_count: ctaCount, tech_stack: techStack },
  };
  if (effectiveFields.includes("summary")) result.summary = parsed.summary ?? "";
  if (effectiveFields.includes("findings")) result.findings = (parsed.findings ?? []).slice(0, findingLimit);
  if (effectiveFields.includes("copy_rewrites")) result.copy_rewrites = parsed.copy_rewrites ?? {};
  if (effectiveFields.includes("growth_blueprint")) result.growth_blueprint = parsed.growth_blueprint ?? [];

  return result;
}

export async function POST(req: NextRequest) {
  const batchStart = Date.now();

  const apiKey = await validateApiKey(req);
  if (!apiKey) return apiError("AUTH_INVALID", "Invalid API key", 401, rlHeaders(null));

  const allowed = await checkScanAllowed(apiKey.id);
  if (!allowed.allowed) return apiError("RATE_LIMIT_EXCEEDED", "Scan limit reached", 403, rlHeaders(apiKey));

  let urls: string[], fields: string[], findingLimit: number, findingDepth: "brief" | "full", asyncMode: boolean;
  try {
    const body = await req.json();
    urls = Array.isArray(body?.urls) ? body.urls.filter((u: unknown) => typeof u === "string" && u.trim()) : [];
    if (urls.length === 0) return apiError("INVALID_REQUEST", "urls is required and must not be empty", 400, rlHeaders(apiKey));
    if (urls.length > 10) return apiError("INVALID_REQUEST", "Maximum 10 URLs per batch request", 400, rlHeaders(apiKey));
    fields = Array.isArray(body?.fields) ? body.fields.filter((f: string) => ALL_FIELDS.includes(f)) : [];
    findingLimit = Math.min(20, Math.max(1, typeof body?.finding_limit === "number" ? body.finding_limit : 10));
    const rawDepth = typeof body?.finding_depth === "string" ? body.finding_depth : "full";
    findingDepth = rawDepth === "brief" ? "brief" : "full";
    asyncMode = body?.async === true;
  } catch {
    return apiError("INVALID_REQUEST", "Invalid request body", 400, rlHeaders(apiKey));
  }

  const effectiveFields = fields.length === 0 ? ALL_FIELDS : fields;
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // ── Async batch mode ──────────────────────────────────────────────────────
  if (asyncMode) {
    const batchId = randomUUID();
    const scanIds: string[] = [];
    const pollUrls: string[] = [];

    // Pre-insert pending records for all URLs
    for (const url of urls) {
      const normalizedUrl = normalizeUrl(url);
      const domain = getDomain(normalizedUrl);
      let scanId: string = randomUUID();
      try {
        const { data } = await supabaseAdmin.from("reports").insert({
          domain, user_id: null, status: "pending", health_score: 0, verdict: "pending", analysis: {}, share_token: randomUUID(), api_key_id: apiKey.id,
        }).select("id").single();
        scanId = (data as { id?: string } | null)?.id ?? scanId;
      } catch { /* use generated UUID */ }
      scanIds.push(scanId);
      pollUrls.push(`${BASE_URL}/api/v1/scans/${scanId}`);
    }

    // Detached background batch (runs within Vercel Pro 300s timeout)
    void (async () => {
      await Promise.allSettled(urls.map((url, i) =>
        runOneScan({ url, apiKey, effectiveFields, findingLimit, findingDepth, supabaseAdmin, pendingId: scanIds[i] })
          .then(result => {
            dispatchWebhook(apiKey.id, { event: "scan.completed", scan_id: result.id as string, url, score: result.score as number, data: { domain: getDomain(url), verdict: result.verdict as string } });
          })
          .catch(err => {
            console.error("[API v1 batch] async scan failed:", url, err instanceof Error ? err.message : err);
            dispatchWebhook(apiKey.id, { event: "scan.failed", scan_id: scanIds[i], url, score: null, data: { error: err instanceof Error ? err.message : "Scan failed" } });
          })
      ));
    })();

    return NextResponse.json({ batch_id: batchId, scan_ids: scanIds, status: "pending", poll_urls: pollUrls }, { status: 202, headers: rlHeaders(apiKey) });
  }

  // ── Sync batch mode ───────────────────────────────────────────────────────
  const settled = await Promise.allSettled(
    urls.map(url => runOneScan({ url, apiKey, effectiveFields, findingLimit, findingDepth, supabaseAdmin }))
  );

  const results = settled.map((r, i) => {
    if (r.status === "fulfilled") {
      return { url: urls[i], status: "success" as const, data: r.value };
    }
    return { url: urls[i], status: "failed" as const, error: r.reason instanceof Error ? r.reason.message : "Scan failed" };
  });

  const succeeded = results.filter(r => r.status === "success").length;
  const failed = results.filter(r => r.status === "failed").length;

  // Dispatch webhooks for completed scans
  for (const r of results) {
    if (r.status === "success" && r.data) {
      dispatchWebhook(apiKey.id, { event: "scan.completed", scan_id: r.data.id as string, url: r.url, score: r.data.score as number, data: { domain: getDomain(r.url), verdict: r.data.verdict as string } });
    }
  }

  return NextResponse.json({
    results,
    summary: { total: urls.length, succeeded, failed, duration_ms: Date.now() - batchStart },
  }, { headers: rlHeaders(apiKey) });
}
