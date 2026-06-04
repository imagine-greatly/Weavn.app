'use client'

import { useState } from 'react'
import Link from 'next/link'
import Label from '@/components/ui/Label'

// ── Data ──────────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  '1 free scan',
  'Full conversion score',
  'Top 3 findings',
  'Benchmark position',
]

const STARTER_FEATURES = [
  '20 scans / month',
  'Your site + auto competitor analysis',
  'webdoc scans 3 competitors in your category',
  'Full findings — all issues ranked',
  'Score trending over time',
  'Mobile score included',
  'Weekly email digest',
  'Single user',
]

const AGENCY_FEATURES = [
  '100 scans / month',
  'Unlimited client workspaces',
  'White-label report links',
  'No webdoc branding on reports',
  'Multi-page scanning (3 pages per job)',
  'Manual competitor selection per client',
  'Finding status tracking',
  'Score trending per client',
  'PDF export — your logo',
  '3 team seats',
]

const ENTERPRISE_FEATURES = [
  '500 scans / month',
  'Everything in Agency',
  '10 team seats',
  'Custom benchmarking set',
  'Full white-label subdomain',
  'reports.youragency.com',
  'Scan scheduling — full roster automation',
  'Score drop alerts',
  'Slack notifications',
  'Priority support',
  'Custom report CSS',
]

const FAQS = [
  {
    q: 'What counts as a scan?',
    a: 'One scan = one URL submitted to the API or through the dashboard. Multi-page jobs count as one scan per page analyzed. Batch submissions count as one scan per URL in the batch.',
  },
  {
    q: 'Do scans roll over month to month?',
    a: 'No. Scans reset on your billing date each month. If you need more, you can upgrade your plan at any time.',
  },
  {
    q: "What's the difference between the dashboard plans and API access?",
    a: 'The dashboard plans (Starter, Agency, Enterprise) give you a UI for managing scans, clients, and reports. API access is raw JSON — no UI, no client management, just the endpoint. They\'re separate products for different use cases.',
  },
  {
    q: 'Can I white-label the reports completely?',
    a: 'Agency plan removes all webdoc branding from report pages. Enterprise plan adds a custom subdomain so the report URL is on your domain, not ours.',
  },
  {
    q: 'How does the free competitor analysis work on Starter?',
    a: 'You submit your URL. webdoc identifies your industry category and automatically scans 3 representative competitor sites in the same category. You see your score alongside theirs — you don\'t choose the competitors, we select the most relevant ones.',
  },
  {
    q: 'Is there a contract or commitment?',
    a: 'No. All plans are month-to-month. Annual plans are billed upfront for 10 months (2 months free). Cancel any time — no questions.',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Bullet() {
  return (
    <span
      className="flex-shrink-0 bg-cyan-DEFAULT mt-[5px]"
      style={{ width: 4, height: 4, display: 'inline-block' }}
    />
  )
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="list-none p-0 m-0">
      {items.map(item => (
        <li key={item} className="flex items-start gap-3 mb-2.5">
          <Bullet />
          <span className="font-body text-sm text-text-secondary">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex flex-shrink-0 cursor-pointer border-0 transition-colors duration-200 ${
        checked ? 'bg-cyan-DEFAULT' : 'bg-background-border'
      }`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="absolute bg-background-base transition-transform duration-200"
        style={{
          width: 18,
          height: 18,
          top: 3,
          transform: checked ? 'translateX(23px)' : 'translateX(3px)',
        }}
      />
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq]   = useState<number | null>(null)

  const price = (monthly: number, annual: number) =>
    isAnnual ? annual : monthly

  return (
    <main className="bg-background-base min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-8 pt-24 pb-16 text-center">
        <Label>PRICING</Label>
        <h1 className="font-display font-bold text-5xl text-text-primary tracking-tight mt-3 mb-4">
          One engine. Three ways in.
        </h1>
        <p className="font-body text-lg text-text-secondary max-w-xl mx-auto">
          Start free. Upgrade when it makes sense. No contracts. Cancel anytime.
        </p>
      </div>

      {/* ── Billing toggle ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 justify-center mb-16">
        <span className="font-body text-sm text-text-secondary">Monthly</span>
        <Toggle checked={isAnnual} onChange={setIsAnnual} />
        <span className="flex items-center gap-2">
          <span className="font-body text-sm text-text-secondary">Annual</span>
          <span className="font-mono text-xs text-score-high bg-score-high/10 px-2 py-0.5">
            2 months free
          </span>
        </span>
      </div>

      {/* ── Pricing grid ────────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="grid grid-cols-4 gap-px bg-background-border">

          {/* Card 1 — Free */}
          <div className="bg-background-raised p-8">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">FREE</div>
            <div>
              <span className="font-display font-bold text-5xl text-text-primary">$0</span>
            </div>
            <div className="font-body text-text-tertiary text-sm mt-1">no account required</div>
            <p className="font-body text-sm text-text-secondary mt-4 mb-8">
              Paste any URL. See your score and top findings instantly. No signup.
            </p>
            <FeatureList items={FREE_FEATURES} />
            <Link
              href="/playground"
              className="block w-full border border-background-border text-text-secondary font-body font-semibold text-sm py-3 mt-8 text-center no-underline hover:border-text-tertiary hover:text-text-primary transition-colors duration-150"
            >
              Try free scan →
            </Link>
          </div>

          {/* Card 2 — Starter */}
          <div className="bg-background-raised p-8">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">STARTER</div>
            <div className="flex items-end gap-1">
              <span className="font-display font-bold text-5xl text-text-primary">
                ${price(49, 39)}
              </span>
              <span className="font-body text-text-tertiary text-sm mb-1">/ month</span>
            </div>
            {isAnnual && (
              <div className="font-mono text-xs text-score-high mt-1">$390 billed annually</div>
            )}
            <p className="font-body text-sm text-text-secondary mt-4 mb-8">
              For founders who want to understand and improve their own site over time.
            </p>
            <FeatureList items={STARTER_FEATURES} />
            <Link
              href="/signup?plan=starter"
              className="block w-full border border-background-border text-text-secondary font-body font-semibold text-sm py-3 mt-8 text-center no-underline hover:border-text-tertiary hover:text-text-primary transition-colors duration-150"
            >
              Start 14-day trial →
            </Link>
          </div>

          {/* Card 3 — Agency */}
          <div className="bg-background-raised p-8">
            <div className="flex items-center mb-4">
              <span className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest">AGENCY</span>
              <span className="inline-flex ml-3 font-mono text-xs bg-cyan-dim border border-cyan-DEFAULT text-cyan-DEFAULT px-2 py-0.5">
                MOST POPULAR
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="font-display font-bold text-5xl text-text-primary">
                ${price(149, 119)}
              </span>
              <span className="font-body text-text-tertiary text-sm mb-1">/ month</span>
            </div>
            {isAnnual && (
              <div className="font-mono text-xs text-score-high mt-1">$1,190 billed annually</div>
            )}
            <p className="font-body text-sm text-text-secondary mt-4 mb-8">
              For agencies delivering conversion intelligence to clients.
            </p>
            <FeatureList items={AGENCY_FEATURES} />
            <Link
              href="/signup?plan=agency"
              className="block w-full bg-cyan-DEFAULT text-text-inverse font-body font-bold text-sm py-3 mt-8 text-center no-underline hover:opacity-90 transition-opacity duration-150"
            >
              Start 14-day trial →
            </Link>
          </div>

          {/* Card 4 — Enterprise */}
          <div className="bg-background-raised p-8 border-t-2 border-cyan-DEFAULT glow-cyan">
            <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-4">ENTERPRISE</div>
            <div className="flex items-end gap-1">
              <span className="font-display font-bold text-5xl text-text-primary">
                ${price(499, 399)}
              </span>
              <span className="font-body text-text-tertiary text-sm mb-1">/ month</span>
            </div>
            {isAnnual && (
              <div className="font-mono text-xs text-score-high mt-1">$3,990 billed annually</div>
            )}
            <p className="font-body text-sm text-text-secondary mt-4 mb-8">
              For large agencies and teams running conversion intelligence at scale.
            </p>
            <FeatureList items={ENTERPRISE_FEATURES} />
            <Link
              href="/signup?plan=enterprise"
              className="block w-full border border-cyan-DEFAULT text-cyan-DEFAULT font-body font-bold text-sm py-3 mt-8 text-center no-underline hover:bg-cyan-dim transition-colors duration-150"
            >
              Start 14-day trial →
            </Link>
          </div>

        </div>
      </div>

      {/* ── Enterprise Plus band ─────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-8 mt-px">
        <div className="bg-background-raised border border-background-border px-8 py-10 flex items-center justify-between gap-8">
          <div>
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">ENTERPRISE PLUS</div>
            <div className="font-display font-bold text-2xl text-text-primary mb-2">
              Running 50+ clients or embedding this in your own product?
            </div>
            <p className="font-body text-sm text-text-secondary max-w-lg">
              Volume pricing, reseller arrangements, and white-label embedding for teams that have outgrown standard plans. Let&apos;s figure out what makes sense.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/contact"
              className="border border-background-border font-body font-semibold text-sm text-text-secondary px-8 py-3 no-underline hover:border-text-tertiary hover:text-text-primary transition-colors duration-150 inline-block"
            >
              Book a call →
            </Link>
          </div>
        </div>
      </div>

      {/* ── API band ─────────────────────────────────────────────────────── */}
      <div className="border-t border-background-border mt-px">
        <div className="max-w-[1280px] mx-auto px-8 py-8 flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">API ACCESS</div>
            <div className="font-display font-bold text-xl text-text-primary">$0.15 / scan</div>
            <p className="font-body text-sm text-text-secondary mt-1">
              Pay as you go. No monthly fee. No minimum. For developers who want raw JSON access.
            </p>
          </div>
          <Link
            href="/signup?plan=api"
            className="bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-sm px-6 py-3 no-underline hover:opacity-90 transition-opacity duration-150 flex-shrink-0"
          >
            Get API key →
          </Link>
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="max-w-[720px] mx-auto px-8 py-24">
        <Label>FAQ</Label>
        <h2 className="font-display font-bold text-3xl text-text-primary mt-3 mb-12">
          Common questions.
        </h2>

        {FAQS.map((faq, i) => (
          <div key={i} className="border-b border-background-border py-5">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex justify-between items-center cursor-pointer bg-transparent border-0 text-left gap-4"
            >
              <span className="font-body font-semibold text-sm text-text-primary">{faq.q}</span>
              <span
                className="flex-shrink-0 text-text-tertiary font-mono text-xs transition-transform duration-200"
                style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>
            {openFaq === i && (
              <p className="font-body text-sm text-text-secondary leading-relaxed mt-4">
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>

    </main>
  )
}
