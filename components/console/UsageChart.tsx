'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * UsageChart — the primary scans-over-time area chart. Hand-rolled SVG, no deps.
 *
 * Recessive gridlines (rgba(255,255,255,.05), baseline .09), mono axis labels, gradient
 * accent area + 1.5px stroke, end-dot ringed in the page bg, and a per-bucket hover
 * tooltip with a vertical guide. X-axis labels adapt to the period (hours for 24H, days
 * for 7D/30D).
 *
 * EMPTY/GHOST: empty or all-zero data renders the gridlines + a flat 0-baseline in
 * accent@~15% (never a dead line). Pair with an EmptyState above/below for copy + CTA.
 *
 * `accent` defaults to console purple; pass steel (#6F9BC6) when reused on /app.
 */

const MONO = "'IBM Plex Mono', monospace"
const ACCENT_DEFAULT = '#9D8CFF'
const BG = '#050810'
const GRID = 'rgba(255,255,255,0.05)'
const BASELINE = 'rgba(255,255,255,0.09)'
const INK_LABEL = '#6E7587'
const INK = '#E6E9EE'

type Period = '24h' | '7d' | '30d'

export interface UsageChartProps {
  data: number[]
  period: Period
  accent?: string
  height?: number
  /** value formatter for the tooltip + y-axis max (default integer). */
  formatValue?: (v: number) => string
  /** noun for the tooltip, e.g. "scans". */
  unitLabel?: string
  style?: CSSProperties
}

function periodSpan(period: Period): { span: number; unit: string } {
  return { span: period === '24h' ? 24 : period === '7d' ? 7 : 30, unit: period === '24h' ? 'h' : 'd' }
}

export default function UsageChart({
  data,
  period,
  accent = ACCENT_DEFAULT,
  height = 180,
  formatValue = (v) => String(Math.round(v)),
  unitLabel = 'scans',
  style,
}: UsageChartProps) {
  const [hover, setHover] = useState<number | null>(null)

  const VW = 100
  const VH = 100
  const padTop = 10
  const padBot = 10
  const n = data.length
  const hasData = n > 0 && data.some((v) => v > 0)

  const max = Math.max(...(n ? data : [0]), 0)
  const min = 0
  const span = max - min || 1
  const xAt = (i: number) => (n > 1 ? (i / (n - 1)) * VW : 0)
  const yAt = (v: number) => padTop + (1 - (v - min) / span) * (VH - padTop - padBot)

  const pts = data.map((v, i) => `${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`)
  const linePath = pts.length ? `M${pts.join(' L')}` : ''
  const areaPath = pts.length
    ? `M${xAt(0).toFixed(2)},${VH} L${pts.join(' L')} L${xAt(n - 1).toFixed(2)},${VH} Z`
    : ''
  const ghostY = VH - padBot
  const gridYs = [padTop, padTop + (VH - padTop - padBot) * 0.5, VH - padBot]

  const { span: spanUnits, unit } = periodSpan(period)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const ago = Math.round((1 - f) * spanUnits)
    return { left: f * 100, label: ago === 0 ? 'now' : `${ago}${unit}` }
  })
  const bucketLabel = (i: number) => {
    const ago = Math.round((1 - (n > 1 ? i / (n - 1) : 0)) * spanUnits)
    return ago === 0 ? 'now' : `${ago}${unit} ago`
  }

  const lastIdx = n - 1
  const hoverX = hover != null ? xAt(hover) : 0
  const hoverY = hover != null ? yAt(data[hover]) : 0

  return (
    <div style={{ width: '100%', ...style }}>
      <div style={{ position: 'relative', width: '100%', height }}>
        {/* y-axis max label */}
        <span
          style={{
            position: 'absolute',
            top: `${padTop}%`,
            left: 0,
            transform: 'translateY(-50%)',
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '0.08em',
            color: INK_LABEL,
            pointerEvents: 'none',
          }}
        >
          {hasData ? formatValue(max) : ''}
        </span>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="none"
          style={{ display: 'block', position: 'absolute', inset: 0 }}
        >
          <defs>
            <linearGradient id="usage-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>

          {gridYs.map((gy, i) => (
            <line
              key={i}
              x1="0"
              y1={Math.round(gy)}
              x2={VW}
              y2={Math.round(gy)}
              stroke={i === gridYs.length - 1 ? BASELINE : GRID}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              shapeRendering="crispEdges"
            />
          ))}

          {hasData ? (
            <>
              <path d={areaPath} fill="url(#usage-area-grad)" stroke="none" />
              <path
                d={linePath}
                fill="none"
                stroke={accent}
                strokeWidth={1.5}
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
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {hasData && hover != null ? (
            <line
              x1={hoverX}
              y1={padTop}
              x2={hoverX}
              y2={VH - padBot}
              stroke={accent}
              strokeOpacity={0.4}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {/* end-dot ringed in bg */}
        {hasData ? (
          <span
            style={{
              position: 'absolute',
              left: `${xAt(lastIdx)}%`,
              top: `${yAt(data[lastIdx])}%`,
              transform: 'translate(-50%, -50%)',
              lineHeight: 0,
              pointerEvents: 'none',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4.5" fill={BG} />
              <circle cx="5" cy="5" r="2.5" fill={accent} />
            </svg>
          </span>
        ) : null}

        {/* hover dot */}
        {hasData && hover != null ? (
          <span
            style={{
              position: 'absolute',
              left: `${hoverX}%`,
              top: `${hoverY}%`,
              transform: 'translate(-50%, -50%)',
              lineHeight: 0,
              pointerEvents: 'none',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4.5" fill={BG} />
              <circle cx="5" cy="5" r="2.5" fill={accent} />
            </svg>
          </span>
        ) : null}

        {/* hover tooltip */}
        {hasData && hover != null ? (
          <div
            style={{
              position: 'absolute',
              left: `${hoverX}%`,
              top: 0,
              transform: `translate(${hover === 0 ? '0' : hover === lastIdx ? '-100%' : '-50%'}, -100%)`,
              pointerEvents: 'none',
              background: '#0A0E18',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '5px 8px',
              whiteSpace: 'nowrap',
              zIndex: 5,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, color: INK }}>
              {formatValue(data[hover])} {unitLabel}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: INK_LABEL, marginLeft: 6 }}>{bucketLabel(hover)}</span>
          </div>
        ) : null}

        {/* hover hit areas */}
        {hasData ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {data.map((_, i) => (
              <div
                key={i}
                style={{ flex: 1, cursor: 'crosshair' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* x-axis labels */}
      <div style={{ position: 'relative', width: '100%', height: 14, marginTop: 6 }}>
        {ticks.map((t, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${t.left}%`,
              transform: i === 0 ? 'translateX(0)' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.08em',
              color: INK_LABEL,
            }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}
