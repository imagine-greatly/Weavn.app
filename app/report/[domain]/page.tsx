'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReportLayout from '@/components/ReportLayout'
import type {
  ReportPayload,
  Leak,
  LeakSeverity,
  CategoryScores,
  HeroRewrite,
  GrowthStrategy,
  SiteType,
} from '@/lib/reportSchema'

// ── Local types (sessionStorage shape) ───────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium'

interface Finding {
  id: string
  title: string
  severity: Severity
  dimension: string
  impact: string
  explanation: string
  recommendation: string
  rewritten_copy: string | null
}

interface ScanResult {
  url: string
  domain: string
  score: number
  site_type: string
  benchmark: {
    industry: string
    percentile: number
    average_score: number
    top_quartile: number
  }
  dimensions: Record<string, number>
  findings: Finding[]
  copy_rewrites: {
    headline: string
    subheadline: string
    cta: string
  }
  growth_blueprint: Array<{
    priority: number
    action: string
    effort: string
    impact: string
    timeframe: string
  }>
  scan_meta: {
    duration_ms: number
    cost_usd: number
    scanned_at: string
  }
}

// ── Adapter ───────────────────────────────────────────────────────────────────

function normalizeSiteType(s: string): SiteType {
  if (s === 'saas_product' || s === 'saas') return 'saas'
  if (s === 'ecommerce') return 'ecommerce'
  if (s === 'service') return 'service'
  if (s === 'local') return 'local'
  if (s === 'content') return 'content'
  return 'unknown'
}

function scanResultToPayload(result: ScanResult): ReportPayload {
  const mapSev = (s: Severity): LeakSeverity =>
    s === 'critical' ? 'critical' : 'warning'

  const effortMap = { critical: 'high', high: 'medium', medium: 'low' } as const

  const leaks: Leak[] = result.findings.map(f => ({
    id: f.id,
    category: f.dimension,
    severity: mapSev(f.severity),
    title: f.title,
    revenueTitle: f.title,
    whatWeFound: f.explanation,
    whyItMatters: f.explanation,
    howToFixIt: f.recommendation,
    exampleFix: f.rewritten_copy ?? '',
    psychologyPrinciple: '',
    revenueImpact: f.severity === 'critical' ? 9 : f.severity === 'high' ? 7 : 4,
    effortToFix: effortMap[f.severity],
    timeToFix: '',
  }))

  const d = result.dimensions
  const categoryScores: CategoryScores = {
    psychology: Math.round(((d.conversion_architecture ?? 50) + (d.message_clarity ?? 50)) / 2),
    messaging: d.message_clarity ?? 50,
    conversion: d.conversion_architecture ?? 50,
    seo: d.traffic_readiness ?? 50,
    ux: d.technical_foundation ?? 50,
    trust: d.trust_signals ?? 50,
  }

  const heroRewrite: HeroRewrite = {
    currentHeadline: '',
    currentSubheadline: '',
    currentCta: '',
    suggestedHeadline: result.copy_rewrites.headline,
    suggestedSubheadline: result.copy_rewrites.subheadline,
    suggestedCta: result.copy_rewrites.cta,
    psychologistsNote: '',
  }

  const growthStrategy: GrowthStrategy = {
    biggestOpportunity: result.growth_blueprint[0]?.action ?? '',
    trafficOpportunity: '',
    conversionOpportunity: result.growth_blueprint
      .filter(i => i.impact === 'high')
      .map(i => i.action)
      .join('. '),
    trustOpportunity: '',
    quickWins: result.growth_blueprint
      .filter(i => i.timeframe === 'today')
      .map(i => i.action),
    thirtyDayPlan: result.growth_blueprint
      .map(i => `${i.action} (${i.timeframe.replace(/_/g, ' ')})`)
      .join('\n'),
  }

  return {
    healthScore: result.score,
    pagesAnalyzed: [result.url],
    categoryScores,
    leaks,
    primaryFindings: leaks,
    moneyLeaks: leaks,
    heroRewrite,
    growthStrategy,
    totalChecked: 307,
    totalFailed: leaks.length,
    totalPassed: Math.max(0, 307 - leaks.length),
    site_type: normalizeSiteType(result.site_type),
    siteIntelligence: `${result.benchmark.industry.toUpperCase()} · ${result.benchmark.percentile}th percentile`,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams<{ domain: string }>()
  const router = useRouter()
  const domain = decodeURIComponent(params?.domain ?? '')

  const [payload, setPayload] = useState<ReportPayload | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('scan_result')
      if (raw) {
        const parsed = JSON.parse(raw) as ScanResult
        setPayload(scanResultToPayload(parsed))
      }
    } catch {}
    setLoaded(true)
  }, [])

  if (loaded && !payload) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-text-tertiary mb-4">No scan data found.</p>
          <a href="/dashboard" className="font-mono text-xs text-cyan-DEFAULT hover:underline">
            ← Run a scan
          </a>
        </div>
      </div>
    )
  }

  if (!loaded || !payload) return null

  return (
    <ReportLayout
      domain={domain}
      payload={payload}
      onRescan={() => router.push('/dashboard')}
    />
  )
}
