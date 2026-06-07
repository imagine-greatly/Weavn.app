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
    accent: '#6F9BC6',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Plan changes take effect immediately. Upgrades are prorated. Downgrades take effect at the next billing cycle.',
    accent: '#00C48C',
  },
  {
    q: 'What are the 100 bundled API calls on Agency?',
    a: 'The Agency plan includes 100 API calls per month that can be used programmatically via the API — useful for automating client scans or integrating webdoc into your own workflow. Additional API calls beyond 100 are billed at $0.19/scan.',
    accent: '#6F9BC6',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'Yes — Starter and Agency both include a 14-day free trial. No credit card required to start.',
    accent: '#00C48C',
  },
  {
    q: 'How does white-labeling work?',
    a: "Agency plan generates shareable report links with your client's domain context and your branding. No \"powered by webdoc\" in client-facing views.",
    accent: '#00C48C',
  },
  {
    q: 'What happens if I hit my scan limit?',
    a: 'Scans stop until your next billing cycle resets your allowance. You can upgrade at any time to immediately unlock more scans.',
    accent: '#00C48C',
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function Cell({ val }: { val: CellVal }): JSX.Element {
  if (val.type === 'check')
    return (
      <span
        style={{
          display: 'inline-block',
          width: 7,
          height: 7,
          backgroundColor: '#00C48C',
          verticalAlign: 'middle',
        }}
      />
    )
  if (val.type === 'dash')
    return <span style={{ color: '#6E7587' }}>—</span>
  return <span style={{ color: '#9398A8' }}>{val.value}</span>
}

function Bullet({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, listStyle: 'none' }}>
      <span
        style={{
          flexShrink: 0,
          width: 5,
          height: 5,
          backgroundColor: '#00C48C',
          marginTop: 7,
          display: 'block',
        }}
      />
      <span
        style={{
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 14,
          lineHeight: 1.65,
          color: '#9398A8',
        }}
      >
        {text}
      </span>
    </li>
  )
}

function InheritLabel({ text }: { text: string }) {
  return (
    <li
      style={{
        listStyle: 'none',
        marginBottom: 16,
        marginTop: 4,
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#6E7587',
      }}
    >
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
    <main style={{ backgroundColor: '#050810', minHeight: '100vh' }}>

      {/* ── 1. Hero band ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '96px 32px 64px',
          maxWidth: 896,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#6F9BC6',
            marginBottom: 16,
          }}
        >
          PLANS &amp; PRICING
        </div>
        <h1
          className="font-score"
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 700,
            letterSpacing: '-1.5px',
            color: '#E6E9EE',
            margin: '0 0 16px',
          }}
        >
          Start free. Scale when ready.
        </h1>
        <p
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 16,
            lineHeight: 1.6,
            color: '#9398A8',
            maxWidth: 672,
            margin: '0 auto 40px',
          }}
        >
          Four plans for founders, growing teams, and agencies. No setup fees. Cancel anytime.
        </p>

        {/* Monthly / Annual toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#0A0E18',
            border: '0.5px solid rgba(255,255,255,0.08)',
            padding: 4,
          }}
        >
          <button
            onClick={() => setIsAnnual(false)}
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 13,
              padding: '8px 20px',
              backgroundColor: !isAnnual ? '#0D1420' : 'transparent',
              color: !isAnnual ? '#E6E9EE' : '#6E7587',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 0,
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 13,
              padding: '8px 20px',
              backgroundColor: isAnnual ? '#0D1420' : 'transparent',
              color: isAnnual ? '#E6E9EE' : '#6E7587',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            Annual
            <span
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10,
                backgroundColor: 'rgba(0,196,140,0.12)',
                color: '#00C48C',
                padding: '3px 8px',
                letterSpacing: '0.05em',
              }}
            >
              SAVE 20%
            </span>
          </button>
        </div>
      </section>

      {/* ── 2. Pricing cards ──────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 80px' }}>

        {/* Solo / Teams group labels — desktop only */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4 mb-2">
          <div
            className="col-span-2"
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#6E7587',
            }}
          >
            SOLO
          </div>
          <div
            className="col-span-2"
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#6E7587',
            }}
          >
            TEAMS
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* FREE */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 6,
              }}
            >
              FREE
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              for your first scan
            </div>
            <div
              className="font-score"
              style={{ fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              $0
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 32,
              }}
            >
              forever
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <Bullet text="3 scans per month" />
              <Bullet text="Full 307-check audit" />
              <Bullet text="Score + findings" />
              <Bullet text="7-day report history" />
              <Bullet text="Community support" />
            </ul>
            <Link
              href="/scan"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#9398A8',
                border: '0.5px solid #6E7587',
                padding: '12px 0',
                marginTop: 32,
                textDecoration: 'none',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              START FREE →
            </Link>
          </div>

          {/* FOUNDER */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 6,
              }}
            >
              FOUNDER
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              for founders running their own site
            </div>
            <div
              className="font-score"
              style={{ fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              ${price(49)}
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 32,
              }}
            >
              per month
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <InheritLabel text="Everything in Free, plus:" />
              <Bullet text="50 scans per month" />
              <Bullet text="Priority processing" />
              <Bullet text="30-day report history" />
              <Bullet text="Email support" />
              <Bullet text="CSV export" />
            </ul>
            <Link
              href="/signup?plan=starter"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#00C48C',
                border: '0.5px solid #00C48C',
                padding: '12px 0',
                marginTop: 32,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              START FREE TRIAL →
            </Link>
          </div>

          {/* AGENCY */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 6,
              }}
            >
              AGENCY
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              for teams auditing client sites
            </div>
            <div
              className="font-score"
              style={{ fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              ${price(149)}
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 32,
              }}
            >
              per month
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <InheritLabel text="Everything in Founder, plus:" />
              <Bullet text="200 scans per month" />
              <Bullet text="White-label report links" />
              <Bullet text="Client workspaces" />
              <Bullet text="100 bundled API calls/month" />
              <Bullet text="Multi-page scanning" />
              <Bullet text="Priority support + SLA" />
            </ul>
            <Link
              href="/signup?plan=agency"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#050810',
                backgroundColor: '#00C48C',
                padding: '12px 0',
                marginTop: 32,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              START FREE TRIAL →
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 6,
              }}
            >
              ENTERPRISE
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              for agencies at scale
            </div>
            <div
              className="font-score"
              style={{ fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              ${price(499)}
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 32,
              }}
            >
              per month
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <InheritLabel text="Everything in Agency, plus:" />
              <Bullet text="Unlimited scans" />
              <Bullet text="Custom integrations" />
              <Bullet text="Dedicated account manager" />
              <Bullet text="SSO + team management" />
              <Bullet text="Custom SLA" />
              <Bullet text="Invoice billing" />
            </ul>
            <Link
              href="mailto:hello@webdocai.com"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#9398A8',
                border: '0.5px solid #6E7587',
                padding: '12px 0',
                marginTop: 32,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              TALK TO US →
            </Link>
          </div>

        </div>
      </section>

      {/* ── 3. API callout band ───────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: '#0A0E18',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          padding: '24px 48px',
        }}
      >
        <div
          style={{
            maxWidth: 1152,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6F9BC6',
                margin: '0 0 4px',
              }}
            >
              BUILDING WITH THE API?
            </p>
            <p
              className="font-score"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#E6E9EE',
                margin: 0,
              }}
            >
              Developer plans from $0.15/scan. No dashboard required.
            </p>
          </div>
          <Link
            href="/developers#pricing"
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 13,
              border: '0.5px solid #6F9BC6',
              color: '#6F9BC6',
              padding: '12px 24px',
              textDecoration: 'none',
              display: 'block',
              flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
          >
            SEE DEVELOPER PRICING →
          </Link>
        </div>
      </section>

      {/* ── 4. Comparison table ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px' }}>
        <button
          onClick={() => setShowTable(v => !v)}
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#6E7587',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            padding: '8px 0',
            transition: 'color 0.15s',
          }}
        >
          COMPARE ALL FEATURES {showTable ? '↑' : '↓'}
        </button>

        <div
          style={{
            overflow: 'hidden',
            transition: 'max-height 0.4s ease',
            maxHeight: showTable ? '2000px' : '0',
          }}
        >
          <div style={{ marginTop: 32, overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px 12px 0', width: '36%' }} />
                  {['FREE', 'STARTER', 'AGENCY', 'ENTERPRISE'].map(plan => (
                    <th
                      key={plan}
                      style={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#6E7587',
                        textAlign: 'center',
                        padding: '12px 16px',
                        fontWeight: 400,
                      }}
                    >
                      {plan}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_GROUPS.flatMap((group, gi) => [
                  <tr key={`g-${gi}`}>
                    <td colSpan={5} style={{ paddingTop: 32, paddingBottom: 8 }}>
                      <span
                        style={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: '#6E7587',
                        }}
                      >
                        {group.label}
                      </span>
                    </td>
                  </tr>,
                  ...group.rows.map((row, ri) => (
                    <tr
                      key={`r-${gi}-${ri}`}
                      style={{ backgroundColor: ri % 2 === 1 ? 'rgba(10,14,24,0.7)' : 'transparent' }}
                    >
                      <td
                        style={{
                          fontFamily: '"IBM Plex Sans", sans-serif',
                          fontSize: 13,
                          color: '#9398A8',
                          padding: '12px 16px 12px 0',
                          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {row.feature}
                      </td>
                      {(['free', 'starter', 'agency', 'enterprise'] as const).map(col => (
                        <td
                          key={col}
                          style={{
                            textAlign: 'center',
                            padding: '12px 16px',
                            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                            fontFamily: '"IBM Plex Sans", sans-serif',
                            fontSize: 13,
                          }}
                        >
                          <Cell val={row[col]} />
                        </td>
                      ))}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 5. FAQ accordion ──────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 768, margin: '0 auto', padding: '0 32px 64px' }}>
        <div
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#6E7587',
            textAlign: 'center',
            marginBottom: 48,
          }}
        >
          COMMON QUESTIONS
        </div>

        {FAQS.map((faq, i) => (
          <div
            key={i}
            style={{
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${faq.accent}`,
              backgroundColor: openFaq === i ? '#0A0E18' : 'transparent',
              paddingLeft: 16,
              transition: 'background-color 0.2s',
            }}
          >
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                gap: 16,
              }}
            >
              <span
                style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#E6E9EE',
                }}
              >
                {faq.q}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  color: '#6E7587',
                  display: 'inline-block',
                  transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ▾
              </span>
            </button>
            {openFaq === i && (
              <p
                style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: 14,
                  color: '#9398A8',
                  lineHeight: 1.65,
                  paddingBottom: 16,
                  margin: 0,
                }}
              >
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ── 6. Footer routing band ────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          padding: '24px 0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 14,
            color: '#9398A8',
            margin: 0,
          }}
        >
          Need API access?{' '}
          <Link
            href="/developers#pricing"
            style={{ color: '#6F9BC6', textDecoration: 'none' }}
          >
            See developer pricing →
          </Link>
        </p>
      </div>

    </main>
  )
}
