/**
 * scripts/rubric-calibration.mts — CALIBRATION / TWO-PASS VALIDATION (measurement only).
 *
 * Mirrors the WEAVN_RUBRIC_SCORING branch of app/api/v1/scan/route.ts, now TWO-PASS:
 *   PASS 1 (status only) → complete denominator → headline = weighted dimension aggregate.
 *   PASS 2 (narrative for FAIL ids only).
 * Plus the guards: total SKIP>80% OR truncation-backfill SKIP>10% → low-confidence.
 * Calls the real path functions; no re-implementation; no raw-fetch substitute for Browserless.
 * Does NOT write Supabase, NOT touch Vercel, NOT mutate scoring code.
 *
 *   npx tsx scripts/rubric-calibration.mts            # two-pass on the clean set
 *   npx tsx scripts/rubric-calibration.mts --compare  # + old single-16K call on a content-rich site
 *   npx tsx scripts/rubric-calibration.mts --only=stripe
 *
 * Reads ANTHROPIC_API_KEY + BROWSERLESS_API_KEY from .env.local.
 */

import Anthropic from "@anthropic-ai/sdk";
import { scrapeSite } from "../lib/scraper";
import { detectSiteType } from "../lib/siteType";
import { type DiagnosticCheck } from "../lib/diagnosticRubric";
import {
  scopeChecksForScan,
  buildPass1SystemBlocks,
  buildPass2SystemBlocks,
  parseStatusRows,
  parsePass2Narrative,
  mergeStatusAndNarrative,
  buildRubricSystemBlocks,   // OLD single-call (for --compare)
  parseRubricResponse,       // OLD single-call (for --compare)
  computeApiDimensions,
  rubricCounts,
  CATEGORY_TO_DIMENSION,
  API_DIMENSION_KEYS,
  type ApiDimensionKey,
} from "../lib/rubricScan";
import { computeGrowthScoreFromRubric, type RubricResultRow } from "../lib/processFindings";
import { getWeightProfile } from "../lib/benchmarks";

try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.slice("--only=".length) : null;
const COMPARE = process.argv.includes("--compare");
const MODEL_INACTIVITY_TIMEOUT_MS = 90_000;
const SKIP_RATE_CEILING = 0.80;
const BACKFILL_SKIP_CEILING = 0.10;
const PASS1_MAX_TOKENS = 8000;
const PASS1_RETRY_MAX_TOKENS = 12000;
const PASS2_MAX_TOKENS = 16000;
const SINGLE_MAX_TOKENS = 16000;
const MIN_CONTENT_CHARS = 150;

// Sonnet 4.6 pricing ($/MTok): input 3, output 15, cache-write 1.25× = 3.75, cache-read 0.1× = 0.30.
const PRICE = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 };
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
function costOf(u: Usage | undefined): number {
  const i = u?.input_tokens ?? 0, o = u?.output_tokens ?? 0, cw = u?.cache_creation_input_tokens ?? 0, cr = u?.cache_read_input_tokens ?? 0;
  return (i * PRICE.input + o * PRICE.output + cw * PRICE.cacheWrite + cr * PRICE.cacheRead) / 1e6;
}
function addU(a: Usage, b: Usage | undefined): Usage {
  return {
    input_tokens: (a.input_tokens ?? 0) + (b?.input_tokens ?? 0),
    output_tokens: (a.output_tokens ?? 0) + (b?.output_tokens ?? 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b?.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b?.cache_read_input_tokens ?? 0),
  };
}

for (const k of ["ANTHROPIC_API_KEY", "BROWSERLESS_API_KEY"] as const) {
  if (!process.env[k]) { console.error(`FATAL: ${k} missing — set it in .env.local.`); process.exit(1); }
}
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 280_000 });
console.log(`[calib] TWO-PASS | guards: totalSKIP>${SKIP_RATE_CEILING * 100}% OR backfillSKIP-share>${BACKFILL_SKIP_CEILING * 100}% → low-confidence | compare=${COMPARE}`);

interface Site { label: string; bucket: string; url: string; }
const SITES: Site[] = [
  { label: "Stripe",             bucket: "Strong SaaS (content-rich)", url: "https://stripe.com" },
  { label: "Plausible",          bucket: "Mid SaaS",                   url: "https://plausible.io" },
  { label: "Berkshire Hathaway", bucket: "Neglected real (thin)",      url: "https://www.berkshirehathaway.com" },
];

function readableTextLength(html: string): number {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
}

// one model call with the 90s inactivity timeout; returns text + usage + ms
async function call(maxTokens: number, system: ReturnType<typeof buildPass1SystemBlocks>, userContent: string): Promise<{ text: string; usage: Usage; ms: number }> {
  const t0 = Date.now();
  const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: userContent }] });
  let timedOut = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { timedOut = true; try { stream.abort(); } catch { /* */ } }, MODEL_INACTIVITY_TIMEOUT_MS); };
  stream.on("text", () => arm()); arm();
  let msg: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { msg = await stream.finalMessage(); }
  catch (e) { if (timedOut) throw new Error(`inactivity timeout ${MODEL_INACTIVITY_TIMEOUT_MS}ms`); throw e; }
  finally { clearTimeout(timer!); }
  const block = msg.content.find((c) => c.type === "text");
  return { text: block && block.type === "text" ? block.text : "", usage: msg.usage as Usage, ms: Date.now() - t0 };
}

interface ScrapeCtx { site: Site; site_type: string; complexity: string; scopedChecks: DiagnosticCheck[]; userContent: string; readableChars: number; gatePasses: boolean; }

async function scrapeCtx(site: Site): Promise<ScrapeCtx> {
  const extraction = await scrapeSite(site.url);
  const site_type = detectSiteType(extraction);
  const complexity = extraction.complexity ?? "medium";
  const readableChars = readableTextLength(extraction.rawHtml);
  const scopedChecks = scopeChecksForScan(site_type as any);
  const hardCap = complexity === "simple" ? 40_000 : complexity === "medium" ? 55_000 : 70_000;
  const userContent = `Analyze the following website HTML and return JSON analysis:\n\n=== HOMEPAGE: ${site.url} ===\n${extraction.rawHtml.slice(0, hardCap)}`;
  return { site, site_type, complexity, scopedChecks, userContent, readableChars, gatePasses: readableChars >= MIN_CONTENT_CHARS };
}

function dimCounts(rows: RubricResultRow[], scoped: DiagnosticCheck[]): Record<ApiDimensionKey, { pass: number; fail: number; skip: number }> {
  const idToCat = new Map(scoped.map((c) => [c.id, c.category]));
  const out = {} as Record<ApiDimensionKey, { pass: number; fail: number; skip: number }>;
  for (const k of API_DIMENSION_KEYS) out[k] = { pass: 0, fail: 0, skip: 0 };
  for (const r of rows) {
    const dim = CATEGORY_TO_DIMENSION[idToCat.get(r.id) ?? ""];
    if (!dim) continue;
    const s = String(r.status).toUpperCase();
    if (s === "PASS") out[dim as ApiDimensionKey].pass++; else if (s === "FAIL") out[dim as ApiDimensionKey].fail++; else out[dim as ApiDimensionKey].skip++;
  }
  return out;
}

function weightedScore(dims: Record<ApiDimensionKey, number>, siteType: string): number {
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

async function twoPass(ctx: ScrapeCtx) {
  const { site, site_type, scopedChecks, userContent } = ctx;
  const domain = new URL(site.url).hostname.replace(/^www\./, "");

  // PASS 1 — status only, retry once if incomplete
  let p1: ReturnType<typeof parseStatusRows>;
  let p1Usage: Usage = {}; let p1Ms = 0;
  { const c = await call(PASS1_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), userContent); p1 = parseStatusRows(c.text, scopedChecks); p1Usage = c.usage; p1Ms = c.ms; }
  let retried = false;
  if (p1.truncated || p1.backfilledIds.length > 0) {
    retried = true;
    const c = await call(PASS1_RETRY_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), userContent);
    p1 = parseStatusRows(c.text, scopedChecks); p1Usage = addU(p1Usage, c.usage); p1Ms += c.ms;
  }

  const statusRows = p1.rows;
  const counts = rubricCounts(statusRows, scopedChecks);
  const backfillSkips = p1.backfilledIds.length;
  const genuineSkips = counts.skips - backfillSkips;
  const skipRate = counts.skips / scopedChecks.length;
  const backfillShare = counts.skips > 0 ? backfillSkips / counts.skips : 0;
  const lowConfidence = skipRate > SKIP_RATE_CEILING || backfillShare > BACKFILL_SKIP_CEILING;

  const dims = computeApiDimensions(statusRows);
  const headline = lowConfidence ? null : weightedScore(dims, site_type);
  const { growthScore: legacy } = computeGrowthScoreFromRubric(statusRows, scopedChecks, null);

  // PASS 2 — narrative for FAIL ids only
  const failIds = statusRows.filter((r) => String(r.status).toUpperCase() === "FAIL").map((r) => r.id);
  let p2Usage: Usage = {}; let p2Ms = 0; let p2Fails = 0; let p2Truncated = false;
  if (failIds.length > 0 && !lowConfidence) {
    const byId = new Map(scopedChecks.map((c) => [c.id, c]));
    const failLines = failIds.map((id) => `${id} | ${byId.get(id)?.title ?? ""}`).join("\n");
    const pass2User = `${userContent}\n\n=== FAILED CHECKS (write the narrative for EACH) ===\n${failLines}`;
    try {
      const c = await call(PASS2_MAX_TOKENS, buildPass2SystemBlocks(scopedChecks), pass2User);
      const p2 = parsePass2Narrative(c.text);
      p2Usage = c.usage; p2Ms = c.ms; p2Fails = p2.returnedFailRows; p2Truncated = p2.truncated;
      mergeStatusAndNarrative(statusRows, p2.narratives); // exercise merge path
    } catch (e) { console.error(`  pass2 error (non-fatal): ${e instanceof Error ? e.message : e}`); }
  }

  console.log(`[API v1] RUBRIC | domain=${domain} score=${headline ?? "LOWc"} legacy_growth=${legacy} fails=${counts.fails} passes=${counts.passes} skips=${counts.skips}(genuine=${genuineSkips},backfill=${backfillSkips}) skipRate=${(skipRate * 100).toFixed(1)}% pass1Returned=${p1.returnedIds.size}/${scopedChecks.length} pass2Fails=${p2Fails}/${failIds.length} pass2Truncated=${p2Truncated}`);

  const totalUsage = addU(p1Usage, p2Usage);
  return {
    site_type, scopedCount: scopedChecks.length, readableChars: ctx.readableChars, gatePasses: ctx.gatePasses,
    p1Returned: p1.returnedIds.size, backfillSkips, genuineSkips, retried, counts,
    failIds: failIds.length, p2Fails, p2Truncated,
    dims, dimCounts: dimCounts(statusRows, scopedChecks), headline, legacy, lowConfidence, skipRate,
    p1Ms, p2Ms, p1Cost: costOf(p1Usage), p2Cost: costOf(p2Usage), totalMs: p1Ms + p2Ms, totalCost: costOf(totalUsage), totalUsage,
  };
}

async function singlePass(ctx: ScrapeCtx) {
  const { site_type, scopedChecks, userContent } = ctx;
  const c = await call(SINGLE_MAX_TOKENS, buildRubricSystemBlocks(scopedChecks), userContent);
  const parsed = parseRubricResponse(c.text, scopedChecks);
  const counts = rubricCounts(parsed.rows, scopedChecks);
  const dims = computeApiDimensions(parsed.rows);
  return {
    returned: parsed.returnedRows, scoped: scopedChecks.length, truncated: parsed.truncated,
    skips: counts.skips, headline: weightedScore(dims, site_type), ms: c.ms, cost: costOf(c.usage), usage: c.usage as Usage,
  };
}

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }
function usd(n: number): string { return `$${n.toFixed(4)}`; }

async function main() {
  const batch = ONLY ? SITES.filter((s) => s.url.includes(ONLY) || s.label.toLowerCase().includes(ONLY.toLowerCase())) : SITES;
  console.log(`[calib] running ${batch.length} site(s)${ONLY ? ` (filter: ${ONLY})` : ""}\n`);

  for (const site of batch) {
    console.log("\n" + "=".repeat(84));
    console.log(`${site.label}  [${site.bucket}]  ${site.url}`);
    console.log("-".repeat(84));
    let ctx: ScrapeCtx;
    try { ctx = await scrapeCtx(site); }
    catch (e) { console.log(`  SCRAPE FAILED → ${e instanceof Error ? e.message : e}  (noted, continuing)`); continue; }

    let tp: Awaited<ReturnType<typeof twoPass>>;
    try { tp = await twoPass(ctx); }
    catch (e) { console.log(`  TWO-PASS FAILED → ${e instanceof Error ? e.message : e}  (noted, continuing)`); continue; }

    console.log(`  detected siteType=${tp.site_type}  scopedChecks=${tp.scopedCount}  readableChars=${tp.readableChars} (gate ${tp.gatePasses ? "pass" : "BLOCK"})`);
    console.log(`  PASS 1 returned: ${tp.p1Returned}/${tp.scopedCount} ${tp.p1Returned === tp.scopedCount ? "✅ 100% (full denominator)" : "⚠ INCOMPLETE"}${tp.retried ? " (after 1 retry)" : ""}`);
    console.log(`  PASS 2 returned: ${tp.p2Fails}/${tp.failIds} fail-narratives${tp.p2Truncated ? " (truncated — findings only, score unaffected)" : ""}`);
    console.log(`  counts: PASS=${tp.counts.passes} FAIL=${tp.counts.fails} SKIP=${tp.counts.skips}  → genuine-SKIP=${tp.genuineSkips}  backfill-SKIP=${tp.backfillSkips}  (skipRate=${pct(tp.skipRate)})`);
    if (tp.lowConfidence) {
      console.log(`  ⛔ LOW-CONFIDENCE — no score (skipRate ${pct(tp.skipRate)} or backfill share over ceiling)`);
    } else {
      console.log(`  ┌── NEW HEADLINE (two-pass dim-weighted) : ${tp.headline}    (legacy deduction: ${tp.legacy})`);
      console.log(`  └── 7 dims (score | real denominator P/F, S excluded):`);
      for (const k of API_DIMENSION_KEYS) {
        const d = tp.dimCounts[k]; const denom = d.pass + d.fail;
        console.log(`        ${k.padEnd(24)} ${String(tp.dims[k]).padStart(3)}   denom=${denom} (P${d.pass}/F${d.fail})  skip=${d.skip}`);
      }
    }
    console.log(`  cost/latency: PASS1=${usd(tp.p1Cost)}/${(tp.p1Ms / 1000).toFixed(1)}s  PASS2=${usd(tp.p2Cost)}/${(tp.p2Ms / 1000).toFixed(1)}s  TOTAL two-pass=${usd(tp.totalCost)}/${(tp.totalMs / 1000).toFixed(1)}s`);

    if (COMPARE && tp.readableChars > 4000) { // only worth comparing on content-rich pages
      try {
        const sp = await singlePass(ctx);
        console.log(`  ── COMPARISON: OLD single 16K call ──`);
        console.log(`     returned ${sp.returned}/${sp.scoped} (truncated=${sp.truncated})  skips=${sp.skips}  → score=${sp.headline}   cost=${usd(sp.cost)}  latency=${(sp.ms / 1000).toFixed(1)}s`);
        console.log(`     Δ two-pass vs single: returned ${tp.p1Returned}/${tp.scopedCount} vs ${sp.returned}/${sp.scoped}  |  score ${tp.headline} vs ${sp.headline}  |  cost ${usd(tp.totalCost)} vs ${usd(sp.cost)}  |  latency ${(tp.totalMs / 1000).toFixed(1)}s vs ${(sp.ms / 1000).toFixed(1)}s`);
      } catch (e) { console.log(`  (single-call comparison failed: ${e instanceof Error ? e.message : e})`); }
    }
  }
  console.log("\n[calib] done — measurement only, nothing changed.");
}

main().catch((e) => { console.error("[calib] FATAL:", e); process.exit(1); });
