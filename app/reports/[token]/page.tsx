import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import type {
  ReportPayload,
  Leak,
  HeroRewrite,
  GrowthStrategy,
  CategoryScores,
} from '@/lib/reportSchema'
import ReportClient from './ReportClient'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Adapter ───────────────────────────────────────────────────────────────────

function supabaseReportToPayload(
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

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('reports')
    .select('domain')
    .eq('share_token', token)
    .maybeSingle()

  const domain = (data?.domain as string | undefined) ?? 'Site'
  return {
    title: `${domain} — Conversion Audit Report`,
    description: `Full conversion diagnostic for ${domain}. Score, ranked findings, and implementation guidance.`,
    robots: { index: false, follow: false },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('share_token', token)
    .neq('status', 'pending')
    .neq('status', 'failed')
    .limit(1)
    .maybeSingle()

  if (!report) notFound()

  const analysis = (report.analysis ?? {}) as Record<string, unknown>
  const healthScore = (report.health_score as number) ?? 0
  const domain = (report.domain as string) ?? ''

  const payload = supabaseReportToPayload(healthScore, analysis)

  return (
    <main className="bg-background-base" style={{ height: 'calc(100svh - 4rem)' }}>
      <ReportClient domain={domain} payload={payload} />
    </main>
  )
}
