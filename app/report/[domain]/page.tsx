import Link from 'next/link'
import Label from '@/components/ui/Label'
import ScoreRingClient from './ScoreRingClient'

// ── Hardcoded data — wired in technical chat ──────────────────────────────────

const SCORE = 61
const INDUSTRY_AVG = 54
const TOP_QUARTILE = 78

const FINDINGS = [
  {
    priority: 1,
    severity: 'critical' as const,
    title: 'Hero headline is feature-led, not outcome-led',
    detail: 'Current headline names a feature ("Manage Your Projects"). Visitors need to know what changes for them — outcomes, not inputs.',
    fix: 'Rewrite to: "Ship projects on time, every time." — outcome-led, present tense.',
    lift: '12–18% lift',
  },
  {
    priority: 2,
    severity: 'high' as const,
    title: 'No above-fold proof — testimonials buried at 2,400px',
    detail: 'Trust signals exist but appear below three full viewport scrolls. Most visitors leave before they get there.',
    fix: 'Surface one logo strip or testimonial within 600px of page top.',
    lift: '8–11% lift',
  },
  {
    priority: 3,
    severity: 'high' as const,
    title: 'Dual CTAs create decision paralysis',
    detail: 'Two equal-weight CTA buttons in the hero split intent and reduce each click.',
    fix: 'Demote secondary CTA to a text link. One primary action per section.',
    lift: '6–9% lift',
  },
  {
    priority: 4,
    severity: 'medium' as const,
    title: 'Pricing page is missing comparison anchoring',
    detail: 'No tier comparison means visitors cannot self-select. Most leave to find it elsewhere.',
    fix: 'Add a 2-column comparison with the most common objection addressed per tier.',
    lift: '4–7% lift',
  },
  {
    priority: 5,
    severity: 'medium' as const,
    title: 'CTA is not visible on first scroll on mobile',
    detail: 'At 390px viewport the primary button is below fold on first paint.',
    fix: 'Move CTA above the product screenshot or add a sticky mobile CTA bar.',
    lift: '3–6% lift',
  },
]

const SEV_BADGE: Record<string, string> = {
  critical: 'bg-severity-critical/10 text-severity-critical',
  high: 'bg-severity-high/10 text-severity-high',
  medium: 'bg-severity-medium/10 text-severity-medium',
}

const SEV_BORDER: Record<string, string> = {
  critical: 'border-l-severity-critical',
  high: 'border-l-severity-high',
  medium: 'border-l-severity-medium',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FindingCard({ f }: { f: typeof FINDINGS[number] }) {
  return (
    <div className={`bg-background-raised border border-background-border border-l-4 ${SEV_BORDER[f.severity]} p-6 mb-4`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs text-text-tertiary">{String(f.priority).padStart(2, '0')}</span>
        <span className={`font-mono text-xs px-2 py-0.5 uppercase ${SEV_BADGE[f.severity]}`}>{f.severity}</span>
        <span className="ml-auto font-mono text-xs text-score-mid">{f.lift}</span>
      </div>
      <div className="font-body font-semibold text-sm text-text-primary mb-3">{f.title}</div>
      <div className="font-body text-xs text-text-secondary leading-relaxed mb-4">{f.detail}</div>
      <div className="border-l-2 border-cyan-DEFAULT pl-3 py-2 bg-background-subtle">
        <div className="font-mono text-xs text-text-tertiary mb-1">FIX</div>
        <div className="font-body text-xs text-text-primary">{f.fix}</div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReportPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params

  return (
    <main className="bg-background-base min-h-screen">
      <div className="max-w-[900px] mx-auto px-8 py-16">

        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <Label>CONVERSION AUDIT</Label>
            <h1 className="font-display font-bold text-4xl text-text-primary tracking-tight mt-3">
              {domain}
            </h1>
            <p className="font-mono text-xs text-text-tertiary mt-2">
              Analyzed today · 260+ checks across 9 dimensions
            </p>
          </div>
          <div className="text-center flex-shrink-0">
            <ScoreRingClient size="lg" animated={true} score={SCORE} />
            <div className="font-mono text-xs text-text-tertiary mt-2">CONVERSION SCORE</div>
          </div>
        </div>

        {/* Benchmark band */}
        <div className="bg-background-raised border border-background-border p-6 mb-10">
          <div className="grid grid-cols-3 gap-px bg-background-border">
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-bold text-3xl text-text-secondary">{INDUSTRY_AVG}</div>
              <div className="font-mono text-xs text-text-tertiary mt-1 uppercase tracking-widest">INDUSTRY AVERAGE</div>
              <div className="font-mono text-xs text-text-tertiary">B2B SaaS</div>
            </div>
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-bold text-3xl text-score-mid">{SCORE}</div>
              <div className="font-mono text-xs text-text-tertiary mt-1 uppercase tracking-widest">YOUR SCORE</div>
              <div className="font-mono text-xs text-score-mid">63rd percentile</div>
            </div>
            <div className="bg-background-raised px-6 py-4">
              <div className="font-display font-bold text-3xl text-text-secondary">{TOP_QUARTILE}</div>
              <div className="font-mono text-xs text-text-tertiary mt-1 uppercase tracking-widest">TOP QUARTILE</div>
            </div>
          </div>

          {/* Position bar */}
          <div className="mt-5 w-full">
            <div className="relative h-6">
              <span
                className="absolute font-mono text-xs text-score-mid"
                style={{ left: `${SCORE}%`, transform: 'translateX(-50%)' }}
              >
                You
              </span>
            </div>
            <div className="relative w-full h-px bg-background-border">
              {/* Industry avg marker */}
              <div
                className="absolute bg-text-tertiary"
                style={{ left: `${INDUSTRY_AVG}%`, top: -5, width: 2, height: 10 }}
              />
              {/* Your score marker — taller */}
              <div
                className="absolute bg-score-mid"
                style={{ left: `${SCORE}%`, top: -7, width: 2, height: 14 }}
              />
              {/* Top quartile marker */}
              <div
                className="absolute bg-text-tertiary"
                style={{ left: `${TOP_QUARTILE}%`, top: -5, width: 2, height: 10 }}
              />
            </div>
          </div>
        </div>

        {/* Score trending teaser */}
        <div className="bg-background-raised border border-background-border p-6 mb-10">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">SCORE HISTORY</div>
              <div className="font-body text-sm text-text-secondary">
                Track your score over time to measure improvement.
              </div>
            </div>
            <div className="flex-shrink-0 ml-8">
              <div className="relative" style={{ width: 160, height: 52 }}>
                <svg width={160} height={40} viewBox="0 0 160 40">
                  <line
                    x1={0} y1={28} x2={140} y2={28}
                    stroke="#111827" strokeWidth={1} strokeDasharray="4 4"
                  />
                  <circle cx={140} cy={28} r={4} fill="#F5A623" />
                </svg>
                <span
                  className="font-mono text-xs text-text-tertiary absolute"
                  style={{ left: 132, top: 38 }}
                >
                  today
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-background-border">
            <span className="font-body text-xs text-text-tertiary">
              Scan monthly to track your trajectory.{' '}
            </span>
            <Link href="/pricing" className="font-body text-xs text-cyan-DEFAULT no-underline cursor-pointer">
              Starter plan from $49/month →
            </Link>
          </div>
        </div>

        {/* Findings */}
        <Label>FINDINGS</Label>
        <h2 className="font-display font-bold text-2xl text-text-primary mb-2">
          23 issues ranked by revenue impact.
        </h2>
        <p className="font-body text-sm text-text-secondary mb-8">
          Findings are specific to your page content — not generic advice.
        </p>

        {FINDINGS.map(f => <FindingCard key={f.priority} f={f} />)}

        {/* Locked findings */}
        <div className="relative bg-background-raised border border-background-border p-8 text-center overflow-hidden mb-16">
          {/* Blurred fake rows */}
          <div className="blur-sm opacity-20 select-none pointer-events-none">
            {[
              { n: '06', sev: 'medium', title: 'Form friction exceeds 4-field threshold on signup page' },
              { n: '07', sev: 'high', title: 'Pricing page lacks feature comparison table' },
              { n: '08', sev: 'medium', title: 'Missing urgency signals in checkout flow' },
            ].map(row => (
              <div key={row.n} className="bg-background-subtle border border-background-border p-4 mb-2 text-left">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-text-tertiary">{row.n}</span>
                  <span className="font-mono text-xs text-severity-high uppercase">{row.sev}</span>
                </div>
                <div className="font-body text-sm text-text-primary">{row.title}</div>
              </div>
            ))}
          </div>
          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-background-raised/80">
            <div className="font-display font-bold text-xl text-text-primary mb-2">18 more findings</div>
            <div className="font-body text-sm text-text-secondary mb-6 max-w-sm">
              Unlock all findings, the full fix for each, and AI-rewritten copy with a Starter account.
            </div>
            <Link
              href="/signup?plan=starter"
              className="bg-cyan-DEFAULT text-text-inverse font-body font-bold text-sm px-8 py-3 no-underline"
            >
              Start free trial — $49/month →
            </Link>
            <span className="font-mono text-xs text-text-tertiary mt-3 block">
              14-day free trial. No credit card required.
            </span>
          </div>
        </div>

        {/* AI-Rewritten Copy */}
        <Label>AI-REWRITTEN COPY</Label>
        <h2 className="font-display font-bold text-2xl text-text-primary mb-8">Drop-in replacements.</h2>

        {/* Headline — full reveal */}
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">HEADLINE</div>
        <div className="grid grid-cols-2 gap-px bg-background-border mb-6">
          <div className="bg-background-raised p-6">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">CURRENT</div>
            <div className="font-body text-sm text-text-secondary leading-relaxed">Manage Your Projects Smarter</div>
          </div>
          <div className="bg-background-raised p-6 border-l-2 border-cyan-DEFAULT">
            <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-3">REWRITTEN</div>
            <div className="font-body text-sm text-text-primary leading-relaxed">Ship projects on time, every time.</div>
          </div>
        </div>

        {/* Subheadline + CTA — locked */}
        <div className="relative overflow-hidden">
          <div className="blur-sm opacity-20 select-none pointer-events-none">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">SUBHEADLINE</div>
            <div className="grid grid-cols-2 gap-px bg-background-border mb-6">
              <div className="bg-background-raised p-6">
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">CURRENT</div>
                <div className="font-body text-sm text-text-secondary">The only tool your team needs to stay on track.</div>
              </div>
              <div className="bg-background-raised p-6 border-l-2 border-cyan-DEFAULT">
                <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-3">REWRITTEN</div>
                <div className="font-body text-sm text-text-primary">The project management layer your team actually uses.</div>
              </div>
            </div>
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">PRIMARY CTA</div>
            <div className="grid grid-cols-2 gap-px bg-background-border">
              <div className="bg-background-raised p-6">
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">CURRENT</div>
                <div className="font-body text-sm text-text-secondary">Get started</div>
              </div>
              <div className="bg-background-raised p-6 border-l-2 border-cyan-DEFAULT">
                <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-3">REWRITTEN</div>
                <div className="font-body text-sm text-text-primary">Start free — no credit card</div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-base/80">
            <div className="font-display font-bold text-lg text-text-primary mb-2 text-center">Unlock full copy rewrites</div>
            <div className="font-body text-sm text-text-secondary mb-4 text-center max-w-xs">
              Unlock subheadline and CTA rewrites with Starter.
            </div>
            <Link
              href="/signup?plan=starter"
              className="font-body text-sm text-cyan-DEFAULT no-underline"
            >
              Start free trial →
            </Link>
          </div>
        </div>

      </div>

      {/* Bottom CTA band — full width */}
      <div className="w-full bg-background-raised border-t border-background-border py-12 px-8 text-center">
        <h2 className="font-display font-bold text-3xl text-text-primary mb-3">Want to fix this?</h2>
        <p className="font-body text-base text-text-secondary mb-8 max-w-md mx-auto">
          Starter plan gives you all findings, monthly rescans, competitor comparison, and score trending. Cancel anytime.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup?plan=starter"
            className="bg-cyan-DEFAULT text-text-inverse font-body font-bold text-sm px-8 py-3 no-underline"
          >
            Start 14-day trial →
          </Link>
          <Link
            href="/pricing"
            className="border border-background-border text-text-secondary font-body text-sm px-8 py-3 no-underline hover:border-text-tertiary hover:text-text-primary transition-colors"
          >
            See all plans →
          </Link>
        </div>
        <p className="font-mono text-xs text-text-tertiary mt-4">
          Or get API access at $0.15/scan — no monthly fee
        </p>
      </div>
    </main>
  )
}
