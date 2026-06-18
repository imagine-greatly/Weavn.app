import type { CSSProperties } from 'react'

/**
 * Bloom — the shared ambient accent glow. Accent-aware via --surface-accent (steel on
 * /app, purple on /console). Heavily feathered, low opacity, sits at zIndex 0 behind
 * content — drop it inside a position:relative + overflow:hidden wrapper and give the
 * content wrapper zIndex 1. Centered by default; override placement via `style`.
 */

export interface BloomProps {
  /** Diameter in px (single number) or pass width/height via `style`. */
  size?: number
  /** Peak opacity of the accent at the center (0–1). */
  intensity?: number
  /** Glow color — defaults to the live surface accent. */
  color?: string
  /** Elliptical (true) vs circular (false). */
  ellipse?: boolean
  className?: string
  style?: CSSProperties
}

export default function Bloom({
  size = 560,
  intensity = 0.13,
  color = 'var(--surface-accent)',
  ellipse = true,
  className,
  style,
}: BloomProps) {
  const pct = (m: number) => `color-mix(in srgb, ${color} ${Math.round(intensity * m * 100)}%, transparent)`
  const shape = ellipse ? 'ellipse at center' : 'circle at center'
  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        background: `radial-gradient(${shape}, ${pct(1)} 0%, ${pct(0.32)} 38%, transparent 72%)`,
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  )
}
