'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import WeavingScan from '@/components/WeavingScan'
import DashboardOverview from '@/components/dashboard/DashboardOverview'
import { rollUpSites, type ReportRow, type SiteSummary } from '@/lib/dashboard'

const MONO = "'IBM Plex Mono', monospace"

function domainOf(raw: string): string {
  const t = raw.trim()
  try { return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, '') } catch { return t }
}

type Phase = 'idle' | 'weaving' | 'complete' | 'error'

export default function DashboardHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  // Load this user's scan history. /app is edge-gated by middleware, so no auth
  // redirect here. `analysis` is a guaranteed column and carries the curated
  // findings + critical count the cockpit needs (the `money_leaks` column is
  // optional in some envs, so we derive from analysis instead).
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
        .select('domain, health_score, created_at, share_token, status, analysis')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .neq('status', 'failed')
        .neq('status', 'error')
        .order('created_at', { ascending: false })
      if (cancelled) return
      setSites(rollUpSites((data ?? []) as ReportRow[]))
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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', color: '#6E7587', margin: 0 }}>Loading…</p>
      </div>
    )
  }

  // ── Overview cockpit — verdict-first; states driven by the real scan count ────
  return (
    <DashboardOverview
      sites={sites}
      url={url}
      onUrlChange={setUrl}
      onScan={() => runScan(url)}
      scanning={false}
      error={error}
    />
  )
}
