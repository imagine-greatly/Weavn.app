import type { CSSProperties, ReactNode } from 'react'
import Sparkline from './Sparkline'

/**
 * MetricCard — one calm, composed stat tile (Claude-Console card anatomy in Weavn skin).
 *
 * Anatomy (one template, every card):
 *   top row   — muted info dot + sentence-case title (Plex Sans, ~82% white) on the LEFT,
 *               an optional small badge on the RIGHT.
 *   value     — Space Grotesk 700, ~32px (+ optional mono suffix).
 *   sub       — one muted mono line.
 *   viz       — `side` (right of the number, e.g. a ring) and/or `children`/`sparkline`
 *               below — small and quiet, never dominating.
 *
 * Badges (mono 10px / .06em / zero radius): neutral for status ("38% used" / "lifetime"),
 * green for a good trend ("▲ 18% vs previous 7d"), red ONLY for genuinely-bad deltas.
 * `accent` defaults to console purple; pass steel (#6F9BC6) when reused on /app.
 */

const MONO = "'IBM Plex Mono', monospace"
const DISP = "'Space Grotesk', sans-serif"
const BODY = "'IBM Plex Sans', sans-serif"

const ACCENT_DEFAULT = '#9D8CFF'
const TITLE = 'rgba(240,244,255,0.82)'
const SUB = 'rgba(240,244,255,0.42)'
const INFO = 'rgba(240,244,255,0.28)'
const VALUE = '#F0F4FF'
const GREEN = '#00C48C'
const RED = '#FF5C5C'

export type BadgeTone = 'neutral' | 'green' | 'red'
export interface MetricBadge {
  label: string
  tone?: BadgeTone
}

export interface MetricCardProps {
  title: string
  /** muted info-dot tooltip (native title attr). */
  info?: string
  badge?: MetricBadge
  value: ReactNode
  valueSuffix?: ReactNode
  sub?: ReactNode
  sparkline?: number[]
  accent?: string
  /** quiet inline viz to the right of the number (e.g. a ring). */
  side?: ReactNode
  /** quiet viz below (in place of the sparkline), e.g. a stacked bar. */
  children?: ReactNode
  style?: CSSProperties
}

function badgeStyle(tone: BadgeTone): CSSProperties {
  if (tone === 'green') return { color: GREEN, background: 'rgba(0,196,140,0.10)', border: '1px solid rgba(0,196,140,0.22)' }
  if (tone === 'red') return { color: RED, background: 'rgba(255,92,92,0.10)', border: '1px solid rgba(255,92,92,0.24)' }
  return { color: 'rgba(240,244,255,0.50)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }
}

function InfoDot({ tip }: { tip?: string }) {
  return (
    <span title={tip} style={{ display: 'inline-flex', cursor: tip ? 'help' : 'default', lineHeight: 0 }}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="5.5" stroke={INFO} strokeWidth="1" />
        <circle cx="7" cy="4.4" r="0.7" fill={INFO} />
        <path d="M7 6.4v3.4" stroke={INFO} strokeWidth="1" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export default function MetricCard({
  title,
  info,
  badge,
  value,
  valueSuffix,
  sub,
  sparkline,
  accent = ACCENT_DEFAULT,
  side,
  children,
  style,
}: MetricCardProps) {
  return (
    <div style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', padding: 20, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <InfoDot tip={info} />
          <span style={{ fontFamily: BODY, fontSize: 15, color: TITLE, letterSpacing: '-0.1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
        </div>
        {badge ? (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.06em',
              padding: '2px 7px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              ...badgeStyle(badge.tone ?? 'neutral'),
            }}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, lineHeight: 1, color: VALUE }}>{value}</span>
            {valueSuffix ? <span style={{ fontFamily: MONO, fontSize: 12, color: SUB }}>{valueSuffix}</span> : null}
          </div>
          {sub ? <div style={{ fontFamily: MONO, fontSize: 11, color: SUB, marginTop: 7 }}>{sub}</div> : null}
        </div>
        {side ? <div style={{ flexShrink: 0 }}>{side}</div> : null}
      </div>

      {children ? (
        <div style={{ marginTop: 14 }}>{children}</div>
      ) : sparkline ? (
        <div style={{ marginTop: 14 }}>
          <Sparkline data={sparkline} accent={accent} height={34} />
        </div>
      ) : null}
    </div>
  )
}
