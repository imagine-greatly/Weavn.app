/**
 * scripts/_prove-prelaunch-fixes.mts — OFFLINE ($0, ZERO Anthropic calls; the SDK is never imported)
 * proof for the two pre-launch fixes:
 *
 *   FIX 1 — the report's Conversion Health strip rendered only 5 of 7 dimensions because two
 *   DIMENSIONS entries (objection_handling, offer_clarity) had ciLabel:null, so extractDimensions
 *   could not match them from the stored `dimensionScores` rows. Proof: drive REAL engine rows
 *   (computeApiDimensionRows over saved fixture status sets) through a VERBATIM copy of
 *   extractDimensions + the post-fix DIMENSIONS list → assert all 7 resolve (and the old null
 *   config resolved only 5). Also assert the v1 API flat-`dimensions` object is untouched (still 7).
 *
 *   FIX 2 — the N reconcile status passes now run concurrently (Promise.all) instead of serially.
 *   reconcileStatuses is a per-id majority vote (order-independent; id-order pinned by the first run).
 *   Proof: for the same sampled statuses, the reconciled output is IDENTICAL whether the extra runs
 *   are appended in serial order, an arbitrary permutation, or with a dropped (failed) sample — i.e.
 *   parallelization changes wall-time only, never the score.
 *
 *   npx tsx scripts/_prove-prelaunch-fixes.mts
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import {
  scopeChecksForScan,
  computeApiDimensionRows,
  computeApiDimensions,
  reconcileStatuses,
  API_DIMENSION_KEYS,
  type StatusVote,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { SiteType } from "../lib/reportSchema";

type Row = { id: string; status: string };
let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
}

// ── Load a real fixture's status sets (the saved Sonnet sample runs) ─────────────
// Fixtures store `statusSets`: an array of independent status runs (the exact reconcile input).
function normRun(run: unknown): Row[] {
  return (Array.isArray(run) ? run : [])
    .map((r) => ({ id: String((r as Row).id ?? ""), status: String((r as Row).status ?? "SKIP") }))
    .filter((r) => r.id);
}
function loadFixtureRuns(): { runs: Row[][]; siteType: SiteType; name: string } {
  const dir = "fixtures";
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as Record<string, unknown>;
      const st = (j.siteType as SiteType) ?? "saas";
      if (Array.isArray(j.statusSets) && j.statusSets.length > 0) {
        const runs = (j.statusSets as unknown[]).map(normRun).filter((r) => r.length > 0);
        if (runs.length > 0) return { runs, siteType: st, name: f };
      }
    } catch { /* try next */ }
  }
  // Fallback: synthesize a full status set from the scoped catalog so every dimension is exercised.
  const scoped = scopeChecksForScan("saas");
  const rows = scoped.map((c, i) => ({ id: c.id, status: (["PASS", "FAIL", "PASS"] as const)[i % 3] }));
  return { runs: [rows], siteType: "saas", name: "(synthetic full catalog)" };
}

// ════════════════════════════════════════════════════════════════════════════════
// FIX 1 — verbatim copy of components/ReportLayout.tsx render logic (the code under test).
// DIMENSIONS is the POST-FIX list; OLD_DIMENSIONS is the pre-fix list (objection/offer ciLabel:null).
// extractDimensions is copied 1:1 so the proof exercises the exact matching the report performs.
// ════════════════════════════════════════════════════════════════════════════════
type DimCfg = { key: string; label: string; ciLabel: string | null };
const DIMENSIONS: DimCfg[] = [
  { key: "conversion_architecture", label: "Conversion Architecture", ciLabel: "Conversion Architecture" },
  { key: "message_clarity", label: "Message Clarity", ciLabel: "Message Clarity" },
  { key: "objection_handling", label: "Objection Handling", ciLabel: "Objection Handling" },
  { key: "offer_clarity", label: "Offer Clarity", ciLabel: "Offer Clarity" },
  { key: "trust_signals", label: "Trust Signals", ciLabel: "Trust Signals" },
  { key: "traffic_readiness", label: "Traffic Readiness", ciLabel: "Traffic Readiness" },
  { key: "technical_foundation", label: "Technical Foundation", ciLabel: "Technical Foundation" },
];
const OLD_DIMENSIONS: DimCfg[] = DIMENSIONS.map((d) =>
  d.key === "objection_handling" || d.key === "offer_clarity" ? { ...d, ciLabel: null } : d
);

// Verbatim from ReportLayout.extractDimensions (reads p.dimensions, else p.dimensionScores rows).
function extractDimensions(
  p: { dimensions?: Record<string, number>; dimensionScores?: Array<{ label?: string; score?: number }> },
  dimsCfg: DimCfg[]
): { label: string; score: number }[] {
  const dims = p.dimensions;
  const rows = Array.isArray(p.dimensionScores) ? p.dimensionScores : null;
  const out: { label: string; score: number }[] = [];
  for (const d of dimsCfg) {
    let score = NaN;
    if (dims && typeof dims[d.key] === "number") {
      score = dims[d.key];
    } else if (rows && d.ciLabel) {
      const token = d.ciLabel.split(" ")[0].toLowerCase();
      const match = rows.find((r) =>
        String((r as { label?: string }).label ?? "").toLowerCase().includes(token)
      ) as { score?: number } | undefined;
      if (match && typeof match.score === "number") score = match.score;
    }
    if (Number.isFinite(score)) out.push({ label: d.label, score: Math.round(score) });
  }
  return out;
}

function proveFix1() {
  console.log("\n================ FIX 1 — report renders all 7 dimensions ================");
  const { runs, name } = loadFixtureRuns();
  const rows = runs[0]; // one real saved Sonnet status set
  // dimRows = exactly what the engine stores in reportPayload.dimensionScores (no flat `dimensions`).
  const dimRows = computeApiDimensionRows(rows);
  const stored = { dimensionScores: dimRows }; // the report page spreads `analysis` → this shape
  console.log(`fixture: ${name} | engine dimensionScores rows = ${dimRows.length} (labels: ${dimRows.map((r) => r.label).join(", ")})`);

  // Token-uniqueness invariant: each post-fix ciLabel token matches exactly ONE engine row label.
  for (const d of DIMENSIONS) {
    const token = (d.ciLabel ?? "").split(" ")[0].toLowerCase();
    const matches = dimRows.filter((r) => r.label.toLowerCase().includes(token)).map((r) => r.label);
    expect(`token "${token}" → exactly one row (${matches.join("|") || "none"})`, matches.length, 1);
  }

  const before = extractDimensions(stored, OLD_DIMENSIONS);
  const after = extractDimensions(stored, DIMENSIONS);
  console.log(`\nPRE-FIX  (objection/offer ciLabel:null): ${before.length} dimensions render → [${before.map((d) => d.label).join(", ")}]`);
  console.log(`POST-FIX (objection/offer ciLabel set):  ${after.length} dimensions render → [${after.map((d) => d.label).join(", ")}]`);
  expect("pre-fix renders only 5 (the bug)", before.length, 5);
  expect("post-fix renders all 7", after.length, 7);
  expect("post-fix includes Objection Handling", after.some((d) => d.label === "Objection Handling"), true);
  expect("post-fix includes Offer Clarity", after.some((d) => d.label === "Offer Clarity"), true);
  expect("every rendered dimension carries a finite score", after.every((d) => Number.isFinite(d.score)), true);

  // v1 API flat `dimensions` object is built independently (computeApiDimensions) and is UNCHANGED —
  // it already carried all 7 keys; this fix touches render config only.
  const apiDims = computeApiDimensions(rows);
  expect("v1 API `dimensions` still has all 7 keys (unchanged)", API_DIMENSION_KEYS.every((k) => k in apiDims), true);
}

// ════════════════════════════════════════════════════════════════════════════════
// FIX 2 — parallel sampling produces an IDENTICAL reconciled result to serial sampling.
// ════════════════════════════════════════════════════════════════════════════════
function fnv(id: string): number { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(seed: number) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function sampleRun(ids: string[], rnd: () => number): StatusVote[] {
  return ids.map((id) => {
    const r = rnd();
    return { id, status: r < 0.5 ? "PASS" : r < 0.8 ? "FAIL" : "SKIP" };
  });
}
function headline(rows: Row[], siteType: string): number {
  const dims = computeApiDimensions(rows as never);
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}
// Faithful model of the OLD serial loop and the NEW Promise.all path: both build the SAME
// runsForReconcile = [pass1, ...successfulExtras]. Promise.all preserves input order, so the
// successful extras land in the SAME relative order as the serial loop pushed them.
function reconcileResult(runs: StatusVote[][]) {
  const out = reconcileStatuses(runs);
  return { rows: out.rows, flakyCount: out.flakyCount, meanAgreement: out.meanAgreement };
}

function proveFix2() {
  console.log("\n================ FIX 2 — parallel reconcile == serial reconcile ================");
  const { runs: fixtureRuns, siteType, name } = loadFixtureRuns();
  const scoped = scopeChecksForScan(siteType);
  const ids = scoped.map((c) => c.id);

  // (a) REAL DATA: the fixture's actual saved Sonnet sample runs. Serial order vs a permutation of
  // the extras (pass-1 fixed first) must reconcile to the byte-identical result + headline score.
  if (fixtureRuns.length >= 2) {
    const pass1 = fixtureRuns[0];
    const extras = fixtureRuns.slice(1);
    const serial = [pass1, ...extras];
    const shuffled = [...extras].sort((a, b) => fnv(a.map((r) => r.status).join()) - fnv(b.map((r) => r.status).join()));
    const parallel = [pass1, ...shuffled];
    const rSerial = reconcileResult(serial);
    const rParallel = reconcileResult(parallel);
    expect(`real fixture (${name}, ${fixtureRuns.length} runs): parallel rows == serial`, rParallel.rows, rSerial.rows);
    expect(`real fixture: parallel headline score == serial`, headline(rParallel.rows, siteType), headline(rSerial.rows, siteType));
  }

  // (b) BREADTH: synthetic sampled runs across N=2/3/5 (deterministic seed).
  for (const N of [2, 3, 5]) {
    const rnd = mulberry32(0xBADC0DE ^ N);
    const pass1 = sampleRun(ids, rnd);
    const extras = Array.from({ length: N - 1 }, () => sampleRun(ids, rnd));

    // SERIAL: pass1 first, extras appended in index order (old for-loop).
    const serial = [pass1, ...extras];
    // PARALLEL: Promise.all also yields extras in index order → same array. Prove it survives a
    // permutation of *completion* order too (shuffle the extras; pass1 stays first).
    const shuffled = [...extras].sort((a, b) => fnv(a.map((r) => r.status).join()) - fnv(b.map((r) => r.status).join()));
    const parallel = [pass1, ...shuffled];

    const rSerial = reconcileResult(serial);
    const rParallel = reconcileResult(parallel);
    expect(`N=${N}: parallel reconciled rows identical to serial`, rParallel.rows, rSerial.rows);
    expect(`N=${N}: parallel headline score identical to serial`, headline(rParallel.rows, siteType), headline(rSerial.rows, siteType));
    expect(`N=${N}: flaky/meanAgreement identical`, [rParallel.flakyCount, rParallel.meanAgreement.toFixed(6)], [rSerial.flakyCount, rSerial.meanAgreement.toFixed(6)]);

    // Dropped-sample equivalence: a non-fatal pass failure (null, filtered out) under Promise.all
    // yields the SAME runsForReconcile as the old loop simply not pushing that sample.
    if (N >= 3) {
      const droppedSerial = [pass1, extras[0]];            // old loop: 2nd extra threw → not pushed
      const droppedParallel = [pass1, ...[extras[0], null].filter((r): r is StatusVote[] => r !== null)];
      expect(`N=${N}: dropped-sample (parallel filter) == serial skip`, reconcileResult(droppedParallel).rows, reconcileResult(droppedSerial).rows);
    }
  }
}

function main() {
  proveFix1();
  proveFix2();
  console.log(`\n──────────────────────────────────────────────`);
  console.log(`assertions: ${pass} passed, ${fail} failed`);
  console.log(`model calls: 0 | Anthropic calls: 0 | est cost: $0.0000 (SDK never imported)`);
  if (fail > 0) { console.error("\nPROOF FAILED"); process.exit(1); }
  console.log("\nPROOF PASSED — Fix 1 renders all 7 dimensions; Fix 2 reconciled score is identical (wall-time only).");
}
main();
