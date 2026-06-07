import { scoreBand } from '@/lib/design-tokens'

export interface StatProps {
  value: string | number
  label: string
  verdict?: 'score' | 'good-count' | 'problem-count' | 'neutral'
}

const BAND_HEX: Record<string, string> = {
  'sev-critical': '#E8635F',
  'sev-high':     '#EFB23E',
  'json-string':  '#00C48C',
}

function Stat({ value, label, verdict = 'neutral' }: StatProps) {
  let color: string
  if (verdict === 'score') {
    color = BAND_HEX[scoreBand(Number(value))] ?? '#E6E9EE'
  } else if (verdict === 'good-count') {
    color = '#00C48C'  // json-string
  } else if (verdict === 'problem-count') {
    color = '#EFB23E'  // sev-high
  } else {
    color = '#E6E9EE'  // ink-primary
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 48,
          lineHeight: 1,
          color,
        }}
      >
        {value}
      </span>
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
    </div>
  )
}

export { Stat }
export default Stat
