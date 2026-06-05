import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Developer Pricing — webdoc.ai API',
  description: 'API pricing for webdoc.ai. POST a URL, get structured JSON. 264 checks across 27 categories. From $0.15/scan. 25 free scans to start.',
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start mb-2.5">
      <span
        className="flex-shrink-0 bg-cyan-DEFAULT mt-[5px] mr-2"
        style={{ width: 4, height: 4, display: 'inline-block' }}
      />
      <span className="font-body text-xs text-text-secondary">{text}</span>
    </li>
  )
}

const RATE_TIERS = [
  { plan: 'PAYG',       rate: '$0.25', sub: 'no subscription' },
  { plan: 'DEV',        rate: '$0.19', sub: '$29/mo' },
  { plan: 'BUILDER',    rate: '$0.17', sub: '$99/mo' },
  { plan: 'SCALE',      rate: '$0.15', sub: '$249/mo' },
  { plan: 'ENTERPRISE', rate: '$0.11', sub: 'custom' },
]

const KEY_FACTS = [
  {
    title: 'Cache hits never billed',
    detail: 'Scan the same URL twice within 24 hours with no page changes — the second call returns the cached result at $0.00. You are never charged for unchanged pages.',
  },
  {
    title: 'Async mode available',
    detail: 'Add "mode": "async" to any scan request. The API returns a scan ID immediately and delivers results to your registered webhook endpoint when complete.',
  },
  {
    title: 'Batch endpoint — up to 10 URLs',
    detail: 'POST /api/v1/scan/batch with an array of up to 10 URLs. All pages scan in parallel; results are delivered to your webhook as a single payload.',
  },
  {
    title: 'Webhook support',
    detail: 'Register an endpoint for scan.completed and scan.failed events. Delivery retries with exponential backoff. Full delivery log in your developer portal.',
  },
]

export default function DevelopersPage() {
  return (
    <main className="bg-background-base min-h-screen">

      {/* ── Positioning statement ────────────────────────────────────────────── */}
      <div className="border-b border-background-border">
        <div className="max-w-5xl mx-auto px-8 pt-24 pb-16">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">DEVELOPER PRICING</div>
          <h1 className="font-display font-bold text-5xl text-text-primary tracking-tight mb-6">
            POST a URL.<br />
            Get structured JSON.<br />
            <span className="text-cyan-DEFAULT">~90 seconds.</span>
          </h1>
          <p className="font-body text-xl text-text-secondary max-w-2xl mb-8">
            The webdoc API runs 264 checks across 27 categories and returns a predictable JSON schema —
            conversion score, ranked findings, AI-rewritten copy, and industry benchmarks.
            No dashboard required.
          </p>
          <div className="bg-background-subtle border border-background-border p-4 max-w-xl mb-8">
            <pre className="font-mono text-sm m-0 leading-relaxed whitespace-pre-wrap">
              <span className="text-cyan-DEFAULT">curl</span>
              <span className="text-text-tertiary">{' -X POST https://webdocai.com/api/v1/scan \\\n  -H "Authorization: Bearer '}</span>
              <span className="text-score-high">wdoc_live_••••</span>
              <span className="text-text-tertiary">{'" \\\n  -d \'{"url": "'}</span>
              <span className="text-score-high">https://your-site.com</span>
              <span className="text-text-tertiary">{"\"}'"}  </span>
            </pre>
          </div>
          <div className="flex gap-4">
            <Link
              href="/playground"
              className="bg-cyan-DEFAULT text-text-inverse font-mono text-xs font-bold tracking-widest px-6 py-3 no-underline"
            >
              TRY IN PLAYGROUND →
            </Link>
            <Link
              href="/docs/api"
              className="border border-background-border text-text-secondary font-mono text-xs tracking-widest px-6 py-3 no-underline hover:border-text-tertiary transition-colors"
            >
              VIEW API DOCS →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Per-scan rate callout ────────────────────────────────────────────── */}
      <div className="border-b border-background-border">
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-6">COST PER SCAN</div>
          <div className="flex gap-px mb-3">
            {RATE_TIERS.map((tier) => (
              <div
                key={tier.plan}
                className="flex-1 bg-background-raised border border-background-border p-4 text-center"
              >
                <div className="font-display font-bold text-2xl text-text-primary mb-1">{tier.rate}</div>
                <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-1">{tier.plan}</div>
                <div className="font-mono text-xs text-text-tertiary">{tier.sub}</div>
              </div>
            ))}
          </div>
          <div className="h-px bg-gradient-to-r from-severity-critical to-score-high" />
          <div className="flex justify-between mt-2">
            <span className="font-mono text-xs text-text-tertiary">Pay-as-you-go</span>
            <span className="font-mono text-xs text-text-tertiary">Enterprise floor</span>
          </div>
        </div>
      </div>

      {/* ── API pricing cards ────────────────────────────────────────────────── */}
      <div id="pricing" className="border-b border-background-border">
        <div className="max-w-7xl mx-auto px-8 py-16">

          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">API PLANS</div>
          <p className="font-body text-sm text-text-tertiary mb-4">
            Monthly plans with included scans. Overage billed per scan at your tier rate.
          </p>
          <p className="font-mono text-xs text-cyan-DEFAULT mb-16">
            Cache hits never billed — scan the same unchanged page twice and the second call costs nothing.
          </p>

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
                  'Async mode',
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
                  'Batch endpoint (up to 10 URLs)',
                  'Webhooks',
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

          {/* Enterprise band */}
          <div className="mt-px bg-background-raised border border-background-border px-8 py-8 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">ENTERPRISE</div>
              <div className="font-display font-bold text-2xl text-text-primary mb-2">Custom pricing</div>
              <p className="font-body text-sm text-text-secondary max-w-lg">
                10,000+ scans / month. Floor $0.11/scan. Custom contract, SLA, dedicated infrastructure,
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

      {/* ── Key facts ────────────────────────────────────────────────────────── */}
      <div className="border-b border-background-border">
        <div className="max-w-5xl mx-auto px-8 py-16">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-8">KEY FACTS</div>
          <div className="grid grid-cols-2 gap-px bg-background-border">
            {KEY_FACTS.map(fact => (
              <div key={fact.title} className="bg-background-raised p-8">
                <div className="font-mono text-sm text-text-primary mb-3">{fact.title}</div>
                <div className="font-body text-sm text-text-secondary leading-relaxed">{fact.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">GET STARTED</div>
        <h2 className="font-display font-bold text-3xl text-text-primary mb-6">
          25 free scans. No card required.
        </h2>
        <div className="flex gap-4 mb-12">
          <Link
            href="/playground"
            className="bg-cyan-DEFAULT text-text-inverse font-mono text-xs font-bold tracking-widest px-6 py-3 no-underline"
          >
            TRY IN PLAYGROUND →
          </Link>
          <Link
            href="/docs/api"
            className="border border-background-border text-text-secondary font-mono text-xs tracking-widest px-6 py-3 no-underline hover:border-text-tertiary transition-colors"
          >
            VIEW API DOCS →
          </Link>
        </div>
        <div className="pt-8 border-t border-background-border">
          <p className="font-body text-sm text-text-tertiary">
            Need a dashboard UI for your team or clients?{' '}
            <Link href="/pricing" className="text-cyan-DEFAULT no-underline hover:opacity-80">
              See team and agency plans →
            </Link>
          </p>
        </div>
      </div>

    </main>
  )
}
