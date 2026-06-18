'use client'

import VerdictRing from '@/components/ui/VerdictRing'
import { scoreBand, type VerdictBand } from '@/lib/verdict'

/**
 * ScoreRing — thin compatibility wrapper around the canonical VerdictRing. Keeps the
 * existing dashboard API (sm/md/lg sizes, CRITICAL badge, label, band/color overrides)
 * while delegating the actual ring to VerdictRing, which consumes lib/verdict for the
 * canonical 3-band color. No glow (locked design).
 */

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  animate?: boolean
  /** @deprecated use animate */
  animated?: boolean
  /** Legacy band override (token names) — mapped to the canonical verdict band. */
  band?: 'sev-critical' | 'json-string'
  /** Arbitrary arc/number color override (e.g. an agency brand color in the white-label
   *  preview). Wins over `band`/score-derived color and suppresses the CRITICAL badge. */
  color?: string
  /** Render the CRITICAL badge under the ring (default true). */
  showBadge?: boolean
}

const BADGE_FONT: Record<'sm' | 'md' | 'lg', number> = { sm: 6, md: 8, lg: 10 }

function ScoreRing({ score, size = 'md', label, animate = true, animated, band: bandProp, color: colorProp, showBadge = true }: ScoreRingProps) {
  const shouldAnimate = animated !== undefined ? animated : animate
  // Map the legacy token-name band override onto the canonical verdict band.
  const forcedBand: VerdictBand | undefined =
    bandProp === 'sev-critical' ? 'red' : bandProp === 'json-string' ? 'green' : undefined
  const band = forcedBand ?? scoreBand(score)
  // A brand-color override (white-label preview) wins and never reads as CRITICAL.
  const isCrit = !colorProp && band === 'red'

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, overflow: 'visible' }}>
      <VerdictRing score={score} size={size} band={forcedBand} color={colorProp} animate={shouldAnimate} />

      {showBadge && isCrit && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: BADGE_FONT[size],
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
