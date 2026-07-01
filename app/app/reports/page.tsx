'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import VerdictRing from '@/components/ui/VerdictRing'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { formatDate } from '@/lib/dashboard'
import { scoreColor } from '@/lib/verdict'
import {
  DASH, MONO, BODY, DISP, STEEL, steelLine,
  PageHeader, Panel, SectionLabel, StatusChip, GhostButton, Skeleton,
} from '@/components/dashboard/ui'

/**
 * Reports — the dedicated history of every scan this user has run, newest first. Its
 * own tab now (unfolded from the Overview). The query is deliberately BOUNDED: it selects
 * only the list columns (domain, health_score, created_at, share_token, status) and pages
 * in fixed-size ranges — it never pulls the heavy `analysis` blob (that's the report
 * artifact's job at /reports/[token], where each row links). Backed by the
 * (user_id, created_at) index the audit added, so the ordered range stays fast.
 */

const PAGE_SIZE = 20
const GRID = '40px minmax(0,1fr) 88px 104px 116px 18px'

interface ReportListRow {
  domain: string
  score: number
  date: string
  shareToken: string | null
  status: string | null
}

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportListRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async (from: number): Promise<ReportListRow[]> => {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    // List columns ONLY — no `analysis`. Ordered range = cheap, index-backed pagination.
    const { data, error: qErr } = await supabase
      .from('reports')
      .select('domain, health_score, created_at, share_token, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (qErr) throw qErr
    return (data ?? []).map((r) => ({
      domain: r.domain,
      score: r.health_score ?? 0,
      date: r.created_at,
      shareToken: r.share_token,
      status: r.status,
    }))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) { setLoading(false) } return }
        const [{ count }, first] = await Promise.all([
          supabase.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          fetchPage(0),
        ])
        if (cancelled) return
        setTotal(count ?? first.length)
        setRows(first)
        setDone(first.length < PAGE_SIZE)
      } catch {
        if (!cancelled) setError('Could not load your reports. Please refresh.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fetchPage])

  async function loadMore() {
    if (loadingMore || done) return
    setLoadingMore(true)
    try {
      const next = await fetchPage(rows.length)
      setRows((prev) => [...prev, ...next])
      if (next.length < PAGE_SIZE) setDone(true)
    } catch {
      setError('Could not load more. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  const hasRows = rows.length > 0

  return (
    <div style={{ padding: '40px 32px 72px', maxWidth: 1040, margin: '0 auto' }}>
      <PageHeader
        kicker="Reports"
        title="Your reports"
        sub="Every scan you've run, newest first. Open any report for the full coverage breakdown, ranked findings, and rewrites."
        right={total != null && total > 0 ? (
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', color: DASH.ink3, border: `1px solid ${DASH.line}`, padding: '7px 12px', whiteSpace: 'nowrap' }}>
            {total} {total === 1 ? 'report' : 'reports'}
          </span>
        ) : undefined}
      />

      {error ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: DASH.crit, margin: '0 0 16px' }}>{error}</p>
      ) : null}

      {loading ? (
        <LoadingList />
      ) : !hasRows ? (
        <EmptyState />
      ) : (
        <>
          <SectionLabel>History</SectionLabel>
          <Panel style={{ padding: 0 }}>
            {/* Column captions */}
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 16, alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${DASH.hair}`, background: 'rgba(255,255,255,0.015)' }}>
              <span />
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: DASH.ink3 }}>Site</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: DASH.ink3, textAlign: 'right' }}>Coverage</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: DASH.ink3 }}>Status</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: DASH.ink3, textAlign: 'right' }}>Date</span>
              <span />
            </div>
            {rows.map((r, i) => (
              <ReportRow key={`${r.domain}-${r.date}-${i}`} row={r} last={i === rows.length - 1} />
            ))}
          </Panel>

          {!done ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <GhostButton onClick={loadMore} disabled={loadingMore} tone="muted">
                {loadingMore ? 'Loading…' : 'Load more'}
              </GhostButton>
            </div>
          ) : (
            <p style={{ fontFamily: MONO, fontSize: 10.5, color: DASH.ink4, textAlign: 'center', margin: '20px 0 0', letterSpacing: '0.04em' }}>
              End of history · {rows.length} shown
            </p>
          )}
        </>
      )}
    </div>
  )
}

function ReportRow({ row, last }: { row: ReportListRow; last: boolean }) {
  const s = (row.status ?? '').toLowerCase()
  const complete = row.shareToken != null && s !== 'pending' && s !== 'failed' && s !== 'error' && s !== 'processing' && s !== 'queued'
  const cells = (
    <>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <VerdictRing score={row.score} size="sm" animate={false} />
      </div>
      <span style={{ fontFamily: BODY, fontSize: 14.5, color: DASH.ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.domain}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, color: complete ? scoreColor(row.score) : DASH.ink4, textAlign: 'right' }}>
        {complete ? `${row.score}%` : '—'}
      </span>
      <span><StatusChip status={row.status ?? 'complete'} /></span>
      <span style={{ fontFamily: MONO, fontSize: 11.5, color: DASH.ink3, textAlign: 'right' }}>{formatDate(row.date)}</span>
      <span aria-hidden className="dash-row-arrow" style={{ fontFamily: MONO, fontSize: 13, color: complete ? STEEL : 'transparent', textAlign: 'right' }}>→</span>
    </>
  )
  const base: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: GRID, gap: 16, alignItems: 'center',
    padding: '15px 20px', borderBottom: last ? 'none' : `1px solid ${DASH.hair}`,
    textDecoration: 'none',
  }
  if (!complete) return <div style={{ ...base, opacity: 0.62 }}>{cells}</div>
  return (
    <Link href={`/reports/${row.shareToken}`} className="dash-row" style={base}>
      {cells}
    </Link>
  )
}

function LoadingList() {
  return (
    <>
      <SectionLabel>History</SectionLabel>
      <Panel style={{ padding: 0 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 16, alignItems: 'center', padding: '15px 20px', borderBottom: i === 5 ? 'none' : `1px solid ${DASH.hair}` }}>
            <Skeleton w={40} h={40} style={{ borderRadius: '50%' }} />
            <Skeleton w="55%" h={13} />
            <Skeleton w={40} h={13} style={{ justifySelf: 'end' }} />
            <Skeleton w={72} h={18} />
            <Skeleton w={80} h={11} style={{ justifySelf: 'end' }} />
            <span />
          </div>
        ))}
      </Panel>
    </>
  )
}

function EmptyState() {
  return (
    <Panel style={{ padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Ghosted ring — an illustration of what a report headline looks like, not real data. */}
      <div style={{ position: 'relative', marginBottom: 22 }} aria-hidden>
        <div style={{ position: 'absolute', inset: -28, background: `radial-gradient(circle at center, ${steelLine(16)} 0%, transparent 68%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', opacity: 0.5 }}>
          <VerdictRing score={0} size={84} showScore={false} animate={false} track="rgba(255,255,255,0.07)" />
        </div>
      </div>
      <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: DASH.ink, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
        No reports yet
      </h2>
      <p style={{ fontFamily: BODY, fontSize: 14, color: DASH.ink2, margin: '0 0 24px', lineHeight: 1.6, maxWidth: 380 }}>
        Run your first scan and it lands here — with a coverage score, ranked findings, and rewrites ready to paste.
      </p>
      <GhostButton href="/app">Run your first scan →</GhostButton>
      <p style={{ fontFamily: MONO, fontSize: 10, color: DASH.ink4, margin: '16px 0 0', letterSpacing: '0.04em' }}>
        or use “New scan” in the top bar from anywhere
      </p>
    </Panel>
  )
}
