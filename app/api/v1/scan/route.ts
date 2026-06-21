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
import { scrapeSite, assessRenderCompleteness } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { extractPageData } from "@/lib/analyzePipeline";
import { buildPageSummary } from "@/lib/analyze";
import { saveReport } from "@/lib/supabase";
import { validateApiKey, extractKeyPrefix } from "@/lib/apiAuth";
import { logScanUsage, logRejectedRequest, checkScanAllowed, deductCredits, InsufficientCreditsError } from "@/lib/usageTracking";
import { dispatchWebhook } from "@/lib/webhooks";
import { runMultiPageScan } from "@/lib/multiPageScan";
import { fetchAndFingerprint, fingerprintsMatch } from "@/lib/fingerprint";
import { buildApiPrompt } from "@/lib/apiPrompt";
import { getBenchmark, updateBenchmark, getDimensionBenchmarks, getPercentileLabel, getWeightProfile } from "@/lib/benchmarks";
import { apiError } from "@/lib/apiErrors";
import { calculateScanCost, realScanCostUsd } from "@/lib/scanCost";
import { checkRateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT_PER_MIN } from "@/lib/constants";
import type { ApiKeyRecord } from "@/lib/apiAuth";
import {
  scopeChecksForScan,
  buildPass1SystemBlocks,
  buildPass2SystemBlocks,
  parseStatusRows,
  reconcileStatuses,
  parsePass2Narrative,
  mergeStatusAndNarrative,
  computeApiDimensions,
  computeApiDimensionRows,
  API_DIMENSION_KEYS,
  CATEGORY_TO_DIMENSION,
  buildApiFindings,
  topFailIdsByPriority,
  buildStrengths,
  buildLeaks,
  buildGrowthBlueprintStruct,
  categoryScoresFromDimensions,
  rubricCounts,
  type ApiCopyRewrites,
  type ApiBlueprintItem,
} from "@/lib/rubricScan";
import { computeGrowthScoreFromRubric, type RubricResultRow } from "@/lib/processFindings";

// Gated experimental rubric scoring. DEFAULTS OFF — when WEAVN_RUBRIC_SCORING is
// unset or not exactly "true", /api/v1/scan runs the original self-reported scoring
// path byte-for-byte. Flipping it true is a deliberate, calibrate-then-enable step.
const RUBRIC_SCORING_ENABLED = process.env.WEAVN_RUBRIC_SCORING === "true";

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

// Minimum readable body text (chars) required to analyze — matches the Haiku
// preview "shell HTML" floor in lib/analyze.ts (body text under 150 chars → shell).
// Below this we reject with insufficient_content rather than scoring a shell page.
const MIN_CONTENT_CHARS = 150;

/** Readable body-text length (chars) after stripping scripts, styles, and tags. */
function readableTextLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/**
 * Tolerant parse of a model JSON object that may be truncated at max_tokens.
 * Strict parse first; then minimal repair — isolate from the first '{', drop any
 * trailing prose after the last complete object, and (for genuine truncation) close
 * an open string, drop a trailing comma / dangling "key":, and append the missing
 * closers (innermost-first) computed from a string-aware brace/bracket scan.
 * Returns null only when truly unrecoverable. Never throws.
 */
function tolerantParseJsonObject(raw: string): Record<string, unknown> | null {
  const asObj = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  const tryParse = (s: string): Record<string, unknown> | null => {
    try { return asObj(JSON.parse(s)); } catch { return null; }
  };

  const direct = tryParse(raw);
  if (direct) return direct;

  const start = raw.indexOf("{");
  if (start === -1) return null;
  const body = raw.slice(start);

  // Trailing prose after a complete object.
  const lastBrace = body.lastIndexOf("}");
  if (lastBrace !== -1) {
    const trimmed = tryParse(body.slice(0, lastBrace + 1));
    if (trimmed) return trimmed;
  }

  // Truncation repair: scan tracking string state + open structures.
  const stack: string[] = [];
  let inStr = false, esc = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }

  let candidate = body;
  if (inStr) candidate += '"';                                  // close a value cut mid-string
  candidate = candidate.replace(/[\s,]+$/, "");                 // trailing whitespace / comma
  candidate = candidate.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, ""); // dangling "key": with no value
  candidate = candidate.replace(/[\s,]+$/, "");
  let closing = "";
  while (stack.length) closing += stack.pop();                  // innermost-first
  return tryParse(candidate + closing);
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
    void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error", statusCode: 500, endpoint: "scan", errorCode: "scrape_failed" });
    throw new Error("Could not extract content from this URL");
  }

  // Detect site type and extract metadata
  const site_type = detectSiteType(extraction);
  let wordCount = 0, ctaCount = 0, techStack: string[] = [];
  let headlineCount = 0, linkCount = 0;
  try {
    const pageData = extractPageData(extraction.rawHtml, normalizedUrl, "homepage");
    wordCount = pageData.wordCount;
    ctaCount = pageData.ctaCount;
    techStack = pageData.structured_data ?? [];
    headlineCount = pageData.headlines.length;
    linkCount = pageData.htmlSignals.linkCount;
  } catch { /* best-effort */ }

  // Render-completeness gate — fires BEFORE any model call (no scan/quota/Stripe meter,
  // no model tokens burned) so a DEGRADED render is NEVER silently scored. A
  // wrong-because-degraded diagnosis is worse than no diagnosis. Checks structural
  // landmarks (readable body text + rendered headings + links), not just a byte floor —
  // the old 150-char floor let a 1,418-byte pre-hydration React shell through and scored
  // it 4/100. The scraper retries thin renders first (retry-on-thin); this is the backstop.
  const completeness = assessRenderCompleteness(extraction.rawHtml, { wordCount, headlineCount, linkCount });
  if (!completeness.complete) {
    console.log(`[API v1] DEGRADED_SCRAPE | domain=${domain} | ${completeness.reason} | readable=${completeness.readableChars} words=${wordCount} headings=${headlineCount} links=${linkCount}`);
    await markFailed();
    void logRejectedRequest(apiKeyId, { url: normalizedUrl, statusCode: 422, endpoint: "scan", errorCode: "degraded_scrape", responseTimeMs: Date.now() - scanStart });
    throw new Error("DEGRADED_SCRAPE");
  }

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

  // ── Shared setup ─────────────────────────────────────────────────────────────
  const pageCount = 1 + (extraction.additionalPages?.length ?? 0);

  // Raw-HTML user content for the SELF-REPORTED path (default/live). The rubric path
  // builds a structured summary instead (see summaryContent below) to cut input tokens.
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

  // Normalized analysis outputs — populated by whichever scoring path runs below.
  let tokensUsed: number | undefined;
  let realCostUsd: number | undefined;
  let score: number;
  let page_type: string;
  let strengths: unknown[];
  let summary: string | undefined;
  let findingsReturn: unknown[] | undefined;
  let findingsArr: unknown[];
  let copyRewritesVal: Record<string, string | undefined> | undefined;
  let growthBlueprintVal: unknown[] | undefined;
  let dimensions: Record<string, number>;
  let reportPayload: Record<string, unknown>;

  if (RUBRIC_SCORING_ENABLED) {
    // ── RUBRIC SCORING PATH (gated by WEAVN_RUBRIC_SCORING; experimental) ──────
    // Score + dimensions + findings are COMPUTED from the 308-check rubric results,
    // never self-reported by the model. The scoped catalog is injected as a cached
    // system block BEFORE the HTML (carried in the user message).
    const scopedChecks = scopeChecksForScan(site_type);
    const scopedById = new Map(scopedChecks.map((c) => [c.id, c]));

    // ── PAGE CONTENT = structured summary (NOT raw HTML) ─────────────────────────
    // Both passes consume buildPageSummary()'s dense (~3–5KB) observable summary in
    // place of the 40–70KB raw HTML — a 5–10× input-token cut. The summary carries
    // every observable signal across all 27 categories (incl. the TECHNICAL / HTML
    // SIGNALS block) so the honest denominator holds and checks don't false-SKIP.
    // This is the UNCACHED user-message suffix; the cached check-list system block
    // (buildPass1/2SystemBlocks) is byte-for-byte unchanged, so cache reuse is intact.
    const pageSummary = buildPageSummary(extraction);
    const summaryContent = `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${pageSummary}`;

    // ── TWO-PASS SCORING ────────────────────────────────────────────────────────
    // PASS 1 (status only) returns {id,status} for EVERY scoped check (~3–4K tokens) → a
    // COMPLETE, unbiased denominator; this pass alone determines the score. PASS 2 writes
    // narratives for the FAIL ids only (bounded by fail count). The catalog prefix is cached
    // and shared across both passes. Single-call truncation gutted the catalog tail and
    // inflated dimension scores by shrinking the denominator — two-pass removes that.
    //
    // Guards (thresholds printed in logs):
    //   SKIP_RATE_CEILING = 0.80 — total SKIP rate (Part 1 blank/over-skip guard).
    //   BACKFILL_SKIP_CEILING = 0.10 — share of SKIPs that are truncation-backfill (rows the
    //   model never returned). Approach: PASS 1 should never truncate; if it leaves ANY check
    //   unreturned we retry once with a bigger budget; if backfill SKIPs still exceed 10% of all
    //   SKIPs, the denominator is contaminated by truncation → refuse to emit a confident score.
    const SKIP_RATE_CEILING = 0.80;
    const BACKFILL_SKIP_CEILING = 0.10;
    const PASS1_MAX_TOKENS = 8000;
    const PASS1_RETRY_MAX_TOKENS = 12000;
    const PASS2_MAX_TOKENS = 16000;
    // N-pass status reconciliation (majority vote per check) — fixes status-pass nondeterminism
    // at temp 0. DEFAULT 1 = exactly current behavior (one pass, reconcile is a passthrough), so
    // production is unchanged until WEAVN_STATUS_PASSES is set >1. Double-gated behind the rubric flag.
    const STATUS_PASSES = Math.max(1, Math.min(7, Number(process.env.WEAVN_STATUS_PASSES ?? 1) || 1));

    // Per-pass instrumentation (server logs only; not user-facing). Proves the token
    // drop vs the raw-HTML baseline AND that the cached catalog is reused across passes.
    // Output tokens are tracked per pass too — once input is cut, output dominates cost.
    let pass1InputTokens = 0, pass1OutputTokens = 0, pass1CacheRead = 0, pass1CacheCreate = 0;
    let pass2InputTokens = 0, pass2OutputTokens = 0, pass2CacheRead = 0;

    const runStatusPass = async (maxTokens: number): Promise<string> => {
      const streamRun = client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        temperature: 0,
        system: buildPass1SystemBlocks(scopedChecks),
        messages: [{ role: "user", content: summaryContent }],
      });
      const message = await Promise.race([streamRun.finalMessage(), analyzeDeadline]);
      const u = message.usage;
      tokensUsed = (tokensUsed ?? 0) + (u?.input_tokens ?? 0) + (u?.output_tokens ?? 0);
      realCostUsd = (realCostUsd ?? 0) + (realScanCostUsd(u) ?? 0);
      pass1InputTokens = u?.input_tokens ?? 0;            // last call wins (post-retry)
      pass1OutputTokens = u?.output_tokens ?? 0;
      pass1CacheRead = u?.cache_read_input_tokens ?? 0;
      pass1CacheCreate = u?.cache_creation_input_tokens ?? 0;
      const block = message.content.find(c => c.type === "text");
      if (!block || block.type !== "text") throw new Error("No text content from model.");
      return block.text;
    };

    // ── PASS 1 — status only (scoring). Retry once if anything failed to return. ──
    let pass1: ReturnType<typeof parseStatusRows>;
    try {
      pass1 = parseStatusRows(await runStatusPass(PASS1_MAX_TOKENS), scopedChecks);
      if (pass1.truncated || pass1.backfilledIds.length > 0) {
        console.log(`[API v1] RUBRIC pass1 incomplete | domain=${domain} truncated=${pass1.truncated} backfilled=${pass1.backfilledIds.length}/${scopedChecks.length} — retrying with ${PASS1_RETRY_MAX_TOKENS} tokens`);
        pass1 = parseStatusRows(await runStatusPass(PASS1_RETRY_MAX_TOKENS), scopedChecks);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed.";
      console.error(`[API v1] RUBRIC PASS1 ERROR | domain=${domain} | ${msg}`);
      await markFailed();
      void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error", statusCode: 500, endpoint: "scan", errorCode: "analyze_error" });
      throw new Error(`Scan failed: ${msg}`);
    }

    // ── N-PASS RECONCILE (default N=1 → passthrough; statusRows === pass1.rows) ──
    // When STATUS_PASSES > 1, run extra status passes and reconcile per-check by majority vote
    // so a single flaky vote can't move the headline. Scoring math below consumes statusRows
    // unchanged — reconciliation only produces the status set, it does not alter scoring.
    let statusRows: RubricResultRow[] = pass1.rows;
    if (STATUS_PASSES > 1) {
      const runsForReconcile: Array<{ id: string; status: string }[]> = [pass1.rows.map(r => ({ id: r.id, status: r.status }))];
      for (let i = 1; i < STATUS_PASSES; i++) {
        try {
          const extra = parseStatusRows(await runStatusPass(PASS1_MAX_TOKENS), scopedChecks);
          runsForReconcile.push(extra.rows.map(r => ({ id: r.id, status: r.status })));
        } catch (e) {
          console.error(`[API v1] RUBRIC status pass ${i + 1}/${STATUS_PASSES} failed (non-fatal): ${e instanceof Error ? e.message : e}`);
        }
      }
      const reconciled = reconcileStatuses(runsForReconcile);
      statusRows = reconciled.rows.map(r => ({ id: r.id, status: r.status }));
      console.log(`[API v1] RUBRIC reconcile | domain=${domain} passes=${runsForReconcile.length} flaky=${reconciled.flakyCount}/${scopedChecks.length} meanAgreement=${(reconciled.meanAgreement * 100).toFixed(1)}%`);
    }

    const counts = rubricCounts(statusRows, scopedChecks);
    const backfillSkips = pass1.backfilledIds.length;       // never-returned → truncation-backfill (first pass)
    const genuineSkips = counts.skips - backfillSkips;       // model-emitted SKIP (legitimately out of denominator)
    const skipRate = scopedChecks.length > 0 ? counts.skips / scopedChecks.length : 1;
    const backfillSkipShare = counts.skips > 0 ? backfillSkips / counts.skips : 0;

    // Instrumentation: page-content size (chars proxy) + input/output/cache tokens + denominator.
    // Per-dimension answered/skip lets technical_foundation be read alone (it clusters the
    // observable Mobile/Page-Speed/Accessibility/Universal checks the summary must carry).
    // Logged before the guard so the denominator is visible even on the 422 path.
    const perDim: Record<string, { ans: number; skip: number }> = {};
    for (const k of API_DIMENSION_KEYS) perDim[k] = { ans: 0, skip: 0 };
    for (const r of statusRows) {
      const dim = CATEGORY_TO_DIMENSION[scopedById.get(r.id)?.category ?? ""];
      if (!dim || !perDim[dim]) continue;
      const st = String(r.status).toUpperCase();
      if (st === "PASS" || st === "FAIL") perDim[dim].ans++; else perDim[dim].skip++;
    }
    const perDimStr = API_DIMENSION_KEYS.map((k) => `${k}=${perDim[k].ans}/${perDim[k].skip}`).join(" ");
    console.log(`[API v1] RUBRIC pass1 INSTRUMENT | domain=${domain} contentChars=${summaryContent.length} inputTokens=${pass1InputTokens} outputTokens=${pass1OutputTokens} cacheRead=${pass1CacheRead} cacheCreate=${pass1CacheCreate} | denom: total=${scopedChecks.length} answered=${counts.passes + counts.fails} skip=${counts.skips} (genuine=${genuineSkips} backfill=${backfillSkips}) skipRate=${(skipRate * 100).toFixed(1)}% | perDim(ans/skip): ${perDimStr}`);

    // ── GUARDS: blank/over-skipped (Part 1) OR denominator contaminated by truncation-backfill ──
    if (skipRate > SKIP_RATE_CEILING || backfillSkipShare > BACKFILL_SKIP_CEILING) {
      const reason = skipRate > SKIP_RATE_CEILING
        ? `skipRate=${(skipRate * 100).toFixed(1)}% > ${SKIP_RATE_CEILING * 100}%`
        : `backfillSkipShare=${(backfillSkipShare * 100).toFixed(1)}% > ${BACKFILL_SKIP_CEILING * 100}% (backfill=${backfillSkips}/${counts.skips} skips, after retry)`;
      console.log(`[API v1] RUBRIC INSUFFICIENT_EVALUATION | domain=${domain} ${reason} scored=${counts.passes + counts.fails}/${scopedChecks.length} — refusing to emit a confident score`);
      await markFailed();
      void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error", statusCode: 422, endpoint: "scan", errorCode: "insufficient_evaluation" });
      throw new Error("INSUFFICIENT_EVALUATION");
    }

    // ── HEADLINE SCORE = weighted dimension aggregate on the COMPLETE pass-1 denominator ──
    const apiDims = computeApiDimensions(statusRows);
    const dimWeights = getWeightProfile(site_type);
    const dimWeightedScore = Math.min(100, Math.max(0, Math.round(
      API_DIMENSION_KEYS.reduce((sum, k) => sum + (dimWeights[k] ?? 0) * (apiDims[k] ?? 0), 0)
    )));
    // Legacy deduction score — observability / comparison only, NOT the headline.
    const { growthScore: legacyGrowthScore } = computeGrowthScoreFromRubric(statusRows, scopedChecks, null);

    // ── PASS 2 — narrative for FAIL ids only (non-fatal; the score is already final). ──
    // Rank fails by revenue priority and narrate ONLY the top `findingLimit` — exactly the
    // set buildApiFindings keeps below. Narrating every FAIL then discarding all but
    // findingLimit (the old behavior) burned pass-2 output tokens — the dominant cost — on
    // rows the response never returns. This selects which ids to NARRATE only; pass-1
    // status/score/skip and the denominator are already final and untouched.
    const failIds = statusRows.filter((r) => String(r.status).toUpperCase() === "FAIL").map((r) => r.id);
    const narrateIds = topFailIdsByPriority(statusRows, scopedChecks, findingLimit);
    let narratives: Map<string, Partial<RubricResultRow>> = new Map();
    let pass2Summary = "";
    let pass2Copy: ApiCopyRewrites = {};
    let pass2Blueprint: ApiBlueprintItem[] = [];
    let pass2Truncated = false;
    let pass2ReturnedFails = 0;
    if (narrateIds.length > 0) {
      try {
        const failLines = narrateIds.map((id) => `${id} | ${scopedById.get(id)?.title ?? ""}`).join("\n");
        const pass2User = `${summaryContent}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${failLines}`;
        const streamRun2 = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: PASS2_MAX_TOKENS,
          temperature: 0,
          system: buildPass2SystemBlocks(scopedChecks),
          messages: [{ role: "user", content: pass2User }],
        });
        const pass2Deadline = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("[TIMEOUT] pass2 narrative")), 110_000));
        const message2 = await Promise.race([streamRun2.finalMessage(), pass2Deadline]);
        const u2 = message2.usage;
        tokensUsed = (tokensUsed ?? 0) + (u2?.input_tokens ?? 0) + (u2?.output_tokens ?? 0);
        realCostUsd = (realCostUsd ?? 0) + (realScanCostUsd(u2) ?? 0);
        pass2InputTokens = u2?.input_tokens ?? 0;
        pass2OutputTokens = u2?.output_tokens ?? 0;
        pass2CacheRead = u2?.cache_read_input_tokens ?? 0;
        console.log(`[API v1] RUBRIC pass2 INSTRUMENT | domain=${domain} contentChars=${pass2User.length} narratedFails=${narrateIds.length}/${failIds.length} inputTokens=${pass2InputTokens} outputTokens=${pass2OutputTokens} cacheRead=${pass2CacheRead}`);
        const block2 = message2.content.find(c => c.type === "text");
        const p2 = parsePass2Narrative(block2 && block2.type === "text" ? block2.text : "");
        narratives = p2.narratives;
        pass2Summary = p2.summary;
        pass2Copy = p2.copyRewrites;
        pass2Blueprint = p2.growthBlueprint;
        pass2Truncated = p2.truncated;
        pass2ReturnedFails = p2.returnedFailRows;
      } catch (err) {
        // Non-fatal: the score is final from pass 1; degrade findings narratives only.
        console.error(`[API v1] RUBRIC PASS2 ERROR (non-fatal) | domain=${domain} | ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(`[API v1] RUBRIC | domain=${domain} score=${dimWeightedScore} legacy_growth=${legacyGrowthScore} fails=${counts.fails} passes=${counts.passes} skips=${counts.skips}(genuine=${genuineSkips},backfill=${backfillSkips}) skipRate=${(skipRate * 100).toFixed(1)}% pass1Returned=${pass1.returnedIds.size}/${scopedChecks.length} pass2Fails=${pass2ReturnedFails}/${failIds.length} pass2Truncated=${pass2Truncated}`);

    // ── Merge: pass-1 statuses drive score/dimensions; pass-2 narratives populate findings. ──
    const mergedRows = mergeStatusAndNarrative(statusRows, narratives);
    const apiFindings = buildApiFindings(mergedRows, scopedChecks, findingLimit);
    const builtLeaks = buildLeaks(mergedRows, scopedChecks);
    const dimRows = computeApiDimensionRows(statusRows);
    const blueprintStruct = buildGrowthBlueprintStruct(pass2Blueprint);

    score = dimWeightedScore;
    page_type = pass1.pageType || "homepage";
    strengths = buildStrengths(statusRows, scopedChecks);
    summary = pass2Summary || undefined;
    findingsReturn = apiFindings;
    findingsArr = apiFindings;
    copyRewritesVal = {
      headline: pass2Copy.headline,
      subheadline: pass2Copy.subheadline,
      cta: pass2Copy.cta,
    };
    growthBlueprintVal = pass2Blueprint;
    dimensions = apiDims;

    reportPayload = {
      site_type,
      healthScore: score,
      conversionScore: score,
      growthScore: score,
      // Diagnostics for the gated calibration phase — headline is the dimension-weighted
      // score above; legacyGrowthScore is the old deduction score, kept for comparison only.
      scoreMethod: "dimension_weighted",
      legacyGrowthScore,
      pagesAnalyzed: extraction.pagesAnalyzed,
      diagnosticBrief: summary ?? "",
      intelligenceBrief: summary ?? "",
      dimensionScores: dimRows,
      leaks: builtLeaks.leaks,
      api_findings: apiFindings,
      categoryScores: categoryScoresFromDimensions(apiDims),
      topLeak: builtLeaks.moneyLeaks[0],
      heroRewrite: {
        currentHeadline: "", currentSubheadline: "", currentCta: "",
        suggestedHeadline: copyRewritesVal.headline ?? "",
        suggestedSubheadline: copyRewritesVal.subheadline ?? "",
        suggestedCta: copyRewritesVal.cta ?? "",
        psychologistsNote: "",
      },
      growthBlueprint: blueprintStruct,
      growthStrategy: { biggestOpportunity: "", trafficOpportunity: "", conversionOpportunity: "", trustOpportunity: "", quickWins: [], thirtyDayPlan: "" },
      moneyLeaks: builtLeaks.moneyLeaks,
      quickWins: builtLeaks.quickWins,
      growthRoadmap: builtLeaks.growthRoadmap,
      totalChecked: scopedChecks.length,
      totalFailed: counts.fails,
      criticalCount: counts.criticalCount,
      highCount: counts.highCount,
      hiddenCount: builtLeaks.hiddenCount,
    };
  } else {
    // ── SELF-REPORTED SCORING PATH (default — behaves byte-for-byte as before) ──
    const { systemPrompt } = buildApiPrompt({
      fields: effectiveFields,
      findingLimit,
      findingDepth,
      siteType: site_type,
      pageCount,
    });

    let rawJson: string;
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
      realCostUsd = realScanCostUsd(message.usage);
      const block = message.content.find(c => c.type === "text");
      if (!block || block.type !== "text") throw new Error("No text content from model.");
      rawJson = block.text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed.";
      console.error(`[API v1] ANALYZE ERROR | domain=${domain} | ${msg}`);
      await markFailed();
      void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error", statusCode: 500, endpoint: "scan", errorCode: "analyze_error" });
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
    let parsed: ApiResponse | null = null;
    try {
      parsed = JSON.parse(rawJson) as ApiResponse;
    } catch {
      // Truncated/partial JSON (usually max_tokens) — salvage instead of hard-failing
      // a scan that did the work. Only give up if it's truly unrecoverable.
      parsed = tolerantParseJsonObject(rawJson) as ApiResponse | null;
      if (parsed) {
        console.warn(`[API v1] JSON salvage recovered a truncated response | domain=${domain}`);
      }
    }
    if (!parsed) {
      await markFailed();
      void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error", statusCode: 500, endpoint: "scan", errorCode: "json_parse" });
      throw new Error("Scan failed: invalid JSON response from model.");
    }

    score = Math.min(100, Math.max(0, Math.round(parsed.score ?? 50)));
    page_type = typeof parsed.page_type === "string" ? parsed.page_type : "homepage";
    strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
    summary = parsed.summary;
    findingsReturn = parsed.findings ? (parsed.findings as unknown[]).slice(0, findingLimit) : undefined;
    findingsArr = parsed.findings ? (parsed.findings as unknown[]).slice(0, findingLimit) : [];
    copyRewritesVal = parsed.copy_rewrites;
    growthBlueprintVal = parsed.growth_blueprint;

    const dims: Record<string, number> = { conversion_architecture: 0, trust_signals: 0, message_clarity: 0, traffic_readiness: 0, technical_foundation: 0, objection_handling: 0, offer_clarity: 0 };
    if (parsed.dimensions) {
      for (const [k, v] of Object.entries(parsed.dimensions)) {
        if (k in dims) dims[k] = typeof v === "number" ? v : 0;
      }
    }
    dimensions = dims;

    // Save report — store a minimal ReportPayload-compatible object
    reportPayload = {
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
  }

  const verdict = scoreToVerdict(score);

  let reportId = "";
  try {
    reportId = await Promise.race([
      saveReport(domain, reportPayload as any, null, { source: "api", scan_type: "full", reportId: pendingReportId }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("saveReport timeout")), 10_000)),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save report.";
    await markFailed();
    void logScanUsage(apiKeyId, { url: normalizedUrl, score: null, responseTimeMs: Date.now() - scanStart, status: "error", statusCode: 500, endpoint: "scan", errorCode: "save_failed" });
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
  // Real model cost from token usage; fall back to the synthetic constant only if usage was unavailable.
  const costUsd = realCostUsd ?? calculateScanCost({ pageCount, cached: false });
  void logScanUsage(apiKeyId, { url: normalizedUrl, score, responseTimeMs: durationMs, status: "success", statusCode: 200, endpoint: "scan", pageCount, costUsd, cached: false });
  updateBenchmark(site_type, score);

  // Benchmark
  const benchmark = await getBenchmark(site_type, score).catch(() => null);
  const rawDimBenchmarks = await getDimensionBenchmarks(site_type).catch(() => null);

  // Weights depend only on site type. profile_used keeps the render-complexity label
  // for response continuity; the weights themselves are unchanged from before.
  const weights = getWeightProfile(site_type);
  const weighted_score = Math.min(100, Math.max(0, Math.round(
    Object.entries(dimensions).reduce((sum, [key, val]) => sum + (weights[key] ?? 0) * val, 0)
  )));
  const score_profile = {
    weighted_score,
    profile_used: `${site_type}_${complexity}`,
    weights,
  };

  const findings_summary = findingsArr.length;

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
    summary,
    findings: findingsReturn,
    copyRewrites: copyRewritesVal,
    growthBlueprint: growthBlueprintVal,
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
    void logRejectedRequest(null, { url: "", statusCode: 401, endpoint: "scan", errorCode: "invalid_key", responseTimeMs: Date.now() - scanStart, keyPrefixAttempted: extractKeyPrefix(req) });
    return apiError("AUTH_INVALID", "Invalid API key", 401, rlHeaders(null));
  }

  // 1.5. Per-account rate limit (requests/min) — bounds burst abuse independent of
  // the monthly quota. Fails open on infra error.
  const rl = await checkRateLimit(`api:${apiKey.id}`, API_RATE_LIMIT_PER_MIN);
  if (!rl.allowed) {
    void logRejectedRequest(apiKey.id, { url: "", statusCode: 429, endpoint: "scan", errorCode: "rate_limited", responseTimeMs: Date.now() - scanStart });
    return apiError(
      "RATE_LIMITED",
      `Rate limit exceeded (${API_RATE_LIMIT_PER_MIN} requests/min). Retry in ${rl.retryAfterSeconds}s.`,
      429,
      { ...rlHeaders(apiKey), "Retry-After": String(rl.retryAfterSeconds) }
    );
  }

  // 2. Check scan allowed — must fire before any scrape/analysis cost.
  // Paid API tiers are never hard-blocked here; over-quota scans return
  // allowed=true with overage:true and are billed at the per-scan overage rate.
  const allowedResult = await checkScanAllowed(apiKey.id);
  if (!allowedResult.allowed) {
    void logRejectedRequest(apiKey.id, { url: "", statusCode: 402, endpoint: "scan", errorCode: "quota_exhausted", responseTimeMs: Date.now() - scanStart });
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

  // Log a 400 validation reject, then return the SAME apiError as before — the response
  // body, status, and headers are byte-identical. Shared by every url-validation path below.
  const invalidUrl = () => {
    void logRejectedRequest(apiKey.id, { url: "", statusCode: 400, endpoint: "scan", errorCode: "validation", responseTimeMs: Date.now() - scanStart });
    return apiError("INVALID_URL", "url is required", 400, rlHeaders(apiKey));
  };

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
    if (!rawUrl) return invalidUrl();
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
    return invalidUrl();
  }

  if (!normalizedUrl) return invalidUrl();
  try { new URL(normalizedUrl); } catch {
    return invalidUrl();
  }

  const domain = getDomain(normalizedUrl);
  if (!domain || !domain.includes(".")) {
    return invalidUrl();
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
    if (message === "INSUFFICIENT_CONTENT" || message.includes("INSUFFICIENT_CONTENT")) {
      return NextResponse.json({
        error: {
          code: "INSUFFICIENT_CONTENT",
          message: `This URL has too little readable content to analyze (under ${MIN_CONTENT_CHARS} characters of body text). It may be a shell page, a redirect, or a client-rendered app that returned no static text.`,
          status: 422,
        },
        blocked: false,
        insufficient_content: true,
        min_content_chars: MIN_CONTENT_CHARS,
      }, { status: 422, headers: rlHeaders(apiKey) });
    }
    if (message === "DEGRADED_SCRAPE" || message.includes("DEGRADED_SCRAPE")) {
      return NextResponse.json({
        error: {
          code: "DEGRADED_SCRAPE",
          message: "The page did not render completely enough to analyze (likely a pre-hydration shell, bot-protection stub, or partial render — missing rendered headings/body/links). No score was emitted rather than a misleading one. Retry shortly; transient render failures usually clear.",
          status: 422,
        },
        blocked: false,
        low_confidence: true,
        degraded_scrape: true,
      }, { status: 422, headers: rlHeaders(apiKey) });
    }
    if (message === "INSUFFICIENT_EVALUATION" || message.includes("INSUFFICIENT_EVALUATION")) {
      return NextResponse.json({
        error: {
          code: "INSUFFICIENT_EVALUATION",
          message: "The page returned too few observable checks to score confidently — most checks SKIPped (likely a near-empty or bot-blocked page, or a catastrophically truncated analysis). No score was emitted rather than a misleading one.",
          status: 422,
        },
        blocked: false,
        low_confidence: true,
        insufficient_evaluation: true,
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

// ── Cache reconstruction (rebuild API fields from the stored analysis blob) ────

const API_DIM_KEY_BY_LABEL: Record<string, string> = {
  "conversion architecture": "conversion_architecture",
  "trust signals": "trust_signals",
  "message clarity": "message_clarity",
  "traffic readiness": "traffic_readiness",
  "technical foundation": "technical_foundation",
  "objection handling": "objection_handling",
  "offer clarity": "offer_clarity",
};
const API_DIM_KEYS = new Set(Object.values(API_DIM_KEY_BY_LABEL));

/** Rebuild the dimension score object from stored dimensionScores; null if none recoverable. */
function dimensionsFromStored(ap: Record<string, unknown>): Record<string, number> | null {
  const rows = Array.isArray(ap.dimensionScores) ? ap.dimensionScores : [];
  const out: Record<string, number> = {};
  for (const r of rows) {
    const row = (r ?? {}) as Record<string, unknown>;
    if (typeof row.score !== "number") continue;
    const idStr = String(row.id ?? "").trim().toLowerCase();
    const labelStr = String(row.label ?? "").trim().toLowerCase();
    let key: string | undefined;
    if (API_DIM_KEYS.has(idStr)) key = idStr;
    else if (API_DIM_KEYS.has(labelStr)) key = labelStr;
    else key = API_DIM_KEY_BY_LABEL[labelStr] ?? API_DIM_KEY_BY_LABEL[idStr];
    if (key) out[key] = row.score;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Rebuild copy_rewrites from the stored heroRewrite; null if nothing usable was stored. */
function copyRewritesFromStored(ap: Record<string, unknown>): Record<string, string> | null {
  const hr = (ap.heroRewrite ?? {}) as Record<string, unknown>;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const headline = pick(hr.suggestedHeadline);
  const subheadline = pick(hr.suggestedSubheadline);
  const cta = pick(hr.suggestedCta);
  if (!headline && !subheadline && !cta) return null;
  const out: Record<string, string> = {};
  if (headline) out.headline = headline;
  if (subheadline) out.subheadline = subheadline;
  if (cta) out.cta = cta;
  return out;
}

/** Rebuild the flat growth_blueprint array from the stored GrowthBlueprint struct; null if empty. */
function blueprintFromStored(ap: Record<string, unknown>): unknown[] | null {
  const gb = ap.growthBlueprint as Record<string, unknown> | undefined;
  if (!gb) return null;
  const items: Array<{ priority: number; action: string; effort: string; impact: string; timeframe: string }> = [];
  let p = 1;
  const push = (action: unknown, effort: string, impact: string, timeframe: string) => {
    if (typeof action === "string" && action.trim()) {
      items.push({ priority: p++, action: action.trim(), effort, impact, timeframe });
    }
  };
  for (const a of Array.isArray(gb.weekOne) ? gb.weekOne : []) push(a, "medium", "high", "Week 1");
  for (const a of Array.isArray(gb.weekTwoToFour) ? gb.weekTwoToFour : []) push(a, "medium", "medium", "Weeks 2-4");
  push(gb.monthTwo, "high", "medium", "Month 2");
  return items.length > 0 ? items : null;
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
    metadata: { word_count: 0, cta_count: 0, tech_stack: [] as string[] },
    scan_meta: {
      cached: true,
      cache_reason: cacheReason,
      last_scan: cr.created_at,
    },
  };

  const ap = cr.analysis as Record<string, unknown>;

  // Reconstruct the structured fields from the stored analysis blob instead of
  // returning zeros/empties. Each field is OMITTED when the blob doesn't carry it
  // (honest) rather than faked. X-Cache stays HIT.
  const storedDims = dimensionsFromStored(ap);
  if (storedDims) response.dimensions = storedDims;

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
  if (wantsField("copy_rewrites")) {
    const storedCopy = copyRewritesFromStored(ap);
    if (storedCopy) response.copy_rewrites = storedCopy;
  }
  if (wantsField("growth_blueprint")) {
    const storedBlueprint = blueprintFromStored(ap);
    if (storedBlueprint) response.growth_blueprint = storedBlueprint;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void effectiveFields;

  return NextResponse.json(response, {
    headers: { ...rlHeaders(apiKey), "X-Cache": cacheStatus, "X-Cache-Reason": cacheReason },
  });
}
