import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Label from '@/components/ui/Label'
import ScoreRingClient from './ScoreRingClient'
import { getBenchmark } from '@/lib/benchmarks'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low'

interface Finding {
  priority: number
  severity: Severity
  category: string
  title: string
  detail: string
  fix: string
  lift: string
}

interface CopyBlock {
  field: string
  current: string
  rewritten: string
}

// ── Data mapping ──────────────────────────────────────────────────────────────

function normalizeSeverity(raw: unknown): Severity {
  const s = String(raw ?? 'medium').toLowerCase()
  if (s === 'critical' || s === 'high' || s === 'medium' || s === 'low') return s as Severity
  return 'medium'
}

function mapFindings(raw: unknown[]): Finding[] {
  return raw
    .slice(0, 12)
    .map((f, i) => {
      const finding = f as Record<string, unknown>
      const fixSteps = Array.isArray(finding.fix_steps) ? (finding.fix_steps as string[]) : []
      return {
        priority: i + 1,
        severity: normalizeSeverity(finding.severity),
        category: String(finding.dimension ?? finding.category ?? ''),
        title: String(finding.title ?? ''),
        detail: String(finding.explanation ?? finding.whatWeFound ?? finding.detail ?? ''),
        fix: String(
          finding.rewritten_copy ??
          fixSteps[0] ??
          finding.fix ??
          ''
        ),
        lift: String(finding.impact_estimate ?? finding.lift ?? ''),
      }
    })
    .filter(f => f.title)
}

function mapCopyRewrites(heroRewrite: Record<string, unknown> | null | undefined): CopyBlock[] {
  if (!heroRewrite) return []
  const blocks: CopyBlock[] = [
    {
      field: 'HEADLINE',
      current: String(heroRewrite.currentHeadline ?? ''),
      rewritten: String(heroRewrite.suggestedHeadline ?? ''),
    },
    {
      field: 'SUBHEADLINE',
      current: String(heroRewrite.currentSubheadline ?? ''),
      rewritten: String(heroRewrite.suggestedSubheadline ?? ''),
    },
    {
      field: 'PRIMARY CTA',
      current: String(heroRewrite.currentCta ?? ''),
      rewritten: String(heroRewrite.suggestedCta ?? ''),
    },
  ]
  return blocks.filter(b => b.rewritten && b.rewritten !== 'undefined' && b.rewritten !== '')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const cls: Record<Severity, string> = {
    critical: 'bg-severity-critical/10 text-severity-critical',
    high:     'bg-severity-high/10 text-severity-high',
    medium:   'bg-severity-medium/10 text-severity-medium',
    low:      'bg-severity-low/10 text-severity-low',
  }
  return (
    <span className={`font-mono text-xs px-2 py-0.5 ${cls[severity]}`}>
      {severity}
    </span>
  )
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
  const score = (report.health_score as number) ?? 0
  const domain = (report.domain as string) ?? ''
  const date = new Date(report.created_at as string).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  // Findings — try new API format first, fall back to legacy leaks
  const rawFindings = (
    analysis.api_findings ??
    analysis.leaks ??
    []
  ) as unknown[]
  const findings = mapFindings(rawFindings)

  // Copy rewrites
  const copyRewrites = mapCopyRewrites(
    analysis.heroRewrite as Record<string, unknown> | undefined
  )

  // Benchmark
  const siteType = String(analysis.site_type ?? 'saas')
  const benchmark = await getBenchmark(siteType, score).catch(() => null)
  const benchData = {
    industryAvg:  benchmark?.industry_average ?? 54,
    yourScore:    score,
    topQuartile:  benchmark?.top_10_percent_score ?? 78,
    industry:     siteType.replace(/_/g, ' ').toUpperCase(),
  }

  return (
    <main className="bg-background-base min-h-screen">
      <div className="max-w-[860px] mx-auto px-8 py-16">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-16">
          <div>
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">
              CONVERSION AUDIT
            </div>
            <h1 className="font-display font-extrabold text-4xl text-text-primary tracking-tight">
              {domain}
            </h1>
            <div className="font-mono text-xs text-text-tertiary mt-2">
              Analyzed {date} · {findings.length > 0 ? `${findings.length} findings` : 'Analysis complete'}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 flex-shrink-0 ml-8">
            <ScoreRingClient score={score} size="lg" animated={true} />
            <div className="font-mono text-xs text-text-tertiary text-center">CONVERSION SCORE</div>
          </div>
        </div>

        {/* ── Benchmark band ─────────────────────────────────────────────── */}
        <div className="bg-background-raised border border-background-border p-6 mb-12">
          <div className="grid grid-cols-3 gap-px bg-background-border">
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-extrabold text-3xl text-text-secondary">
                {benchData.industryAvg}
              </div>
              <div className="font-mono text-xs text-text-tertiary mt-1">
                INDUSTRY AVERAGE ({benchData.industry})
              </div>
            </div>
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-extrabold text-3xl text-score-mid">
                {benchData.yourScore}
              </div>
              <div className="font-mono text-xs text-text-tertiary mt-1">YOUR SCORE</div>
            </div>
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-extrabold text-3xl text-text-secondary">
                {benchData.topQuartile}
              </div>
              <div className="font-mono text-xs text-text-tertiary mt-1">TOP QUARTILE</div>
            </div>
          </div>

          {/* Position bar */}
          <div className="relative w-full h-1 bg-background-border mt-6">
            {/* Industry avg marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 bg-text-tertiary w-[3px]"
              style={{ left: `${benchData.industryAvg}%`, height: 12 }}
            />
            {/* Your score marker */}
            <div
              className="absolute -translate-y-1/2 bg-score-mid w-[3px]"
              style={{ left: `${benchData.yourScore}%`, height: 16, top: '50%' }}
            >
              <div
                className="absolute font-mono text-[9px] text-score-mid whitespace-nowrap"
                style={{ top: -16, left: '50%', transform: 'translateX(-50%)' }}
              >
                You
              </div>
            </div>
            {/* Top quartile marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 bg-text-tertiary w-[3px]"
              style={{ left: `${benchData.topQuartile}%`, height: 12 }}
            />
          </div>
        </div>

        {/* ── Findings ───────────────────────────────────────────────────── */}
        {findings.length > 0 && (
          <div className="mb-16">
            <Label>FINDINGS</Label>
            <h2 className="font-display font-extrabold text-2xl text-text-primary mt-3 mb-8">
              {findings.length} issue{findings.length !== 1 ? 's' : ''} ranked by revenue impact.
            </h2>

            {findings.map(f => (
              <div key={f.priority} className="bg-background-raised border border-background-border p-6 mb-px">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className="font-display font-extrabold text-3xl flex-shrink-0 select-none"
                      style={{ color: 'var(--tw-shadow-color, #111827)', opacity: 0.4 }}
                    >
                      {String(f.priority).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <SeverityBadge severity={f.severity} />
                      <div className="font-body font-semibold text-base text-text-primary leading-snug mt-2">
                        {f.title}
                      </div>
                      {f.category && (
                        <div className="font-mono text-xs text-text-tertiary mt-1">{f.category}</div>
                      )}
                    </div>
                  </div>
                  {f.lift && (
                    <div className="font-mono text-xs text-score-mid bg-score-mid/10 px-3 py-1 flex-shrink-0">
                      ↑ {f.lift} lift
                    </div>
                  )}
                </div>

                {f.detail && (
                  <p className="font-body text-sm text-text-secondary mt-4 leading-relaxed">
                    {f.detail}
                  </p>
                )}

                {f.fix && (
                  <div className="bg-background-subtle border-l-2 border-cyan-DEFAULT px-4 py-3 mt-4">
                    <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">
                      RECOMMENDED FIX
                    </div>
                    <p className="font-body text-sm text-text-primary leading-relaxed">{f.fix}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Rewritten copy ─────────────────────────────────────────────── */}
        {copyRewrites.length > 0 && (
          <div className="mb-16">
            <Label>AI-REWRITTEN COPY</Label>
            <h2 className="font-display font-extrabold text-2xl text-text-primary mt-3 mb-8">
              Drop-in replacements.
            </h2>

            {copyRewrites.map(block => (
              <div key={block.field} className="bg-background-raised border border-background-border p-6 mb-px">
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">
                  {block.field}
                </div>
                <div className="grid grid-cols-2">
                  <div className="border-r border-background-border pr-6">
                    <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">CURRENT</div>
                    <p className="font-body text-sm text-text-secondary italic">
                      {block.current || '—'}
                    </p>
                  </div>
                  <div className="pl-6">
                    <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-2">REWRITTEN</div>
                    <p className="font-body text-sm text-text-primary font-medium">{block.rewritten}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-background-border flex justify-between items-center">
          <span className="font-mono text-xs text-text-tertiary">
            Report generated {date} · Confidential
          </span>
          <span className="font-mono text-xs text-text-tertiary">
            Powered by webdoc.ai
          </span>
        </div>

      </div>
    </main>
  )
}
