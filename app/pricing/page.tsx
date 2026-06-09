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
  founder: CellVal
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

// ── Spec data ─────────────────────────────────────────────────────────────────

type SpecEntry = { k: string; v: string }

const DASH_SPECS: Record<string, SpecEntry[]> = {
  free: [
    { k: 'scans_per_month',      v: '3' },
    { k: 'report_history',       v: '7d' },
    { k: 'team_seats',           v: '1' },
    { k: 'white_label',          v: 'false' },
    { k: 'api_calls_bundled',    v: '0' },
    { k: 'priority_processing',  v: 'false' },
  ],
  founder: [
    { k: 'scans_per_month',      v: '20' },
    { k: 'report_history',       v: '30d' },
    { k: 'team_seats',           v: '1' },
    { k: 'white_label',          v: 'false' },
    { k: 'api_calls_bundled',    v: '0' },
    { k: 'priority_processing',  v: 'true' },
  ],
  agency: [
    { k: 'scans_per_month',      v: '100' },
    { k: 'report_history',       v: 'unlimited' },
    { k: 'team_seats',           v: '3' },
    { k: 'white_label',          v: 'true' },
    { k: 'api_calls_bundled',    v: '100' },
    { k: 'priority_processing',  v: 'true' },
  ],
  enterprise: [
    { k: 'scans_per_month',      v: '500' },
    { k: 'report_history',       v: 'unlimited' },
    { k: 'team_seats',           v: 'unlimited' },
    { k: 'white_label',          v: 'true' },
    { k: 'api_calls_bundled',    v: '500' },
    { k: 'priority_processing',  v: 'true' },
  ],
}

const API_SPECS: Record<string, SpecEntry[]> = {
  playground: [
    { k: 'trial_scans',       v: '25 free' },
    { k: 'then',              v: '$0.25/scan' },
    { k: 'async_mode',        v: 'false' },
    { k: 'batch_endpoint',    v: 'false' },
    { k: 'webhooks',          v: 'false' },
    { k: 'rate_limits',       v: 'standard' },
  ],
  dev: [
    { k: 'scans_per_month',   v: '300' },
    { k: 'overage_rate',      v: '$0.19/scan' },
    { k: 'async_mode',        v: 'true' },
    { k: 'batch_endpoint',    v: 'false' },
    { k: 'webhooks',          v: 'true' },
    { k: 'rate_limits',       v: 'standard' },
  ],
  builder: [
    { k: 'scans_per_month',   v: '1,000' },
    { k: 'overage_rate',      v: '$0.17/scan' },
    { k: 'async_mode',        v: 'true' },
    { k: 'batch_endpoint',    v: 'true' },
    { k: 'webhooks',          v: 'true' },
    { k: 'rate_limits',       v: 'standard' },
  ],
  scale: [
    { k: 'scans_per_month',   v: '3,000' },
    { k: 'overage_rate',      v: '$0.15/scan' },
    { k: 'async_mode',        v: 'true' },
    { k: 'batch_endpoint',    v: 'true' },
    { k: 'webhooks',          v: 'true' },
    { k: 'rate_limits',       v: 'dedicated' },
  ],
  enterprise: [
    { k: 'scans_per_month',   v: 'custom' },
    { k: 'overage_rate',      v: 'from $0.11/scan' },
    { k: 'async_mode',        v: 'true' },
    { k: 'batch_endpoint',    v: 'true' },
    { k: 'webhooks',          v: 'true' },
    { k: 'rate_limits',       v: 'dedicated' },
  ],
}

const RATE_POINTS = [
  { label: 'PLAYGROUND', price: '$0.25', color: '#6F9BC6' },
  { label: 'DEV',        price: '$0.19', color: '#6F9BC6' },
  { label: 'BUILDER',    price: '$0.17', color: '#6F9BC6' },
  { label: 'SCALE',      price: '$0.15', color: '#00C48C' },
  { label: 'ENTERPRISE', price: '$0.11', color: '#00C48C' },
]

// ── Static data ───────────────────────────────────────────────────────────────

const FAQ_CARDS = [
  {
    q: 'What counts as a scan?',
    a: 'Each URL submitted to the API or via the dashboard counts as one scan. Cache hits — the same URL rescanned within 24 hours — are free and do not count against your limit. Multi-page scans count one credit per page.',
    dataLine: 'cache_hits: always free',
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
    dataLine: '100 scans · 100 api_calls · 3 seats',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Plan changes take effect immediately. Upgrading prorates the difference. Downgrading takes effect at the next billing cycle. No cancellation fees.',
    dataLine: 'no_contracts: true · cancel_anytime: true',
    dataColor: '#00C48C',
  },
  {
    q: 'How does white-labeling work?',
    a: "Agency and Enterprise plans generate shareable report links with no webdoc branding. You can set a custom subdomain (Enterprise). Reports show your agency name and the client's URL. No webdoc logo, no webdoc copy.",
    dataLine: 'custom_subdomain: enterprise_only',
    dataColor: '#00C48C',
  },
  {
    q: 'What happens if I hit my scan limit?',
    a: 'Scans stop until the next billing cycle unless you have overage enabled. On API plans, overage is charged at the per-scan rate for your tier. Dashboard plans do not auto-overage — scans are paused until renewal or upgrade.',
    dataLine: 'api_plans: overage_enabled · dashboard: paused',
    dataColor: '#6F9BC6',
  },
]

const TABLE_GROUPS: TableGroup[] = [
  {
    label: 'SCANNING',
    rows: [
      {
        feature: 'Scans per month',
        free:       { type: 'text', value: '3' },
        founder:    { type: 'text', value: '20' },
        agency:     { type: 'text', value: '100' },
        enterprise: { type: 'text', value: '500' },
      },
      {
        feature: 'Check depth',
        free:       { type: 'text', value: '307 checks' },
        founder:    { type: 'text', value: '307' },
        agency:     { type: 'text', value: '307' },
        enterprise: { type: 'text', value: '307' },
      },
      {
        feature: 'Site types',
        free:       { type: 'text', value: 'All' },
        founder:    { type: 'text', value: 'All' },
        agency:     { type: 'text', value: 'All' },
        enterprise: { type: 'text', value: 'All' },
      },
    ],
  },
  {
    label: 'REPORTS',
    rows: [
      {
        feature: 'Report history',
        free:       { type: 'text', value: '7 days' },
        founder:    { type: 'text', value: '30 days' },
        agency:     { type: 'text', value: '90 days' },
        enterprise: { type: 'text', value: '1 year' },
      },
      {
        feature: 'White-label reports',
        free:       { type: 'dash' },
        founder:    { type: 'dash' },
        agency:     { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'CSV export',
        free:       { type: 'dash' },
        founder:    { type: 'check' },
        agency:     { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'PDF export',
        free:       { type: 'dash' },
        founder:    { type: 'dash' },
        agency:     { type: 'check' },
        enterprise: { type: 'check' },
      },
    ],
  },
  {
    label: 'AGENCY FEATURES',
    rows: [
      {
        feature: 'Client workspaces',
        free:       { type: 'dash' },
        founder:    { type: 'dash' },
        agency:     { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'Multi-page scanning',
        free:       { type: 'dash' },
        founder:    { type: 'dash' },
        agency:     { type: 'check' },
        enterprise: { type: 'check' },
      },
      {
        feature: 'API access (bundled)',
        free:       { type: 'dash' },
        founder:    { type: 'dash' },
        agency:     { type: 'text', value: '100 calls' },
        enterprise: { type: 'text', value: 'Custom' },
      },
    ],
  },
  {
    label: 'SUPPORT',
    rows: [
      {
        feature: 'Support type',
        free:       { type: 'text', value: 'Community' },
        founder:    { type: 'text', value: 'Email' },
        agency:     { type: 'text', value: 'Priority' },
        enterprise: { type: 'text', value: 'Dedicated' },
      },
      {
        feature: 'SLA',
        free:       { type: 'dash' },
        founder:    { type: 'dash' },
        agency:     { type: 'check' },
        enterprise: { type: 'text', value: 'Custom' },
      },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Cell({ val }: { val: CellVal }): JSX.Element {
  if (val.type === 'check')
    return <span style={{ display: 'inline-block', width: 6, height: 6, backgroundColor: '#00C48C', verticalAlign: 'middle' }} />
  if (val.type === 'dash')
    return <span style={{ color: '#6E7587' }}>—</span>
  return <span style={{ color: '#9398A8' }}>{val.value}</span>
}

function SpecRow({ k, v }: { k: string; v: string }) {
  const isTrue  = v === 'true'
  const isFalse = v === 'false'
  const vColor  = isTrue ? '#00C48C' : isFalse ? '#6E7587' : '#E6E9EE'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', ...MONO, fontSize: 11, marginBottom: 5 }}>
      <span style={{ color: '#8080c0', flexShrink: 0 }}>{k}</span>
      <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
      <span style={{ color: vColor }}>{v}</span>
    </div>
  )
}

function Ticks() {
  const b = '0.5px solid rgba(111,155,198,0.2)'
  return (
    <>
      <div aria-hidden style={{ position:'absolute', top:20, left:20,   width:14, height:14, borderTop:b, borderLeft:b,   pointerEvents:'none', zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute', top:20, right:20,  width:14, height:14, borderTop:b, borderRight:b,  pointerEvents:'none', zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute', bottom:20, left:20,  width:14, height:14, borderBottom:b, borderLeft:b,  pointerEvents:'none', zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute', bottom:20, right:20, width:14, height:14, borderBottom:b, borderRight:b, pointerEvents:'none', zIndex:1 }} />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual,  setIsAnnual]  = useState(false)
  const [showTable, setShowTable] = useState(false)

  const price   = (m: number) => isAnnual ? Math.round(m * 0.8) : m
  const savings = (m: number) => Math.round(m * 0.2 * 12)

  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 32px 72px', textAlign: 'center' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 900px 600px at 50% 40%, rgba(111,155,198,0.07) 0%, transparent 65%)',
        }} />
        <Ticks />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 896, margin: '0 auto' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 20px' }}>
            PRICING
          </p>
          <h1 style={{ ...DISP, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#E6E9EE', margin: '0 0 16px', lineHeight: 1.1 }}>
            Same engine. Different access.
          </h1>
          <p style={{ ...SANS, fontSize: 16, lineHeight: 1.65, color: '#9398A8', maxWidth: 560, margin: '0 auto' }}>
            One scan engine underneath everything. Choose how you access it.
          </p>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 2. DASHBOARD PLANS ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(111,155,198,0.12)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 1000px 700px at 38% 50%, rgba(111,155,198,0.05) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 400px at 80% 30%, rgba(0,200,255,0.03) 0%, transparent 55%)',
          ].join(', '),
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', margin: '0 0 12px' }}>
            DASHBOARD PLANS · FOR FOUNDERS &amp; AGENCIES
          </p>
          <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 32px' }}>
            Diagnose your site or run client audits. Full report interface, score trending, white-label exports.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.08)', padding: 3, marginBottom: 40 }}>
            <button
              onClick={() => setIsAnnual(false)}
              style={{ ...MONO, fontSize: 13, padding: '7px 18px', background: !isAnnual ? 'rgba(111,155,198,0.12)' : 'transparent', color: !isAnnual ? '#6F9BC6' : '#6E7587', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              style={{ ...MONO, fontSize: 13, padding: '7px 18px', background: isAnnual ? 'rgba(111,155,198,0.12)' : 'transparent', color: isAnnual ? '#6F9BC6' : '#6E7587', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
            >
              Annual
              <span style={{ ...MONO, fontSize: 10, background: 'rgba(111,155,198,0.12)', color: '#6F9BC6', padding: '2px 6px', letterSpacing: '0.05em' }}>
                SAVE 20%
              </span>
            </button>
          </div>

          {isAnnual && (
            <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '-28px 0 32px', lineHeight: 1.8 }}>
              <span style={{ color: '#00C48C' }}>save ${savings(49)}/yr</span>
              {' · '}
              <span style={{ color: '#00C48C' }}>save ${savings(149)}/yr</span>
              {' · '}
              <span style={{ color: '#00C48C' }}>save ${savings(499)}/yr</span>
            </p>
          )}

          {/* Dashboard tier cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ alignItems: 'stretch' }}>

            {/* FREE */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', margin: '0 0 6px' }}>FREE</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: '0 0 14px' }}>3 scans · no account</p>
                <p style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 4px' }}>$0</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: 0 }}>forever free</p>
              </div>
              <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {DASH_SPECS.free.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '14px 20px 20px' }}>
                <Link href="/scan" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  START FREE →
                </Link>
              </div>
            </div>

            {/* FOUNDER */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', margin: '0 0 6px' }}>FOUNDER</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: '0 0 14px' }}>20 scans/mo · single user</p>
                <p style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 4px' }}>${price(49)}</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6F9BC6', margin: 0 }}>$2.45/scan effective</p>
              </div>
              <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {DASH_SPECS.founder.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '14px 20px 20px' }}>
                <Link href="/signup?plan=founder" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  START FREE TRIAL →
                </Link>
              </div>
            </div>

            {/* AGENCY */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9D8CFF', margin: '0 0 6px' }}>AGENCY</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: '0 0 14px' }}>100 scans/mo · client workspaces</p>
                <p style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 4px' }}>${price(149)}</p>
                <p style={{ ...MONO, fontSize: 10, color: '#9D8CFF', margin: 0 }}>$1.49/scan · 100 API calls bundled</p>
              </div>
              <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {DASH_SPECS.agency.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '14px 20px 20px' }}>
                <Link href="/signup?plan=agency" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '10px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  START FREE TRIAL →
                </Link>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', margin: '0 0 6px' }}>ENTERPRISE</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: '0 0 14px' }}>500 scans/mo · dedicated support</p>
                <p style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 4px' }}>${price(499)}</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: 0 }}>custom rate · dedicated support</p>
              </div>
              <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {DASH_SPECS.enterprise.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '14px 20px 20px' }}>
                <Link href="mailto:hello@webdocai.com" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  TALK TO US →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 3. API PLANS ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(0,196,140,0.12)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 1000px 700px at 62% 50%, rgba(0,196,140,0.04) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 400px at 15% 30%, rgba(111,155,198,0.04) 0%, transparent 55%)',
          ].join(', '),
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#00C48C', margin: '0 0 12px' }}>
            API PLANS · FOR DEVELOPERS
          </p>
          <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 40px' }}>
            POST a URL. Get structured JSON. No dashboard required. Same 307-check engine.
          </p>

          {/* Rate gradient bar */}
          <div className="wd-panel" style={{ padding: '20px 24px 24px', marginBottom: 32, overflow: 'hidden', position: 'relative' }}>
            <div aria-hidden style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 600px 200px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 70%)',
            }} />
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6E7587', textAlign: 'center', margin: '0 0 20px', position: 'relative', zIndex: 1 }}>
              RATE DECREASES WITH VOLUME
            </p>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ height: 6, background: 'linear-gradient(to right, #6F9BC6, #00C48C)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {RATE_POINTS.map((p, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '0.5px', height: 10, background: 'rgba(255,255,255,0.15)' }} />
                    <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6E7587', margin: '4px 0 2px' }}>{p.label}</p>
                    <p style={{ ...DISP, fontSize: 13, fontWeight: 600, color: p.color, margin: 0 }}>{p.price}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API tier cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" style={{ alignItems: 'stretch' }}>

            {/* PLAYGROUND */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 6px' }}>PLAYGROUND</p>
                <p style={{ ...DISP, fontSize: 34, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 2px' }}>25 free</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: 0 }}>then $0.25/scan</p>
              </div>
              <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {API_SPECS.playground.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '12px 18px 18px' }}>
                <Link href="/developer" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 11, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '9px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  GET API KEY →
                </Link>
              </div>
            </div>

            {/* DEV */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', margin: '0 0 6px' }}>DEV</p>
                <p style={{ ...DISP, fontSize: 34, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 2px' }}>$29</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6F9BC6', margin: 0 }}>/mo · $0.097/scan</p>
              </div>
              <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {API_SPECS.dev.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '12px 18px 18px' }}>
                <Link href="/signup?plan=dev-api" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 11, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '9px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  START DEV →
                </Link>
              </div>
            </div>

            {/* BUILDER */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', margin: '0 0 6px' }}>BUILDER</p>
                <p style={{ ...DISP, fontSize: 34, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 2px' }}>$99</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6F9BC6', margin: 0 }}>/mo · $0.099/scan</p>
              </div>
              <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {API_SPECS.builder.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '12px 18px 18px' }}>
                <Link href="/signup?plan=builder-api" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 11, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '9px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  START BUILDER →
                </Link>
              </div>
            </div>

            {/* SCALE */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#00C48C', margin: '0 0 6px' }}>SCALE</p>
                <p style={{ ...DISP, fontSize: 34, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 2px' }}>$249</p>
                <p style={{ ...MONO, fontSize: 10, color: '#00C48C', margin: 0 }}>/mo · $0.083/scan</p>
              </div>
              <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {API_SPECS.scale.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '12px 18px 18px' }}>
                <Link href="/signup?plan=scale-api" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 11, color: '#00C48C', border: '1px solid rgba(0,196,140,0.5)', padding: '9px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  START SCALE →
                </Link>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', margin: '0 0 6px' }}>ENTERPRISE</p>
                <p style={{ ...DISP, fontSize: 34, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 2px' }}>Custom</p>
                <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: 0 }}>volume · SLA guarantee</p>
              </div>
              <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexGrow: 1 }}>
                {API_SPECS.enterprise.map(s => <SpecRow key={s.k} k={s.k} v={s.v} />)}
              </div>
              <div style={{ padding: '12px 18px 18px' }}>
                <Link href="mailto:hello@webdocai.com" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 11, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '9px 0', textDecoration: 'none', transition: 'all 0.15s' }}>
                  TALK TO US →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 4. FEATURE MATRIX ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: [
            'linear-gradient(rgba(111,155,198,0.02) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(111,155,198,0.02) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '60px 60px',
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '48px 32px 64px' }}>
          <button
            onClick={() => setShowTable(v => !v)}
            style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', cursor: 'pointer', width: '100%', textAlign: 'center', background: 'transparent', border: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            FEATURE MATRIX
            <span style={{ color: '#6E7587', fontSize: 10 }}>{showTable ? '▲' : '▼'}</span>
          </button>

          <div style={{ overflow: 'hidden', transition: 'max-height 0.4s ease', maxHeight: showTable ? '3000px' : '0' }}>
            <div style={{ marginTop: 32, overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px 12px 0', width: '36%' }} />
                    {(['FREE', 'FOUNDER', 'AGENCY', 'ENTERPRISE'] as const).map(plan => (
                      <th key={plan} style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6F9BC6', textAlign: 'center', padding: '12px 16px', fontWeight: 400 }}>
                        {plan}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ height: '0.5px', background: 'rgba(111,155,198,0.15)', padding: 0 }} />
                  </tr>
                </thead>
                <tbody>
                  {TABLE_GROUPS.flatMap((group, gi) => [
                    <tr key={`g-${gi}`}>
                      <td colSpan={5} style={{ paddingTop: 28, paddingBottom: 8 }}>
                        <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587' }}>{group.label}</span>
                      </td>
                    </tr>,
                    ...group.rows.map((row, ri) => (
                      <tr key={`r-${gi}-${ri}`} style={{ background: ri % 2 === 1 ? 'rgba(111,155,198,0.02)' : 'transparent' }}>
                        <td style={{ ...MONO, fontSize: 12, color: '#9398A8', padding: '11px 16px 11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                          {row.feature}
                        </td>
                        {(['free', 'founder', 'agency', 'enterprise'] as const).map(col => (
                          <td key={col} style={{ textAlign: 'center', padding: '11px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', ...MONO, fontSize: 12 }}>
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

      {/* ── 5. FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 65%)',
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '64px 32px 0' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', margin: '0 0 32px' }}>
            QUESTIONS
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 64 }}>
            {FAQ_CARDS.map((card, i) => (
              <div key={i} className="wd-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
                <p style={{ ...DISP, fontSize: 16, fontWeight: 600, color: '#E6E9EE', margin: '0 0 10px' }}>{card.q}</p>
                <p style={{ ...SANS, fontSize: 14, lineHeight: 1.65, color: '#9398A8', margin: '0 0 16px', flexGrow: 1 }}>{card.a}</p>
                <p style={{ ...MONO, fontSize: 11, color: card.dataColor, margin: 0 }}>{card.dataLine}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 6. EXIT BAND — three audiences ──────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(111,155,198,0.15)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 600px 400px at 16% 50%, rgba(0,200,255,0.04) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 400px at 50% 50%, rgba(157,140,255,0.03) 0%, transparent 55%)',
            'radial-gradient(ellipse 600px 400px at 84% 50%, rgba(0,196,140,0.04) 0%, transparent 60%)',
          ].join(', '),
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
          {/* Founders lane */}
          <div style={{ flex: 1, padding: '48px 32px', textAlign: 'center', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>Diagnosing your site?</p>
            <p style={{ ...SANS, fontSize: 15, color: '#E6E9EE', fontWeight: 600, margin: '0 0 20px' }}>Start free. No account required.</p>
            <Link href="/scan" style={{ ...MONO, fontSize: 12, color: '#00C8FF', border: '1px solid rgba(0,200,255,0.5)', padding: '10px 20px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}>
              Scan free →
            </Link>
          </div>

          {/* Agencies lane */}
          <div style={{ flex: 1, padding: '48px 32px', textAlign: 'center', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>Running client audits?</p>
            <p style={{ ...SANS, fontSize: 15, color: '#E6E9EE', fontWeight: 600, margin: '0 0 20px' }}>White-label reports. Client workspaces.</p>
            <Link href="#dashboard-plans" style={{ ...MONO, fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '10px 20px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}>
              See agency plans →
            </Link>
          </div>

          {/* Developers lane */}
          <div style={{ flex: 1, padding: '48px 32px', textAlign: 'center' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>Building with the API?</p>
            <p style={{ ...SANS, fontSize: 15, color: '#E6E9EE', fontWeight: 600, margin: '0 0 20px' }}>25 free scans. No subscription.</p>
            <Link href="/developer" style={{ ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 20px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}>
              Get API key →
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
