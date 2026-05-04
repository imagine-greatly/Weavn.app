import type { FindingData } from "@/components/FindingCard";
import type { Leak } from "@/lib/reportSchema";

function normalizeLeakCategoryId(category: string): string {
  const c = (category ?? "").toUpperCase();
  if (c.includes("PSYCHOLOGY")) return "psychology";
  if (c.includes("CONVERSION")) return "conversion";
  if (c.includes("TRUST")) return "trust";
  if (c.includes("SEO")) return "seo";
  if (c.includes("UX")) return "ux";
  if (c.includes("MESSAGING")) return "psychology";
  return "psychology";
}

function normalizeLeakCategoryName(category: string): string {
  const id = normalizeLeakCategoryId(category);
  if (id === "psychology") return "CONVERSION IMPACT";
  return id.toUpperCase();
}

/** Maps stored `Leak` rows to `FindingData` for dashboard / shared previews. */
export function convertLeaksToFindingData(leaks: Leak[]): FindingData[] {
  if (!Array.isArray(leaks)) return [];
  return leaks.map((leak, i) => {
    const rawTitle = leak?.title ?? "";
    const revenueTitle = leak?.revenueTitle?.trim() || rawTitle;
    const title = revenueTitle;
    const leakId = leak?.id;
    const sev = leak?.severity;
    const severity =
      sev === "critical" || sev === "warning" || sev === "passing" ? sev : "warning";
    const eff = leak?.effortToFix;
    const effortToFix =
      eff === "low" || eff === "medium" || eff === "high" ? eff : "medium";
    const evidence = leak?.evidence?.trim() || leak?.whatWeFound || "";
    const businessCost = leak?.businessCost?.trim() || leak?.whyItMatters || "";
    const catRaw = (leak?.category ?? "").trim();
    return {
      id:
        leakId ??
        `leak-${i}-${rawTitle.slice(0, 20).replace(/\s+/g, "-")}`,
      categoryId: normalizeLeakCategoryId(catRaw),
      categoryName: catRaw || normalizeLeakCategoryName(catRaw),
      severity,
      type:
        leak?.type === "missing" ||
        (typeof leakId === "string" && leakId.trim().toUpperCase().startsWith("MSN-"))
          ? "missing"
          : "existing",
      page_location: leak?.page_location,
      title,
      revenueTitle,
      rubricCheckTitle: leak?.rubricCheckTitle ?? rawTitle,
      businessCost,
      whatWeFound: evidence,
      whyItMatters: businessCost,
      howToFixIt: leak?.howToFixIt ?? "",
      impactStatement: leak?.impactStatement,
      exampleFix: leak?.exampleFix ?? "",
      psychologyPrinciple: leak?.psychologyPrinciple ?? "",
      revenueImpact: leak?.revenueImpact ?? 0,
      effortToFix,
      timeToFix: leak?.timeToFix ?? "",
      rubricSeverity: leak?.rubricSeverity,
      rubricMode: leak?.rubricMode,
      revenueEffort: leak?.revenueEffort,
      ...(catRaw ? { category: catRaw } : {}),
    } as FindingData & { category?: string };
  });
}
