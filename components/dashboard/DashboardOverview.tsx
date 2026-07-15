'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import VerdictCard, { type VerdictCardFinding } from '@/components/dashboard/VerdictCard'
import VerdictRing from '@/components/ui/VerdictRing'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { DASHBOARD_PLAN_MONTHLY_CAPS } from '@/lib/constants'
import { scoreColor, opportunityFraming } from '@/lib/verdict'
import { rollUpSites, formatDate, type ReportRow, type SiteSummary } from '@/lib/dashboard'
import {
  DASH, MONO, BODY, DISP, STEEL, steelLine,
  Panel, SectionLabel,
} from '@/components/dashboard/ui'

/**
 * Overview — a glanceable STATS PULSE-CHECK, not an organizing/management surface.
 * It shows the score trend for the most-recent scan (delta + sparkline) and a short
 * set of recent-scan preview cards. Cards deep-link into the Reports tab with that
 * specific scan loaded (/app/reports?scan=<id>) — the same loader the Reports switcher
 * uses. No manage/add/remove affordances, no entity/client concept, no history table.
 */

/** One scan (report) for the preview + trend. */
export interface ScanHistoryRow {
  id: string
  domain: string
  score: number
  date: string
  shareToken: string | null
}

export interface DashboardOverviewProps {
  /** Most-recent completed scans, newest first (bounded). */
  scans: ScanHistoryRow[]
  /** Exact all-time completed-report count. */
  total?: number | null
  // Scan-entry props — used only by the zero-scans empty state onboarding.
  url: string
  onUrlChange: (value: string) => void
  onScan: () => void
  scanning?: boolean
  error?: string | null
}

const RECENT_LIMIT = 5

export default function DashboardOverview({ scans, total, url, onUrlChange, onScan, scanning = false, error }: DashboardOverviewProps) {
  const hasScans = scans.length > 0

  const [plan, setPlan] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (!cancelled && typeof d?.plan === 'string') setPlan(d.plan)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const isFounder = plan != null && plan !== 'agency' && plan !== 'enterprise'
  const isAgency = plan === 'agency' || plan === 'enterprise'

  const uniqueSites = new Set(scans.map(s => s.domain)).size

  return (
    <div style={{ padding: '40px 32px 72px', maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: STEEL, margin: '0 0 12px' }}>Dashboard</p>
        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: DASH.ink, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Overview</h1>
        <p style={{ fontFamily: BODY, fontSize: 15, color: DASH.ink2, margin: '10px 0 0', maxWidth: 560, lineHeight: 1.6 }}>
          {isAgency
            ? (hasScans ? 'Your client sites at a glance — latest scores and where each one moved.' : 'Scan your first client site to start building your book of business.')
            : (hasScans ? 'Where your coverage stands, at a glance.' : 'Run your first scan to see your coverage score and ranked findings.')}
        </p>
      </div>

      {!hasScans ? (
        <EmptySection url={url} onUrlChange={onUrlChange} onScan={onScan} scanning={scanning} error={error} isAgency={isAgency} />
      ) : isAgency ? (
        <AgencyBook />
      ) : (
        <>
          <TrendPulse scans={scans} total={total} sites={uniqueSites} isAgency={isAgency} />

          <SectionLabel>Recent scans</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {scans.slice(0, RECENT_LIMIT).map((s) => (
              <RecentCard key={s.id} scan={s} />
            ))}
          </div>
        </>
      )}

      {/* Contextual Agency nudge — founders only, one instance, no padlock */}
      {isFounder && hasScans && (
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${DASH.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: BODY, fontSize: 13, color: DASH.ink3, lineHeight: 1.5 }}>
            Managing multiple client sites? Agency adds white-label reports and a client roster.
          </span>
          <a href="/app/billing" className="dash-btn" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: STEEL, border: `1px solid ${steelLine(45)}`, padding: '9px 15px', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.14s, border-color 0.14s' }}>
            View plans →
          </a>
        </div>
      )}
    </div>
  )
}

// ── Trend pulse — the most-recent scan's score + movement vs its previous scan ─────
function TrendPulse({ scans, total, sites, isAgency }: { scans: ScanHistoryRow[]; total?: number | null; sites: number; isAgency: boolean }) {
  const latest = scans[0]
  const sameDomain = scans.filter(s => s.domain === latest.domain) // newest first
  const prev = sameDomain[1] ?? null
  const delta = prev ? latest.score - prev.score : null
  const history = [...sameDomain].reverse().map(s => s.score) // oldest → newest
  const opp = opportunityFraming(latest.score)
  const reportCount = total ?? scans.length

  return (
    <Panel accent style={{ padding: '22px 24px', marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <VerdictRing score={latest.score} size="lg" animate={false} />
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DASH.ink3, margin: '0 0 6px' }}>
            Latest scan · {formatDate(latest.date)}
          </p>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: DASH.ink, margin: '0 0 8px', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{latest.domain}</p>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: scoreColor(latest.score), border: `0.5px solid ${scoreColor(latest.score)}66`, padding: '4px 10px' }}>
            {opp.label}
          </span>
        </div>

        {/* Trend — delta vs previous scan of this same site, + sparkline */}
        <div style={{ flexShrink: 0, borderLeft: `1px solid ${DASH.hair}`, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DASH.ink3, margin: 0 }}>Trend</p>
          <DeltaChip delta={delta} />
          {history.length >= 2 ? (
            <Sparkline scores={history} last={latest.score} />
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 10, color: DASH.ink4 }}>first scan of this site</span>
          )}
        </div>
      </div>

      <p style={{ fontFamily: MONO, fontSize: 10.5, color: DASH.ink4, letterSpacing: '0.04em', margin: '18px 0 0', paddingTop: 14, borderTop: `1px solid ${DASH.hair}` }}>
        {reportCount} {reportCount === 1 ? 'report' : 'reports'} · {sites} {isAgency ? (sites === 1 ? 'client site' : 'client sites') : (sites === 1 ? 'site' : 'sites')} · <ScansRemaining />
      </p>
    </Panel>
  )
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta == null) {
    return <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: DASH.ink3 }}>—</span>
  }
  if (delta === 0) {
    return <span style={{ fontFamily: MONO, fontSize: 12, color: DASH.ink3 }}>no change vs last scan</span>
  }
  const up = delta > 0
  const color = up ? DASH.good : DASH.crit
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
      <span aria-hidden style={{ fontFamily: MONO, fontSize: 13, color }}>{up ? '▲' : '▼'}</span>
      <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color }}>{up ? `+${delta}` : delta}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: DASH.ink4 }}>vs last scan</span>
    </span>
  )
}

function Sparkline({ scores, last }: { scores: number[]; last: number }) {
  const w = 108, h = 30, pad = 3
  const min = Math.min(...scores), max = Math.max(...scores)
  const range = max - min || 1
  const coords = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2)
    const y = h - pad - ((s - min) / range) * (h - pad * 2)
    return { x, y }
  })
  const pts = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const end = coords[coords.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={STEEL} strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={end.x} cy={end.y} r={2.5} fill={scoreColor(last)} />
    </svg>
  )
}

// ── Recent preview card — deep-links into the Reports tab with this scan loaded ────
function RecentCard({ scan }: { scan: ScanHistoryRow }) {
  const opp = opportunityFraming(scan.score)
  return (
    <Link
      href={`/app/reports?scan=${scan.id}`}
      className="dash-panel dash-panel--interactive"
      style={{
        display: 'block', background: DASH.panel, border: `1px solid ${DASH.line}`,
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.35)',
        padding: '16px 18px', textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: scoreColor(scan.score), border: `0.5px solid ${scoreColor(scan.score)}66`, padding: '3px 8px', whiteSpace: 'nowrap' }}>
          {opp.label}
        </span>
        <VerdictRing score={scan.score} size="sm" animate={false} />
      </div>
      <p style={{ fontFamily: BODY, fontSize: 14.5, color: DASH.ink, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.domain}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: DASH.ink3 }}>{formatDate(scan.date)}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: scoreColor(scan.score) }}>{scan.score}%</span>
      </div>
    </Link>
  )
}

// Real monthly quota — inline stat only (gray register; red when exhausted).
function ScansRemaining() {
  const [used, setUsed] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('free')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setUsed(0); return }
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        const [{ count }, profileRes] = await Promise.all([
          supabase.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
          fetch('/api/profile').then((r) => r.json()).catch(() => ({})),
        ])
        if (cancelled) return
        setUsed(count ?? 0)
        if (typeof profileRes?.plan === 'string') setPlan(profileRes.plan)
      } catch {
        if (!cancelled) setUsed(0)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const limit = DASHBOARD_PLAN_MONTHLY_CAPS[plan] ?? null
  const u = used ?? 0
  const remaining = limit == null ? null : Math.max(0, limit - u)
  const exhausted = remaining != null && remaining === 0
  if (used == null) return <span>checking quota…</span>
  return (
    <span style={{ color: exhausted ? DASH.crit : DASH.ink4 }}>
      {limit == null ? `${u} scans this month` : `${remaining} of ${limit} scans left this month`}
    </span>
  )
}

// ── Zero scans → onboarding: run the first scan + a labeled illustration ──────────
const SAMPLE_FINDINGS: VerdictCardFinding[] = [
  { title: 'No social proof above the fold', color: DASH.crit, tag: 'HIGH' },
  { title: 'Primary CTA unclear on mobile', color: DASH.crit, tag: 'HIGH' },
  { title: 'Pricing page lacks objection handling', color: DASH.ink4, tag: 'MEDIUM', muted: true },
]

function EmptySection({ url, onUrlChange, onScan, scanning, error, isAgency }: { url: string; onUrlChange: (v: string) => void; onScan: () => void; scanning?: boolean; error?: string | null; isAgency: boolean }) {
  return (
    <>
      <Panel accent style={{ padding: '22px 24px', marginBottom: 36 }}>
        <label style={{ display: 'block', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DASH.ink3, marginBottom: 10 }}>
          {isAgency ? 'Scan your first client site' : 'Run your first scan'}
        </label>
        <div style={{ display: 'flex', maxWidth: 520 }}>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !scanning) onScan() }}
            placeholder={isAgency ? 'client-site.com' : 'your-site.com'}
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 14, color: DASH.ink, background: DASH.well, border: `1px solid ${DASH.line}`, borderRight: 'none', padding: '12px 14px', outline: 'none', borderRadius: 0 }}
          />
          <button
            type="button"
            onClick={onScan}
            disabled={scanning || !url.trim()}
            className="dash-btn"
            style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: STEEL, background: steelLine(10), border: `1px solid ${steelLine(50)}`, padding: '12px 20px', borderRadius: 0, cursor: scanning || !url.trim() ? 'not-allowed' : 'pointer', opacity: scanning || !url.trim() ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.14s, border-color 0.14s' }}
          >
            {scanning ? 'Scanning…' : 'Scan →'}
          </button>
        </div>
        {error ? <p style={{ fontFamily: MONO, fontSize: 12, color: DASH.crit, margin: '10px 0 0' }}>{error}</p> : null}
      </Panel>

      <SectionLabel>What you’ll get</SectionLabel>
      <div style={{ maxWidth: 580 }}>
        <VerdictCard
          domain="acme-saas.com"
          score={37}
          verdictLabel="37% ±3 coverage · high upside"
          summary="Ranked findings across the conversion surface, each with evidence and a drop-in rewrite."
          findings={SAMPLE_FINDINGS}
          footer={isAgency ? '27 categories scored · 311 checks run · white-label report, client-ready' : '27 categories scored · 311 checks run · full report, ready to act on'}
          sample
        />
        <p style={{ fontFamily: MONO, fontSize: 11, color: DASH.ink3, margin: '14px 0 0', letterSpacing: '0.02em' }}>
          ↑ an illustration — {isAgency ? 'scan a client site to generate the report you deliver' : 'run your first scan to generate your real report'}
        </p>
      </div>
    </>
  )
}

// ── Agency book-of-business — triage over ALL client sites (isAgency only) ─────────
// No new endpoint: mirrors the Clients tab's browser query + the shared rollUpSites
// helper, then derives scans-left and a needs-attention surface (dropped / failed /
// stale). Founder Overview is untouched — this renders only for agency/enterprise.
interface AttnItem { domain: string; reasons: string[]; score: number | null; shareToken: string | null }

function AgencyBook() {
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [failedDomains, setFailedDomains] = useState<Set<string>>(new Set())
  const [used, setUsed] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('agency')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setLoading(false); return }
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
        const [rowsRes, countRes, profileRes] = await Promise.all([
          supabase.from('reports')
            .select('domain, health_score, created_at, share_token, status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase.from('reports').select('id', { count: 'exact', head: true })
            .eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
          fetch('/api/profile').then(r => r.json()).catch(() => ({})),
        ])
        if (cancelled) return
        const all = (rowsRes.data ?? []) as { domain: string; health_score: number | null; created_at: string; share_token: string | null; status: string | null }[]
        // Completed rows → shared rollup (analysis unused for triage → null keeps it light).
        const completed: ReportRow[] = all
          .filter(r => r.status !== 'pending' && r.status !== 'failed' && r.status !== 'error')
          .map(r => ({ domain: r.domain, health_score: r.health_score, created_at: r.created_at, share_token: r.share_token, status: r.status, analysis: null }))
        setSites(rollUpSites(completed))
        // Newest-first list → the first row seen per domain is its most recent attempt.
        const seen = new Set<string>(); const failed = new Set<string>()
        for (const r of all) {
          if (!r.domain || seen.has(r.domain)) continue
          seen.add(r.domain)
          if (r.status === 'failed' || r.status === 'error') failed.add(r.domain)
        }
        setFailedDomains(failed)
        setUsed(countRes.count ?? 0)
        if (typeof profileRes?.plan === 'string') setPlan(profileRes.plan)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <AgencyBookSkeleton />

  const limit = DASHBOARD_PLAN_MONTHLY_CAPS[plan] ?? null
  const remaining = limit == null ? null : Math.max(0, limit - (used ?? 0))
  const THIRTY_D = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()

  const attention: AttnItem[] = []
  for (const s of sites) {
    const reasons: string[] = []
    if (s.delta != null && s.delta < 0) reasons.push(`Dropped ${Math.abs(s.delta)} pts`)
    if (failedDomains.has(s.domain)) reasons.push('Last scan failed')
    if (now - new Date(s.lastScannedAt).getTime() > THIRTY_D) reasons.push('Not scanned in 30+ days')
    if (reasons.length) attention.push({ domain: s.domain, reasons, score: s.score, shareToken: s.shareToken })
  }
  // Domains whose only attempts failed never make it into rollUpSites — surface them too.
  const siteDomains = new Set(sites.map(s => s.domain))
  for (const d of failedDomains) {
    if (!siteDomains.has(d)) attention.push({ domain: d, reasons: ['Last scan failed'], score: null, shareToken: null })
  }

  const scansLeft = remaining == null ? `${used ?? 0} this month` : `${remaining} of ${limit}`

  return (
    <>
      {/* Book-of-business stat strip */}
      <Panel accent style={{ padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          <BookStat label="Clients" value={String(sites.length)} />
          <BookStat label="Needs attention" value={String(attention.length)} tone={attention.length > 0 ? DASH.crit : undefined} divider />
          <BookStat label="Scans left" value={scansLeft} divider />
        </div>
      </Panel>

      {attention.length > 0 && (
        <>
          <SectionLabel>Needs attention</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
            {attention.map(a => (
              <div key={a.domain} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: DASH.panel, border: `1px solid ${DASH.line}`, padding: '12px 16px' }}>
                <span style={{ fontFamily: BODY, fontSize: 14, color: DASH.ink, minWidth: 0, flex: '1 1 160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.domain}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {a.reasons.map(r => (
                    <span key={r} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em', color: reasonColor(r), border: `0.5px solid ${reasonColor(r)}55`, padding: '3px 8px', whiteSpace: 'nowrap' }}>{r}</span>
                  ))}
                </div>
                {a.shareToken
                  ? <a href={`/reports/${a.shareToken}`} style={{ fontFamily: MONO, fontSize: 11, color: STEEL, textDecoration: 'none', whiteSpace: 'nowrap' }}>Report →</a>
                  : <span style={{ fontFamily: MONO, fontSize: 11, color: DASH.ink4, whiteSpace: 'nowrap' }}>never scanned</span>}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <SectionLabel>Clients</SectionLabel>
        {sites.length > 0 && (
          <a href="/app/clients" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: STEEL, textDecoration: 'none' }}>
            View all {sites.length} →
          </a>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {sites.slice(0, 9).map(s => <ClientCard key={s.domain} site={s} />)}
      </div>
    </>
  )
}

function reasonColor(reason: string): string {
  if (reason.startsWith('Last scan failed')) return DASH.crit
  if (reason.startsWith('Dropped')) return '#EFB23E' // amber — warning band (--sev-high)
  return DASH.ink3 // stale — muted
}

function BookStat({ label, value, tone, divider }: { label: string; value: string; tone?: string; divider?: boolean }) {
  return (
    <div style={{ paddingLeft: divider ? 22 : 0, borderLeft: divider ? `1px solid ${DASH.hair}` : 'none' }}>
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DASH.ink3, margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: tone ?? DASH.ink, margin: 0, letterSpacing: '-0.3px' }}>{value}</p>
    </div>
  )
}

// Client roster card — score + movement (up/flat muted, a drop in red — matches the Clients tab).
function ClientCard({ site }: { site: SiteSummary }) {
  const down = site.delta != null && site.delta < 0
  const deltaColor = down ? DASH.crit : DASH.ink4
  const deltaText = site.delta == null ? '—' : site.delta > 0 ? `+${site.delta}` : String(site.delta)
  const href = site.shareToken ? `/reports/${site.shareToken}` : '/app/clients'
  return (
    <Link href={href} className="dash-panel dash-panel--interactive" style={{ display: 'block', background: DASH.panel, border: `1px solid ${DASH.line}`, boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.35)', padding: '16px 18px', textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: deltaColor }}>{deltaText}</span>
        <VerdictRing score={site.score} size="sm" animate={false} />
      </div>
      <p style={{ fontFamily: BODY, fontSize: 14.5, color: DASH.ink, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.domain}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: DASH.ink3 }}>{formatDate(site.lastScannedAt)}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: scoreColor(site.score) }}>{site.score}%</span>
      </div>
    </Link>
  )
}

function AgencyBookSkeleton() {
  return (
    <div>
      <div style={{ height: 84, background: DASH.panel, border: `1px solid ${DASH.line}`, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 120, background: DASH.panel, border: `1px solid ${DASH.line}` }} />
        ))}
      </div>
    </div>
  )
}
