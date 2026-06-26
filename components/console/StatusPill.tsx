/**
 * StatusPill — HTTP status-code chip for the request log. Zero radius, mono.
 * 2xx green (success-semantic) / 4xx amber / 5xx red. null → em-dash.
 * Severity colors are fixed (never themed by surface accent).
 */

const MONO = "'IBM Plex Mono', monospace"
const GREEN = '#00C48C'
const AMBER = '#EFB23E'
const RED = '#FF5C5C'
const DIM = '#5A6070'

export function statusColor(code: number | null | undefined): string {
  if (code == null) return DIM
  if (code >= 500) return RED
  if (code >= 400) return AMBER
  if (code >= 200 && code < 300) return GREEN
  return DIM
}

export default function StatusPill({ code }: { code: number | null | undefined }) {
  if (code == null) {
    return <span style={{ fontFamily: MONO, fontSize: 11, color: DIM }}>—</span>
  }
  const color = statusColor(code)
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 11,
        color,
        border: `1px solid color-mix(in srgb, ${color} 38%, transparent)`,
        padding: '1px 6px',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {code}
    </span>
  )
}
