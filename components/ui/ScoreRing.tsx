'use client'

import { useEffect, useRef, useState } from 'react'
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
  sm: { px: 40,  stroke: 3, font: 10, badgeFont: 6  },
  md: { px: 64,  stroke: 4, font: 13, badgeFont: 8  },
  lg: { px: 96,  stroke: 5, font: 18, badgeFont: 10 },
}

const BAND_HEX: Record<string, string> = {
  'sev-critical': '#E8635F',
  'json-string':  '#00C48C',
}

function ScoreRing({ score, size = 'md', label, animate = true, animated }: ScoreRingProps) {
  const shouldAnimate = animated !== undefined ? animated : animate
  const { px, stroke, font, badgeFont } = SIZE_MAP[size]
  const center        = px / 2
  const radius        = center - stroke / 2 - 2
  const circumference = 2 * Math.PI * radius
  const targetFill    = (Math.min(Math.max(score, 0), 100) / 100) * circumference
  const band          = scoreBand(score)
  const isCrit        = band === 'sev-critical'
  const color         = BAND_HEX[band] ?? '#00C48C'

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

  const filterId = `arcGlow-${size}`

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} style={{ display: 'block' }}>
        <defs>
          <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.8" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}
        />

        {/* Colored progress arc with glow */}
        <circle
          ref={arcRef}
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${targetFill} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
          filter={`url(#${filterId})`}
        />

        {/* Score number centered */}
        <text
          x={center} y={center}
          dominantBaseline="central"
          textAnchor="middle"
          fill={color}
          fontFamily="'Space Grotesk', sans-serif"
          fontWeight={600}
          fontSize={font}
        >
          {displayScore}
        </text>
      </svg>

      {/* CRITICAL badge */}
      {isCrit && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: badgeFont,
          color: '#E8635F',
          border: '0.5px solid rgba(232,99,95,0.35)',
          padding: '2px 6px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          lineHeight: 1.4,
        }}>
          CRITICAL
        </div>
      )}

      {label && (
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 500,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#6E7587',
        }}>
          {label}
        </span>
      )}
    </div>
  )
}

export { ScoreRing }
export default ScoreRing
