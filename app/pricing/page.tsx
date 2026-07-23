import Link from 'next/link'
import SiteFooter from '@/components/landing/SiteFooter'
import { API_PLANS, DASHBOARD_PLANS, type ApiPlan, type DashboardPlan } from '@/lib/pricing'

/**
 * Unified pricing — two co-equal tracks, ONE page, LED BY AGENCY. Every number is
 * READ FROM lib/pricing.ts (API_PLANS + DASHBOARD_PLANS), the single source of truth;
 * nothing is restated as a literal. Zero billing-logic changes here — presentation only.
 *
 * Hierarchy: the page leads with the Agency/Dashboard track (steel); within it, AGENCY is
 * the dominant featured tier and Free/Starter/Pro are demoted "on-ramps" (smaller, lower
 * contrast). The API track (purple) follows as a co-equal section — NOT demoted. The two
 * tracks never cross-reference. Every tier states a real cap.
 */

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

const PURPLE = '#9D8CFF'
const STEEL = '#6F9BC6'
const GREEN = '#00C48C'

const usd = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`)

// ── API track (purple) ─────────────────────────────────────────────────────────
function apiPrice(p: ApiPlan): string {
  if (p.baseMonthlyUsd == null) return p.id === 'enterprise' ? 'Custom' : 'Free'
  return `${usd(p.baseMonthlyUsd)}/mo`
}
function apiSub(p: ApiPlan): string {
  if (p.id === 'enterprise') return 'Custom volume'
  if (p.trialScans != null) return `${p.trialScans} free scans, then ${usd(p.overageUsd)}/scan`
  if (p.includedScans != null) return `${p.includedScans.toLocaleString()} scans included, then ${usd(p.overageUsd)}/scan`
  return `${usd(p.overageUsd)}/scan`
}
function apiCta(p: ApiPlan): { label: string; href: string } {
  return p.cta.kind === 'contact'
    ? { label: 'Talk to us', href: '/contact' }
    : { label: 'Get API key', href: '/auth?surface=api' }
}

// ── Dashboard / Agency track (steel) ────────────────────────────────────────────
function dashPrice(p: DashboardPlan): string {
  if (p.priceMonthlyUsd == null) return 'Custom'
  return p.priceMonthlyUsd === 0 ? 'Free' : `${usd(p.priceMonthlyUsd)}/mo`
}
function dashSub(p: DashboardPlan): string {
  return p.scansPerMonth == null ? 'Custom volume' : `${p.scansPerMonth} scans / month`
}
function dashCta(p: DashboardPlan): { label: string; href: string } {
  if (p.cta.kind === 'contact') return { label: 'Talk to us', href: '/contact' }
  if (p.cta.kind === 'none') return { label: 'Start free', href: '/auth?surface=dashboard' }
  return { label: 'Start', href: `/auth?surface=dashboard&plan=${p.id}` }
}

// ── API track card (unchanged idiom — equal-weight cards, dev featured) ──────────
function Card({
  accent, featured, name, price, sub, blurb, whiteLabel, cta,
}: {
  accent: string; featured?: boolean; name: string; price: string; sub: string
  blurb: string; whiteLabel?: boolean; cta: { label: string; href: string }
}) {
  return (
    <div style={{
      position: 'relative', background: '#080D18',
      borderTop: `1px solid ${featured ? accent : 'rgba(255,255,255,0.1)'}`,
      borderLeft: '0.5px solid rgba(255,255,255,0.06)',
      borderRight: '0.5px solid rgba(255,255,255,0.06)',
      borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      padding: '24px 22px 22px', display: 'flex', flexDirection: 'column', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ ...MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, margin: 0 }}>{name}</p>
        {whiteLabel ? <span style={{ ...MONO, fontSize: 8.5, letterSpacing: '0.08em', color: STEEL, border: `0.5px solid ${STEEL}66`, padding: '3px 6px' }}>WHITE-LABEL</span> : null}
      </div>
      <p style={{ ...DISP, fontWeight: 700, fontSize: 26, color: '#E6E9EE', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{price}</p>
      <p style={{ ...MONO, fontSize: 11.5, color: '#9398A8', margin: '0 0 16px', lineHeight: 1.4 }}>{sub}</p>
      <p style={{ ...SANS, fontSize: 13, color: '#6E7587', margin: '0 0 22px', lineHeight: 1.55, flexGrow: 1 }}>{blurb}</p>
      <Link href={cta.href} style={{
        ...MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center',
        color: accent, background: featured ? `${accent}1a` : 'transparent',
        border: `1px solid ${accent}${featured ? '' : '55'}`, padding: '11px 14px', textDecoration: 'none',
      }}>
        {cta.label} →
      </Link>
    </div>
  )
}

function Track({
  kicker, accent, title, blurb, children,
}: { kicker: string; accent: string; title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 24px' }}>
      <div style={{ borderTop: `1px solid ${accent}33`, paddingTop: 28, marginBottom: 28 }}>
        <p style={{ ...MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, margin: '0 0 12px' }}>{kicker}</p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(22px, 3vw, 30px)', color: '#E6E9EE', margin: '0 0 10px', letterSpacing: '-0.02em' }}>{title}</h2>
        <p style={{ ...SANS, fontSize: 14.5, color: '#9398A8', margin: 0, maxWidth: 620, lineHeight: 1.6 }}>{blurb}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {children}
      </div>
    </section>
  )
}

// ── Agency featured card — the dominant tier on the whole page ───────────────────
function AgencyFeature({ plan }: { plan: DashboardPlan }) {
  const cta = dashCta(plan)
  const delivers = [
    'Your logo, accent, and theme on every report',
    'Client roster with per-client scan history',
    'White-label share links + PDF export — no Weavn branding',
  ]
  return (
    <div className="pr-agency" style={{
      position: 'relative',
      background: '#0A0F16',
      borderTop: `1px solid ${STEEL}`,
      borderLeft: '1px solid rgba(111,155,198,0.14)',
      borderRight: '1px solid rgba(111,155,198,0.08)',
      borderBottom: '1px solid rgba(111,155,198,0.06)',
      boxShadow: '0 0 0 1px rgba(111,155,198,0.16), 0 0 60px rgba(111,155,198,0.10), inset 0 1px 0 0 rgba(111,155,198,0.22)',
      padding: '30px 34px',
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: 32,
    }}>
      {/* Left — the pitch, price, CTA */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ ...MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: STEEL, background: 'rgba(111,155,198,0.1)', border: `0.5px solid ${STEEL}66`, padding: '4px 9px' }}>For agencies reselling audits</span>
          <span style={{ ...MONO, fontSize: 8.5, letterSpacing: '0.08em', color: STEEL, border: `0.5px solid ${STEEL}66`, padding: '3px 6px' }}>WHITE-LABEL</span>
        </div>
        <p style={{ ...MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: STEEL, margin: '0 0 10px' }}>{plan.name}</p>
        <p style={{ ...DISP, fontWeight: 700, fontSize: 46, color: '#E6E9EE', margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1 }}>{dashPrice(plan)}</p>
        <p style={{ ...MONO, fontSize: 11.5, color: '#6E7587', margin: '0 0 20px' }}>{dashSub(plan)} · hard cap, no overage</p>
        <p style={{ ...SANS, fontSize: 14.5, color: '#C7CBD4', margin: '0 0 26px', lineHeight: 1.6, maxWidth: 380 }}>{plan.blurb}</p>
        <Link href={cta.href} style={{
          ...MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center',
          color: STEEL, background: 'rgba(111,155,198,0.14)', border: `1px solid ${STEEL}`,
          padding: '13px 18px', textDecoration: 'none', marginTop: 'auto',
        }}>
          {cta.label} →
        </Link>
      </div>
      {/* Right — what ships under the agency's name */}
      <div className="pr-agency-delivers" style={{ borderLeft: '0.5px solid rgba(111,155,198,0.14)', paddingLeft: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6E7587', margin: '0 0 16px' }}>What ships under your name</p>
        {delivers.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 13 }}>
            <span aria-hidden style={{ width: 6, height: 6, background: STEEL, flexShrink: 0, marginTop: 6, boxShadow: '0 0 6px rgba(111,155,198,0.5)' }} />
            <span style={{ ...SANS, fontSize: 13.5, color: '#9398A8', lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── On-ramp card — demoted (smaller, lower contrast). Present, not competing. ────
function OnRamp({ plan }: { plan: DashboardPlan }) {
  const cta = dashCta(plan)
  return (
    <div style={{
      background: '#080D18',
      border: '0.5px solid rgba(255,255,255,0.07)',
      padding: '18px 18px', display: 'flex', flexDirection: 'column', minWidth: 0,
    }}>
      <p style={{ ...MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7E8595', margin: '0 0 10px' }}>{plan.name}</p>
      <p style={{ ...DISP, fontWeight: 700, fontSize: 20, color: '#B9BEC9', margin: '0 0 3px', letterSpacing: '-0.01em' }}>{dashPrice(plan)}</p>
      <p style={{ ...MONO, fontSize: 10.5, color: '#5C6373', margin: '0 0 12px' }}>{dashSub(plan)}</p>
      <p style={{ ...SANS, fontSize: 12, color: '#6E7587', margin: '0 0 16px', lineHeight: 1.5, flexGrow: 1 }}>{plan.blurb}</p>
      <Link href={cta.href} style={{ ...MONO, fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8A91A1', textDecoration: 'none', borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        {cta.label} →
      </Link>
    </div>
  )
}

export default function PricingPage() {
  const apiPlans = Object.values(API_PLANS)
  const agency = DASHBOARD_PLANS.agency
  // Demoted on-ramps, in ascending order, ending at the contact tier.
  const onRamps = [DASHBOARD_PLANS.free, DASHBOARD_PLANS.starter, DASHBOARD_PLANS.pro, DASHBOARD_PLANS.enterprise]

  return (
    <main className="bg-background-base min-h-screen">
      <style>{`
        @media (max-width: 860px) {
          .pr-agency { grid-template-columns: 1fr !important; }
          .pr-agency-delivers { border-left: none !important; padding-left: 0 !important; border-top: 0.5px solid rgba(111,155,198,0.14) !important; padding-top: 22px !important; }
        }
        @media (max-width: 720px) { .pr-onramps { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 430px) { .pr-onramps { grid-template-columns: 1fr !important; } }
      `}</style>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 32px 40px' }}>
        <p style={{ ...MONO, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#9398A8', margin: '0 0 16px' }}>PRICING</p>
        <h1 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(32px, 4.4vw, 52px)', color: '#E6E9EE', margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          One engine. Two ways to pay for it.
        </h1>
        <p style={{ ...SANS, fontSize: 16, lineHeight: 1.6, color: '#9398A8', maxWidth: 660, margin: 0 }}>
          The <span style={{ color: STEEL }}>agency track</span> is a flat monthly plan — white-label reports you put your own name on and bill clients as the deliverable, with a hard scan cap. The <span style={{ color: PURPLE }}>API track</span> meters by scan for platforms and developers. Same 311-check engine on every plan.
        </p>
        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '16px 0 0' }}>Prices shown monthly · annual billing saves two months on flat fees.</p>
      </section>

      {/* ── Agency / dashboard track — LEADS the page, Agency featured ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 24px' }}>
        <div style={{ borderTop: `1px solid ${STEEL}33`, paddingTop: 28, marginBottom: 24 }}>
          <p style={{ ...MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: STEEL, margin: '0 0 12px' }}>Agency &amp; dashboard</p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(22px, 3vw, 30px)', color: '#E6E9EE', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            White-label reports you bill clients as the deliverable.
          </h2>
          <p style={{ ...SANS, fontSize: 14.5, color: '#9398A8', margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
            Put your own name on a scored conversion report and bill it at audit prices. Flat monthly, a hard scan cap, no overage — the smaller plans are on-ramps you grow out of on the way to reselling.
          </p>
        </div>

        <AgencyFeature plan={agency} />

        <p style={{ ...MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6E7587', margin: '28px 0 14px' }}>
          Not reselling yet — start here and grow into it
        </p>
        <div className="pr-onramps" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {onRamps.map((p) => <OnRamp key={p.id} plan={p} />)}
        </div>
      </section>

      {/* ── API track — co-equal section, NOT demoted ── */}
      <Track
        kicker="API · for platforms & developers"
        accent={PURPLE}
        title="Metered by scan. Build against the schema once."
        blurb="Start free in the playground, then pay per scan. Included scans drop the rate as you scale; cache hits are free."
      >
        {apiPlans.map((p) => (
          <Card
            key={p.id}
            accent={PURPLE}
            featured={p.id === 'dev'}
            name={p.name}
            price={apiPrice(p)}
            sub={apiSub(p)}
            blurb={p.blurb}
            cta={apiCta(p)}
          />
        ))}
      </Track>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 72px' }}>
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', flexWrap: 'wrap', gap: '8px 28px' }}>
          <span style={{ ...MONO, fontSize: 11.5, color: GREEN }}>· 311 checks on every plan</span>
          <span style={{ ...MONO, fontSize: 11.5, color: '#6E7587' }}>· 27 categories · 7 dimensions</span>
          <span style={{ ...MONO, fontSize: 11.5, color: '#6E7587' }}>· Every plan states its real scan cap</span>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
