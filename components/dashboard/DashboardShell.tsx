'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import WeavnMark from '@/components/ui/WeavnMark'

// ── Dashboard surface tokens (steel blue · muted cold futurism) ────────────────
// Source of truth: tailwind.config.ts / lib/design-tokens.ts. Steel #6F9BC6 is the
// Dashboard surface color. No purple on this surface; green is success-only.
const C = {
  bg:           '#050810',
  sidebarBg:    '#06090F',
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"

const SIDEBAR_W = 248

const NAV_ITEMS = [
  { label: 'Overview', href: '/app' },
  { label: 'Reports',  href: '/app/reports' },
  { label: 'Branding', href: '/app/branding' },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/app'

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', background: C.bg }}>

      {/* ── Sidebar (steel-blue Dashboard nav) ──────────────────────────────── */}
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
        {/* Brand mark — convergence node, tinted steel for this surface */}
        <div style={{ padding: '18px 18px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
          <WeavnMark size={30} animated ringTints={{ outer: C.steel, middle: C.steel, inner: C.steel }} />
          <span style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.inkMuted }}>
            Dashboard
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'block',
                  padding: '11px 18px',
                  fontFamily: MONO,
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                  color: active ? C.inkPrimary : C.inkSecondary,
                  background: active ? 'rgba(111,155,198,0.06)' : 'transparent',
                  borderLeft: active ? `2px solid ${C.steel}` : '2px solid transparent',
                  transition: 'color 0.12s, background 0.12s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = C.inkPrimary }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = C.inkSecondary }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer — account → /settings */}
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
            <span style={{ color: C.steel }}>→</span>
          </Link>
        </div>
      </aside>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, minHeight: 'calc(100vh - 4rem)', position: 'relative' }}>
        {children}
      </main>
    </div>
  )
}
