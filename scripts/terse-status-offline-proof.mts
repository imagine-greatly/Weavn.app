/**
 * scripts/terse-status-offline-proof.mts — OFFLINE ($0, ZERO model calls) proof for the
 * gated WEAVN_TERSE_STATUS pass-1 output format.
 *
 * Replays the PASS/FAIL/SKIP decisions saved in fixtures/*.json (the real Haiku/Sonnet status
 * runs) as if they were the model's output, then proves:
 *   1. PARSE  — parseStatusRowsTerse extracts all statuses (returnedIds complete, no backfill).
 *   2. SCORE  — denominator, 7 dimensions, and the weighted headline are IDENTICAL whether the
 *               same statuses arrive via the verbose object format or the terse string format.
 *   3. TOKENS — exact output CHAR counts verbose vs terse, anchored to the REAL measured pass-1
 *               output tokens saved in each run's usage, → projected terse tokens + $/scan @ N=1/2/3.
 *
 * Nothing here touches the network, Anthropic, Supabase, or Vercel. It only imports pure
 * functions from lib/ and reads local fixtures.
 *
 *   npx tsx scripts/terse-status-offline-proof.mts
 */

import fs from "node:fs";
import path from "node:path";
import {
  scopeChecksForScan,
  parseStatusRows,
  parseStatusRowsTerse,
  computeApiDimensions,
  API_DIMENSION_KEYS,
  type ApiDimensionKey,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { SiteType } from "../lib/reportSchema";

type Status = "PASS" | "FAIL" | "SKIP";
type SavedRow = { id: string; status: string; skipReason?: string };

// ── Output reconstruction (what the model emits in each format) ──────────────
// Verbose = today's pass-1 contract: one JSON object per check; SKIP carries a one-clause
// skipReason. Terse = the gated contract: one short string per check; only FAIL carries a clause.
// Clause lengths are modeled (the saved fixtures stored parsed rows, not raw skipReason text);
// we sweep them to bracket the projection rather than cherry-pick one.

function verboseOutput(rows: SavedRow[], skipClauseLen: number): string {
  const clause = "x".repeat(skipClauseLen);
  const results = rows.map((r) => {
    const st = String(r.status).toUpperCase();
    if (st === "SKIP") return `{"id":"${r.id}","status":"SKIP","skipReason":"${clause}"}`;
    return `{"id":"${r.id}","status":"${st}"}`;
  });
  return `{"page_type":"homepage","results":[${results.join(",")}]}`;
}

function terseOutput(rows: SavedRow[], failClauseLen: number): string {
  const clause = "x".repeat(failClauseLen);
  const results = rows.map((r) => {
    const st = String(r.status).toUpperCase();
    const letter = st === "PASS" ? "P" : st === "FAIL" ? "F" : "S";
    const body = st === "FAIL" && failClauseLen > 0 ? `${r.id} F ${clause}` : `${r.id} ${letter}`;
    return JSON.stringify(body);
  });
  return `{"page_type":"homepage","results":[${results.join(",")}]}`;
}

// ── Scoring (mirrors route.ts headline math) ─────────────────────────────────
function weightedScore(rows: Array<{ id: string; status: string }>, siteType: string): number {
  const dims = computeApiDimensions(rows);
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(
    API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0)
  )));
}
function dimsOf(rows: Array<{ id: string; status: string }>): Record<ApiDimensionKey, number> {
  return computeApiDimensions(rows);
}
function statusVec(rows: Array<{ id: string; status: string }>): string {
  return rows.map((r) => `${r.id}:${String(r.status).toUpperCase()}`).join("|");
}

// ── Sonnet 4.6 pricing ($/MTok) — the live pass-1 model ──────────────────────
const PRICE = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 };

// Representative fixed costs of one scan (Sonnet), from fixture usage: the catalog is ~18K cached
// input tokens, the summary suffix ~1.5K uncached, pass-2 emits ~3.5K output once.
const CATALOG_CACHED_TOKENS = 18_000;
const SUMMARY_INPUT_TOKENS = 1_500;
const PASS2_OUTPUT_TOKENS = 3_500;

interface RunRec {
  fixture: string; src: string; model: string; siteType: string;
  scoped: number; rows: SavedRow[];
  measuredP1Out: number | null;
  pass: boolean; mismatches: string[];
  scoreV: number; scoreT: number; dimsEqual: boolean;
}

const COUNTS = { P: 0, F: 0, S: 0 };
function countStatuses(rows: SavedRow[]) {
  let P = 0, F = 0, S = 0;
  for (const r of rows) { const s = String(r.status).toUpperCase(); if (s === "PASS") P++; else if (s === "FAIL") F++; else S++; }
  return { P, F, S };
}

function loadRuns(fixture: string): RunRec[] {
  const j = JSON.parse(fs.readFileSync(path.join("fixtures", `${fixture}.json`), "utf8"));
  const siteType: string = j.siteType;
  const scopedChecks = scopeChecksForScan(siteType as SiteType);
  const scopedIds = new Set(scopedChecks.map((c) => c.id));
  const recs: RunRec[] = [];

  const pushRun = (src: string, model: string, rows: SavedRow[], measuredP1Out: number | null) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    // Only score over ids that are actually in the scoped catalog (defensive intersect).
    const usable = rows.filter((r) => scopedIds.has(r.id));

    // Build both output formats from the SAME decisions, parse each via the REAL parsers.
    const vText = verboseOutput(usable, 50);
    const tText = terseOutput(usable, 30);
    const pv = parseStatusRows(vText, scopedChecks);
    const pt = parseStatusRowsTerse(tText, scopedChecks);

    // 1) PARSE completeness: terse must return every id, backfill nothing.
    const mismatches: string[] = [];
    if (pt.returnedIds.size !== usable.length) mismatches.push(`terse returnedIds ${pt.returnedIds.size} != ${usable.length}`);
    if (pt.backfilledIds.length !== 0) mismatches.push(`terse backfilled ${pt.backfilledIds.length}`);

    // 2) STATUS identity across all scoped rows (verbose vs terse vs original intent).
    if (statusVec(pv.rows) !== statusVec(pt.rows)) {
      mismatches.push("status vectors differ (verbose vs terse)");
      for (let i = 0; i < pv.rows.length; i++) {
        if (String(pv.rows[i].status).toUpperCase() !== String(pt.rows[i].status).toUpperCase()) {
          mismatches.push(`  ${pv.rows[i].id}: V=${pv.rows[i].status} T=${pt.rows[i].status}`);
          if (mismatches.length > 6) break;
        }
      }
    }

    // 3) SCORE identity: dimensions + weighted headline.
    const scoreV = weightedScore(pv.rows, siteType);
    const scoreT = weightedScore(pt.rows, siteType);
    if (scoreV !== scoreT) mismatches.push(`score V=${scoreV} T=${scoreT}`);
    const dV = dimsOf(pv.rows), dT = dimsOf(pt.rows);
    let dimsEqual = true;
    for (const k of API_DIMENSION_KEYS) if (dV[k] !== dT[k]) { dimsEqual = false; mismatches.push(`dim ${k}: V=${dV[k]} T=${dT[k]}`); }

    const c = countStatuses(usable); COUNTS.P += c.P; COUNTS.F += c.F; COUNTS.S += c.S;
    recs.push({ fixture, src, model, siteType, scoped: scopedChecks.length, rows: usable, measuredP1Out, pass: mismatches.length === 0, mismatches, scoreV, scoreT, dimsEqual });
  };

  if (j.haikuValidation?.runs) for (const r of j.haikuValidation.runs) pushRun(`haikuVal r${r.run}`, j.haikuValidation.model, r.statusRows, r.usage?.pass1?.output_tokens ?? null);
  if (j.haikuConfirm?.runs) for (const r of j.haikuConfirm.runs) pushRun(`haikuConf r${r.run}`, j.haikuConfirm.model, r.statusRows, r.usage?.pass1?.output_tokens ?? null);
  if (j.sonnetCalibration?.reconciledStatusRows) pushRun(`sonnetCalib(${j.sonnetCalibration.statusPasses}p)`, j.sonnetCalibration.model, j.sonnetCalibration.reconciledStatusRows, j.sonnetCalibration.usage?.pass1?.output_tokens ?? null);
  return recs;
}

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }
function usd(n: number): string { return `$${n.toFixed(4)}`; }

function main() {
  const fixtures = ["berkshire", "plausible", "stripe"];
  const all: RunRec[] = [];
  for (const f of fixtures) all.push(...loadRuns(f));

  console.log("=".repeat(96));
  console.log("PART A — PARSE + SCORE IDENTITY (verbose vs terse over identical saved statuses)");
  console.log("=".repeat(96));
  console.log("fixture        | run              | siteType | rows | scoreV | scoreT | dims= | parse");
  console.log("-".repeat(96));
  let allPass = true;
  for (const r of all) {
    if (!r.pass) allPass = false;
    console.log(
      `${r.fixture.padEnd(14)} | ${r.src.padEnd(16)} | ${r.siteType.padEnd(8)} | ${String(r.rows.length).padStart(4)} | ` +
      `${String(r.scoreV).padStart(6)} | ${String(r.scoreT).padStart(6)} | ${r.dimsEqual ? "  ✓  " : "  ✗  "} | ${r.pass ? `✓ all ${r.rows.length} statuses match` : "✗ " + r.mismatches.join("; ")}`
    );
  }
  console.log("-".repeat(96));
  console.log(`RESULT: ${allPass ? "✅ ALL runs — terse statuses, denominator, 7 dims, and headline IDENTICAL to verbose" : "❌ MISMATCH (see rows above)"}`);
  console.log(`Status mix across all replays: PASS=${COUNTS.P} FAIL=${COUNTS.F} SKIP=${COUNTS.S} (total ${COUNTS.P + COUNTS.F + COUNTS.S} check-decisions)\n`);

  // ── PART B — token + cost projection, anchored on REAL measured pass-1 output tokens ──
  console.log("=".repeat(96));
  console.log("PART B — OUTPUT TOKEN + COST PROJECTION  (anchored on real measured pass-1 output tokens)");
  console.log("=".repeat(96));

  // Per-run: exact output chars verbose vs terse, then projected terse tokens =
  // measured_verbose_tokens × (terse_chars / verbose_chars). Bracket with skip/fail clause sweep.
  const SKIP_LENS = [0, 50];   // verbose skipReason modeled length (0 = give verbose zero skip-text credit = conservative)
  const FAIL_LENS = [25, 40];  // terse FAIL clause modeled length

  const withMeasured = all.filter((r) => typeof r.measuredP1Out === "number");
  const measuredAvg = withMeasured.reduce((s, r) => s + (r.measuredP1Out as number), 0) / withMeasured.length;

  console.log(`\nCurrent pass-1 output tokens (REAL, from fixture usage): n=${withMeasured.length} runs, ` +
    `min=${Math.min(...withMeasured.map(r => r.measuredP1Out as number))} max=${Math.max(...withMeasured.map(r => r.measuredP1Out as number))} avg=${measuredAvg.toFixed(0)}`);
  console.log(`(measured runs are Haiku; the saved Sonnet calibration did not persist pass-1 usage. The FORMAT reduction below is model-independent — it is a property of the bytes emitted, applied to whichever baseline.)\n`);

  console.log("Char reduction (exact) + projected terse output tokens, swept over clause lengths:");
  console.log("skipLen/failLen | verbose chars | terse chars | char reduction | proj terse tok (avg) | reduction");
  console.log("-".repeat(96));

  type Cell = { vChars: number; tChars: number; projTok: number; redChar: number };
  const grid: Record<string, Cell> = {};
  for (const sL of SKIP_LENS) for (const fL of FAIL_LENS) {
    let vCharsSum = 0, tCharsSum = 0, projTokSum = 0, projN = 0;
    for (const r of all) {
      const v = verboseOutput(r.rows, sL).length;
      const t = terseOutput(r.rows, fL).length;
      vCharsSum += v; tCharsSum += t;
      if (typeof r.measuredP1Out === "number") { projTokSum += (r.measuredP1Out as number) * (t / v); projN++; }
    }
    const redChar = 1 - tCharsSum / vCharsSum;
    const projTok = projTokSum / projN;
    grid[`${sL}/${fL}`] = { vChars: vCharsSum, tChars: tCharsSum, projTok, redChar };
    console.log(
      `${(`${sL}/${fL}`).padEnd(15)} | ${String(vCharsSum).padStart(13)} | ${String(tCharsSum).padStart(11)} | ` +
      `${pct(redChar).padStart(14)} | ${projTok.toFixed(0).padStart(20)} | ${pct(1 - projTok / measuredAvg)}`
    );
  }

  // Conservative cell = smallest reduction (skipLen 0 = no verbose skip credit, failLen 40 = longest terse clause).
  const cons = grid["0/40"];
  const repr = grid["50/25"]; // representative: one-clause skipReason, short FAIL hook
  console.log("-".repeat(96));
  console.log(`Conservative (skip0/fail40): terse ≈ ${cons.projTok.toFixed(0)} tok/pass  (${pct(1 - cons.projTok / measuredAvg)} reduction vs ${measuredAvg.toFixed(0)})`);
  console.log(`Representative (skip50/fail25): terse ≈ ${repr.projTok.toFixed(0)} tok/pass  (${pct(1 - repr.projTok / measuredAvg)} reduction)\n`);

  // ── $/scan: pass-1 OUTPUT is the only cost multiplied by N. ──
  const fmtCost = (p1out: number, N: number) => {
    const catalogWrite = CATALOG_CACHED_TOKENS * PRICE.cacheWrite / 1e6;                 // once
    const catalogReads = CATALOG_CACHED_TOKENS * PRICE.cacheRead / 1e6 * (N - 1 + 1);    // N-1 extra status reads + 1 pass-2 read
    const summaryIn = SUMMARY_INPUT_TOKENS * PRICE.input / 1e6 * (N + 1);                 // each status pass + pass-2
    const p1OutCost = p1out * PRICE.output / 1e6 * N;                                     // THE lever ×N
    const p2OutCost = PASS2_OUTPUT_TOKENS * PRICE.output / 1e6;                           // once
    return { total: catalogWrite + catalogReads + summaryIn + p1OutCost + p2OutCost, p1OutCost };
  };

  console.log("Projected $/scan (Sonnet 4.6 pricing; pass-1 output ×N is the lever):");
  console.log("            | pass-1 out tok | N=1 total | N=2 total | N=3 total | N=3 pass-1-out only");
  console.log("-".repeat(96));
  const reprTerse = repr.projTok;
  for (const [label, p1] of [["VERBOSE (today)", measuredAvg], ["TERSE (repr.)", reprTerse], ["TERSE (conservative)", cons.projTok]] as Array<[string, number]>) {
    const n1 = fmtCost(p1, 1), n2 = fmtCost(p1, 2), n3 = fmtCost(p1, 3);
    console.log(`${label.padEnd(11)} | ${p1.toFixed(0).padStart(14)} | ${usd(n1.total).padStart(9)} | ${usd(n2.total).padStart(9)} | ${usd(n3.total).padStart(9)} | ${usd(n3.p1OutCost)}`);
  }
  const v3 = fmtCost(measuredAvg, 3).total, t3 = fmtCost(reprTerse, 3).total;
  console.log("-".repeat(96));
  console.log(`Δ at N=3 (representative): ${usd(v3)} → ${usd(t3)} = save ${usd(v3 - t3)}/scan (${pct(1 - t3 / v3)} of total scan cost).`);

  // ── FAIL-clause sensitivity (the dominant driver) ──
  // FAIL is the plurality status (≈46% of all decisions) and verbose FAIL carries NO reason today,
  // so the terse FAIL clause is what makes or breaks the saving. A verbose FAIL object
  // {"id":"HERO_001","status":"FAIL"} ≈ 33 chars; a terse FAIL "HERO_001 F <clause>" ≈ 13 + clause.
  // Breakeven ≈ 20 chars: shorter and terse FAILs are net-cheaper too; longer and FAIL rows cost
  // more (PASS/SKIP still save). Keep the hook to a true handful of words.
  console.log(`\nFAIL-clause sensitivity (FAIL = ${pct(COUNTS.F / (COUNTS.P + COUNTS.F + COUNTS.S))} of all decisions; verbose FAIL has no reason today):`);
  console.log("terse FAIL clause chars | char reduction (skip=50) | char reduction (skip=0, conservative)");
  console.log("-".repeat(96));
  for (const fL of [0, 15, 20, 25, 30, 40]) {
    let v50 = 0, v0 = 0, t = 0;
    for (const r of all) { v50 += verboseOutput(r.rows, 50).length; v0 += verboseOutput(r.rows, 0).length; t += terseOutput(r.rows, fL).length; }
    console.log(`${String(fL).padStart(22)} | ${pct(1 - t / v50).padStart(24)} | ${pct(1 - t / v0)}`);
  }
  console.log(`(failClause=0 is the theoretical floor — status only; >~20 chars FAIL rows start costing vs verbose, but PASS+SKIP keep the total positive.)`);
  console.log(`\nNOTE: absolute $ uses the Haiku-measured ${measuredAvg.toFixed(0)}-tok baseline as a stand-in for Sonnet pass-1 output; the % reduction is the format property and holds regardless of model. A cheap-model accuracy confirm (below) is the remaining validation.`);
}

main();
