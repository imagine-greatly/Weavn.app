/**
 * SegmentedMeter — discrete used/total meter (e.g. TRIAL REMAINING). Zero-radius
 * segments, accent-filled for used, faint for remaining. When `total` exceeds
 * `maxSegments` the segments are scaled proportionally so the bar never overflows.
 * `accent` defaults to console purple; pass steel (#6F9BC6) when reused on /app.
 */

const ACCENT_DEFAULT = '#9D8CFF'
const EMPTY = 'rgba(255,255,255,0.07)'

export interface SegmentedMeterProps {
  used: number
  total: number
  accent?: string
  maxSegments?: number
  height?: number
}

export default function SegmentedMeter({
  used,
  total,
  accent = ACCENT_DEFAULT,
  maxSegments = 25,
  height = 6,
}: SegmentedMeterProps) {
  const safeTotal = Math.max(1, Math.round(total))
  const segs = Math.min(safeTotal, maxSegments)
  const clampedUsed = Math.max(0, Math.min(used, safeTotal))
  const filled = Math.round((clampedUsed / safeTotal) * segs)

  return (
    <div style={{ display: 'flex', gap: 2, width: '100%' }} aria-hidden>
      {Array.from({ length: segs }).map((_, i) => (
        <span key={i} style={{ flex: 1, height, background: i < filled ? accent : EMPTY }} />
      ))}
    </div>
  )
}
