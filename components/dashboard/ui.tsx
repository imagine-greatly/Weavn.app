'use client'

import type { CSSProperties, ReactNode } from 'react'

/**
 * Dashboard surface UI kit — the single elevation + type system for every /app tab
 * (Overview · Reports · Billing, plus Account/Clients/Branding). Executing the locked
 * brand at a higher bar: cold-futurism, zero radius, IBM Plex + Space Grotesk, color
 * rationed to signal (verdict bands + the steel affordance).
 *
 * The premium move here is ELEVATION, not lightening. The old surface (#0A0E18 on a
 * #050810 page) sat almost flush with the page, so cards read as flat and "too dark".
 * We introduce a real 3-step surface scale plus a 1px top-edge highlight (light catches
 * the top of every panel), crisp hairlines, and a considered 8px spacing rhythm — so
 * sections read as distinct planes without breaking the dark aesthetic.
 */

export const MONO = "'IBM Plex Mono', monospace"
export const BODY = "'IBM Plex Sans', sans-serif"
export const DISP = "'Space Grotesk', sans-serif"

// ── Tokens ──────────────────────────────────────────────────────────────────────
export const DASH = {
  // Elevation scale — each step a deliberate, subtle plane above the #050810 page.
  bg:        '#050810', // the page
  panel:     '#0A0F1C', // raised card / primary surface (a touch bluer + lighter than the page)
  panelHi:   '#0E1524', // interactive / hovered / nested surface
  well:      '#070A12', // recessed input + progress track
  // Hairlines — strong enough that adjacent surfaces separate, quiet enough to stay cold.
  hair:      'rgba(255,255,255,0.06)', // internal row dividers
  line:      'rgba(255,255,255,0.09)', // card borders
  lineHi:    'rgba(255,255,255,0.14)', // emphasis / focus borders
  // Ink.
  ink:       '#E9ECF2',
  ink2:      '#98A0B3', // #9398A8 lifted a hair for body legibility on raised panels
  ink3:      '#6E7587',
  ink4:      '#565B63',
  // Signal (verdict bands — semantically fixed, never themed).
  crit:      '#E8635F',
  high:      '#EFB23E',
  good:      '#00C48C',
} as const

// The steel affordance flows from the live surface accent so a surface crossing repaints it.
export const STEEL = 'var(--surface-accent)'
export const steelSoft = (pct: number) => `color-mix(in srgb, var(--surface-accent) ${pct}%, transparent)`
export const steelLine = (pct: number) => `color-mix(in srgb, var(--surface-accent) ${pct}%, transparent)`

// The top-edge highlight — light catching the top of a panel. THE tell of a crafted dark
// UI; pair with a soft drop for lift off the page. Kept subtle so it never reads as a glow.
export const TOP_HI = 'inset 0 1px 0 0 rgba(255,255,255,0.05)'
export const ELEV = `${TOP_HI}, 0 1px 2px rgba(0,0,0,0.4), 0 8px 28px rgba(0,0,0,0.28)`
export const ELEV_SM = `${TOP_HI}, 0 1px 2px rgba(0,0,0,0.35)`

// ── Panel ─────────────────────────────────────────────────────────────────────
// The base raised surface. `interactive` adds a hover lift (border brightens, plane
// rises) for clickable cards/rows.
export function Panel({
  children,
  style,
  interactive = false,
  accent = false,
}: {
  children: ReactNode
  style?: CSSProperties
  interactive?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={interactive ? 'dash-panel dash-panel--interactive' : 'dash-panel'}
      style={{
        position: 'relative',
        background: DASH.panel,
        border: `1px solid ${accent ? steelLine(38) : DASH.line}`,
        boxShadow: ELEV,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Page header — mono kicker → display title → body sub, one rhythm everywhere ──
export function PageHeader({
  kicker,
  title,
  sub,
  right,
}: {
  kicker: string
  title: string
  sub?: string
  right?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 32 }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: STEEL, margin: '0 0 12px' }}>
          {kicker}
        </p>
        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: DASH.ink, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          {title}
        </h1>
        {sub ? (
          <p style={{ fontFamily: BODY, fontSize: 15, color: DASH.ink2, margin: '10px 0 0', maxWidth: 580, lineHeight: 1.6 }}>{sub}</p>
        ) : null}
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  )
}

// ── Section label — mono caption + a trailing hairline rule (structures long pages) ──
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: DASH.ink3, flexShrink: 0 }}>{children}</span>
      <span aria-hidden style={{ flex: 1, height: 0, borderTop: `1px solid ${DASH.hair}` }} />
      {right ? <span style={{ flexShrink: 0 }}>{right}</span> : null}
    </div>
  )
}

// ── Stat tile — hairline-gridded metric. Number in display, label in mono. ───────
export function StatTile({ label, value, valueColor, hint }: { label: string; value: string; valueColor?: string; hint?: string }) {
  return (
    <div style={{ background: DASH.panel, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DASH.ink3, margin: 0 }}>{label}</p>
      <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: valueColor ?? DASH.ink, margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
      {hint ? <p style={{ fontFamily: MONO, fontSize: 10, color: DASH.ink4, margin: 0, letterSpacing: '0.02em' }}>{hint}</p> : null}
    </div>
  )
}

// ── Status chip — scan lifecycle (complete / pending / failed). ──────────────────
export function StatusChip({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  const cfg =
    s === 'pending' || s === 'processing' || s === 'queued'
      ? { label: 'Running', color: DASH.high, dot: true }
      : s === 'failed' || s === 'error'
        ? { label: 'Failed', color: DASH.crit, dot: false }
        : { label: 'Complete', color: DASH.good, dot: false }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.color, border: `0.5px solid ${cfg.color}55`, padding: '3px 9px', whiteSpace: 'nowrap' }}>
      <span aria-hidden className={cfg.dot ? 'dash-pulse' : undefined} style={{ width: 5, height: 5, background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ── Button — the one steel affordance treatment (ghost + subtle fill on hover). ──
export function GhostButton({
  children,
  onClick,
  href,
  disabled = false,
  size = 'md',
  tone = 'steel',
  type = 'button',
  style,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  tone?: 'steel' | 'muted' | 'danger'
  type?: 'button' | 'submit'
  style?: CSSProperties
}) {
  const pad = size === 'sm' ? '8px 14px' : '10px 18px'
  const fs = size === 'sm' ? 11 : 11.5
  const color = tone === 'danger' ? DASH.crit : tone === 'muted' ? DASH.ink2 : STEEL
  const border = tone === 'danger' ? `${DASH.crit}55` : tone === 'muted' ? DASH.line : steelLine(45)
  const base: CSSProperties = {
    fontFamily: MONO, fontSize: fs, letterSpacing: '0.06em', textTransform: 'uppercase',
    color, background: 'transparent', border: `1px solid ${border}`,
    padding: pad, borderRadius: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'background 0.14s, border-color 0.14s',
    ...style,
  }
  const cls = tone === 'danger' ? 'dash-btn dash-btn--danger' : 'dash-btn'
  if (href && !disabled) {
    return <a href={href} className={cls} style={base}>{children}</a>
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={base}>
      {children}
    </button>
  )
}

// ── Skeleton — considered loading state (shimmer over the well tone). ────────────
export function Skeleton({ w = '100%', h = 14, style }: { w?: number | string; h?: number | string; style?: CSSProperties }) {
  return <span className="dash-shimmer" style={{ display: 'block', width: w, height: h, ...style }} />
}
