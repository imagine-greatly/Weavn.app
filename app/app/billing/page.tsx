'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { DASHBOARD_PLANS, annualUsd, isCheckoutableDashboardTier, type BillingInterval, type DashboardTier } from '@/lib/pricing'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  success:      '#00C48C',
  worse:        '#E8635F',
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.10)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

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
// hard-capped per tier, so there is no "Unlimited".
const TIER_FEATURES: Record<DashboardTier, string[]> = {
  free:       ['Score + top 3 findings', 'Benchmarked against corpus'],
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
// (Starter $39/50, Pro $99/200), so 'pro' is no longer remapped to Starter.
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

  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 56px', maxWidth: 1040, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.inkMuted, margin: '0 0 8px' }}>
        Billing
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        Plan &amp; billing
      </h1>
      <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkSecondary, margin: '0 0 28px', maxWidth: 560, lineHeight: 1.6 }}>
        Your dashboard subscription, usage this period, and plan options — managed in-app.
      </p>

      {loading ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.inkMuted, margin: 0 }}>Loading…</p>
      ) : (
        <>
          {/* Current plan card — flat crisp frame (monochrome). */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ position: 'relative', border: `1px solid ${C.border}`, background: C.surface, padding: '24px 26px' }}>

              <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.inkMuted, marginBottom: 14 }}>
                Current plan
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: C.inkPrimary }}>{currentTier.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.inkSecondary }}>
                      {currentMonthly == null ? 'Custom' : fmtUsd(currentMonthly)}
                      {currentMonthly != null && currentMonthly > 0 && <span style={{ color: C.inkMuted }}>/mo</span>}
                    </span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: C.inkMuted, marginTop: 8 }}>
                    {scanLine}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: C.inkMuted, marginTop: 4 }}>
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
                  style={{
                    fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em',
                    color: 'var(--surface-accent)', background: 'transparent',
                    border: '0.5px solid color-mix(in srgb, var(--surface-accent) 55%, transparent)',
                    padding: '11px 20px', borderRadius: 0, cursor: portalBusy ? 'default' : 'pointer',
                    opacity: portalBusy ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {portalBusy ? 'Opening…' : 'Manage billing →'}
                </button>
              </div>

              {/* Usage bar */}
              <div style={{ position: 'relative', width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', marginTop: 18 }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%', width: `${scanPct}%`,
                  background: cap != null && monthScans >= cap ? C.worse : 'var(--surface-accent)',
                }} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkMuted, marginTop: 9 }}>
                Opens the Stripe billing portal to manage payment methods and invoices.
              </div>
              {portalError ? <div style={{ fontFamily: MONO, fontSize: 12, color: C.worse, marginTop: 8 }}>{portalError}</div> : null}
            </div>
          </div>

          {/* Plan options — DASHBOARD tiers only */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.inkMuted }}>
              Dashboard plans
            </div>
            <div role="group" aria-label="Billing interval" style={{ display: 'inline-flex', border: `0.5px solid ${C.border}` }}>
              {(['month', 'year'] as BillingInterval[]).map((iv) => (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setBillingInterval(iv)}
                  aria-pressed={interval === iv}
                  style={{
                    fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '7px 14px', border: 'none', cursor: 'pointer',
                    background: interval === iv ? 'color-mix(in srgb, var(--surface-accent) 18%, transparent)' : 'transparent',
                    color: interval === iv ? 'var(--surface-accent)' : C.inkMuted,
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
                // Current tier: 2px steel border. Others: single crisp hairline.
                <div key={t.id} style={{ position: 'relative', background: C.surface, padding: '22px 20px', display: 'flex', flexDirection: 'column', border: isCurrent ? `2px solid ${C.steel}` : `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: C.inkPrimary }}>{t.name}</span>
                    {isCurrent && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: 'var(--surface-accent)' }}>CURRENT</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 14 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: C.inkPrimary }}>{pp.price}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted }}>{pp.sub}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', flex: 1 }}>
                    {t.features.map(f => (
                      <li key={f} style={{ fontFamily: BODY, fontSize: 12.5, color: C.inkSecondary, lineHeight: 1.5, marginBottom: 7, display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--surface-accent)', flexShrink: 0 }}>·</span>{f}
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
                    style={{
                      fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em',
                      color: isCurrent ? C.inkMuted : 'var(--surface-accent)',
                      background: 'transparent',
                      border: `0.5px solid ${isCurrent ? C.border : 'color-mix(in srgb, var(--surface-accent) 45%, transparent)'}`,
                      padding: '9px 14px', borderRadius: 0, cursor: isCurrent ? 'default' : 'pointer',
                      opacity: isCurrent ? 0.6 : 1, width: '100%',
                    }}
                  >
                    {isCurrent ? 'Current plan' : checkoutBusy === t.id ? 'Redirecting…' : `${direction} →`}
                  </button>
                </div>
              )
            })}
          </div>
          {checkoutError ? (
            <p style={{ fontFamily: MONO, fontSize: 12, color: C.worse, margin: '14px 0 0', lineHeight: 1.6 }}>{checkoutError}</p>
          ) : null}
        </>
      )}
    </div>
  )
}
