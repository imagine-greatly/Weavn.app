/**
 * Maps the /api/analyze response shape to ReportPayload for existing report UI components.
 */

import type {
  ReportPayload,
  SiteType,
  EffortToFix,
  DiagnosticOverviewCopy,
  DimensionScoreRow,
  ConversionTransformation,
  GrowthBlueprint,
} from "./reportSchema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAnalyzeResponse(data: any): data is AnalyzeApiResponse {
  const hero = data?.heroRewrite;
  const leaks = data?.leaks;
  const killers = data?.conversionKillers;
  const ct = data?.conversionTransformation;
  return (
    (hero != null && ("suggestedHeadline" in hero || "suggestedSubheadline" in hero)) ||
    (Array.isArray(leaks) && leaks.length > 0 && leaks[0]?.id != null) ||
    typeof data?.diagnosticBrief === "string" ||
    typeof data?.intelligenceBrief === "string" ||
    (Array.isArray(killers) && killers.length > 0) ||
    (ct != null && typeof ct === "object")
  );
}

export interface AnalyzeApiResponse {
  healthScore?: number;
  siteType?: string;
  site_type?: string;
  pagesAnalyzed?: string[];
  categoryScores?: Record<string, number>;
  topLeak?: Record<string, unknown>;
  leaks?: Array<Record<string, string | number>>;
  primaryFindings?: Array<Record<string, unknown>>;
  priorityFindings?: Array<Record<string, unknown>>;
  moneyLeaks?: Array<Record<string, unknown>>;
  quickWins?: Array<Record<string, unknown>>;
  growthRoadmap?: Array<Record<string, unknown>>;
  secondaryFindings?: Array<Record<string, unknown>>;
  opportunityFindings?: Array<Record<string, unknown>>;
  allFailedLeaks?: Array<Record<string, unknown>>;
  allFindings?: Array<Record<string, unknown>>;
  totalFailed?: number;
  totalPassed?: number;
  totalChecked?: number;
  growthScore?: number;
  criticalCount?: number;
  highCount?: number;
  hiddenFindingsCount?: number;
  hiddenCount?: number;
  overviewCopy?: Record<string, unknown> | null;
  diagnosticBrief?: string;
  /** Conversion Intelligence — primary narrative (replaces overviewCopy in new payloads). */
  intelligenceBrief?: string;
  conversionTransformation?: Record<string, unknown>;
  conversionKillers?: Array<Record<string, unknown>>;
  growthBlueprint?: Record<string, unknown>;
  conversionScore?: number;
  siteIntelligence?: string;
  heroRewrite?: Record<string, unknown>;
  growthStrategy?: Record<string, unknown>;
  executiveSummary?: Record<string, unknown>;
  summary?: string;
  domain?: string;
  partial?: boolean;
  reason?: string;
  scoreDelta?: number;
  previousScore?: number;
  previousScanAt?: string;
  shareToken?: string;
  dimensionScores?: DimensionScoreRow[];
  metadata?: ReportPayload["metadata"];
}


function toSiteType(s: string | undefined): SiteType {
  const v = (s ?? "").toLowerCase();
  if (["ecommerce", "saas", "service", "local", "content"].includes(v)) return v as SiteType;
  return "unknown";
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(Number(n))));
}

function mapConversionTransformation(
  ct: Record<string, unknown>
): ConversionTransformation {
  const alt = (key: string): string[] =>
    Array.isArray(ct[key])
      ? (ct[key] as unknown[])
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
      : [];
  return {
    currentHeadline: String(ct.currentHeadline ?? "").trim(),
    currentSubheadline: String(ct.currentSubheadline ?? "").trim(),
    currentCta: String(ct.currentCta ?? "").trim(),
    rewrittenHeadline: String(ct.rewrittenHeadline ?? "").trim(),
    rewrittenSubheadline: String(ct.rewrittenSubheadline ?? "").trim(),
    rewrittenCta: String(ct.rewrittenCta ?? "").trim(),
    rewrittenHeadlineAlternatives: alt("rewrittenHeadlineAlternatives"),
    rewrittenSubheadlineAlternatives: alt("rewrittenSubheadlineAlternatives"),
    rewrittenCtaAlternatives: alt("rewrittenCtaAlternatives"),
    trustArchitecture: String(ct.trustArchitecture ?? "").trim(),
    pageFlowNote: String(ct.pageFlowNote ?? "").trim(),
  };
}

export function mapAnalyzeToReport(data: AnalyzeApiResponse | ReportPayload): ReportPayload {
  if (!isAnalyzeResponse(data)) {
    return data as ReportPayload;
  }
  const cs = data.categoryScores ?? {};
  const top = data.topLeak ?? {};
  const leaksRaw = data.leaks ?? [];
  const mapLeaks = (arr: unknown) =>
    Array.isArray(arr)
      ? arr
          .map((l, idx) => mapLeak(l as Record<string, unknown>, { fallbackId: `leak-${idx}` }))
          .filter((l): l is NonNullable<typeof l> => l != null)
      : [];
  const hero = data.heroRewrite ?? {};
  const ct = data.conversionTransformation ?? {};
  const growth = data.growthStrategy ?? {};
  const gb = data.growthBlueprint ?? {};
  const rawExec = data.executiveSummary;

  const killerLeaks =
    Array.isArray(data.conversionKillers) && data.conversionKillers.length > 0
      ? data.conversionKillers
          .map((k, idx) =>
            mapLeak(k as Record<string, unknown>, { fallbackId: `ck-${idx}` })
          )
          .filter((l): l is NonNullable<typeof l> => l != null)
      : [];

  const legacyLeaks = leaksRaw
    .map((l, idx) => mapLeak(l, { fallbackId: `leak-${idx}` }))
    .filter((l): l is NonNullable<typeof l> => l != null);
  const leaks = legacyLeaks.length > 0 ? legacyLeaks : killerLeaks;

  let topLeak = mapLeak(top as Record<string, unknown>, { fallbackId: "top-leak" });
  if (!topLeak && leaks.length > 0) topLeak = { ...leaks[0] };

  const weekOne = Array.isArray(gb.weekOne) ? gb.weekOne.map((x) => String(x)) : [];
  const weekTwo = Array.isArray(gb.weekTwoToFour)
    ? gb.weekTwoToFour.map((x) => String(x))
    : [];

  const growthScoreRaw =
    typeof data.growthScore === "number" ? data.growthScore : undefined;
  const convScoreRaw =
    typeof data.conversionScore === "number" ? data.conversionScore : undefined;
  const healthRaw = Number(data.healthScore ?? 50);
  const healthScore = clamp(
    convScoreRaw != null
      ? convScoreRaw
      : growthScoreRaw != null
        ? growthScoreRaw
        : healthRaw
  );

  const rawDim = data.dimensionScores;
  const firstDim =
    Array.isArray(rawDim) && rawDim.length > 0
      ? (rawDim[0] as unknown as Record<string, unknown>)
      : undefined;
  const dimensionScoresMapped =
    Array.isArray(rawDim) &&
    rawDim.length > 0 &&
    typeof firstDim?.dimension === "string"
      ? mapConversionIntelligenceDimensionScores(rawDim)
      : undefined;

  const diagnosticBriefRaw =
    typeof (data as { diagnosticBrief?: string }).diagnosticBrief === "string"
      ? String((data as { diagnosticBrief: string }).diagnosticBrief).trim()
      : "";
  const intelBriefLegacy =
    typeof data.intelligenceBrief === "string" ? data.intelligenceBrief.trim() : "";
  const intelBrief = diagnosticBriefRaw || intelBriefLegacy;
  const mappedSiteIntelligence =
    typeof data.siteIntelligence === "string" &&
    data.siteIntelligence.trim().length > 0 &&
    data.siteIntelligence.trim().toLowerCase() !== "unknown"
      ? data.siteIntelligence.trim()
      : undefined;
  const overviewFromIntel =
    intelBrief.length > 0
      ? mapIntelligenceBriefToOverview(
          intelBrief,
          mappedSiteIntelligence,
          weekOne[0] ?? "",
          typeof gb.projectedLift === "string" ? gb.projectedLift : String(gb.projectedLift ?? "")
        )
      : undefined;
  const overviewMerged = mapOverviewCopy(data.overviewCopy) ?? overviewFromIntel;

  const psychNote =
    String(hero.psychologistsNote ?? "").trim() ||
    [ct.pageFlowNote, ct.trustArchitecture]
      .filter((x) => typeof x === "string" && String(x).trim())
      .join("\n\n");

  const conversionTransformationMapped = mapConversionTransformation(
    ct as Record<string, unknown>
  );

  const projectedLiftStr =
    typeof gb.projectedLift === "string"
      ? gb.projectedLift.trim()
      : String(gb.projectedLift ?? "").trim();
  const gbRecord = gb as Record<string, unknown>;
  const projectedLiftNarrativeRaw =
    typeof gbRecord.projectedLiftNarrative === "string"
      ? String(gbRecord.projectedLiftNarrative).trim()
      : "";
  const monthTwoStr = String(gb.monthTwo ?? "").trim();
  const growthBlueprintMapped: GrowthBlueprint | undefined =
    weekOne.length > 0 ||
    weekTwo.length > 0 ||
    monthTwoStr ||
    projectedLiftStr ||
    projectedLiftNarrativeRaw
      ? {
          weekOne,
          weekTwoToFour: weekTwo,
          monthTwo: monthTwoStr,
          projectedLift: projectedLiftStr,
          ...(projectedLiftNarrativeRaw
            ? { projectedLiftNarrative: projectedLiftNarrativeRaw }
            : {}),
        }
      : undefined;

  return {
    site_type: toSiteType(data.siteType),
    healthScore,
    growthScore:
      growthScoreRaw != null
        ? clamp(growthScoreRaw)
        : convScoreRaw != null
          ? clamp(convScoreRaw)
          : undefined,
    pagesAnalyzed: Array.isArray(data.pagesAnalyzed) ? data.pagesAnalyzed : [],
    categoryScores: {
      psychology: clamp(cs.psychology ?? 50),
      messaging: clamp(cs.messaging ?? 50),
      conversion: clamp(cs.conversion ?? 50),
      seo: clamp(cs.seo ?? 50),
      ux: clamp(cs.ux ?? 50),
      trust: clamp(cs.trust ?? 50),
    },
    topLeak: topLeak ?? leaks[0],
    leaks,
    heroRewrite: {
      currentHeadline: String(ct.currentHeadline ?? hero.currentHeadline ?? ""),
      currentSubheadline: String(
        ct.currentSubheadline ?? hero.currentSubheadline ?? "Not found"
      ),
      currentCta: String(ct.currentCta ?? hero.currentCta ?? "No CTA found"),
      suggestedHeadline: String(
        ct.rewrittenHeadline ?? hero.suggestedHeadline ?? hero.headline ?? ""
      ),
      suggestedSubheadline: String(
        ct.rewrittenSubheadline ?? hero.suggestedSubheadline ?? hero.subheadline ?? ""
      ),
      suggestedCta: String(ct.rewrittenCta ?? hero.suggestedCta ?? hero.cta ?? ""),
      psychologistsNote: psychNote,
    },
    growthStrategy: {
      biggestOpportunity: String(
        weekOne[0] ?? growth.biggestOpportunity ?? ""
      ),
      trafficOpportunity: String(weekTwo[0] ?? growth.trafficOpportunity ?? ""),
      conversionOpportunity: String(
        weekTwo[1] ?? growth.conversionOpportunity ?? ""
      ),
      trustOpportunity: String(weekTwo[2] ?? growth.trustOpportunity ?? ""),
      quickWins:
        weekOne.length > 0
          ? weekOne.slice(0, 5)
          : Array.isArray((growth as any).quickWins)
            ? (growth as any).quickWins.map((q: unknown) => String(q))
            : growth.quickWin != null
              ? [String((growth as any).quickWin)]
              : [],
      thirtyDayPlan: String(
        [gb.monthTwo, gb.projectedLift].filter(Boolean).join(" — ") ||
          growth.thirtyDayPlan ||
          ""
      ),
    },
    executiveSummary: rawExec
      ? {
          verdict: String(rawExec.verdict ?? ""),
          diagnosis: String(rawExec.diagnosis ?? ""),
          priorityAction: String(rawExec.priorityAction ?? ""),
          estimatedImpact: String(rawExec.estimatedImpact ?? ""),
          weekOneActions: Array.isArray(rawExec.weekOneActions)
            ? rawExec.weekOneActions.map((a: unknown) => String(a))
            : [],
        }
      : overviewMerged
        ? {
            verdict: overviewMerged.verdict,
            diagnosis: overviewMerged.diagnosis,
            priorityAction: overviewMerged.biggestOpportunity,
            estimatedImpact: overviewMerged.estimatedImpact,
            weekOneActions: weekOne.slice(0, 3),
          }
        : undefined,
    primaryFindings: data.primaryFindings
      ? mapLeaks(data.primaryFindings)
      : killerLeaks.length > 0
        ? killerLeaks
        : undefined,
    moneyLeaks: data.moneyLeaks
      ? mapLeaks(data.moneyLeaks)
      : killerLeaks.length > 0
        ? killerLeaks
        : undefined,
    quickWins: data.quickWins ? mapLeaks(data.quickWins) : undefined,
    growthRoadmap: data.growthRoadmap ? mapLeaks(data.growthRoadmap) : undefined,
    priorityFindings:
      data.priorityFindings && Array.isArray(data.priorityFindings) && data.priorityFindings.length > 0
        ? mapLeaks(data.priorityFindings)
        : data.primaryFindings &&
            Array.isArray(data.primaryFindings) &&
            data.primaryFindings.length > 0
          ? mapLeaks(data.primaryFindings)
          : undefined,
    secondaryFindings: data.secondaryFindings ? mapLeaks(data.secondaryFindings) : undefined,
    opportunityFindings: data.opportunityFindings ? mapLeaks(data.opportunityFindings) : undefined,
    allFailedLeaks: data.allFailedLeaks ? mapLeaks(data.allFailedLeaks) : undefined,
    allFindings: data.allFindings ? mapLeaks(data.allFindings) : undefined,
    totalFailed:
      typeof data.totalFailed === "number" ? data.totalFailed : undefined,
    totalPassed:
      typeof data.totalPassed === "number" ? data.totalPassed : undefined,
    totalChecked:
      typeof data.totalChecked === "number" ? data.totalChecked : undefined,
    criticalCount:
      typeof data.criticalCount === "number" ? data.criticalCount : undefined,
    highCount: typeof data.highCount === "number" ? data.highCount : undefined,
    hiddenFindingsCount:
      typeof data.hiddenFindingsCount === "number"
        ? data.hiddenFindingsCount
        : typeof data.hiddenCount === "number"
          ? data.hiddenCount
          : undefined,
    hiddenCount:
      typeof data.hiddenCount === "number"
        ? data.hiddenCount
        : typeof data.hiddenFindingsCount === "number"
          ? data.hiddenFindingsCount
          : undefined,
    scoreDelta:
      typeof data.scoreDelta === "number" ? data.scoreDelta : undefined,
    previousScore:
      typeof data.previousScore === "number" ? data.previousScore : undefined,
    previousScanAt:
      typeof data.previousScanAt === "string" ? data.previousScanAt : undefined,
    shareToken:
      typeof (data as { shareToken?: string }).shareToken === "string"
        ? (data as { shareToken: string }).shareToken
        : undefined,
    diagnosticBrief:
      diagnosticBriefRaw.length > 0 ? diagnosticBriefRaw : undefined,
    intelligenceBrief: intelBrief.length > 0 ? intelBrief : undefined,
    siteIntelligence: mappedSiteIntelligence,
    overviewCopy: overviewMerged,
    conversionTransformation: conversionTransformationMapped,
    growthBlueprint: growthBlueprintMapped,
    dimensionScores:
      dimensionScoresMapped ??
      (Array.isArray(rawDim) && rawDim.length > 0
        ? (rawDim as DimensionScoreRow[])
        : undefined),
    metadata:
      data.metadata != null && typeof data.metadata === "object"
        ? (data.metadata as ReportPayload["metadata"])
        : undefined,
  };
}

function mapOverviewCopy(
  raw: unknown
): DiagnosticOverviewCopy | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const verdict = typeof o.verdict === "string" ? o.verdict.trim() : "";
  const diagnosis = typeof o.diagnosis === "string" ? o.diagnosis.trim() : "";
  if (!verdict && !diagnosis) return undefined;
  return {
    verdict: verdict || "Diagnostic overview",
    diagnosis,
    heroHeadlineNote: String(o.heroHeadlineNote ?? ""),
    biggestOpportunity: String(o.biggestOpportunity ?? ""),
    estimatedImpact: String(o.estimatedImpact ?? ""),
  };
}

function mapIntelligenceBriefToOverview(
  brief: string,
  siteIntelligence: string | undefined,
  biggestOpportunity: string,
  estimatedImpact: string
): DiagnosticOverviewCopy {
  const b = brief.trim();
  const firstSentence =
    b.split(/(?<=[.!?])\s+/)[0]?.trim() || b.slice(0, 160).trim() || "Conversion intelligence";
  return {
    verdict: firstSentence,
    diagnosis: b,
    heroHeadlineNote: siteIntelligence?.trim() ?? "",
    biggestOpportunity: biggestOpportunity.trim(),
    estimatedImpact: estimatedImpact.trim(),
  };
}

function mapConversionIntelligenceDimensionScores(
  raw: unknown
): DimensionScoreRow[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((row, i) => {
    const r = row as Record<string, unknown>;
    const label = String(r.dimension ?? r.label ?? `dimension-${i}`);
    const score = clamp(Number(r.score ?? 0));
    const insight = String(r.insight ?? "");
    const status: DimensionScoreRow["status"] =
      score >= 80 ? "strong" : score >= 60 ? "fair" : score >= 40 ? "weak" : "critical";
    return {
      id: `ci-${i}`,
      label,
      description: insight,
      score,
      failCount: 0,
      totalCount: 1,
      status,
    };
  });
}

function mapEffortToFix(v: unknown): EffortToFix {
  if (v === "low" || v === "medium" || v === "high") return v;
  return "medium";
}

function mapLeak(
  input: Record<string, unknown>,
  opts: { fallbackId: string }
): ReportPayload["leaks"][number] | undefined {
  if (!input || Object.keys(input).length === 0) return undefined;

  const sevStr = String(input.severity ?? "").toLowerCase();
  const mappedSeverity: "critical" | "warning" | "passing" =
    sevStr === "critical"
      ? "critical"
      : sevStr === "passing"
        ? "passing"
        : sevStr === "warning" ||
            sevStr === "high" ||
            sevStr === "medium"
          ? "warning"
          : "warning";

  const revenueImpactRaw = (input as any).revenueImpact;
  const impactScoreRaw = (input as any).impactScore;
  let revenueImpact =
    typeof revenueImpactRaw === "number"
      ? revenueImpactRaw
      : typeof impactScoreRaw === "number"
        ? impactScoreRaw
        : 0;
  if (!revenueImpact) {
    if (sevStr === "critical") revenueImpact = 9;
    else if (sevStr === "high") revenueImpact = 7;
    else if (sevStr === "medium") revenueImpact = 4;
  }

  const exampleFix =
    (input as any).exampleFix ??
    (input as any).implementation ??
    (input as any).aiFix ??
    (input as any).recommendation ??
    "";

  const whatWeFound =
    (input as any).whatWeFound ??
    (input as any).evidence ??
    (input as any).description ??
    "";

  const exitStr =
    typeof (input as any).exitTrigger === "string"
      ? String((input as any).exitTrigger).trim()
      : "";
  const costStr =
    typeof (input as any).conversionCost === "string"
      ? String((input as any).conversionCost).trim()
      : "";
  const whyExplicit =
    typeof (input as any).whyItMatters === "string"
      ? String((input as any).whyItMatters).trim()
      : "";
  const evidenceStr = String((input as any).evidence ?? "").trim();
  const whatTrim = String(whatWeFound).trim();
  const whyItMatters =
    whyExplicit ||
    costStr ||
    (exitStr && exitStr !== whatTrim && exitStr !== evidenceStr ? exitStr : "") ||
    "";

  const howToFixIt =
    (input as any).howToFixIt ??
    (input as any).implementation ??
    (input as any).recommendation ??
    "";

  const impactStatementRaw = (input as any).impactStatement;
  const impactStatement =
    impactStatementRaw != null && String(impactStatementRaw).trim().length > 0
      ? String(impactStatementRaw).trim()
      : costStr || (exitStr && exitStr !== whatTrim ? exitStr : undefined) || undefined;

  const id = String((input as any).id ?? opts.fallbackId);
  const idUpper = id.trim().toUpperCase();
  const typeMissing =
    (input as any).type === "missing" || idUpper.startsWith("MSN-");
  const pageLoc = (input as any).page_location;
  const page_location =
    pageLoc != null && String(pageLoc).length > 0
      ? String(pageLoc)
      : undefined;

  const rs = (input as any).rubricSeverity;
  const rm = (input as any).rubricMode;
  const rubricSeverity =
    rs === "Critical" || rs === "High" || rs === "Medium" || rs === "Low"
      ? rs
      : undefined;
  const rubricMode = rm === "FLAW" || rm === "GAP" ? rm : undefined;

  const revenueTitleRaw =
    (input as any).revenueTitle ?? (input as any).title;
  const rubricCheckTitleRaw = (input as any).rubricCheckTitle;
  const businessCostRaw =
    (input as any).businessCost ?? (input as any).conversionCost;
  const evidenceRaw = (input as any).evidence;
  const revEff = (input as any).revenueEffort ?? (input as any).effort;
  const revenueEffort =
    revEff === "Today" || revEff === "This Week" || revEff === "This Month"
      ? revEff
      : undefined;

  // If the AI returned a legacy payload, these fields might still be missing — we still map defensively.
  return {
    id,
    category: String((input as any).category ?? "general"),
    severity: mappedSeverity,
    type: typeMissing ? "missing" : "existing",
    title: String(
      (typeof (input as any).title === "string" && (input as any).title.trim()
        ? (input as any).title
        : revenueTitleRaw) ?? ""
    ),
    ...(typeof revenueTitleRaw === "string" && revenueTitleRaw.trim()
      ? { revenueTitle: revenueTitleRaw.trim() }
      : {}),
    ...(typeof rubricCheckTitleRaw === "string" && rubricCheckTitleRaw.trim()
      ? { rubricCheckTitle: rubricCheckTitleRaw.trim() }
      : {}),
    ...(typeof evidenceRaw === "string" && evidenceRaw.trim() ? { evidence: evidenceRaw.trim() } : {}),
    ...(typeof businessCostRaw === "string" && businessCostRaw.trim()
      ? { businessCost: businessCostRaw.trim() }
      : {}),
    ...(revenueEffort ? { revenueEffort } : {}),
    whatWeFound: String(whatWeFound),
    whyItMatters: String(whyItMatters),
    howToFixIt: String(howToFixIt),
    ...(impactStatement ? { impactStatement } : {}),
    exampleFix: String(exampleFix),
    psychologyPrinciple: String((input as any).psychologyPrinciple ?? ""),
    revenueImpact,
    effortToFix: mapEffortToFix((input as any).effortToFix),
    timeToFix: String((input as any).timeToFix ?? "1 hour"),
    page_location,
    ...(rubricSeverity ? { rubricSeverity } : {}),
    ...(rubricMode ? { rubricMode } : {}),
  };
}
