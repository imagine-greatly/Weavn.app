'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { DASHBOARD_PLAN_MONTHLY_CAPS } from '@/lib/constants'
import Sidebar, { type SidebarNavItem } from '@/components/shell/Sidebar'
import { ScanProvider, useScan } from '@/components/dashboard/ScanContext'

const STEEL = '#6F9BC6'
const PURPLE = '#9D8CFF'

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

// Wraps the whole dashboard in the persistent scan-tracking provider, so an in-flight
// scan survives navigation between tabs (the state lives above the swapping page).
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ScanProvider>
      <ShellInner>{children}</ShellInner>
    </ScanProvider>
  )
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/app'
  const scan = useScan()
  const [scanOpen, setScanOpen] = useState(false)

  // Tier drives the nav — no locked items, no padlocks. The primary rail is a fixed three
  // tabs (Overview · Reports · Billing) for every plan; Agency/Enterprise surface Clients +
  // Branding in a labelled secondary group. Default to the plan loading before extras show.
  const [plan, setPlan] = useState<string | null>(null)
  const [name, setName] = useState<string>('Workspace')
  const [used, setUsed] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && !cancelled) {
          const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
          const raw = meta.full_name ?? meta.name ?? (user.email ? user.email.split('@')[0] : '')
          if (raw) setName(raw.charAt(0).toUpperCase() + raw.slice(1))
        }
        const profile = await fetch('/api/profile').then(r => r.json()).catch(() => ({}))
        if (!cancelled && typeof profile?.plan === 'string') setPlan(profile.plan)
        if (user) {
          const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
          const { count } = await supabase.from('reports').select('id', { count: 'exact', head: true })
            .eq('user_id', user.id).gte('created_at', monthStart.toISOString())
          if (!cancelled) setUsed(count ?? 0)
        } else if (!cancelled) setUsed(0)
      } catch { if (!cancelled) setUsed(0) }
    })()
    return () => { cancelled = true }
  }, [])

  const planName = plan ?? 'free'
  const isAgency = plan === 'agency' || plan === 'enterprise'

  // Canonical primary rail — exactly three tabs for every plan: Overview · Reports · Billing.
  // Agency/Enterprise read the SAME personal report viewer (same route + component), just
  // labelled "Scans" so it reads as distinct from the Clients roster. Label-only difference.
  const reportsLabel = isAgency ? 'Scans' : 'Reports'
  const APP_NAV: { label: string; href: string }[] = [
    { label: 'Overview', href: '/app' },
    { label: reportsLabel, href: '/app/reports' },
    { label: 'Billing', href: '/app/billing' },
  ]
  const nav: SidebarNavItem[] = APP_NAV.map(it => ({ label: it.label, href: it.href, active: isActive(pathname, it.href) }))

  // Agency/Enterprise-only capabilities live in a labelled secondary group so the primary
  // rail stays at its three tabs while these tier routes remain reachable (no stranded pages).
  const navSecondary = isAgency
    ? [{
        label: 'Agency',
        items: [
          { label: 'Clients', href: '/app/clients', active: isActive(pathname, '/app/clients') },
          { label: 'Branding', href: '/app/branding', active: isActive(pathname, '/app/branding') },
        ] as SidebarNavItem[],
      }]
    : undefined

  const limit = DASHBOARD_PLAN_MONTHLY_CAPS[planName] ?? null
  const pct = limit ? Math.min(100, Math.round(((used ?? 0) / limit) * 100)) : 100
  const quota = {
    label: 'Usage',
    primary: `${used == null ? '—' : used}${limit ? ` / ${limit}` : ''} scans`,
    pct,
    sub: limit ? 'this month · resets on the 1st' : 'custom plan · no monthly cap',
    warn: !!(limit && (used ?? 0) >= limit),
  }

  return (
    <div data-surface="app" style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', background: C.bg }}>

      {/* ── Identity rail (shared component, steel) — doorway to the purple console ─ */}
      <Sidebar
        accent={STEEL}
        modeLabel="Dashboard"
        workspaceName={name}
        workspacePlan={planName}
        nav={nav}
        navSecondary={navSecondary}
        quota={quota}
        doorway={{ label: 'Developer console →', href: '/console', accent: PURPLE }}
        account={{ label: 'Account', href: '/app/account', active: isActive(pathname, '/app/account') }}
        width={SIDEBAR_W}
      />

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, minHeight: 'calc(100vh - 4rem)', position: 'relative' }}>
        {/* Top chrome — "New scan →" on every page (parity with the Developers surface) */}
        <div
          style={{
            // Opaque (no translucency / backdrop blur): a see-through bar let the page's
            // heading + scan input bleed through it as a ghost layer when scrolled under.
            position: 'sticky', top: '4rem', zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 24px', minHeight: 52,
            background: C.sidebarBg,
            borderBottom: '1px solid var(--divider-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.inkMuted, whiteSpace: 'nowrap' }}>
              {/* Mirror the tier-conditional nav label so the top chrome stays honest. */}
              {pathname.startsWith('/app/reports') ? reportsLabel : sectionTitle(pathname)}
            </span>
            {/* Live scan pill — only off Overview (Overview shows the full weave itself).
                A non-blocking indicator so navigating away never hides an in-flight scan. */}
            {scan.phase === 'weaving' && pathname !== '/app' ? (
              <>
              <style>{`@keyframes dashScanPulse{0%,100%{opacity:1}50%{opacity:0.25}}.dash-scan-pulse{animation:dashScanPulse 1.4s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.dash-scan-pulse{animation:none}}`}</style>
              <Link
                href="/app"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0,
                  fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--surface-accent)',
                  background: 'color-mix(in srgb, var(--surface-accent) 9%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--surface-accent) 40%, transparent)',
                  padding: '5px 10px', textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                <span aria-hidden className="dash-scan-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--surface-accent)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Scanning {scan.domain} →</span>
              </Link>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="dash-btn"
            style={{
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--surface-accent)',
              background: 'color-mix(in srgb, var(--surface-accent) 9%, transparent)',
              border: '1px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
              padding: '8px 16px', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.14s, border-color 0.14s',
            }}
          >
            New scan →
          </button>
        </div>

        {children}
      </main>

      {scanOpen && <NewScanModal isAgency={isAgency} onClose={() => setScanOpen(false)} />}
    </div>
  )
}

// ── New scan modal ──────────────────────────────────────────────────────────────
// Mirrors /app's scan call shape (POST /api/scan → /reports/[shareToken]) so the
// "New scan" affordance works from every page on the steel surface.
function NewScanModal({ onClose, isAgency }: { onClose: () => void; isAgency: boolean }) {
  const { startScan } = useScan()
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Hand off to the shell-owned tracker (same mechanism as Overview's inline trigger)
  // and just close — leave the user where they are. Tracking lives in the persistent
  // shell, so the pill (off Overview) and completion toast carry the feedback; starting
  // a scan no more yanks the user than finishing one does.
  function runScan() {
    const trimmed = url.trim()
    if (!trimmed) return
    startScan(trimmed)
    onClose()
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
          {isAgency ? 'Scan a client site' : 'Scan a site'}
        </h2>
        <div style={{ display: 'flex', gap: 0 }}>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void runScan() }}
            placeholder={isAgency ? 'client-site.com' : 'your-site.com'}
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
