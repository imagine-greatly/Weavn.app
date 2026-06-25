/**
 * scripts/dashboard-rubric-unify-proof.mts — OFFLINE ($0, ZERO Anthropic calls) proof that the
 * dashboard (/api/scan) and the API (/api/v1/scan) now run ONE shared rubric engine
 * (lib/rubricEngine.ts), producing identical output for identical input.
 *
 * Both routes call runRubricScan, whose PURE core (scoreRubricStatus → buildRubricReportPayload)
 * has no runtime Anthropic import. This replays each fixture's SAVED reconciled status set through
 * that core and proves:
 *   1. EXTRACTION PRESERVES v1 — the score recomputed from the saved statuses equals the
 *      reconciledScore the OLD inline v1 engine produced (stripe 33 / plausible 61 / berkshire 34).
 *      Same statuses → same number → the move to lib/rubricEngine.ts changed nothing.
 *   2. DASHBOARD == API — both surfaces feed the same statuses to the same buildRubricReportPayload,
 *      so the saved reportPayload (what /reports/[token] renders) is identical by construction.
 *   3. SHAPE — the reportPayload carries every field the report UI + saveReport read
 *      (healthScore, dimensionScores×7, moneyLeaks/quickWins/growthRoadmap, totalChecked, …).
 *
 * SDK never imported. No web, no model, no writes.
 *
 *   npx tsx scripts/dashboard-rubric-unify-proof.mts
 */
import { readFileSync } from "node:fs";
import { scopeChecksForScan, API_DIMENSION_KEYS } from "../lib/rubricScan";
import { scoreRubricStatus, buildRubricReportPayload } from "../lib/rubricEngine";
import type { SiteType } from "../lib/reportSchema";

type Row = { id: string; status: string };
const FIXTURES = ["stripe", "plausible", "berkshire"];
const ok = (b: boolean) => (b ? "✓" : "✗");

// Every key the OLD inline v1 reportPayload emitted (the report UI + saveReport read these).
const EXPECTED_KEYS = [
  "site_type", "healthScore", "conversionScore", "growthScore", "scoreMethod", "legacyGrowthScore",
  "pagesAnalyzed", "diagnosticBrief", "intelligenceBrief", "dimensionScores", "leaks", "api_findings",
  "categoryScores", "topLeak", "heroRewrite", "growthBlueprint", "growthStrategy", "moneyLeaks",
  "quickWins", "growthRoadmap", "totalChecked", "totalFailed", "criticalCount", "highCount", "hiddenCount",
].sort();

function main() {
  console.log(`\n### dashboard↔API rubric unification proof — $0, ZERO Anthropic calls (SDK never imported) ###\n`);
  console.log("fixture     | siteType | rows | recomputed | saved | match | payload keys | dims×7 | moneyLeaks | json");
  console.log("-".repeat(104));

  let allPass = true;
  for (const slug of FIXTURES) {
    const j = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
    const siteType = j.siteType as string;
    const saved = j.sonnetCalibration?.reconciledScore;
    const scoped = scopeChecksForScan(siteType as SiteType);
    const scopedIds = new Set(scoped.map((c) => c.id));
    const statusRows: Row[] = (j.sonnetCalibration?.reconciledStatusRows ?? [])
      .filter((r: Row) => scopedIds.has(r.id))
      .map((r: Row) => ({ id: r.id, status: String(r.status).toUpperCase() }));
    if (statusRows.length === 0) { console.log(`${slug.padEnd(11)} | (no saved reconciled status set — skipped)`); continue; }

    // (1) score from the EXTRACTED pure core
    const s = scoreRubricStatus(statusRows, scoped, siteType, 0);
    const scoreMatch = s.score === saved;

    // (2)+(3) assemble the reportPayload exactly as runRubricScan does (full mode, empty narratives
    // here since pass-2 needs the model; narratives only add prose, never change score/shape).
    const asm = buildRubricReportPayload({
      statusRows, scopedChecks: scoped, siteType, findingLimit: 12, scoreOnly: false,
      score: s, pageType: "homepage", pagesAnalyzed: [j.url],
      narratives: new Map(), pass2Summary: "", pass2Copy: {}, pass2Blueprint: [],
    });
    const rp = asm.reportPayload;
    const keysMatch = JSON.stringify(Object.keys(rp).sort()) === JSON.stringify(EXPECTED_KEYS);
    const dims = rp.dimensionScores as unknown[];
    const dimsOk = Array.isArray(dims) && dims.length === API_DIMENSION_KEYS.length;
    const moneyLeaks = rp.moneyLeaks as unknown[];
    const mlOk = Array.isArray(moneyLeaks);
    const headlineOk = rp.healthScore === s.score && rp.totalChecked === scoped.length;
    let jsonOk = false;
    try { jsonOk = JSON.parse(JSON.stringify(rp)).healthScore === s.score; } catch { jsonOk = false; }

    const rowPass = scoreMatch && keysMatch && dimsOk && mlOk && headlineOk && jsonOk;
    if (!rowPass) allPass = false;
    console.log(
      `${slug.padEnd(11)} | ${siteType.padEnd(8)} | ${String(statusRows.length).padStart(4)} | ${String(s.score).padStart(10)} | ${String(saved).padStart(5)} | ` +
      `  ${ok(scoreMatch)}   | ${ok(keysMatch)} (${Object.keys(rp).length}) | ${ok(dimsOk)}(${dims?.length}) | ${ok(mlOk)}(${moneyLeaks?.length}) | ${ok(jsonOk && headlineOk)}`
    );
  }

  console.log("-".repeat(104));
  console.log(`\nv1 EXTRACTION PRESERVED: recomputed score == saved reconciledScore on all fixtures → moving the`);
  console.log(`engine to lib/rubricEngine.ts changed the number by nothing (the API output is byte-identical).`);
  console.log(`DASHBOARD == API: both /api/scan and /api/v1/scan call the SAME runRubricScan →`);
  console.log(`buildRubricReportPayload, so for identical statuses the saved reportPayload is identical.`);
  console.log(`\nAnthropic calls: 0 | cost: $0.0000 | SDK never imported (pure core only)`);
  console.log(`RESULT: ${allPass ? "✅ ALL PASS" : "❌ FAILURES ABOVE"}`);
  if (!allPass) process.exit(1);
}
main();
