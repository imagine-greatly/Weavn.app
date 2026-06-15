'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import WeavnMark from '@/components/ui/WeavnMark'
import WeavingScan from '@/components/WeavingScan'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { FREE_DASHBOARD_SCANS_PER_MONTH } from '@/lib/constants'
import SurfaceToggle, { SURFACE_NAV, useSurfaceCrossing } from '@/components/SurfaceToggle'

function domainOf(raw: string): string {
  const t = raw.trim()
  try { return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, '') } catch { return t }
}

// ── Dashboard surface tokens (steel blue · muted cold futurism) ────────────────
// Accent now flows from the shared --surface-accent CSS var (steel #6F9BC6 on this
// surface), so the toggle's weighted crossing repaints nav, brackets, and links live.
const C = {
  bg:           '#050810',
  sidebarBg:    '#06090F',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  worse:        '#E8635F',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const DISP = "'Space Grotesk', sans-serif"

const SIDEBAR_W = 248

function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app'
  return pathname === href || pathname.startsWith(href + '/')
}

// Section title for the top chrome — keeps the bar honest across the steel surface.
function sectionTitle(pathname: string): string {
  if (pathname.startsWith('/app/reports')) return 'Reports'
  if (pathname.startsWith('/app/branding')) return 'Branding'
  if (pathname.startsWith('/app/billing')) return 'Billing'
  if (pathname.startsWith('/app/clients')) return 'Clients'
  if (pathname.startsWith('/app/account')) return 'Account'
  return 'Overview'
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/app'
  const { rootRef, surface, navSurface, phase, crossing, flipTo } = useSurfaceCrossing('app')
  const [scanOpen, setScanOpen] = useState(false)

  const navClass = `surface-nav${phase === 'leaving' ? ' is-leaving' : phase === 'entering' ? ' is-entering' : ''}`

  return (
    <div ref={rootRef} data-surface="app" style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', background: C.bg }}>

      {/* ── Identity rail ───────────────────────────────────────────────────── */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: '4rem',
          height: 'calc(100vh - 4rem)',
          width: SIDEBAR_W,
          background: C.sidebarBg,
          borderRight: `0.5px solid ${C.border}`,
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Identity — WeavnMark + "Weavn" wordmark, constant across both surfaces */}
        <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <WeavnMark size={26} />
            <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: C.inkPrimary }}>
              Weavn
            </span>
          </Link>
        </div>

        {/* Surface-specific nav (middle) — reconfigures on crossing */}
        <nav key={navSurface} className={navClass} style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {SURFACE_NAV[navSurface].map((item, i) => {
            const cssVars = { '--nav-i': i } as React.CSSProperties
            if (navSurface === 'app' && item.href) {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="surface-nav-item"
                  style={{
                    ...cssVars,
                    display: 'block',
                    padding: '11px 18px',
                    fontFamily: MONO,
                    fontSize: 12,
                    letterSpacing: '0.04em',
                    textDecoration: 'none',
                    color: active ? C.inkPrimary : C.inkSecondary,
                    background: active ? 'color-mix(in srgb, var(--surface-accent) 7%, transparent)' : 'transparent',
                    borderLeft: `2px solid ${active ? 'var(--surface-accent)' : 'transparent'}`,
                    transition: 'color 0.12s, background 0.12s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = C.inkPrimary }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = C.inkSecondary }}
                >
                  {item.label}
                </Link>
              )
            }
            // Incoming-surface preview during the crossing — display only
            return (
              <div
                key={item.label}
                aria-hidden
                className="surface-nav-item"
                style={{ ...cssVars, padding: '11px 18px', fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em', color: C.inkSecondary, borderLeft: '2px solid transparent' }}
              >
                {item.label}
              </div>
            )
          })}
        </nav>

        {/* Surface toggle (bottom) */}
        <div style={{ borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <SurfaceToggle current={surface} crossing={crossing} onFlip={flipTo} />
        </div>

        {/* Usage / quota block (very bottom) */}
        <QuotaBlock />

        {/* Account (very bottom) */}
        <div style={{ padding: '14px 18px', borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <Link
            href="/app/account"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em',
              color: isActive(pathname, '/app/account') ? C.inkPrimary : C.inkMuted, textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.inkPrimary }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = isActive(pathname, '/app/account') ? C.inkPrimary : C.inkMuted }}
          >
            <span>Account</span>
            <span style={{ color: 'var(--surface-accent)' }}>→</span>
          </Link>
        </div>
      </aside>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main className="surface-scrim-target surface-content-in" style={{ marginLeft: SIDEBAR_W, flex: 1, minHeight: 'calc(100vh - 4rem)', position: 'relative' }}>
        {/* Top chrome — "New scan →" on every page (parity with the Developers surface) */}
        <div
          style={{
            position: 'sticky', top: '4rem', zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 24px', minHeight: 52,
            background: 'rgba(5,8,16,0.82)', backdropFilter: 'blur(10px)',
            borderBottom: `0.5px solid ${C.border}`,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.inkMuted }}>
            {sectionTitle(pathname)}
          </span>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            style={{
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--surface-accent)',
              background: 'color-mix(in srgb, var(--surface-accent) 9%, transparent)',
              border: '0.5px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
              padding: '8px 16px', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            New scan →
          </button>
        </div>

        {children}
      </main>

      {scanOpen && <NewScanModal onClose={() => setScanOpen(false)} />}
    </div>
  )
}

// ── Usage / quota block ─────────────────────────────────────────────────────────
// Real dashboard usage: fresh report scans this calendar month vs the plan ceiling.
// (lib/usageTracking governs the API-KEY surface and is server-only / service-role;
// the dashboard's unit is the `reports` table, read here via the browser client.)
function QuotaBlock() {
  const [used, setUsed] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('free')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setUsed(0); return }

        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const [{ count }, profileRes] = await Promise.all([
          supabase.from('reports').select('id', { count: 'exact', head: true })
            .eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
          fetch('/api/profile').then(r => r.json()).catch(() => ({})),
        ])
        if (cancelled) return
        setUsed(count ?? 0)
        if (typeof profileRes?.plan === 'string') setPlan(profileRes.plan)
      } catch {
        if (!cancelled) setUsed(0)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const isFree = plan === 'free'
  const limit = isFree ? FREE_DASHBOARD_SCANS_PER_MONTH : null
  const pct = limit ? Math.min(100, Math.round(((used ?? 0) / limit) * 100)) : 100

  return (
    <div style={{ padding: '14px 18px', borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.inkMuted, marginBottom: 8 }}>
        Usage
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSecondary }}>
          {used == null ? '—' : used} {limit ? `/ ${limit}` : ''} scans
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'capitalize', color: C.inkMuted }}>
          {plan}
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 2, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${pct}%`,
          background: limit && (used ?? 0) >= limit ? C.worse : 'var(--surface-accent)',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.inkMuted, marginTop: 7, letterSpacing: '0.04em' }}>
        {limit ? 'this month · resets on the 1st' : 'unlimited this month'}
      </div>
    </div>
  )
}

// ── New scan modal ──────────────────────────────────────────────────────────────
// Mirrors /app's scan call shape (POST /api/scan → /reports/[shareToken]) so the
// "New scan" affordance works from every page on the steel surface.
function NewScanModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<'input' | 'weaving' | 'error'>('input')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (phase === 'input') inputRef.current?.focus() }, [phase])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase === 'input') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, phase])

  async function runScan() {
    const trimmed = url.trim()
    if (!trimmed) return
    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    setError(null)
    setPhase('weaving')
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      if (res.status === 401) { router.push('/auth?surface=dashboard'); return }
      const data = await res.json()
      if (data.shareToken) {
        router.push(`/reports/${data.shareToken}`)
      } else {
        setError(data.error ?? 'Scan failed. Please try again.')
        setPhase('error')
      }
    } catch {
      setError('Scan failed. Please try again.')
      setPhase('error')
    }
  }

  // During the ~90s wait (and on failure) the weaving experience takes the full overlay.
  if (phase === 'weaving' || phase === 'error') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.92)', zIndex: 200, overflowY: 'auto' }}>
        <WeavingScan
          domain={domainOf(url)}
          status={phase}
          error={error}
          onReset={() => { setPhase('input'); setError(null) }}
        />
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 200 }}
    >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 520,
          background: '#080C14', border: '0.5px solid color-mix(in srgb, var(--surface-accent) 30%, rgba(255,255,255,0.1))',
          padding: 30,
        }}
      >
        {/* L-corner brackets in the surface accent */}
        <span aria-hidden style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '1px solid var(--surface-accent)', borderLeft: '1px solid var(--surface-accent)' }} />
        <span aria-hidden style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '1px solid var(--surface-accent)', borderRight: '1px solid var(--surface-accent)' }} />

        <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--surface-accent)', margin: '0 0 10px' }}>
          New scan
        </p>
        <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: C.inkPrimary, margin: '0 0 16px', letterSpacing: '-0.3px' }}>
          Scan a site
        </h2>
        <div style={{ display: 'flex', gap: 0 }}>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void runScan() }}
            placeholder="your-site.com"
            autoComplete="off"
            style={{
              flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 14, color: C.inkPrimary,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid color-mix(in srgb, var(--surface-accent) 30%, transparent)', borderRight: 'none',
              padding: '12px 14px', outline: 'none', borderRadius: 0,
            }}
          />
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={!url.trim()}
            style={{
              fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--surface-accent)', background: 'color-mix(in srgb, var(--surface-accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
              padding: '12px 20px', borderRadius: 0, cursor: url.trim() ? 'pointer' : 'not-allowed',
              opacity: url.trim() ? 1 : 0.5, whiteSpace: 'nowrap',
            }}
          >
            Scan →
          </button>
        </div>
      </div>
    </div>
  )
}
