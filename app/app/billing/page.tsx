'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { FREE_DASHBOARD_SCANS_PER_MONTH } from '@/lib/constants'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  success:      '#00C48C',
  worse:        '#E8635F',
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

// Canonical DASHBOARD tiers (mirrors the /dashboard marketing pricing). These are the
// dashboard plan set ONLY — API/console tiers never render here. Per-tier checkout is
// not wired (no confirmed price IDs), so CTAs route to the real Stripe billing portal.
interface Tier {
  id: string
  name: string
  price: string
  priceSub: string
  scans: string
  features: string[]
}
const DASHBOARD_TIERS: Tier[] = [
  {
    id: 'free', name: 'Free', price: '$0', priceSub: 'no credit card', scans: '3 scans / month',
    features: ['3 scans per month', 'Score + top 3 findings', 'Benchmarked against corpus'],
  },
  {
    id: 'starter', name: 'Starter', price: '$49', priceSub: 'per month', scans: 'Unlimited scans',
    features: ['Unlimited scans', 'Full report — all findings ranked', 'AI-rewritten copy', 'Cancel anytime'],
  },
  {
    id: 'agency', name: 'Agency', price: '$149', priceSub: 'per month', scans: 'Unlimited scans',
    features: ['Everything in Starter', 'White-label PDF reports', '100 API calls bundled', 'Client management dashboard'],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '$499', priceSub: 'annual billing', scans: 'Dedicated capacity',
    features: ['Everything in Agency', 'Dedicated scan capacity', 'SLA + priority support', 'Custom vertical benchmarks'],
  },
]

interface Subscription { current_period_end: number | null; amount: number | null; currency: string }

// profiles.plan today is free/pro/agency; 'pro' is the entry paid tier ≈ Starter.
function normalizePlan(plan: string): string {
  const p = plan.toLowerCase()
  if (p === 'pro') return 'starter'
  if (['free', 'starter', 'agency', 'enterprise'].includes(p)) return p
  return 'free'
}

function fmtDate(tsSeconds: number | null): string {
  if (!tsSeconds) return '—'
  return new Date(tsSeconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtAmount(amount: number | null, currency: string): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(amount / 100)
}

export default function DashboardBillingPage() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const [monthScans, setMonthScans] = useState(0)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [changeNotice, setChangeNotice] = useState<string | null>(null)

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

  const normalized = normalizePlan(plan)
  const currentTier = DASHBOARD_TIERS.find(t => t.id === normalized) ?? DASHBOARD_TIERS[0]
  const isFree = normalized === 'free'
  const scanLine = isFree
    ? `${monthScans} of ${FREE_DASHBOARD_SCANS_PER_MONTH} scans this period`
    : `${monthScans} scans this period · unlimited`
  const scanPct = isFree ? Math.min(100, Math.round((monthScans / FREE_DASHBOARD_SCANS_PER_MONTH) * 100)) : 100

  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 56px', maxWidth: 1040, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--surface-accent)', margin: '0 0 8px' }}>
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
          {/* Current plan card — steel, corner brackets, ambient steel bloom */}
          <div style={{ position: 'relative', marginBottom: 36 }}>
            <div
              aria-hidden
              style={{
                position: 'absolute', left: 0, top: -10, width: 360, height: 180,
                background: 'radial-gradient(ellipse 60% 70% at 18% 30%, color-mix(in srgb, var(--surface-accent) 16%, transparent) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0,
              }}
            />
            <div style={{ position: 'relative', border: `0.5px solid ${C.border}`, background: C.surface, padding: '24px 26px', zIndex: 1 }}>
              <span aria-hidden style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '1px solid var(--surface-accent)', borderLeft: '1px solid var(--surface-accent)' }} />
              <span aria-hidden style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '1px solid var(--surface-accent)', borderRight: '1px solid var(--surface-accent)' }} />

              <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.inkMuted, marginBottom: 14 }}>
                Current plan
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: C.inkPrimary }}>{currentTier.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.inkSecondary }}>
                      {currentTier.price}{!isFree && <span style={{ color: C.inkMuted }}>/mo</span>}
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
                  background: isFree && monthScans >= FREE_DASHBOARD_SCANS_PER_MONTH ? C.worse : 'var(--surface-accent)',
                }} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkMuted, marginTop: 9 }}>
                Opens the Stripe billing portal to manage payment methods and invoices.
              </div>
              {portalError ? <div style={{ fontFamily: MONO, fontSize: 12, color: C.worse, marginTop: 8 }}>{portalError}</div> : null}
            </div>
          </div>

          {/* Plan options — DASHBOARD tiers only */}
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.inkMuted, marginBottom: 14 }}>
            Dashboard plans
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: C.border }}>
            {DASHBOARD_TIERS.map(t => {
              const isCurrent = t.id === normalized
              const idxCurrent = DASHBOARD_TIERS.findIndex(x => x.id === normalized)
              const idxThis = DASHBOARD_TIERS.findIndex(x => x.id === t.id)
              const direction = idxThis > idxCurrent ? 'Upgrade' : 'Downgrade'
              return (
                <div key={t.id} style={{ position: 'relative', background: C.surface, padding: '22px 20px', display: 'flex', flexDirection: 'column' }}>
                  {isCurrent && (
                    <>
                      <span aria-hidden style={{ position: 'absolute', top: -1, left: -1, width: 9, height: 9, borderTop: '1px solid var(--surface-accent)', borderLeft: '1px solid var(--surface-accent)' }} />
                      <span aria-hidden style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderBottom: '1px solid var(--surface-accent)', borderRight: '1px solid var(--surface-accent)' }} />
                    </>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: C.inkPrimary }}>{t.name}</span>
                    {isCurrent && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: 'var(--surface-accent)' }}>CURRENT</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 14 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: C.inkPrimary }}>{t.price}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted }}>{t.priceSub}</span>
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
                    onClick={() => setChangeNotice(
                      isCurrent
                        ? null
                        : `Plan changes aren't wired to checkout yet — manage your subscription in the billing portal. No charge was made.`,
                    )}
                    disabled={isCurrent}
                    style={{
                      fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em',
                      color: isCurrent ? C.inkMuted : 'var(--surface-accent)',
                      background: 'transparent',
                      border: `0.5px solid ${isCurrent ? C.border : 'color-mix(in srgb, var(--surface-accent) 45%, transparent)'}`,
                      padding: '9px 14px', borderRadius: 0, cursor: isCurrent ? 'default' : 'pointer',
                      opacity: isCurrent ? 0.6 : 1, width: '100%',
                    }}
                  >
                    {isCurrent ? 'Current plan' : `${direction} →`}
                  </button>
                </div>
              )
            })}
          </div>
          {changeNotice ? (
            <p style={{ fontFamily: MONO, fontSize: 12, color: '#EFB23E', margin: '14px 0 0', lineHeight: 1.6 }}>{changeNotice}</p>
          ) : null}
        </>
      )}
    </div>
  )
}
