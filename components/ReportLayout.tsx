"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReportLeftPanel, {
  type CategoryScore,
  type ReportNavSectionId,
} from "@/components/ReportLeftPanel";
import ReportRightPanel from "@/components/ReportRightPanel";
import type { ConversionKiller, Leak, ReportPayload } from "@/lib/reportSchema";
import type { FindingData } from "@/components/FindingCard";
import type { HeroRewriteData } from "@/components/HeroRewriteModule";
import type { GrowthStrategyData } from "@/components/GrowthStrategyModule";
import { stripMarkdownForDisplay } from "@/lib/stripMarkdownForDisplay";

/**
 * Report page layout — two panels, no page scroll. Left: mission control; right: content.
 * DESIGN_SYSTEM.md.
 */

const DEFAULT_CATEGORIES: CategoryScore[] = [
  { id: "psychology", name: "CONVERSION IMPACT", score: 49 },
  { id: "trust", name: "TRUST", score: 74 },
  { id: "conversion", name: "CONVERSION", score: 58 },
  { id: "seo", name: "SEO", score: 82 },
  { id: "ux", name: "UX", score: 66 },
];

/** Navigate tabs: OVERVIEW + CONVERSION IMPACT | TRUST | CONVERSION | SEO | UX (no separate MESSAGING). */
const CATEGORY_ORDER = ["psychology", "trust", "conversion", "seo", "ux"] as const;

const CATEGORY_TAB_LABEL: Record<(typeof CATEGORY_ORDER)[number], string> = {
  psychology: "CONVERSION IMPACT",
  trust: "TRUST",
  conversion: "CONVERSION",
  seo: "SEO",
  ux: "UX",
};

const EMPTY_CATEGORY_SCORES: CategoryScore[] = CATEGORY_ORDER.map((id) => ({
  id,
  name: CATEGORY_TAB_LABEL[id],
  score: 50,
}));

const CI_DIMENSION_LABELS = [
  "Conversion Architecture",
  "Trust Signals",
  "Message Clarity",
  "Traffic Readiness",
  "Technical Foundation",
] as const;

function payloadToCiDimensionBars(
  payload: ReportPayload | null | undefined
): { label: string; score: number }[] {
  const labels = [...CI_DIMENSION_LABELS];
  const rows = payload?.dimensionScores;
  if (Array.isArray(rows) && rows.length > 0) {
    return labels.map((canonical, i) => {
      const fromIndex = rows[i] as { label?: string; score?: number } | undefined;
      const fromLabel = rows.find((r) => {
        const lb = String((r as { label?: string }).label ?? "").toLowerCase();
        return (
          lb.includes(canonical.slice(0, 8).toLowerCase()) ||
          canonical.toLowerCase().includes(lb.slice(0, 6))
        );
      }) as { score?: number } | undefined;
      const sc = Number(fromLabel?.score ?? fromIndex?.score ?? NaN);
      return {
        label: canonical,
        score: Number.isFinite(sc) ? Math.round(sc) : 50,
      };
    });
  }
  const cs = payload?.categoryScores;
  if (cs) {
    return [
      {
        label: labels[0],
        score: Math.round(((cs.conversion ?? 50) + (cs.psychology ?? 50)) / 2),
      },
      { label: labels[1], score: Math.round(cs.trust ?? 50) },
      {
        label: labels[2],
        score: Math.round(((cs.messaging ?? 50) + (cs.psychology ?? 50)) / 2),
      },
      { label: labels[3], score: Math.round(cs.seo ?? 50) },
      {
        label: labels[4],
        score: Math.round(((cs.ux ?? 50) + (cs.seo ?? 50)) / 2),
      },
    ];
  }
  return labels.map((label) => ({ label, score: 50 }));
}

function payloadToCategories(
  payload: ReportPayload | null | undefined
): CategoryScore[] {
  if (payload == null) return EMPTY_CATEGORY_SCORES;
  const cs = payload?.categoryScores;
  if (cs == null) return EMPTY_CATEGORY_SCORES;
  return CATEGORY_ORDER.map((id) => ({
    id,
    name: CATEGORY_TAB_LABEL[id],
    score: cs[id] ?? 50,
  }));
}

function buildDynamicThirtyDayPlanLines(
  moneyLeaks: FindingData[],
  growthRoadmap: FindingData[]
): string[] | null {
  const titleOf = (f: FindingData) =>
    stripMarkdownForDisplay((f.revenueTitle?.trim() || f.title || "").trim());
  const w1 = moneyLeaks
    .filter((f) => f.severity === "critical")
    .map(titleOf)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const highRubric = moneyLeaks.filter((f) => f.rubricSeverity === "High");
  const w2Source =
    highRubric.length > 0
      ? highRubric
      : moneyLeaks.filter((f) => f.severity === "warning");
  const w2 = w2Source
    .map(titleOf)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const w3 = growthRoadmap
    .slice(0, 3)
    .map(titleOf)
    .filter(Boolean)
    .join(", ");
  if (!w1 && !w2 && !w3) return null;
  const lines: string[] = [];
  if (w1) lines.push(`WEEK 1 — Critical: ${w1}`);
  if (w2) lines.push(`WEEK 2 — High Impact: ${w2}`);
  if (w3) lines.push(`WEEK 3 — Growth: ${w3}`);
  lines.push("WEEK 4 — Rescan and measure improvement");
  return lines;
}

function leaksToFindingData(leaks: Leak[]): FindingData[] {
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
    return {
      id:
        leakId ??
        `leak-${i}-${rawTitle.slice(0, 20).replace(/\s+/g, "-")}`,
      categoryId: normalizeLeakCategoryId(leak?.category ?? ""),
      categoryName:
        (leak?.category ?? "").trim() ||
        normalizeLeakCategoryName(leak?.category ?? ""),
      severity,
      type:
        leak?.type === "missing" ||
        (typeof leakId === "string" && leakId.trim().toUpperCase().startsWith("MSN-"))
          ? "missing"
          : "existing",
      page_location: leak?.page_location,
      title,
      revenueTitle: revenueTitle,
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
    };
  });
}

function payloadToFindings(payload: ReportPayload | null | undefined): FindingData[] {
  if (payload == null) return [];
  const primary =
    payload.moneyLeaks && payload.moneyLeaks.length > 0
      ? payload.moneyLeaks
      : payload.priorityFindings && payload.priorityFindings.length > 0
        ? payload.priorityFindings
        : payload.primaryFindings && payload.primaryFindings.length > 0
          ? payload.primaryFindings
          : payload.leaks;
  return leaksToFindingData(primary ?? []);
}

function payloadToQuickWins(payload: ReportPayload | null | undefined): FindingData[] {
  if (payload == null) return [];
  if (payload.quickWins && payload.quickWins.length > 0) {
    return leaksToFindingData(payload.quickWins);
  }
  return [];
}

function payloadToGrowthRoadmap(payload: ReportPayload | null | undefined): FindingData[] {
  if (payload == null) return [];
  if (payload.growthRoadmap && payload.growthRoadmap.length > 0) {
    return leaksToFindingData(payload.growthRoadmap);
  }
  if (payload.secondaryFindings && payload.secondaryFindings.length > 0) {
    return leaksToFindingData(payload.secondaryFindings);
  }
  return [];
}

const EMPTY_HERO_REWRITE_DATA: HeroRewriteData = {
  current: { headline: "", subheadline: "", cta: "" },
  suggested: { headline: "", subheadline: "", cta: "" },
  psychologistNote: "",
};

function payloadToHeroRewrite(
  payload: ReportPayload | null | undefined
): HeroRewriteData {
  if (payload == null) return EMPTY_HERO_REWRITE_DATA;
  const ct = payload.conversionTransformation;
  if (ct) {
    return {
      current: {
        headline: ct.currentHeadline ?? "",
        subheadline: ct.currentSubheadline ?? "",
        cta: ct.currentCta ?? "",
      },
      suggested: {
        headline: ct.rewrittenHeadline ?? "",
        subheadline: ct.rewrittenSubheadline ?? "",
        cta: ct.rewrittenCta ?? "",
      },
      psychologistNote: [ct.pageFlowNote, ct.trustArchitecture]
        .filter((s) => typeof s === "string" && s.trim())
        .join("\n\n"),
    };
  }
  const h = payload?.heroRewrite;
  if (h == null) return EMPTY_HERO_REWRITE_DATA;
  return {
    current: {
      headline: h?.currentHeadline ?? "",
      subheadline: h?.currentSubheadline ?? "",
      cta: h?.currentCta ?? "",
    },
    suggested: {
      headline: h?.suggestedHeadline ?? "",
      subheadline: h?.suggestedSubheadline ?? "",
      cta: h?.suggestedCta ?? "",
    },
    psychologistNote: h?.psychologistsNote ?? "",
  };
}

const EMPTY_GROWTH_STRATEGY_DATA: GrowthStrategyData = {
  biggestOpportunity: "",
  trafficOpportunity: "",
  conversionOpportunity: "",
  trustOpportunity: "",
  quickWins: [],
  thirtyDayPlan: "",
};

function payloadToGrowthStrategy(
  payload: ReportPayload | null | undefined
): GrowthStrategyData {
  if (payload == null) return EMPTY_GROWTH_STRATEGY_DATA;
  const g = payload?.growthStrategy;
  if (g == null) return EMPTY_GROWTH_STRATEGY_DATA;
  const qw = g?.quickWins;
  return {
    biggestOpportunity: g?.biggestOpportunity ?? "",
    trafficOpportunity: g?.trafficOpportunity ?? "",
    conversionOpportunity: g?.conversionOpportunity ?? "",
    trustOpportunity: g?.trustOpportunity ?? "",
    quickWins: Array.isArray(qw) ? qw : [],
    thirtyDayPlan: g?.thirtyDayPlan ?? "",
  };
}

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

function displaySiteIntelligenceLine(
  explicit: string | null | undefined,
  payload: ReportPayload | undefined,
  siteTypeProp: string | undefined
): string | undefined {
  const t = explicit?.trim();
  if (t) return t;
  const raw =
    (payload as { siteType?: string } | undefined)?.siteType ??
    payload?.site_type ??
    siteTypeProp;
  if (!raw) return undefined;
  return String(raw)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function conversionKillersToFindingData(killers: ConversionKiller[]): FindingData[] {
  return killers.map((k, i) => ({
    id: k.id?.trim() || `ck-${i}`,
    categoryId: normalizeLeakCategoryId(k.category ?? ""),
    categoryName: (k.category ?? "General").trim() || "General",
    severity: k.severity === "critical" ? "critical" : "warning",
    type: "existing",
    title: k.title,
    revenueTitle: k.title,
    whatWeFound: k.evidence,
    exitTrigger: k.exitTrigger,
    whyItMatters: k.exitTrigger,
    businessCost: k.conversionCost,
    howToFixIt: k.implementation,
    exampleFix: k.implementation,
    psychologyPrinciple: "",
    revenueImpact: k.severity === "critical" ? 9 : k.severity === "high" ? 7 : 4,
    effortToFix:
      k.effort === "Today" ? "low" : k.effort === "This Week" ? "medium" : "high",
    timeToFix: k.effort,
    rubricSeverity:
      k.severity === "critical"
        ? "Critical"
        : k.severity === "high"
          ? "High"
          : "Medium",
    revenueEffort: k.effort,
  }));
}

export type ReportLayoutProps = {
  domain: string;
  /** When provided, score/categories/counts/findings/heroRewrite are derived from API. */
  payload?: ReportPayload;
  score?: number;
  criticalCount?: number;
  warningCount?: number;
  passingCount?: number;
  categories?: CategoryScore[];
  sharedView?: boolean;
  isPro?: boolean;
  siteType?: string;
  onRescan?: () => void;
  /** Use height 100% inside a flex parent (e.g. shared report + top banner). */
  fillContainer?: boolean;
  /** Shared/public view: hide rescan + live chip in the left panel. */
  readOnlyLeftPanel?: boolean;
  /** Stored on report row — used to copy `/share/{token}` link. */
  shareToken?: string | null;
  issueReportId?: string | null;
};

export default function ReportLayout({
  domain,
  payload,
  score: scoreProp,
  criticalCount: criticalCountProp,
  warningCount: warningCountProp,
  passingCount: passingCountProp,
  categories: categoriesProp,
  sharedView = false,
  isPro = false,
  siteType,
  onRescan,
  fillContainer = false,
  readOnlyLeftPanel = false,
  shareToken = null,
  issueReportId = null,
}: ReportLayoutProps) {
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const {
    score,
    criticalCount,
    warningCount,
    passingCount,
    highCount,
    categories,
    findings,
    moneyLeaks,
    quickWins,
    growthRoadmap,
    heroRewriteData,
    growthStrategyData,
    overviewCopy,
    diagnosticStats,
    hiddenFindingsCount,
    computedThirtyDayPlanLines,
    growthBlueprint,
    intelligenceBrief,
    siteIntelligence,
    dimensionBars,
  } = useMemo(() => {
    if (payload) {
      const leaksForCounts =
        payload.allFindings && payload.allFindings.length > 0
          ? payload.allFindings
          : payload.allFailedLeaks && payload.allFailedLeaks.length > 0
            ? payload.allFailedLeaks
            : payload.leaks ?? [];
      const categoriesFromPayload = payloadToCategories(payload);
      const criticalCount = leaksForCounts.filter((l) => l?.severity === "critical").length;
      const warningCount = leaksForCounts.filter((l) => l?.severity === "warning").length;
      const rubric = payload.metadata?.rubric;
      const totalChecked =
        rubric?.totalChecks ?? rubric?.totalChecked ?? payload.totalChecked ?? 166;
      const totalFailed = rubric?.totalFails ?? payload.totalFailed ?? leaksForCounts.length;
      const totalPassed =
        typeof payload.totalPassed === "number"
          ? payload.totalPassed
          : typeof rubric?.totalPassed === "number"
            ? rubric.totalPassed
            : Math.max(0, totalChecked - totalFailed);
      const passingCount = Math.min(166, Math.max(0, Math.round(totalPassed)));
      const highCountResolved =
        typeof payload.highCount === "number"
          ? payload.highCount
          : leaksForCounts.filter(
              (l) =>
                (l as { rubricSeverity?: string }).rubricSeverity === "High"
            ).length;
      const mlFromTiers = payloadToFindings(payload);
      const ml =
        Array.isArray(payload.conversionKillers) && payload.conversionKillers.length > 0
          ? conversionKillersToFindingData(payload.conversionKillers)
          : mlFromTiers;
      const qw = payloadToQuickWins(payload);
      const gr = payloadToGrowthRoadmap(payload);
      const computedThirtyDayPlanLines =
        ml.length > 0 || gr.length > 0
          ? buildDynamicThirtyDayPlanLines(ml, gr)
          : null;
      const dimensionBarsVal = payloadToCiDimensionBars(payload);
      return {
        score:
          (typeof payload.conversionScore === "number"
            ? payload.conversionScore
            : null) ??
          payload.growthScore ??
          payload.healthScore ??
          62,
        criticalCount,
        warningCount,
        passingCount,
        highCount: highCountResolved,
        categories: categoriesFromPayload,
        findings: ml,
        moneyLeaks: ml,
        quickWins: qw,
        growthRoadmap: gr,
        secondaryFindings: leaksToFindingData(payload.secondaryFindings ?? []),
        opportunityFindings: leaksToFindingData(payload.opportunityFindings ?? []),
        heroRewriteData: payloadToHeroRewrite(payload),
        growthStrategyData: payloadToGrowthStrategy(payload),
        overviewCopy: payload.overviewCopy ?? null,
        diagnosticStats: {
          totalChecked,
          totalFailed,
          totalPassed,
          criticalCount:
            typeof payload.criticalCount === "number"
              ? payload.criticalCount
              : rubric?.criticalCount ?? criticalCount,
        },
        hiddenFindingsCount:
          typeof payload.hiddenCount === "number"
            ? payload.hiddenCount
            : typeof payload.hiddenFindingsCount === "number"
              ? payload.hiddenFindingsCount
              : Math.max(0, (payload.leaks?.length ?? 0) - 3),
        computedThirtyDayPlanLines,
        growthBlueprint: payload.growthBlueprint ?? null,
        intelligenceBrief:
          payload.diagnosticBrief?.trim() ||
          payload.intelligenceBrief?.trim() ||
          null,
        siteIntelligence: payload.siteIntelligence?.trim() || null,
        dimensionBars: dimensionBarsVal,
      };
    }
    return {
      score: scoreProp ?? 62,
      criticalCount: criticalCountProp ?? 3,
      warningCount: warningCountProp ?? 7,
      passingCount: passingCountProp ?? 35,
      highCount: 0,
      categories: categoriesProp ?? DEFAULT_CATEGORIES,
      findings: undefined,
      moneyLeaks: undefined,
      quickWins: [],
      growthRoadmap: [],
      heroRewriteData: undefined,
      growthStrategyData: undefined,
      overviewCopy: null,
      diagnosticStats: null,
      hiddenFindingsCount: 0,
      computedThirtyDayPlanLines: undefined,
      growthBlueprint: null,
      intelligenceBrief: null,
      siteIntelligence: null,
      dimensionBars: payloadToCiDimensionBars(null),
    };
  }, [payload, scoreProp, criticalCountProp, warningCountProp, passingCountProp, categoriesProp]);

  const categoryFindingCounts = useMemo(() => {
    const base = {
      psychology: { critical: 0, warning: 0, passing: 0 },
      conversion: { critical: 0, warning: 0, passing: 0 },
      seo: { critical: 0, warning: 0, passing: 0 },
      ux: { critical: 0, warning: 0, passing: 0 },
      trust: { critical: 0, warning: 0, passing: 0 },
    };
    if (!payload) return base;
    const leaks =
      payload.allFindings && payload.allFindings.length > 0
        ? payload.allFindings
        : payload.allFailedLeaks && payload.allFailedLeaks.length > 0
          ? payload.allFailedLeaks
          : payload.leaks ?? [];
    for (const leak of leaks) {
      const id = normalizeLeakCategoryId(leak?.category ?? "");
      if (!base[id as keyof typeof base]) continue;
      const sev = leak?.severity;
      if (sev !== "critical" && sev !== "warning" && sev !== "passing") continue;
      base[id as keyof typeof base][sev] += 1;
    }
    return base;
  }, [payload]);

  const [activeCategoryId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warnings" | "passing">("all");
  const [activeNavSection, setActiveNavSection] = useState<ReportNavSectionId>("brief");

  const scrollToSection = useCallback((id: ReportNavSectionId) => {
    setActiveNavSection(id);
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div
      className="report-page-layout flex overflow-hidden"
      style={{
        height: fillContainer ? "100%" : "calc(100svh - 4rem)",
        flex: fillContainer ? 1 : undefined,
        minHeight: 0,
        minWidth: 0,
        position: "relative",
      }}
    >
      <style>{`
        .report-layout-left-wrap > aside {
          background: rgba(7, 12, 20, 0.85) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>

      {/* Ambient cyan spotlight — top left */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          left: "-5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,200,255,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* Ambient cyan spotlight — bottom right */}
      <div
        style={{
          position: "fixed",
          bottom: "-10%",
          right: "-5%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,200,255,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "neuralDrift 20s ease-in-out infinite reverse",
        }}
        aria-hidden
      />

      {/* Top edge glow line */}
      <div
        style={{
          position: "fixed",
          top: "4rem",
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.15) 30%, rgba(0,200,255,0.3) 50%, rgba(0,200,255,0.15) 70%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
        aria-hidden
      />

      {/* Corner brackets */}
      <div
        style={{
          position: "fixed",
          top: "4rem",
          left: 0,
          width: 20,
          height: 20,
          borderTop: "1px solid rgba(0,200,255,0.2)",
          borderLeft: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 3,
        }}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: "4rem",
          right: 0,
          width: 20,
          height: 20,
          borderTop: "1px solid rgba(0,200,255,0.2)",
          borderRight: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 3,
        }}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: 20,
          height: 20,
          borderBottom: "1px solid rgba(0,200,255,0.2)",
          borderLeft: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 3,
        }}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: 20,
          height: 20,
          borderBottom: "1px solid rgba(0,200,255,0.2)",
          borderRight: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 3,
        }}
        aria-hidden
      />

      <div className="report-layout-left-wrap" style={{ position: "relative", zIndex: 2 }}>
        <ReportLeftPanel
          domain={domain}
          onRescan={readOnlyLeftPanel ? undefined : onRescan}
          readOnlyLeftPanel={readOnlyLeftPanel}
          score={score}
          criticalCount={criticalCount}
          highCount={highCount}
          moneyLeaksCount={moneyLeaks?.length ?? 0}
          warningCount={warningCount}
          passingCount={passingCount}
          categories={categories}
          categoryFindingCounts={categoryFindingCounts}
          activeCategoryId={activeCategoryId}
          severityFilter={severityFilter}
          onSeverityFilter={setSeverityFilter}
          dimensionBars={dimensionBars}
          exitTriggersCount={moneyLeaks?.length ?? 0}
          activeNavSection={activeNavSection}
          onNavSectionChange={scrollToSection}
          siteType={
            (payload as { siteType?: string } | undefined)?.siteType ??
            payload?.site_type ??
            siteType
          }
          scoreDelta={payload?.scoreDelta}
          previousScanAt={payload?.previousScanAt}
        />
      </div>

      <div
        className="report-right-shell"
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <ReportRightPanel
          severityFilter={severityFilter}
          sectionRefs={sectionRefs}
          scrollContainerRef={rightPanelRef}
          sharedView={sharedView}
          domain={domain}
          shareToken={shareToken ?? undefined}
          activeCategoryId={activeCategoryId}
          findings={findings}
          moneyLeaks={moneyLeaks}
          quickWins={quickWins}
          growthRoadmap={growthRoadmap}
          heroRewriteData={heroRewriteData}
          growthStrategyData={growthStrategyData}
          executiveSummary={payload?.executiveSummary}
          overviewCopy={overviewCopy ?? undefined}
          diagnosticStats={diagnosticStats ?? undefined}
          hiddenFindingsCount={hiddenFindingsCount}
          isPro={isPro}
          computedThirtyDayPlanLines={computedThirtyDayPlanLines}
          intelligenceBrief={intelligenceBrief ?? undefined}
          siteIntelligence={displaySiteIntelligenceLine(
            siteIntelligence,
            payload,
            siteType
          )}
          growthBlueprint={growthBlueprint ?? undefined}
          conversionTransformation={payload?.conversionTransformation}
          issueReportId={issueReportId}
        />
      </div>
    </div>
  );
}
