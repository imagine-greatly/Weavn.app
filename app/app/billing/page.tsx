'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { DASHBOARD_PLANS, annualUsd, isCheckoutableDashboardTier, type BillingInterval, type DashboardTier } from '@/lib/pricing'
import {
  DASH, MONO, BODY, DISP, STEEL, steelLine,
  PageHeader, Panel,
} from '@/components/dashboard/ui'

// Canonical DASHBOARD tiers (mirrors the /dashboard marketing pricing). These are the
// dashboard plan set ONLY — API/console tiers never render here. Upgrades run self-serve
// Stripe Checkout per tier; downgrades route to the Stripe billing portal.
// Prices are NOT stored here — they are read from DASHBOARD_PLANS (lib/pricing.ts,
// the single source of truth) via priceFor() so the catalog can never drift from
// what the billing page shows. Only display-only copy (scans/features) lives here.
interface Tier {
  id: DashboardTier
  name: string
  scans: string
  features: string[]
}
// Qualitative feature copy ONLY — every name, price, and scan count is read from
// DASHBOARD_PLANS (lib/pricing.ts, the single source of truth). The dashboard track is
// hard-capped per tier, so there is no "Unlimited". Coverage framing — no corpus/rank claims.
const TIER_FEATURES: Record<DashboardTier, string[]> = {
  free:       ['Coverage score', 'Top 3 findings, ranked'],
  starter:    ['Full report — all findings ranked', 'AI-rewritten copy', 'Cancel anytime'],
  pro:        ['Everything in Starter', 'Higher volume for an in-house team'],
  agency:     ['Everything in Pro', 'White-label PDF reports', 'Client management dashboard'],
  enterprise: ['Everything in Agency', 'Dedicated scan capacity', 'SLA + priority support', 'Custom vertical benchmarks'],
}
const DASHBOARD_TIER_ORDER: DashboardTier[] = ['free', 'starter', 'pro', 'agency', 'enterprise']
function scanLineFor(tier: DashboardTier): string {
  const n = DASHBOARD_PLANS[tier].scansPerMonth
  return n == null ? 'Custom volume' : `${n} scans / month`
}
const DASHBOARD_TIERS: Tier[] = DASHBOARD_TIER_ORDER.map((id) => ({
  id,
  name: DASHBOARD_PLANS[id].name,
  scans: scanLineFor(id),
  features: [scanLineFor(id), ...TIER_FEATURES[id]],
}))

interface Subscription { current_period_end: number | null; amount: number | null; currency: string }

// Map the stored profiles.plan to a catalog tier. All five are real tiers now
// (Starter $39/50, Pro $129/200), so 'pro' is no longer remapped to Starter.
function normalizePlan(plan: string): DashboardTier {
  const p = plan.toLowerCase()
  return (['free', 'starter', 'pro', 'agency', 'enterprise'] as DashboardTier[]).includes(p as DashboardTier)
    ? (p as DashboardTier)
    : 'free'
}

function fmtDate(tsSeconds: number | null): string {
  if (!tsSeconds) return '—'
  return new Date(tsSeconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtAmount(amount: number | null, currency: string): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(amount / 100)
}
const fmtUsd = (n: number): string => `$${n.toLocaleString('en-US')}`

// Price label for a dashboard tier at the selected interval, read straight from
// the pricing catalog (DASHBOARD_PLANS). Annual = monthly × ANNUAL_MULTIPLIER via
// annualUsd(). null monthly price = custom/contact (enterprise).
function priceFor(tierId: DashboardTier, billing: BillingInterval): { price: string; sub: string } {
  const monthly = DASHBOARD_PLANS[tierId].priceMonthlyUsd
  if (monthly == null) return { price: 'Custom', sub: "let's talk" }
  if (monthly === 0) return { price: '$0', sub: 'no credit card' }
  return billing === 'year'
    ? { price: fmtUsd(annualUsd(monthly) ?? monthly), sub: 'per year' }
    : { price: fmtUsd(monthly), sub: 'per month' }
}

export default function DashboardBillingPage() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const [monthScans, setMonthScans] = useState(0)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [interval, setBillingInterval] = useState<BillingInterval>('month')
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setLoading(false); return }

        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const [{ count }, profileRes, subRes] = await Promise.all([
          supabase.from('reports').select('id', { count: 'exact', head: true })
            .eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
          fetch('/api/profile').then(r => r.json()).catch(() => ({})),
          token
            ? fetch('/api/settings/subscription', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
                .then(r => r.json()).catch(() => ({}))
            : Promise.resolve({}),
        ])
        if (cancelled) return
        setMonthScans(count ?? 0)
        if (typeof profileRes?.plan === 'string') setPlan(profileRes.plan)
        if (subRes?.subscription) setSubscription(subRes.subscription as Subscription)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function openPortal() {
    if (portalBusy) return
    setPortalBusy(true); setPortalError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Authentication required.')
      const res = await fetch('/api/settings/portal', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(typeof json.error === 'string' ? json.error : 'Portal request failed.')
      window.location.href = json.url as string
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : 'Portal request failed.')
      setPortalBusy(false)
    }
  }

  async function startCheckout(planId: string) {
    if (checkoutBusy) return
    setCheckoutBusy(planId); setCheckoutError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { window.location.href = '/auth?mode=signup'; return }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: planId, interval }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(typeof json.error === 'string' ? json.error : 'Checkout failed.')
      window.location.href = json.url as string
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed.')
      setCheckoutBusy(null)
    }
  }

  const normalized = normalizePlan(plan)
  const currentTier = DASHBOARD_TIERS.find(t => t.id === normalized) ?? DASHBOARD_TIERS[0]
  const isFree = normalized === 'free'
  const currentMonthly = DASHBOARD_PLANS[normalized].priceMonthlyUsd
  // Hard scan cap for the current tier (null = enterprise/custom — no fixed cap).
  const cap = DASHBOARD_PLANS[normalized].scansPerMonth
  const scanLine = cap == null
    ? `${monthScans} scans this period`
    : `${monthScans} of ${cap} scans this period`
  const scanPct = cap == null ? 100 : Math.min(100, Math.round((monthScans / cap) * 100))
  const capReached = cap != null && monthScans >= cap

  return (
    <div className="dashboard-root-shell" style={{ padding: '40px 32px 72px', maxWidth: 1040, margin: '0 auto' }}>
      <PageHeader
        kicker="Billing"
        title="Plan & billing"
        sub="Your dashboard subscription, usage this period, and plan options — managed in-app."
      />

      {loading ? (
        <>
          <Panel style={{ padding: '26px', marginBottom: 36 }}>
            <div className="dash-shimmer" style={{ width: '40%', height: 22, marginBottom: 16 }} />
            <div className="dash-shimmer" style={{ width: '100%', height: 3 }} />
          </Panel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[0, 1, 2, 3].map(i => (
              <Panel key={i} style={{ padding: '22px 20px', height: 220 }}><div className="dash-shimmer" style={{ width: '60%', height: 16 }} /></Panel>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Current plan — the elevated hero card */}
          <Panel accent style={{ padding: '26px 28px', marginBottom: 40 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: DASH.ink3, marginBottom: 16 }}>
              Current plan
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: DASH.ink, letterSpacing: '-0.5px' }}>{currentTier.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: DASH.ink2 }}>
                    {currentMonthly == null ? 'Custom' : fmtUsd(currentMonthly)}
                    {currentMonthly != null && currentMonthly > 0 && <span style={{ color: DASH.ink3 }}>/mo</span>}
                  </span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: DASH.ink3, marginTop: 10 }}>
                  {scanLine}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: DASH.ink3, marginTop: 4 }}>
                  {isFree
                    ? 'Free plan — no renewal'
                    : subscription
                      ? `${fmtAmount(subscription.amount, subscription.currency)} · renews ${fmtDate(subscription.current_period_end)}`
                      : 'Renewal details available in the billing portal'}
                </div>
              </div>
              <button
                type="button"
                onClick={openPortal}
                disabled={portalBusy}
                className="dash-btn"
                style={{
                  fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: STEEL, background: 'transparent',
                  border: `1px solid ${steelLine(55)}`,
                  padding: '11px 20px', borderRadius: 0, cursor: portalBusy ? 'default' : 'pointer',
                  opacity: portalBusy ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'background 0.14s, border-color 0.14s',
                }}
              >
                {portalBusy ? 'Opening…' : 'Manage billing →'}
              </button>
            </div>

            {/* Usage bar */}
            <div style={{ position: 'relative', width: '100%', height: 4, background: DASH.well, marginTop: 20, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: `${scanPct}%`,
                background: capReached ? DASH.crit : STEEL,
                boxShadow: capReached ? 'none' : `0 0 12px ${steelLine(60)}`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: DASH.ink4, marginTop: 10 }}>
              Opens the Stripe billing portal to manage payment methods and invoices.
            </div>
            {portalError ? <div style={{ fontFamily: MONO, fontSize: 12, color: DASH.crit, marginTop: 8 }}>{portalError}</div> : null}
          </Panel>

          {/* Plan options — DASHBOARD tiers only */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: DASH.ink3 }}>
              Dashboard plans
            </div>
            <div role="group" aria-label="Billing interval" style={{ display: 'inline-flex', border: `1px solid ${DASH.line}` }}>
              {(['month', 'year'] as BillingInterval[]).map((iv) => (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setBillingInterval(iv)}
                  aria-pressed={interval === iv}
                  style={{
                    fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '8px 15px', border: 'none', cursor: 'pointer',
                    background: interval === iv ? steelLine(16) : 'transparent',
                    color: interval === iv ? STEEL : DASH.ink3,
                    transition: 'background 0.14s, color 0.14s',
                  }}
                >
                  {iv === 'month' ? 'Monthly' : 'Annual'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {DASHBOARD_TIERS.map(t => {
              const isCurrent = t.id === normalized
              const idxCurrent = DASHBOARD_TIERS.findIndex(x => x.id === normalized)
              const idxThis = DASHBOARD_TIERS.findIndex(x => x.id === t.id)
              const direction = idxThis > idxCurrent ? 'Upgrade' : 'Downgrade'
              const pp = priceFor(t.id, interval)
              return (
                // Current tier: accent border + subtle steel tint. Others: raised panel that lifts on hover.
                <div
                  key={t.id}
                  className={isCurrent ? 'dash-panel' : 'dash-panel dash-panel--interactive'}
                  style={{
                    position: 'relative', background: isCurrent ? steelLine(7) : DASH.panel,
                    padding: '22px 20px', display: 'flex', flexDirection: 'column',
                    border: isCurrent ? `1px solid ${steelLine(55)}` : `1px solid ${DASH.line}`,
                    boxShadow: isCurrent ? `inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 1px ${steelLine(20)}, 0 8px 28px rgba(0,0,0,0.28)` : undefined,
                  }}
                >
                  {isCurrent && <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: STEEL }} />}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: DASH.ink }}>{t.name}</span>
                    {isCurrent && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', color: STEEL }}>CURRENT</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 16 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: DASH.ink, letterSpacing: '-0.5px' }}>{pp.price}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: DASH.ink3 }}>{pp.sub}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', flex: 1 }}>
                    {t.features.map(f => (
                      <li key={f} style={{ fontFamily: BODY, fontSize: 12.5, color: DASH.ink2, lineHeight: 1.5, marginBottom: 8, display: 'flex', gap: 9 }}>
                        <span style={{ color: STEEL, flexShrink: 0 }}>·</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCurrent) return
                      // Upgrades into a self-serve tier run Stripe Checkout; downgrades
                      // and non-checkoutable tiers (e.g. enterprise) go to the portal.
                      if (direction === 'Upgrade' && isCheckoutableDashboardTier(t.id)) {
                        void startCheckout(t.id)
                      } else {
                        void openPortal()
                      }
                    }}
                    disabled={isCurrent || checkoutBusy === t.id || portalBusy}
                    className={isCurrent ? undefined : 'dash-btn'}
                    style={{
                      fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: isCurrent ? DASH.ink3 : STEEL,
                      background: 'transparent',
                      border: `1px solid ${isCurrent ? DASH.line : steelLine(45)}`,
                      padding: '10px 14px', borderRadius: 0, cursor: isCurrent ? 'default' : 'pointer',
                      opacity: isCurrent ? 0.6 : 1, width: '100%',
                      transition: 'background 0.14s, border-color 0.14s',
                    }}
                  >
                    {isCurrent ? 'Current plan' : checkoutBusy === t.id ? 'Redirecting…' : `${direction} →`}
                  </button>
                </div>
              )
            })}
          </div>
          {checkoutError ? (
            <p style={{ fontFamily: MONO, fontSize: 12, color: DASH.crit, margin: '14px 0 0', lineHeight: 1.6 }}>{checkoutError}</p>
          ) : null}
        </>
      )}
    </div>
  )
}
