'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import WeavnMark from '@/components/ui/WeavnMark'
import SiteRow from '@/components/dashboard/SiteRow'
import EmptyState from '@/components/dashboard/EmptyState'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  worse:        '#E8635F',
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const DISP = "'Space Grotesk', sans-serif"

// ── Data shapes (real reports table) ───────────────────────────────────────────
interface ReportRow {
  domain: string
  health_score: number | null
  created_at: string
  share_token: string | null
  status: string | null
}

interface Site {
  domain: string
  score: number
  shareToken: string | null
  lastScannedAt: string
  delta: number | null
}

type Phase = 'idle' | 'weaving' | 'complete'

// Roll up many scans into one row per domain (latest first), with delta vs the
// previous scan of that same domain.
function rollUp(rows: ReportRow[]): Site[] {
  const byDomain = new Map<string, ReportRow[]>()
  for (const r of rows) {
    if (!r.domain) continue
    const list = byDomain.get(r.domain) ?? []
    list.push(r)
    byDomain.set(r.domain, list)
  }
  const sites: Site[] = []
  for (const [domain, list] of byDomain) {
    // Input is ordered created_at desc, so list[0] is latest, list[1] the prior scan.
    const latest = list[0]
    const prev = list[1]
    const score = latest.health_score ?? 0
    const delta = prev ? score - (prev.health_score ?? 0) : null
    sites.push({ domain, score, shareToken: latest.share_token, lastScannedAt: latest.created_at, delta })
  }
  sites.sort((a, b) => new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime())
  return sites
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function DashboardHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<Site[]>([])
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [rescanningDomain, setRescanningDomain] = useState<string | null>(null)

  // Load this user's scan history. No auth redirect here — /app is edge-gated by
  // middleware. Matches the user-scoped read pattern used in /settings.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) { setSites([]); setLoading(false) }
        return
      }
      const { data } = await supabase
        .from('reports')
        .select('domain, health_score, created_at, share_token, status')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .neq('status', 'failed')
        .neq('status', 'error')
        .order('created_at', { ascending: false })
      if (cancelled) return
      setSites(rollUp((data ?? []) as ReportRow[]))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Reuses the exact /api/scan call shape from /dashboard: POST { url }, 401 →
  // /auth?surface=dashboard, success → /reports/[shareToken].
  async function runScan(rawUrl: string, rescanDomain?: string) {
    const trimmed = rawUrl.trim()
    if (!trimmed) return
    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    setError(null)
    if (rescanDomain) setRescanningDomain(rescanDomain)
    else setPhase('weaving')
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      if (res.status === 401) {
        router.push('/auth?surface=dashboard')
        return
      }
      const data = await res.json()
      if (data.shareToken) {
        setPhase('complete') // "Weave complete"
        setTimeout(() => router.push(`/reports/${data.shareToken}`), 700)
      } else {
        setError(data.error ?? 'Scan failed. Please try again.')
        setPhase('idle')
        setRescanningDomain(null)
      }
    } catch {
      setError('Scan failed. Please try again.')
      setPhase('idle')
      setRescanningDomain(null)
    }
  }

  // ── Scanning state ("Weaving through your site…" / "Weave complete") ─────────
  if (phase !== 'idle') {
    return (
      <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        <WeavnMark size={68} animated ringTints={{ outer: C.steel, middle: C.steel, inner: C.steel }} />
        <p style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.12em', color: C.steel, margin: 0 }}>
          {phase === 'weaving' ? 'Weaving through your site…' : 'Weave complete'}
        </p>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', color: C.inkMuted, margin: 0 }}>Loading…</p>
      </div>
    )
  }

  // ── Empty state (first run = the scan input itself) ──────────────────────────
  if (sites.length === 0) {
    return (
      <EmptyState
        url={url}
        onUrlChange={setUrl}
        onScan={() => runScan(url)}
        scanning={false}
        error={error}
      />
    )
  }

  // ── Populated: top scan CTA + one row per site ───────────────────────────────
  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1040, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.steel, margin: '0 0 8px' }}>
        Overview
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 24px', letterSpacing: '-0.5px' }}>
        Your sites
      </h1>

      {/* Primary CTA — scan a URL */}
      <div style={{ display: 'flex', gap: 0, maxWidth: 560, marginBottom: 8 }}>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') runScan(url) }}
          placeholder="Scan another site — your-site.com"
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
          onClick={() => runScan(url)}
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

      {/* Site list */}
      <div style={{ marginTop: 28 }}>
        <p style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.inkMuted, margin: '0 0 12px' }}>
          {sites.length} {sites.length === 1 ? 'site' : 'sites'}
        </p>
        <div style={{ borderTop: `0.5px solid ${C.border}`, borderLeft: `0.5px solid ${C.border}`, borderRight: `0.5px solid ${C.border}` }}>
          {sites.map(site => (
            <SiteRow
              key={site.domain}
              domain={site.domain}
              score={site.score}
              lastScannedLabel={formatDate(site.lastScannedAt)}
              delta={site.delta}
              rescanning={rescanningDomain === site.domain}
              onView={() => { if (site.shareToken) router.push(`/reports/${site.shareToken}`) }}
              onRescan={() => runScan(site.domain, site.domain)}
              onShare={() => { /* placeholder — share wiring lands in a later block */ }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
