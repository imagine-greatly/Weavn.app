/**
 * scripts/subset-score-analysis.mts — OFFLINE ($0, ZERO model calls, read-only) test of the
 * "cheap scoring" hypothesis: does a HIGH-SIGNAL SUBSET of the rubric reproduce the FULL headline
 * score? If a subset tracks the full score within ±3 (band-preserving) on all three saved fixtures,
 * a cheaper status pass (score from the subset; full 311 only for findings) is viable.
 *
 * Recomputes the headline with the PRODUCTION formula by reusing computeApiDimensions (severity-
 * weighted PASS/(PASS+FAIL) per dimension, SKIP excluded) × getWeightProfile — feeding it the saved
 * reconciled statuses FILTERED to each subset's ids. Byte-identical math; only the input rows shrink.
 *
 * Subsets:
 *   A — Critical + High severity only.
 *   B — STABLE checks (never flipped across the saved multi-pass runs: plausible 3× Sonnet-verbose +
 *       stripe 5× statusSets). Berkshire has no multi-pass data → inherits the pooled stable id set.
 *   C — BALANCED ~90: per-dimension count proportional to the full rubric's distribution, highest
 *       severity within each dim (keeps all 7 dims + their relative weight representation).
 *   D — per-dimension TOP-12 by severity (equalizes dimensions; keeps all 7).
 *
 * Reads fixtures/{stripe,plausible,berkshire}.json (sonnetCalibration.reconciledStatusRows). No web,
 * no Anthropic, no writes to prod. SDK never imported.
 *
 *   npx tsx scripts/subset-score-analysis.mts
 */
import { readFileSync } from "node:fs";
import {
  scopeChecksForScan, computeApiDimensions, API_DIMENSION_KEYS, CATEGORY_TO_DIMENSION,
  type ApiDimensionKey,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import _DIAG from "../lib/diagnosticRubric";
import type { SiteType } from "../lib/reportSchema";

type Check = { id: string; category: string; severity: "Critical" | "High" | "Medium" | "Low" };
const DIAGNOSTIC_CHECKS = (Array.isArray(_DIAG) ? _DIAG : (_DIAG as { default: Check[] }).default) as Check[];
const CHECK = new Map(DIAGNOSTIC_CHECKS.map((c) => [c.id, c]));
const SEV_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const dimOf = (id: string): ApiDimensionKey | undefined => CATEGORY_TO_DIMENSION[CHECK.get(id)?.category ?? ""] as ApiDimensionKey | undefined;

const AMBER_AT = 50, GREEN_AT = 70;
const band = (s: number) => (s < AMBER_AT ? "RED" : s < GREEN_AT ? "AMBER" : "GREEN");

/** EXACT production headline: round(Σ weight_k · computeApiDimensions_k), clamped 0..100. */
function headline(rows: { id: string; status: string }[], siteType: string): number {
  const dims = computeApiDimensions(rows);
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

type Row = { id: string; status: string };
interface Fix { slug: string; siteType: string; full: Row[]; savedScore: number; multiPass: Row[][] }

function loadFixtures(): Fix[] {
  const out: Fix[] = [];
  for (const slug of ["stripe", "plausible", "berkshire"]) {
    const j = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
    const siteType = j.siteType as string;
    const full = (j.sonnetCalibration?.reconciledStatusRows ?? []).map((r: Row) => ({ id: r.id, status: String(r.status).toUpperCase() }));
    const multiPass: Row[][] = [];
    // production-representative repeated passes for stability (Subset B)
    if (Array.isArray(j.productionConfigValidation?.verbose) && j.productionConfigValidation.verbose.length >= 2)
      for (const p of j.productionConfigValidation.verbose) multiPass.push((p.rows ?? []).map((r: Row) => ({ id: r.id, status: String(r.status).toUpperCase() })));
    if (Array.isArray(j.statusSets) && j.statusSets.length >= 2)
      for (const set of j.statusSets) multiPass.push((set ?? []).map((r: Row) => ({ id: r.id, status: String(r.status).toUpperCase() })));
    out.push({ slug, siteType, full, savedScore: j.sonnetCalibration?.reconciledScore ?? NaN, multiPass });
  }
  return out;
}

// ── subset id sets (catalog-wide; intersect naturally with each fixture's scoped rows) ──
function subsetA(): Set<string> {
  return new Set(DIAGNOSTIC_CHECKS.filter((c) => c.severity === "Critical" || c.severity === "High").map((c) => c.id));
}
function subsetB(fixtures: Fix[]): Set<string> {
  // STABLE = single distinct status across ALL pooled multi-pass runs where the id appeared ≥2×.
  const seen = new Map<string, Set<string>>();
  const appearances = new Map<string, number>();
  for (const f of fixtures) for (const run of f.multiPass) for (const r of run) {
    if (!seen.has(r.id)) seen.set(r.id, new Set());
    seen.get(r.id)!.add(String(r.status).toUpperCase());
    appearances.set(r.id, (appearances.get(r.id) ?? 0) + 1);
  }
  const stable = new Set<string>();
  for (const [id, statuses] of seen) if (statuses.size === 1 && (appearances.get(id) ?? 0) >= 2) stable.add(id);
  return stable;
}
function perDimPick(perDim: (dim: ApiDimensionKey, all: Check[]) => number): Set<string> {
  const byDim = new Map<ApiDimensionKey, Check[]>();
  for (const c of DIAGNOSTIC_CHECKS) { const d = dimOf(c.id); if (!d) continue; if (!byDim.has(d)) byDim.set(d, []); byDim.get(d)!.push(c); }
  const ids = new Set<string>();
  for (const k of API_DIMENSION_KEYS) {
    const all = (byDim.get(k) ?? []).slice().sort((a, b) => (SEV_ORDER[b.severity] - SEV_ORDER[a.severity]) || a.id.localeCompare(b.id));
    for (const c of all.slice(0, perDim(k, all))) ids.add(c.id);
  }
  return ids;
}
function subsetC(target = 90): Set<string> {
  // balanced: per-dim count proportional to that dim's share of the full catalog (≥1), top severity.
  return perDimPick((k, all) => Math.max(1, Math.round(target * (all.length / DIAGNOSTIC_CHECKS.length))));
}
function subsetD(n = 12): Set<string> {
  return perDimPick((_k, all) => Math.min(n, all.length));
}
// E — STEELMAN: preserve BOTH the dimension AND the severity mix. Per (dimension × severity tier),
// take a proportional sample (≈ target/total share, ≥1 if the cell is non-empty), deterministic by id.
// This is the design most likely to track the full severity-weighted score — if it still drifts, the
// hypothesis is dead, not just my subset choices.
function subsetE(target = 90): Set<string> {
  const byCell = new Map<string, Check[]>();
  for (const c of DIAGNOSTIC_CHECKS) { const d = dimOf(c.id); if (!d) continue; const key = `${d}|${c.severity}`; if (!byCell.has(key)) byCell.set(key, []); byCell.get(key)!.push(c); }
  const ids = new Set<string>();
  for (const [, cell] of byCell) {
    const take = Math.max(1, Math.round(target * (cell.length / DIAGNOSTIC_CHECKS.length)));
    for (const c of cell.slice().sort((a, b) => a.id.localeCompare(b.id)).slice(0, take)) ids.add(c.id);
  }
  return ids;
}

function evalSubset(rows: Row[], ids: Set<string>, siteType: string) {
  const sub = rows.filter((r) => ids.has(r.id));
  const answered = sub.filter((r) => r.status === "PASS" || r.status === "FAIL").length;
  return { score: headline(sub, siteType), size: sub.length, answered };
}

function main() {
  const fixtures = loadFixtures();
  const subs: Record<string, Set<string>> = { A: subsetA(), B: subsetB(fixtures), C: subsetC(90), D: subsetD(12), E: subsetE(90) };
  const catalogSize: Record<string, number> = {};
  for (const [k, s] of Object.entries(subs)) catalogSize[k] = s.size;

  console.log(`\n### SUBSET-SCORE ANALYSIS — $0, ZERO Anthropic calls (read-only, saved fixtures) ###`);
  console.log(`Full catalog: ${DIAGNOSTIC_CHECKS.length} checks. Headline = round(Σ dimWeight·dimCoverage); dimCoverage = severity-weighted PASS/(PASS+FAIL), SKIP excluded.\n`);

  // sanity: recomputed full == saved reconciled score
  console.log(`Sanity — recomputed full headline vs saved reconciledScore:`);
  for (const f of fixtures) {
    const full = headline(f.full, f.siteType);
    console.log(`  ${f.slug.padEnd(10)} (${f.siteType.padEnd(7)}) recomputed=${full} saved=${f.savedScore} ${full === f.savedScore ? "✓" : "✗ MISMATCH"} | scoped rows=${f.full.length} | multiPass runs for B=${f.multiPass.length}`);
  }

  console.log(`\nSubset catalog sizes (catalog-wide ids): A(Crit+High)=${catalogSize.A}  B(stable)=${catalogSize.B}  C(balanced~90)=${catalogSize.C}  D(top12/dim)=${catalogSize.D}`);
  console.log(`B(stable) measured from: ${fixtures.filter((f) => f.multiPass.length >= 2).map((f) => `${f.slug}×${f.multiPass.length}`).join(" + ") || "none"} (berkshire inherits the pooled set)\n`);

  // ── per-subset, per-fixture ──
  const order = ["A", "B", "C", "D", "E"] as const;
  const label: Record<string, string> = { A: "A Critical+High", B: "B stable/high-agree", C: "C balanced ~90", D: "D top-12/dim", E: "E strat dim×sev ~90" };
  const allWithin3: Record<string, boolean> = {};
  const maxAbsDelta: Record<string, number> = {};

  for (const key of order) {
    const ids = subs[key];
    console.log(`${"=".repeat(92)}`);
    console.log(`SUBSET ${label[key]}  (catalog ids: ${ids.size})`);
    console.log(`  fixture     | full | subset | Δ    | band(full→subset)        | subset size (scoped/answered)`);
    let within3 = true, maxAbs = 0;
    for (const f of fixtures) {
      const full = headline(f.full, f.siteType);
      const r = evalSubset(f.full, ids, f.siteType);
      const d = r.score - full;
      const bandPreserved = band(full) === band(r.score);
      if (Math.abs(d) > 3) within3 = false;
      maxAbs = Math.max(maxAbs, Math.abs(d));
      console.log(`  ${f.slug.padEnd(11)} | ${String(full).padStart(4)} | ${String(r.score).padStart(6)} | ${(d >= 0 ? "+" : "") + d}`.padEnd(40) +
        `| ${band(full).padEnd(5)}→${band(r.score).padEnd(5)} ${bandPreserved ? "preserved ✓" : "CHANGED ✗"} | ${r.size}/${r.answered}`);
    }
    allWithin3[key] = within3; maxAbsDelta[key] = maxAbs;
    console.log(`  → within ±3 on ALL fixtures: ${within3 ? "YES ✅" : "NO ✗"} (max |Δ| = ${maxAbs})`);
    console.log("");
  }

  // ── token / cost projection (status-pass OUTPUT scales ~linearly with #checks emitted) ──
  // Live Sonnet anchor (prod-config-validation): verbose pass-1 ≈ 6128 out tok over 259 checks ≈ 23.7 tok/check.
  // Status-pass read-cost ≈ catalog cache-read (fixed) + summary in (fixed) + #checks·23.7·$15/MTok.
  const TOK_PER_CHECK = 23.7, OUT_RATE = 15 / 1e6;
  const FULL_SCOPED = 259; // plausible saas (representative)
  console.log(`${"=".repeat(92)}`);
  console.log(`COST PROXY (status-pass OUTPUT only; anchor 23.7 out tok/check, Sonnet $15/MTok out):`);
  console.log(`  subset            | catalog ids | ~out tok/pass | vs full ${FULL_SCOPED} (~${Math.round(FULL_SCOPED * TOK_PER_CHECK)} tok) | output $/pass`);
  for (const key of order) {
    const n = subs[key].size;
    const tok = Math.round(n * TOK_PER_CHECK);
    console.log(`  ${label[key].padEnd(17)} | ${String(n).padStart(11)} | ${String(tok).padStart(13)} | ${("-" + (100 * (1 - n / FULL_SCOPED)).toFixed(0) + "%").padStart(20)} | $${(tok * OUT_RATE).toFixed(4)}`);
  }

  // ── verdict ──
  console.log(`\n${"#".repeat(92)}`);
  console.log(`VERDICT`);
  const winners = order.filter((k) => allWithin3[k] && subs[k].size < 120);
  if (winners.length) {
    console.log(`  Subset(s) reproducing full within ±3 on ALL 3 fixtures at <120 checks: ${winners.map((k) => label[k]).join(", ")}`);
  } else {
    console.log(`  NO subset reproduces the full score within ±3 on all 3 fixtures at <120 checks.`);
    console.log(`  Max |Δ| per subset: ${order.map((k) => `${k}=${maxAbsDelta[k]}(${subs[k].size} ids)`).join("  ")}`);
    console.log(`  → Full-rubric scoring is LOAD-BEARING. Cheap subset-scoring is NOT viable. Scoring is premium-only.`);
  }
  console.log(`\nAnthropic calls: 0 | cost: $0.0000 | read-only | no prod change | no merge`);
  console.log(`(done)`);
}
main();
