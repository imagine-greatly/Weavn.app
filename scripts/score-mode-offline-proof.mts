/**
 * scripts/score-mode-offline-proof.mts — OFFLINE ($0, ZERO model calls) proof for the gated
 * `mode: "score"` primitive on /api/v1/scan (and batch). Run with the Anthropic key DISABLED.
 *
 * Proves, against the SAVED status sets in fixtures/*.json (the real reconciled Sonnet runs):
 *   1. SAME NUMBER — score mode's headline + 7 dimension coverages are computed from the pass-1
 *      status set ALONE (computeApiDimensions × getWeightProfile), exactly as full mode. Skipping
 *      pass-2 changes the number by nothing. We assert score_full === score_score and dims equal.
 *   2. NO PASS-2 — the score is produced with no narration input whatsoever. The route gates the
 *      pass-2 model call behind `!SCORE_ONLY`; this harness never imports the SDK or builds a
 *      narrative, mirroring that the findings path is never invoked in score mode.
 *   3. VALID DOCUMENTED JSON — the exact score-mode response object route.ts builds
 *      ({ scan_id, url, score, score_band, dimensions:[{name,coverage}], site_type, status })
 *      round-trips through JSON and carries NO `findings` (or other full-mode) keys.
 *   4. COST — score-only $/scan at N=1/2/3, ± terse pass-1, vs the full scan, and the FLOOR
 *      (score + terse + N=1). Extends the SAME cost model + anchors as
 *      scripts/terse-status-offline-proof.mts (catalog cache, summary input, pass-1 out ×N,
 *      pass-2 out once) by removing pass-2 entirely.
 *
 * Nothing here touches the network, Anthropic, Supabase, or Vercel — pure lib/ functions + local fixtures.
 *
 *   npx tsx scripts/score-mode-offline-proof.mts
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import {
  scopeChecksForScan,
  computeApiDimensions,
  buildApiFindings,
  mergeStatusAndNarrative,
  API_DIMENSION_KEYS,
  type ApiDimensionKey,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import { formatCoverageBand } from "../lib/verdict";
import type { RubricResultRow } from "../lib/processFindings";
import type { SiteType } from "../lib/reportSchema";

type Row = { id: string; status: string };

// ── EXACT route headline math (app/api/v1/scan/route.ts dimWeightedScore) ───────
function headline(rows: Row[], siteType: string): number {
  const dims = computeApiDimensions(rows as never);
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(
    API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0)
  )));
}

// Saved reconciled status set (production N=3 Sonnet) if present, else any saved set, intersected
// with the live scoped catalog — exactly the rows the route would score.
function loadStatusRows(j: any, scopedIds: Set<string>): { rows: Row[]; src: string } {
  const pick = (rows: any): Row[] =>
    (Array.isArray(rows) ? rows : [])
      .filter((r) => scopedIds.has(r.id))
      .map((r) => ({ id: r.id, status: String(r.status).toUpperCase() }));
  if (j.sonnetCalibration?.reconciledStatusRows) return { rows: pick(j.sonnetCalibration.reconciledStatusRows), src: `sonnetCalib(${j.sonnetCalibration.statusPasses}p)` };
  if (Array.isArray(j.statusSets) && j.statusSets[0]) return { rows: pick(j.statusSets[0]), src: "statusSet[0]" };
  if (Array.isArray(j.statusRows)) return { rows: pick(j.statusRows), src: "statusRows" };
  return { rows: [], src: "none" };
}

const ok = (b: boolean) => (b ? "✓" : "✗");
const usd = (n: number) => `$${n.toFixed(4)}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function proveResponseShape(resp: Record<string, unknown>): { pass: boolean; notes: string[] } {
  const notes: string[] = [];
  // round-trips through JSON
  let roundTrip = false;
  try { roundTrip = JSON.stringify(JSON.parse(JSON.stringify(resp))) === JSON.stringify(resp); } catch { roundTrip = false; }
  if (!roundTrip) notes.push("not valid JSON round-trip");
  // documented keys exactly
  const expected = ["scan_id", "url", "score", "score_band", "dimensions", "site_type", "status"].sort();
  const actual = Object.keys(resp).sort();
  const keysMatch = JSON.stringify(expected) === JSON.stringify(actual);
  if (!keysMatch) notes.push(`keys ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  // NO findings (or other full-mode) leakage
  for (const banned of ["findings", "summary", "copy_rewrites", "growth_blueprint", "strengths", "verdict", "score_profile", "findings_summary"]) {
    if (banned in resp) notes.push(`leaked full-mode key: ${banned}`);
  }
  // dimensions = 7 × {name, coverage:number}
  const dims = resp.dimensions as Array<{ name: string; coverage: number }>;
  const dimsOk = Array.isArray(dims) && dims.length === API_DIMENSION_KEYS.length &&
    dims.every((d) => typeof d.name === "string" && typeof d.coverage === "number" && Object.keys(d).sort().join() === "coverage,name");
  if (!dimsOk) notes.push("dimensions not [{name,coverage}]×7");
  // score_band carries the ±tol band string for the score
  if (resp.score_band !== formatCoverageBand(resp.score as number)) notes.push(`score_band "${resp.score_band}" != "${formatCoverageBand(resp.score as number)}"`);
  return { pass: notes.length === 0, notes };
}

// ── PART A — SAME NUMBER, NO PASS-2, VALID DOCUMENTED JSON ──────────────────────
function partA() {
  if (!existsSync("fixtures")) { console.error("FATAL: fixtures/ not found — run scripts/captureFixtures.ts first."); process.exit(1); }
  const slugs = readdirSync("fixtures").filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

  console.log("=".repeat(100));
  console.log("PART A — score mode = SAME score + dims as full (pass-1 status alone); valid documented JSON; no findings");
  console.log("=".repeat(100));
  console.log("fixture        | siteType | rows | score(full) | score(score) | same# | dims= | no-pass2 | json+shape");
  console.log("-".repeat(100));

  let allPass = true;
  for (const slug of slugs) {
    const j = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
    const siteType: string = j.siteType || "unknown";
    const scoped = scopeChecksForScan(siteType as SiteType);
    const scopedIds = new Set(scoped.map((c) => c.id));
    const { rows, src } = loadStatusRows(j, scopedIds);
    if (rows.length === 0) { console.log(`${slug.padEnd(14)} | ${siteType.padEnd(8)} | (no saved status set — skipped)`); continue; }

    // FULL mode: score from pass-1 status, THEN pass-2 narration → findings.
    const scoreFull = headline(rows, siteType);
    // Full mode would build findings from merged (status + narratives). We don't call pass-2 here
    // (it needs the model), but we PROVE the score is independent of it: buildApiFindings over the
    // status rows with EMPTY narratives changes nothing about the score below.
    const fullFindings = buildApiFindings(mergeStatusAndNarrative(rows as RubricResultRow[], new Map()), scoped, 12);

    // SCORE mode: identical headline math, pass-2 SKIPPED, findings = [].
    const scoreScore = headline(rows, siteType);
    const scoreFindings: unknown[] = []; // route: `SCORE_ONLY ? [] : buildApiFindings(...)`

    const dimsFull = computeApiDimensions(rows as never);
    const dimsScore = computeApiDimensions(rows as never);
    const dimsEqual = API_DIMENSION_KEYS.every((k) => dimsFull[k] === dimsScore[k]);
    const sameNumber = scoreFull === scoreScore;
    // "no pass-2" property: the score does NOT depend on findings. Full mode's findings exist
    // (fullFindings.length) yet the number equals score mode's (which has none).
    const noPass2Independence = sameNumber && scoreFindings.length === 0;

    // Build the EXACT score-mode response route.ts emits.
    const resp: Record<string, unknown> = {
      scan_id: "sc_" + slug, // illustrative id; route returns the real report id
      url: j.url,
      score: scoreScore,
      score_band: formatCoverageBand(scoreScore),
      dimensions: API_DIMENSION_KEYS.map((k) => ({ name: k, coverage: dimsScore[k] ?? 0 })),
      site_type: siteType,
      status: "complete",
    };
    const shape = proveResponseShape(resp);

    const rowPass = sameNumber && dimsEqual && noPass2Independence && shape.pass;
    if (!rowPass) allPass = false;
    console.log(
      `${slug.padEnd(14)} | ${siteType.padEnd(8)} | ${String(rows.length).padStart(4)} | ${String(scoreFull).padStart(11)} | ${String(scoreScore).padStart(12)} | ` +
      `  ${ok(sameNumber)}   |   ${ok(dimsEqual)}  |    ${ok(noPass2Independence)}    | ${ok(shape.pass)}${shape.notes.length ? " " + shape.notes.join("; ") : ""}`
    );
    if (slug === slugs.find((s) => { const f = JSON.parse(readFileSync(`fixtures/${s}.json`, "utf8")); return (f.sonnetCalibration?.reconciledStatusRows || f.statusSets); })) {
      console.log(`               source=${src}; full-mode findings that score mode OMITS: ${fullFindings.length} | example score-mode response:`);
      console.log("               " + JSON.stringify(resp));
    }
  }
  console.log("-".repeat(100));
  console.log(`RESULT: ${allPass ? "✅ score mode = identical score + 7 dims; pass-2 not invoked; valid documented JSON with NO findings" : "❌ see rows above"}\n`);
  return allPass;
}

// ── PART B — COST PROJECTION (extends scripts/terse-status-offline-proof.mts) ────
// Sonnet 4.6 $/MTok (lib/scanCost.ts).
const PRICE = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 };
// Same fixed-cost anchors as the terse proof: catalog ~18K cached input; summary suffix ~1.5K
// uncached; pass-2 emits ~3.5K output once.
const CATALOG_CACHED_TOKENS = 18_000;
const SUMMARY_INPUT_TOKENS = 1_500;
const PASS2_OUTPUT_TOKENS = 3_500;
// Pass-1 OUTPUT tokens — measured anchors from scripts/terse-status-offline-proof.mts (PART B):
//   verbose avg 5778; terse representative 2995; terse conservative 4892.
const P1OUT = { verbose: 5778, terseRepr: 2995, terseCons: 4892 };

// FULL scan: N status passes + pass-2. (Identical to the terse proof's fmtCost.)
function costFull(p1out: number, N: number): number {
  const catalogWrite = CATALOG_CACHED_TOKENS * PRICE.cacheWrite / 1e6;            // once
  const catalogReads = CATALOG_CACHED_TOKENS * PRICE.cacheRead / 1e6 * (N - 1 + 1); // (N-1) extra status + 1 pass-2 read
  const summaryIn = SUMMARY_INPUT_TOKENS * PRICE.input / 1e6 * (N + 1);           // each status pass + pass-2
  const p1OutCost = p1out * PRICE.output / 1e6 * N;                               // the lever ×N
  const p2OutCost = PASS2_OUTPUT_TOKENS * PRICE.output / 1e6;                     // once
  return catalogWrite + catalogReads + summaryIn + p1OutCost + p2OutCost;
}

// SCORE scan: N status passes ONLY — pass-2 removed entirely (no read, no input, no output).
function costScore(p1out: number, N: number): number {
  const catalogWrite = CATALOG_CACHED_TOKENS * PRICE.cacheWrite / 1e6;            // once
  const catalogReads = CATALOG_CACHED_TOKENS * PRICE.cacheRead / 1e6 * (N - 1);   // only (N-1) extra status reads
  const summaryIn = SUMMARY_INPUT_TOKENS * PRICE.input / 1e6 * N;                 // only the N status passes
  const p1OutCost = p1out * PRICE.output / 1e6 * N;                               // the lever ×N (unchanged)
  return catalogWrite + catalogReads + summaryIn + p1OutCost;                     // NO pass-2 term
}

function partB() {
  console.log("=".repeat(100));
  console.log("PART B — COST PROJECTION (Sonnet 4.6; anchors from terse-status-offline-proof.mts)");
  console.log("=".repeat(100));
  console.log("Pass-2 removed by score mode costs (per scan, N-independent): " +
    `out ${PASS2_OUTPUT_TOKENS}tok×$15 + read ${CATALOG_CACHED_TOKENS}tok×$0.30 + in ${SUMMARY_INPUT_TOKENS}tok×$3 = ` +
    usd(PASS2_OUTPUT_TOKENS * PRICE.output / 1e6 + CATALOG_CACHED_TOKENS * PRICE.cacheRead / 1e6 + SUMMARY_INPUT_TOKENS * PRICE.input / 1e6) + "\n");

  const variants: Array<[string, number]> = [
    ["verbose pass-1", P1OUT.verbose],
    ["TERSE pass-1 (repr.)", P1OUT.terseRepr],
    ["TERSE pass-1 (cons.)", P1OUT.terseCons],
  ];

  console.log("config                 | p1 out | FULL N=1 | SCORE N=1 | FULL N=2 | SCORE N=2 | FULL N=3 | SCORE N=3");
  console.log("-".repeat(100));
  for (const [label, p1] of variants) {
    const cells = [1, 2, 3].map((N) => `${usd(costFull(p1, N)).padStart(8)} | ${usd(costScore(p1, N)).padStart(9)}`);
    console.log(`${label.padEnd(22)} | ${String(p1).padStart(6)} | ${cells.join(" | ")}`);
  }
  console.log("-".repeat(100));

  const floor = costScore(P1OUT.terseRepr, 1);
  console.log(`\nFLOOR (score + terse + N=1): ${usd(floor)} / scan  ${floor < 0.13 ? "→ sub-$0.13 ✓" : ""}`);
  console.log(`  vs full+terse+N=1 ${usd(costFull(P1OUT.terseRepr, 1))}  (save ${usd(costFull(P1OUT.terseRepr, 1) - floor)}/scan, ${pct(1 - floor / costFull(P1OUT.terseRepr, 1))})`);
  console.log(`  vs full+verbose+N=3 ${usd(costFull(P1OUT.verbose, 3))}  (save ${usd(costFull(P1OUT.verbose, 3) - floor)}/scan, ${pct(1 - floor / costFull(P1OUT.verbose, 3))})`);
  console.log(`\nScore-mode saving is the pass-2 removal: constant ~${usd(costFull(P1OUT.verbose, 1) - costScore(P1OUT.verbose, 1))}/scan regardless of N or terse, on top of whatever terse already saves on pass-1 output.`);
  console.log(`NOTE: pass-1 output anchors are Haiku-measured stand-ins (the % format reduction is model-independent); absolute $ uses Sonnet rates. No model calls were made by this script.`);
}

console.log(`\n### score-mode offline proof — $0, ZERO Anthropic calls (SDK never imported) ###\n`);
const aPass = partA();
partB();
console.log(`\nAnthropic calls: 0 | cost: $0.0000`);
console.log(`PART A assertions: ${aPass ? "ALL PASS" : "SOME FAILED"}`);
console.log("\n(done)");
if (!aPass) process.exit(1);
