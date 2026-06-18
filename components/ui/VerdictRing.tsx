'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { scoreBand, BAND_HEX, type VerdictBand } from '@/lib/verdict'

/**
 * VerdictRing — the ONE score-ring implementation. Covers the small dashboard ring
 * (named sizes sm/md/lg) AND the large report hero ring (numeric px size). Consumes
 * lib/verdict for band/color. No glow (locked design: verdict-banded ring, no halo).
 * Verdict colors are semantically fixed; pass `color` to override (e.g. the report's
 * theme-aware light/PDF variants, or an agency brand-neutral preview).
 */

type NamedSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<NamedSize, { px: number; stroke: number; font: number }> = {
  sm: { px: 40, stroke: 3, font: 10 },
  md: { px: 64, stroke: 4, font: 13 },
  lg: { px: 96, stroke: 5, font: 18 },
}

export interface VerdictRingProps {
  score: number
  /** Named size (sm/md/lg) or an explicit pixel diameter (e.g. 166 for the report). */
  size?: NamedSize | number
  stroke?: number
  fontSize?: number
  /** Override the band-derived color (theme-aware report / brand-neutral preview). */
  color?: string
  /** Background track color. */
  track?: string
  /** Force a band instead of deriving from score (illustration override). */
  band?: VerdictBand
  animate?: boolean
  /** Render the score number in the center (default true). */
  showScore?: boolean
  className?: string
  style?: CSSProperties
}

export default function VerdictRing({
  score,
  size = 'md',
  stroke: strokeProp,
  fontSize,
  color: colorProp,
  track = 'rgba(255,255,255,0.05)',
  band: bandProp,
  animate = true,
  showScore = true,
  className,
  style,
}: VerdictRingProps) {
  const dims =
    typeof size === 'number'
      ? {
          px: size,
          stroke: strokeProp ?? Math.max(2, Math.round(size * 0.04)),
          font: fontSize ?? Math.round(size * 0.31),
        }
      : {
          px: SIZE_MAP[size].px,
          stroke: strokeProp ?? SIZE_MAP[size].stroke,
          font: fontSize ?? SIZE_MAP[size].font,
        }
  const { px, stroke, font } = dims
  const center = px / 2
  const radius = center - stroke / 2 - 2
  const circumference = 2 * Math.PI * radius
  const target = (Math.min(Math.max(score, 0), 100) / 100) * circumference
  const band = bandProp ?? scoreBand(score)
  const color = colorProp ?? BAND_HEX[band]

  const arcRef = useRef<SVGCircleElement>(null)
  const [display, setDisplay] = useState(score)

  useEffect(() => {
    if (!arcRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!animate || reduced) {
      setDisplay(score)
      arcRef.current.style.strokeDasharray = `${target} ${circumference}`
      return
    }
    setDisplay(0)
    arcRef.current.style.strokeDasharray = `0 ${circumference}`
    const start = performance.now()
    const duration = 1100
    let raf = 0
    const tick = (now: number) => {
      const tt = Math.min((now - start) / duration, 1)
      const e = 1 - Math.pow(1 - tt, 3)
      setDisplay(Math.round(score * e))
      if (arcRef.current) arcRef.current.style.strokeDasharray = `${target * e} ${circumference}`
      if (tt < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animate, score, target, circumference])

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className={className}
      style={{ display: 'block', ...style }}
    >
      {/* Background track */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
      {/* Verdict-banded progress arc (no glow) */}
      <circle
        ref={arcRef}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${target} ${circumference}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
      {showScore && (
        <text
          x={center}
          y={center}
          dominantBaseline="central"
          textAnchor="middle"
          fill={color}
          fontFamily="'Space Grotesk', sans-serif"
          fontWeight={600}
          fontSize={font}
        >
          {display}
        </text>
      )}
    </svg>
  )
}
