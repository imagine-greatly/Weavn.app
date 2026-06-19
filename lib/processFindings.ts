/**
 * Rubric finding curation and growth score — output layer only (no rubric changes).
 */

import DIAGNOSTIC_CHECKS, { type DiagnosticCheck } from "@/lib/diagnosticRubric";
import type { Leak, RevenueEffortLabel } from "@/lib/reportSchema";

export type RubricSeverity = "Critical" | "High" | "Medium" | "Low";
export type RubricMode = "FLAW" | "GAP";

export type EnrichedRubricFinding = {
  id: string;
  category: string;
  categoryNumber: number;
  /** Original rubric check title (DIAGNOSTIC_CHECKS). */
  title: string;
  mode: RubricMode;
  severity: RubricSeverity;
  evidence: string | null;
  impactStatement: string | null;
  whyItMatters: string | null;
  howToFixIt: string | null;
  failCondition: string;
  revenueTitle?: string | null;
  businessCost?: string | null;
  fix?: string | null;
  revenueEffort?: RevenueEffortLabel | null;
};

/** Alias for curation / overview prompts (same shape as enriched rubric rows). */
export type DiagnosticFinding = EnrichedRubricFinding;

/** Raw row from Claude rubric JSON (PASS / FAIL / SKIP). */
export type RubricResultRow = {
  id: string;
  status: string;
  evidence?: string;
  /** Conversion Intelligence narrative (preferred). */
  title?: string;
  exitTrigger?: string;
  conversionCost?: string;
  implementation?: string;
  /** Legacy keys — still accepted if model returns older shape. */
  businessCost?: string;
  fix?: string;
  effort?: string;
  revenueTitle?: string;
  skipReason?: string;
  impactStatement?: string;
  whyItMatters?: string;
  howToFixIt?: string;
};

type CheckDef = {
  id: string;
  category: string;
  categoryNumber: number;
  title: string;
  mode: RubricMode;
  severity: RubricSeverity;
  failCondition: string;
};

export const SEVERITY_ORDER: Record<RubricSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/** Revenue-impact category order — lower index = higher priority. */
export const REVENUE_PRIORITY_CATEGORIES: readonly string[] = [
  "Email & Retention",
  "Trust & Credibility",
  "Offer & Pricing",
  "CTA & Conversion",
  "Checkout & Purchase Friction",
  "Hero Section",
  "Social Proof",
  "Messaging & Clarity",
  "Psychology & Persuasion",
  "Competitive Differentiation",
  "Page & Content Gaps",
  "Emotional Sequence & Page Flow",
  "Product Page",
  "Mobile Experience",
  "Navigation & UX",
  "Specificity & Claim Quality",
  "Page Speed & Technical",
  "SEO & Metadata",
  "Return Visitor & Retention",
  "Accessibility & Inclusion",
];

/** @deprecated Prefer REVENUE_PRIORITY_CATEGORIES */
export const CATEGORY_PRIORITY: string[] = [...REVENUE_PRIORITY_CATEGORIES];

/** Revenue-impact order (lower = higher priority). */
export function categoryPriorityRank(category: string): number {
  const idx = REVENUE_PRIORITY_CATEGORIES.indexOf(category);
  return idx === -1 ? 999 : idx;
}

function withinCategoryRank(f: EnrichedRubricFinding): number {
  const s = f.severity;
  const m = f.mode;
  if (s === "Critical" && m === "FLAW") return 0;
  if (s === "Critical" && m === "GAP") return 1;
  if (s === "High" && m === "FLAW") return 2;
  if (s === "High" && m === "GAP") return 3;
  if (s === "Critical") return 0;
  if (s === "High") return 4;
  if (s === "Medium" && m === "FLAW") return 5;
  if (s === "Medium" && m === "GAP") return 6;
  if (s === "Low" && m === "FLAW") return 7;
  if (s === "Low" && m === "GAP") return 8;
  return 10 + SEVERITY_ORDER[s];
}

/** Sort failures by revenue category order, then Critical FLAW → Critical GAP → High FLAW → High GAP, etc. */
export function sortByRevenuePriority(
  findings: DiagnosticFinding[]
): EnrichedRubricFinding[] {
  return [...findings].sort((a, b) => {
    const ra = categoryPriorityRank(a.category);
    const rb = categoryPriorityRank(b.category);
    if (ra !== rb) return ra - rb;
    const wr = withinCategoryRank(a) - withinCategoryRank(b);
    if (wr !== 0) return wr;
    return a.id.localeCompare(b.id);
  });
}

/** @deprecated Prefer sortByRevenuePriority */
export function sortDiagnosticFindings(
  findings: DiagnosticFinding[]
): DiagnosticFinding[] {
  return sortByRevenuePriority(findings);
}

const DEDUCTIONS: Record<RubricSeverity, Record<RubricMode, number>> = {
  Critical: { FLAW: 7, GAP: 4 },
  High: { FLAW: 3, GAP: 2 },
  Medium: { FLAW: 1.5, GAP: 0.75 },
  Low: { FLAW: 0.5, GAP: 0.25 },
};

export type CuratedFindingsResult = {
  /** Max 8 — THE MONEY LEAKS */
  moneyLeaks: DiagnosticFinding[];
  /** Max 3 — effort Today */
  quickWins: DiagnosticFinding[];
  /** Max 20 — not in money leaks */
  growthRoadmap: DiagnosticFinding[];
  /** Same as moneyLeaks */
  priorityFindings: DiagnosticFinding[];
  /** Legacy: mapped to growth roadmap for older readers */
  secondaryFindings: DiagnosticFinding[];
  opportunityFindings: DiagnosticFinding[];
  primaryFindings: DiagnosticFinding[];
  allFindings: DiagnosticFinding[];
  totalFailed: number;
  totalChecked: number;
  hiddenCount: number;
};

/**
 * Revenue diagnostic tiering: money leaks (8), quick wins (3 Today), growth roadmap (20).
 */
export function curateFindings(findings: DiagnosticFinding[]): CuratedFindingsResult {
  const sorted = sortByRevenuePriority(findings as EnrichedRubricFinding[]);
  const moneyLeaks = sorted.slice(0, 8);
  const moneyIds = new Set(moneyLeaks.map((f) => f.id));
  const quickWins = sorted.filter((f) => f.revenueEffort === "Today").slice(0, 3);
  const growthRoadmap = sorted.filter((f) => !moneyIds.has(f.id)).slice(0, 20);
  const hiddenCount = Math.max(
    0,
    sorted.length - moneyLeaks.length - growthRoadmap.length
  );

  return {
    moneyLeaks,
    quickWins,
    growthRoadmap,
    priorityFindings: moneyLeaks,
    primaryFindings: moneyLeaks,
    secondaryFindings: growthRoadmap,
    opportunityFindings: [],
    allFindings: findings,
    totalFailed: findings.length,
    totalChecked: DIAGNOSTIC_CHECKS.length,
    hiddenCount,
  };
}

function effortAndTimeForRubric(
  severity: RubricSeverity,
  revenueEffort?: RevenueEffortLabel | null
): { effortToFix: Leak["effortToFix"]; timeToFix: string } {
  if (revenueEffort === "Today") {
    return { effortToFix: "low", timeToFix: "Under 2 hours" };
  }
  if (revenueEffort === "This Week") {
    return { effortToFix: "medium", timeToFix: "1–3 days" };
  }
  if (revenueEffort === "This Month") {
    return { effortToFix: "high", timeToFix: "Structural" };
  }
  switch (severity) {
    case "Critical":
      return { effortToFix: "low", timeToFix: "1–3 hours" };
    case "High":
      return { effortToFix: "medium", timeToFix: "1 day" };
    case "Medium":
      return { effortToFix: "high", timeToFix: "1 week" };
    case "Low":
      return { effortToFix: "high", timeToFix: "1 week" };
    default:
      return { effortToFix: "medium", timeToFix: "1 day" };
  }
}

function normalizeRevenueEffort(raw: string | undefined): RevenueEffortLabel | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "today" || (t.includes("today") && !t.includes("week") && !t.includes("month")))
    return "Today";
  if (t.includes("week")) return "This Week";
  if (t.includes("month")) return "This Month";
  return null;
}

function defaultRevenueEffort(sev: RubricSeverity): RevenueEffortLabel {
  if (sev === "Critical" || sev === "High") return "This Week";
  return "This Month";
}

export function enrichRubricFailures(
  rawResults: RubricResultRow[],
  byId: Map<string, DiagnosticCheck>
): EnrichedRubricFinding[] {
  const out: EnrichedRubricFinding[] = [];
  for (const r of rawResults) {
    if (r.status !== "FAIL") continue;
    const check = byId.get(r.id);
    if (!check) continue;
    const effortNorm = normalizeRevenueEffort(r.effort);
    const revenueEffort = effortNorm ?? defaultRevenueEffort(check.severity);
    const narrativeTitle = r.title?.trim() || r.revenueTitle?.trim() || null;
    const narrativeCost =
      r.conversionCost?.trim() || r.businessCost?.trim() || null;
    const narrativeFix = r.implementation?.trim() || r.fix?.trim() || null;
    const exitLine = r.exitTrigger?.trim() || null;
    out.push({
      id: r.id,
      category: check.category,
      categoryNumber: check.categoryNumber,
      title: check.title,
      mode: check.mode,
      severity: check.severity,
      evidence: r.evidence ?? null,
      impactStatement: r.impactStatement ?? null,
      whyItMatters: r.whyItMatters?.trim() || exitLine || null,
      howToFixIt: r.howToFixIt?.trim() || null,
      failCondition: check.failCondition,
      revenueTitle: narrativeTitle,
      businessCost: narrativeCost,
      fix: narrativeFix,
      revenueEffort,
    });
  }
  return out;
}

export function enrichedFindingToLeak(f: EnrichedRubricFinding): Leak {
  const displayTitle = (f.revenueTitle?.trim() || f.title).trim();
  const rubricCheckTitle = f.title;
  const evidenceBody = (f.evidence?.trim() || "").trim();
  const whatWeFound =
    evidenceBody ||
    "Specific on-page evidence was not returned for this item — review the live page or rescan.";
  const businessCostBody =
    f.businessCost?.trim() || f.whyItMatters?.trim() || "";
  const fixBody = f.fix?.trim() || f.howToFixIt?.trim() || "";
  const whyForLeak = businessCostBody;
  const howForLeak =
    fixBody ||
    (f.evidence?.trim() ? "Apply a targeted fix for the issue described above." : "");
  const { effortToFix, timeToFix } = effortAndTimeForRubric(f.severity, f.revenueEffort);
  return {
    id: f.id,
    type: f.mode === "GAP" ? "missing" : "existing",
    title: displayTitle,
    revenueTitle: f.revenueTitle?.trim() || displayTitle,
    rubricCheckTitle,
    category: f.category,
    evidence: whatWeFound,
    severity:
      f.severity === "Critical" || f.severity === "High"
        ? "critical"
        : f.severity === "Medium"
          ? "warning"
          : "passing",
    whatWeFound,
    whyItMatters: whyForLeak,
    businessCost: businessCostBody || undefined,
    howToFixIt: howForLeak,
    impactStatement: f.impactStatement?.trim() || undefined,
    exampleFix: fixBody || "Apply the required structural fix for this failed rubric check.",
    psychologyPrinciple: "Revenue mechanism",
    revenueImpact:
      f.severity === "Critical" ? 9 : f.severity === "High" ? 7 : f.severity === "Medium" ? 4 : 2,
    effortToFix,
    timeToFix,
    page_location: "homepage",
    rubricSeverity: f.severity,
    rubricMode: f.mode,
    revenueEffort: f.revenueEffort ?? undefined,
  };
}

export function curateDiagnosticFindings(
  findings: EnrichedRubricFinding[]
): {
  primaryFindings: Leak[];
  secondaryFindings: Leak[];
  opportunityFindings: Leak[];
  totalFailed: number;
  totalChecked: number;
  hiddenFindingsCount: number;
  hiddenCount: number;
} {
  const c = curateFindings(findings);
  return {
    primaryFindings: c.moneyLeaks.map(enrichedFindingToLeak),
    secondaryFindings: c.growthRoadmap.map(enrichedFindingToLeak),
    opportunityFindings: c.quickWins.map(enrichedFindingToLeak),
    totalFailed: c.totalFailed,
    totalChecked: c.totalChecked,
    hiddenFindingsCount: c.hiddenCount,
    hiddenCount: c.hiddenCount,
  };
}

function calculateGrowthScore(findings: EnrichedRubricFinding[], heroHeadline?: string | null): number {
  let score = 100;
  for (const f of findings) {
    score -= DEDUCTIONS[f.severity]?.[f.mode] ?? 0;
  }

  const hh = String(heroHeadline ?? "");
  if (hh.includes("![") || hh.includes("](http")) {
    console.error(
      "[PARSER] CRITICAL: heroHeadline contains markdown image — scrape failed to clean headline. This will cause inaccurate analysis."
    );
  }

  const categoryGroups: Record<string, { total: number; failed: number }> = {};
  for (const check of DIAGNOSTIC_CHECKS) {
    if (!categoryGroups[check.category]) {
      categoryGroups[check.category] = { total: 0, failed: 0 };
    }
    categoryGroups[check.category].total++;
  }
  for (const finding of findings) {
    if (categoryGroups[finding.category]) {
      categoryGroups[finding.category].failed++;
    }
  }
  let categoryBonus = 0;
  for (const cat of Object.values(categoryGroups)) {
    if (cat.failed === 0) categoryBonus += 2;
  }
  categoryBonus = Math.min(categoryBonus, 10);

  score += categoryBonus;

  const hasCritical = findings.some((f) => f.severity === "Critical");
  const ceiling = hasCritical ? 94 : 100;
  const finalScore = Math.round(Math.max(8, Math.min(ceiling, score)));

  console.log("[SCORE] rubric growth score (deductions + category bonus):", {
    afterDeductions: score - categoryBonus,
    categoryBonus,
    beforeClamp: score,
    final: finalScore,
    hasCritical,
  });
  return finalScore;
}

export function computeGrowthScoreFromRubric(
  rawResults: RubricResultRow[],
  checks: DiagnosticCheck[],
  heroHeadline?: string | null
): { growthScore: number; anyCriticalFail: boolean } {
  const byId = new Map(checks.map((c) => [c.id, c]));
  const findings = enrichRubricFailures(rawResults, byId);
  const growthScore = calculateGrowthScore(findings, heroHeadline);
  const anyCriticalFail = findings.some((f) => f.severity === "Critical");
  return { growthScore, anyCriticalFail };
}
