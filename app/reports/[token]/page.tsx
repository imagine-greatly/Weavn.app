import Label from '@/components/ui/Label'
import ScoreRingClient from './ScoreRingClient'

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

// ── Hardcoded report data (real data wired later via token) ───────────────────

const REPORT = {
  domain:    'acme-saas.com',
  date:      'Jun 3, 2026',
  score:     61,
  checksRun: '260+',
  dims:      9,
  benchmark: { industryAvg: 54, yourScore: 61, topQuartile: 78, industry: 'B2B SAAS' },
}

const FINDINGS: Finding[] = [
  {
    priority: 1,
    severity: 'critical',
    category: 'value_proposition',
    title:    'Hero headline is feature-led, not outcome-led',
    detail:   'Visitors cannot determine what problem this solves or for whom within 5 seconds. Feature-led headlines reduce immediate resonance with outcome-seeking buyers.',
    fix:      'Reframe around the outcome your best customers achieve. Lead with the result, follow with the mechanism.',
    lift:     '12–18%',
  },
  {
    priority: 2,
    severity: 'high',
    category: 'social_proof',
    title:    'No above-fold proof — first credibility signal at 2,400px',
    detail:   'Trust must be established before the first scroll. Visitors who don\'t see proof early leave before reaching your testimonials.',
    fix:      'Add a single high-authority quote or recognizable logo strip within the first 400px of viewport.',
    lift:     '8–11%',
  },
  {
    priority: 3,
    severity: 'high',
    category: 'cta_clarity',
    title:    'Dual primary CTAs create decision paralysis',
    detail:   '\'Start Free Trial\' and \'Book a Demo\' carry identical visual weight. Equal-weight choices cause visitors to default to neither.',
    fix:      'Elevate one CTA as primary. Demote the secondary to a plain text link beneath it.',
    lift:     '6–9%',
  },
  {
    priority: 4,
    severity: 'medium',
    category: 'specificity',
    title:    'Benefit claims are vague — no numbers, no timeframes',
    detail:   'Claims like "save time" and "increase revenue" without supporting specifics are indistinguishable from competitor copy.',
    fix:      'Audit every benefit claim. Attach a number, a timeframe, or a customer-specific outcome to each.',
    lift:     '4–6%',
  },
  {
    priority: 5,
    severity: 'medium',
    category: 'navigation',
    title:    'Seven nav items competing with primary CTA',
    detail:   'Navigation link count inversely correlates with conversion rate on landing pages. Seven options dilute attention from your primary action.',
    fix:      'Reduce nav to four items maximum on the landing page. Move secondary links to footer.',
    lift:     '3–5%',
  },
]

const COPY_REWRITES = [
  {
    field:    'HEADLINE',
    current:  'AI-powered project management platform',
    rewritten: 'Ship projects on time, every time.',
  },
  {
    field:    'SUBHEADLINE',
    current:  'Built for modern teams who want to move fast',
    rewritten: '4,200 teams have cut project delays by 40%. No status meetings required.',
  },
  {
    field:    'PRIMARY CTA',
    current:  'Get started',
    rewritten: 'Start free — no credit card',
  },
]

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
  // Token available for future data fetching
  await params

  const { domain, date, score, checksRun, dims, benchmark } = REPORT

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
              Analyzed {date} · {checksRun} checks across {dims} dimensions
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
                {benchmark.industryAvg}
              </div>
              <div className="font-mono text-xs text-text-tertiary mt-1">
                INDUSTRY AVERAGE ({benchmark.industry})
              </div>
            </div>
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-extrabold text-3xl text-score-mid">
                {benchmark.yourScore}
              </div>
              <div className="font-mono text-xs text-text-tertiary mt-1">YOUR SCORE</div>
            </div>
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-extrabold text-3xl text-text-secondary">
                {benchmark.topQuartile}
              </div>
              <div className="font-mono text-xs text-text-tertiary mt-1">TOP QUARTILE</div>
            </div>
          </div>

          {/* Position bar */}
          <div className="relative w-full h-1 bg-background-border mt-6">
            {/* Industry avg marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 bg-text-tertiary w-[3px]"
              style={{ left: `${benchmark.industryAvg}%`, height: 12 }}
            />
            {/* Your score marker */}
            <div
              className="absolute -translate-y-1/2 bg-score-mid w-[3px]"
              style={{ left: `${benchmark.yourScore}%`, height: 16, top: '50%' }}
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
              style={{ left: `${benchmark.topQuartile}%`, height: 12 }}
            />
          </div>
        </div>

        {/* ── Findings ───────────────────────────────────────────────────── */}
        <div className="mb-16">
          <Label>FINDINGS</Label>
          <h2 className="font-display font-extrabold text-2xl text-text-primary mt-3 mb-8">
            23 issues ranked by revenue impact.
          </h2>

          {FINDINGS.map(f => (
            <div key={f.priority} className="bg-background-raised border border-background-border p-6 mb-px">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className="font-display font-extrabold text-3xl flex-shrink-0 select-none"
                    style={{ color: 'var(--tw-shadow-color, #111827)', opacity: 0.4 }}
                  >
                    0{f.priority}
                  </div>
                  <div className="min-w-0">
                    <SeverityBadge severity={f.severity} />
                    <div className="font-body font-semibold text-base text-text-primary leading-snug mt-2">
                      {f.title}
                    </div>
                    <div className="font-mono text-xs text-text-tertiary mt-1">{f.category}</div>
                  </div>
                </div>
                <div className="font-mono text-xs text-score-mid bg-score-mid/10 px-3 py-1 flex-shrink-0">
                  ↑ {f.lift} lift
                </div>
              </div>

              <p className="font-body text-sm text-text-secondary mt-4 leading-relaxed">
                {f.detail}
              </p>

              <div className="bg-background-subtle border-l-2 border-cyan-DEFAULT px-4 py-3 mt-4">
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">
                  RECOMMENDED FIX
                </div>
                <p className="font-body text-sm text-text-primary leading-relaxed">{f.fix}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Rewritten copy ─────────────────────────────────────────────── */}
        <div className="mb-16">
          <Label>AI-REWRITTEN COPY</Label>
          <h2 className="font-display font-extrabold text-2xl text-text-primary mt-3 mb-8">
            Drop-in replacements.
          </h2>

          {COPY_REWRITES.map(block => (
            <div key={block.field} className="bg-background-raised border border-background-border p-6 mb-px">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">
                {block.field}
              </div>
              <div className="grid grid-cols-2">
                <div className="border-r border-background-border pr-6">
                  <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">CURRENT</div>
                  <p className="font-body text-sm text-text-secondary italic">{block.current}</p>
                </div>
                <div className="pl-6">
                  <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-2">REWRITTEN</div>
                  <p className="font-body text-sm text-text-primary font-medium">{block.rewritten}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

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
