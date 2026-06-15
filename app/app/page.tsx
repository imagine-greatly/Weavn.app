'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import WeavingScan from '@/components/WeavingScan'
import EmptyState from '@/components/dashboard/EmptyState'
import SiteCockpit from '@/components/dashboard/SiteCockpit'
import PortfolioCockpit from '@/components/dashboard/PortfolioCockpit'
import { rollUpSites, resolveViewMode, type ReportRow, type SiteSummary } from '@/lib/dashboard'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
const C = {
  steel:      '#6F9BC6',
  inkMuted:   '#6E7587',
} as const

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
  const [rescanningDomain, setRescanningDomain] = useState<string | null>(null)
  // Agency drill-down target. null = show the portfolio home (or the founder cockpit).
  const [drillDomain, setDrillDomain] = useState<string | null>(null)

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

  // Reuses the /api/scan call shape from /dashboard: POST { url }, 401 →
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
        if (rescanDomain) setRescanningDomain(null)
        else setPhase('error')
      }
    } catch {
      setError('Scan failed. Please try again.')
      if (rescanDomain) setRescanningDomain(null)
      else setPhase('error')
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

  // ── Drill-down: agency selected a site → shared SITE COCKPIT (with back) ──────
  const drilledSite = drillDomain ? sites.find(s => s.domain === drillDomain) ?? null : null
  if (drilledSite) {
    return (
      <SiteCockpit
        site={drilledSite}
        onScanAgain={() => runScan(drilledSite.domain, drilledSite.domain)}
        rescanning={rescanningDomain === drilledSite.domain}
        onBack={() => setDrillDomain(null)}
      />
    )
  }

  // ── Home: site count decides the zoom level (the one plan-tier seam) ──────────
  const viewMode = resolveViewMode(sites.length)

  if (viewMode === 'site') {
    const site = sites[0]
    return (
      <SiteCockpit
        site={site}
        onScanAgain={() => runScan(site.domain, site.domain)}
        rescanning={rescanningDomain === site.domain}
      />
    )
  }

  // Portfolio (agency): one row per site, drilling into the SAME site cockpit.
  return (
    <PortfolioCockpit
      sites={sites}
      onOpenSite={setDrillDomain}
      url={url}
      onUrlChange={setUrl}
      onScan={() => runScan(url)}
      error={error}
    />
  )
}
