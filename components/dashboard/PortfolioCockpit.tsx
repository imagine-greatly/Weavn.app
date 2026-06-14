'use client'

import SiteRow from '@/components/dashboard/SiteRow'
import { formatDate, type SiteSummary } from '@/lib/dashboard'

// Agency home: one row per site (score + delta + needs-attention), each drilling
// into the shared SITE COCKPIT. Scan-input stays at the top so a new domain can be
// added. Steel-blue surface; no cyan, no purple.
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkMuted:     '#6E7587',
  worse:        '#E8635F',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const DISP = "'Space Grotesk', sans-serif"

export interface PortfolioCockpitProps {
  sites: SiteSummary[]
  /** Drill into a site's cockpit by domain. */
  onOpenSite: (domain: string) => void
  // Scan-input (owned by the page so scan state stays in one place)
  url: string
  onUrlChange: (value: string) => void
  onScan: () => void
  error?: string | null
}

export default function PortfolioCockpit({ sites, onOpenSite, url, onUrlChange, onScan, error }: PortfolioCockpitProps) {
  const attention = sites.filter(s => s.needsAttention).length

  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 48px', maxWidth: 1040, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.steel, margin: '0 0 8px' }}>
        Portfolio
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        Your sites
      </h1>
      <p style={{ fontFamily: MONO, fontSize: 12, color: attention > 0 ? C.worse : C.inkMuted, margin: '0 0 24px' }}>
        {sites.length} {sites.length === 1 ? 'site' : 'sites'}
        {attention > 0 ? ` · ${attention} need${attention === 1 ? 's' : ''} attention` : ' · all healthy'}
      </p>

      {/* Add a new domain */}
      <div style={{ display: 'flex', gap: 0, maxWidth: 560, marginBottom: 8 }}>
        <input
          type="url"
          value={url}
          onChange={e => onUrlChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onScan() }}
          placeholder="Add a site — your-site.com"
          autoComplete="off"
          style={{
            flex: 1, minWidth: 0,
            fontFamily: MONO, fontSize: 14, color: C.inkPrimary,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(111,155,198,0.3)',
            borderRight: 'none',
            padding: '12px 16px', outline: 'none', borderRadius: 0,
          }}
        />
        <button
          type="button"
          onClick={onScan}
          disabled={!url.trim()}
          style={{
            fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: C.steel, background: 'rgba(111,155,198,0.1)',
            border: '1px solid rgba(111,155,198,0.5)',
            padding: '12px 22px', borderRadius: 0,
            cursor: url.trim() ? 'pointer' : 'not-allowed',
            opacity: url.trim() ? 1 : 0.5,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Run scan →
        </button>
      </div>
      {error ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.worse, margin: '0 0 8px' }}>{error}</p>
      ) : null}

      {/* Site rows — click to drill into the shared site cockpit */}
      <div style={{ marginTop: 28, borderTop: `0.5px solid ${C.border}`, borderLeft: `0.5px solid ${C.border}`, borderRight: `0.5px solid ${C.border}` }}>
        {sites.map(site => (
          <SiteRow
            key={site.domain}
            domain={site.domain}
            score={site.score}
            lastScannedLabel={formatDate(site.lastScannedAt)}
            delta={site.delta}
            needsAttention={site.needsAttention}
            onOpen={() => onOpenSite(site.domain)}
          />
        ))}
      </div>
    </div>
  )
}
