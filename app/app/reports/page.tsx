'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { scoreToVerdict, verdictColor, formatDate } from '@/lib/dashboard'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  success:      '#00C48C',
  worse:        '#E8635F',
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

interface RawRow {
  domain: string
  health_score: number | null
  created_at: string
  share_token: string | null
}

interface HistoryRow {
  domain: string
  score: number
  scannedAt: string
  shareToken: string | null
  /** Δ vs the chronologically previous scan of the same domain. null = first scan. */
  delta: number | null
}

type SortKey = 'date' | 'score'
type SortDir = 'asc' | 'desc'

// Attach per-row delta = score − previous scan of the SAME domain (chronological).
function withDeltas(rows: RawRow[]): HistoryRow[] {
  const ascByDomain = new Map<string, RawRow[]>()
  for (const r of rows) {
    const list = ascByDomain.get(r.domain) ?? []
    list.push(r)
    ascByDomain.set(r.domain, list)
  }
  const deltaFor = new Map<string, number | null>() // key: domain|created_at
  for (const [, list] of ascByDomain) {
    const asc = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    asc.forEach((r, i) => {
      const prev = i > 0 ? asc[i - 1] : null
      const d = prev ? (r.health_score ?? 0) - (prev.health_score ?? 0) : null
      deltaFor.set(`${r.domain}|${r.created_at}`, d)
    })
  }
  return rows.map(r => ({
    domain: r.domain,
    score: r.health_score ?? 0,
    scannedAt: r.created_at,
    shareToken: r.share_token,
    delta: deltaFor.get(`${r.domain}|${r.created_at}`) ?? null,
  }))
}

export default function ReportsIndex() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) { setRows([]); setLoading(false) }
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
      setRows(withDeltas((data ?? []) as RawRow[]))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let cmp: number
      if (sortKey === 'score') cmp = a.score - b.score
      else cmp = new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortArrow = (key: SortKey) => (key === sortKey ? (sortDir === 'asc' ? '↑' : '↓') : '')

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', color: C.inkMuted, margin: 0 }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 48px', maxWidth: 1040, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.steel, margin: '0 0 8px' }}>
        Reports
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        Scan history
      </h1>
      <p style={{ fontFamily: MONO, fontSize: 12, color: C.inkMuted, margin: '0 0 24px' }}>
        {rows.length} {rows.length === 1 ? 'report' : 'reports'} · every scan you&apos;ve run
      </p>

      {rows.length === 0 ? (
        <div style={{ border: `0.5px solid ${C.border}`, background: C.surface, padding: '28px 24px' }}>
          <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkSecondary, margin: 0 }}>
            No reports yet. Run a scan from the Overview tab and it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${C.border}` }}>
          {/* Header row */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: '1fr 150px 90px 130px 70px',
              gap: 12, padding: '12px 20px', background: 'rgba(255,255,255,0.02)',
              borderBottom: `0.5px solid ${C.border}`,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.inkMuted }}>Domain</span>
            <button type="button" onClick={() => toggleSort('date')} style={headerBtn}>
              Scanned {sortArrow('date')}
            </button>
            <button type="button" onClick={() => toggleSort('score')} style={{ ...headerBtn, textAlign: 'right' }}>
              Score {sortArrow('score')}
            </button>
            <span style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.inkMuted }}>Verdict</span>
            <span style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.inkMuted, textAlign: 'right' }}>Δ</span>
          </div>

          {/* Rows */}
          {sorted.map((r, i) => {
            const deltaColor = r.delta == null || r.delta === 0 ? C.inkMuted : r.delta > 0 ? C.success : C.worse
            const deltaText = r.delta == null ? '—' : r.delta > 0 ? `+${r.delta}` : String(r.delta)
            const RowInner = (
              <>
                <span style={{ fontFamily: BODY, fontSize: 14, color: C.inkPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.domain}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.inkSecondary }}>{formatDate(r.scannedAt)}</span>
                <span style={{ fontFamily: MONO, fontSize: 14, color: verdictColor(r.score), textAlign: 'right' }}>{r.score}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: verdictColor(r.score), textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {scoreToVerdict(r.score)}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: deltaColor, textAlign: 'right' }}>{deltaText}</span>
              </>
            )
            const baseStyle: React.CSSProperties = {
              display: 'grid', gridTemplateColumns: '1fr 150px 90px 130px 70px', gap: 12,
              alignItems: 'center', padding: '14px 20px',
              borderBottom: i === sorted.length - 1 ? 'none' : `0.5px solid ${C.border}`,
              background: C.surface, textDecoration: 'none',
            }
            return r.shareToken ? (
              <a
                key={`${r.domain}-${r.scannedAt}`}
                href={`/reports/${r.shareToken}`}
                style={{ ...baseStyle, cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(111,155,198,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.surface }}
              >
                {RowInner}
              </a>
            ) : (
              <div key={`${r.domain}-${r.scannedAt}`} style={{ ...baseStyle, opacity: 0.7 }}>
                {RowInner}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const headerBtn: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
  color: '#9398A8', background: 'transparent', border: 'none', padding: 0,
  cursor: 'pointer', textAlign: 'left',
}
