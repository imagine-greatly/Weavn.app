import { scoreColor } from '@/lib/verdict'

/**
 * ScoreChip — conversion-score chip for the request log. Zero radius, mono.
 * Colored per the canonical verdict bands (lib/verdict): red <50 / amber 50-69 /
 * green 70+. null → em-dash. Band color is fixed (never themed by surface accent).
 */

const MONO = "'IBM Plex Mono', monospace"
const DIM = '#5A6070'

export default function ScoreChip({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span style={{ fontFamily: MONO, fontSize: 11, color: DIM }}>—</span>
  }
  const color = scoreColor(score)
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 11,
        color,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
        padding: '1px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {score}
    </span>
  )
}
