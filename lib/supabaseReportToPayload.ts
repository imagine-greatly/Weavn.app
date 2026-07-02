import type {
  ReportPayload,
  Leak,
  HeroRewrite,
  GrowthStrategy,
  CategoryScores,
} from '@/lib/reportSchema'

/**
 * Adapts a stored `reports` row (health_score + the `analysis` JSON blob) into the
 * ReportPayload shape ReportLayout renders. The stored analysis is already
 * ReportPayload-shaped for the most part, so this spreads it over safe defaults and
 * lets explicit overrides win. Shared by the public /reports/[token] page and the
 * in-app Reports tab so both render byte-identical reports from one mapping.
 */
export function supabaseReportToPayload(
  healthScore: number,
  analysis: Record<string, unknown>
): ReportPayload {
  const leaks = ((analysis.api_findings ?? analysis.leaks) as Leak[] | undefined) ?? []

  const defaultCategoryScores: CategoryScores = {
    psychology: 50,
    messaging: 50,
    conversion: 50,
    seo: 50,
    ux: 50,
    trust: 50,
  }

  const defaultHeroRewrite: HeroRewrite = {
    currentHeadline: '',
    currentSubheadline: '',
    currentCta: '',
    suggestedHeadline: '',
    suggestedSubheadline: '',
    suggestedCta: '',
    psychologistsNote: '',
  }

  const defaultGrowthStrategy: GrowthStrategy = {
    biggestOpportunity: '',
    trafficOpportunity: '',
    conversionOpportunity: '',
    trustOpportunity: '',
    quickWins: [],
    thirtyDayPlan: '',
  }

  return {
    pagesAnalyzed: [],
    categoryScores: defaultCategoryScores,
    heroRewrite: defaultHeroRewrite,
    growthStrategy: defaultGrowthStrategy,
    // Spread all analysis fields — carries through every known ReportPayload field
    // plus new API fields (strengths, score_profile, dimension_benchmarks, page_type)
    // that ReportLayout accesses via type assertions.
    ...(analysis as Partial<ReportPayload>),
    // Explicit overrides — always win over the spread.
    healthScore,
    leaks,
  } as unknown as ReportPayload
}
