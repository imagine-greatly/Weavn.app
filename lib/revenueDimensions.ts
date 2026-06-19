import DIAGNOSTIC_CHECKS from "./diagnosticRubric";

export const REVENUE_DIMENSIONS = [
  {
    id: "capture",
    label: "Revenue Capture",
    description: "Converting visitors who arrive on your site",
    categories: [
      "Hero Section",
      "CTA & Conversion",
      "Emotional Sequence & Page Flow",
      "Messaging & Clarity",
    ],
  },
  {
    id: "trust",
    label: "Trust & Credibility",
    description: "Building confidence that drives purchase decisions",
    categories: ["Trust & Credibility", "Social Proof", "Specificity & Claim Quality"],
  },
  {
    id: "infrastructure",
    label: "Revenue Infrastructure",
    description: "Systems that capture and retain revenue",
    categories: [
      "Email & Retention",
      "Offer & Pricing",
      "Checkout & Purchase Friction",
      "Return Visitor & Retention",
    ],
  },
  {
    id: "position",
    label: "Market Position",
    description: "Giving visitors a reason to choose you",
    categories: [
      "Competitive Differentiation",
      "Psychology & Persuasion",
      "Page & Content Gaps",
      "Product Page",
    ],
  },
  {
    id: "visibility",
    label: "Visibility & Reach",
    description: "Getting found and working for every visitor",
    categories: [
      "SEO & Metadata",
      "Mobile Experience",
      "Page Speed & Technical",
      "Navigation & UX",
      "Accessibility & Inclusion",
    ],
  },
] as const;

export type RevenueDimensionId = (typeof REVENUE_DIMENSIONS)[number]["id"];

export type DimensionStatus = "critical" | "weak" | "fair" | "strong";

export interface DimensionScoreRow {
  id: string;
  label: string;
  description: string;
  score: number;
  failCount: number;
  totalCount: number;
  status: DimensionStatus;
}

const WEIGHTS: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function normalizeRubricStatus(raw: string | undefined): "PASS" | "FAIL" | "SKIP" {
  const u = (raw ?? "").toUpperCase();
  if (u === "PASS") return "PASS";
  if (u === "FAIL") return "FAIL";
  return "SKIP";
}

export function calculateDimensionScores(
  allResults: Array<{ id: string; status: string }>
): DimensionScoreRow[] {
  const resultMap = new Map<string, ReturnType<typeof normalizeRubricStatus>>();
  for (const r of allResults) {
    const id = String(r.id ?? "").trim();
    if (!id) continue;
    const norm = normalizeRubricStatus(r.status);
    resultMap.set(id, norm);
    resultMap.set(id.toUpperCase(), norm);
  }

  return REVENUE_DIMENSIONS.map((dim) => {
    const dimCats = dim.categories as readonly string[];
    const dimChecks = DIAGNOSTIC_CHECKS.filter((c) => dimCats.includes(c.category));

    let totalWeight = 0;
    let passedWeight = 0;
    let failCount = 0;

    for (const check of dimChecks) {
      const st =
        resultMap.get(check.id) ??
        resultMap.get(check.id.toUpperCase());
      if (st !== "PASS" && st !== "FAIL") continue;
      const weight = WEIGHTS[check.severity] ?? 1;
      totalWeight += weight;
      if (st === "PASS") {
        passedWeight += weight;
      } else if (st === "FAIL") {
        failCount++;
      }
    }

    const score =
      totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

    const status: DimensionStatus =
      score >= 70 ? "strong" : score >= 50 ? "fair" : score >= 30 ? "weak" : "critical";

    return {
      id: dim.id,
      label: dim.label,
      description: dim.description,
      score,
      failCount,
      totalCount: dimChecks.length,
      status,
    };
  });
}

/**
 * Generic dimension definition — lets a caller score an arbitrary set of
 * dimensions (e.g. the 7 public API dimensions) from the same rubric results,
 * using the identical weighted PASS/FAIL math as calculateDimensionScores.
 */
export interface DimensionDef {
  id: string;
  label: string;
  description: string;
  categories: string[];
}

/**
 * Weighted dimension scores for an arbitrary dimension set. SKIP rows are
 * excluded from the denominator (never penalize unobserved checks); a dimension
 * with no evaluated PASS/FAIL checks scores 0. Same weighting + status bands as
 * calculateDimensionScores — this is the parameterized form of it.
 */
export function scoreDimensions(
  allResults: Array<{ id: string; status: string }>,
  defs: DimensionDef[]
): DimensionScoreRow[] {
  const resultMap = new Map<string, ReturnType<typeof normalizeRubricStatus>>();
  for (const r of allResults) {
    const id = String(r.id ?? "").trim();
    if (!id) continue;
    const norm = normalizeRubricStatus(r.status);
    resultMap.set(id, norm);
    resultMap.set(id.toUpperCase(), norm);
  }

  return defs.map((dim) => {
    const dimChecks = DIAGNOSTIC_CHECKS.filter((c) => dim.categories.includes(c.category));

    let totalWeight = 0;
    let passedWeight = 0;
    let failCount = 0;

    for (const check of dimChecks) {
      const st = resultMap.get(check.id) ?? resultMap.get(check.id.toUpperCase());
      if (st !== "PASS" && st !== "FAIL") continue;
      const weight = WEIGHTS[check.severity] ?? 1;
      totalWeight += weight;
      if (st === "PASS") passedWeight += weight;
      else if (st === "FAIL") failCount++;
    }

    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
    const status: DimensionStatus =
      score >= 70 ? "strong" : score >= 50 ? "fair" : score >= 30 ? "weak" : "critical";

    return {
      id: dim.id,
      label: dim.label,
      description: dim.description,
      score,
      failCount,
      totalCount: dimChecks.length,
      status,
    };
  });
}

const SEV_ORDER: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export type LeakLike = {
  category: string;
  rubricSeverity?: "Critical" | "High" | "Medium" | "Low";
  revenueImpact?: number;
  title?: string;
  revenueTitle?: string;
  businessCost?: string;
  whyItMatters?: string;
  whatWeFound?: string;
};

export function pickTopLeakForDimension(dimId: string, leaks: LeakLike[]): LeakLike | undefined {
  const dim = REVENUE_DIMENSIONS.find((d) => d.id === dimId);
  if (!dim) return undefined;
  const dimCats = dim.categories as readonly string[];
  const inDim = leaks.filter((l) => dimCats.includes(l.category));
  if (inDim.length === 0) return undefined;
  return [...inDim].sort((a, b) => {
    const sa = SEV_ORDER[a.rubricSeverity ?? ""] ?? 0;
    const sb = SEV_ORDER[b.rubricSeverity ?? ""] ?? 0;
    if (sb !== sa) return sb - sa;
    return (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0);
  })[0];
}

export function weakestDimensionScore(scores: DimensionScoreRow[]): DimensionScoreRow | undefined {
  if (!scores.length) return undefined;
  return [...scores].sort((a, b) => a.score - b.score)[0];
}

export function strongestDimensionScore(scores: DimensionScoreRow[]): DimensionScoreRow | undefined {
  if (!scores.length) return undefined;
  return [...scores].sort((a, b) => b.score - a.score)[0];
}

/** Strongest / weakest one-liner; avoids duplicate labels when all scores tie (e.g. all zero). */
export function buildDimensionSummaryLine(scores: DimensionScoreRow[]): string | null {
  if (!scores.length) return null;
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const strongest = sorted[0]!;
  const weakest = sorted[sorted.length - 1]!;
  if (strongest.id === weakest.id) {
    return "All dimensions require attention";
  }
  return `Strongest: ${strongest.label} · Weakest: ${weakest.label}`;
}

/** One line for the highest-impact finding summary card. */
export function buildBiggestRevenueLeakCopy(
  scores: DimensionScoreRow[],
  leaks: LeakLike[]
): string | null {
  const weakest = weakestDimensionScore(scores);
  if (!weakest) return null;
  const top = pickTopLeakForDimension(weakest.id, leaks);
  const base = `${weakest.label} at ${weakest.score}/100`;
  if (!top) return `${base}.`;
  const detail =
    (top.businessCost && top.businessCost.trim()) ||
    (top.whyItMatters && top.whyItMatters.trim()) ||
    (top.whatWeFound && top.whatWeFound.trim()) ||
    (top.revenueTitle && top.revenueTitle.trim()) ||
    (top.title && top.title.trim()) ||
    "";
  const clean = detail.replace(/\s+/g, " ").trim();
  if (!clean) return `${base}.`;
  const snippet = clean.length > 180 ? `${clean.slice(0, 177)}…` : clean;
  return `${base} — ${snippet}`;
}
