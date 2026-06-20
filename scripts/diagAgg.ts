/**
 * scripts/diagAgg.ts — PART A aggregation. Reads diag_run_run1/2/3.json and forks the
 * root cause of the score instability. No network; pure analysis of the 3 diagnostic runs.
 *   npx tsx scripts/diagAgg.ts
 */
import { readFileSync } from "fs";

type Run = {
  label: string; rawHtmlBytes: number; extractHash: string; summaryLen: number; summaryHash: string;
  score: number | null; skipRate: number; answered: number; skip: number; tfAns: number; tfSkip: number;
  truncated: boolean; backfill: number; lowConfidence: boolean;
  summarySkipIds: string[]; summarySkipHash: string; summarySkipByCat: Record<string, number>;
  rawScore: number | null; rawTf: { ans: number; skip: number } | null; rawSkipIds: string[] | null;
};

const runs: Run[] = [];
for (const l of ["run1", "run2", "run3"]) {
  try { runs.push(JSON.parse(readFileSync(`diag_run_${l}.json`, "utf8"))); }
  catch { console.log(`(missing diag_run_${l}.json)`); }
}
if (runs.length === 0) { console.error("no diag_run_*.json found"); process.exit(1); }

console.log("\n================ PART A — STRIPE 3× DIAGNOSIS ================");
console.log("label | rawBytes | extractHash | summaryLen | summaryHash | score | skip | skip% | tf a/s | trunc | backfill | lowConf");
for (const r of runs) {
  console.log(`${r.label} | ${r.rawHtmlBytes} | ${r.extractHash} | ${r.summaryLen} | ${r.summaryHash} | ${r.score ?? "LOWc"} | ${r.skip} | ${(r.skipRate * 100).toFixed(1)}% | ${r.tfAns}/${r.tfSkip} | ${r.truncated} | ${r.backfill} | ${r.lowConfidence}`);
}

const uniq = (xs: string[]) => Array.from(new Set(xs));
const summaryHashes = uniq(runs.map((r) => r.summaryHash));
const extractHashes = uniq(runs.map((r) => r.extractHash));
const skipHashes = uniq(runs.map((r) => r.summarySkipHash));
const scores = runs.map((r) => r.score);

// skip-set set algebra across runs
const sets = runs.map((r) => new Set(r.summarySkipIds));
const union = uniq(runs.flatMap((r) => r.summarySkipIds));
const always = union.filter((id) => sets.every((s) => s.has(id)));
const sometimes = union.filter((id) => !sets.every((s) => s.has(id)));

console.log("\n--- cross-run ---");
console.log(`summary hashes distinct: ${summaryHashes.length} ${summaryHashes.length === 1 ? "(IDENTICAL)" : "(DIFFER)"} → ${summaryHashes.join(", ")}`);
console.log(`extract-field hashes distinct: ${extractHashes.length} → ${extractHashes.join(", ")}`);
console.log(`rawHtmlBytes: ${runs.map((r) => r.rawHtmlBytes).join(", ")}`);
console.log(`scores: ${scores.join(", ")}  (spread ${Math.max(...scores.map((s) => s ?? 0)) - Math.min(...scores.map((s) => s ?? 0))})`);
console.log(`skip-set hashes distinct: ${skipHashes.length} ${skipHashes.length === 1 ? "(IDENTICAL skip sets)" : "(skip sets DIFFER)"}`);
console.log(`skip-set: union=${union.length} always-skip(all runs)=${always.length} sometimes-skip(jitter)=${sometimes.length}`);

console.log("\n--- FORK VERDICT ---");
if (summaryHashes.length > 1) {
  console.log("FORK 1 → SCRAPE INCONSISTENCY: the structured summary differs across runs, so the model");
  console.log("  sees different input each time. Varying:");
  console.log(`    rawHtmlBytes spread: ${Math.min(...runs.map((r) => r.rawHtmlBytes))}–${Math.max(...runs.map((r) => r.rawHtmlBytes))}`);
  console.log(`    extract-field hashes: ${extractHashes.length} distinct → ${extractHashes.length > 1 ? "extracted content varies" : "extracted content stable (variance is below the hashed fields / in summary-only sections)"}`);
} else if (skipHashes.length > 1) {
  console.log("FORK 2 → MODEL NONDETERMINISM: summary input is byte-identical across runs, yet pass-1");
  console.log(`  status (skip set) differs → claude-sonnet-4-6 at temperature=0 is not deterministic here.`);
  console.log(`  ${sometimes.length} checks flip PASS/FAIL↔SKIP between runs; ${always.length} skip every run.`);
} else {
  console.log("FORK 3 → STABLE SKIPS (same checks skip every run). If scores still move it is narrow");
  console.log("  PASS↔FAIL jitter on answered checks; the skip set itself is missing-signal driven.");
}

// classification from the --raw run (run1)
const rawRun = runs.find((r) => r.rawSkipIds);
if (rawRun && rawRun.rawSkipIds) {
  // A summary-skip is "wrongful" if raw HTML did NOT skip it (raw answered it); "DOM-deep"
  // if raw also skipped it (unobservable from static input either way).
  const rawSkipSet = new Set(rawRun.rawSkipIds);
  const wrongful = rawRun.summarySkipIds.filter((id) => !rawSkipSet.has(id));
  const domDeep = rawRun.summarySkipIds.filter((id) => rawSkipSet.has(id));
  console.log("\n--- SKIP CLASSIFICATION (run1, summary-skips vs raw-HTML pass-1) ---");
  console.log(`summary skips: ${rawRun.summarySkipIds.length} | summary-skip by category: ${JSON.stringify(rawRun.summarySkipByCat)}`);
  console.log(`  WRONGFUL (raw HTML ANSWERED, summary SKIPPED) = ${wrongful.length}  → signal should be in summary but isn't`);
  console.log(`  DOM-DEEP  (raw HTML ALSO SKIPPED)            = ${domDeep.length}  → unobservable from static input either way`);
  console.log(`  raw score=${rawRun.rawScore} raw tf=${rawRun.rawTf?.ans}/${rawRun.rawTf?.skip} vs summary score=${rawRun.score} tf=${rawRun.tfAns}/${rawRun.tfSkip}`);
}
console.log("\n(done)");
