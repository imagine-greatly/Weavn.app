'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Sub-components ────────────────────────────────────────────────────────────

function Bullet() {
  return (
    <span
      className="flex-shrink-0 bg-score-high mt-[5px]"
      style={{ width: 4, height: 4, display: 'inline-block' }}
    />
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors duration-200 border-0 flex-shrink-0 ${
        checked ? 'bg-cyan-DEFAULT' : 'bg-background-border'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 mb-2.5">
      <Bullet />
      <span className="font-body text-xs text-text-secondary">{text}</span>
    </li>
  )
}

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What counts as a scan?',
    a: 'Each URL submitted counts as one scan. If the same URL is scanned again within 24 hours and the page content hasn\'t changed, we return the cached result at no charge. You\'re never billed for the same unchanged page twice.',
  },
  {
    q: 'What\'s the difference between full and brief scans?',
    a: 'Full scans return everything — score, all findings with fix steps, copy rewrites, growth blueprint, and benchmarks. Brief scans return score, verdict, and top findings only. Brief scans cost significantly less and are designed for high-volume use cases like cold email enrichment and monitoring pipelines.',
  },
  {
    q: 'Can I mix full and brief scans?',
    a: 'Yes. The scan type is set per request via the finding_depth parameter. You\'re billed at the rate matching the scan type regardless of your volume tier.',
  },
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. Upgrade immediately, downgrade at end of billing period. No cancellation fees.',
  },
  {
    q: 'How does auto competitor analysis work?',
    a: 'On Starter we automatically identify three sites competing for your same customers based on your site category and content. You see exactly how your score compares across every dimension. Agency and above lets you select competitors manually per client.',
  },
  {
    q: 'What happens if I exceed my scan limit?',
    a: 'We notify you at 80% and 100% of your limit. Overages bill at $0.17 per scan — the same as pay-as-you-go API rate. Upgrade anytime to increase your monthly allowance.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'The Free tier gives you one full scan with no account required — try the product before committing. Paid plans start immediately. Cancel before your next billing date if it\'s not the right fit.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const p = (monthly: number, annual: number) => isAnnual ? annual : monthly

  return (
    <main className="bg-background-base min-h-screen">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-8 text-center">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">PRICING</div>
        <h1 className="font-display font-bold text-5xl text-text-primary tracking-tight mb-6">
          Transparent pricing.<br />No surprises.
        </h1>
        <p className="font-body text-xl text-text-secondary max-w-2xl mx-auto mb-4">
          Start free. Upgrade when you need more.
        </p>
        <p className="font-body text-sm text-text-tertiary max-w-2xl mx-auto">
          API access is always pay-per-scan — no monthly commitment required.
        </p>
      </div>

      {/* ── Billing toggle ─────────────────────────────────────────────────── */}
      <div className="mt-12 flex items-center justify-center gap-4">
        <span className="font-body text-sm text-text-secondary">Monthly</span>
        <Toggle checked={isAnnual} onChange={setIsAnnual} />
        <span className="flex items-center">
          <span className="font-body text-sm text-text-secondary">Annual</span>
          <span className="font-mono text-xs bg-cyan-dim text-cyan-DEFAULT px-2 py-0.5 ml-2">
            SAVE 20%
          </span>
        </span>
      </div>

      {/* ── Plan cards ─────────────────────────────────────────────────────── */}
      <div className="mt-16 grid grid-cols-4 gap-px bg-background-border max-w-7xl mx-auto">

        {/* FREE */}
        <div className="bg-background-raised p-8">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">FREE</div>
          <div className="font-display font-bold text-5xl text-text-primary mb-1">$0</div>
          <div className="font-body text-sm text-text-tertiary mb-8">no account required</div>
          <ul className="list-none p-0 m-0">
            {[
              '1 free scan',
              'Full conversion score 0–100',
              'Top 3 findings ranked by impact',
              'Industry benchmark position',
              'No account required',
            ].map(f => <FeatureItem key={f} text={f} />)}
          </ul>
          <Link
            href="/playground"
            className="block text-center w-full border border-background-border text-text-secondary font-mono text-xs tracking-widest py-3 mt-8 no-underline hover:border-text-tertiary transition-colors"
          >
            TRY FREE →
          </Link>
        </div>

        {/* STARTER */}
        <div className="bg-background-raised p-8">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">STARTER</div>
          <div className="font-display font-bold text-5xl text-text-primary mb-1">${p(49, 39)}</div>
          <div className="font-body text-sm text-text-tertiary mb-8">/ month</div>
          <ul className="list-none p-0 m-0">
            {[
              '20 scans / month',
              'Single site monitoring',
              'Auto competitor analysis (3 competitors selected automatically)',
              'Full findings ranked by impact',
              'Score trending over time',
              'Mobile conversion score',
              'Weekly email digest',
              'Single user',
            ].map(f => <FeatureItem key={f} text={f} />)}
          </ul>
          <Link
            href="/signup"
            className="block text-center w-full border border-background-border text-text-secondary font-mono text-xs tracking-widest py-3 mt-8 no-underline hover:border-text-tertiary transition-colors"
          >
            START TRIAL →
          </Link>
        </div>

        {/* AGENCY */}
        <div className="bg-background-raised p-8 relative">
          <div className="absolute top-0 right-0 bg-cyan-DEFAULT text-text-inverse font-mono text-xs px-3 py-1">
            POPULAR
          </div>
          <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-4">AGENCY</div>
          <div className="font-display font-bold text-5xl text-text-primary mb-1">${p(149, 119)}</div>
          <div className="font-body text-sm text-text-tertiary mb-8">/ month</div>
          <ul className="list-none p-0 m-0">
            {[
              '100 scans / month',
              'Unlimited client workspaces',
              'White-label report links',
              'Multi-page scanning (3 pages per job)',
              'Manual competitor selection per client',
              'Finding status tracking (open/fixed)',
              'Score trending per client',
              'PDF export with your logo',
              '3 team seats',
            ].map(f => <FeatureItem key={f} text={f} />)}
          </ul>
          <Link
            href="/signup"
            className="block text-center w-full bg-cyan-DEFAULT text-text-inverse font-mono text-xs font-bold tracking-widest py-3 mt-8 no-underline"
          >
            START TRIAL →
          </Link>
        </div>

        {/* ENTERPRISE */}
        <div className="bg-background-raised p-8">
          <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-4">ENTERPRISE</div>
          <div className="font-display font-bold text-5xl text-text-primary mb-1">${p(499, 399)}</div>
          <div className="font-body text-sm text-text-tertiary mb-8">/ month</div>
          <ul className="list-none p-0 m-0">
            {[
              '500 scans / month',
              'Everything in Agency',
              '10 team seats',
              'Custom benchmarking set',
              'Full white-label subdomain',
              'Scan scheduling + score alerts',
              'Slack notifications',
              'Priority support',
              'Custom report CSS',
            ].map(f => <FeatureItem key={f} text={f} />)}
          </ul>
          <Link
            href="/signup"
            className="block text-center w-full border border-cyan-DEFAULT text-cyan-DEFAULT font-mono text-xs font-bold tracking-widest py-3 mt-8 no-underline hover:bg-cyan-dim transition-colors"
          >
            START TRIAL →
          </Link>
        </div>

      </div>

      {/* ── API section ────────────────────────────────────────────────────── */}
      <div className="mt-px max-w-7xl mx-auto bg-background-raised border border-background-border px-12 py-12">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
          API ACCESS — DEVELOPERS
        </div>
        <h2 className="font-display font-bold text-3xl text-text-primary mb-4">
          Pay per scan. No subscription.
        </h2>
        <p className="font-body text-base text-text-secondary max-w-2xl mb-12">
          Raw JSON. 260+ checks. 90-second scan. Integrate into any product, pipeline, or automation.
          Cache hits never billed — scan the same unchanged page twice and the second call is free.
        </p>

        <div className="grid grid-cols-2 gap-16">

          {/* Full scan */}
          <div>
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">FULL SCAN</div>
            <p className="font-body text-xs text-text-secondary mb-6">
              Score, all dimensions, full findings with fix steps, copy rewrites, growth blueprint, benchmark data.
            </p>

            <div className="flex justify-between items-center py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-primary">Pay as you go</span>
              <span className="font-mono text-sm text-text-primary">$0.17 / scan</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-tertiary">500+ / month</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-background-base border border-background-border px-2 py-0.5 text-text-tertiary">SAVE 12%</span>
                <span className="font-mono text-sm text-text-tertiary">$0.15 / scan</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-tertiary">2,000+ / month</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-background-base border border-background-border px-2 py-0.5 text-text-tertiary">SAVE 24%</span>
                <span className="font-mono text-sm text-text-tertiary">$0.13 / scan</span>
              </div>
            </div>
            <div className="flex justify-between items-start py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-tertiary">10,000+ / month</span>
              <div className="text-right">
                <div className="font-mono text-sm text-cyan-DEFAULT">Custom</div>
                <div className="font-body text-xs text-text-tertiary">floor $0.11/scan</div>
              </div>
            </div>
          </div>

          {/* Brief scan */}
          <div>
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">BRIEF SCAN</div>
            <p className="font-body text-xs text-text-secondary mb-6">
              Score, verdict, and top findings only. No copy rewrites, no growth blueprint.
              Optimized for cold email enrichment, CRM tagging, and monitoring pipelines.
            </p>

            <div className="flex justify-between items-center py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-primary">Pay as you go</span>
              <span className="font-mono text-sm text-text-primary">$0.09 / scan</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-tertiary">500+ / month</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-background-base border border-background-border px-2 py-0.5 text-text-tertiary">SAVE 22%</span>
                <span className="font-mono text-sm text-text-tertiary">$0.07 / scan</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-tertiary">2,000+ / month</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-background-base border border-background-border px-2 py-0.5 text-text-tertiary">SAVE 33%</span>
                <span className="font-mono text-sm text-text-tertiary">$0.06 / scan</span>
              </div>
            </div>
            <div className="flex justify-between items-start py-3 border-b border-background-border">
              <span className="font-mono text-sm text-text-tertiary">10,000+ / month</span>
              <div className="text-right">
                <div className="font-mono text-sm text-cyan-DEFAULT">Custom</div>
                <div className="font-body text-xs text-text-tertiary">floor $0.05/scan</div>
              </div>
            </div>
          </div>

        </div>

        {/* API band footer */}
        <div className="mt-12 pt-8 border-t border-background-border flex items-center justify-between">
          <p className="font-body text-sm text-text-tertiary">
            Cache hits never billed. Committed volume invoiced monthly. Annual prepay available on 2,000+ tiers.
          </p>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/signup"
              className="bg-cyan-DEFAULT text-text-inverse font-mono text-xs tracking-widest px-6 py-3 no-underline text-center"
            >
              GET API KEY →
            </Link>
            <Link
              href="/docs/api"
              className="border border-background-border text-text-secondary font-mono text-xs tracking-widest px-6 py-3 no-underline text-center hover:border-text-tertiary transition-colors"
            >
              VIEW DOCS →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Enterprise Plus band ─────────────────────────────────────────────── */}
      <div className="mt-px max-w-7xl mx-auto bg-background-raised border border-background-border px-12 py-10 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">ENTERPRISE PLUS</div>
          <div className="font-display font-bold text-2xl text-text-primary mb-3">Book a call</div>
          <p className="font-body text-sm text-text-secondary max-w-lg">
            50+ clients, reseller access, or embedding webdoc intelligence in your own product.
            Custom contracts, dedicated infrastructure, and volume pricing below $0.10/scan.
          </p>
        </div>
        <Link
          href="mailto:devon@webdocai.com"
          className="bg-cyan-DEFAULT text-text-inverse font-mono text-xs tracking-widest px-8 py-4 no-underline flex-shrink-0"
        >
          LET&apos;S TALK →
        </Link>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <div className="mt-24 max-w-3xl mx-auto px-8 pb-32">
        <h2 className="font-display font-bold text-3xl text-text-primary mb-12">
          Common questions
        </h2>

        {FAQS.map((faq, i) => (
          <div key={i} className="border-t border-background-border py-6">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex justify-between items-start cursor-pointer bg-transparent border-0 text-left gap-4"
            >
              <span className="font-body font-semibold text-base text-text-primary mb-3">{faq.q}</span>
              <span
                className="flex-shrink-0 text-text-tertiary transition-transform duration-200 mt-0.5"
                style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>
            {openFaq === i && (
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>

    </main>
  )
}
