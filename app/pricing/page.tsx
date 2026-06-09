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

// ── Tokens ────────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// ── Data ──────────────────────────────────────────────────────────────────────

const FAQ_CARDS = [
  {
    q: 'What counts as a scan?',
    a: 'Each URL submitted to the API or via the dashboard counts as one scan. Cache hits — the same URL rescanned within 24 hours — are free and do not count against your limit. Multi-page scans count one credit per page.',
    dataLine: 'cache hits: always free',
    dataColor: '#00C48C',
  },
  {
    q: 'What is the Founder tier?',
    a: 'Formerly called Starter. 20 scans per month, single user, full 307-check audit on every scan. Score trending, competitor analysis, and ranked findings included. No team seats — built for solo founders.',
    dataLine: '20 scans/month · $2.45/scan effective',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What does Agency include?',
    a: '100 scans per month, unlimited client workspaces, white-label report links, multi-page scanning (3 pages), PDF export, 3 team seats, and 100 bundled API calls per month. The 100 API calls can be used programmatically or consumed by the dashboard.',
    dataLine: '100 scans · 100 API calls · 3 seats',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Plan changes take effect immediately. Upgrading prorates the difference. Downgrading takes effect at the next billing cycle. No cancellation fees.',
    dataLine: 'no contracts · cancel anytime',
    dataColor: '#00C48C',
  },
  {
    q: 'How does white-labeling work?',
    a: "Agency and Enterprise plans generate shareable report links with no webdoc branding. You can set a custom subdomain (Enterprise). Reports show your agency name and the client's URL. No webdoc logo, no webdoc copy.",
    dataLine: 'custom subdomain on Enterprise',
    dataColor: '#00C48C',
  },
  {
    q: 'What happens if I hit my scan limit?',
    a: 'Scans stop until the next billing cycle unless you have overage enabled. On API plans, overage is charged at the per-scan rate for your tier. Dashboard plans do not auto-overage — scans are paused until renewal or upgrade.',
    dataLine: 'overage: enabled on API plans · paused on dashboard plans',
    dataColor: '#6F9BC6',
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
        style={{ display: 'inline-block', width: 7, height: 7, backgroundColor: '#00C48C', verticalAlign: 'middle' }}
      />
    )
  if (val.type === 'dash')
    return <span style={{ color: '#6E7587' }}>—</span>
  return <span style={{ color: '#9398A8' }}>{val.value}</span>
}

function Bullet({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, listStyle: 'none' }}>
      <span style={{ flexShrink: 0, width: 5, height: 5, backgroundColor: '#00C48C', marginTop: 7, display: 'block' }} />
      <span style={{ ...SANS, fontSize: 14, lineHeight: 1.65, color: '#9398A8' }}>{text}</span>
    </li>
  )
}

function InheritLabel({ text }: { text: string }) {
  return (
    <li style={{ listStyle: 'none', marginBottom: 16, marginTop: 4, ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6E7587' }}>
      {text}
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [showTable, setShowTable] = useState(false)

  const price = (monthly: number) => isAnnual ? Math.round(monthly * 0.8) : monthly
  const savings = (monthly: number) => Math.round(monthly * 0.2 * 12)

  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── 1. Hero — transparent, grid-exposed ──────────────────────────────── */}
      <section style={{ padding: '96px 32px 64px', maxWidth: 896, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', marginBottom: 16 }}>
          PRICING
        </div>
        <h1 style={{ ...DISP, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#E6E9EE', margin: '0 0 16px' }}>
          Infrastructure pricing. No contracts.
        </h1>
        <p style={{ ...SANS, fontSize: 16, lineHeight: 1.6, color: '#9398A8', maxWidth: 672, margin: '0 auto 40px' }}>
          Pay per scan or subscribe. Four tiers.{' '}
          Same engine regardless of plan.
        </p>

        {/* Monthly / Annual toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.08)', padding: 4 }}>
          <button
            onClick={() => setIsAnnual(false)}
            style={{ ...MONO, fontSize: 13, padding: '8px 20px', backgroundColor: !isAnnual ? 'rgba(111,155,198,0.12)' : 'transparent', color: !isAnnual ? '#6F9BC6' : '#6E7587', border: 'none', cursor: 'pointer', borderRadius: 0, transition: 'background-color 0.15s, color 0.15s' }}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            style={{ ...MONO, fontSize: 13, padding: '8px 20px', backgroundColor: isAnnual ? 'rgba(111,155,198,0.12)' : 'transparent', color: isAnnual ? '#6F9BC6' : '#6E7587', border: 'none', cursor: 'pointer', borderRadius: 0, display: 'flex', alignItems: 'center', gap: 8, transition: 'background-color 0.15s, color 0.15s' }}
          >
            Annual
            <span style={{ ...MONO, fontSize: 10, backgroundColor: 'rgba(111,155,198,0.12)', color: '#6F9BC6', padding: '3px 8px', letterSpacing: '0.05em' }}>
              SAVE 20%
            </span>
          </button>
        </div>

        {isAnnual && (
          <div style={{ marginTop: 16, ...MONO, fontSize: 11, color: '#6E7587', lineHeight: 1.8 }}>
            <span style={{ color: '#00C48C' }}>save ${savings(49)}/yr</span> on Founder
            {' · '}
            <span style={{ color: '#00C48C' }}>save ${savings(149)}/yr</span> on Agency
            {' · '}
            <span style={{ color: '#00C48C' }}>save ${savings(499)}/yr</span> on Enterprise
          </div>
        )}
      </section>
      <div className="section-separator" />

      {/* ── 2. Tier cards — equal weight ────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(111,155,198,0.1)', position: 'relative', overflow: 'hidden' }}>
        {/* Atmosphere: soft steel-blue bloom */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        {/* corner ticks */}
        <div style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.2)', borderRight: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.2)', borderRight: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px', position: 'relative', zIndex: 1 }}>

          {/* Solo / Teams group labels — desktop only */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-4 mb-2">
            <div className="col-span-2" style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587' }}>
              SOLO
            </div>
            <div className="col-span-2" style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587' }}>
              TEAMS
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ alignItems: 'stretch' }}>

            {/* FREE */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', marginBottom: 6 }}>FREE</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6E7587', marginBottom: 16 }}>3 scans · no account required</div>
                <div style={{ ...DISP, fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>$0</div>
                <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 8 }}>forever</div>
                <div style={{ ...MONO, fontSize: 11, color: '#00C48C' }}>3 scans included · no account required</div>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px', background: 'rgba(255,255,255,0.01)', flexGrow: 1 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <Bullet text="3 scans per month" />
                  <Bullet text="Full 307-check audit" />
                  <Bullet text="Score + findings" />
                  <Bullet text="7-day report history" />
                  <Bullet text="Community support" />
                </ul>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px' }}>
                <Link href="/scan" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#6F9BC6', border: '0.5px solid rgba(111,155,198,0.35)', padding: '12px 0', textDecoration: 'none', transition: 'opacity 0.15s' }}>
                  START FREE →
                </Link>
              </div>
            </div>

            {/* FOUNDER */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', marginBottom: 6 }}>FOUNDER</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6E7587', marginBottom: 16 }}>20 scans/month · single user</div>
                <div style={{ ...DISP, fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>${price(49)}</div>
                <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 8 }}>per month</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6F9BC6' }}>$2.45/scan effective rate</div>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px', background: 'rgba(255,255,255,0.01)', flexGrow: 1 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <InheritLabel text="Everything in Free, plus:" />
                  <Bullet text="50 scans per month" />
                  <Bullet text="Priority processing" />
                  <Bullet text="30-day report history" />
                  <Bullet text="Email support" />
                  <Bullet text="CSV export" />
                </ul>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px' }}>
                <Link href="/signup?plan=starter" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#6F9BC6', border: '0.5px solid rgba(111,155,198,0.35)', padding: '12px 0', textDecoration: 'none', transition: 'opacity 0.15s' }}>
                  START FREE TRIAL →
                </Link>
              </div>
            </div>

            {/* AGENCY */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', marginBottom: 6 }}>AGENCY</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6E7587', marginBottom: 16 }}>100 scans/month · client workspaces</div>
                <div style={{ ...DISP, fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>${price(149)}</div>
                <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 8 }}>per month</div>
                <div style={{ ...MONO, fontSize: 11, color: '#00C48C' }}>$1.49/scan · 100 API calls bundled</div>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px', background: 'rgba(255,255,255,0.01)', flexGrow: 1 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <InheritLabel text="Everything in Founder, plus:" />
                  <Bullet text="200 scans per month" />
                  <Bullet text="White-label report links" />
                  <Bullet text="Client workspaces" />
                  <Bullet text="100 bundled API calls/month" />
                  <Bullet text="Multi-page scanning" />
                  <Bullet text="Priority support + SLA" />
                </ul>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px' }}>
                <Link href="/signup?plan=agency" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#6F9BC6', border: '0.5px solid rgba(111,155,198,0.35)', padding: '12px 0', textDecoration: 'none', transition: 'opacity 0.15s' }}>
                  START FREE TRIAL →
                </Link>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', marginBottom: 6 }}>ENTERPRISE</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6E7587', marginBottom: 16 }}>500 scans/month · dedicated support</div>
                <div style={{ ...DISP, fontSize: 44, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>${price(499)}</div>
                <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 8 }}>per month</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>custom rate · dedicated support</div>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px', background: 'rgba(255,255,255,0.01)', flexGrow: 1 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <InheritLabel text="Everything in Agency, plus:" />
                  <Bullet text="Unlimited scans" />
                  <Bullet text="Custom integrations" />
                  <Bullet text="Dedicated account manager" />
                  <Bullet text="SSO + team management" />
                  <Bullet text="Custom SLA" />
                  <Bullet text="Invoice billing" />
                </ul>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ padding: '16px 24px 24px' }}>
                <Link href="mailto:hello@webdocai.com" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#6F9BC6', border: '0.5px solid rgba(111,155,198,0.35)', padding: '12px 0', textDecoration: 'none', transition: 'opacity 0.15s' }}>
                  TALK TO US →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 3. API callout band — blue bloom ─────────────────────────────────── */}
      <section style={{ borderTop: '0.5px solid rgba(111,155,198,0.15)', borderBottom: '0.5px solid rgba(255,255,255,0.05)', padding: '24px 48px', position: 'relative', overflow: 'hidden' }}>
        {/* Atmosphere: blue bloom */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 800px 300px at 50% 50%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        <div style={{ maxWidth: 1152, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', margin: '0 0 4px' }}>
              API ACCESS
            </p>
            <p style={{ ...DISP, fontSize: 16, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
              Raw API access. No dashboard. From $0.25/scan.
            </p>
          </div>
          <Link href="/developers#pricing" style={{ ...MONO, fontSize: 13, border: '0.5px solid #6F9BC6', color: '#6F9BC6', padding: '12px 24px', textDecoration: 'none', display: 'block', flexShrink: 0, transition: 'opacity 0.15s' }}>
            SEE DEVELOPER PRICING →
          </Link>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 4. Comparison table ───────────────────────────────────────────────── */}
      <section>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px' }}>
          <button
            onClick={() => setShowTable(v => !v)}
            style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', cursor: 'pointer', width: '100%', textAlign: 'center', backgroundColor: 'transparent', border: 'none', padding: '8px 0', transition: 'color 0.15s' }}
          >
            FEATURE MATRIX
          </button>

          <div style={{ overflow: 'hidden', transition: 'max-height 0.4s ease', maxHeight: showTable ? '2000px' : '0' }}>
            <div style={{ marginTop: 32, overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px 12px 0', width: '36%' }} />
                    {['FREE', 'STARTER', 'AGENCY', 'ENTERPRISE'].map(plan => (
                      <th key={plan} style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6E7587', textAlign: 'center', padding: '12px 16px', fontWeight: 400 }}>
                        {plan}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLE_GROUPS.flatMap((group, gi) => [
                    <tr key={`g-${gi}`}>
                      <td colSpan={5} style={{ paddingTop: 32, paddingBottom: 8 }}>
                        <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6E7587' }}>{group.label}</span>
                      </td>
                    </tr>,
                    ...group.rows.map((row, ri) => (
                      <tr key={`r-${gi}-${ri}`} style={{ backgroundColor: ri % 2 === 1 ? 'rgba(10,14,24,0.7)' : 'transparent' }}>
                        <td style={{ ...SANS, fontSize: 13, color: '#9398A8', padding: '12px 16px 12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          {row.feature}
                        </td>
                        {(['free', 'starter', 'agency', 'enterprise'] as const).map(col => (
                          <td key={col} style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', ...SANS, fontSize: 13 }}>
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
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 5. FAQ cards — 2×3 grid, no headline ────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px 80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}>
          {FAQ_CARDS.map((card, i) => (
            <div
              key={i}
              className="wd-panel"
              style={{
                background: '#0A0E18',
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ ...DISP, fontSize: 16, fontWeight: 600, color: '#E6E9EE', marginBottom: 10 }}>
                {card.q}
              </div>
              <p style={{ ...SANS, fontSize: 14, lineHeight: 1.65, color: '#9398A8', margin: '0 0 16px', flexGrow: 1 }}>
                {card.a}
              </p>
              <div style={{ ...MONO, fontSize: 11, color: card.dataColor, marginTop: 'auto' }}>
                {card.dataLine}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 6. Footer — transparent ──────────────────────────────────────────── */}
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <p style={{ ...SANS, fontSize: 14, color: '#9398A8', margin: 0 }}>
          Need API access?{' '}
          <Link href="/developers#pricing" style={{ color: '#6F9BC6', textDecoration: 'none' }}>
            See developer pricing →
          </Link>
        </p>
      </div>

    </main>
  )
}
