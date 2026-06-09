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

// shrink = extra inset beyond stroke/2, making room for outer track ring + ticks
const SIZE_MAP = {
  sm: { px: 40,  stroke: 3, font: 10, shrink: 3,   tickLen: 2,   majorTickLen: 3.5, critFont: 5  },
  md: { px: 64,  stroke: 4, font: 13, shrink: 4,   tickLen: 3,   majorTickLen: 5,   critFont: 7  },
  lg: { px: 96,  stroke: 5, font: 18, shrink: 5,   tickLen: 4,   majorTickLen: 6.5, critFont: 9  },
}

const BAND_HEX: Record<string, string> = {
  'sev-critical': '#E8635F',
  'json-string':  '#00C48C',
}

function ScoreRing({ score, size = 'md', label, animate = true, animated }: ScoreRingProps) {
  const shouldAnimate = animated !== undefined ? animated : animate
  const { px, stroke, font, shrink, tickLen, majorTickLen, critFont } = SIZE_MAP[size]
  const center       = px / 2
  const radius       = center - stroke / 2 - shrink
  const outerR       = center - 1.5            // outer track ring + tick origin
  const circumference = 2 * Math.PI * radius
  const targetFill   = (Math.min(Math.max(score, 0), 100) / 100) * circumference
  const band         = scoreBand(score)
  const isCrit       = band === 'sev-critical'
  const color        = BAND_HEX[band] ?? '#00C48C'

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

  // 12 tick marks at clock positions; every 3rd is major (12/3/6/9 o'clock)
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle    = (i / 12) * 2 * Math.PI - Math.PI / 2
    const isMajor  = i % 3 === 0
    const len      = isMajor ? majorTickLen : tickLen
    const cos      = Math.cos(angle)
    const sin      = Math.sin(angle)
    return {
      x1: center + cos * outerR,
      y1: center + sin * outerR,
      x2: center + cos * (outerR - len),
      y2: center + sin * (outerR - len),
      isMajor,
    }
  })

  // Vertical positions for score number + hairline + SCORE label, centered in ring
  const yScore = center - critFont / 2 - 2
  const yHair  = yScore + font / 2 + 2.5
  const yLabel = yHair + 2 + critFont / 2 + 1

  const filterId = `arcGlow-${size}`

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} style={{ display: 'block' }}>
        <defs>
          {/* Arc-only glow: two blur passes merged with source — bloom stays inside SVG */}
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.8" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer track ring — full 360° scale reference */}
        <circle
          cx={center} cy={center} r={outerR}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}
        />

        {/* Tick marks — gauge/instrument dial feel */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isMajor ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={t.isMajor ? 1 : 0.75}
          />
        ))}

        {/* Background track at arc radius */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}
        />

        {/* Colored arc — filter applied here only, not on container */}
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

        {/* Score number */}
        <text
          x={center} y={yScore}
          dominantBaseline="central"
          textAnchor="middle"
          fill={color}
          fontFamily="'Space Grotesk', sans-serif"
          fontWeight={600}
          fontSize={font}
        >
          {displayScore}
        </text>

        {/* Hairline rule beneath number */}
        <line
          x1={center - font * 0.6} y1={yHair}
          x2={center + font * 0.6} y2={yHair}
          stroke="rgba(255,255,255,0.12)" strokeWidth={0.5}
        />

        {/* SCORE instrument label */}
        <text
          x={center} y={yLabel}
          dominantBaseline="central"
          textAnchor="middle"
          fill="rgba(147,152,168,0.7)"
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight={400}
          fontSize={critFont}
          style={{ letterSpacing: '0.08em' }}
        >
          SCORE
        </text>
      </svg>

      {/* CRITICAL severity badge — outside SVG, no glow leak */}
      {isCrit && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: critFont + 1,
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
