'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  worse:        '#E8635F',
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', pro: 'Pro', agency: 'Agency', starter: 'Starter', enterprise: 'Enterprise',
}

/**
 * Basic account page (steel surface). Gives the sidebar Account entry — and Logout —
 * a real home. Email + a read-only plan summary; full billing lives on the Dashboard
 * Billing page (Pass B). Accent flows from --surface-accent so it repaints on crossing.
 */
export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('free')
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth?surface=dashboard'); return }
        if (!cancelled) setEmail(user.email ?? null)
        const profile = await fetch('/api/profile').then(r => r.json()).catch(() => ({}))
        if (!cancelled && typeof profile?.plan === 'string') setPlan(profile.plan)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  async function logout() {
    setSigningOut(true)
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const planLabel = PLAN_LABELS[plan] ?? (plan.charAt(0).toUpperCase() + plan.slice(1))

  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 56px', maxWidth: 720, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--surface-accent)', margin: '0 0 8px' }}>
        Account
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        Your account
      </h1>
      <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkSecondary, margin: '0 0 28px', maxWidth: 540, lineHeight: 1.6 }}>
        Signed-in identity and plan at a glance. Manage payment methods, invoices, and tier changes on the Billing page.
      </p>

      {loading ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.inkMuted, margin: 0 }}>Loading…</p>
      ) : (
        <div style={{ position: 'relative', border: `0.5px solid ${C.border}`, background: C.surface }}>
          {/* L-corner brackets in the surface accent */}
          <span aria-hidden style={{ position: 'absolute', top: -1, left: -1, width: 9, height: 9, borderTop: '1px solid var(--surface-accent)', borderLeft: '1px solid var(--surface-accent)' }} />
          <span aria-hidden style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderBottom: '1px solid var(--surface-accent)', borderRight: '1px solid var(--surface-accent)' }} />

          {/* Email */}
          <div style={{ padding: '18px 22px', borderBottom: `0.5px solid ${C.border}` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.inkMuted, marginBottom: 7 }}>
              Email
            </div>
            <div style={{ fontFamily: BODY, fontSize: 15, color: C.inkPrimary }}>{email ?? '—'}</div>
          </div>

          {/* Plan (read-only) */}
          <div style={{ padding: '18px 22px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.inkMuted, marginBottom: 7 }}>
                Plan
              </div>
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: C.inkPrimary }}>{planLabel}</div>
            </div>
            <Link
              href="/app/billing"
              style={{
                fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--surface-accent)', border: '0.5px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
                padding: '9px 16px', textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              Manage billing →
            </Link>
          </div>

          {/* Logout */}
          <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontFamily: BODY, fontSize: 13, color: C.inkSecondary }}>End your session on this device.</span>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={signingOut}
              style={{
                fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: C.worse, background: 'transparent', border: `0.5px solid ${C.worse}66`,
                padding: '9px 18px', borderRadius: 0, cursor: signingOut ? 'default' : 'pointer',
                opacity: signingOut ? 0.5 : 1, whiteSpace: 'nowrap',
              }}
            >
              {signingOut ? 'Signing out…' : 'Log out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
