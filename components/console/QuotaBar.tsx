/**
 * QuotaBar — continuous progress bar (e.g. sidebar QUOTA). Zero radius, accent fill on
 * a faint track. Replaces the 1px hairline that read as broken at low/zero usage.
 * `warnAtFull` flips the fill to red once the bar hits 100%.
 * `accent` defaults to console purple; pass steel (#6F9BC6) when reused on /app.
 */

const ACCENT_DEFAULT = '#9D8CFF'
const TRACK = 'rgba(255,255,255,0.07)'
const RED = '#FF5C5C'

export interface QuotaBarProps {
  /** 0..100 */
  pct: number
  accent?: string
  height?: number
  warnAtFull?: boolean
}

export default function QuotaBar({ pct, accent = ACCENT_DEFAULT, height = 4, warnAtFull = false }: QuotaBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))
  const color = warnAtFull && clamped >= 100 ? RED : accent
  return (
    <div style={{ position: 'relative', width: '100%', height, background: TRACK }} aria-hidden>
      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${clamped}%`, background: color }} />
    </div>
  )
}
