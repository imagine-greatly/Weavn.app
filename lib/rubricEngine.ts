/**
 * lib/rubricEngine.ts — the ONE rubric scan engine, shared by BOTH surfaces:
 *   - /api/v1/scan  (developer API)
 *   - /api/scan     (dashboard)
 *
 * It is the EXACT two-pass logic that previously lived inline in app/api/v1/scan/route.ts
 * (executeScan's rubric branch), extracted verbatim so the two entry points run identical
 * scoring with no fork. Pass-1 status → N-pass reconcile → guard → dimension-weighted coverage
 * score → pass-2 findings narration → ReportPayload assembly.
 *
 * NO RUNTIME Anthropic import — the model client is passed in (typed via `import type`), so this
 * module (and its pure helpers) can be imported by $0 offline harnesses without loading the SDK.
 * Persistence, usage metering, and HTTP shaping stay in the route handlers (surface-specific).
 *
 * Env (read here so both surfaces respect them identically): WEAVN_TERSE_STATUS, WEAVN_STATUS_PASSES.
 */
import type Anthropic from "@anthropic-ai/sdk";
import {
  scopeChecksForScan,
  buildPass1SystemBlocks,
  buildPass1TerseSystemBlocks,
  buildPass2SystemBlocks,
  parseStatusRows,
  parseStatusRowsTerse,
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
  type ApiDimensionKey,
} from "@/lib/rubricScan";
import { getWeightProfile } from "@/lib/benchmarks";
import { realScanCostUsd } from "@/lib/scanCost";
import { computeGrowthScoreFromRubric, type RubricResultRow } from "@/lib/processFindings";
import type { DiagnosticCheck } from "@/lib/diagnosticRubric";
import type { SiteType } from "@/lib/reportSchema";

// Identical guard thresholds + token budgets to the original inline engine.
const SKIP_RATE_CEILING = 0.80;
const BACKFILL_SKIP_CEILING = 0.10;
const PASS1_MAX_TOKENS = 8000;
const PASS1_RETRY_MAX_TOKENS = 12000;
const PASS2_MAX_TOKENS = 16000;

/** Sentinel thrown when the denominator is too contaminated to score confidently (422 upstream). */
export const INSUFFICIENT_EVALUATION = "INSUFFICIENT_EVALUATION";

/** The fixed instruction wrapper around the structured page summary (was inline in route.ts). */
export function wrapSummary(pageSummary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${pageSummary}`;
}

// ── PURE part 1: score the reconciled status set + run the denominator guard ─────
// No model, no I/O — same math as the route's headline computation. Used by runRubricScan AND
// by the $0 offline proof.
export interface RubricScoreResult {
  counts: ReturnType<typeof rubricCounts>;
  apiDims: Record<ApiDimensionKey, number>;
  score: number;
  legacyGrowthScore: number;
  skipRate: number;
  backfillSkipShare: number;
  genuineSkips: number;
  /** Non-null when the guard trips (caller should refuse to emit a confident score). */
  guardReason: string | null;
}
export function scoreRubricStatus(
  statusRows: Array<{ id: string; status: string }>,
  scopedChecks: DiagnosticCheck[],
  siteType: string,
  backfilledCount: number
): RubricScoreResult {
  const counts = rubricCounts(statusRows, scopedChecks);
  const backfillSkips = backfilledCount;
  const genuineSkips = counts.skips - backfillSkips;
  const skipRate = scopedChecks.length > 0 ? counts.skips / scopedChecks.length : 1;
  const backfillSkipShare = counts.skips > 0 ? backfillSkips / counts.skips : 0;

  const apiDims = computeApiDimensions(statusRows);
  const dimWeights = getWeightProfile(siteType);
  const score = Math.min(100, Math.max(0, Math.round(
    API_DIMENSION_KEYS.reduce((sum, k) => sum + (dimWeights[k] ?? 0) * (apiDims[k] ?? 0), 0)
  )));
  const { growthScore: legacyGrowthScore } = computeGrowthScoreFromRubric(statusRows as RubricResultRow[], scopedChecks, null);

  let guardReason: string | null = null;
  if (skipRate > SKIP_RATE_CEILING || backfillSkipShare > BACKFILL_SKIP_CEILING) {
    guardReason = skipRate > SKIP_RATE_CEILING
      ? `skipRate=${(skipRate * 100).toFixed(1)}% > ${SKIP_RATE_CEILING * 100}%`
      : `backfillSkipShare=${(backfillSkipShare * 100).toFixed(1)}% > ${BACKFILL_SKIP_CEILING * 100}% (backfill=${backfillSkips}/${counts.skips} skips, after retry)`;
  }
  return { counts, apiDims, score, legacyGrowthScore, skipRate, backfillSkipShare, genuineSkips, guardReason };
}

// ── PURE part 2: assemble the ReportPayload from statuses + (optional) pass-2 narratives ──
// No model, no I/O. Identical object shape to the original inline route assembly. Used by
// runRubricScan AND the offline proof (with empty narratives).
export interface RubricAssembly {
  score: number;
  dimensions: Record<ApiDimensionKey, number>;
  dimensionRows: ReturnType<typeof computeApiDimensionRows>;
  findings: ReturnType<typeof buildApiFindings>;
  strengths: ReturnType<typeof buildStrengths>;
  summary: string | undefined;
  copyRewrites: { headline?: string; subheadline?: string; cta?: string };
  growthBlueprint: ApiBlueprintItem[];
  pageType: string;
  reportPayload: Record<string, unknown>;
}
export function buildRubricReportPayload(args: {
  statusRows: Array<{ id: string; status: string }>;
  scopedChecks: DiagnosticCheck[];
  siteType: string;
  findingLimit: number;
  scoreOnly: boolean;
  score: RubricScoreResult;
  pageType: string;
  pagesAnalyzed: string[];
  narratives: Map<string, Partial<RubricResultRow>>;
  pass2Summary: string;
  pass2Copy: ApiCopyRewrites;
  pass2Blueprint: ApiBlueprintItem[];
}): RubricAssembly {
  const { statusRows, scopedChecks, siteType, findingLimit, scoreOnly, score: s, pageType, pagesAnalyzed,
    narratives, pass2Summary, pass2Copy, pass2Blueprint } = args;
  const apiDims = s.apiDims;

  // Score-only emits NO findings (pass-2 was skipped) — keep the array empty rather than
  // building narration-less FAIL rows.
  const mergedRows = mergeStatusAndNarrative(statusRows as RubricResultRow[], narratives);
  const apiFindings = scoreOnly ? [] : buildApiFindings(mergedRows, scopedChecks, findingLimit);
  const builtLeaks = buildLeaks(mergedRows, scopedChecks);
  const dimRows = computeApiDimensionRows(statusRows);
  const blueprintStruct = buildGrowthBlueprintStruct(pass2Blueprint);

  const summary = pass2Summary || undefined;
  const copyRewrites = { headline: pass2Copy.headline, subheadline: pass2Copy.subheadline, cta: pass2Copy.cta };
  const strengths = buildStrengths(statusRows as RubricResultRow[], scopedChecks);

  const reportPayload: Record<string, unknown> = {
    site_type: siteType,
    healthScore: s.score,
    conversionScore: s.score,
    growthScore: s.score,
    // Diagnostics for the gated calibration phase — headline is the dimension-weighted
    // score above; legacyGrowthScore is the old deduction score, kept for comparison only.
    scoreMethod: "dimension_weighted",
    legacyGrowthScore: s.legacyGrowthScore,
    pagesAnalyzed,
    diagnosticBrief: summary ?? "",
    intelligenceBrief: summary ?? "",
    dimensionScores: dimRows,
    leaks: builtLeaks.leaks,
    api_findings: apiFindings,
    // API-poll parity fields (namespaced api_* like api_findings so they never collide with
    // the dashboard's typed ReportPayload keys — esp. the existing `metadata`). Read back by
    // GET /api/v1/scans/:id. Additive; dashboard rendering ignores unknown keys.
    api_page_type: pageType,
    api_strengths: strengths,
    api_growth_blueprint: pass2Blueprint,
    categoryScores: categoryScoresFromDimensions(apiDims),
    topLeak: builtLeaks.moneyLeaks[0],
    heroRewrite: {
      currentHeadline: "", currentSubheadline: "", currentCta: "",
      suggestedHeadline: copyRewrites.headline ?? "",
      suggestedSubheadline: copyRewrites.subheadline ?? "",
      suggestedCta: copyRewrites.cta ?? "",
      psychologistsNote: "",
    },
    growthBlueprint: blueprintStruct,
    growthStrategy: { biggestOpportunity: "", trafficOpportunity: "", conversionOpportunity: "", trustOpportunity: "", quickWins: [], thirtyDayPlan: "" },
    moneyLeaks: builtLeaks.moneyLeaks,
    quickWins: builtLeaks.quickWins,
    growthRoadmap: builtLeaks.growthRoadmap,
    totalChecked: scopedChecks.length,
    totalFailed: s.counts.fails,
    criticalCount: s.counts.criticalCount,
    highCount: s.counts.highCount,
    hiddenCount: builtLeaks.hiddenCount,
  };

  return {
    score: s.score, dimensions: apiDims, dimensionRows: dimRows, findings: apiFindings, strengths,
    summary, copyRewrites, growthBlueprint: pass2Blueprint, pageType, reportPayload,
  };
}

// ── The orchestrator (makes model calls via the passed-in client) ────────────────
export interface RunRubricScanResult extends RubricAssembly {
  legacyGrowthScore: number;
  counts: ReturnType<typeof rubricCounts>;
  tokensUsed: number;
  costUsd: number;
}

/**
 * Run the full rubric scan against an already-built page summary. THROWS Error(INSUFFICIENT_EVALUATION)
 * when the denominator guard trips, or Error("Scan failed: …") on a fatal pass-1/model error — the
 * caller maps these to its own metering + HTTP response (this engine does neither).
 */
export async function runRubricScan(params: {
  client: Anthropic;
  analyzeDeadline: Promise<never>;
  summaryContent: string;
  siteType: SiteType;
  findingLimit: number;
  scoreOnly: boolean;
  pagesAnalyzed: string[];
  logLabel: string; // domain, for server logs
}): Promise<RunRubricScanResult> {
  const { client, analyzeDeadline, summaryContent, siteType, findingLimit, scoreOnly, pagesAnalyzed, logLabel } = params;
  const domain = logLabel;

  const scopedChecks = scopeChecksForScan(siteType);
  const scopedById = new Map(scopedChecks.map((c) => [c.id, c]));

  // Verbose (default) vs terse pass-1, selected ONCE behind the flag. Catalog block byte-identical
  // either way, so prompt caching (incl. cross-pass reuse) is intact; only instructions + parser differ.
  const buildStatusBlocks = process.env.WEAVN_TERSE_STATUS === "true" ? buildPass1TerseSystemBlocks : buildPass1SystemBlocks;
  const parseStatus = process.env.WEAVN_TERSE_STATUS === "true" ? parseStatusRowsTerse : parseStatusRows;
  const STATUS_PASSES = Math.max(1, Math.min(7, Number(process.env.WEAVN_STATUS_PASSES ?? 1) || 1));

  let tokensUsed = 0;
  let costUsd = 0;
  let pass1InputTokens = 0, pass1OutputTokens = 0, pass1CacheRead = 0, pass1CacheCreate = 0;
  let pass2InputTokens = 0, pass2OutputTokens = 0, pass2CacheRead = 0;

  const runStatusPass = async (maxTokens: number): Promise<string> => {
    const streamRun = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature: 0,
      system: buildStatusBlocks(scopedChecks),
      messages: [{ role: "user", content: summaryContent }],
    });
    const message = await Promise.race([streamRun.finalMessage(), analyzeDeadline]);
    const u = message.usage;
    tokensUsed += (u?.input_tokens ?? 0) + (u?.output_tokens ?? 0);
    costUsd += realScanCostUsd(u) ?? 0;
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
    pass1 = parseStatus(await runStatusPass(PASS1_MAX_TOKENS), scopedChecks);
    if (pass1.truncated || pass1.backfilledIds.length > 0) {
      console.log(`[rubricEngine] pass1 incomplete | domain=${domain} truncated=${pass1.truncated} backfilled=${pass1.backfilledIds.length}/${scopedChecks.length} — retrying with ${PASS1_RETRY_MAX_TOKENS} tokens`);
      pass1 = parseStatus(await runStatusPass(PASS1_RETRY_MAX_TOKENS), scopedChecks);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed.";
    console.error(`[rubricEngine] PASS1 ERROR | domain=${domain} | ${msg}`);
    throw new Error(`Scan failed: ${msg}`);
  }

  // ── N-PASS RECONCILE (default N=1 → passthrough; statusRows === pass1.rows) ──
  let statusRows: RubricResultRow[] = pass1.rows;
  if (STATUS_PASSES > 1) {
    // The additional status passes are INDEPENDENT re-rolls of the SAME scoped input — they feed a
    // per-id MAJORITY VOTE (reconcileStatuses), which is order-independent — so they run CONCURRENTLY
    // instead of serially. pass-1 stays the FIRST run: reconcileStatuses pins id ORDER to the first
    // run, and Promise.all preserves array order regardless of completion timing, so runsForReconcile
    // (and therefore the reconciled output) is byte-identical to the old serial loop for the same
    // sampled statuses — ONLY wall-time changes. A non-fatal pass failure resolves to null and is
    // dropped exactly as the old loop's catch skipped it; one bad sample never sinks the batch.
    const extraRuns = await Promise.all(
      Array.from({ length: STATUS_PASSES - 1 }, async (_, i) => {
        try {
          const extra = parseStatus(await runStatusPass(PASS1_MAX_TOKENS), scopedChecks);
          return extra.rows.map(r => ({ id: r.id, status: r.status }));
        } catch (e) {
          console.error(`[rubricEngine] status pass ${i + 2}/${STATUS_PASSES} failed (non-fatal): ${e instanceof Error ? e.message : e}`);
          return null;
        }
      })
    );
    const runsForReconcile: Array<{ id: string; status: string }[]> = [
      pass1.rows.map(r => ({ id: r.id, status: r.status })),
      ...extraRuns.filter((r): r is { id: string; status: string }[] => r !== null),
    ];
    const reconciled = reconcileStatuses(runsForReconcile);
    statusRows = reconciled.rows.map(r => ({ id: r.id, status: r.status }));
    console.log(`[rubricEngine] reconcile | domain=${domain} passes=${runsForReconcile.length} flaky=${reconciled.flakyCount}/${scopedChecks.length} meanAgreement=${(reconciled.meanAgreement * 100).toFixed(1)}%`);
  }

  // ── SCORE + GUARD (pure) ──
  const s = scoreRubricStatus(statusRows, scopedChecks, siteType, pass1.backfilledIds.length);

  // Per-dimension answered/skip instrumentation (logged before the guard, as before).
  const perDim: Record<string, { ans: number; skip: number }> = {};
  for (const k of API_DIMENSION_KEYS) perDim[k] = { ans: 0, skip: 0 };
  for (const r of statusRows) {
    const dim = CATEGORY_TO_DIMENSION[scopedById.get(r.id)?.category ?? ""];
    if (!dim || !perDim[dim]) continue;
    const st = String(r.status).toUpperCase();
    if (st === "PASS" || st === "FAIL") perDim[dim].ans++; else perDim[dim].skip++;
  }
  const perDimStr = API_DIMENSION_KEYS.map((k) => `${k}=${perDim[k].ans}/${perDim[k].skip}`).join(" ");
  console.log(`[rubricEngine] pass1 INSTRUMENT | domain=${domain} contentChars=${summaryContent.length} inputTokens=${pass1InputTokens} outputTokens=${pass1OutputTokens} cacheRead=${pass1CacheRead} cacheCreate=${pass1CacheCreate} | denom: total=${scopedChecks.length} answered=${s.counts.passes + s.counts.fails} skip=${s.counts.skips} (genuine=${s.genuineSkips} backfill=${pass1.backfilledIds.length}) skipRate=${(s.skipRate * 100).toFixed(1)}% | perDim(ans/skip): ${perDimStr}`);

  if (s.guardReason) {
    console.log(`[rubricEngine] INSUFFICIENT_EVALUATION | domain=${domain} ${s.guardReason} scored=${s.counts.passes + s.counts.fails}/${scopedChecks.length} — refusing to emit a confident score`);
    throw new Error(INSUFFICIENT_EVALUATION);
  }

  // ── PASS 2 — narrative for FAIL ids only (non-fatal; the score is already final). ──
  const failIds = statusRows.filter((r) => String(r.status).toUpperCase() === "FAIL").map((r) => r.id);
  const narrateIds = topFailIdsByPriority(statusRows, scopedChecks, findingLimit, siteType);
  let narratives: Map<string, Partial<RubricResultRow>> = new Map();
  let pass2Summary = "";
  let pass2Copy: ApiCopyRewrites = {};
  let pass2Blueprint: ApiBlueprintItem[] = [];
  let pass2Truncated = false;
  let pass2ReturnedFails = 0;
  if (scoreOnly) {
    console.log(`[rubricEngine] score-only | domain=${domain} — pass-2 SKIPPED (score=${s.score}, no findings narration)`);
  } else if (narrateIds.length > 0) {
    try {
      const failHooks = process.env.WEAVN_TERSE_STATUS === "true"
        ? new Map(pass1.rows.filter((r) => r.evidence).map((r) => [r.id, r.evidence as string]))
        : null;
      const failLines = narrateIds.map((id) => {
        const hook = failHooks?.get(id);
        return `${id} | ${scopedById.get(id)?.title ?? ""}${hook ? ` | observed: ${hook}` : ""}`;
      }).join("\n");
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
      tokensUsed += (u2?.input_tokens ?? 0) + (u2?.output_tokens ?? 0);
      costUsd += realScanCostUsd(u2) ?? 0;
      pass2InputTokens = u2?.input_tokens ?? 0;
      pass2OutputTokens = u2?.output_tokens ?? 0;
      pass2CacheRead = u2?.cache_read_input_tokens ?? 0;
      console.log(`[rubricEngine] pass2 INSTRUMENT | domain=${domain} contentChars=${pass2User.length} narratedFails=${narrateIds.length}/${failIds.length} inputTokens=${pass2InputTokens} outputTokens=${pass2OutputTokens} cacheRead=${pass2CacheRead}`);
      const block2 = message2.content.find(c => c.type === "text");
      const p2 = parsePass2Narrative(block2 && block2.type === "text" ? block2.text : "");
      narratives = p2.narratives;
      pass2Summary = p2.summary;
      pass2Copy = p2.copyRewrites;
      pass2Blueprint = p2.growthBlueprint;
      pass2Truncated = p2.truncated;
      pass2ReturnedFails = p2.returnedFailRows;
    } catch (err) {
      console.error(`[rubricEngine] PASS2 ERROR (non-fatal) | domain=${domain} | ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`[rubricEngine] DONE | domain=${domain} score=${s.score} legacy_growth=${s.legacyGrowthScore} fails=${s.counts.fails} passes=${s.counts.passes} skips=${s.counts.skips}(genuine=${s.genuineSkips},backfill=${pass1.backfilledIds.length}) skipRate=${(s.skipRate * 100).toFixed(1)}% pass1Returned=${pass1.returnedIds.size}/${scopedChecks.length} pass2Fails=${pass2ReturnedFails}/${failIds.length} pass2Truncated=${pass2Truncated}`);

  const assembly = buildRubricReportPayload({
    statusRows, scopedChecks, siteType, findingLimit, scoreOnly,
    score: s, pageType: pass1.pageType || "homepage", pagesAnalyzed,
    narratives, pass2Summary, pass2Copy, pass2Blueprint,
  });

  return {
    ...assembly,
    legacyGrowthScore: s.legacyGrowthScore,
    counts: s.counts,
    tokensUsed,
    costUsd,
  };
}
