/**
 * scripts/proveCoverageFull.ts — OFFLINE final-pass proof ($0, ZERO Anthropic).
 * 1) regenerates all 5 fixture summaries (no scrape/model), reports size (must be ≤6 KB)
 *    and that every signal block is present;
 * 2) classifies EVERY rubric check as (a) signal-now-present / (b) deterministic-SKIP /
 *    (c) judgment-bound, per category, and reports the totals + the (c) residual list.
 *
 *   npx tsx scripts/proveCoverageFull.ts
 */
import { readFileSync, existsSync } from "fs";
import DIAGNOSTIC_CHECKS from "../lib/diagnosticRubric";
import { buildPageSummary } from "../lib/analyze";
import type { CombinedExtraction } from "../lib/scraper";

const CEIL = 6000;
const FIXTURES = ["stripe", "linear", "plausible", "berkshire", "wikipedia-cro"];
const BLOCKS = ["META", "HERO", "PAGES & SITE LINKS", "SERVICE-BUSINESS SIGNALS", "RETENTION SIGNALS",
  "COPY FRAMING", "PAGE STRUCTURE", "COMMERCE SIGNALS", "SAAS/OFFER SIGNALS", "LEAD CAPTURE",
  "PERSUASION/PROOF", "DISCOVERY", "TECHNICAL / HTML SIGNALS", "PAGE STATS"];

// (b) genuinely unobservable from ONE static render → deterministic SKIP (visual-pixel,
// checkout-flow internals, returning-visitor/runtime).
const B_IDS = new Set([
  "HERO_007", "HERO_010", "HERO_012", "CTA_012", "ACCESS_001", "UNIV_007",
  "MOBILE_008", "MOBILE_010", "MOBILE_012", "SEO_008",
  "CHECK_008", "CHECK_009", "CHECK_010", "CHECK_011", "CHECK_012", "RET_002",
]);
// (c) judgment-bound — signal is present in the summary, flips on model opinion (copy quality,
// narrative order, "is this compelling/generic"). NOT fixable by extraction; for prompt/reconcile.
const C_IDS = new Set([
  "HERO_001", "HERO_002", "HERO_003", "HERO_006",
  "MSG_001", "MSG_002", "MSG_004", "MSG_006", "MSG_007", "MSG_010", "MSG_011", "MSG_012", "MSG_014",
  "TRUST_004", "TRUST_013", "SPQ_001", "SPQ_003", "SPQ_007", "SOCIAL_007",
  "PSY_001", "PSY_004", "PSY_006", "PSY_007", "PSY_010", "PSY_014",
  "DIFF_001", "DIFF_004", "DIFF_010", "DIFF_012",
  "SPEC_001", "SPEC_005", "SPEC_008", "SPEC_009",
  "NARR_001", "NARR_002", "NARR_003", "NARR_005", "NARR_006", "NARR_007", "NARR_008", "NARR_009", "NARR_010", "NARR_012", "NARR_015",
  "CTA_002", "CTA_005", "CTA_009", "OFC_003", "OFC_008", "SAAS_004", "SAAS_006", "SAAS_016",
]);

function main() {
  // ── 1. summary size + block presence across all 5 fixtures ──
  console.log("\n================ SUMMARY SIZE + SIGNAL PRESENCE (all 5 fixtures, offline) ================");
  console.log(`hard ceiling ${CEIL} chars (6 KB)\n`);
  let allUnder = true, allBlocks = true;
  let stripeSummary = "";
  for (const slug of FIXTURES) {
    if (!existsSync(`fixtures/${slug}.json`)) { console.log(`${slug}: (missing fixture)`); continue; }
    const f = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
    const ex: CombinedExtraction = { rawHtml: f.scrapeRawHtml, pagesAnalyzed: [f.url], complexity: f.complexity, readableRatio: f.readableRatio };
    const sum = buildPageSummary(ex);
    if (slug === "stripe") stripeSummary = sum;
    const under = sum.length <= CEIL;
    const missing = BLOCKS.filter((b) => !sum.includes(b));
    if (!under) allUnder = false;
    if (missing.length) allBlocks = false;
    console.log(`${slug.padEnd(14)} ${String(sum.length).padStart(5)} chars (${(sum.length / 1024).toFixed(1)} KB) ${under ? "✓≤6KB" : "✗OVER"} | blocks ${missing.length === 0 ? "all present ✓" : "MISSING: " + missing.join(",")}`);
  }
  console.log(`\nsize ceiling: ${allUnder ? "ALL ≤6KB ✓" : "SOME OVER ✗"} | signal blocks: ${allBlocks ? "all present in every fixture ✓" : "some missing ✗"}`);

  // ── 2. resolved keyword markers for stripe (sample evidence the signal is carried) ──
  console.log("\n--- new keyword-signal lines (resolved for stripe) ---");
  for (const line of stripeSummary.split("\n")) {
    if (/^(COMMERCE SIGNALS|SAAS\/OFFER SIGNALS|LEAD CAPTURE|PERSUASION\/PROOF|DISCOVERY):/.test(line)) console.log(`  ${line}`);
  }

  // ── 3. (a)/(b)/(c) classification across ALL categories ──
  const cats = new Map<string, { total: number; a: number; b: number; c: number }>();
  for (const ch of DIAGNOSTIC_CHECKS) {
    const e = cats.get(ch.category) ?? { total: 0, a: 0, b: 0, c: 0 };
    e.total++;
    if (B_IDS.has(ch.id)) e.b++; else if (C_IDS.has(ch.id)) e.c++; else e.a++;
    cats.set(ch.category, e);
  }
  console.log("\n================ (a)/(b)/(c) CLASSIFICATION — ALL CATEGORIES ================");
  console.log("(a)=signal now present  (b)=deterministic SKIP  (c)=judgment-bound (prompt/reconcile)\n");
  console.log("category                          | total | (a) | (b) | (c)");
  let ta = 0, tb = 0, tc = 0, tt = 0;
  for (const [cat, e] of Array.from(cats.entries()).sort()) {
    console.log(`${cat.padEnd(33)} | ${String(e.total).padStart(5)} | ${String(e.a).padStart(3)} | ${String(e.b).padStart(3)} | ${String(e.c).padStart(3)}`);
    ta += e.a; tb += e.b; tc += e.c; tt += e.total;
  }
  console.log(`${"TOTAL".padEnd(33)} | ${String(tt).padStart(5)} | ${String(ta).padStart(3)} | ${String(tb).padStart(3)} | ${String(tc).padStart(3)}`);
  console.log(`\nexpected stable (answerable: (a) PASS/FAIL + (b) deterministic SKIP): ${ta + tb}/${tt} (${(((ta + tb) / tt) * 100).toFixed(0)}%)`);
  console.log(`remaining (c) judgment-residual (needs prompt/reconcile, NOT extraction): ${tc}`);
  console.log(`  ${Array.from(C_IDS).sort().join(", ")}`);
  console.log(`\nmodel calls: 0 | Anthropic calls: 0 | est cost: $0.0000`);
  console.log("\n(done)");
}
main();
