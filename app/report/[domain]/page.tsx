'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ScoreRing from '@/components/ui/ScoreRing'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreInterpretation(score: number): string {
  if (score < 40)  return 'Your site has severe conversion issues that are likely costing you the majority of potential signups.'
  if (score < 60)  return 'Your site has significant conversion issues. Fixing the critical findings below could meaningfully increase signups.'
  if (score < 75)  return 'Your site converts at a below-average rate. Several high-impact improvements are available.'
  if (score < 90)  return 'Your site is above average but has room to improve. Focus on the high-impact findings below.'
  return 'Your site is well-optimized. Minor improvements remain available.'
}

function barColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#facc15'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function formatDimension(key: string): string {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatTimeframe(tf: string): string {
  return tf.replace(/_/g, ' ')
}

// ── Severity badge ────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'text-red-400 border border-red-400/30',
  high:     'text-amber-400 border border-amber-400/30',
  medium:   'text-yellow-400 border border-yellow-400/30',
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`font-mono text-xs uppercase px-2 py-0.5 ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams<{ domain: string }>()
  const router = useRouter()
  const domain = decodeURIComponent(params?.domain ?? '')

  const [scanData, setScanData] = useState<ScanResult | null>(null)
  const [loaded, setLoaded]     = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('scan_result')
      if (raw) setScanData(JSON.parse(raw) as ScanResult)
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [loaded])

  // Scan not found
  if (loaded && !scanData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-text-tertiary mb-4">No scan data found.</p>
          <Link href="/scan" className="font-mono text-xs text-cyan-DEFAULT hover:underline">
            ← Run a scan
          </Link>
        </div>
      </div>
    )
  }

  if (!loaded || !scanData) return null

  const { score, benchmark, dimensions, findings, copy_rewrites, growth_blueprint } = scanData
  const dimEntries = Object.entries(dimensions)

  return (
    <main className="bg-background-base min-h-screen pb-24">
      <div className="max-w-3xl mx-auto px-6 pt-12">

        {/* ── SECTION 1 — REPORT HEADER ─────────────────────────────────── */}

        {/* Domain + scan time */}
        <div className="font-mono text-xs text-text-tertiary mb-6">
          {domain}&nbsp;&nbsp;·&nbsp;&nbsp;Scanned just now
        </div>

        {/* Score row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-display font-bold text-8xl text-text-primary leading-none">
              {score}
            </div>
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-2">
              CONVERSION SCORE
            </div>
          </div>
          <div className="flex-shrink-0">
            <ScoreRing score={score} size="lg" animated />
          </div>
        </div>

        {/* Interpretation */}
        <div className="border-t border-background-border pt-6 mb-6">
          <p className="font-body text-base text-text-secondary">
            {scoreInterpretation(score)}
          </p>
        </div>

        {/* Benchmark band */}
        <div className="bg-background-raised border border-background-border p-4 flex items-center justify-between mb-12">
          <div className="font-mono text-xs text-text-tertiary">
            INDUSTRY BENCHMARK&nbsp;&nbsp;·&nbsp;&nbsp;{benchmark.industry.toUpperCase()}
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-2xl text-text-primary leading-none">
              {benchmark.percentile}th
            </div>
            <div className="font-mono text-xs text-text-tertiary mt-0.5">percentile</div>
          </div>
          <div className="font-mono text-xs text-text-secondary text-right">
            Avg: {benchmark.average_score}&nbsp;&nbsp;·&nbsp;&nbsp;Top quartile: {benchmark.top_quartile}
          </div>
        </div>

        {/* ── SECTION 2 — DIMENSIONS ─────────────────────────────────────── */}

        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4 mt-12">
          PERFORMANCE BY DIMENSION
        </div>

        {dimEntries.map(([key, val], i) => (
          <div key={key} className="flex items-center gap-4 mb-3">
            <div className="font-mono text-xs text-text-secondary w-48 flex-shrink-0">
              {formatDimension(key)}
            </div>
            <div className="flex-1 h-1.5 bg-background-border rounded-full relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width:           mounted ? `${val}%` : '0%',
                  backgroundColor: barColor(val),
                  transition:      'width 700ms ease-out',
                  transitionDelay: `${i * 100}ms`,
                }}
              />
            </div>
            <div className="font-mono text-xs text-text-primary w-8 text-right flex-shrink-0">
              {val}
            </div>
          </div>
        ))}

        {/* ── SECTION 3 — FINDINGS ───────────────────────────────────────── */}

        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4 mt-12">
          {`FINDINGS  ·  ${findings.length} ISSUES`}
        </div>

        {findings.map(f => (
          <div key={f.id} className="border border-background-border p-5 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-text-tertiary">{f.id}</span>
              <SeverityBadge severity={f.severity} />
            </div>
            <div className="font-body font-medium text-base text-text-primary mt-2 mb-3">
              {f.title}
            </div>
            <div className="font-body text-sm text-text-secondary leading-relaxed mb-3">
              {f.explanation}
            </div>
            <div className="border-l-2 border-cyan-DEFAULT/30 pl-3">
              <span className="font-mono text-xs text-cyan-DEFAULT mr-1">FIX:</span>
              <span className="font-body text-sm text-text-secondary">
                {f.recommendation}
              </span>
            </div>
            {f.rewritten_copy && (
              <div className="mt-3 bg-background-raised p-3">
                <div className="font-mono text-xs text-text-tertiary mb-1">AI REWRITE:</div>
                <div className="font-body text-sm text-text-primary italic">
                  {f.rewritten_copy}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── SECTION 4 — COPY REWRITES ──────────────────────────────────── */}

        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4 mt-12">
          COPY REWRITES
        </div>

        {([
          ['HEADLINE',    copy_rewrites.headline],
          ['SUBHEADLINE', copy_rewrites.subheadline],
          ['CTA',         copy_rewrites.cta],
        ] as [string, string][]).map(([label, rewrite]) => (
          <div key={label} className="border-b border-background-border py-4">
            <div className="font-mono text-xs text-text-tertiary uppercase mb-2">{label}</div>
            <div className="flex items-start gap-3">
              <span className="font-body text-sm text-text-tertiary line-through opacity-60">
                Original copy from your page
              </span>
              <span className="text-text-tertiary flex-shrink-0 mt-0.5">→</span>
              <span className="font-body text-sm text-text-primary">{rewrite}</span>
            </div>
          </div>
        ))}

        {/* ── SECTION 5 — GROWTH BLUEPRINT ───────────────────────────────── */}

        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4 mt-12">
          GROWTH BLUEPRINT
        </div>

        {growth_blueprint.map((item, i) => (
          <div key={item.priority} className="flex items-start gap-4 py-4 border-b border-background-border">
            <div
              className="font-display font-bold text-4xl flex-shrink-0 w-12 leading-none"
              style={{ color: '#1a1f2e' }}
            >
              {item.priority}
            </div>
            <div className="flex-1">
              <div className="font-body font-medium text-base text-text-primary mb-2">
                {item.action}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="font-mono text-xs px-2 py-0.5 bg-background-raised text-text-tertiary">
                  effort: {item.effort}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 bg-background-raised text-text-tertiary">
                  impact: {item.impact}
                </span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 bg-background-raised ${
                    item.timeframe === 'today' ? 'text-cyan-DEFAULT' : 'text-text-tertiary'
                  }`}
                >
                  {formatTimeframe(item.timeframe)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* ── SECTION 6 — UPGRADE HOOK ────────────────────────────────────── */}

        <div className="mt-16 border border-background-border p-8 text-center">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
            TRACK YOUR PROGRESS
          </div>
          <h3 className="font-display font-bold text-2xl text-text-primary mb-3">
            See if your fixes are working.
          </h3>
          <p className="font-body text-sm text-text-secondary mb-6 max-w-sm mx-auto">
            Rescan your site after making changes. Track your score over time.
            See which dimensions improve. $49/month — cancel anytime.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/signup?plan=starter"
              className="bg-cyan-DEFAULT text-background-base font-mono text-sm font-bold px-6 py-3 no-underline hover:opacity-90 transition-opacity"
            >
              START TRACKING  →
            </Link>
            <button
              onClick={() => router.push('/scan')}
              className="border border-background-border text-text-secondary font-mono text-sm px-6 py-3 bg-transparent cursor-pointer hover:border-text-tertiary transition-colors"
            >
              RESCAN FREE
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}
