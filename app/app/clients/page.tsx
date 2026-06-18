'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import ScoreRing from '@/components/ui/ScoreRing'
import { rollUpSites, formatDate, type ReportRow, type SiteSummary } from '@/lib/dashboard'

// ── Monochrome dashboard tokens — color is rationed to signal only ──────────────
const C = {
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  inkDim:       '#5A6070',
  worse:        '#E8635F', // --sev-critical — used only for a downward (warning) trend
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const GRID = '1fr 64px 90px 130px 90px 120px'

/**
 * Clients — Agency/Enterprise only. The tier nav hides it for founders; a direct-URL
 * hit by a non-agency user redirects to /app (Step-5 gating). There is therefore NO
 * lock gate / padlock card here at all.
 */
export default function ClientsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [rescanning, setRescanning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/auth?surface=dashboard'); return }

        const [profileRes, { data }] = await Promise.all([
          fetch('/api/profile').then(r => r.json()).catch(() => ({})),
          supabase.from('reports')
            .select('domain, health_score, created_at, share_token, status, analysis')
            .eq('user_id', user.id)
            .neq('status', 'pending').neq('status', 'failed').neq('status', 'error')
            .order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        const p = typeof profileRes?.plan === 'string' ? profileRes.plan : 'free'
        setPlan(p)
        // Route gating: Clients is an Agency/Enterprise capability.
        if (p !== 'agency' && p !== 'enterprise') { router.replace('/app'); return }
        setSites(rollUpSites((data ?? []) as ReportRow[]))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  async function rescan(domain: string) {
    if (rescanning) return
    setRescanning(domain); setError(null)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://${domain}` }),
      })
      if (res.status === 401) { router.push('/auth?surface=dashboard'); return }
      const data = await res.json()
      if (data.shareToken) router.push(`/reports/${data.shareToken}`)
      else { setError(data.error ?? 'Scan failed. Please try again.'); setRescanning(null) }
    } catch {
      setError('Scan failed. Please try again.'); setRescanning(null)
    }
  }

  const isAgency = plan === 'agency' || plan === 'enterprise'

  // Loading, or a non-agency user mid-redirect — never render a broken/locked page.
  if (loading || !isAgency) {
    return (
      <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', color: C.inkMuted, margin: 0 }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 56px', maxWidth: 1040, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.inkMuted, margin: '0 0 8px' }}>
        Clients
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        All client sites in one view
      </h1>
      <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkSecondary, margin: '0 0 24px', maxWidth: 560, lineHeight: 1.6 }}>
        Every site you scan, rolled up by domain — latest score, scan count, last run, and trend. Open a report or run a fresh scan per client.
      </p>

      {error ? <p style={{ fontFamily: MONO, fontSize: 12, color: C.worse, margin: '0 0 16px' }}>{error}</p> : null}

      {sites.length === 0 ? (
        <div style={{ border: `0.5px solid ${C.border}`, background: C.surface, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: C.inkPrimary, margin: '0 0 8px' }}>No client sites yet</p>
          <p style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkSecondary, margin: '0 0 16px' }}>Run a scan from the Overview and the site shows up here, rolled up by domain.</p>
          <Link href="/app" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--surface-accent)', border: '0.5px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)', padding: '9px 16px', textDecoration: 'none' }}>
            Run a scan →
          </Link>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: `0.5px solid ${C.border}` }}>
            {['Client', 'Score', 'Scans', 'Last scan', 'Trend', ''].map((h, i) => (
              <span key={i} style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.inkMuted, textAlign: i === 1 ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          {sites.map((s, i) => {
            // Trend is colored ONLY when it's a genuine warning (a drop); up/flat stay muted.
            const trendColor = s.delta != null && s.delta < 0 ? C.worse : C.inkDim
            const trendText = s.delta == null ? '—' : s.delta > 0 ? `+${s.delta}` : String(s.delta)
            return (
              <div
                key={s.domain}
                style={{
                  display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center',
                  padding: '14px 20px', background: C.surface,
                  borderBottom: i === sites.length - 1 ? 'none' : `0.5px solid ${C.border}`,
                }}
              >
                <span style={{ fontFamily: BODY, fontSize: 14, color: C.inkPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.domain}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ScoreRing score={s.score} size="sm" animate={false} showBadge={false} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 13, color: C.inkSecondary }}>{s.history.length}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.inkSecondary }}>{formatDate(s.lastScannedAt)}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: trendColor }}>{trendText}</span>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {s.shareToken ? (
                    <a href={`/reports/${s.shareToken}`} style={{ fontFamily: MONO, fontSize: 11, color: 'var(--surface-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      Report →
                    </a>
                  ) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkMuted }}>—</span>}
                  <button
                    type="button"
                    onClick={() => rescan(s.domain)}
                    disabled={rescanning === s.domain}
                    style={{
                      fontFamily: MONO, fontSize: 11, color: C.inkSecondary, background: 'transparent',
                      border: `0.5px solid ${C.border}`, padding: '6px 10px', borderRadius: 0,
                      cursor: rescanning === s.domain ? 'default' : 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {rescanning === s.domain ? 'Weaving…' : 'Rescan'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
