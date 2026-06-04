'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Sub-components ────────────────────────────────────────────────────────────

function Bullet() {
  return (
    <span
      className="flex-shrink-0 bg-score-high mt-[5px] mr-2"
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
    <li className="flex items-start mb-2.5">
      <Bullet />
      <span className="font-body text-xs text-text-secondary">{text}</span>
    </li>
  )
}

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What counts as a scan?',
    a: "Each URL submitted to the API or through the dashboard counts as one scan. If the same URL is submitted again within 24 hours and the page content hasn't changed, we return the cached result at no charge. You're never billed for the same unchanged page twice.",
  },
  {
    q: "What's a brief scan?",
    a: "Brief scans return score, verdict, and top findings only — no copy rewrites, no growth blueprint. They cost significantly less than full scans and are designed for high-volume use cases like cold email enrichment, CRM tagging, and monitoring pipelines. Set finding_depth: \"brief\" in your API request.",
  },
  {
    q: 'Can I mix full and brief scans?',
    a: "Yes. Scan type is set per request via the finding_depth parameter. You're billed at the rate matching the scan type regardless of your volume tier.",
  },
  {
    q: "What's the difference between dashboard and API plans?",
    a: "Dashboard plans (Starter, Agency, Enterprise) give you a full UI — reports, client workspaces, white-label output, team features. API plans give you raw JSON access for building on top of webdoc. Agency plan customers get 100 bundled API calls per month. Heavy API users should be on an API plan.",
  },
  {
    q: 'How does auto competitor analysis work?',
    a: "On Starter we automatically identify three sites competing for your same customers based on your site category and content. You see how your conversion score compares across every dimension. Agency and above lets you select competitors manually per client.",
  },
  {
    q: 'Can I change plans anytime?',
    a: "Yes. Upgrade immediately, downgrade at end of billing period. No cancellation fees ever.",
  },
  {
    q: 'What happens if I exceed my scan limit?',
    a: "We notify you at 80% and 100% of your limit. Overages bill automatically at your tier's overage rate. Upgrade anytime to increase your monthly allowance.",
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: "The Free dashboard tier gives you one full scan with no account. The API Playground gives you 25 scans with no card required. Paid plans start immediately — cancel before your next billing date if it's not the right fit.",
  },
]

// ── Overage table data ────────────────────────────────────────────────────────

const OVERAGE_ROWS = [
  { plan: 'Playground', included: '25 scans', overage: '$0.25/scan', brief: '$0.15/scan' },
  { plan: 'Dev',        included: '300/mo',   overage: '$0.19/scan', brief: '$0.12/scan' },
  { plan: 'Builder',    included: '1,000/mo', overage: '$0.17/scan', brief: '$0.10/scan' },
  { plan: 'Scale',      included: '3,000/mo', overage: '$0.15/scan', brief: '$0.09/scan' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const p = (monthly: number, annual: number) => isAnnual ? annual : monthly

  return (
    <main className="bg-background-base min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-8 text-center">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">PRICING</div>
        <h1 className="font-display font-bold text-5xl text-text-primary tracking-tight mb-6">
          Two products.<br />One engine.
        </h1>
        <p className="font-body text-xl text-text-secondary max-w-2xl mx-auto mb-4">
          A dashboard for teams and agencies.<br />
          An API for developers.<br />
          Same intelligence underneath.
        </p>
        <div className="flex items-center justify-center gap-6 mt-8">
          <a
            href="#dashboard"
            className="border border-background-border font-mono text-xs tracking-widest px-6 py-3 text-text-secondary no-underline hover:border-text-tertiary transition-colors"
          >
            For teams →
          </a>
          <a
            href="#api"
            className="border border-background-border font-mono text-xs tracking-widest px-6 py-3 text-text-secondary no-underline hover:border-text-tertiary transition-colors"
          >
            For developers →
          </a>
        </div>
      </div>

      {/* ── Dashboard Section ────────────────────────────────────────────────── */}
      <div id="dashboard" className="pt-24 pb-16 border-t border-background-border">
        <div className="max-w-7xl mx-auto px-8">

          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">FOR TEAMS &amp; AGENCIES</div>
          <h2 className="font-display font-bold text-4xl text-text-primary tracking-tight mb-4">
            Start free. Scale when ready.
          </h2>
          <p className="font-body text-sm text-text-tertiary mb-6">No contracts. Cancel anytime.</p>

          {/* Monthly / Annual toggle */}
          <div className="flex items-center gap-4 mb-16">
            <span className="font-body text-sm text-text-secondary">Monthly</span>
            <Toggle checked={isAnnual} onChange={setIsAnnual} />
            <span className="flex items-center gap-1">
              <span className="font-body text-sm text-text-secondary">Annual</span>
              <span className="font-mono text-xs bg-cyan-dim text-cyan-DEFAULT px-2 py-0.5 ml-1">SAVE 20%</span>
            </span>
          </div>

          {/* Dashboard cards */}
          <div className="grid grid-cols-4 gap-px bg-background-border">

            {/* FREE */}
            <div className="bg-background-raised p-8">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">FREE</div>
              <div className="font-display font-bold text-5xl text-text-primary mb-1">$0</div>
              <div className="font-body text-sm text-text-tertiary mb-8">no account required</div>
              <ul className="list-none p-0 m-0">
                {[
                  '1 scan included',
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
                  'Auto competitor analysis (3 competitors, auto-selected)',
                  'Full findings ranked by impact',
                  'Score trending over time',
                  'Mobile conversion score',
                  'Weekly email digest',
                  'Single user',
                ].map(f => <FeatureItem key={f} text={f} />)}
              </ul>
              <Link
                href="/signup?plan=starter"
                className="block text-center w-full border border-background-border text-text-secondary font-mono text-xs tracking-widest py-3 mt-8 no-underline hover:border-text-tertiary transition-colors"
              >
                START TRIAL →
              </Link>
            </div>

            {/* AGENCY — featured */}
            <div className="bg-background-raised p-8 relative">
              <div className="absolute top-0 right-0 bg-cyan-DEFAULT text-text-inverse font-mono text-xs px-3 py-1">POPULAR</div>
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
                  'Finding status tracking (open / fixed)',
                  'Score trending per client',
                  'PDF export with your logo',
                  '3 team seats',
                  '100 API calls bundled',
                ].map(f => <FeatureItem key={f} text={f} />)}
              </ul>
              <Link
                href="/signup?plan=agency"
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
                  'Scan scheduling across roster',
                  'Score drop alerts',
                  'Slack notifications',
                  'Priority support',
                  'Custom report CSS',
                ].map(f => <FeatureItem key={f} text={f} />)}
              </ul>
              <Link
                href="/signup?plan=enterprise"
                className="block text-center w-full border border-cyan-DEFAULT text-cyan-DEFAULT font-mono text-xs font-bold tracking-widest py-3 mt-8 no-underline hover:bg-cyan-dim transition-colors"
              >
                START TRIAL →
              </Link>
            </div>

          </div>

          {/* Enterprise Plus band */}
          <div className="mt-px bg-background-raised border border-background-border px-8 py-6 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-1">ENTERPRISE PLUS</div>
              <div className="font-display font-bold text-xl text-text-primary">Book a call</div>
              <p className="font-body text-sm text-text-secondary mt-1 max-w-lg">
                50+ clients, reseller access, or embedding webdoc intelligence in your own product.
                Custom contracts and dedicated support.
              </p>
            </div>
            <Link
              href="mailto:devon@webdocai.com"
              className="bg-cyan-DEFAULT text-text-inverse font-mono text-xs tracking-widest px-6 py-3 no-underline flex-shrink-0"
            >
              LET&apos;S TALK →
            </Link>
          </div>

        </div>
      </div>

      {/* ── API Section ──────────────────────────────────────────────────────── */}
      <div id="api" className="pt-24 pb-16 border-t border-background-border">
        <div className="max-w-7xl mx-auto px-8">

          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">FOR DEVELOPERS</div>
          <h2 className="font-display font-bold text-4xl text-text-primary tracking-tight mb-4">
            Infrastructure pricing.<br />Pay for what you use.
          </h2>
          <p className="font-body text-sm text-text-tertiary mb-4">
            Monthly plans with included scans.<br />Overage billed per scan at your tier rate.
          </p>
          <p className="font-body text-xs text-cyan-DEFAULT mb-16">
            Cache hits never billed — scan the same unchanged page twice and the second call costs nothing.
          </p>

          {/* API cards */}
          <div className="grid grid-cols-4 gap-px bg-background-border">

            {/* PLAYGROUND */}
            <div className="bg-background-raised p-8">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">PLAYGROUND</div>
              <div className="font-display font-bold text-5xl text-text-primary mb-1">Free</div>
              <div className="font-body text-sm text-text-tertiary mb-8">25 scans to start</div>
              <ul className="list-none p-0 m-0">
                {[
                  '25 scans, no card required',
                  'Full API response on every scan',
                  '$0.25 / scan after 25',
                  'No monthly commitment',
                ].map(f => <FeatureItem key={f} text={f} />)}
              </ul>
              <Link
                href="/signup?plan=playground"
                className="block text-center w-full border border-background-border text-text-secondary font-mono text-xs tracking-widest py-3 mt-8 no-underline hover:border-text-tertiary transition-colors"
              >
                GET API KEY →
              </Link>
            </div>

            {/* DEV */}
            <div className="bg-background-raised p-8">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">DEV</div>
              <div className="font-display font-bold text-5xl text-text-primary mb-1">$29</div>
              <div className="font-body text-sm text-text-tertiary mb-8">/ month</div>
              <ul className="list-none p-0 m-0">
                {[
                  '300 scans / month',
                  '$0.19 / scan overage',
                  'Full scan access',
                  'Webhooks',
                  'Standard support',
                ].map(f => <FeatureItem key={f} text={f} />)}
              </ul>
              <Link
                href="/signup?plan=dev"
                className="block text-center w-full border border-background-border text-text-secondary font-mono text-xs tracking-widest py-3 mt-8 no-underline hover:border-text-tertiary transition-colors"
              >
                GET STARTED →
              </Link>
            </div>

            {/* BUILDER — featured */}
            <div className="bg-background-raised p-8 relative">
              <div className="absolute top-0 right-0 bg-cyan-DEFAULT text-text-inverse font-mono text-xs px-3 py-1">POPULAR</div>
              <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-4">BUILDER</div>
              <div className="font-display font-bold text-5xl text-text-primary mb-1">$99</div>
              <div className="font-body text-sm text-text-tertiary mb-8">/ month</div>
              <ul className="list-none p-0 m-0">
                {[
                  '1,000 scans / month',
                  '$0.17 / scan overage',
                  'Full + brief scan access',
                  'Async mode',
                  'Batch endpoint (10 URLs)',
                  'Priority processing',
                ].map(f => <FeatureItem key={f} text={f} />)}
              </ul>
              <Link
                href="/signup?plan=builder"
                className="block text-center w-full bg-cyan-DEFAULT text-text-inverse font-mono text-xs font-bold tracking-widest py-3 mt-8 no-underline"
              >
                GET STARTED →
              </Link>
            </div>

            {/* SCALE */}
            <div className="bg-background-raised p-8">
              <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-4">SCALE</div>
              <div className="font-display font-bold text-5xl text-text-primary mb-1">$249</div>
              <div className="font-body text-sm text-text-tertiary mb-8">/ month</div>
              <ul className="list-none p-0 m-0">
                {[
                  '3,000 scans / month',
                  '$0.15 / scan overage',
                  'Everything in Builder',
                  'Dedicated processing',
                  'Volume reporting',
                ].map(f => <FeatureItem key={f} text={f} />)}
              </ul>
              <Link
                href="/signup?plan=scale"
                className="block text-center w-full border border-cyan-DEFAULT text-cyan-DEFAULT font-mono text-xs font-bold tracking-widest py-3 mt-8 no-underline hover:bg-cyan-dim transition-colors"
              >
                GET STARTED →
              </Link>
            </div>

          </div>

          {/* Overage rate table */}
          <div className="mt-px bg-background-raised border border-background-border px-8 py-8">
            <div className="flex justify-between font-mono text-xs text-text-tertiary uppercase tracking-widest pb-4 border-b border-background-border">
              <span className="w-1/4">PLAN</span>
              <span className="w-1/4">INCLUDED</span>
              <span className="w-1/4">OVERAGE RATE</span>
              <span className="w-1/4 text-right">BRIEF SCAN OVERAGE</span>
            </div>
            {OVERAGE_ROWS.map(row => (
              <div key={row.plan} className="flex justify-between font-mono text-sm py-4 border-b border-background-border last:border-0">
                <span className="w-1/4 text-text-primary">{row.plan}</span>
                <span className="w-1/4 text-text-secondary">{row.included}</span>
                <span className="w-1/4 text-text-secondary">{row.overage}</span>
                <span className="w-1/4 text-right text-text-secondary">{row.brief}</span>
              </div>
            ))}
            <p className="font-body text-xs text-text-tertiary mt-4">
              Brief scans return score, verdict, and findings only — no copy rewrites or growth blueprint.
              Optimized for high-volume pipelines and cold email enrichment.
            </p>
          </div>

          {/* Enterprise API band */}
          <div className="mt-px bg-background-raised border border-background-border px-8 py-8 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">API ENTERPRISE</div>
              <div className="font-display font-bold text-2xl text-text-primary mb-2">10,000+ scans / month</div>
              <p className="font-body text-sm text-text-secondary max-w-lg">
                Custom contract. Floor $0.11/scan full, $0.05/scan brief. SLA, dedicated support,
                platform embedding, annual prepay available.
              </p>
            </div>
            <Link
              href="mailto:devon@webdocai.com"
              className="border border-background-border text-text-secondary font-mono text-xs tracking-widest px-6 py-3 no-underline hover:border-text-tertiary transition-colors flex-shrink-0"
            >
              TALK TO US →
            </Link>
          </div>

        </div>
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
              <p className="font-body text-sm text-text-secondary leading-relaxed">{faq.a}</p>
            )}
          </div>
        ))}
      </div>

    </main>
  )
}
