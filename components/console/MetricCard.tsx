import type { CSSProperties, ReactNode } from 'react'
import Sparkline from './Sparkline'

/**
 * MetricCard — a single API-dashboard stat tile (Stripe/Vercel/Resend reference).
 *
 * Locked tokens: card bg rgba(255,255,255,.022) + 1px rgba(255,255,255,.06) border,
 * zero radius. Label = IBM Plex Mono 11px/.14em/uppercase. Value = Space Grotesk.
 * Optional delta badge: ▲/▼ % vs prior window — green up / red down, mono pill border.
 *
 * Footer renders `children` (e.g. a stacked ok/err bar) if given, else a <Sparkline/>.
 * `accent` defaults to console purple; pass steel (#6F9BC6) when reused on /app.
 */

const MONO = "'IBM Plex Mono', monospace"
const DISP = "'Space Grotesk', sans-serif"

const ACCENT_DEFAULT = '#9D8CFF'
const CARD_BG = 'var(--panel-bg)'
const CARD_BORDER = 'var(--panel-border)'
const INK = '#E6E9EE'
const INK_LABEL = '#6E7587'
const INK_DIM = '#5A6070'
const GREEN = '#00C48C'
const RED = '#FF5C5C'

export interface MetricCardProps {
  label: string
  value: ReactNode
  /** small mono suffix beside the big number, e.g. "p50". */
  valueSuffix?: ReactNode
  sub?: ReactNode
  /** % change vs prior window. positive → green ▲, negative → red ▼. null/undefined → no badge. */
  delta?: number | null
  sparkline?: number[]
  accent?: string
  /** custom footer (rendered in place of the sparkline), e.g. a stacked ok/err bar. */
  children?: ReactNode
  style?: CSSProperties
}

export default function MetricCard({
  label,
  value,
  valueSuffix,
  sub,
  delta,
  sparkline,
  accent = ACCENT_DEFAULT,
  children,
  style,
}: MetricCardProps) {
  const showDelta = typeof delta === 'number' && Number.isFinite(delta)
  const up = (delta ?? 0) >= 0
  const deltaColor = up ? GREEN : RED

  return (
    <div style={{ background: CARD_BG, border: CARD_BORDER, padding: '18px 18px 16px', minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_LABEL }}>
          {label}
        </span>
        {showDelta ? (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: '0.04em',
              color: deltaColor,
              border: `1px solid color-mix(in srgb, ${deltaColor} 45%, transparent)`,
              padding: '1px 6px',
              whiteSpace: 'nowrap',
            }}
          >
            {up ? '▲' : '▼'} {Math.abs(delta as number)}%
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 10 }}>
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, lineHeight: 1, color: INK }}>{value}</span>
        {valueSuffix ? <span style={{ fontFamily: MONO, fontSize: 12, color: INK_LABEL }}>{valueSuffix}</span> : null}
      </div>

      {sub ? <div style={{ fontFamily: MONO, fontSize: 10.5, color: INK_DIM, marginTop: 6 }}>{sub}</div> : null}

      {children ? (
        <div style={{ marginTop: 12 }}>{children}</div>
      ) : sparkline ? (
        <div style={{ marginTop: 12 }}>
          <Sparkline data={sparkline} accent={accent} height={34} />
        </div>
      ) : null}
    </div>
  )
}
