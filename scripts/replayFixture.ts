/**
 * scripts/replayFixture.ts — OFFLINE replay harness. Runs the rubric scoring pipeline against
 * a captured fixture's SAVED input (fixtures/<slug>.json). NO scrape, NO web, NO Browserless.
 *
 * MODES:
 *   (default) --no-model  Runs everything that does NOT need the LLM — scoping, the
 *                         denominator, the 27→7 dimension mapping, and the weight/curve math
 *                         (computeApiDimensions / computeGrowthScoreFromRubric /
 *                         calculateDimensionScores) over a SAVED status set if the fixture has
 *                         one, else a deterministic SYNTHETIC set. ZERO Anthropic calls — the
 *                         SDK is never even imported. Asserts determinism. The everyday mode.
 *   --model[=haiku|sonnet]  (explicit only) Runs the real status pass against the fixture's
 *                         saved summary input and reports tokens + cost. This is the ONLY mode
 *                         that ever touches Anthropic; it is IMPOSSIBLE to hit the API without
 *                         this flag. Default model: haiku.
 *
 * TARGETS: --site=stripe (one) or omitted (all fixtures in fixtures/).
 *
 *   npx tsx scripts/replayFixture.ts                 # all 5, no model, $0, 0 calls
 *   npx tsx scripts/replayFixture.ts --site=stripe
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/replayFixture.ts --model=haiku --site=stripe
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { scopeChecksForScan, computeApiDimensions, rubricCounts, CATEGORY_TO_DIMENSION, API_DIMENSION_KEYS, type ApiDimensionKey } from "../lib/rubricScan";
import { computeGrowthScoreFromRubric, type RubricResultRow } from "../lib/processFindings";
import { calculateDimensionScores } from "../lib/revenueDimensions";
import { getWeightProfile } from "../lib/benchmarks";
import type { SiteType } from "../lib/reportSchema";
import type { DiagnosticCheck } from "../lib/diagnosticRubric";

// ── arg parsing ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const siteArg = argv.find((a) => a.startsWith("--site="));
const SITE = siteArg ? siteArg.slice("--site=".length) : null;
const modelArg = argv.find((a) => a === "--model" || a.startsWith("--model="));
const MODEL_MODE = !!modelArg;
const MODEL_NAME = modelArg && modelArg.includes("=") ? modelArg.split("=")[1] : "haiku";

type Status = "PASS" | "FAIL" | "SKIP";
interface Fixture { url: string; slug: string; siteType: string; summary: string; scrapeRawHtml: string; statusRows?: { id: string; status: string }[] }

// Deterministic synthetic status for a check id (same id → same status, forever). Spreads a
// realistic ~55/25/20 PASS/FAIL/SKIP mix across every id so the 27→7 mapping + weight/curve
// math get exercised in all dimensions without ever calling the model.
function synthStatus(id: string): Status {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const b = h % 100;
  return b < 55 ? "PASS" : b < 80 ? "FAIL" : "SKIP";
}

function buildStatusRows(scoped: DiagnosticCheck[], fixture: Fixture): { rows: RubricResultRow[]; source: "saved" | "synthetic" } {
  if (Array.isArray(fixture.statusRows) && fixture.statusRows.length > 0) {
    const byId = new Map(fixture.statusRows.map((r) => [r.id, String(r.status).toUpperCase()]));
    return { rows: scoped.map((c) => ({ id: c.id, status: byId.get(c.id) ?? "SKIP" })), source: "saved" };
  }
  return { rows: scoped.map((c) => ({ id: c.id, status: synthStatus(c.id) })), source: "synthetic" };
}

// ── the non-LLM scoring math (identical to the route's headline computation) ────
function scoreFromRows(rows: RubricResultRow[], scoped: DiagnosticCheck[], siteType: string) {
  const counts = rubricCounts(rows, scoped);
  const dims = computeApiDimensions(rows);
  const w = getWeightProfile(siteType);
  const headline = Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
  const legacy = computeGrowthScoreFromRubric(rows, scoped, null).growthScore;
  const revenueDims = calculateDimensionScores(rows); // 5 revenue dims (curve math)
  // per-API-dimension answered(PASS+FAIL)/skip via the 27→7 map
  const idToCat = new Map(scoped.map((c) => [c.id, c.category]));
  const perDim = {} as Record<ApiDimensionKey, { ans: number; skip: number }>;
  for (const k of API_DIMENSION_KEYS) perDim[k] = { ans: 0, skip: 0 };
  for (const r of rows) {
    const dim = CATEGORY_TO_DIMENSION[idToCat.get(r.id) ?? ""] as ApiDimensionKey | undefined;
    if (!dim || !perDim[dim]) continue;
    const s = String(r.status).toUpperCase();
    if (s === "PASS" || s === "FAIL") perDim[dim].ans++; else perDim[dim].skip++;
  }
  return { counts, dims, headline, legacy, revenueDims, perDim };
}

// summaryContent wrapper — VERBATIM from app/api/v1/scan/route.ts (so --model input matches the real path).
function buildSummaryContent(summary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;
}

// ── model mode (the ONLY path that touches Anthropic; guarded behind --model) ───
async function runModelPass(fixture: Fixture, scoped: DiagnosticCheck[]): Promise<{ rows: RubricResultRow[]; inTok: number; outTok: number; cacheRead: number; cacheCreate: number }> {
  const modelId = MODEL_NAME === "sonnet" ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
  console.log(`  ⚠ WARNING: --model=${MODEL_NAME} will make a PAID Anthropic API call (model=${modelId}) against fixture "${fixture.slug}".`);
  if (!process.env.ANTHROPIC_API_KEY) { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile?.(".env.local"); }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing — required for --model mode");
  // Dynamic import so the SDK is NEVER loaded in --no-model mode.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { buildPass1SystemBlocks, parseStatusRows } = await import("../lib/rubricScan");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 200_000 });
  const msg = await client.messages.create({
    model: modelId, max_tokens: 8000, temperature: 0,
    system: buildPass1SystemBlocks(scoped),
    messages: [{ role: "user", content: buildSummaryContent(fixture.summary) }],
  });
  const u = msg.usage;
  const block = msg.content.find((c) => c.type === "text");
  const parsed = parseStatusRows(block && block.type === "text" ? block.text : "", scoped);
  return { rows: parsed.rows, inTok: u?.input_tokens ?? 0, outTok: u?.output_tokens ?? 0, cacheRead: u?.cache_read_input_tokens ?? 0, cacheCreate: u?.cache_creation_input_tokens ?? 0 };
}

// Confirmed Sonnet $/MTok from lib/scanCost.ts; haiku rates not pinned in-repo → tokens only.
const SONNET = { in: 3, out: 15, cr: 0.3, cc: 3.75 };

async function main() {
  if (!existsSync("fixtures")) { console.error("FATAL: fixtures/ not found — run scripts/captureFixtures.ts first."); process.exit(1); }
  let slugs = readdirSync("fixtures").filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  if (SITE) slugs = slugs.filter((s) => s === SITE);
  if (slugs.length === 0) { console.error(`FATAL: no fixtures matched${SITE ? ` --site=${SITE}` : ""}.`); process.exit(1); }

  console.log(`\n=== replayFixture — ${MODEL_MODE ? `MODEL mode (${MODEL_NAME})` : "NO-MODEL mode (offline, $0)"} — ${slugs.length} fixture(s) ===`);
  if (!MODEL_MODE) console.log(`(Anthropic SDK not imported; no key needed; zero API calls)\n`);

  let modelCalls = 0;
  interface Out { slug: string; siteType: string; denom: number; headline: number; legacy: number; source: string; perDim: Record<ApiDimensionKey, { ans: number; skip: number }>; counts: ReturnType<typeof rubricCounts>; tokens?: string; cost?: string; assertPass: boolean }
  const outs: Out[] = [];

  for (const slug of slugs) {
    const fixture = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8")) as Fixture;
    const siteType = fixture.siteType || "unknown";
    const scoped = scopeChecksForScan(siteType as SiteType);

    let rows: RubricResultRow[]; let source: string; let tokens: string | undefined; let cost: string | undefined;
    if (MODEL_MODE) {
      const m = await runModelPass(fixture, scoped); modelCalls++;
      rows = m.rows; source = `model:${MODEL_NAME}`;
      tokens = `in=${m.inTok} out=${m.outTok} cacheRead=${m.cacheRead} cacheCreate=${m.cacheCreate}`;
      cost = MODEL_NAME === "sonnet"
        ? `$${((m.inTok * SONNET.in + m.outTok * SONNET.out + m.cacheRead * SONNET.cr + m.cacheCreate * SONNET.cc) / 1e6).toFixed(4)}`
        : `tokens only (haiku $/MTok not pinned in-repo)`;
      // Persist the REAL status set back into the fixture (gitignored) so future --no-model
      // replays use SAVED statuses instead of synthetic.
      const full = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
      full.statusRows = rows.map((r) => ({ id: r.id, status: r.status }));
      full.lastModel = { model: MODEL_NAME, at: new Date().toISOString() };
      writeFileSync(`fixtures/${slug}.json`, JSON.stringify(full, null, 2));
      console.log(`  saved real statusRows back to fixtures/${slug}.json`);
    } else {
      const built = buildStatusRows(scoped, fixture); rows = built.rows; source = built.source;
    }

    const r = scoreFromRows(rows, scoped, siteType);
    // Determinism check: recompute and require identical headline + per-dim + denominator.
    const r2 = scoreFromRows(rows, scoped, siteType);
    const assertPass =
      r.headline === r2.headline &&
      r.counts.totalChecks === scoped.length &&
      API_DIMENSION_KEYS.every((k) => r.dims[k] >= 0 && r.dims[k] <= 100 && r.perDim[k].ans + r.perDim[k].skip >= 0) &&
      JSON.stringify(r.perDim) === JSON.stringify(r2.perDim);

    outs.push({ slug, siteType, denom: scoped.length, headline: r.headline, legacy: r.legacy, source, perDim: r.perDim, counts: r.counts, tokens, cost, assertPass });

    console.log(`\n--- ${slug} (siteType=${siteType}, statuses=${source}) ---`);
    console.log(`  denominator (total scoped): ${scoped.length} | answered=${r.counts.passes + r.counts.fails} skip=${r.counts.skips} (PASS=${r.counts.passes} FAIL=${r.counts.fails})`);
    console.log(`  headline score (weighted 7-dim): ${r.headline} | legacy growthScore: ${r.legacy}`);
    console.log(`  per-dimension answered/skip:`);
    for (const k of API_DIMENSION_KEYS) console.log(`    ${k.padEnd(24)} ${r.perDim[k].ans}/${r.perDim[k].skip}  (dim score ${r.dims[k]})`);
    if (tokens) console.log(`  model tokens: ${tokens} | est cost: ${cost}`);
    console.log(`  assertions (determinism + denom + dim bounds): ${assertPass ? "PASS" : "FAIL"}`);
  }

  // ── compact table + the explicit guarantee ──
  console.log(`\n================ REPLAY SUMMARY (${MODEL_MODE ? `model=${MODEL_NAME}` : "no-model"}) ================`);
  console.log("slug          | siteType | denom | answered/skip | headline | legacy | statuses   | assert");
  for (const o of outs) {
    const ans = o.counts.passes + o.counts.fails;
    console.log(`${o.slug.padEnd(13)} | ${o.siteType.padEnd(8)} | ${String(o.denom).padStart(5)} | ${String(ans + "/" + o.counts.skips).padStart(13)} | ${String(o.headline).padStart(8)} | ${String(o.legacy).padStart(6)} | ${o.source.padEnd(10)} | ${o.assertPass ? "PASS" : "FAIL"}`);
  }
  console.log(`\nmodel calls: ${modelCalls}`);
  if (!MODEL_MODE) console.log(`Anthropic calls: 0 | est cost: $0.0000 (SDK never imported in --no-model mode)`);
  console.log(`assertions: ${outs.every((o) => o.assertPass) ? "ALL PASS" : "SOME FAILED"}`);
  console.log("\n(done)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
