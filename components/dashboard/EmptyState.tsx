'use client'

// First-run state: the EmptyState IS the scan input. No empty table.
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  worse:        '#E8635F',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

export interface EmptyStateProps {
  url: string
  onUrlChange: (value: string) => void
  onScan: () => void
  scanning?: boolean
  error?: string | null
}

export default function EmptyState({ url, onUrlChange, onScan, scanning = false, error }: EmptyStateProps) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px', textAlign: 'center',
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.steel, margin: '0 0 16px' }}>
        First scan
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: C.inkPrimary, margin: '0 0 10px', letterSpacing: '-0.5px' }}>
        Run your first scan
      </h1>
      <p style={{ fontFamily: BODY, fontSize: 15, lineHeight: 1.6, color: C.inkSecondary, maxWidth: 460, margin: '0 0 28px' }}>
        Enter any website URL. You&apos;ll get a 0&ndash;100 score, ranked findings, and a full report back.
      </p>

      <div style={{ display: 'flex', gap: 0, width: '100%', maxWidth: 520 }}>
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
            border: '1px solid rgba(111,155,198,0.3)',
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
            color: C.steel, background: 'rgba(111,155,198,0.1)',
            border: '1px solid rgba(111,155,198,0.5)',
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
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.worse, margin: '14px 0 0', maxWidth: 520 }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
