'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import WeavingScan from '@/components/WeavingScan'
import DashboardOverview, { type ScanHistoryRow } from '@/components/dashboard/DashboardOverview'
import { DASH, Panel, Skeleton } from '@/components/dashboard/ui'

function domainOf(raw: string): string {
  const t = raw.trim()
  try { return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, '') } catch { return t }
}

type Phase = 'idle' | 'weaving' | 'complete' | 'error'

export default function DashboardHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<ScanHistoryRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  // Load this user's scan history. /app is edge-gated by middleware, so no auth redirect
  // here. The Overview only needs the summary + a recent preview, so this is a BOUNDED
  // query over the list columns — it never pulls the heavy `analysis` blob (the full
  // history + report artifact carry that on the Reports tab / /reports/[token]).
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
  }, [])

  // Reuses the /api/scan call shape: POST { url }, 401 → /auth?surface=dashboard,
  // success → /reports/[shareToken].
  async function runScan(rawUrl: string) {
    const trimmed = rawUrl.trim()
    if (!trimmed) return
    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    setError(null)
    setPhase('weaving')
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
        setPhase('error')
      }
    } catch {
      setError('Scan failed. Please try again.')
      setPhase('error')
    }
  }

  // ── Scanning state — the weaving experience (in-progress / complete / error) ──
  if (phase === 'weaving' || phase === 'complete' || phase === 'error') {
    return (
      <WeavingScan
        domain={domainOf(url)}
        status={phase === 'complete' ? 'done' : phase === 'error' ? 'error' : 'weaving'}
        error={error}
        onReset={() => { setPhase('idle'); setError(null) }}
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
      onScan={() => runScan(url)}
      scanning={false}
      error={error}
    />
  )
}
