'use client'

import SharedEmptyState from '@/components/ui/EmptyState'

// First-run state: the EmptyState IS the scan input. The shared, surface-aware
// branded frame (ghost mark, accent bloom, corner brackets) wraps the input.
const C = {
  inkPrimary: '#E6E9EE',
  worse:      '#E8635F',
} as const

const MONO = "'IBM Plex Mono', monospace"

export interface EmptyStateProps {
  url: string
  onUrlChange: (value: string) => void
  onScan: () => void
  scanning?: boolean
  error?: string | null
}

export default function EmptyState({ url, onUrlChange, onScan, scanning = false, error }: EmptyStateProps) {
  return (
    <SharedEmptyState
      headline="Run your first scan"
      sub="Enter any website URL — you’ll get a 0–100 score, ranked findings, and a full report back."
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 0, width: '100%' }}>
          <input
            type="url"
            value={url}
            onChange={e => onUrlChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !scanning) onScan() }}
            placeholder="your-site.com"
            autoComplete="off"
            style={{
              flex: 1, minWidth: 0,
              fontFamily: MONO, fontSize: 14, color: C.inkPrimary,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid color-mix(in srgb, var(--surface-accent) 30%, transparent)',
              borderRight: 'none',
              padding: '13px 16px', outline: 'none', borderRadius: 0,
            }}
          />
          <button
            type="button"
            onClick={onScan}
            disabled={scanning || !url.trim()}
            style={{
              fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--surface-accent)', background: 'color-mix(in srgb, var(--surface-accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
              padding: '13px 22px', borderRadius: 0,
              cursor: scanning || !url.trim() ? 'not-allowed' : 'pointer',
              opacity: scanning || !url.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Run scan →
          </button>
        </div>
        {error ? (
          <p style={{ fontFamily: MONO, fontSize: 12, color: C.worse, margin: '14px 0 0' }}>{error}</p>
        ) : null}
      </div>
    </SharedEmptyState>
  )
}
