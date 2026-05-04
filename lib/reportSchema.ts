/**
 * Report schema returned by Claude and stored in Supabase.
 * Matches the exact JSON schema from the conversion psychologist system prompt.
 * site_type is set before analysis (detected from homepage signals).
 */

import type { DimensionScoreRow } from "./revenueDimensions";

export type { DimensionScoreRow } from "./revenueDimensions";

export type SiteType =
  | "ecommerce"
  | "saas"
  | "service"
  | "local"
  | "content"
  | "unknown";

export type LeakSeverity = "critical" | "warning" | "passing";

export type EffortToFix = "low" | "medium" | "high";

export interface CategoryScores {
  psychology: number;
  messaging: number;
  conversion: number;
  seo: number;
  ux: number;
  trust: number;
}

export interface TopLeak {
  id: string;
  category: string;
  severity: LeakSeverity;
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  howToFixIt: string;
  exampleFix: string;
  psychologyPrinciple: string;
  revenueImpact: number;
  effortToFix: EffortToFix;
  timeToFix: string;
}

export type RubricSeverityLabel = "Critical" | "High" | "Medium" | "Low";
export type RubricModeLabel = "FLAW" | "GAP";

/** Revenue diagnostic effort tier from rubric FAIL output. */
export type RevenueEffortLabel = "Today" | "This Week" | "This Month";

export interface Leak {
  id: string;
  category: string;
  severity: LeakSeverity;
  /** Omitted on older payloads; \"missing\" = blueprint gap finding */
  type?: "existing" | "missing";
  title: string;
  /** Business-framed headline (under 12 words); preferred over technical check title in UI. */
  revenueTitle?: string;
  /** Original rubric check title from DIAGNOSTIC_CHECKS (subtitle in cards). */
  rubricCheckTitle?: string;
  /** Site-specific evidence (WHAT'S HAPPENING). */
  evidence?: string;
  /** Revenue mechanism cost (WHAT IT COSTS YOU). */
  businessCost?: string;
  /** Claude effort tier for revenue finding cards. */
  revenueEffort?: RevenueEffortLabel;
  whatWeFound: string;
  whyItMatters: string;
  howToFixIt: string;
  /** Estimated conversion lift from fixing this issue (rubric FAIL output) */
  impactStatement?: string;
  /** Copy-ready replacement text */
  exampleFix: string;
  psychologyPrinciple: string;
  revenueImpact: number;
  effortToFix: EffortToFix;
  timeToFix: string;
  page_location?: string;
  /** Original rubric labels for UI badges (optional on older payloads). */
  rubricSeverity?: RubricSeverityLabel;
  rubricMode?: RubricModeLabel;
}

export interface HeroRewrite {
  /** Current copy extracted from page — shown in CURRENT column */
  currentHeadline: string;
  currentSubheadline: string;
  currentCta: string;
  /** Suggested (AI) copy — shown in SUGGESTED column */
  suggestedHeadline: string;
  suggestedSubheadline: string;
  suggestedCta: string;
  psychologistsNote: string;
}

export interface GrowthStrategy {
  biggestOpportunity: string;
  trafficOpportunity: string;
  conversionOpportunity: string;
  trustOpportunity: string;
  quickWins: string[];
  thirtyDayPlan: string;
}

export interface ExecutiveSummary {
  verdict: string;
  diagnosis: string;
  priorityAction: string;
  estimatedImpact: string;
  weekOneActions: string[];
}

/** Site-specific overview from second Claude pass (rubric pipeline). */
export interface DiagnosticOverviewCopy {
  verdict: string;
  diagnosis: string;
  heroHeadlineNote: string;
  biggestOpportunity: string;
  estimatedImpact: string;
}

/** Alias for the overview generator return type. */
export type OverviewCopy = DiagnosticOverviewCopy;

/** Conversion Intelligence — hero / trust / flow recommendations from Claude. */
export interface ConversionTransformation {
  rewrittenHeadline: string;
  rewrittenSubheadline: string;
  rewrittenCta: string;
  currentHeadline: string;
  currentSubheadline: string;
  currentCta: string;
  /** Additional headline options — plain copy only, no meta labels */
  rewrittenHeadlineAlternatives?: string[];
  rewrittenSubheadlineAlternatives?: string[];
  rewrittenCtaAlternatives?: string[];
  trustArchitecture: string;
  pageFlowNote: string;
}

/** Conversion Intelligence — prioritized “why visitors leave” items (distinct from curated Leak tiers). */
export interface ConversionKiller {
  id: string;
  title: string;
  exitTrigger: string;
  evidence: string;
  conversionCost: string;
  implementation: string;
  effort: RevenueEffortLabel;
  severity: "critical" | "high" | "medium";
  category: string;
}

/** Conversion Intelligence — phased action plan. */
export interface GrowthBlueprint {
  weekOne: string[];
  weekTwoToFour: string[];
  monthTwo: string;
  /** Percentage range only, e.g. "15–35%" */
  projectedLift: string;
  /** One clinical sentence naming dimensions and the same range */
  projectedLiftNarrative?: string;
}

/** Rubric-style dimension labels from Conversion Intelligence JSON. */
export type ConversionIntelligenceDimension =
  | "Conversion Architecture"
  | "Trust Signals"
  | "Message Clarity"
  | "Traffic Readiness"
  | "Technical Foundation";

/** Per-dimension score + insight from Conversion Intelligence (before mapping to DimensionScoreRow). */
export interface DimensionScore {
  dimension: ConversionIntelligenceDimension;
  score: number;
  insight: string;
}

export interface ReportPayload {
  /** Detected from homepage before analysis; gates downstream analysis. Omitted on older reports. */
  site_type?: SiteType;
  healthScore: number;
  /** Recalibrated rubric growth score (mirrors healthScore when set). */
  growthScore?: number;
  pagesAnalyzed: string[];
  categoryScores: CategoryScores;
  topLeak?: TopLeak;
  leaks: Leak[];
  /** Curated tiers from rubric evaluation (max 8 / 10 / 10). */
  primaryFindings?: Leak[];
  /** Same as primaryFindings when present (canonical name). */
  priorityFindings?: Leak[];
  /** Revenue diagnostic: top 8 by impact order — THE MONEY LEAKS. */
  moneyLeaks?: Leak[];
  /** Revenue diagnostic: effort Today, max 3 — QUICK WINS. */
  quickWins?: Leak[];
  /** Revenue diagnostic: remaining findings, max 20 — GROWTH ROADMAP. */
  growthRoadmap?: Leak[];
  secondaryFindings?: Leak[];
  opportunityFindings?: Leak[];
  /** All failed checks as leaks — used for category ring counts. */
  allFailedLeaks?: Leak[];
  /** Full failed list (same as allFailedLeaks when both set). */
  allFindings?: Leak[];
  totalFailed?: number;
  totalPassed?: number;
  totalChecked?: number;
  /** Denormalized rubric counts (optional). */
  criticalCount?: number;
  highCount?: number;
  /** @deprecated Prefer hiddenCount — kept for older stored payloads */
  hiddenFindingsCount?: number;
  /** Count of failed checks not shown in the three curated tiers */
  hiddenCount?: number;
  overviewCopy?: DiagnosticOverviewCopy | null;
  /** Executive diagnostic summary (3–4 sentences); preferred over intelligenceBrief. */
  diagnosticBrief?: string;
  /** Conversion Intelligence — executive paragraph (primary narrative when set). */
  intelligenceBrief?: string;
  conversionTransformation?: ConversionTransformation;
  conversionKillers?: ConversionKiller[];
  growthBlueprint?: GrowthBlueprint;
  /** Holistic 0–100 conversion readiness from Conversion Intelligence. */
  conversionScore?: number;
  /** One line: site type + primary conversion goal. */
  siteIntelligence?: string;
  rubricEvaluation?: boolean;
  heroRewrite: HeroRewrite;
  growthStrategy: GrowthStrategy;
  executiveSummary?: ExecutiveSummary;
  /** Rescan comparison (set when a prior report existed for same domain + user). */
  scoreDelta?: number;
  previousScore?: number;
  /** ISO timestamp of the previous report (for "Last scanned" relative label). */
  previousScanAt?: string;
  /** Public share link id (UUID); stored on report row and in analysis for client copy. */
  shareToken?: string;
  /** Weighted revenue health by rubric dimension (optional on older reports). */
  dimensionScores?: DimensionScoreRow[];
  /** Rubric / scan metadata from API (optional on stored reports). */
  metadata?: {
    rubric?: {
      totalChecks?: number;
      totalFails?: number;
      totalPasses?: number;
      totalPassed?: number;
      totalSkipped?: number;
      criticalCount?: number;
      highCount?: number;
      hiddenFindingsCount?: number;
      totalChecked?: number;
    };
    screenshotAnalysis?: boolean;
  };
}

export interface StoredReport {
  id: string;
  domain: string;
  created_at: string;
  payload: ReportPayload;
}
