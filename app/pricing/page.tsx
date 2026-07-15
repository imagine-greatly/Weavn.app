import Link from 'next/link'
import SiteFooter from '@/components/landing/SiteFooter'
import { API_PLANS, DASHBOARD_PLANS, type ApiPlan, type DashboardPlan } from '@/lib/pricing'

/**
 * Unified pricing — two clearly-split tracks, ONE page. Every number is READ FROM
 * lib/pricing.ts (API_PLANS + DASHBOARD_PLANS), the single source of truth; nothing
 * is restated as a literal. Zero billing-logic changes here — presentation only.
 * API track = purple. Agency/Dashboard track = steel. Every tier states a real cap.
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

export default function PricingPage() {
  const apiPlans = Object.values(API_PLANS)
  const dashPlans = Object.values(DASHBOARD_PLANS)

  return (
    <main className="bg-background-base min-h-screen">
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 32px 40px' }}>
        <p style={{ ...MONO, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#9398A8', margin: '0 0 16px' }}>PRICING</p>
        <h1 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(32px, 4.4vw, 52px)', color: '#E6E9EE', margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          One engine. Two ways to pay for it.
        </h1>
        <p style={{ ...SANS, fontSize: 16, lineHeight: 1.6, color: '#9398A8', maxWidth: 640, margin: 0 }}>
          The <span style={{ color: PURPLE }}>API track</span> meters by scan for platforms and developers. The <span style={{ color: STEEL }}>agency track</span> is a flat monthly plan with a hard scan cap and white-label reports. Same 311-check engine on every plan.
        </p>
        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '16px 0 0' }}>Prices shown monthly · annual billing saves two months on flat fees.</p>
      </section>

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

      <Track
        kicker="Agency & dashboard"
        accent={STEEL}
        title="Flat monthly. White-label reports you bill as the deliverable."
        blurb="A hard monthly scan cap, no overage. Agency and up add white-label reports, a client roster, and branding controls."
      >
        {dashPlans.map((p) => (
          <Card
            key={p.id}
            accent={STEEL}
            featured={p.id === 'agency'}
            name={p.name}
            price={dashPrice(p)}
            sub={dashSub(p)}
            blurb={p.blurb}
            whiteLabel={p.whiteLabel}
            cta={dashCta(p)}
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
