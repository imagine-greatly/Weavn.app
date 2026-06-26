'use client'

import { useId } from 'react'
import type { CSSProperties } from 'react'

/**
 * Sparkline — surface-agnostic area chart for metric cards. Hand-rolled SVG, no deps.
 *
 * Gradient accent@~22% → transparent fill, 1.5px stroke, round end-dot ringed in the
 * page bg. Auto-scales to the series min/max. Renders preserveAspectRatio="none" so it
 * stretches to any width; the stroke uses non-scaling-stroke and the end-dot is an
 * overlaid (undistorted) SVG so geometry stays crisp at any aspect ratio.
 *
 * EMPTY/GHOST: when the series is empty or all-zero it renders a flat 0-baseline in
 * accent@~15% — a deliberate ghost, never a dead solid line.
 *
 * `accent` defaults to console purple; pass steel (#6F9BC6) when reused on /app.
 */

const ACCENT_DEFAULT = '#9D8CFF'
const BG = '#050810'

export interface SparklineProps {
  data: number[]
  accent?: string
  width?: number | string
  height?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

export default function Sparkline({
  data,
  accent = ACCENT_DEFAULT,
  width = '100%',
  height = 36,
  strokeWidth = 1.5,
  className,
  style,
}: SparklineProps) {
  const gid = 'spark-' + useId().replace(/:/g, '')
  const VW = 100
  const VH = 36
  const padY = 4
  const n = data.length
  const hasData = n > 0 && data.some((v) => v > 0)

  const max = Math.max(...(n ? data : [0]), 0)
  const min = Math.min(...(n ? data : [0]), 0)
  const span = max - min || 1
  const xAt = (i: number) => (n > 1 ? (i / (n - 1)) * VW : 0)
  const yAt = (v: number) => VH - padY - ((v - min) / span) * (VH - padY * 2)

  const pts = data.map((v, i) => `${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`)
  const linePath = pts.length ? `M${pts.join(' L')}` : ''
  const areaPath = pts.length
    ? `M${xAt(0).toFixed(2)},${VH} L${pts.join(' L')} L${xAt(n - 1).toFixed(2)},${VH} Z`
    : ''

  const lastXPct = n > 1 ? 100 : 0
  const lastYPct = hasData ? (yAt(data[n - 1]) / VH) * 100 : 0
  const ghostY = VH - padY

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'block', width, height, overflow: 'visible', ...style }}
      aria-hidden
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        style={{ display: 'block', position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {hasData ? (
          <>
            <path d={areaPath} fill={`url(#${gid})`} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke={accent}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <line
            x1="0"
            y1={ghostY}
            x2={VW}
            y2={ghostY}
            stroke={accent}
            strokeOpacity={0.15}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {hasData ? (
        <span
          style={{
            position: 'absolute',
            left: `${lastXPct}%`,
            top: `${lastYPct}%`,
            transform: 'translate(-50%, -50%)',
            lineHeight: 0,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3.5" fill={BG} />
            <circle cx="4" cy="4" r="2" fill={accent} />
          </svg>
        </span>
      ) : null}
    </span>
  )
}
