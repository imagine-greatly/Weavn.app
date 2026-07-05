'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import WeavingScan from '@/components/WeavingScan'
import DashboardOverview, { type ScanHistoryRow } from '@/components/dashboard/DashboardOverview'
import { useScan } from '@/components/dashboard/ScanContext'
import { DASH, Panel, Skeleton } from '@/components/dashboard/ui'

export default function DashboardHome() {
  // Scan lifecycle now lives in the persistent shell (ScanProvider), so it survives
  // navigating to another tab and back — this page just triggers and reflects it.
  const scan = useScan()
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<ScanHistoryRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [url, setUrl] = useState('')

  // Load this user's scan history. /app is edge-gated by middleware, so no auth redirect
  // here. The Overview only needs the summary + a recent preview, so this is a BOUNDED
  // query over the list columns — it never pulls the heavy `analysis` blob (the full
  // history + report artifact carry that on the Reports tab / /reports/[token]).
  // Re-runs when a scan completes (scan.completionTick) so a newly finished report shows
  // up here without a manual refresh, even if the user stayed on this tab.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) { setScans([]); setLoading(false) }
        return
      }
      // Preview + summary run over the most recent window (bounded), while an exact head
      // count keeps the "Reports" tile honest for long-time users beyond that window.
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from('reports')
          .select('id, domain, health_score, created_at, share_token')
          .eq('user_id', user.id)
          .neq('status', 'pending')
          .neq('status', 'failed')
          .neq('status', 'error')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'pending')
          .neq('status', 'failed')
          .neq('status', 'error'),
      ])
      if (cancelled) return
      const rows = (data ?? []) as { id: string; domain: string; health_score: number | null; created_at: string; share_token: string | null }[]
      setScans(rows.map(r => ({ id: r.id, domain: r.domain, score: r.health_score ?? 0, date: r.created_at, shareToken: r.share_token })))
      setTotal(count ?? rows.length)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [scan.completionTick])

  // ── Scanning state — the weaving experience (in-progress / complete / error) ──
  // Driven entirely by the shell-owned scan state.
  if (scan.phase !== 'idle') {
    return (
      <WeavingScan
        domain={scan.domain}
        status={scan.phase === 'complete' ? 'done' : scan.phase === 'error' ? 'error' : 'weaving'}
        error={scan.error}
        onReset={scan.reset}
      />
    )
  }

  // ── Loading — considered skeleton, not a bare "Loading…" ──────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px 32px 72px', maxWidth: 1040, margin: '0 auto' }}>
        <Skeleton w={90} h={11} style={{ marginBottom: 14 }} />
        <Skeleton w={180} h={26} style={{ marginBottom: 28 }} />
        <Panel style={{ padding: '22px 24px', marginBottom: 36 }}>
          <Skeleton w="100%" h={44} />
        </Panel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: DASH.line, border: `1px solid ${DASH.line}`, marginBottom: 40 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: DASH.panel, padding: '20px 22px' }}>
              <Skeleton w={80} h={10} style={{ marginBottom: 12 }} />
              <Skeleton w={48} h={28} />
            </div>
          ))}
        </div>
        <Panel style={{ padding: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 20px', borderBottom: i === 2 ? 'none' : `1px solid ${DASH.hair}` }}>
              <Skeleton w={40} h={40} style={{ borderRadius: '50%' }} />
              <Skeleton w="45%" h={13} />
            </div>
          ))}
        </Panel>
      </div>
    )
  }

  // ── Overview cockpit — summary + scan entry + recent preview ──────────────────
  return (
    <DashboardOverview
      scans={scans}
      total={total}
      url={url}
      onUrlChange={setUrl}
      onScan={() => scan.startScan(url)}
      scanning={false}
      error={null}
    />
  )
}
