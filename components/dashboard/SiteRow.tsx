'use client'

import ScoreRing from '@/components/ui/ScoreRing'

// Portfolio row (agency cockpit). Clicking the row drills into the shared SITE
// COCKPIT — the report is one level deeper (cockpit → /reports/[token]), so this
// row never links straight to the report. Steel-blue surface; green/amber/red are
// diagnostic-only (delta direction + needs-attention).
const C = {
  surface:      '#0A0E18',
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkMuted:     '#6E7587',
  success:      '#00C48C', // improved
  amber:        '#EFB23E', // needs attention
  worse:        '#E8635F', // regressed
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"

export interface SiteRowProps {
  domain: string
  score: number
  lastScannedLabel: string
  /** Score change vs the previous scan of this same domain. null when no prior scan. */
  delta: number | null
  /** Agency flag: score < 70, regressed, or a critical finding present. */
  needsAttention?: boolean
  /** Drill into this site's SITE COCKPIT (the shared component). */
  onOpen: () => void
}

export default function SiteRow({
  domain, score, lastScannedLabel, delta, needsAttention = false, onOpen,
}: SiteRowProps) {
  const deltaColor = delta == null || delta === 0 ? C.inkMuted : delta > 0 ? C.success : C.worse
  const deltaText = delta == null ? null : delta > 0 ? `+${delta}` : String(delta)

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, width: '100%', textAlign: 'left',
        padding: '16px 20px',
        borderBottom: `0.5px solid ${C.border}`,
        background: C.surface, border: 'none', borderRadius: 0, cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(111,155,198,0.05)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.surface }}
    >
      <ScoreRing score={score} size="sm" animate={false} showBadge={false} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: BODY, fontSize: 15, color: C.inkPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {domain}
          </span>
          {needsAttention && (
            <span
              title="Score < 70, dropped since last scan, or a critical finding is present"
              style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: C.amber, border: `0.5px solid ${C.amber}66`, padding: '2px 6px', flexShrink: 0,
              }}
            >
              Needs attention
            </span>
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkMuted, marginTop: 2 }}>
          Last scan: {lastScannedLabel}
        </div>
      </div>

      {deltaText !== null && (
        <div
          title="Change vs. previous scan"
          style={{ fontFamily: MONO, fontSize: 12, color: deltaColor, minWidth: 48, textAlign: 'right', flexShrink: 0 }}
        >
          {deltaText}
        </div>
      )}

      <span style={{ fontFamily: MONO, fontSize: 14, color: C.steel, flexShrink: 0 }} aria-hidden>→</span>
    </button>
  )
}
