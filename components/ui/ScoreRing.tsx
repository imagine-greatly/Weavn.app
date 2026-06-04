'use client'

import { useEffect, useRef } from 'react'

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const SIZE_MAP = {
  sm: { px: 40, stroke: 3, font: 10 },
  md: { px: 64, stroke: 4, font: 13 },
  lg: { px: 96, stroke: 5, font: 18 },
}

function scoreColor(score: number): string {
  if (score >= 70) return '#00C48C'
  if (score >= 40) return '#F5A623'
  return '#FF4444'
}

export default function ScoreRing({ score, size = 'md', animated = true }: ScoreRingProps) {
  const { px, stroke, font } = SIZE_MAP[size]
  const center = px / 2
  const radius = center - stroke / 2 - 1
  const circumference = 2 * Math.PI * radius
  const fill = (Math.min(Math.max(score, 0), 100) / 100) * circumference
  const color = scoreColor(score)
  const arcRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    if (!animated || !arcRef.current) return
    arcRef.current.style.strokeDasharray = `0 ${circumference}`
    const raf = requestAnimationFrame(() => {
      arcRef.current!.style.transition = 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
      arcRef.current!.style.strokeDasharray = `${fill} ${circumference}`
    })
    return () => cancelAnimationFrame(raf)
  }, [animated, fill, circumference])

  return (
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
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={animated ? `0 ${circumference}` : `${fill} ${circumference}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center}
        dominantBaseline="central"
        textAnchor="middle"
        fill={color}
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight={500}
        fontSize={font}
      >
        {score}
      </text>
    </svg>
  )
}
