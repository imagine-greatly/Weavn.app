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
  free:    CellVal
  starter: CellVal
  pro:     CellVal
  scale:   CellVal
}

interface TableGroup {
  label: string
  rows:  TableRow[]
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// ── Static tier data ──────────────────────────────────────────────────────────

const DASH_TIERS = [
  {
    tier:    'FREE',
    monthly:  0,
    annual:   0,
    economy: 'free to start',
    diff:    'See your score. Top findings. No account required.',
    spec:    '3 scans per month · full 307-check audit · no credit card',
    cta:     'TRY FREE →',
    href:    '/scan',
  },
  {
    tier:    'STARTER',
    monthly:  49,
    annual:   39,
    economy: '$2.45/scan effective',
    diff:    'Full findings ranked by conversion lift. Score trending.',
    spec:    '20 scans/month · 30-day history · email support · CSV export',
    cta:     'START TRIAL →',
    href:    '/signup?plan=starter',
  },
  {
    tier:    'PRO',
    monthly:  149,
    annual:   119,
    economy: '$1.49/scan effective',
    diff:    'Client workspaces. White-label reports. Your logo.',
    spec:    '100 scans/month · unlimited history · 3 team seats · PDF export · 100 API calls bundled',
    cta:     'START TRIAL →',
    href:    '/signup?plan=pro',
  },
  {
    tier:    'SCALE',
    monthly:  499,
    annual:   399,
    economy: 'custom rate · dedicated support',
    diff:    '500 scans. 10 seats. Custom subdomain. Scheduled scans.',
    spec:    '500 scans/month · white-label subdomain · Slack notifications · priority support',
    cta:     'START TRIAL →',
    href:    '/signup?plan=scale',
  },
] as const

const API_TIERS = [
  {
    tier:         'DEV',
    price:        '$29/mo',
    economy:      '$0.097/scan effective',
    economyColor: '#6F9BC6',
    diff:         '300 scans/month. Async mode. Webhooks.',
    spec:         'async_mode: true · webhooks: true · $0.19/scan overage · 60 req/min',
    cta:          'START DEV →',
    href:         '/signup?plan=dev-api',
    ctaColor:     '#9D8CFF',
    ctaBorder:    'rgba(157,140,255,0.4)',
  },
  {
    tier:         'BUILDER',
    price:        '$99/mo',
    economy:      '$0.099/scan effective',
    economyColor: '#6F9BC6',
    diff:         '1,000 scans. Batch endpoint. 10 URLs per request.',
    spec:         'batch_endpoint: true · async_mode: true · webhooks: true · 200 req/min',
    cta:          'START BUILDER →',
    href:         '/signup?plan=builder-api',
    ctaColor:     '#9D8CFF',
    ctaBorder:    'rgba(157,140,255,0.4)',
  },
  {
    tier:         'SCALE',
    price:        '$249/mo',
    economy:      '$0.083/scan effective',
    economyColor: '#00C48C',
    diff:         '3,000 scans. Dedicated rate limits. Priority processing.',
    spec:         'rate_limits: dedicated · 500 req/min · all batch + async features',
    cta:          'START SCALE →',
    href:         '/signup?plan=scale-api',
    ctaColor:     '#00C48C',
    ctaBorder:    'rgba(0,196,140,0.4)',
  },
  {
    tier:         'ENTERPRISE',
    price:        'custom',
    economy:      'from $0.11/scan · SLA guarantee',
    economyColor: '#6F9BC6',
    diff:         'Custom volume. Dedicated infrastructure. SLA.',
    spec:         'custom rate limits · invoice billing · dedicated support · custom integrations',
    cta:          'TALK TO US →',
    href:         'mailto:hello@webdocai.com',
    ctaColor:     '#9D8CFF',
    ctaBorder:    'rgba(157,140,255,0.4)',
  },
] as const

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQ_CARDS = [
  {
    q: 'What counts as a scan?',
    a: 'Each URL submitted to the API or via the dashboard counts as one scan. Cache hits — the same URL rescanned within 24 hours — are free and do not count against your limit. Multi-page scans count one credit per page.',
    dataLine: 'cache_hits: always free',
    dataColor: '#00C48C',
  },
  {
    q: 'What is the Starter tier?',
    a: '20 scans per month, single user, full 307-check audit on every scan. Score trending, competitor analysis, and ranked findings included. No team seats — built for solo founders and individuals.',
    dataLine: '20 scans/month · $2.45/scan effective',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What does Pro include?',
    a: '100 scans per month, unlimited client workspaces, white-label report links, multi-page scanning, PDF export, and 3 team seats. Designed for agencies running audits for multiple clients.',
    dataLine: '100 scans · white_label: true · 3 seats',
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

// ── Feature matrix data ───────────────────────────────────────────────────────

const TABLE_GROUPS: TableGroup[] = [
  {
    label: 'SCANNING',
    rows: [
      {
        feature: 'Scans per month',
        free:    { type: 'text', value: '3' },
        starter: { type: 'text', value: '20' },
        pro:     { type: 'text', value: '100' },
        scale:   { type: 'text', value: '500' },
      },
      {
        feature: 'Check depth',
        free:    { type: 'text', value: '307 checks' },
        starter: { type: 'text', value: '307' },
        pro:     { type: 'text', value: '307' },
        scale:   { type: 'text', value: '307' },
      },
      {
        feature: 'Site types',
        free:    { type: 'text', value: 'All' },
        starter: { type: 'text', value: 'All' },
        pro:     { type: 'text', value: 'All' },
        scale:   { type: 'text', value: 'All' },
      },
    ],
  },
  {
    label: 'REPORTS',
    rows: [
      {
        feature: 'Report history',
        free:    { type: 'text', value: '7 days' },
        starter: { type: 'text', value: '30 days' },
        pro:     { type: 'text', value: 'unlimited' },
        scale:   { type: 'text', value: 'unlimited' },
      },
      {
        feature: 'White-label reports',
        free:    { type: 'dash' },
        starter: { type: 'dash' },
        pro:     { type: 'check' },
        scale:   { type: 'check' },
      },
      {
        feature: 'CSV export',
        free:    { type: 'dash' },
        starter: { type: 'check' },
        pro:     { type: 'check' },
        scale:   { type: 'check' },
      },
      {
        feature: 'PDF export',
        free:    { type: 'dash' },
        starter: { type: 'dash' },
        pro:     { type: 'check' },
        scale:   { type: 'check' },
      },
    ],
  },
  {
    label: 'ADVANCED FEATURES',
    rows: [
      {
        feature: 'Client workspaces',
        free:    { type: 'dash' },
        starter: { type: 'dash' },
        pro:     { type: 'check' },
        scale:   { type: 'check' },
      },
      {
        feature: 'Multi-page scanning',
        free:    { type: 'dash' },
        starter: { type: 'dash' },
        pro:     { type: 'check' },
        scale:   { type: 'check' },
      },
      {
        feature: 'Team seats',
        free:    { type: 'text', value: '1' },
        starter: { type: 'text', value: '1' },
        pro:     { type: 'text', value: '3' },
        scale:   { type: 'text', value: 'unlimited' },
      },
    ],
  },
  {
    label: 'SUPPORT',
    rows: [
      {
        feature: 'Support type',
        free:    { type: 'text', value: 'Community' },
        starter: { type: 'text', value: 'Email' },
        pro:     { type: 'text', value: 'Priority' },
        scale:   { type: 'text', value: 'Dedicated' },
      },
      {
        feature: 'SLA',
        free:    { type: 'dash' },
        starter: { type: 'dash' },
        pro:     { type: 'check' },
        scale:   { type: 'text', value: 'Custom' },
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

function Ticks() {
  const b = '0.5px solid rgba(111,155,198,0.2)'
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: 20,    left: 20,  width: 14, height: 14, borderTop: b,    borderLeft: b,   pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20,    right: 20, width: 14, height: 14, borderTop: b,    borderRight: b,  pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20,  width: 14, height: 14, borderBottom: b, borderLeft: b,   pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: b, borderRight: b,  pointerEvents: 'none', zIndex: 1 }} />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [surface,   setSurface]   = useState<'dashboard' | 'api'>('dashboard')
  const [billing,   setBilling]   = useState<'monthly' | 'annual'>('monthly')
  const [showTable, setShowTable] = useState(false)

  const isAnnual = billing === 'annual'
  const savings  = (m: number) => Math.round(m * 0.2 * 12)

  const isDash = surface === 'dashboard'
  const isApi  = surface === 'api'

  return (
    <main style={{ minHeight: '100vh' }}>
      <style>{`
        .tier-row {
          display: grid;
          grid-template-columns: 200px 1fr auto;
          align-items: center;
          padding: 24px 32px;
          background: #050810;
          transition: background 0.15s;
          cursor: default;
        }
        .tier-row:hover { background: #080D18; }
        .tier-center { padding: 0 48px; }
        @media (max-width: 767px) {
          .pricing-switcher { flex-direction: column !important; width: 100% !important; }
          .pricing-switcher button { padding: 14px 24px !important; width: 100% !important; }
          .tier-row { grid-template-columns: 1fr !important; padding: 20px 24px !important; }
          .tier-center { padding: 12px 0 !important; }
          .tier-right { padding-top: 4px; }
        }
      `}</style>

      {/* ── 1. HERO + SURFACE SWITCHER ──────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 48px 0', textAlign: 'center' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 900px 500px at 50% 30%, rgba(111,155,198,0.06) 0%, transparent 60%)',
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
            PRICING
          </p>
          <h1 style={{ ...DISP, fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, color: '#E6E9EE', margin: '0 0 40px', lineHeight: 1.1 }}>
            Access the engine.
          </h1>

          {/* Surface switcher */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 0 }}>
            <div
              className="pricing-switcher"
              style={{
                display: 'inline-flex',
                background: '#080D18',
                border: '0.5px solid rgba(255,255,255,0.08)',
                padding: 4,
                gap: 0,
              }}
            >
              {/* DASHBOARD button */}
              <button
                onClick={() => setSurface('dashboard')}
                style={{
                  padding: '16px 48px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: 0,
                  textAlign: 'center',
                  background: isDash ? 'rgba(111,155,198,0.1)' : 'transparent',
                  boxShadow: isDash ? 'inset 0 0 0 0.5px rgba(111,155,198,0.4)' : 'none',
                }}
              >
                <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: isDash ? '#6F9BC6' : '#6E7587', marginBottom: 4 }}>
                  DASHBOARD
                </div>
                <div style={{ ...SANS, fontSize: 13, color: isDash ? '#9398A8' : '#4d5566' }}>
                  Results without code
                </div>
              </button>

              {/* API button */}
              <button
                onClick={() => setSurface('api')}
                style={{
                  padding: '16px 48px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: 0,
                  textAlign: 'center',
                  background: isApi ? 'rgba(157,140,255,0.1)' : 'transparent',
                  boxShadow: isApi ? 'inset 0 0 0 0.5px rgba(157,140,255,0.4)' : 'none',
                }}
              >
                <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: isApi ? '#9D8CFF' : '#6E7587', marginBottom: 4 }}>
                  API
                </div>
                <div style={{ ...SANS, fontSize: 13, color: isApi ? '#9398A8' : '#4d5566' }}>
                  Build with the data
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. TIER DISPLAY ─────────────────────────────────────────────────── */}
      <section style={{ padding: '48px', minHeight: 500, position: 'relative' }}>

        {/* Atmosphere — shifts between steel blue (dashboard) and purple (api) */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          transition: 'opacity 0.3s',
          background: isDash
            ? 'radial-gradient(ellipse 900px 600px at 50% 30%, rgba(111,155,198,0.05) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 900px 600px at 50% 30%, rgba(157,140,255,0.05) 0%, transparent 60%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>

          {/* ── DASHBOARD SURFACE ── */}
          {isDash && (
            <>
              {/* Billing toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
                <span style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>Monthly</span>
                <button
                  onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
                  aria-label="Toggle billing period"
                  style={{
                    width: 40, height: 22,
                    background: isAnnual ? 'rgba(111,155,198,0.3)' : 'rgba(255,255,255,0.08)',
                    border: '0.5px solid rgba(111,155,198,0.3)',
                    cursor: 'pointer',
                    position: 'relative',
                    borderRadius: 0,
                    transition: 'background 0.2s',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 3,
                    left: isAnnual ? 21 : 2,
                    width: 16,
                    height: 16,
                    background: isAnnual ? '#6F9BC6' : 'rgba(255,255,255,0.35)',
                    transition: 'left 0.2s, background 0.2s',
                  }} />
                </button>
                <span style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>Annual</span>
                {isAnnual && (
                  <span style={{ ...MONO, fontSize: 10, color: '#00C48C', background: 'rgba(0,196,140,0.1)', padding: '2px 8px' }}>
                    SAVE 20%
                  </span>
                )}
              </div>

              {/* Annual savings callout */}
              {isAnnual && (
                <p style={{ ...MONO, fontSize: 11, color: '#6E7587', textAlign: 'center', margin: '-16px 0 24px' }}>
                  <span style={{ color: '#00C48C' }}>save ${savings(49)}/yr on Starter</span>
                  {' · '}
                  <span style={{ color: '#00C48C' }}>save ${savings(149)}/yr on Pro</span>
                  {' · '}
                  <span style={{ color: '#00C48C' }}>save ${savings(499)}/yr on Scale</span>
                </p>
              )}

              {/* Tier rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(111,155,198,0.08)' }}>
                {DASH_TIERS.map(t => (
                  <div key={t.tier} className="tier-row">
                    {/* LEFT — tier name + price */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', margin: '0 0 4px' }}>
                        {t.tier}
                      </p>
                      <p style={{ ...DISP, fontSize: 36, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: 0 }}>
                        {t.monthly === 0 ? '$0' : `$${isAnnual ? t.annual : t.monthly}`}
                        {t.monthly > 0 && (
                          <span style={{ ...MONO, fontSize: 12, color: '#6E7587', fontWeight: 400, marginLeft: 4 }}>/mo</span>
                        )}
                      </p>
                      <p style={{ ...MONO, fontSize: 10, color: '#6F9BC6', margin: '4px 0 0' }}>
                        {t.economy}
                      </p>
                    </div>

                    {/* CENTER — differentiator + spec */}
                    <div className="tier-center">
                      <p style={{ ...SANS, fontSize: 15, fontWeight: 500, color: '#E6E9EE', margin: '0 0 8px' }}>
                        {t.diff}
                      </p>
                      <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>
                        {t.spec}
                      </p>
                    </div>

                    {/* RIGHT — CTA */}
                    <div className="tier-right">
                      <Link
                        href={t.href}
                        style={{
                          ...MONO,
                          fontSize: 12,
                          color: '#6F9BC6',
                          border: '1px solid rgba(111,155,198,0.4)',
                          padding: '11px 28px',
                          textDecoration: 'none',
                          display: 'inline-block',
                          background: 'transparent',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ ...MONO, fontSize: 11, color: '#6E7587', textAlign: 'center', marginTop: 24 }}>
                All plans include: full 307-check audit · AI-rewritten copy · corpus benchmarking · cache hits free
              </p>
            </>
          )}

          {/* ── API SURFACE ── */}
          {isApi && (
            <>
              {/* Playground hero panel */}
              <div style={{
                background: 'rgba(157,140,255,0.04)',
                border: '0.5px solid rgba(157,140,255,0.2)',
                padding: '32px 40px',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 32,
                flexWrap: 'wrap',
              }}>
                <div>
                  <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9D8CFF', margin: '0 0 8px' }}>
                    START HERE
                  </p>
                  <p style={{ ...DISP, fontSize: 32, fontWeight: 700, color: '#E6E9EE', margin: '0 0 8px', lineHeight: 1.1 }}>
                    25 free scans.
                  </p>
                  <p style={{ ...SANS, fontSize: 15, color: '#9398A8', margin: 0, maxWidth: 480 }}>
                    No subscription. No credit card. Full JSON response on every scan. Rate limited to 5 requests/min.
                  </p>
                </div>
                <Link
                  href="/developer"
                  style={{
                    ...MONO,
                    fontSize: 13,
                    color: '#9D8CFF',
                    border: '1px solid rgba(157,140,255,0.5)',
                    padding: '14px 32px',
                    background: 'transparent',
                    borderRadius: 0,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  GET API KEY →
                </Link>
              </div>

              {/* Rate context */}
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6E7587', marginBottom: 16, textAlign: 'center' }}>
                PAID PLANS · RATE DECREASES WITH VOLUME
              </p>
              <div style={{ maxWidth: 600, margin: '0 auto 32px' }}>
                <div style={{ position: 'relative', height: 3, background: 'linear-gradient(to right, rgba(111,155,198,0.4), rgba(0,196,140,0.7))' }}>
                  {[0, 25, 50, 75, 100].map((pct, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: -4,
                        left: pct === 100 ? 'calc(100% - 0.5px)' : `${pct}%`,
                        width: '0.5px',
                        height: 11,
                        background: 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {(['PLAYGROUND', 'DEV', 'BUILDER', 'SCALE', 'ENTERPRISE'] as const).map(label => (
                    <span key={label} style={{ ...MONO, fontSize: 9, color: '#6E7587' }}>{label}</span>
                  ))}
                </div>
              </div>

              {/* API tier rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(157,140,255,0.08)' }}>
                {API_TIERS.map(t => (
                  <div key={t.tier} className="tier-row">
                    {/* LEFT */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9D8CFF', margin: '0 0 4px' }}>
                        {t.tier}
                      </p>
                      <p style={{ ...DISP, fontSize: 36, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: 0 }}>
                        {t.price}
                      </p>
                      <p style={{ ...MONO, fontSize: 10, color: t.economyColor, margin: '4px 0 0' }}>
                        {t.economy}
                      </p>
                    </div>

                    {/* CENTER */}
                    <div className="tier-center">
                      <p style={{ ...SANS, fontSize: 15, fontWeight: 500, color: '#E6E9EE', margin: '0 0 8px' }}>
                        {t.diff}
                      </p>
                      <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>
                        {t.spec}
                      </p>
                    </div>

                    {/* RIGHT */}
                    <div className="tier-right">
                      <Link
                        href={t.href}
                        style={{
                          ...MONO,
                          fontSize: 12,
                          color: t.ctaColor,
                          border: `1px solid ${t.ctaBorder}`,
                          padding: '11px 28px',
                          textDecoration: 'none',
                          display: 'inline-block',
                          background: 'transparent',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ ...MONO, fontSize: 11, color: '#6E7587', textAlign: 'center', marginTop: 24 }}>
                All API plans include: full JSON schema · cache hits free · async mode · webhook delivery · same 307-check engine
              </p>
            </>
          )}

        </div>
      </section>
      <div className="section-separator" />

      {/* ── 3. FEATURE MATRIX (always visible) ──────────────────────────────── */}
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

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '48px 32px 64px' }}>
          <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', textAlign: 'center', margin: '0 0 8px' }}>
            FEATURE MATRIX · DASHBOARD PLANS
          </p>
          <button
            onClick={() => setShowTable(v => !v)}
            style={{
              ...MONO,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: '#6F9BC6',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'center',
              background: 'transparent',
              border: 'none',
              padding: '8px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {showTable ? 'COLLAPSE' : 'EXPAND COMPARISON'}
            <span style={{ color: '#6E7587', fontSize: 10 }}>{showTable ? '▲' : '▼'}</span>
          </button>

          <div style={{ overflow: 'hidden', transition: 'max-height 0.4s ease', maxHeight: showTable ? '3000px' : '0' }}>
            <div style={{ marginTop: 32, overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px 12px 0', width: '36%' }} />
                    {(['FREE', 'STARTER', 'PRO', 'SCALE'] as const).map(plan => (
                      <th
                        key={plan}
                        style={{
                          ...MONO,
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: '#6F9BC6',
                          textAlign: 'center',
                          padding: '12px 16px',
                          fontWeight: 400,
                        }}
                      >
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
                        <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587' }}>
                          {group.label}
                        </span>
                      </td>
                    </tr>,
                    ...group.rows.map((row, ri) => (
                      <tr key={`r-${gi}-${ri}`} style={{ background: ri % 2 === 1 ? 'rgba(111,155,198,0.02)' : 'transparent' }}>
                        <td style={{ ...MONO, fontSize: 12, color: '#9398A8', padding: '11px 16px 11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                          {row.feature}
                        </td>
                        {(['free', 'starter', 'pro', 'scale'] as const).map(col => (
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

      {/* ── 4. FAQ (always visible) ──────────────────────────────────────────── */}
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

      {/* ── 5. EXIT BAND (always visible) ───────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(111,155,198,0.15)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 700px 400px at 20% 50%, rgba(157,140,255,0.05) 0%, transparent 60%)',
            'radial-gradient(ellipse 700px 400px at 80% 50%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          ].join(', '),
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
          {/* API lane */}
          <div style={{ flex: 1, padding: '48px 40px', textAlign: 'center', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>Already building?</p>
            <p style={{ ...DISP, fontSize: 15, color: '#E6E9EE', fontWeight: 600, margin: '0 0 6px' }}>Raw API access. No dashboard. Same engine.</p>
            <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '0 0 20px' }}>25 free scans · from $29/mo</p>
            <Link href="/developers#pricing" style={{ ...MONO, fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '10px 20px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}>
              See API pricing →
            </Link>
          </div>

          {/* Scan lane */}
          <div style={{ flex: 1, padding: '48px 40px', textAlign: 'center' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>Not sure where to start?</p>
            <p style={{ ...DISP, fontSize: 15, color: '#E6E9EE', fontWeight: 600, margin: '0 0 6px' }}>Try a free scan. No account required.</p>
            <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '0 0 20px' }}>3 free scans · no credit card</p>
            <Link href="/scan" style={{ ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 20px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}>
              Scan my site →
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
