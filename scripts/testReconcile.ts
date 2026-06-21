/**
 * scripts/testReconcile.ts — OFFLINE proof of reconcileStatuses (status-pass nondeterminism fix).
 * ZERO Anthropic calls — the SDK is never imported. Two parts:
 *   1) UNIT ASSERTIONS on the reconciliation rules (majority / tie→PASS / SKIP-not-a-vote).
 *   2) VARIANCE DEMO: inject controlled per-run disagreement into a fixture's scoped check list,
 *      reconcile N=1/3/5, and show the headline-score spread collapse as N grows.
 *
 *   npx tsx scripts/testReconcile.ts            # uses fixtures/stripe.json scope
 *   npx tsx scripts/testReconcile.ts --site=plausible
 */
import { readFileSync, existsSync } from "fs";
import {
  reconcileStatuses, scopeChecksForScan, computeApiDimensions, API_DIMENSION_KEYS,
  type StatusVote,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { SiteType } from "../lib/reportSchema";
import type { DiagnosticCheck } from "../lib/diagnosticRubric";

type Status = "PASS" | "FAIL" | "SKIP";
const siteArg = process.argv.find((a) => a.startsWith("--site="));
const SITE = siteArg ? siteArg.slice("--site=".length) : "stripe";

// ── deterministic helpers ──
function fnv(id: string): number { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(seed: number) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function baseStatus(id: string): Status { const b = fnv(id) % 100; return b < 55 ? "PASS" : b < 80 ? "FAIL" : "SKIP"; }
function headline(rows: { id: string; status: string }[], siteType: string): number {
  const dims = computeApiDimensions(rows); const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}
const stdev = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length); };

let unitPass = 0, unitFail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) unitPass++; else { unitFail++; console.log(`  ✗ ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  if (ok) console.log(`  ✓ ${name}`);
}
const R = (...sets: Array<Array<[string, Status]>>): StatusVote[][] => sets.map((s) => s.map(([id, status]) => ({ id, status })));
const recon = (sets: Array<Array<[string, Status]>>, id: string) => {
  const out = reconcileStatuses(R(...sets));
  return out.perCheck.find((c) => c.id === id)!;
};

function unitTests() {
  console.log("\n================ UNIT ASSERTIONS — reconciliation rules ================");
  // unanimous passes through unchanged, not flaky
  expect("unanimous PASS → PASS (not flaky)", (() => { const c = recon([[["x", "PASS"]], [["x", "PASS"]], [["x", "PASS"]]], "x"); return [c.status, c.flaky]; })(), ["PASS", false]);
  // majority respected — a lone FAIL can't sink a mostly-PASS check
  expect("2 PASS / 1 FAIL → PASS (majority)", recon([[["x", "PASS"]], [["x", "PASS"]], [["x", "FAIL"]]], "x").status, "PASS");
  // a lone PASS can't rescue a mostly-FAIL check
  expect("2 FAIL / 1 PASS → FAIL (majority)", recon([[["x", "FAIL"]], [["x", "FAIL"]], [["x", "PASS"]]], "x").status, "FAIL");
  // tie → less-punitive (PASS)
  expect("1 PASS / 1 FAIL tie → PASS (less-punitive)", recon([[["x", "PASS"]], [["x", "FAIL"]]], "x").status, "PASS");
  expect("2 PASS / 2 FAIL tie → PASS (less-punitive)", recon([[["x", "PASS"]], [["x", "FAIL"]], [["x", "PASS"]], [["x", "FAIL"]]], "x").status, "PASS");
  // SKIP is not a vote — real votes are authoritative
  expect("2 PASS / 1 SKIP → PASS (real beats SKIP)", recon([[["x", "PASS"]], [["x", "PASS"]], [["x", "SKIP"]]], "x").status, "PASS");
  expect("1 FAIL / 2 SKIP → FAIL (a single real vote beats SKIPs)", recon([[["x", "FAIL"]], [["x", "SKIP"]], [["x", "SKIP"]]], "x").status, "FAIL");
  // only SKIP when everyone SKIPs
  expect("3 SKIP → SKIP", recon([[["x", "SKIP"]], [["x", "SKIP"]], [["x", "SKIP"]]], "x").status, "SKIP");
  // SKIP-vs-real that's a real tie → less-punitive among reals
  expect("1 PASS / 1 FAIL / 1 SKIP → PASS (real tie → less-punitive)", recon([[["x", "PASS"]], [["x", "FAIL"]], [["x", "SKIP"]]], "x").status, "PASS");
  // an id missing from a run counts as SKIP for that run (not a vote)
  expect("PASS,PASS + (missing) → PASS", (() => { const out = reconcileStatuses([[{ id: "x", status: "PASS" }], [{ id: "x", status: "PASS" }], [{ id: "y", status: "FAIL" }]]); return out.perCheck.find((c) => c.id === "x")!.status; })(), "PASS");
  // N=1 is an exact passthrough
  expect("N=1 passthrough (PASS)", recon([[["x", "PASS"]]], "x").status, "PASS");
  expect("N=1 passthrough (SKIP)", recon([[["x", "SKIP"]]], "x").status, "SKIP");
  // agreement metric
  const ag = recon([[["x", "PASS"]], [["x", "PASS"]], [["x", "FAIL"]]], "x");
  expect("agreement metric (2/3 agree, flaky)", [ag.agree, ag.n, ag.flaky], [2, 3, true]);
  console.log(`\nunit: ${unitPass} passed, ${unitFail} failed`);
  if (unitFail > 0) { console.error("UNIT TESTS FAILED"); process.exit(1); }
}

// ── variance demo: inject controlled per-run disagreement, watch spread collapse with N ──
// A flaky check is a BORDERLINE PASS/FAIL one (the real phenomenon: the model occasionally
// flips a borderline check between identical calls). SKIP-base checks are not made flaky here —
// the "SKIP is not a vote" rule means a flipped SKIP would never reconcile back, which is correct
// behavior but would muddy this PASS↔FAIL convergence demo. pFlip < 0.5 ⇒ base is the dominant
// per-run answer, so majority vote converges to it.
function isFlaky(c: DiagnosticCheck, flakyFrac: number): boolean {
  return baseStatus(c.id) !== "SKIP" && (fnv(c.id + "#flaky") % 1000) / 1000 < flakyFrac;
}
function genRun(scoped: DiagnosticCheck[], rnd: () => number, flakyFrac: number, pFlip: number): StatusVote[] {
  return scoped.map((c) => {
    const base = baseStatus(c.id);
    if (!isFlaky(c, flakyFrac) || rnd() >= pFlip) return { id: c.id, status: base };
    return { id: c.id, status: base === "PASS" ? "FAIL" : "PASS" }; // borderline flip
  });
}

function varianceDemo(scoped: DiagnosticCheck[], siteType: string) {
  const FLAKY_FRAC = 0.30;  // 30% of PASS/FAIL checks are borderline/flaky
  const P_FLIP = 0.30;      // each flaky check flips 30% of runs (base is the 70% dominant answer)
  const TRIALS = 60;
  const baseRows = scoped.map((c) => ({ id: c.id, status: baseStatus(c.id) }));
  const baseScore = headline(baseRows, siteType);
  const flakyCount = scoped.filter((c) => isFlaky(c, FLAKY_FRAC)).length;

  console.log("\n================ VARIANCE DEMO — synthetic disagreement ================");
  console.log(`scope=${scoped.length} checks | flaky=${flakyCount} (${(FLAKY_FRAC * 100).toFixed(0)}%) | per-flaky deviate ${(P_FLIP * 100).toFixed(0)}% of runs | ${TRIALS} trials/N`);
  console.log(`ground-truth (base) headline score = ${baseScore}`);
  console.log("\n N | score min..max | spread | stdev | mean | reconciled→base flaky-match");
  const rnd = mulberry32(0xC0FFEE);
  for (const N of [1, 3, 5]) {
    const scores: number[] = [];
    let baseMatchPct = 0;
    for (let t = 0; t < TRIALS; t++) {
      const runs = Array.from({ length: N }, () => genRun(scoped, rnd, FLAKY_FRAC, P_FLIP));
      const reconciled = reconcileStatuses(runs);
      scores.push(headline(reconciled.rows, siteType));
      // how many flaky checks reconciled back to ground truth
      const reById = new Map(reconciled.rows.map((r) => [r.id, r.status]));
      const flaky = scoped.filter((c) => isFlaky(c, FLAKY_FRAC));
      const match = flaky.filter((c) => reById.get(c.id) === baseStatus(c.id)).length;
      baseMatchPct += flaky.length ? match / flaky.length : 1;
    }
    const min = Math.min(...scores), max = Math.max(...scores);
    console.log(` ${N} | ${String(min).padStart(3)}..${String(max).padStart(3)}        | ${String(max - min).padStart(6)} | ${stdev(scores).toFixed(2).padStart(5)} | ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1).padStart(4)} | ${((baseMatchPct / TRIALS) * 100).toFixed(1)}%`);
  }
  console.log("\nInterpretation: N=1 is the raw per-pass spread (today's nondeterminism). Majority vote");
  console.log("at N=3 and N=5 collapses the spread toward 0 and the reconciled set converges to ground truth.");
}

function main() {
  unitTests();
  let scoped: DiagnosticCheck[]; let siteType = "saas";
  const fx = `fixtures/${SITE}.json`;
  if (existsSync(fx)) {
    const fixture = JSON.parse(readFileSync(fx, "utf8")) as { siteType?: string };
    siteType = fixture.siteType || "saas";
    scoped = scopeChecksForScan(siteType as SiteType);
    console.log(`\n(using fixtures/${SITE}.json scope — siteType=${siteType})`);
  } else {
    scoped = scopeChecksForScan(siteType as SiteType);
    console.log(`\n(fixtures/${SITE}.json not found — using default ${siteType} scope)`);
  }
  varianceDemo(scoped, siteType);
  console.log("\nmodel calls: 0 | Anthropic calls: 0 | est cost: $0.0000 (SDK never imported)");
  console.log("\n(done)");
}
main();
