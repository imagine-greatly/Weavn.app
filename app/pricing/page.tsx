'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type CellVal =
  | { type: 'check' }
  | { type: 'dash' }
  | { type: 'text'; value: string }

interface TableRow {
  feature: string
  free: CellVal
  starter: CellVal
  agency: CellVal
  enterprise: CellVal
}

interface TableGroup {
  label: string
  rows: TableRow[]
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What counts as a scan?',
    a: 'Each URL you submit counts as one scan. Rescanning the same URL counts as a new scan. Cache hits within 24 hours of an identical scan are free and do not consume your monthly allowance.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Plan changes take effect immediately. Upgrades are prorated. Downgrades take effect at the next billing cycle.',
  },
  {
    q: 'What are the 100 bundled API calls on Agency?',
    a: 'The Agency plan includes 100 API calls per month that can be used programmatically via the API — useful for automating client scans or integrating webdoc into your own workflow. Additional API calls beyond 100 are billed at $0.19/scan.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'Yes — Starter and Agency both include a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'How does white-labeling work?',
    a: 'Agency plan generates shareable report links with your client\'s domain context and your branding. No "powered by webdoc" in client-facing views.',
  },
  {
    q: 'What happens if I hit my scan limit?',
    a: 'Scans stop until your next billing cycle resets your allowance. You can upgrade at any time to immediately unlock more scans.',
  },
]

const TABLE_GROUPS: TableGroup[] = [
  {
    label: 'SCANNING',
    rows: [
      {
        feature: 'Scans per month',
        free: { type: 'text', value: '3' },
        starter: { type: 'text', value: '50' },
        agency: { type: 'text', value: '200' },
        enterprise: { type: 'text', value: 'Unlimited' },
      },
      {
        feature: 'Check depth',
        free: { type: 'text', value: '307 checks' },
        starter: { type: 'text', value: '307' },
        agency: { type: 'text', value: '307' },
        enterprise: { type: 'text', value: '307' },
      },
      {
        feature: 'Site types',
        free: { type: 'text', value: 'All' },
        starter: { type: 'text', value: 'All' },
        agency: { type: 'text', value: 'All' },
        enterprise: { type: 'text', value: 'All' },
      },
    ],
  },
  {
    label: 'REPORTS',
    rows: [
      {
        feature: 'Report history',
        free: { type: 'text', value: '7 days' },
        starter: { type: 'text', value: '30 days' },
        agency: { type: 'text', value: '90 days' },
        enterprise: { type: 'text', value: '1 year' },
      },
      {
        feature: 'White-label reports',
        free: { type: 'dash' },
        starter: { type: 'dash' },
        agency: { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'CSV export',
        free: { type: 'dash' },
        starter: { type: 'check' },
        agency: { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'PDF export',
        free: { type: 'dash' },
        starter: { type: 'dash' },
        agency: { type: 'check' },
        enterprise: { type: 'check' },
      },
    ],
  },
  {
    label: 'AGENCY FEATURES',
    rows: [
      {
        feature: 'Client workspaces',
        free: { type: 'dash' },
        starter: { type: 'dash' },
        agency: { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'Multi-page scanning',
        free: { type: 'dash' },
        starter: { type: 'dash' },
        agency: { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'API access (bundled)',
        free: { type: 'dash' },
        starter: { type: 'dash' },
        agency: { type: 'text', value: '100 calls' },
        enterprise: { type: 'text', value: 'Custom' },
      },
    ],
  },
  {
    label: 'SUPPORT',
    rows: [
      {
        feature: 'Support type',
        free: { type: 'text', value: 'Community' },
        starter: { type: 'text', value: 'Email' },
        agency: { type: 'text', value: 'Priority' },
        enterprise: { type: 'text', value: 'Dedicated' },
      },
      {
        feature: 'SLA',
        free: { type: 'dash' },
        starter: { type: 'dash' },
        agency: { type: 'check' },
        enterprise: { type: 'text', value: 'Custom' },
      },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Cell({ val }: { val: CellVal }): JSX.Element {
  if (val.type === 'check') return <span style={{ color: '#00E676' }}>✓</span>
  if (val.type === 'dash') return <span style={{ color: '#3A3A52' }}>—</span>
  return <span className="text-text-secondary">{val.value}</span>
}

function Bullet({ text, cyan }: { text: string; cyan?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 mb-2">
      <span
        className="flex-shrink-0 rounded-full mt-[7px]"
        style={{ width: 4, height: 4, backgroundColor: cyan ? '#00C8FF' : '#3A3A52' }}
      />
      <span style={{ fontFamily: 'var(--font-stack-sans)', fontSize: 13, lineHeight: 1.65, color: '#8E8EA0' }}>
        {text}
      </span>
    </li>
  )
}

function InheritRow({ text }: { text: string }) {
  return (
    <li className="font-ui-label mb-3 mt-1" style={{ color: '#3A3A52', listStyle: 'none' }}>
      {text}
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const price = (monthly: number) => (isAnnual ? Math.round(monthly * 0.8) : monthly)

  return (
    <main className="bg-background-base min-h-screen">

      {/* ── 1. Hero band ─────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 max-w-4xl mx-auto px-8 text-center">
        <div className="section-label mb-4">PLANS &amp; PRICING</div>
        <h1
          className="section-headline mb-4"
          style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1.5px' }}
        >
          Start free. Scale when ready.
        </h1>
        <p className="section-subhead max-w-2xl mx-auto mb-10">
          Four plans for founders, growing teams, and agencies. No setup fees. Cancel anytime.
        </p>

        {/* Monthly / Annual toggle pills */}
        <div className="inline-flex items-center p-1 bg-background-raised border border-background-border">
          <button
            onClick={() => setIsAnnual(false)}
            className={`font-ui-label px-5 py-2 border-0 cursor-pointer transition-colors duration-150 ${
              !isAnnual
                ? 'bg-background-interactive text-text-primary'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`font-ui-label px-5 py-2 border-0 cursor-pointer transition-colors duration-150 flex items-center gap-2 ${
              isAnnual
                ? 'bg-background-interactive text-text-primary'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Annual
            <span
              className="font-ui-label px-2 py-0.5"
              style={{ fontSize: 9, backgroundColor: 'rgba(0,230,118,0.15)', color: '#00E676' }}
            >
              SAVE 20%
            </span>
          </button>
        </div>
      </section>

      {/* ── 2. Pricing cards ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* FREE */}
          <div className="landing-card-electric border border-background-border bg-background-raised p-8 flex flex-col">
            <div className="font-ui-label text-text-secondary mb-4">FREE</div>
            <div className="font-score text-5xl text-text-primary mb-1">$0</div>
            <div className="font-mono text-xs text-text-secondary mb-8">forever</div>
            <ul className="list-none p-0 m-0 flex-1">
              <Bullet text="3 scans per month" />
              <Bullet text="Full 307-check audit" />
              <Bullet text="Score + findings" />
              <Bullet text="7-day report history" />
              <Bullet text="Community support" />
            </ul>
            <Link
              href="/scan"
              className="block text-center font-ui-label text-text-secondary py-3 mt-8 no-underline hover:text-text-primary transition-colors duration-150"
            >
              Start free →
            </Link>
          </div>

          {/* STARTER */}
          <div className="landing-card-electric border border-background-border bg-background-raised p-8 flex flex-col">
            <div className="font-ui-label text-text-secondary mb-4">STARTER</div>
            <div className="font-score text-5xl text-text-primary mb-1">${price(49)}</div>
            <div className="font-mono text-xs text-text-secondary mb-8">per month</div>
            <ul className="list-none p-0 m-0 flex-1">
              <InheritRow text="Everything in Free, plus:" />
              <Bullet text="50 scans per month" />
              <Bullet text="Priority processing" />
              <Bullet text="30-day report history" />
              <Bullet text="Email support" />
              <Bullet text="CSV export" />
            </ul>
            <Link
              href="/signup?plan=starter"
              className="block text-center font-ui-label border border-[#00C8FF]/30 text-[#00C8FF] py-3 mt-8 no-underline hover:border-[#00C8FF]/60 transition-colors duration-150"
            >
              Start free trial →
            </Link>
          </div>

          {/* AGENCY — elevated / recommended */}
          <div className="landing-card-electric relative border border-[#00C8FF]/30 bg-background-interactive glow-ambient p-8 flex flex-col mt-3 lg:mt-0">
            <div
              className="absolute font-ui-label px-3 py-1 whitespace-nowrap"
              style={{ top: -12, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#00C8FF', color: '#050810' }}
            >
              MOST POPULAR
            </div>
            <div className="font-ui-label mb-4" style={{ color: '#00C8FF' }}>AGENCY</div>
            <div className="font-score text-5xl text-text-primary mb-1">${price(149)}</div>
            <div className="font-mono text-xs text-text-secondary mb-8">per month</div>
            <ul className="list-none p-0 m-0 flex-1">
              <InheritRow text="Everything in Starter, plus:" />
              <Bullet text="200 scans per month" />
              <Bullet text="White-label report links" />
              <Bullet text="Client workspaces" />
              <Bullet text="100 bundled API calls/month" cyan />
              <Bullet text="Multi-page scanning" />
              <Bullet text="Priority support + SLA" />
            </ul>
            <Link
              href="/signup?plan=agency"
              className="block text-center font-ui-label py-3 mt-8 no-underline hover:opacity-90 transition-opacity duration-150"
              style={{ backgroundColor: '#00C8FF', color: '#050810' }}
            >
              Start free trial →
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div className="landing-card-electric border border-background-border bg-background-raised p-8 flex flex-col">
            <div className="font-ui-label text-text-secondary mb-4">ENTERPRISE</div>
            <div className="font-score text-5xl text-text-primary mb-1">${price(499)}</div>
            <div className="font-mono text-xs text-text-secondary mb-8">per month</div>
            <ul className="list-none p-0 m-0 flex-1">
              <InheritRow text="Everything in Agency, plus:" />
              <Bullet text="Unlimited scans" />
              <Bullet text="Custom integrations" />
              <Bullet text="Dedicated account manager" />
              <Bullet text="SSO + team management" />
              <Bullet text="Custom SLA" />
              <Bullet text="Invoice billing" />
            </ul>
            <Link
              href="mailto:hello@webdocai.com"
              className="block text-center font-ui-label text-text-secondary py-3 mt-8 no-underline hover:text-text-primary transition-colors duration-150"
            >
              Talk to us →
            </Link>
          </div>

        </div>
      </section>

      {/* ── 3. API callout band ──────────────────────────────────────────────── */}
      <section
        className="py-6 px-8"
        style={{
          background: '#0D1420',
          borderTop: '1px solid rgba(0, 200, 255, 0.15)',
          borderBottom: '1px solid rgba(0, 200, 255, 0.15)',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: '#00C8FF' }}>
              BUILDING WITH THE API?
            </p>
            <p className="font-body text-sm" style={{ color: '#8E8EA0' }}>
              Developer plans from $0.15/scan. No dashboard required.
            </p>
          </div>
          <Link
            href="/developers#pricing"
            className="font-ui-label no-underline w-full sm:w-auto text-center sm:text-left flex-shrink-0"
            style={{
              border: '1px solid rgba(0, 200, 255, 0.4)',
              background: 'rgba(0, 200, 255, 0.08)',
              color: '#00C8FF',
              padding: '12px 24px',
              display: 'block',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,200,255,0.7)'
              e.currentTarget.style.background = 'rgba(0,200,255,0.15)'
              e.currentTarget.style.boxShadow = 'var(--cyan-glow-active)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,200,255,0.4)'
              e.currentTarget.style.background = 'rgba(0,200,255,0.08)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            See developer pricing →
          </Link>
        </div>
      </section>

      {/* ── 4. Comparison table ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        <button
          onClick={() => setShowTable(v => !v)}
          className="font-ui-label text-text-secondary cursor-pointer w-full text-center bg-transparent border-0 hover:text-text-primary transition-colors duration-150"
        >
          Compare all features {showTable ? '↑' : '↓'}
        </button>

        <div
          style={{
            overflow: 'hidden',
            transition: 'max-height 0.4s ease',
            maxHeight: showTable ? '2000px' : '0',
          }}
        >
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[580px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 pr-4 w-[36%]" />
                  {['FREE', 'STARTER', 'AGENCY', 'ENTERPRISE'].map(plan => (
                    <th key={plan} className="font-ui-label text-text-secondary text-center py-3 px-4">
                      {plan}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_GROUPS.flatMap((group, gi) => [
                  <tr key={`g-${gi}`}>
                    <td colSpan={5} className="pt-8 pb-2">
                      <span className="font-ui-label" style={{ color: '#3A3A52' }}>{group.label}</span>
                    </td>
                  </tr>,
                  ...group.rows.map((row, ri) => (
                    <tr
                      key={`r-${gi}-${ri}`}
                      style={{ backgroundColor: ri % 2 === 1 ? 'rgba(10,15,26,0.7)' : 'transparent' }}
                    >
                      <td
                        className="font-body text-sm text-text-secondary py-3 pr-4 border-b"
                        style={{ borderColor: 'var(--border-default)', fontSize: 13 }}
                      >
                        {row.feature}
                      </td>
                      <td
                        className="text-center py-3 px-4 border-b font-body text-sm text-text-secondary"
                        style={{ borderColor: 'var(--border-default)', fontSize: 13 }}
                      >
                        <Cell val={row.free} />
                      </td>
                      <td
                        className="text-center py-3 px-4 border-b font-body text-sm text-text-secondary"
                        style={{ borderColor: 'var(--border-default)', fontSize: 13 }}
                      >
                        <Cell val={row.starter} />
                      </td>
                      <td
                        className="text-center py-3 px-4 border-b font-body text-sm text-text-secondary"
                        style={{ borderColor: 'var(--border-default)', fontSize: 13 }}
                      >
                        <Cell val={row.agency} />
                      </td>
                      <td
                        className="text-center py-3 px-4 border-b font-body text-sm text-text-secondary"
                        style={{ borderColor: 'var(--border-default)', fontSize: 13 }}
                      >
                        <Cell val={row.enterprise} />
                      </td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 5. FAQ accordion ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-8 pb-16">
        <div className="section-label text-center mb-12">COMMON QUESTIONS</div>

        {FAQS.map((faq, i) => (
          <div key={i} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex justify-between items-center py-4 cursor-pointer bg-transparent border-0 text-left gap-4"
            >
              <span
                className="font-body font-semibold text-text-primary"
                style={{ fontSize: 15, color: 'var(--text-primary)' }}
              >
                {faq.q}
              </span>
              <span
                className="flex-shrink-0 text-text-secondary transition-transform duration-200"
                style={{ display: 'inline-block', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>
            {openFaq === i && (
              <p className="font-body pb-4 leading-relaxed" style={{ fontSize: 14, color: '#8E8EA0' }}>
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ── 6. Footer routing band ───────────────────────────────────────────── */}
      <div
        className="border-t py-6 text-center"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <p className="font-body text-sm" style={{ color: '#3A3A52' }}>
          Need API access?{' '}
          <Link
            href="/developers#pricing"
            className="no-underline hover:opacity-80 transition-opacity"
            style={{ color: '#00C8FF' }}
          >
            See developer pricing →
          </Link>
        </p>
      </div>

    </main>
  )
}
