'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SurfaceToggle, { SURFACE_NAV, useSurfaceCrossing } from '@/components/SurfaceToggle'

// ── Dashboard surface tokens (steel blue · muted cold futurism) ────────────────
// Accent now flows from the shared --surface-accent CSS var (steel #6F9BC6 on this
// surface), so the toggle's weighted crossing repaints nav, brackets, and links live.
const C = {
  bg:           '#050810',
  sidebarBg:    '#06090F',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const DISP = "'Space Grotesk', sans-serif"

const SIDEBAR_W = 248

function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/app'
  const { rootRef, surface, navSurface, phase, crossing, flipTo } = useSurfaceCrossing('app')

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
        {/* Wordmark — constant across both surfaces */}
        <div style={{ padding: '20px 18px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <Link href="/" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: C.inkPrimary, textDecoration: 'none' }}>
            Weavn
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

        {/* Account (very bottom) */}
        <div style={{ padding: '14px 18px', borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <Link
            href="/settings"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em',
              color: C.inkMuted, textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.inkPrimary }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.inkMuted }}
          >
            <span>Account</span>
            <span style={{ color: 'var(--surface-accent)' }}>→</span>
          </Link>
        </div>
      </aside>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main className="surface-scrim-target surface-content-in" style={{ marginLeft: SIDEBAR_W, flex: 1, minHeight: 'calc(100vh - 4rem)', position: 'relative' }}>
        {children}
      </main>
    </div>
  )
}
