'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { scoreBand } from '@/lib/design-tokens'

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  animate?: boolean
  /** @deprecated use animate */
  animated?: boolean
}

const SIZE_MAP = {
  sm: { px: 40, stroke: 3, font: 10 },
  md: { px: 64, stroke: 4, font: 13 },
  lg: { px: 96, stroke: 5, font: 18 },
}

const BAND_HEX: Record<string, string> = {
  'sev-critical': '#E8635F',
  'json-string':  '#00C48C',
}

const BAND_GLOW_NEAR: Record<string, string> = {
  'sev-critical': 'rgba(232,99,95,0.7)',
  'json-string':  'rgba(0,196,140,0.7)',
}

const BAND_GLOW_FAR: Record<string, string> = {
  'sev-critical': 'rgba(232,99,95,0.3)',
  'json-string':  'rgba(0,196,140,0.3)',
}

const CRIT_FONT: Record<string, number> = { sm: 5, md: 7, lg: 9 }

function ScoreRing({ score, size = 'md', label, animate = true, animated }: ScoreRingProps) {
  const shouldAnimate = animated !== undefined ? animated : animate
  const { px, stroke, font } = SIZE_MAP[size]
  const center = px / 2
  const radius = center - stroke / 2 - 1
  const circumference = 2 * Math.PI * radius
  const targetFill = (Math.min(Math.max(score, 0), 100) / 100) * circumference
  const band     = scoreBand(score)
  const isCrit   = band === 'sev-critical'
  const color    = BAND_HEX[band]      ?? '#00C48C'
  const glowNear = BAND_GLOW_NEAR[band] ?? 'rgba(0,196,140,0.7)'
  const glowFar  = BAND_GLOW_FAR[band]  ?? 'rgba(0,196,140,0.3)'
  const critFont = CRIT_FONT[size]

  const arcRef = useRef<SVGCircleElement>(null)
  const [displayScore, setDisplayScore] = useState(score)

  useEffect(() => {
    if (!arcRef.current) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const doAnimate = shouldAnimate && !prefersReduced

    if (!doAnimate) {
      setDisplayScore(score)
      arcRef.current.style.strokeDasharray = `${targetFill} ${circumference}`
      return
    }

    setDisplayScore(0)
    arcRef.current.style.strokeDasharray = `0 ${circumference}`

    const start = performance.now()
    const duration = 1100
    let rafId: number

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplayScore(Math.round(score * ease))
      if (arcRef.current) {
        arcRef.current.style.strokeDasharray = `${targetFill * ease} ${circumference}`
      }
      if (t < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [shouldAnimate, score, targetFill, circumference])

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} style={{ display: 'block' }}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#111827"
          strokeWidth={stroke}
        />
        <circle
          ref={arcRef}
          className="score-ring-arc"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${targetFill} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ '--ring-glow-near': glowNear, '--ring-glow-far': glowFar } as CSSProperties}
        />
        <text
          x={center}
          y={isCrit ? center - font * 0.45 : center}
          dominantBaseline="central"
          textAnchor="middle"
          fill={color}
          fontFamily="'Space Grotesk', sans-serif"
          fontWeight={500}
          fontSize={font}
        >
          {displayScore}
        </text>
        {isCrit && (
          <text
            x={center}
            y={center + critFont * 0.5 + 2}
            dominantBaseline="central"
            textAnchor="middle"
            fill={color}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight={400}
            fontSize={critFont}
          >
            CRITICAL
          </text>
        )}
      </svg>
      {label && (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 500,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#6E7587',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

export { ScoreRing }
export default ScoreRing
