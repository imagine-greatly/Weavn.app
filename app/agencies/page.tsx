import type { Metadata } from 'next'
import Link from 'next/link'
import { DASHBOARD_PLANS } from '@/lib/pricing'
import SiteFooter from '@/components/landing/SiteFooter'

// ── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'For Agencies — Weavn',
  description:
    'The audit engine behind your agency. Scan any client site, put your logo on a scored conversion report, and bill it at audit prices. White-label reports on the Agency plan.',
  openGraph: {
    title: 'For Agencies — Weavn',
    description:
      'White-label scored conversion reports, billed at audit prices. The same 311-check engine, delivered under your own name.',
    url: 'https://weavn.app/agencies',
    siteName: 'Weavn',
    type: 'website',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://weavn.app/agencies' },
}

// ── Design tokens (locked system — inline to match the /product + / idiom) ────
const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// Agency track: STEEL leads. PURPLE only where the API/engine door is referenced.
// GREEN is success-only. No purple anywhere except the ENGINE BRIDGE section.
const STEEL = '#6F9BC6'
const PURPLE = '#9D8CFF'
const GREEN = '#00C48C' // success only
const CRIT = '#E8635F'
const HIGH_AMB = '#EFB23E'
const INK_PRI = '#E6E9EE'
const INK_SEC = '#9398A8'
const INK_MUT = '#6E7587'
const SURFACE = '#0A0E18'
const BG_BASE = '#050810'

// ── Pricing (single source of truth — never hardcode the numbers) ─────────────
const AGENCY = DASHBOARD_PLANS.agency
const AGENCY_PRICE = AGENCY.priceMonthlyUsd ?? 0 // 249
const AGENCY_SCANS = AGENCY.scansPerMonth ?? 0 // 500
const COST_PER_SCAN = AGENCY_SCANS > 0 ? AGENCY_PRICE / AGENCY_SCANS : 0

// Editorial market range (NOT a pricing-catalog number) — what agencies bill per audit.
const AUDIT_LOW = 500
const AUDIT_HIGH = 1500

// ── Shared chrome ─────────────────────────────────────────────────────────────

function Ticks() {
  const b = '0.5px solid rgba(111,155,198,0.2)'
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: b, borderLeft: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: b, borderRight: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: b, borderLeft: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: b, borderRight: b, pointerEvents: 'none', zIndex: 1 }} />
    </>
  )
}

// Steel ambient radial bloom — depth behind content, never a spotlight.
function Bloom({ size = 760, opacity = 0.15, style }: { size?: number; opacity?: number; style?: React.CSSProperties }) {
  const o = (m: number) => +(opacity * m).toFixed(4)
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: size, height: size,
        background: `radial-gradient(circle at center, rgba(111,155,198,${opacity}) 0%, rgba(111,155,198,${o(0.42)}) 30%, rgba(111,155,198,${o(0.14)}) 52%, rgba(111,155,198,${o(0.04)}) 70%, transparent 82%)`,
        pointerEvents: 'none', zIndex: 0, ...style,
      }}
    />
  )
}

// ── Salvaged data — white-label report mock ───────────────────────────────────
// Reused verbatim from the old /dashboard MultiSiteSection report visual.
const REPORT_FINDINGS = [
  { p: 'P1', sev: 'CRITICAL', sevColor: CRIT, sevBorder: 'rgba(232,99,95,0.4)', title: 'Hero headline is feature-led, not outcome-led', lift: '+12–18%' },
  { p: 'P2', sev: 'HIGH', sevColor: HIGH_AMB, sevBorder: 'rgba(239,178,62,0.4)', title: 'No above-fold social proof', lift: '+8–11%' },
  { p: 'P3', sev: 'HIGH', sevColor: HIGH_AMB, sevBorder: 'rgba(239,178,62,0.4)', title: 'Dual primary CTAs create decision paralysis', lift: '+6–9%' },
  { p: 'P4', sev: 'HIGH', sevColor: HIGH_AMB, sevBorder: 'rgba(239,178,62,0.4)', title: 'Pricing not visible without scrolling', lift: '+5–8%' },
  { p: 'P5', sev: 'LOW', sevColor: INK_MUT, sevBorder: 'rgba(110,117,135,0.4)', title: 'Missing favicon — minor trust signal', lift: '+1–2%' },
]

// The white-label report mock — STATIC ILLUSTRATION, self-contained inline SVG dial.
function WhiteLabelReport() {
  return (
    <div style={{
      background: 'rgba(6,9,18,0.95)',
      border: '1px solid rgba(111,155,198,0.2)',
      boxShadow: '0 0 60px rgba(111,155,198,0.08), inset 0 1px 0 0 rgba(111,155,198,0.18)',
    }}>
      {/* Report header — agency logo block + score dial */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px', borderBottom: '1px solid rgba(111,155,198,0.1)', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, background: 'rgba(111,155,198,0.15)', border: '1px solid rgba(111,155,198,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ ...MONO, fontSize: 18, fontWeight: 700, color: 'rgba(111,155,198,0.9)' }}>AC</span>
          </div>
          <div>
            <p style={{ ...DISP, fontSize: 22, fontWeight: 700, color: INK_PRI, margin: '0 0 3px' }}>ACME AGENCY</p>
            <p style={{ ...SANS, fontSize: 13, color: INK_MUT, margin: 0 }}>Conversion Audit Report · Prepared for Client</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="28" stroke="rgba(111,155,198,0.12)" strokeWidth="3.5" fill="none" />
            <circle cx="36" cy="36" r="28" stroke={CRIT} strokeWidth="3.5" strokeDasharray="175.93" strokeDashoffset="110.84" strokeLinecap="round" fill="none" transform="rotate(-90 36 36)" />
            <text x="36" y="44" textAnchor="middle" fill={CRIT} style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 22, fontWeight: 700 }}>37</text>
          </svg>
          <div style={{ marginTop: 4 }}>
            <span style={{ ...MONO, fontSize: 8, color: CRIT, border: `0.5px solid ${CRIT}`, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CRITICAL</span>
          </div>
          <p style={{ ...MONO, fontSize: 9, color: INK_MUT, margin: '4px 0 0' }}>high upside · B2B SaaS</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="ag-report-meta" style={{ display: 'flex', padding: '12px 32px', background: 'rgba(111,155,198,0.03)', borderBottom: '1px solid rgba(111,155,198,0.08)', gap: 0 }}>
        {[
          { label: 'CLIENT SITE', val: 'acme-client.com' },
          { label: 'SCAN DATE', val: 'June 11, 2026' },
          { label: 'VERTICAL', val: 'B2B SaaS' },
          { label: 'FINDINGS', val: '23 total · 4 critical' },
        ].map((m, mi) => (
          <div key={mi} style={{ flex: 1, paddingRight: 16, paddingLeft: mi > 0 ? 16 : 0, borderLeft: mi > 0 ? '1px solid rgba(111,155,198,0.1)' : 'none' }}>
            <p style={{ ...MONO, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', color: INK_MUT, margin: '0 0 2px' }}>{m.label}</p>
            <p style={{ ...MONO, fontSize: 11, color: INK_SEC, margin: 0 }}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Findings table */}
      <div style={{ padding: '0 32px 28px' }}>
        <div className="ag-report-row" style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 80px 100px', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(111,155,198,0.12)', marginBottom: 4 }}>
          {['PRIORITY', 'SEVERITY', 'FINDING', 'EST. LIFT', 'STATUS'].map(h => (
            <p key={h} style={{ ...MONO, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', color: INK_MUT, margin: 0 }}>{h}</p>
          ))}
        </div>
        {REPORT_FINDINGS.map((f, fi) => (
          <div key={fi} className="ag-report-row" style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 80px 100px', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
            <p style={{ ...MONO, fontSize: 11, color: INK_MUT, margin: 0 }}>{f.p}</p>
            <span style={{ ...MONO, fontSize: 8, color: f.sevColor, border: `0.5px solid ${f.sevBorder}`, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.08em', justifySelf: 'start' }}>{f.sev}</span>
            <p style={{ ...DISP, fontSize: 13, fontWeight: 500, color: INK_PRI, margin: 0, lineHeight: 1.3 }}>{f.title}</p>
            <p style={{ ...MONO, fontSize: 11, color: GREEN, margin: 0 }}>{f.lift}</p>
            <p style={{ ...MONO, fontSize: 9, color: GREEN, margin: 0 }}>FIX INCLUDED</p>
          </div>
        ))}
        <p style={{ ...MONO, fontSize: 10, color: INK_MUT, margin: '12px 0 0', fontStyle: 'italic', textAlign: 'center' }}>+ 18 more findings in full report</p>
      </div>

      {/* Confidential footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 32px', borderTop: '1px solid rgba(111,155,198,0.08)', background: 'rgba(111,155,198,0.02)', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ ...MONO, fontSize: 9, color: INK_MUT, margin: 0 }}>ACME AGENCY · Conversion Intelligence</p>
        <p style={{ ...MONO, fontSize: 9, color: INK_MUT, margin: 0 }}>311 checks · verified findings</p>
        <p style={{ ...MONO, fontSize: 9, color: INK_MUT, margin: 0 }}>CONFIDENTIAL · acme-client.com</p>
      </div>
    </div>
  )
}

// ── 1. HERO ───────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '112px 32px 72px' }}>
      <Ticks />
      <Bloom size={900} opacity={0.14} style={{ top: '28%' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto' }}>
        {/* Pitch */}
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 48px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: STEEL, margin: '0 0 20px' }}>
            FOR AGENCIES
          </p>
          <h1 style={{ ...DISP, fontSize: 'clamp(34px, 4.6vw, 56px)', fontWeight: 700, letterSpacing: '-0.04em', color: INK_PRI, margin: '0 0 22px', lineHeight: 1.06 }}>
            The audit engine behind your agency.
          </h1>
          <p style={{ ...SANS, fontSize: 18, lineHeight: 1.6, color: INK_SEC, maxWidth: 620, margin: '0 auto 16px' }}>
            Your logo on the report. You bill it at audit prices. Scan any client site and hand back a scored conversion report under your own name &mdash; Weavn never appears in the deliverable.
          </p>
          <p style={{ ...MONO, fontSize: 12.5, color: STEEL, letterSpacing: '0.04em', lineHeight: 1.6, maxWidth: 620, margin: '0 auto 34px' }}>
            White-label scored reports · 311 checks across 27 categories · no code to wire up.
          </p>

          {/* CTAs — primary steel filled, secondary ghost */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link href="/auth?surface=dashboard" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: STEEL, background: 'rgba(111,155,198,0.1)', border: '1px solid rgba(111,155,198,0.5)', padding: '13px 26px', textDecoration: 'none', display: 'inline-block' }}>
              Start free →
            </Link>
            <Link href="/playground" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_SEC, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', padding: '13px 26px', textDecoration: 'none', display: 'inline-block' }}>
              See a live report →
            </Link>
          </div>
        </div>

        {/* The product, shown — full-fidelity white-label report */}
        <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(111,155,198,0.5)', margin: '0 0 12px', textAlign: 'center' }}>
          THIS IS WHAT YOUR CLIENT RECEIVES — STATIC ILLUSTRATION
        </p>
        <WhiteLabelReport />
        <p style={{ ...SANS, fontSize: 13, color: INK_MUT, textAlign: 'center', margin: '16px 0 0', fontStyle: 'italic', lineHeight: 1.6 }}>
          Your name, your branding, your color. The scored report goes out as your own.
        </p>
      </div>
    </section>
  )
}

// ── 2. ECONOMICS ──────────────────────────────────────────────────────────────

function EconomicsSection() {
  const pct = (v: number) => Math.round((v / AUDIT_HIGH) * 100)
  const bars = [
    { label: `Agency plan — $${AGENCY_PRICE}/mo`, sub: `${AGENCY_SCANS} scans included`, value: AGENCY_PRICE, w: pct(AGENCY_PRICE), color: STEEL, glow: 'rgba(111,155,198,0.4)' },
    { label: `One audit — billed at $${AUDIT_LOW.toLocaleString()}`, sub: 'low end of the market range', value: AUDIT_LOW, w: pct(AUDIT_LOW), color: GREEN, glow: 'rgba(0,196,140,0.4)' },
    { label: `One audit — billed at $${AUDIT_HIGH.toLocaleString()}`, sub: 'high end of the market range', value: AUDIT_HIGH, w: pct(AUDIT_HIGH), color: GREEN, glow: 'rgba(0,196,140,0.4)' },
  ]
  return (
    <section style={{ padding: '80px 32px', borderTop: '0.5px solid rgba(111,155,198,0.1)', position: 'relative', overflow: 'hidden', background: BG_BASE }}>
      <Bloom size={820} opacity={0.13} style={{ top: '56%' }} />
      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: STEEL, margin: '0 0 16px' }}>
          THE ECONOMICS
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', color: INK_PRI, letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.1 }}>
          One deliverable pays for the whole month.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: INK_SEC, lineHeight: 1.65, maxWidth: 620, margin: '0 0 40px' }}>
          The Agency plan is ${AGENCY_PRICE} a month for {AGENCY_SCANS} scans. Agencies bill a conversion audit at ${AUDIT_LOW.toLocaleString()}&ndash;${AUDIT_HIGH.toLocaleString()} each. The margin is not a claim &mdash; it is the math.
        </p>

        {/* Margin bars — scaled to the high end of the market range */}
        <div style={{
          background: SURFACE,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          borderRight: '1px solid rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.12)',
          padding: '28px 32px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {bars.map(b => (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ ...SANS, fontSize: 14, color: INK_PRI }}>{b.label}</span>
                  <span style={{ ...MONO, fontSize: 11, color: INK_MUT }}>{b.sub}</span>
                </div>
                <div style={{ position: 'relative', height: 22, width: '100%', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ height: '100%', width: `${b.w}%`, minWidth: 6, background: b.color, boxShadow: `0 0 14px ${b.glow}` }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...MONO, fontSize: 11, color: 'rgba(111,155,198,0.7)', margin: '20px 0 0', lineHeight: 1.6 }}>
            At {AGENCY_SCANS} scans for ${AGENCY_PRICE}, each scan costs about ${COST_PER_SCAN.toFixed(2)} to run &mdash; and each one goes out the door as an audit.
          </p>
        </div>

        {/* Three plain-math tiles */}
        <div className="ag-econ-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { big: `$${COST_PER_SCAN.toFixed(2)}`, label: 'YOUR COST PER SCAN', sub: `$${AGENCY_PRICE} ÷ ${AGENCY_SCANS} scans`, color: STEEL },
            { big: `$${AUDIT_LOW.toLocaleString()}–${AUDIT_HIGH.toLocaleString()}`, label: 'YOU BILL PER AUDIT', sub: 'editorial market range', color: GREEN },
            { big: `${AGENCY_SCANS}`, label: 'DELIVERABLES A MONTH', sub: 'included on the plan', color: STEEL },
          ].map(t => (
            <div key={t.label} style={{
              background: SURFACE,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.1)',
              padding: '22px 24px',
            }}>
              <p style={{ ...DISP, fontWeight: 700, fontSize: 30, color: t.color, margin: '0 0 8px', lineHeight: 1 }}>{t.big}</p>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_MUT, margin: '0 0 6px' }}>{t.label}</p>
              <p style={{ ...MONO, fontSize: 11, color: INK_SEC, margin: 0 }}>{t.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 3. WORKFLOW ───────────────────────────────────────────────────────────────

const CLIENT_ROSTER = [
  { name: 'Northwind Co.', domain: 'northwind.io', last: 'Jun 11', score: 37, band: CRIT },
  { name: 'Lumen Health', domain: 'lumenhealth.com', last: 'Jun 09', score: 52, band: HIGH_AMB },
  { name: 'Parcel', domain: 'parcel.app', last: 'Jun 07', score: 68, band: STEEL },
  { name: 'Vega Retail', domain: 'vega.store', last: 'Jun 04', score: 61, band: STEEL },
]

const SCAN_HISTORY = [
  { date: 'Apr 02', score: 41 },
  { date: 'May 06', score: 55 },
  { date: 'Jun 11', score: 68 },
]

function WorkflowSection() {
  return (
    <section style={{ padding: '80px 32px', borderTop: '0.5px solid rgba(111,155,198,0.1)', position: 'relative', overflow: 'hidden', background: BG_BASE }}>
      <Bloom size={860} opacity={0.12} style={{ top: '46%' }} />
      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: STEEL, margin: '0 0 16px' }}>
          THE DELIVERABLE FACTORY
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', color: INK_PRI, letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.1 }}>
          Every client in one place. Every report on brand.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: INK_SEC, lineHeight: 1.65, maxWidth: 620, margin: '0 0 44px' }}>
          Keep a roster of client sites, scan on your cadence, and track each score over time. Set your branding once and every report ships under it.
        </p>

        <div className="ag-flow-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* A — Client roster (the Clients tab) */}
          <div style={{ background: SURFACE, border: '1px solid rgba(111,155,198,0.14)', boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid rgba(111,155,198,0.12)' }}>
              <span aria-hidden style={{ width: 6, height: 6, background: STEEL, flexShrink: 0, boxShadow: '0 0 6px rgba(111,155,198,0.5)' }} />
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: INK_SEC }}>CLIENTS</span>
              <span style={{ ...MONO, fontSize: 10, color: INK_MUT, marginLeft: 'auto' }}>{CLIENT_ROSTER.length} active</span>
            </div>
            <div style={{ padding: '6px 0' }}>
              {CLIENT_ROSTER.map(c => (
                <div key={c.domain} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ ...SANS, fontSize: 13, fontWeight: 500, color: INK_PRI, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                    <p style={{ ...MONO, fontSize: 10, color: INK_MUT, margin: 0 }}>{c.domain}</p>
                  </div>
                  <span style={{ ...MONO, fontSize: 10, color: INK_MUT, flexShrink: 0 }}>{c.last}</span>
                  <span style={{ ...MONO, fontSize: 13, fontWeight: 600, color: c.band, flexShrink: 0, width: 26, textAlign: 'right' }}>{c.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* B — Per-client scan history */}
          <div style={{ background: SURFACE, border: '1px solid rgba(111,155,198,0.14)', boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid rgba(111,155,198,0.12)' }}>
              <span aria-hidden style={{ width: 6, height: 6, background: STEEL, flexShrink: 0, boxShadow: '0 0 6px rgba(111,155,198,0.5)' }} />
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: INK_SEC }}>SCAN HISTORY · PARCEL</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 120, marginBottom: 14 }}>
                {SCAN_HISTORY.map((s, i) => (
                  <div key={s.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, justifyContent: 'flex-end', height: '100%' }}>
                    <span style={{ ...MONO, fontSize: 12, fontWeight: 600, color: i === SCAN_HISTORY.length - 1 ? STEEL : INK_SEC }}>{s.score}</span>
                    <div style={{ width: '100%', maxWidth: 42, height: `${s.score}%`, background: i === SCAN_HISTORY.length - 1 ? STEEL : 'rgba(111,155,198,0.35)', boxShadow: i === SCAN_HISTORY.length - 1 ? '0 0 14px rgba(111,155,198,0.4)' : 'none' }} />
                    <span style={{ ...MONO, fontSize: 9, color: INK_MUT }}>{s.date}</span>
                  </div>
                ))}
              </div>
              <p style={{ ...SANS, fontSize: 12, color: INK_MUT, margin: 0, lineHeight: 1.5, borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                Score trend across three scans &mdash; the proof-of-work you show the client at renewal.
              </p>
            </div>
          </div>

          {/* C — Branding controls (logo / accent / theme) */}
          <div style={{ background: SURFACE, border: '1px solid rgba(111,155,198,0.14)', boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid rgba(111,155,198,0.12)' }}>
              <span aria-hidden style={{ width: 6, height: 6, background: STEEL, flexShrink: 0, boxShadow: '0 0 6px rgba(111,155,198,0.5)' }} />
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: INK_SEC }}>BRANDING</span>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ ...MONO, fontSize: 11, color: INK_SEC }}>logo</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, background: 'rgba(111,155,198,0.15)', border: '1px solid rgba(111,155,198,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ ...MONO, fontSize: 12, fontWeight: 700, color: 'rgba(111,155,198,0.9)' }}>AC</span>
                  </div>
                  <span style={{ ...MONO, fontSize: 10, color: INK_MUT }}>acme-logo.svg</span>
                </div>
              </div>
              {/* Accent */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
                <span style={{ ...MONO, fontSize: 11, color: INK_SEC }}>accent</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, background: STEEL, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <span style={{ ...MONO, fontSize: 10, color: INK_MUT }}>#6F9BC6</span>
                </div>
              </div>
              {/* Theme */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
                <span style={{ ...MONO, fontSize: 11, color: INK_SEC }}>theme</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ ...MONO, fontSize: 10, color: STEEL, border: '1px solid rgba(111,155,198,0.4)', padding: '3px 10px' }}>dark</span>
                  <span style={{ ...MONO, fontSize: 10, color: INK_MUT, border: '1px solid rgba(255,255,255,0.1)', padding: '3px 10px' }}>light</span>
                </div>
              </div>
            </div>
          </div>

          {/* D — White-label share links */}
          <div style={{ background: SURFACE, border: '1px solid rgba(111,155,198,0.14)', boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid rgba(111,155,198,0.12)' }}>
              <span aria-hidden style={{ width: 6, height: 6, background: STEEL, flexShrink: 0, boxShadow: '0 0 6px rgba(111,155,198,0.5)' }} />
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: INK_SEC }}>SHARE LINK</span>
              <span style={{ ...MONO, fontSize: 10, color: GREEN, marginLeft: 'auto' }}>LIVE</span>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: BG_BASE, border: '1px solid rgba(111,155,198,0.18)', padding: '11px 14px' }}>
                <span style={{ ...MONO, fontSize: 11, color: STEEL, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>reports.acmeagency.com/northwind</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['your domain', 'no Weavn branding', 'PDF export'].map(t => (
                  <span key={t} style={{ ...MONO, fontSize: 10, color: INK_SEC, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)', padding: '5px 10px' }}>{t}</span>
                ))}
              </div>
              <p style={{ ...SANS, fontSize: 12, color: INK_MUT, margin: 0, lineHeight: 1.5 }}>
                Send a link or export the PDF. Either way the client sees your name on the report, not ours.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── 4. ENGINE BRIDGE (the API/engine door — PURPLE lives here only) ───────────

function EngineBridgeSection() {
  return (
    <section style={{ padding: '80px 32px', borderTop: '0.5px solid rgba(157,140,255,0.15)', position: 'relative', overflow: 'hidden', background: '#080D18' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 900px 600px at 50% 45%, rgba(157,140,255,0.08) 0%, transparent 60%)' }} />
      <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: PURPLE, margin: '0 0 16px' }}>
          UNDER THE HOOD
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(26px,3.6vw,40px)', color: INK_PRI, letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.12 }}>
          The same 311-check engine platforms embed via our API.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: INK_SEC, lineHeight: 1.65, maxWidth: 640, margin: '0 0 32px' }}>
          The scored report you hand a client and the JSON a product embeds are the same scan, run the same way. You use it as reports today; when you are ready to build it into your own tooling, the door is already open &mdash; agencies today, embedders tomorrow.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <Link href="/engine" style={{ ...MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: PURPLE, border: '1px solid rgba(157,140,255,0.5)', padding: '12px 22px', textDecoration: 'none', display: 'inline-block', background: 'rgba(157,140,255,0.08)' }}>
            See the engine →
          </Link>
          <Link href="/developers" style={{ ...MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: PURPLE, border: '1px solid rgba(157,140,255,0.25)', padding: '12px 22px', textDecoration: 'none', display: 'inline-block', background: 'transparent' }}>
            Read the API contract →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── 5. PRICING TEASER — Agency tier card (from DASHBOARD_PLANS.agency) ─────────

function PricingTeaserSection() {
  const features = [
    'White-label reports — your logo, accent, and theme',
    `${AGENCY_SCANS} scans a month`,
    'Client roster + per-client scan history',
    'White-label share links and PDF export',
  ]
  return (
    <section style={{ padding: '80px 32px 96px', borderTop: '0.5px solid rgba(111,155,198,0.1)', position: 'relative', overflow: 'hidden', background: BG_BASE }}>
      <Bloom size={720} opacity={0.15} style={{ top: '52%' }} />
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: STEEL, margin: '0 0 16px' }}>
          THE AGENCY PLAN
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', color: INK_PRI, letterSpacing: '-0.5px', margin: '0 0 32px', lineHeight: 1.1 }}>
          One plan. Every client, branded.
        </h2>

        {/* Agency tier card */}
        <div style={{
          textAlign: 'left',
          background: SURFACE,
          borderTop: '1px solid rgba(111,155,198,0.3)',
          borderLeft: '1px solid rgba(111,155,198,0.12)',
          borderRight: '1px solid rgba(111,155,198,0.06)',
          borderBottom: '1px solid rgba(111,155,198,0.04)',
          boxShadow: '0 0 0 1px rgba(111,155,198,0.18), 0 0 50px rgba(111,155,198,0.1), inset 0 1px 0 0 rgba(111,155,198,0.22)',
          padding: '32px 34px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            <p style={{ ...DISP, fontWeight: 700, fontSize: 20, color: INK_PRI, margin: 0 }}>{AGENCY.name}</p>
            <span style={{ ...MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: STEEL, border: '0.5px solid rgba(111,155,198,0.4)', padding: '3px 8px' }}>WHITE-LABEL</span>
          </div>
          <p style={{ ...DISP, fontWeight: 700, fontSize: 40, color: STEEL, margin: '0 0 4px', lineHeight: 1 }}>
            ${AGENCY_PRICE}<span style={{ ...MONO, fontSize: 14, fontWeight: 400, color: INK_MUT }}>/mo</span>
          </p>
          <p style={{ ...SANS, fontSize: 13, color: INK_SEC, margin: '0 0 22px', lineHeight: 1.55 }}>{AGENCY.blurb}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
            {features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span aria-hidden style={{ width: 6, height: 6, background: STEEL, flexShrink: 0, marginTop: 6, boxShadow: '0 0 6px rgba(111,155,198,0.5)' }} />
                <span style={{ ...SANS, fontSize: 14, color: INK_SEC, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>

          <Link href="/pricing" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: STEEL, background: 'rgba(111,155,198,0.1)', border: '1px solid rgba(111,155,198,0.5)', padding: '13px 24px', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            See full pricing →
          </Link>
        </div>

        <p style={{ ...MONO, fontSize: 11, color: INK_MUT, margin: '18px 0 0' }}>
          Every plan runs the same 311-check engine across 27 categories.
        </p>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgenciesPage() {
  return (
    <main style={{ minHeight: '100vh', background: BG_BASE }}>
      <style>{`
        @media (max-width: 767px) {
          .ag-econ-grid { grid-template-columns: 1fr !important; }
          .ag-flow-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 639px) {
          .ag-report-meta { flex-direction: column !important; gap: 8px !important; }
          .ag-report-row { grid-template-columns: 40px 1fr 76px !important; }
          .ag-report-row > *:nth-child(2), .ag-report-row > *:nth-child(5) { display: none !important; }
        }
      `}</style>
      <HeroSection />
      <EconomicsSection />
      <WorkflowSection />
      <EngineBridgeSection />
      <PricingTeaserSection />
      <SiteFooter />
    </main>
  )
}
