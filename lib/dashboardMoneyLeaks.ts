import type { ConversionKiller, Leak, ReportPayload } from "@/lib/reportSchema";

/** Max curated money leaks shown on dashboard / queue (matches report cap). */
export const DASHBOARD_MONEY_LEAKS_CAP = 8;

function conversionKillersToLeaks(killers: ConversionKiller[]): Leak[] {
  return killers.slice(0, DASHBOARD_MONEY_LEAKS_CAP).map((k, i) => {
    const effort = k.effort;
    const effortToFix: Leak["effortToFix"] =
      effort === "Today" ? "low" : effort === "This Week" ? "medium" : "high";
    return {
      id: k.id?.trim() || `ck-${i}`,
      category: (k.category ?? "General").trim() || "General",
      severity: k.severity === "critical" ? "critical" : "warning",
      title: k.title,
      revenueTitle: k.title,
      whatWeFound: k.evidence,
      whyItMatters: k.exitTrigger,
      howToFixIt: k.implementation,
      exampleFix: k.implementation,
      psychologyPrinciple: "",
      revenueImpact: k.severity === "critical" ? 9 : k.severity === "high" ? 7 : 4,
      effortToFix,
      timeToFix: effort ?? "",
      rubricSeverity:
        k.severity === "critical"
          ? "Critical"
          : k.severity === "high"
            ? "High"
            : "Medium",
      revenueEffort: effort,
      businessCost: k.conversionCost,
    };
  });
}

/**
 * Curated revenue leaks for dashboard — same source as report money leaks.
 * No fallback to legacy `leaks` / allFailedLeaks (avoids 200+ rubric rows).
 */
export function getDashboardMoneyLeaks(
  analysis: ReportPayload | null | undefined
): Leak[] {
  if (!analysis) return [];
  if (
    Array.isArray(analysis.conversionKillers) &&
    analysis.conversionKillers.length > 0
  ) {
    return conversionKillersToLeaks(analysis.conversionKillers);
  }
  const raw = analysis as unknown as Record<string, unknown>;
  const fromSnake = raw["money_leaks"];
  const tier =
    analysis.moneyLeaks ??
    (Array.isArray(fromSnake) ? (fromSnake as Leak[]) : undefined) ??
    analysis.primaryFindings ??
    (Array.isArray(raw["primary_findings"])
      ? (raw["primary_findings"] as Leak[])
      : undefined) ??
    analysis.priorityFindings ??
    null;
  if (!Array.isArray(tier) || tier.length === 0) return [];
  return tier.slice(0, DASHBOARD_MONEY_LEAKS_CAP);
}

export function displayPagePath(url: string): string {
  const s = (url ?? "").trim();
  if (!s) return "/";
  const path = s.replace(/^https?:\/\/[^/]+/i, "") || "/";
  return path.startsWith("/") ? path : `/${path}`;
}
