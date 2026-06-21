/**
 * scripts/proveCoverage.ts — OFFLINE proof ($0, ZERO Anthropic) that the summary now carries
 * the signal for the flaky (a) checks, and classification of the 38 flaky checks into
 * (a) signal-now-present / (b) deterministic-SKIP / judgment / out-of-scope.
 *
 * Regenerates the stripe summary from the SAVED fixture HTML (no scrape, no model) using the
 * updated extractPageData/buildSinglePageSummary, asserts every (a) marker is present, then
 * reconciles the 5 saved status sets and reports the expected flaky-count reduction.
 *
 *   npx tsx scripts/proveCoverage.ts
 */
import { readFileSync } from "fs";
import { buildPageSummary } from "../lib/analyze";
import { scopeChecksForScan, reconcileStatuses } from "../lib/rubricScan";
import type { CombinedExtraction } from "../lib/scraper";
import type { SiteType } from "../lib/reportSchema";

// (a) flaky check → the summary marker substring that now answers it (present/ABSENT).
const A_MARKERS: Record<string, string> = {
  PAGE_001: "Reviews / testimonials page:",
  PAGE_002: 'Comparison / "why us" page:',
  PAGE_003: "FAQ / help page:",
  PAGE_004: "How-it-works / process page:",
  PAGE_005: "About / founder-story page:",
  PAGE_006: "Blog / educational content:",
  PAGE_010: "Loyalty / rewards program:",
  PAGE_011: "Community / forum / user group:",
  PAGE_012: "Press / media page:",
  SERV_001: "Process / how-we-work explanation:",
  SERV_002: "Case studies / portfolio:",
  SERV_003: "Response-time / turnaround commitment:",
  SERV_004: "Pricing page or visible pricing:",
  SERV_005: "Team / people page:",
  SERV_006: "Discovery-call / consultation / demo CTA:",
  RET_003: "Win-back / returning-visitor language:",
  RET_005: "Membership / VIP / loyalty tier:",
  RET_006: "Community / peer network:",
  MSG_005: "COPY FRAMING:",
  MSG_008: "Pricing page or visible pricing:",
  NARR_011: "announcement/promo bar above content:",
  NARR_014: "final CTA at page end (footer):",
};
const B_DETERMINISTIC = new Set(["RET_002"]); // runtime/returning-visitor → SKIP by rule
const JUDGMENT = new Set(["MSG_002", "MSG_004", "MSG_006", "MSG_010", "MSG_014", "NARR_005"]); // copy/order judgment; signal already present
// Everything else flaky is outside this pass's named scope (PAGE/SERV/RET/MSG/NARR).

function main() {
  const fixture = JSON.parse(readFileSync("fixtures/stripe.json", "utf8")) as {
    url: string; siteType?: string; complexity?: string; readableRatio?: number;
    scrapeRawHtml: string; statusSets?: { id: string; status: string }[][];
  };
  const siteType = (fixture.siteType || "service") as SiteType;

  // ── regenerate summary from SAVED html (no scrape, no model) ──
  const extraction: CombinedExtraction = {
    rawHtml: fixture.scrapeRawHtml,
    pagesAnalyzed: [fixture.url],
    complexity: fixture.complexity as CombinedExtraction["complexity"],
    readableRatio: fixture.readableRatio,
  };
  const summary = buildPageSummary(extraction);

  console.log(`\n================ SUMMARY SIGNAL PROOF (stripe, offline) ================`);
  console.log(`new summary size: ${summary.length} chars (${(summary.length / 1024).toFixed(1)} KB)`);

  // ── assert every (a) marker is now present in the summary ──
  let present = 0; const missing: string[] = [];
  for (const [id, marker] of Object.entries(A_MARKERS)) {
    const ok = summary.includes(marker);
    if (ok) present++; else missing.push(`${id} (${marker})`);
  }
  console.log(`\n(a) signal markers present: ${present}/${Object.keys(A_MARKERS).length}`);
  if (missing.length) console.log(`  MISSING: ${missing.join(", ")}`);
  else console.log(`  ✓ every (a) check now has an explicit present/ABSENT marker in the summary`);

  // ── show the resolved values for the new blocks ──
  console.log(`\n--- new signal blocks (resolved for stripe) ---`);
  for (const line of summary.split("\n")) {
    if (/^(PAGES & SITE LINKS|SERVICE-BUSINESS SIGNALS|RETENTION SIGNALS|COPY FRAMING|PAGE STRUCTURE)/.test(line) ||
        /(page|content|page or visible pricing|explanation|portfolio|commitment|demo CTA|returning-visitor language|VIP|peer network|final CTA|promo bar):/.test(line)) {
      console.log(`  ${line}`);
    }
  }

  // ── classify the actual flaky checks from the 5 saved status sets ──
  if (!fixture.statusSets || fixture.statusSets.length < 2) {
    console.log(`\n(no saved statusSets — run measureStatusSpread.ts first)`); return;
  }
  const sets = fixture.statusSets;
  const scoped = scopeChecksForScan(siteType);
  const ids = scoped.map((c) => c.id);
  const flaky: string[] = [];
  for (const id of ids) {
    const votes = new Set(sets.map((s) => s.find((r) => r.id === id)?.status ?? "SKIP"));
    if (votes.size > 1) flaky.push(id);
  }

  const aFixed = flaky.filter((id) => id in A_MARKERS);
  const bDet = flaky.filter((id) => B_DETERMINISTIC.has(id));
  const judgment = flaky.filter((id) => JUDGMENT.has(id));
  const outOfScope = flaky.filter((id) => !(id in A_MARKERS) && !B_DETERMINISTIC.has(id) && !JUDGMENT.has(id));
  const reconciled = reconcileStatuses(sets);

  console.log(`\n================ FLAKY CLASSIFICATION (${flaky.length} flaky from 5 saved runs) ================`);
  console.log(`(a) signal NOW present → expected to stabilize: ${aFixed.length}  [${aFixed.join(", ")}]`);
  console.log(`(b) deterministic SKIP (runtime/returning-visitor): ${bDet.length}  [${bDet.join(", ")}]`);
  console.log(`judgment-bound (signal already present, copy/order — out of extraction scope): ${judgment.length}  [${judgment.join(", ")}]`);
  console.log(`out of this pass's scope (other categories): ${outOfScope.length}  [${outOfScope.join(", ")}]`);
  console.log(`\nreconcile(5 saved) flakyCount = ${reconciled.flakyCount} (pre-fix snapshot)`);
  const addressed = aFixed.length + bDet.length;
  console.log(`\nEXPECTED flaky-count reduction: ${flaky.length} → ~${flaky.length - addressed} (the ${addressed} addressed (a)+(b) checks now answer deterministically; ${judgment.length} judgment + ${outOfScope.length} out-of-scope remain for later passes).`);
  console.log(`\nmodel calls: 0 | Anthropic calls: 0 | est cost: $0.0000`);
  console.log(`\n(done)`);
}
main();
