'use client'

import Link from 'next/link'
import WeavnMark from '@/components/ui/WeavnMark'
import QuotaBar from '@/components/console/QuotaBar'

/**
 * Sidebar — the ONE identity rail, shared by both surfaces (same code, accent prop).
 * Dashboard renders it in steel (#6F9BC6), the developer console in purple (#9D8CFF).
 *
 * Anatomy (top → bottom):
 *   workspace header — hex mark + "weavn" + a mode chip (accent-bordered mono)
 *   workspace row    — avatar square + name + plan
 *   nav              — strong active (3px accent bar + accent-tint bg + white), inactive ~50%
 *   quota            — real usage label + accent progress bar + muted sub-line
 *   doorway          — ONE directional link to the OTHER surface, in the DESTINATION's color
 *   account          — anchored at the very bottom
 *
 * Panel/border discipline: one divider weight (--divider-color), crisp 1px, zero radius.
 */

const MONO = "'IBM Plex Mono', monospace"
const DISP = "'Space Grotesk', sans-serif"
const BODY = "'IBM Plex Sans', sans-serif"

const SIDEBAR_BG = '#06090F'
const INK = '#E6E9EE'
const INK_2 = '#9398A8'
const INK_MUTED = '#6E7587'
const NAV_IDLE = 'rgba(240,244,255,0.50)'
const DIVIDER = '1px solid var(--divider-color)'

export interface SidebarNavItem {
  label: string
  active?: boolean
  href?: string
  onClick?: () => void
}

export interface SidebarQuota {
  label: string
  primary: string
  pct: number
  sub: string
  warn?: boolean
}

export interface SidebarDoorway {
  label: string
  href: string
  /** the DESTINATION surface's accent (purple when pointing at the console, steel at the dashboard). */
  accent: string
}

export interface SidebarProps {
  accent: string
  /** mode chip text — "Dashboard" (steel) / "Developer" (purple). */
  modeLabel: string
  workspaceName: string
  workspacePlan: string
  nav: SidebarNavItem[]
  quota?: SidebarQuota
  doorway: SidebarDoorway
  account: { label: string; href: string; active?: boolean }
  width?: number
  /** true (default) = fixed rail (document-scroll surfaces like /app). false = in-flow
   *  flex child filling its parent's height (the console's h-screen internal-scroll shell). */
  fixed?: boolean
}

function NavRow({ item, accent }: { item: SidebarNavItem; accent: string }) {
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    textAlign: 'left',
    padding: '11px 18px',
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: '0.04em',
    textDecoration: 'none',
    cursor: 'pointer',
    background: item.active ? `color-mix(in srgb, ${accent} 11%, transparent)` : 'transparent',
    color: item.active ? INK : NAV_IDLE,
    borderLeft: `3px solid ${item.active ? accent : 'transparent'}`,
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    transition: 'color 0.12s, background 0.12s',
  }
  const onEnter = (el: HTMLElement) => { if (!item.active) el.style.color = INK }
  const onLeave = (el: HTMLElement) => { if (!item.active) el.style.color = NAV_IDLE }

  if (item.href) {
    return (
      <Link href={item.href} style={style} onMouseEnter={e => onEnter(e.currentTarget)} onMouseLeave={e => onLeave(e.currentTarget)}>
        {item.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={item.onClick} style={style} onMouseEnter={e => onEnter(e.currentTarget)} onMouseLeave={e => onLeave(e.currentTarget)}>
      {item.label}
    </button>
  )
}

export default function Sidebar({ accent, modeLabel, workspaceName, workspacePlan, nav, quota, doorway, account, width = 248, fixed = true }: SidebarProps) {
  const initial = (workspaceName.trim()[0] ?? 'W').toUpperCase()
  const frame: React.CSSProperties = fixed
    ? { position: 'fixed', left: 0, top: '4rem', height: 'calc(100vh - 4rem)', width, zIndex: 40 }
    : { position: 'relative', height: '100%', width, flexShrink: 0 }

  return (
    <aside
      style={{
        ...frame,
        background: SIDEBAR_BG, borderRight: DIVIDER,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Workspace header — hex + weavn + mode chip */}
      <div style={{ padding: '15px 18px', borderBottom: DIVIDER, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', minWidth: 0 }}>
          <WeavnMark size={24} />
          <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: INK }}>weavn</span>
        </Link>
        <span
          style={{
            marginLeft: 'auto', flexShrink: 0,
            fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: accent, border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`, padding: '3px 7px',
          }}
        >
          {modeLabel}
        </span>
      </div>

      {/* Workspace row — avatar square + name + plan */}
      <div style={{ padding: '12px 18px', borderBottom: DIVIDER, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `color-mix(in srgb, ${accent} 16%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
            fontFamily: DISP, fontWeight: 700, fontSize: 13, color: accent,
          }}
        >
          {initial}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: BODY, fontSize: 13, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workspaceName}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: INK_MUTED, textTransform: 'capitalize', letterSpacing: '0.04em' }}>{workspacePlan} plan</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {nav.map(item => <NavRow key={item.label} item={item} accent={accent} />)}
      </nav>

      {/* Quota */}
      {quota ? (
        <div style={{ padding: '14px 18px', borderTop: DIVIDER, flexShrink: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_MUTED, marginBottom: 8 }}>{quota.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: INK_2 }}>{quota.primary}</span>
          </div>
          <QuotaBar pct={quota.pct} accent={accent} warnAtFull={quota.warn} />
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: INK_MUTED, marginTop: 7, letterSpacing: '0.04em' }}>{quota.sub}</div>
        </div>
      ) : null}

      {/* Directional doorway — to the OTHER surface, in the destination's color */}
      <div style={{ padding: '14px 18px', borderTop: DIVIDER, flexShrink: 0 }}>
        <Link
          href={doorway.href}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: doorway.accent,
            background: `color-mix(in srgb, ${doorway.accent} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${doorway.accent} 45%, transparent)`,
            padding: '10px 14px', textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          {doorway.label}
        </Link>
      </div>

      {/* Account — anchored at the very bottom */}
      <div style={{ padding: '14px 18px', borderTop: DIVIDER, flexShrink: 0 }}>
        <Link
          href={account.href}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em',
            color: account.active ? INK : INK_MUTED, textDecoration: 'none',
          }}
        >
          <span>{account.label}</span>
          <span style={{ color: accent }}>→</span>
        </Link>
      </div>
    </aside>
  )
}
