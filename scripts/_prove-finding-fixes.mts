/**
 * scripts/_prove-finding-fixes.mts — OFFLINE proof of the three finding fixes. $0, ZERO model calls.
 * Replays SAVED haikuValidation status sets through the (real) finding ranker and rubric.
 *   npx tsx scripts/_prove-finding-fixes.mts
 */
import { readFileSync } from "fs";
import * as rubricMod from "../lib/diagnosticRubric";
import { scopeChecksForScan, topFailIdsByPriority, CATEGORY_TO_DIMENSION, API_DIMENSION_KEYS } from "../lib/rubricScan";
import type { RubricResultRow } from "../lib/processFindings";
import type { DiagnosticCheck } from "../lib/diagnosticRubric";
import type { SiteType } from "../lib/reportSchema";

// tsx CJS/ESM interop can double-wrap the default export — unwrap until we hit the array.
let _dc: unknown = rubricMod;
for (let i = 0; i < 6 && !Array.isArray(_dc); i++) _dc = (_dc as Record<string, unknown>)?.default ?? (_dc as Record<string, unknown>)?.["module.exports"];
const DIAGNOSTIC_CHECKS = _dc as DiagnosticCheck[];

const FIXTURES = ["stripe", "plausible", "berkshire"];
const SHARPENED = ["TRUST_004", "SPQ_001", "SPQ_003", "SPQ_007", "PSY_004", "SPEC_005", "SPEC_008", "SPEC_009", "NARR_009"];
const byId = new Map(DIAGNOSTIC_CHECKS.map((c) => [c.id, c]));

console.log("\n===== TOP-5 FINDINGS PER FIXTURE (saved Haiku run 1 status set) =====");
for (const slug of FIXTURES) {
  const f = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
  const siteType = f.siteType as SiteType;
  const scoped = scopeChecksForScan(siteType);
  const run = f.haikuValidation?.runs?.[0];
  if (!run) { console.log(`  ${slug}: no haikuValidation`); continue; }
  const rows = run.statusRows as RubricResultRow[];
  const top5 = (topFailIdsByPriority as (r: RubricResultRow[], s: typeof scoped, n: number, st?: string) => string[])(rows, scoped, 5, siteType);
  const fails = rows.filter((r) => String(r.status).toUpperCase() === "FAIL").length;
  console.log(`\n${slug}  siteType=${siteType}  fails=${fails}`);
  for (const id of top5) console.log(`   ${id.padEnd(12)} [${byId.get(id)?.category ?? "?"}]  ${byId.get(id)?.title ?? ""}`);
}

console.log("\n===== SHARPENED CHECKS — explicit mechanical SKIP present? =====");
for (const id of SHARPENED) {
  const fc = byId.get(id)?.failCondition ?? "";
  const mechanical = /NEVER SKIP|SKIP ONLY/.test(fc);
  console.log(`  ${id.padEnd(10)} ${mechanical ? "✅ mechanical" : "❌ NOT mechanical"}`);
}

console.log("\n===== INVARIANTS =====");
console.log(`  total checks: ${DIAGNOSTIC_CHECKS.length} ${DIAGNOSTIC_CHECKS.length === 311 ? "✅ (311)" : "❌"}`);
const cats = [...new Set(DIAGNOSTIC_CHECKS.map((c) => c.category))];
const unmapped = cats.filter((c) => !CATEGORY_TO_DIMENSION[c]);
const badDim = cats.filter((c) => CATEGORY_TO_DIMENSION[c] && !API_DIMENSION_KEYS.includes(CATEGORY_TO_DIMENSION[c]));
console.log(`  distinct categories: ${cats.length} | unmapped: ${unmapped.length ? unmapped.join(",") : "none"} | bad-dim: ${badDim.length ? badDim.join(",") : "none"} ${unmapped.length === 0 && badDim.length === 0 ? "✅ clean 27→7 map" : "❌"}`);
for (const slug of FIXTURES) {
  const f = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
  const bytes = Buffer.byteLength(f.summary ?? "", "utf8");
  console.log(`  ${slug} summary: ${bytes} bytes (${(bytes / 1024).toFixed(2)} KB) ${bytes <= 6144 ? "≤6KB ✅" : "⚠ >6KB"}`);
}
console.log("\n(offline — 0 Anthropic calls, $0)");
