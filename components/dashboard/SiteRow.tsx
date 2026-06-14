'use client'

import ScoreRing from '@/components/ui/ScoreRing'

// Steel-blue Dashboard surface. Green/red are diagnostic-only (delta direction).
const C = {
  surface:      '#0A0E18',
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkMuted:     '#6E7587',
  success:      '#00C48C', // improved (success-semantic only)
  worse:        '#E8635F', // regressed (diagnostic verdict)
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"

const btnPrimary: React.CSSProperties = {
  fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em',
  color: C.steel, background: 'transparent',
  border: '0.5px solid rgba(111,155,198,0.5)',
  padding: '7px 14px', borderRadius: 0, cursor: 'pointer',
  whiteSpace: 'nowrap',
}
const btnGhost: React.CSSProperties = {
  fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em',
  color: C.inkMuted, background: 'transparent',
  border: '0.5px solid rgba(255,255,255,0.1)',
  padding: '7px 14px', borderRadius: 0, cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export interface SiteRowProps {
  domain: string
  score: number
  lastScannedLabel: string
  /** Score change vs the previous scan of this same domain. null when no prior scan. */
  delta: number | null
  onView: () => void
  onRescan: () => void
  onShare: () => void
  rescanning?: boolean
}

export default function SiteRow({
  domain, score, lastScannedLabel, delta,
  onView, onRescan, onShare, rescanning = false,
}: SiteRowProps) {
  const deltaColor = delta == null || delta === 0 ? C.inkMuted : delta > 0 ? C.success : C.worse
  const deltaText = delta == null ? null : delta > 0 ? `+${delta}` : String(delta)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px',
        borderBottom: `0.5px solid ${C.border}`,
        background: C.surface,
      }}
    >
      <ScoreRing score={score} size="sm" animate={false} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: BODY, fontSize: 15, color: C.inkPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {domain}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button type="button" onClick={onView} style={btnPrimary}>View</button>
        <button
          type="button"
          onClick={onRescan}
          disabled={rescanning}
          style={{ ...btnGhost, opacity: rescanning ? 0.5 : 1, cursor: rescanning ? 'default' : 'pointer' }}
        >
          {rescanning ? 'Scanning…' : 'Re-scan'}
        </button>
        <button type="button" onClick={onShare} style={btnGhost}>Share</button>
      </div>
    </div>
  )
}
