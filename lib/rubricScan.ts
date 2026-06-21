/**
 * Rubric scan engine — the glue that makes the 311-check rubric actually RUN
 * in the live /api/v1/scan path.
 *
 * Responsibilities (all pure functions — the model call itself lives in the route):
 *  - scope the 311 checks per scan (siteType vocab map)
 *  - serialize the scoped check list into a cacheable prompt block
 *  - tolerantly parse the model's PASS/FAIL/SKIP rows, salvaging truncated output
 *  - compute the 0–100 score (via processFindings) and the 7 API dimensions
 *    (via revenueDimensions.scoreDimensions) FROM the check results
 *  - derive findings / strengths / leaks / category scores from the same results
 *
 * Score + dimensions are computed from the rubric, never self-reported by the model.
 */

import DIAGNOSTIC_CHECKS, { type DiagnosticCheck } from "@/lib/diagnosticRubric";
import {
  scoreDimensions,
  type DimensionDef,
  type DimensionScoreRow,
} from "@/lib/revenueDimensions";
import {
  enrichRubricFailures,
  curateFindings,
  enrichedFindingToLeak,
  sortByRevenuePriority,
  isOwnedChannelGrowthCategory,
  type RubricResultRow,
  type EnrichedRubricFinding,
} from "@/lib/processFindings";
import type { SiteType, Leak, CategoryScores, GrowthBlueprint } from "@/lib/reportSchema";
import { RUBRIC_EVALUATION_SYSTEM_PROMPT } from "@/lib/prompts";

// ── The 7 API dimensions ─────────────────────────────────────────────────────

export type ApiDimensionKey =
  | "conversion_architecture"
  | "trust_signals"
  | "message_clarity"
  | "traffic_readiness"
  | "technical_foundation"
  | "objection_handling"
  | "offer_clarity";

export const API_DIMENSION_KEYS: readonly ApiDimensionKey[] = [
  "conversion_architecture",
  "trust_signals",
  "message_clarity",
  "traffic_readiness",
  "technical_foundation",
  "objection_handling",
  "offer_clarity",
];

const API_DIMENSION_META: Record<ApiDimensionKey, { label: string; description: string }> = {
  conversion_architecture: { label: "Conversion Architecture", description: "The structural machinery that moves a visitor to action" },
  trust_signals: { label: "Trust Signals", description: "Credibility and proof that the offer is real and works" },
  message_clarity: { label: "Message Clarity", description: "How clearly the page communicates what it is and why it matters" },
  traffic_readiness: { label: "Traffic Readiness", description: "Getting found and capturing the traffic that arrives" },
  technical_foundation: { label: "Technical Foundation", description: "The technical and UX substrate the experience runs on" },
  objection_handling: { label: "Objection Handling", description: "Neutralizing the doubts that stop a buyer from converting" },
  offer_clarity: { label: "Offer Clarity", description: "Whether the offer, pricing, and what-you-get are unambiguous" },
};

/**
 * APPROVED 27 → 7 map (Stage 2). Every category maps to exactly one dimension;
 * all 311 checks are covered. The phantom "Emotional Sequence & Page Flow"
 * category from the old REVENUE_DIMENSIONS is intentionally absent.
 * Page & Content Gaps → message_clarity (per reviewer amendment).
 */
export const CATEGORY_TO_DIMENSION: Record<string, ApiDimensionKey> = {
  // conversion_architecture (52)
  "Hero Section": "conversion_architecture",
  "CTA & Conversion": "conversion_architecture",
  "Checkout & Purchase Friction": "conversion_architecture",
  "Conversion Path Expansion": "conversion_architecture",
  // trust_signals (40)
  "Trust & Credibility": "trust_signals",
  "Social Proof": "trust_signals",
  "Specificity & Claim Quality": "trust_signals",
  // message_clarity (47)
  "Messaging & Clarity": "message_clarity",
  "Narrative Flow": "message_clarity",
  "Page & Content Gaps": "message_clarity",
  // traffic_readiness (29)
  "SEO & Metadata": "traffic_readiness",
  "Email & Retention": "traffic_readiness",
  "Return Visitor & Retention": "traffic_readiness",
  // technical_foundation (57)
  "Navigation & UX": "technical_foundation",
  "Mobile Experience": "technical_foundation",
  "Page Speed & Technical": "technical_foundation",
  "Accessibility & Inclusion": "technical_foundation",
  "Universal & Cross-Vertical": "technical_foundation",
  // objection_handling (34)
  "Psychology & Persuasion": "objection_handling",
  "Competitive Differentiation": "objection_handling",
  "Objection Handling": "objection_handling",
  // offer_clarity (52)
  "Offer & Pricing": "offer_clarity",
  "Product Page": "offer_clarity",
  "Offer Clarity": "offer_clarity",
  "SaaS-Specific": "offer_clarity",
  "E-commerce Specific": "offer_clarity",
  "Agency & Service": "offer_clarity",
};

/** Dimension definitions for the generic scorer, derived from the map (single source of truth). */
export const API_DIMENSION_DEFS: DimensionDef[] = API_DIMENSION_KEYS.map((key) => ({
  id: key,
  label: API_DIMENSION_META[key].label,
  description: API_DIMENSION_META[key].description,
  categories: Object.entries(CATEGORY_TO_DIMENSION)
    .filter(([, dim]) => dim === key)
    .map(([cat]) => cat),
}));

// Dev-time guard: every category present in the rubric must be mapped exactly once.
const _unmapped = Array.from(new Set(DIAGNOSTIC_CHECKS.map((c) => c.category))).filter(
  (cat) => !(cat in CATEGORY_TO_DIMENSION)
);
if (_unmapped.length > 0) {
  console.error(`[rubricScan] CATEGORY_TO_DIMENSION is missing categories: ${_unmapped.join(", ")}`);
}

// ── siteType scoping (vocab map: detectSiteType output → rubric siteTypes) ────

/**
 * Maps a detected SiteType to the set of rubric `siteType` values whose checks
 * apply. Universal always applies. Detected types with no matching rubric verticals
 * (content, unknown) get universal-only. Nothing is silently dropped: every rubric
 * check is universal/saas/ecommerce/service, and each is covered by the right detected type.
 */
export function rubricSiteTypesFor(siteType: SiteType): ReadonlySet<string> {
  switch (siteType) {
    case "saas":
      return new Set(["universal", "saas"]);
    case "ecommerce":
      return new Set(["universal", "ecommerce"]);
    case "service":
      return new Set(["universal", "service"]);
    case "local":
      return new Set(["universal", "local"]);
    case "content":
    case "unknown":
    default:
      return new Set(["universal"]);
  }
}

/** The scoped subset of checks for this scan — stable per siteType (cache-friendly). */
export function scopeChecksForScan(siteType: SiteType): DiagnosticCheck[] {
  const allowed = rubricSiteTypesFor(siteType);
  return DIAGNOSTIC_CHECKS.filter((c) => allowed.has(c.siteType)).sort((a, b) => {
    if (a.categoryNumber !== b.categoryNumber) return a.categoryNumber - b.categoryNumber;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Serializes the scoped check list into a single deterministic text block.
 * Stable bytes for a given siteType → cacheable behind a cache_control breakpoint.
 * One line per check: id | category | severity MODE | pageType | failCondition [| PASS: passLabel]
 */
export function serializeChecksForPrompt(checks: DiagnosticCheck[]): string {
  const lines = checks.map((c) => {
    const pass = c.passLabel ? ` | PASS-SIGNAL: ${c.passLabel}` : "";
    return `${c.id} | ${c.category} | ${c.severity} ${c.mode} | pageType:${c.pageType ?? "any"} | ${c.failCondition}${pass}`;
  });
  return `DIAGNOSTIC CHECK CATALOG (${checks.length} checks — evaluate every one):\n${lines.join("\n")}`;
}

// ── System prompt (voice core + output contract) ─────────────────────────────

/**
 * Output contract appended to the revived voice prompt. Defines the single-object
 * JSON shape the parser expects, the SKIP-WHEN-UNOBSERVABLE rule (only FAIL on real
 * on-page evidence; never penalize what static HTML cannot reveal), full-coverage
 * ("one row per check id"), and graceful-truncation guidance (terse PASS/SKIP so the
 * model never runs out of room before covering every id).
 */
const RUBRIC_OUTPUT_CONTRACT = `---

OBSERVABILITY RULE — SKIP WHAT YOU CANNOT SEE (CRITICAL):
You are evaluating STATIC HTML only — no browser, no rendering, no network trace, no runtime. You CANNOT measure page load speed, Core Web Vitals, real performance, animation, lazy-load timing, A/B variants, or any behavior that only exists when the page actually runs. For ANY check whose signal is not directly observable in the static HTML you were given — especially Page Speed & Technical, Core Web Vitals, and rendering/performance checks — return status SKIP, never FAIL. Only return FAIL when there is concrete, quotable evidence in the HTML itself. Never penalize a site for something you did not actually observe. When the signal is ambiguous or unobservable, SKIP.

COVERAGE RULE:
Return exactly one row for EVERY check id supplied in the DIAGNOSTIC CHECK CATALOG — no more, no fewer. Do not invent ids. Do not omit ids. Evaluate them in the order given.

GRACEFUL OUTPUT — NEVER RUN OUT OF ROOM:
Keep PASS and SKIP rows terse: PASS is just {id, status}; SKIP is {id, status, skipReason} with one short sentence. Spend your output budget on FAIL rows that carry real evidence. If you are running low on space, keep emitting compact rows so every id is still covered rather than writing long prose for a few. Any id you do not return a row for will be treated as SKIP — so prioritize coverage over verbosity.

OUTPUT FORMAT — return ONE JSON object only. No markdown, no preamble, start with {:
{
  "page_type": "homepage" | "pricing" | "product" | "about" | "landing",
  "summary": "<the Intelligence Brief opening described above — 3 sentences, score+band, structural verdict, stakes>",
  "copy_rewrites": { "headline": "<max 12 words>", "subheadline": "<max 20 words>", "cta": "<max 5 words>" },
  "growth_blueprint": [ { "priority": <int>, "action": "<max 15 words>", "effort": "low"|"medium"|"high", "impact": "low"|"medium"|"high", "timeframe": "Week 1"|"Weeks 2-4"|"Month 2" } ],
  "results": [
    // one row per catalog check id, in catalog order:
    //   FAIL → { "id", "status": "FAIL", "title", "exitTrigger", "evidence", "conversionCost", "implementation", "effort" }
    //   PASS → { "id", "status": "PASS" }
    //   SKIP → { "id", "status": "SKIP", "skipReason": "<one short sentence>" }
  ]
}`;

/** The full rubric evaluation system prompt: revived voice core + the object/coverage/skip contract. */
export function buildRubricSystemPrompt(): string {
  return `${RUBRIC_EVALUATION_SYSTEM_PROMPT}\n\n${RUBRIC_OUTPUT_CONTRACT}`;
}

/** Anthropic system text block. */
export interface RubricSystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * The system blocks for the rubric call: instructions first, then the scoped check
 * catalog with a cache_control breakpoint. The catalog is stable per siteType, so the
 * whole prefix [instructions + catalog] is cached and reused — and it sits BEFORE the
 * per-scan HTML, which is carried in the user message.
 */
export function buildRubricSystemBlocks(scopedChecks: DiagnosticCheck[]): RubricSystemBlock[] {
  return [
    { type: "text", text: buildRubricSystemPrompt() },
    { type: "text", text: serializeChecksForPrompt(scopedChecks), cache_control: { type: "ephemeral" } },
  ];
}

// ── Tolerant response parsing + salvage ──────────────────────────────────────

export interface ApiCopyRewrites {
  headline?: string;
  subheadline?: string;
  cta?: string;
}

export interface ApiBlueprintItem {
  priority: number;
  action: string;
  effort: string;
  impact: string;
  timeframe: string;
}

export interface ParsedRubric {
  /** One row per scoped check id — missing ids backfilled as SKIP. */
  rows: RubricResultRow[];
  summary: string;
  copyRewrites: ApiCopyRewrites;
  growthBlueprint: ApiBlueprintItem[];
  pageType: string;
  /** True when strict JSON.parse failed and rows were salvaged from partial output. */
  truncated: boolean;
  /** Number of scoped checks the model actually returned a row for (pre-backfill). */
  returnedRows: number;
}

function normStatus(raw: unknown): "PASS" | "FAIL" | "SKIP" {
  const u = String(raw ?? "").trim().toUpperCase();
  if (u === "PASS") return "PASS";
  if (u === "FAIL") return "FAIL";
  return "SKIP";
}

function normalizeRow(r: Record<string, unknown>): RubricResultRow {
  return {
    id: String(r.id ?? "").trim(),
    status: normStatus(r.status),
    evidence: typeof r.evidence === "string" ? r.evidence : undefined,
    title: typeof r.title === "string" ? r.title : undefined,
    exitTrigger: typeof r.exitTrigger === "string" ? r.exitTrigger : undefined,
    conversionCost: typeof r.conversionCost === "string" ? r.conversionCost : undefined,
    implementation: typeof r.implementation === "string" ? r.implementation : undefined,
    effort: typeof r.effort === "string" ? r.effort : undefined,
    skipReason: typeof r.skipReason === "string" ? r.skipReason : undefined,
  };
}

/** Recovers flat row objects (each containing "id" + "status") from possibly-truncated text. */
function salvageRows(text: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  // Flat objects only (rubric rows have no nested objects); a brace inside a quoted
  // string is rare and that row simply degrades to SKIP. Tolerates a truncated tail.
  const re = /\{[^{}]*?"id"\s*:\s*"[^"]+?"[^{}]*?\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[0]) as Record<string, unknown>;
      if (typeof parsed.id === "string") out.push(parsed);
    } catch {
      /* drop the broken fragment */
    }
  }
  return out;
}

function salvageString(text: string, key: string): string {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = text.match(re);
  if (!m) return "";
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return m[1] ?? "";
  }
}

function salvageCopyRewrites(text: string): ApiCopyRewrites {
  const block = text.match(/"copy_rewrites"\s*:\s*\{([\s\S]*?)\}/);
  const scope = block ? block[1] : text;
  const pick = (k: string): string | undefined => {
    const m = scope.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (!m) return undefined;
    try {
      return JSON.parse(`"${m[1]}"`) as string;
    } catch {
      return m[1];
    }
  };
  return { headline: pick("headline"), subheadline: pick("subheadline"), cta: pick("cta") };
}

function coerceBlueprint(raw: unknown): ApiBlueprintItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        priority: typeof o.priority === "number" ? o.priority : 0,
        action: String(o.action ?? ""),
        effort: String(o.effort ?? "medium"),
        impact: String(o.impact ?? "medium"),
        timeframe: String(o.timeframe ?? "Week 1"),
      };
    })
    .filter((b) => b.action.trim().length > 0);
}

/**
 * Parses the model response into rubric rows + extra fields, GUARANTEEING one row per
 * scoped check id (missing → SKIP) and salvaging partial/truncated/malformed output.
 * Never throws — a scan that did work always degrades to a result, never to nothing.
 */
export function parseRubricResponse(rawText: string, scopedChecks: DiagnosticCheck[]): ParsedRubric {
  const cleaned = (rawText ?? "")
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();

  let obj: Record<string, unknown> | null = null;
  let truncated = false;
  try {
    const parsed = JSON.parse(cleaned);
    obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    truncated = true;
  }

  let rawRows: Record<string, unknown>[] = [];
  let summary = "";
  let copyRewrites: ApiCopyRewrites = {};
  let growthBlueprint: ApiBlueprintItem[] = [];
  let pageType = "homepage";

  if (obj) {
    const resultsField = Array.isArray(obj.results) ? obj.results : Array.isArray(obj) ? obj : [];
    rawRows = (resultsField as unknown[]).filter(
      (r): r is Record<string, unknown> => !!r && typeof r === "object"
    );
    summary = typeof obj.summary === "string" ? obj.summary : "";
    copyRewrites =
      obj.copy_rewrites && typeof obj.copy_rewrites === "object"
        ? (obj.copy_rewrites as ApiCopyRewrites)
        : {};
    growthBlueprint = coerceBlueprint(obj.growth_blueprint);
    pageType = typeof obj.page_type === "string" ? obj.page_type : "homepage";
  } else {
    // Salvage path — strict parse failed (almost always truncation mid-results).
    rawRows = salvageRows(cleaned);
    summary = salvageString(cleaned, "summary");
    copyRewrites = salvageCopyRewrites(cleaned);
    growthBlueprint = []; // tail field; not recoverable from a truncated body
    pageType = salvageString(cleaned, "page_type") || "homepage";
  }

  // Index returned rows by id (case-insensitive), then backfill every scoped id.
  const byId = new Map<string, RubricResultRow>();
  for (const raw of rawRows) {
    const row = normalizeRow(raw);
    if (!row.id) continue;
    byId.set(row.id, row);
    byId.set(row.id.toUpperCase(), row);
  }

  const rows: RubricResultRow[] = scopedChecks.map((c) => {
    const found = byId.get(c.id) ?? byId.get(c.id.toUpperCase());
    if (found) return found;
    return { id: c.id, status: "SKIP", skipReason: "No result returned — salvaged as skip." };
  });

  const returnedRows = new Set(rawRows.map((r) => String(r.id ?? "").trim()).filter(Boolean)).size;

  return { rows, summary, copyRewrites, growthBlueprint, pageType, truncated, returnedRows };
}

// ── Scoring + dimensions FROM the rubric results ─────────────────────────────

/** Per-dimension rows (7) computed from the rubric results via the shared weighted scorer. */
export function computeApiDimensionRows(rows: Array<{ id: string; status: string }>): DimensionScoreRow[] {
  return scoreDimensions(rows, API_DIMENSION_DEFS);
}

/** The 7-dim response object (every key present; 0 when no evaluated checks in that dimension). */
export function computeApiDimensions(
  rows: Array<{ id: string; status: string }>
): Record<ApiDimensionKey, number> {
  const out = {} as Record<ApiDimensionKey, number>;
  for (const k of API_DIMENSION_KEYS) out[k] = 0;
  for (const row of computeApiDimensionRows(rows)) {
    out[row.id as ApiDimensionKey] = row.score;
  }
  return out;
}

/** Best-effort legacy categoryScores derived from the new dimension scores. */
export function categoryScoresFromDimensions(dims: Record<ApiDimensionKey, number>): CategoryScores {
  return {
    conversion: dims.conversion_architecture,
    trust: dims.trust_signals,
    messaging: dims.message_clarity,
    seo: dims.traffic_readiness,
    ux: dims.technical_foundation,
    psychology: dims.objection_handling,
  };
}

// ── Findings / strengths / leaks derived from the rubric results ─────────────

export interface ApiFinding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  dimension: string;
  category: string;
  impact: "high" | "medium" | "low";
  impact_estimate: string;
  explanation: string;
  fix_steps: string[];
  rewritten_copy?: string;
  confidence: "high" | "medium" | "low";
  fix_effort: "hours" | "days" | "weeks";
  priority: number;
  rubric_check_title: string;
}

function severityLower(sev: string): "critical" | "high" | "medium" | "low" {
  const s = sev.toLowerCase();
  return s === "critical" || s === "high" || s === "medium" || s === "low" ? s : "medium";
}

function impactFromSeverity(sev: string): "high" | "medium" | "low" {
  const s = sev.toLowerCase();
  if (s === "critical" || s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function fixEffortFromRevenue(effort?: string): "hours" | "days" | "weeks" {
  if (effort === "Today") return "hours";
  if (effort === "This Month") return "weeks";
  return "days";
}

function dimensionLabelForCategory(category: string): string {
  const key = CATEGORY_TO_DIMENSION[category];
  return key ? API_DIMENSION_META[key].label : category;
}

function toApiFinding(f: EnrichedRubricFinding, priority: number): ApiFinding {
  const fixText = f.fix?.trim() || f.howToFixIt?.trim() || "";
  return {
    id: f.id,
    title: (f.revenueTitle?.trim() || f.title).trim(),
    severity: severityLower(f.severity),
    dimension: dimensionLabelForCategory(f.category),
    category: f.category,
    impact: impactFromSeverity(f.severity),
    impact_estimate: f.impactStatement?.trim() || "",
    explanation: f.evidence?.trim() || f.failCondition,
    fix_steps: fixText ? [fixText] : [],
    ...(fixText ? { rewritten_copy: undefined } : {}),
    confidence: impactFromSeverity(f.severity),
    fix_effort: fixEffortFromRevenue(f.revenueEffort ?? undefined),
    priority,
    rubric_check_title: f.title,
  };
}

/** Ranked API findings (revenue-priority order), capped at findingLimit. */
export function buildApiFindings(
  rows: RubricResultRow[],
  scopedChecks: DiagnosticCheck[],
  findingLimit: number
): ApiFinding[] {
  const byId = new Map(scopedChecks.map((c) => [c.id, c]));
  const enriched = enrichRubricFailures(rows, byId);
  const sorted = sortByRevenuePriority(enriched);
  return sorted.slice(0, findingLimit).map((f, i) => toApiFinding(f, i + 1));
}

/**
 * The top `limit` FAIL ids in the SAME revenue-priority order buildApiFindings keeps.
 * Pass 2 should narrate ONLY these — narrating every FAIL then discarding all but
 * `limit` (buildApiFindings caps at findingLimit) burns output tokens for rows the
 * response never returns. This is a pure read over pass-1 status rows + the catalog;
 * it does NOT touch status/scoring/skip, so the denominator is unaffected.
 */
/**
 * Select which FAIL ids to narrate in pass 2, in headline order. Page-grounded findings lead and are
 * SPREAD across categories (round-robin) so the headline set reflects the page's distinct failure modes
 * instead of flooding with the single top category; generic owned-channel growth GAPs (email / referral /
 * loyalty / retention) are appended only after every page-grounded finding. Deterministic.
 */
export function topFailIdsByPriority(
  rows: RubricResultRow[],
  scopedChecks: DiagnosticCheck[],
  limit: number,
  siteType?: string
): string[] {
  const byId = new Map(scopedChecks.map((c) => [c.id, c]));
  const enriched = enrichRubricFailures(rows, byId);
  const sorted = sortByRevenuePriority(enriched, siteType);
  const pageGrounded = sorted.filter((f) => !isOwnedChannelGrowthCategory(f.category));
  const ownedChannel = sorted.filter((f) => isOwnedChannelGrowthCategory(f.category));
  const ordered = [...diversifyByCategory(pageGrounded), ...ownedChannel];
  return ordered.slice(0, limit).map((f) => f.id);
}

/** Interleave findings across categories (round-robin) while preserving category-priority order and
 *  within-category priority — so the headline set spans the page's distinct failure modes. Deterministic. */
function diversifyByCategory(findings: EnrichedRubricFinding[]): EnrichedRubricFinding[] {
  const byCat = new Map<string, EnrichedRubricFinding[]>();
  const catOrder: string[] = [];
  for (const f of findings) {
    let bucket = byCat.get(f.category);
    if (!bucket) { bucket = []; byCat.set(f.category, bucket); catOrder.push(f.category); }
    bucket.push(f);
  }
  const out: EnrichedRubricFinding[] = [];
  let pulled = true;
  while (pulled) {
    pulled = false;
    for (const cat of catOrder) {
      const next = byCat.get(cat)!.shift();
      if (next) { out.push(next); pulled = true; }
    }
  }
  return out;
}

export interface ApiStrength {
  check_id: string;
  label: string;
  observation: string;
}

/** Strengths = checks that PASSed and carry a passLabel (cap 5). */
export function buildStrengths(rows: RubricResultRow[], scopedChecks: DiagnosticCheck[]): ApiStrength[] {
  const byId = new Map(scopedChecks.map((c) => [c.id, c]));
  const out: ApiStrength[] = [];
  for (const r of rows) {
    if (normStatus(r.status) !== "PASS") continue;
    const check = byId.get(r.id);
    if (!check?.passLabel) continue;
    out.push({
      check_id: r.id,
      label: check.passLabel,
      observation: r.evidence?.trim() || check.title,
    });
    if (out.length >= 5) break;
  }
  return out;
}

export interface BuiltLeaks {
  leaks: Leak[];
  moneyLeaks: Leak[];
  quickWins: Leak[];
  growthRoadmap: Leak[];
  hiddenCount: number;
  totalFailed: number;
}

/** Curated leak tiers for the stored ReportPayload (drives the rendered report). */
export function buildLeaks(rows: RubricResultRow[], scopedChecks: DiagnosticCheck[]): BuiltLeaks {
  const byId = new Map(scopedChecks.map((c) => [c.id, c]));
  const enriched = enrichRubricFailures(rows, byId);
  const curated = curateFindings(enriched);
  return {
    leaks: enriched.map(enrichedFindingToLeak),
    moneyLeaks: curated.moneyLeaks.map((f) => enrichedFindingToLeak(f as EnrichedRubricFinding)),
    quickWins: curated.quickWins.map((f) => enrichedFindingToLeak(f as EnrichedRubricFinding)),
    growthRoadmap: curated.growthRoadmap.map((f) => enrichedFindingToLeak(f as EnrichedRubricFinding)),
    hiddenCount: curated.hiddenCount,
    totalFailed: enriched.length,
  };
}

/** Converts the model's flat blueprint array into the stored GrowthBlueprint struct. */
export function buildGrowthBlueprintStruct(items: ApiBlueprintItem[]): GrowthBlueprint {
  const weekOne: string[] = [];
  const weekTwoToFour: string[] = [];
  let monthTwo = "";
  for (const it of items) {
    if (it.timeframe === "Week 1") weekOne.push(it.action);
    else if (it.timeframe === "Weeks 2-4") weekTwoToFour.push(it.action);
    else if (it.timeframe === "Month 2" && !monthTwo) monthTwo = it.action;
  }
  return {
    weekOne: weekOne.slice(0, 3),
    weekTwoToFour: weekTwoToFour.slice(0, 3),
    monthTwo,
    projectedLift: "",
  };
}

export interface RubricCounts {
  totalChecks: number;
  fails: number;
  passes: number;
  skips: number;
  criticalCount: number;
  highCount: number;
}

/** Counts derived from the evaluated rows + scoped checks (never a hardcoded literal). */
export function rubricCounts(rows: RubricResultRow[], scopedChecks: DiagnosticCheck[]): RubricCounts {
  const sevById = new Map(scopedChecks.map((c) => [c.id, c.severity]));
  let fails = 0,
    passes = 0,
    skips = 0,
    criticalCount = 0,
    highCount = 0;
  for (const r of rows) {
    const st = normStatus(r.status);
    if (st === "FAIL") {
      fails++;
      const sev = sevById.get(r.id);
      if (sev === "Critical") criticalCount++;
      else if (sev === "High") highCount++;
    } else if (st === "PASS") passes++;
    else skips++;
  }
  return { totalChecks: scopedChecks.length, fails, passes, skips, criticalCount, highCount };
}

// ── Two-pass scoring ─────────────────────────────────────────────────────────
//
// Calibration showed the single 16K-token call truncates content-rich sites to
// 49–66% of checks, and the dropped TAIL (Page Speed / Accessibility / Universal)
// backfills to SKIP — which, because SKIP is excluded from the dimension denominator,
// silently shrinks the denominator and inflates the score on exactly the sites that
// matter. Two-pass decouples scoring completeness from narrative verbosity:
//
//   PASS 1 (status only): {id,status} for EVERY scoped check (~3–4K tokens) → a
//   COMPLETE, unbiased denominator. This pass alone determines the score.
//   PASS 2 (narrative): the 6–7 narrative fields for the FAIL ids only (bounded by
//   fail count). Truncation here only thins findings prose — the score is unaffected.
//
// Both passes put the SAME serialized catalog as the FIRST, cache_control'd system
// block, so the (large) catalog prefix is written once in pass 1 and read in pass 2.

/** PASS 1 — status-only scoring instructions. Tiny output; must cover every id. */
const RUBRIC_PASS1_INSTRUCTIONS = `You are SCORING a website against the fixed diagnostic catalog above. This is a status-only scoring pass — no narratives.

For EVERY check id in the catalog, return exactly one status:
- PASS — the page satisfies the check (its fail condition is NOT met).
- FAIL — the fail condition IS met, with concrete evidence you can see in the static HTML provided.
- SKIP — the check's signal is NOT observable in static HTML. You have no browser, no rendering, no runtime, no network trace: you CANNOT measure page-load speed, Core Web Vitals, real performance, animation, or anything that only exists when the page runs — this INCLUDES returning-visitor personalization, "recently viewed" items, and content that only renders for returning or logged-in users. SKIP those EVERY time (do not FAIL). The following also SKIP every time, never FAIL: (1) checks that say "based on visual analysis" — color contrast, element/tap-target sizing, visual alignment — these need pixel rendering you do not have; (2) checkout-FLOW internals (order summary near payment, multi-step progress indicator, promo-code field on the checkout page, abandoned-cart recovery) when you are looking at a homepage or landing page rather than the live checkout. When the signal is genuinely unobservable, SKIP — never guess FAIL.

RESOLVED-SIGNAL RULE (CRITICAL): when the summary explicitly reports a signal as "ABSENT" — e.g. a PAGES & SITE LINKS, SERVICE-BUSINESS SIGNALS, RETENTION SIGNALS, COPY FRAMING, PAGE STRUCTURE, or TECHNICAL / HTML SIGNALS line — that absence IS an observation. Answer PASS or FAIL from it; do NOT SKIP a check whose signal the summary has already resolved (present or ABSENT). Whether a dedicated page or site feature exists is resolved by these markers (derived from the nav + footer link set), so the "is there a reviews / FAQ / about / blog / pricing / community / press / team page" checks are answerable, not SKIP.

OBSERVABILITY RULE (CRITICAL): only FAIL on concrete, quotable on-page evidence (an explicit ABSENT marker counts as evidence of absence). Never penalize what static HTML cannot reveal.
COVERAGE RULE (CRITICAL): return exactly ONE row for EVERY catalog id — no more, no fewer — in catalog order. Do not invent ids. Do not omit ids.

OUTPUT — return ONE JSON object only. No markdown, no preamble, start with {:
{
  "page_type": "homepage" | "pricing" | "product" | "about" | "landing",
  "results": [
    // one row per catalog id, in order. STATUS ONLY:
    //   { "id": "<id>", "status": "PASS" }
    //   { "id": "<id>", "status": "FAIL" }
    //   { "id": "<id>", "status": "SKIP", "skipReason": "<one short clause>" }
  ]
}
Keep every row minimal — do NOT write titles, evidence, fixes, or any prose beyond the one-clause skipReason. Covering every id is the only goal.`;

/** PASS 2 — narrative for the already-determined FAIL ids + the brief/copy/blueprint. */
const RUBRIC_PASS2_INSTRUCTIONS = `---

A prior scoring pass already decided PASS/FAIL/SKIP for every check. The user message lists the check ids that FAILED. Do NOT re-evaluate or re-score anything. For EACH failed id, write its Conversion Intelligence narrative, and also write the opening Intelligence Brief, the hero copy rewrite, and the growth blueprint.

EVIDENCE DISCIPLINE — every finding must be drop-in specific to THIS page. A peak finding names the exact on-page element, quotes the evidence, states the cost with direction, gives a plain-English fix, and (when the fix is copy) a ready-to-paste rewrite:
- evidence: QUOTE the exact element from the STRUCTURED OBSERVABLE SUMMARY verbatim — the actual Headline / Subheadline / CTA text, a testimonial line, a pricing tier — OR cite the literal signal marker for an absence (e.g. "TECHNICAL: viewport ABSENT", "COPY FRAMING: we×14 vs you×1", "SAAS/OFFER SIGNALS: free-trial ABSENT"). Never paraphrase and never invent copy that is not in the summary. If you cannot ground the finding in a quoted string or a named ABSENT marker, do not write it.
- title: name the exact element AND the problem ("Hero headline names the feature, not the outcome"), never a bare category label.
- exitTrigger: the specific visitor thought that triggers exit, tied to the quoted element.
- conversionCost: the revenue mechanism lost AND its direction/magnitude ("cold visitors who can't self-qualify bounce before the CTA — the dominant cold-traffic drop-off").
- implementation: a concrete fix that references this page's actual content — what to change and to what. When the fix IS copy, make implementation a ready-to-paste replacement string, not advice about writing one.
- effort: "Today" (under ~4h), "This Week" (1–3 days), "This Month" (more).
NO INVENTED NUMBERS OR OFFERS — copy_rewrites and implementation must NEVER introduce a quantitative claim (a %, a $ figure, a count, "Nx", "N-day", "N+ businesses/customers", a star rating like "4.8/5") or an offer (free trial, money-back guarantee, discount, "no credit card required", "cancel anytime") that is not already in the STRUCTURED OBSERVABLE SUMMARY. You may RESTATE a number or offer the summary actually shows (name the block it came from); you may never invent one.
For implementation specifically: when the fix involves a number or offer that is NOT in the summary, you MUST do ONE of these — never assert it as drop-in text:
  (a) CONDITIONAL — "IF the page offers a money-back guarantee, surface it beside the CTA" / "IF you have a review score, show it next to the hero" — never claim the offer/number exists.
  (b) QUALITATIVE — name WHAT to add, not a fabricated value: "add risk-reversal microcopy below the CTA", "surface your strongest proof point near the hero" — NOT "add 'No credit card required for 30 days'" and NOT "add '4.8/5 from 1,200+ reviews'".
This binds EXAMPLE and "e.g." snippets too: an invented stat or offer inside an example ("Example: '4.8/5 from 1,200+ reviews'", "e.g. 'First $500 in fees waived'") is still an invented claim shown to the user — forbidden. Quote a concrete number/offer as drop-in text ONLY when that exact value is in the summary.
When the page carries no such number or offer, use qualitative language only — "trusted by leading businesses" not "3M+ businesses"; "start in minutes" not "30-day free trial"; "results-backed" not "increases conversion 40%". A rewrite or fix that adds an unverifiable statistic or a non-existent offer is a defect, not a peak finding.
The Intelligence Brief and copy_rewrites must be built from the summary's REAL headline/sub/CTA — rewrite the actual copy, never a generic placeholder.

OUTPUT — return ONE JSON object only. No markdown, no preamble, start with {:
{
  "summary": "<Intelligence Brief — 3 sentences: opening verdict citing the actual page, the structural problem, the stakes>",
  "copy_rewrites": { "headline": "<max 12 words — a real drop-in replacement for THIS page's headline>", "subheadline": "<max 20 words>", "cta": "<max 5 words>" },
  "growth_blueprint": [ { "priority": <int>, "action": "<max 15 words, specific to this page>", "effort": "low"|"medium"|"high", "impact": "low"|"medium"|"high", "timeframe": "Week 1"|"Weeks 2-4"|"Month 2" } ],
  "results": [
    // one row per FAILED id from the user message:
    { "id": "<id>", "status": "FAIL", "title": "<exact element + problem>", "exitTrigger": "<visitor thought that triggers exit>", "evidence": "<verbatim quote or literal ABSENT marker from the summary>", "conversionCost": "<mechanism lost + direction>", "implementation": "<drop-in fix; ready-to-paste copy when the fix is copy>", "effort": "Today"|"This Week"|"This Month" }
  ]
}
Write a row only for the failed ids provided. Do not add rows for other ids. Do not change any status.`;

/** Reason stamped on rows that the model never returned (distinguishes truncation-backfill from genuine model SKIP). */
export const PASS1_BACKFILL_REASON = "No row returned in scoring pass — backfilled as skip (truncation).";

/** Pass-1 system blocks: CACHED catalog FIRST (shared byte-for-byte with pass 2), then status-only instructions. */
export function buildPass1SystemBlocks(scopedChecks: DiagnosticCheck[]): RubricSystemBlock[] {
  return [
    { type: "text", text: serializeChecksForPrompt(scopedChecks), cache_control: { type: "ephemeral" } },
    { type: "text", text: RUBRIC_PASS1_INSTRUCTIONS },
  ];
}

/** Pass-2 system blocks: SAME cached catalog block (cache shared with pass 1), then voice core + narrative contract. */
export function buildPass2SystemBlocks(scopedChecks: DiagnosticCheck[]): RubricSystemBlock[] {
  return [
    { type: "text", text: serializeChecksForPrompt(scopedChecks), cache_control: { type: "ephemeral" } },
    { type: "text", text: `${RUBRIC_EVALUATION_SYSTEM_PROMPT}\n\n${RUBRIC_PASS2_INSTRUCTIONS}` },
  ];
}

export interface ParsedStatusPass {
  /** One row per scoped id (complete) — backfilled rows carry PASS1_BACKFILL_REASON. */
  rows: RubricResultRow[];
  pageType: string;
  /** True when strict JSON.parse failed (pass 1 should never truncate; this guards it). */
  truncated: boolean;
  /** Ids the model actually returned a row for. */
  returnedIds: Set<string>;
  /** Scoped ids the model did NOT return — backfilled as SKIP, tracked separately from genuine SKIPs. */
  backfilledIds: string[];
}

/**
 * Parse the status-only pass. Guarantees one row per scoped id and, critically, records
 * which ids were backfilled (never returned) so the caller can tell truncation-backfill
 * SKIPs apart from genuine model SKIPs and refuse to score on a contaminated denominator.
 */
export function parseStatusRows(rawText: string, scopedChecks: DiagnosticCheck[]): ParsedStatusPass {
  const cleaned = (rawText ?? "").replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  let obj: Record<string, unknown> | null = null;
  let truncated = false;
  try {
    const parsed = JSON.parse(cleaned);
    obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    truncated = true;
  }

  let rawRows: Record<string, unknown>[] = [];
  let pageType = "homepage";
  if (obj) {
    const resultsField = Array.isArray(obj.results) ? obj.results : Array.isArray(obj) ? obj : [];
    rawRows = (resultsField as unknown[]).filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
    pageType = typeof obj.page_type === "string" ? obj.page_type : "homepage";
  } else {
    rawRows = salvageRows(cleaned);
    pageType = salvageString(cleaned, "page_type") || "homepage";
  }

  const byId = new Map<string, RubricResultRow>();
  const returnedIds = new Set<string>();
  for (const raw of rawRows) {
    const row = normalizeRow(raw);
    if (!row.id) continue;
    byId.set(row.id, row);
    byId.set(row.id.toUpperCase(), row);
    returnedIds.add(row.id);
  }

  const backfilledIds: string[] = [];
  const rows: RubricResultRow[] = scopedChecks.map((c) => {
    const found = byId.get(c.id) ?? byId.get(c.id.toUpperCase());
    if (found) return found;
    backfilledIds.push(c.id);
    return { id: c.id, status: "SKIP", skipReason: PASS1_BACKFILL_REASON };
  });

  return { rows, pageType, truncated, returnedIds, backfilledIds };
}

// ── Status reconciliation (N-pass majority vote — fixes status-pass nondeterminism) ──
//
// The status pass is not deterministic at temperature 0: byte-identical input can return a
// different PASS/FAIL on a minority of borderline checks, swinging the headline a few points
// (Stripe 26 vs 34 on identical input). Running the status pass N times and reconciling each
// check by MAJORITY VOTE makes a single flaky vote unable to move the score.
//
// Vocabulary = the rubric's REAL statuses: PASS / FAIL / SKIP (there is no PARTIAL here).
// Per check id, across the N runs:
//   1. SKIP is "couldn't tell", NOT a vote. If ANY run returned a real status (PASS/FAIL),
//      reconcile among the real votes only; reconcile to SKIP only when EVERY run SKIPped.
//   2. MAJORITY of the real votes wins — a lone FAIL can't sink a mostly-PASS check, and a
//      lone PASS can't rescue a mostly-FAIL check.
//   3. TIE (equal PASS and FAIL) → PASS, the LESS-PUNITIVE of the tied options: never
//      penalize a check on a coin-flip.
// Carries a per-check agreement metric so flaky checks are visible. N=1 is an exact
// passthrough (one vote per check), so default behavior is unchanged.

export interface StatusVote { id: string; status: string }
export interface ReconciledCheck {
  id: string;
  status: "PASS" | "FAIL" | "SKIP";
  votes: { PASS: number; FAIL: number; SKIP: number };
  agree: number;   // how many of n runs returned the reconciled status
  n: number;
  flaky: boolean;  // true when the runs did not unanimously agree
}
export interface ReconcileResult {
  rows: Array<{ id: string; status: "PASS" | "FAIL" | "SKIP" }>;
  perCheck: ReconciledCheck[];
  flakyCount: number;     // checks where the runs disagreed
  meanAgreement: number;  // mean agree/n across checks (1 = perfectly stable)
}

export function reconcileStatuses(runs: StatusVote[][]): ReconcileResult {
  const n = runs.length;

  // Stable id order: first run, then any id seen only in later runs.
  const order: string[] = [];
  const seen = new Set<string>();
  for (const run of runs) for (const r of run) {
    const id = String(r.id ?? "").trim();
    if (id && !seen.has(id)) { seen.add(id); order.push(id); }
  }

  // Per-id vote tally across runs. A run missing an id counts that id as SKIP ("didn't tell").
  const tally = new Map<string, { PASS: number; FAIL: number; SKIP: number }>();
  for (const id of order) tally.set(id, { PASS: 0, FAIL: 0, SKIP: 0 });
  for (const run of runs) {
    const present = new Set<string>();
    for (const r of run) {
      const id = String(r.id ?? "").trim();
      const t = id ? tally.get(id) : undefined;
      if (!t) continue;
      t[normStatus(r.status)]++;
      present.add(id);
    }
    for (const id of order) if (!present.has(id)) tally.get(id)!.SKIP++;
  }

  const perCheck: ReconciledCheck[] = order.map((id) => {
    const v = tally.get(id)!;
    let status: "PASS" | "FAIL" | "SKIP";
    if (v.PASS === 0 && v.FAIL === 0) status = "SKIP";        // every run SKIPped
    else if (v.PASS > v.FAIL) status = "PASS";
    else if (v.FAIL > v.PASS) status = "FAIL";
    else status = "PASS";                                     // tie → less-punitive
    const agree = v[status];
    return { id, status, votes: v, agree, n, flaky: agree < n };
  });

  const flakyCount = perCheck.filter((c) => c.flaky).length;
  const meanAgreement = perCheck.length ? perCheck.reduce((s, c) => s + c.agree / c.n, 0) / perCheck.length : 1;
  return { rows: perCheck.map((c) => ({ id: c.id, status: c.status })), perCheck, flakyCount, meanAgreement };
}

export interface ParsedNarrativePass {
  /** Narrative fields keyed by FAIL id (title/exitTrigger/evidence/conversionCost/implementation/effort). */
  narratives: Map<string, Partial<RubricResultRow>>;
  summary: string;
  copyRewrites: ApiCopyRewrites;
  growthBlueprint: ApiBlueprintItem[];
  /** True when strict parse failed — non-fatal; only thins findings prose, never the score. */
  truncated: boolean;
  returnedFailRows: number;
}

/** Parse the narrative pass — narrative fields per FAIL id + brief/copy/blueprint; salvages partial output. */
export function parsePass2Narrative(rawText: string): ParsedNarrativePass {
  const cleaned = (rawText ?? "").replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  let obj: Record<string, unknown> | null = null;
  let truncated = false;
  try {
    const parsed = JSON.parse(cleaned);
    obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    truncated = true;
  }

  let rawRows: Record<string, unknown>[] = [];
  let summary = "";
  let copyRewrites: ApiCopyRewrites = {};
  let growthBlueprint: ApiBlueprintItem[] = [];
  if (obj) {
    const resultsField = Array.isArray(obj.results) ? obj.results : [];
    rawRows = (resultsField as unknown[]).filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
    summary = typeof obj.summary === "string" ? obj.summary : "";
    copyRewrites = obj.copy_rewrites && typeof obj.copy_rewrites === "object" ? (obj.copy_rewrites as ApiCopyRewrites) : {};
    growthBlueprint = coerceBlueprint(obj.growth_blueprint);
  } else {
    rawRows = salvageRows(cleaned);
    summary = salvageString(cleaned, "summary");
    copyRewrites = salvageCopyRewrites(cleaned);
    growthBlueprint = [];
  }

  const narratives = new Map<string, Partial<RubricResultRow>>();
  for (const raw of rawRows) {
    const r = normalizeRow(raw);
    if (!r.id || normStatus(r.status) !== "FAIL") continue;
    narratives.set(r.id, {
      title: r.title,
      exitTrigger: r.exitTrigger,
      evidence: r.evidence,
      conversionCost: r.conversionCost,
      implementation: r.implementation,
      effort: r.effort,
    });
  }
  return { narratives, summary, copyRewrites, growthBlueprint, truncated, returnedFailRows: narratives.size };
}

/** Merge pass-2 narratives into pass-1 FAIL rows. Statuses are unchanged; only FAIL rows gain narrative fields. */
export function mergeStatusAndNarrative(
  statusRows: RubricResultRow[],
  narratives: Map<string, Partial<RubricResultRow>>
): RubricResultRow[] {
  return statusRows.map((r) => {
    if (normStatus(r.status) !== "FAIL") return r;
    const n = narratives.get(r.id);
    return n ? { ...r, ...n } : r;
  });
}
