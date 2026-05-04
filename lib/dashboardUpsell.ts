import type { ReportPayload } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";

export type FreeTierUpsellSummary = {
  domain: string;
  revenueScore: number;
  leaksShown: number;
  leaksTotal: number;
  criticalIssues: number;
};

const FREE_LEAKS_SHOWN = 3;
/** Free tier surfaces three leaks; product cap communicated in upsell. */
const FREE_LEAKS_TOTAL = 8;

/** Fallback blurred-card titles when report has fewer than 5 locked leaks. */
export const UPSELL_FALLBACK_LOCKED_TITLES = [
  "No email capture — 97% of visitors permanently lost",
  "Purchase guarantee absent — trust barrier preventing first-time buyers",
  "Anonymous testimonials provide no credible social proof",
  "Shipping cost hidden until checkout — primary cart abandonment cause",
  "No subscription option — zero repeat revenue mechanism",
] as const;

function leakHeadline(l: { revenueTitle?: string; title: string }): string {
  return (l.revenueTitle?.trim() || l.title || "").trim();
}

/**
 * Up to 5 titles for locked upsell cards: real locked money leaks first, then roadmap, then fallbacks.
 */
export function buildUpsellLockedTitles(analysis: ReportPayload | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  if (analysis) {
    const money = getDashboardMoneyLeaks(analysis);
    for (let i = FREE_LEAKS_SHOWN; i < money.length && out.length < 5; i++) {
      push(leakHeadline(money[i]!));
    }
    const road = analysis.growthRoadmap ?? [];
    for (const l of road) {
      if (out.length >= 5) break;
      push(leakHeadline(l));
    }
  }

  for (const f of UPSELL_FALLBACK_LOCKED_TITLES) {
    if (out.length >= 5) break;
    push(f);
  }

  return out.slice(0, 5);
}

export function buildFreeTierUpsellSummary(
  domain: string,
  analysis: ReportPayload | undefined
): FreeTierUpsellSummary | null {
  if (!analysis || !domain.trim()) return null;
  const score = analysis.growthScore ?? analysis.healthScore ?? 0;
  const leaksTotal = FREE_LEAKS_TOTAL;
  const rubricMeta = analysis.metadata?.rubric;
  const allFailed = analysis.allFailedLeaks ?? [];
  const criticalIssues =
    rubricMeta?.criticalCount ??
    allFailed.filter((l) => l.rubricSeverity === "Critical").length;

  return {
    domain: domain.trim(),
    revenueScore: Math.round(Number.isFinite(score) ? score : 0),
    leaksShown: FREE_LEAKS_SHOWN,
    leaksTotal,
    criticalIssues,
  };
}
