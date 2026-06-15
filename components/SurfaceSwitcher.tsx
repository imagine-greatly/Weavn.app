'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Persistent surface-switcher — one account, two workspaces:
 *   Dashboard (/app, steel #6F9BC6)  ·  Developers (/console, purple #9D8CFF)
 *
 * Universal: every logged-in user can move between both surfaces. This is NOT a
 * paywall — the surfaces are workspaces, not entitlements (in-surface capability is
 * what scales by plan, seamed for later). One shared component, used in both shells
 * (DashboardShell + the /console shell) and in the global navbar for logged-in users.
 *
 * Color-as-orientation: only the ACTIVE segment is tinted in the current surface's
 * color; the inactive segment stays neutral. That keeps /app purple-free and /console
 * steel-free while still signaling "which workspace am I in."
 */

type Surface = 'app' | 'console'

const MONO = "'IBM Plex Mono', monospace"
const MUTED = '#6E7587'
const INK = '#E6E9EE'

const SURFACES: { id: Surface; label: string; href: string; color: string; activeBg: string }[] = [
  { id: 'app',     label: 'Dashboard',  href: '/app',     color: '#6F9BC6', activeBg: 'rgba(111,155,198,0.12)' },
  { id: 'console', label: 'Developers', href: '/console', color: '#9D8CFF', activeBg: 'rgba(157,140,255,0.12)' },
]

export interface SurfaceSwitcherProps {
  /** Force the active surface. When omitted, it is derived from the pathname. */
  active?: Surface
  /** Compact, label-less variant for the top navbar. */
  compact?: boolean
}

export default function SurfaceSwitcher({ active, compact = false }: SurfaceSwitcherProps) {
  const pathname = usePathname() ?? ''
  const current: Surface | null =
    active ??
    (pathname === '/console' || pathname.startsWith('/console/')
      ? 'console'
      : pathname === '/app' || pathname.startsWith('/app/')
        ? 'app'
        : null)

  return (
    <div style={{ width: compact ? 'auto' : '100%' }}>
      {!compact && (
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>
          Workspace
        </div>
      )}
      <div style={{ display: compact ? 'inline-flex' : 'flex', width: compact ? 'auto' : '100%', border: '0.5px solid rgba(255,255,255,0.1)' }}>
        {SURFACES.map((s, i) => {
          const isActive = current === s.id
          return (
            <Link
              key={s.id}
              href={s.href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                flex: compact ? '0 0 auto' : 1,
                textAlign: 'center',
                fontFamily: MONO,
                fontSize: compact ? 10 : 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: compact ? '7px 13px' : '8px 10px',
                color: isActive ? s.color : MUTED,
                background: isActive ? s.activeBg : 'transparent',
                borderBottom: `2px solid ${isActive ? s.color : 'transparent'}`,
                borderLeft: i > 0 ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
                transition: 'color 0.12s, background 0.12s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = INK }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = MUTED }}
            >
              {s.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
