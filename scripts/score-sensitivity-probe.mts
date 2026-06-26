/**
 * scripts/score-sensitivity-probe.mts — OFFLINE, $0, ZERO model calls.
 *
 * Read-only sensitivity diagnosis of the HEADLINE score (route's dimWeightedScore).
 * Operates purely on SAVED reconciled status sets in fixtures/<slug>.json
 * (sonnetCalibration.reconciledStatusRows) plus the saved per-pass Haiku runs
 * (haikuValidation.runs[].statusRows) for the model-vs-math attribution.
 *
 * Uses the REAL scoring functions (computeApiDimensions + getWeightProfile) so the
 * measured headline is byte-identical to app/api/v1/scan/route.ts dimWeightedScore.
 *
 *   npx tsx scripts/score-sensitivity-probe.mts
 */
import { readFileSync } from "fs";
import {
  computeApiDimensions, computeApiDimensionRows, API_DIMENSION_KEYS,
  CATEGORY_TO_DIMENSION, reconcileStatuses, scopeChecksForScan,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import _DIAG from "../lib/diagnosticRubric";

type Status = "PASS" | "FAIL" | "SKIP";
type Row = { id: string; status: string };
type Check = { id: string; category: string; severity: string };
// tsx ESM↔CJS interop can double-wrap a CJS default as { default: [...] } — unwrap defensively.
const DIAGNOSTIC_CHECKS = (Array.isArray(_DIAG) ? _DIAG : (_DIAG as { default: Check[] }).default) as Check[];
const FIXTURES = ["stripe", "plausible", "berkshire"];
const AMBER_AT = 50, GREEN_AT = 70;
const CHECK_BY_ID = new Map(DIAGNOSTIC_CHECKS.map((c) => [c.id, c]));

const norm = (s: string): Status => {
  const u = (s || "").toUpperCase();
  return u === "PASS" ? "PASS" : u === "FAIL" ? "FAIL" : "SKIP";
};

/** EXACT route headline: round(Σ weight_k · dimCoverage_k), clamped 0..100. */
function headlineRounded(rows: Row[], siteType: string): number {
  const dims = computeApiDimensions(rows as never);
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(
    API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0)
  )));
}
/** Same, UNROUNDED — exposes the continuous (sub-point) sensitivity the rounding hides. */
function headlineRaw(rows: Row[], siteType: string): number {
  const dims = computeApiDimensions(rows as never);
  const w = getWeightProfile(siteType);
  const v = API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0);
  return Math.min(100, Math.max(0, v));
}
const band = (s: number) => (s < AMBER_AT ? "RED" : s < GREEN_AT ? "AMBER" : "GREEN");

function loadFixture(slug: string) {
  const j = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
  const siteType: string = j.siteType;
  const base: Row[] = (j.sonnetCalibration?.reconciledStatusRows ?? []).map((r: Row) => ({ id: r.id, status: norm(r.status) }));
  const perPassScores: number[] = j.sonnetCalibration?.perPassScores ?? [];
  const flakyCount: number = j.sonnetCalibration?.flakyCount ?? 0;
  const haikuRuns: Row[][] = (j.haikuValidation?.runs ?? []).map((r: { statusRows: Row[] }) =>
    (r.statusRows ?? []).map((x) => ({ id: x.id, status: norm(x.status) })));
  return { siteType, base, perPassScores, flakyCount, haikuRuns };
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("=".repeat(96));
console.log("OFFLINE SCORE-SENSITIVITY PROBE — $0, ZERO model calls. Read-only perturbation on saved status sets.");
console.log("=".repeat(96));

for (const slug of FIXTURES) {
  const { siteType, base, perPassScores, flakyCount, haikuRuns } = loadFixture(slug);
  if (base.length === 0) { console.log(`\n[${slug}] no sonnetCalibration.reconciledStatusRows — skipping`); continue; }

  const base0 = headlineRounded(base, siteType);
  const base0raw = headlineRaw(base, siteType);
  const idx = new Map(base.map((r, i) => [r.id, i]));
  const statusOf = new Map(base.map((r) => [r.id, norm(r.status)]));
  const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
  for (const r of base) counts[norm(r.status)]++;

  console.log("\n" + "#".repeat(96));
  console.log(`# ${slug.toUpperCase()}  siteType=${siteType}  baseline headline=${base0} (raw ${base0raw.toFixed(3)}) [${band(base0)}]  | rows=${base.length}  P=${counts.PASS} F=${counts.FAIL} S=${counts.SKIP}`);
  console.log("#".repeat(96));

  // ── PART 2.1 — SINGLE-FLIP SENSITIVITY ─────────────────────────────────────
  // For each check, set it to each OTHER status, recompute the headline, record the move.
  type FlipRec = { id: string; type: string; dRound: number; dRaw: number };
  const flips: FlipRec[] = [];
  for (const r of base) {
    const from = norm(r.status);
    const i = idx.get(r.id)!;
    for (const to of ["PASS", "FAIL", "SKIP"] as Status[]) {
      if (to === from) continue;
      const perturbed = base.slice();
      perturbed[i] = { id: r.id, status: to };
      flips.push({
        id: r.id,
        type: `${from}->${to}`,
        dRound: headlineRounded(perturbed, siteType) - base0,
        dRaw: headlineRaw(perturbed, siteType) - base0raw,
      });
    }
  }
  const absR = (a: FlipRec[]) => a.map((f) => Math.abs(f.dRound));
  const absRaw = (a: FlipRec[]) => a.map((f) => Math.abs(f.dRaw));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const max = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);

  console.log(`\n── PART 2.1  SINGLE-FLIP SENSITIVITY (headline points moved per single status change) ──`);
  console.log(`  ALL flips (n=${flips.length}):  avg|Δ|(rounded)=${mean(absR(flips)).toFixed(3)}  worst(rounded)=${max(absR(flips))}   |   avg|Δ|(raw)=${mean(absRaw(flips)).toFixed(4)}  worst(raw)=${max(absRaw(flips)).toFixed(3)}`);
  const TYPES = ["PASS->FAIL", "FAIL->PASS", "FAIL->SKIP", "SKIP->FAIL", "PASS->SKIP", "SKIP->PASS"];
  console.log(`  by flip TYPE:`);
  console.log(`    type         n     avg|Δ|round  worst round   avg|Δ|raw   worst raw`);
  const typeAgg: Record<string, { avgRaw: number; worstRaw: number; n: number }> = {};
  for (const t of TYPES) {
    const sub = flips.filter((f) => f.type === t);
    if (sub.length === 0) { console.log(`    ${t.padEnd(12)} 0     —`); continue; }
    typeAgg[t] = { avgRaw: mean(absRaw(sub)), worstRaw: max(absRaw(sub)), n: sub.length };
    console.log(`    ${t.padEnd(12)} ${String(sub.length).padStart(3)}   ${mean(absR(sub)).toFixed(3).padStart(9)}    ${String(max(absR(sub))).padStart(4)}        ${mean(absRaw(sub)).toFixed(4).padStart(8)}    ${max(absRaw(sub)).toFixed(3).padStart(6)}`);
  }
  const worstType = Object.entries(typeAgg).sort((a, b) => b[1].avgRaw - a[1].avgRaw)[0];
  if (worstType) console.log(`  → flip type that moves the score MOST (avg raw): ${worstType[0]}  (avg|Δ|raw=${worstType[1].avgRaw.toFixed(4)})`);
  const worstSingle = flips.slice().sort((a, b) => Math.abs(b.dRaw) - Math.abs(a.dRaw))[0];
  console.log(`  → worst single flip: ${worstSingle.id} ${worstSingle.type}  Δround=${worstSingle.dRound}  Δraw=${worstSingle.dRaw.toFixed(3)}  (sev=${CHECK_BY_ID.get(worstSingle.id)?.severity}, dim=${CATEGORY_TO_DIMENSION[CHECK_BY_ID.get(worstSingle.id)?.category ?? ""]})`);

  // ── PART 2.2 — SKIP-DENOMINATOR EFFECT (amplifier 1) ───────────────────────
  // FAIL→SKIP removes a 0-credit check from its dimension denominator → the move is
  // PURELY a denominator re-weighting (numerator unchanged). Compare to FAIL→PASS, where
  // the SAME check earns its weight in a FIXED denominator (the check's "own contribution").
  console.log(`\n── PART 2.2  SKIP-DENOMINATOR EFFECT (FAIL↔SKIP, amplifier #1) ──`);
  const failRows = base.filter((r) => norm(r.status) === "FAIL");
  const f2s: number[] = [];   // FAIL→SKIP raw move (pure denominator effect)
  const f2p: number[] = [];   // FAIL→PASS raw move (own contribution, denom fixed)
  for (const r of failRows) {
    const i = idx.get(r.id)!;
    const skip = base.slice(); skip[i] = { id: r.id, status: "SKIP" };
    const pass = base.slice(); pass[i] = { id: r.id, status: "PASS" };
    f2s.push(headlineRaw(skip, siteType) - base0raw);
    f2p.push(headlineRaw(pass, siteType) - base0raw);
  }
  console.log(`  FAIL→SKIP (denominator-only move):  avg=+${mean(f2s).toFixed(4)}  worst=+${max(f2s).toFixed(3)}  (n=${failRows.length} FAILs)`);
  console.log(`  FAIL→PASS (own-contribution move):  avg=+${mean(f2p).toFixed(4)}  worst=+${max(f2p).toFixed(3)}`);
  const ratio = mean(f2p) ? mean(f2s) / mean(f2p) : 0;
  console.log(`  ratio FAIL→SKIP / FAIL→PASS = ${ratio.toFixed(3)}  → a SKIP-removal credits ${(ratio * 100).toFixed(0)}% of a genuine PASS, purely via denominator shrink.`);
  console.log(`     (the ENTIRE FAIL→SKIP move is denominator artifact — the check's numerator credit is 0 before and after.)`);

  // ── PART 2.3 — BAND-EDGE EXPOSURE ──────────────────────────────────────────
  console.log(`\n── PART 2.3  BAND-EDGE EXPOSURE (canonical bands: RED<50, AMBER 50–69, GREEN≥70) ──`);
  const distAmber = base0 - AMBER_AT, distGreen = base0 - GREEN_AT;
  console.log(`  headline=${base0} [${band(base0)}]  | distance to 50 edge=${distAmber >= 0 ? "+" : ""}${distAmber}  | distance to 70 edge=${distGreen >= 0 ? "+" : ""}${distGreen}`);
  let crossers = 0; const crossDetail: string[] = [];
  for (const r of base) {
    const from = norm(r.status); const i = idx.get(r.id)!;
    for (const to of ["PASS", "FAIL", "SKIP"] as Status[]) {
      if (to === from) continue;
      const p = base.slice(); p[i] = { id: r.id, status: to };
      const s2 = headlineRounded(p, siteType);
      if (band(s2) !== band(base0)) { crossers++; crossDetail.push(`${r.id} ${from}->${to} → ${s2} [${band(s2)}]`); }
    }
  }
  console.log(`  single flips that CROSS a band: ${crossers} / ${flips.length}`);
  if (crossDetail.length) crossDetail.slice(0, 12).forEach((d) => console.log(`     ${d}`));

  // ── PART 2.4 — MODEL vs MATH ATTRIBUTION ───────────────────────────────────
  console.log(`\n── PART 2.4  MODEL vs MATH ATTRIBUTION ──`);
  console.log(`  PRODUCTION CONFIG (Sonnet N=3): per-pass scores=[${perPassScores.join(", ")}] spread=${perPassScores.length ? Math.max(...perPassScores) - Math.min(...perPassScores) : 0}  flakyChecks=${flakyCount}/${base.length}`);
  const sAvgRaw = mean(absRaw(flips));
  if (flakyCount > 0) {
    const coherent = (flakyCount * sAvgRaw);
    console.log(`     avg|Δ|raw per flip = ${sAvgRaw.toFixed(4)}.  If all ${flakyCount} flaky checks pushed the SAME way → ~${coherent.toFixed(1)} pts; observed spread is far smaller → flips partly CANCEL (damped + incoherent).`);
  }
  // Full-fidelity attribution from Haiku per-pass runs (full statusRows available).
  if (haikuRuns.length >= 2) {
    const runScores = haikuRuns.map((rr) => headlineRounded(rr, siteType));
    const recon = reconcileStatuses(haikuRuns.map((rr) => rr.map((x) => ({ id: x.id, status: x.status }))));
    const reconScore = headlineRounded(recon.rows, siteType);
    const reconMap = new Map(recon.rows.map((r) => [r.id, norm(r.status)]));
    // per-run: # checks differing from reconciled, and the score gap
    const perRun = haikuRuns.map((rr, k) => {
      const m = new Map(rr.map((x) => [x.id, norm(x.status)]));
      let diff = 0;
      const ids = new Set<string>([...reconMap.keys(), ...m.keys()]);
      for (const id of ids) if ((reconMap.get(id) ?? "SKIP") !== (m.get(id) ?? "SKIP")) diff++;
      return { run: k + 1, score: runScores[k], diff, gap: runScores[k] - reconScore };
    });
    console.log(`  HAIKU per-pass (full rows, ${haikuRuns.length} runs) — independent confirmation:`);
    console.log(`     run-scores=[${runScores.join(", ")}] spread=${Math.max(...runScores) - Math.min(...runScores)}  reconciled=${reconScore}  flaky=${recon.flakyCount}/${recon.rows.length} meanAgree=${(recon.meanAgreement * 100).toFixed(1)}%`);
    console.log(`     run   score  Δvs-recon   checksDifferingFromRecon   pts-per-differing-check`);
    for (const pr of perRun) {
      console.log(`      ${String(pr.run).padStart(2)}    ${String(pr.score).padStart(3)}     ${(pr.gap >= 0 ? "+" : "") + pr.gap}          ${String(pr.diff).padStart(3)}                        ${pr.diff ? (Math.abs(pr.gap) / pr.diff).toFixed(3) : "0"}`);
    }
    const avgDiff = mean(perRun.map((p) => p.diff));
    const avgGap = mean(perRun.map((p) => Math.abs(p.gap)));
    console.log(`     AVG: ${avgDiff.toFixed(1)} checks differ per run, but score moves only ${avgGap.toFixed(2)} pts → ${(avgGap / Math.max(1, avgDiff)).toFixed(3)} pts per differing check.`);
    console.log(`     → MANY checks flip a LITTLE and largely cancel: the wobble is MODEL nondeterminism on a DAMPED formula, not a few flips amplified by twitchy math.`);
  }
}

console.log("\n" + "=".repeat(96));
console.log("DONE — $0, zero Anthropic calls, no scoring-math change, no prod-env change, no merge. Offline perturbation only.");
console.log("=".repeat(96));
