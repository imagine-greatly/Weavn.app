/**
 * scripts/abScan.ts — THROWAWAY A/B cost + denominator measurement (measurement only).
 *
 * Measures the structured-summary fix (commit 6182749) against the raw-HTML baseline,
 * with REAL scans: real Browserless scrape + real claude-sonnet-4-6 calls. No stubbing.
 *
 * Per site, on a SINGLE scrape:
 *   SUMMARY arm  = the CURRENT route path → buildPageSummary() as the user message,
 *                  full two-pass (status pass + narrative pass). Faithful mirror of the
 *                  WEAVN_RUBRIC_SCORING branch of app/api/v1/scan/route.ts.
 *   RAW-HTML arm = the OLD baseline → 40–70KB raw HTML as the user message, pass-1 only
 *                  (status). Gives the real input-token + denominator baseline to A/B against.
 *
 * Forces rubric scoring ON for THIS RUN ONLY (it never reads the WEAVN_RUBRIC_SCORING
 * env/default — it calls the rubric helpers directly). Does NOT change any default,
 * does NOT write Supabase, does NOT mutate scoring/scan logic.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/abScan.ts
 *   npx tsx scripts/abScan.ts --only=stripe
 *
 * Reads ANTHROPIC_API_KEY + BROWSERLESS_API_KEY from .env.local.
 */

// Avast/local TLS interception breaks outbound HTTPS validation; relax it for this
// throwaway measurement run only (never in app code). Must precede any HTTPS client.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

import Anthropic from "@anthropic-ai/sdk";
import { scrapeSite } from "../lib/scraper";
import { detectSiteType } from "../lib/siteType";
import { buildPageSummary } from "../lib/analyze";
import { type DiagnosticCheck } from "../lib/diagnosticRubric";
import {
  scopeChecksForScan,
  buildPass1SystemBlocks,
  buildPass2SystemBlocks,
  parseStatusRows,
  parsePass2Narrative,
  mergeStatusAndNarrative,
  computeApiDimensions,
  rubricCounts,
  buildApiFindings,
  CATEGORY_TO_DIMENSION,
  API_DIMENSION_KEYS,
  type ApiDimensionKey,
} from "../lib/rubricScan";
import { type RubricResultRow } from "../lib/processFindings";
import { getWeightProfile } from "../lib/benchmarks";

// ── Route-faithful constants ──────────────────────────────────────────────────
const PASS1_MAX_TOKENS = 8000;
const PASS1_RETRY_MAX_TOKENS = 12000;
const PASS2_MAX_TOKENS = 16000;
const SKIP_RATE_CEILING = 0.80;
const BACKFILL_SKIP_CEILING = 0.10;
const MIN_CONTENT_CHARS = 150;
const FINDING_LIMIT = 10; // route default
const MODEL_INACTIVITY_TIMEOUT_MS = 180_000; // generous: TLS interception slows TTFT

// ── Real claude-sonnet-4-6 rates, USD per MTok — sourced from lib/scanCost.ts ──
// (SONNET_RATE_INPUT=3, SONNET_RATE_OUTPUT=15, SONNET_RATE_CACHE_READ=0.30,
//  SONNET_RATE_CACHE_WRITE=3.75). Confirmed in-repo, not guessed.
const IN_RATE = 3;
const OUT_RATE = 15;
const CACHE_READ_RATE = 0.30;
const CACHE_CREATE_RATE = 3.75;

type Usage = {
  input_tokens?: number; output_tokens?: number;
  cache_creation_input_tokens?: number; cache_read_input_tokens?: number;
};
const ZERO_U: Usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
function addU(a: Usage, b: Usage | undefined): Usage {
  return {
    input_tokens: (a.input_tokens ?? 0) + (b?.input_tokens ?? 0),
    output_tokens: (a.output_tokens ?? 0) + (b?.output_tokens ?? 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b?.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b?.cache_read_input_tokens ?? 0),
  };
}
// cost = input*IN + output*OUT + cacheRead*CR + cacheCreate*CC  (task formula)
function estCost(u: Usage): number {
  return (
    (u.input_tokens ?? 0) * IN_RATE +
    (u.output_tokens ?? 0) * OUT_RATE +
    (u.cache_read_input_tokens ?? 0) * CACHE_READ_RATE +
    (u.cache_creation_input_tokens ?? 0) * CACHE_CREATE_RATE
  ) / 1e6;
}

function readableTextLength(html: string): number {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
}

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.slice("--only=".length) : null;

for (const k of ["ANTHROPIC_API_KEY", "BROWSERLESS_API_KEY"] as const) {
  if (!process.env[k]) { console.error(`FATAL: ${k} missing — set it in .env.local.`); process.exit(1); }
}
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 290_000 });

// One model call with an inactivity timeout (resets on each streamed token).
async function call(
  maxTokens: number,
  system: ReturnType<typeof buildPass1SystemBlocks>,
  userContent: string,
): Promise<{ text: string; usage: Usage }> {
  const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: userContent }] });
  let timedOut = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { timedOut = true; try { stream.abort(); } catch { /* */ } }, MODEL_INACTIVITY_TIMEOUT_MS); };
  stream.on("text", () => arm()); arm();
  let msg: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { msg = await stream.finalMessage(); }
  catch (e) { if (timedOut) throw new Error(`inactivity timeout ${MODEL_INACTIVITY_TIMEOUT_MS}ms`); throw e; }
  finally { clearTimeout(timer!); }
  const block = msg.content.find((c) => c.type === "text");
  return { text: block && block.type === "text" ? block.text : "", usage: msg.usage as Usage };
}

interface Site { label: string; bucket: string; url: string; }
const SITES: Site[] = [
  { label: "Stripe",    bucket: "Healthy baseline (~52)", url: "https://stripe.com" },
  { label: "Linear",    bucket: "Healthy, JS-heavy",      url: "https://linear.app" },
  { label: "Plausible", bucket: "Mid SaaS",               url: "https://www.plausible.io" },
  { label: "JJWords",   bucket: "Thin/low-conversion-content", url: "https://justinjackson.ca/words.html" },
  { label: "WP:CRO",    bucket: "Content-heavy long page", url: "https://en.wikipedia.org/wiki/Conversion_rate_optimization" },
];

// Per-dimension answered (PASS+FAIL) / skip — lets technical_foundation be read alone.
function dimCounts(rows: RubricResultRow[], scoped: DiagnosticCheck[]) {
  const idToCat = new Map(scoped.map((c) => [c.id, c.category]));
  const out = {} as Record<ApiDimensionKey, { ans: number; skip: number }>;
  for (const k of API_DIMENSION_KEYS) out[k] = { ans: 0, skip: 0 };
  for (const r of rows) {
    const dim = CATEGORY_TO_DIMENSION[idToCat.get(r.id) ?? ""] as ApiDimensionKey | undefined;
    if (!dim || !out[dim]) continue;
    const s = String(r.status).toUpperCase();
    if (s === "PASS" || s === "FAIL") out[dim].ans++; else out[dim].skip++;
  }
  return out;
}

function weightedScore(dims: Record<ApiDimensionKey, number>, siteType: string): number {
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

// summaryContent wrapper — VERBATIM from app/api/v1/scan/route.ts (must stay byte-identical
// so the measured input tokens match the real path).
function buildSummaryContent(pageSummary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${pageSummary}`;
}

// raw-HTML userContent — VERBATIM from the OLD route baseline.
function buildRawContent(extraction: Awaited<ReturnType<typeof scrapeSite>>, url: string): string {
  const complexity = extraction.complexity ?? "medium";
  const hardCap = complexity === "simple" ? 40_000 : complexity === "medium" ? 55_000 : 70_000;
  const pageCount = 1 + (extraction.additionalPages?.length ?? 0);
  const homepageSection = `=== HOMEPAGE: ${url} ===\n${extraction.rawHtml.slice(0, hardCap)}`;
  const subpageSections = (extraction.additionalPages ?? [])
    .map(({ url: u, rawHtml }) => `=== SUBPAGE: ${u} ===\n${rawHtml.slice(0, 20_000)}`).join("\n\n");
  return subpageSections
    ? `Analyze ${pageCount} pages. Return JSON analysis.\n\n${homepageSection}\n\n${subpageSections}`
    : `Analyze the following website HTML and return JSON analysis:\n\n${homepageSection}`;
}

interface Row {
  domain: string; siteType: string; scoped: number;
  score: number | null;
  inTok: number; outTok: number; cacheRead: number; cacheCreate: number;
  total: number; answered: number; skip: number;
  tfAns: number; tfSkip: number;
  cost: number; errorCode: string;
  genGen: number; genRet: number; // pass-2 narratives generated vs returned
  skipRate: number;
  // per-pass input/output split (summary arm) — sumP1In is the clean apples-to-apples
  // counterpart to the raw arm's rawInTok (both are the status pass-1 page-content input).
  sumP1In: number; sumP1Out: number; sumP2In: number; sumP2Out: number;
  // A/B baseline (raw-HTML arm, pass-1 only)
  rawHtmlChars: number; summaryChars: number;
  rawInTok: number; rawTfAns: number; rawTfSkip: number; rawTotalAns: number; rawSkipRate: number;
}

async function runSite(site: Site): Promise<Row> {
  const domain = new URL(site.url).hostname.replace(/^www\./, "");
  const row: Row = {
    domain, siteType: "-", scoped: 0, score: null,
    inTok: 0, outTok: 0, cacheRead: 0, cacheCreate: 0,
    total: 0, answered: 0, skip: 0, tfAns: 0, tfSkip: 0,
    cost: 0, errorCode: "", genGen: 0, genRet: 0, skipRate: 0,
    sumP1In: 0, sumP1Out: 0, sumP2In: 0, sumP2Out: 0,
    rawHtmlChars: 0, summaryChars: 0, rawInTok: 0, rawTfAns: 0, rawTfSkip: 0, rawTotalAns: 0, rawSkipRate: 0,
  };

  // ── Scrape once (real Browserless) ──
  let extraction: Awaited<ReturnType<typeof scrapeSite>>;
  try { extraction = await scrapeSite(site.url); }
  catch (e) { row.errorCode = `scrape_failed: ${e instanceof Error ? e.message : e}`; return row; }

  const site_type = detectSiteType(extraction);
  const scopedChecks = scopeChecksForScan(site_type);
  row.siteType = site_type; row.scoped = scopedChecks.length; row.total = scopedChecks.length;
  const readableChars = readableTextLength(extraction.rawHtml);

  const rawContent = buildRawContent(extraction, site.url);
  const summaryContent = buildSummaryContent(buildPageSummary(extraction));
  row.rawHtmlChars = rawContent.length;
  row.summaryChars = summaryContent.length;

  console.log(`  [${domain}] siteType=${site_type} scoped=${scopedChecks.length} readableChars=${readableChars} rawChars=${row.rawHtmlChars} summaryChars=${row.summaryChars}`);

  // ── Min-content gate (route rejects pre-model below 150 readable chars) ──
  if (readableChars < MIN_CONTENT_CHARS) {
    row.errorCode = "insufficient_content";
    console.log(`  [${domain}] insufficient_content (readableChars ${readableChars} < ${MIN_CONTENT_CHARS}) — no model call`);
    return row;
  }

  // ── SUMMARY ARM — full two-pass (the new path) ──
  let p1: ReturnType<typeof parseStatusRows>;
  let p1Usage: Usage = { ...ZERO_U };
  let p2Usage: Usage = { ...ZERO_U };
  try {
    const c1 = await call(PASS1_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), summaryContent);
    p1 = parseStatusRows(c1.text, scopedChecks); p1Usage = addU(p1Usage, c1.usage);
    if (p1.truncated || p1.backfilledIds.length > 0) {
      const c1r = await call(PASS1_RETRY_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), summaryContent);
      p1 = parseStatusRows(c1r.text, scopedChecks); p1Usage = addU(p1Usage, c1r.usage);
    }
  } catch (e) { row.errorCode = `pass1_error: ${e instanceof Error ? e.message : e}`; return row; }

  const statusRows = p1.rows;
  const counts = rubricCounts(statusRows, scopedChecks);
  const backfillSkips = p1.backfilledIds.length;
  const skipRate = counts.skips / scopedChecks.length;
  const backfillShare = counts.skips > 0 ? backfillSkips / counts.skips : 0;
  const lowConfidence = skipRate > SKIP_RATE_CEILING || backfillShare > BACKFILL_SKIP_CEILING;
  const dc = dimCounts(statusRows, scopedChecks);

  row.answered = counts.passes + counts.fails;
  row.skip = counts.skips;
  row.skipRate = skipRate;
  row.tfAns = dc.technical_foundation.ans;
  row.tfSkip = dc.technical_foundation.skip;

  if (lowConfidence) {
    row.errorCode = skipRate > SKIP_RATE_CEILING
      ? `insufficient_evaluation (skipRate ${(skipRate * 100).toFixed(0)}%>80%)`
      : `insufficient_evaluation (backfillShare ${(backfillShare * 100).toFixed(0)}%>10%)`;
  } else {
    const dims = computeApiDimensions(statusRows);
    row.score = weightedScore(dims, site_type);

    // ── PASS 2 — narratives for FAIL ids only (non-fatal) ──
    const failIds = statusRows.filter((r) => String(r.status).toUpperCase() === "FAIL").map((r) => r.id);
    if (failIds.length > 0) {
      try {
        const byId = new Map(scopedChecks.map((c) => [c.id, c]));
        const failLines = failIds.map((id) => `${id} | ${byId.get(id)?.title ?? ""}`).join("\n");
        const pass2User = `${summaryContent}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${failLines}`;
        const c2 = await call(PASS2_MAX_TOKENS, buildPass2SystemBlocks(scopedChecks), pass2User);
        const p2 = parsePass2Narrative(c2.text); p2Usage = addU(p2Usage, c2.usage);
        row.genGen = p2.returnedFailRows;
        const merged = mergeStatusAndNarrative(statusRows, p2.narratives);
        row.genRet = buildApiFindings(merged, scopedChecks, FINDING_LIMIT).length;
      } catch (e) { console.log(`  [${domain}] pass2 error (non-fatal): ${e instanceof Error ? e.message : e}`); }
    }
  }

  const sumUsage = addU(p1Usage, p2Usage);
  row.sumP1In = p1Usage.input_tokens ?? 0;
  row.sumP1Out = p1Usage.output_tokens ?? 0;
  row.sumP2In = p2Usage.input_tokens ?? 0;
  row.sumP2Out = p2Usage.output_tokens ?? 0;
  row.inTok = sumUsage.input_tokens ?? 0;
  row.outTok = sumUsage.output_tokens ?? 0;
  row.cacheRead = sumUsage.cache_read_input_tokens ?? 0;
  row.cacheCreate = sumUsage.cache_creation_input_tokens ?? 0;
  row.cost = estCost(sumUsage);

  // ── RAW-HTML ARM — pass-1 baseline only (input tokens + denominator) ──
  try {
    const cr = await call(PASS1_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), rawContent);
    const rp = parseStatusRows(cr.text, scopedChecks);
    const rCounts = rubricCounts(rp.rows, scopedChecks);
    const rdc = dimCounts(rp.rows, scopedChecks);
    row.rawInTok = cr.usage.input_tokens ?? 0;
    row.rawTfAns = rdc.technical_foundation.ans;
    row.rawTfSkip = rdc.technical_foundation.skip;
    row.rawTotalAns = rCounts.passes + rCounts.fails;
    row.rawSkipRate = rCounts.skips / scopedChecks.length;
  } catch (e) { console.log(`  [${domain}] raw-arm baseline error (noted): ${e instanceof Error ? e.message : e}`); }

  return row;
}

function pad(s: string | number, n: number): string { return String(s).padEnd(n); }
function padL(s: string | number, n: number): string { return String(s).padStart(n); }

async function main() {
  const batch = ONLY ? SITES.filter((s) => s.url.includes(ONLY) || s.label.toLowerCase().includes(ONLY.toLowerCase())) : SITES;
  console.log(`\n=== abScan A/B — SUMMARY (new) vs RAW-HTML (baseline) — ${batch.length} site(s) ===`);
  console.log(`rates $/MTok: in=${IN_RATE} out=${OUT_RATE} cacheRead=${CACHE_READ_RATE} cacheCreate=${CACHE_CREATE_RATE} (source: lib/scanCost.ts)\n`);

  const rows: Row[] = [];
  for (const site of batch) {
    console.log(`\n--- ${site.label} [${site.bucket}] ${site.url} ---`);
    const t0 = Date.now();
    let r: Row;
    try { r = await runSite(site); }
    catch (e) { console.log(`  RUN FAILED → ${e instanceof Error ? e.message : e}`); r = { domain: new URL(site.url).hostname.replace(/^www\./, ""), siteType: "-", scoped: 0, score: null, inTok: 0, outTok: 0, cacheRead: 0, cacheCreate: 0, total: 0, answered: 0, skip: 0, tfAns: 0, tfSkip: 0, cost: 0, errorCode: `run_failed: ${e instanceof Error ? e.message : e}`, genGen: 0, genRet: 0, skipRate: 0, sumP1In: 0, sumP1Out: 0, sumP2In: 0, sumP2Out: 0, rawHtmlChars: 0, summaryChars: 0, rawInTok: 0, rawTfAns: 0, rawTfSkip: 0, rawTotalAns: 0, rawSkipRate: 0 }; }
    rows.push(r);
    console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    // Incremental, crash-resilient per-site record — full metrics on one parseable line.
    console.log("ROWJSON " + JSON.stringify(r));
  }

  // ── PRIMARY TABLE (summary arm) ──
  console.log("\n\n================ RESULTS — SUMMARY ARM (the new path) ================");
  const H = ["domain", "score", "in_tok", "out_tok", "cacheRd", "cacheCr", "denom t/a/s", "tf a/s", "cost_usd", "error_code"];
  const W = [20, 6, 8, 8, 8, 8, 16, 9, 9, 38];
  console.log(H.map((h, i) => pad(h, W[i])).join("| "));
  console.log(W.map((w) => "-".repeat(w)).join("+-"));
  for (const r of rows) {
    console.log([
      pad(r.domain, W[0]), padL(r.score ?? "-", W[1]), padL(r.inTok, W[2]), padL(r.outTok, W[3]),
      padL(r.cacheRead, W[4]), padL(r.cacheCreate, W[5]),
      pad(`${r.total}/${r.answered}/${r.skip}`, W[6]), pad(`${r.tfAns}/${r.tfSkip}`, W[7]),
      padL(r.cost.toFixed(4), W[8]), pad(r.errorCode || "-", W[9]),
    ].join("| "));
  }

  // ── A/B BASELINE TABLE — both are the STATUS pass-1 (apples-to-apples page-content input) ──
  console.log("\n================ A/B BASELINE — pass-1 page-content input: RAW-HTML vs SUMMARY ================");
  const H2 = ["domain", "rawChars", "sumChars", "raw_p1_in", "sum_p1_in", "ratio(raw/sum)", "raw tf a/s", "sum tf a/s", "raw skip%", "sum skip%"];
  const W2 = [20, 9, 9, 10, 10, 15, 11, 11, 10, 10];
  console.log(H2.map((h, i) => pad(h, W2[i])).join("| "));
  console.log(W2.map((w) => "-".repeat(w)).join("+-"));
  for (const r of rows) {
    const ratio = r.sumP1In > 0 && r.rawInTok > 0 ? (r.rawInTok / r.sumP1In).toFixed(1) + "x" : "-";
    console.log([
      pad(r.domain, W2[0]), padL(r.rawHtmlChars, W2[1]), padL(r.summaryChars, W2[2]),
      padL(r.rawInTok, W2[3]), padL(r.sumP1In, W2[4]), padL(ratio, W2[5]),
      pad(`${r.rawTfAns}/${r.rawTfSkip}`, W2[6]), pad(`${r.tfAns}/${r.tfSkip}`, W2[7]),
      padL((r.rawSkipRate * 100).toFixed(0) + "%", W2[8]), padL((r.skipRate * 100).toFixed(0) + "%", W2[9]),
    ].join("| "));
  }

  // ── SUMMARY STATS ──
  const scored = rows.filter((r) => r.score !== null && !r.errorCode);
  const withModel = rows.filter((r) => r.inTok > 0);
  const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const avgCost = avg(withModel.map((r) => r.cost));
  const avgIn = avg(withModel.map((r) => r.inTok));
  const avgOut = avg(withModel.map((r) => r.outTok));
  // Per-pass page-content input ratio, content-rich sites only (raw HTML actually
  // hit the 70KB cap); excludes tiny pages where raw < summary.
  const big = withModel.filter((r) => r.rawHtmlChars > 40_000 && r.sumP1In > 0);
  const avgRatioBig = avg(big.map((r) => r.rawInTok / r.sumP1In));
  const avgSumP1 = avg(big.map((r) => r.sumP1In));
  const avgRawP1 = avg(big.map((r) => r.rawInTok));
  const avgGlobalSkip = avg(withModel.map((r) => r.skipRate));
  const tfTotals = withModel.reduce((acc, r) => ({ ans: acc.ans + r.tfAns, skip: acc.skip + r.tfSkip }), { ans: 0, skip: 0 });
  const tfSkipRate = (tfTotals.ans + tfTotals.skip) > 0 ? tfTotals.skip / (tfTotals.ans + tfTotals.skip) : 0;
  const rawTfTotals = rows.filter((r) => r.rawInTok > 0).reduce((acc, r) => ({ ans: acc.ans + r.rawTfAns, skip: acc.skip + r.rawTfSkip }), { ans: 0, skip: 0 });
  const rawTfSkipRate = (rawTfTotals.ans + rawTfTotals.skip) > 0 ? rawTfTotals.skip / (rawTfTotals.ans + rawTfTotals.skip) : 0;
  const p2rows = scored.filter((r) => r.genGen > 0 || r.genRet > 0);

  console.log("\n================ SUMMARY ================");
  console.log(`sites run: ${rows.length} | scored: ${scored.length} | with model calls: ${withModel.length}`);
  console.log(`avg cost / scan (summary arm, both passes): $${avgCost.toFixed(4)}`);
  console.log(`avg input tokens (summary arm, p1+p2): ${avgIn.toFixed(0)} | avg OUTPUT tokens (p1+p2): ${avgOut.toFixed(0)}  ← output dominates cost`);
  console.log(`per-pass page-content input (content-rich sites, raw hit 70KB cap): raw p1 ${avgRawP1.toFixed(0)} → summary p1 ${avgSumP1.toFixed(0)} = ${avgRatioBig.toFixed(1)}x reduction`);
  console.log(`avg GLOBAL skip rate — summary: ${(avgGlobalSkip * 100).toFixed(1)}% | raw: ${(avg(rows.filter((r) => r.rawInTok > 0).map((r) => r.rawSkipRate)) * 100).toFixed(1)}%`);
  console.log(`technical_foundation skip rate — summary: ${(tfSkipRate * 100).toFixed(1)}% (ans=${tfTotals.ans} skip=${tfTotals.skip}) | raw: ${(rawTfSkipRate * 100).toFixed(1)}% (ans=${rawTfTotals.ans} skip=${rawTfTotals.skip})`);
  console.log(`avg pass-2 narratives generated: ${avg(p2rows.map((r) => r.genGen)).toFixed(1)} | returned (≤finding_limit=${FINDING_LIMIT}): ${avg(p2rows.map((r) => r.genRet)).toFixed(1)}`);
  console.log("\n(done)");
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
