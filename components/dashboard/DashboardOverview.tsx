'use client'

import { useEffect, useRef, useState } from 'react'
import Bloom from '@/components/ui/Bloom'
import CornerBrackets from '@/components/ui/CornerBrackets'
import VerdictCard, { type VerdictCardFinding } from '@/components/dashboard/VerdictCard'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { DASHBOARD_PLAN_MONTHLY_CAPS } from '@/lib/constants'
import { scoreColor } from '@/lib/verdict'
import { resolveViewMode, type SiteSummary } from '@/lib/dashboard'

/**
 * Steel-surface Dashboard Overview — the verdict-first cockpit (presentation only).
 * Data comes from app/app/page.tsx (sites + scan handler); quota is read live here.
 * Reuses Bloom / CornerBrackets / VerdictCard / VerdictRing / lib/verdict — no
 * reinvented rings, blooms, brackets, or verdict logic. Calmer/warmer than /console.
 */

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const C = {
  inkPrimary: '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted: '#6E7587',
  surface: '#0A0E18',
  border: 'rgba(255,255,255,0.06)',
  crit: '#E8635F',  // --sev-critical
  amber: '#EFB23E', // --sev-high
  green: '#00C48C', // --json-string
} as const

const steelFill = (pct: number) => `color-mix(in srgb, var(--surface-accent) ${pct}%, transparent)`
const steelBorder = (pct: number) => `color-mix(in srgb, var(--surface-accent) ${pct}%, rgba(255,255,255,0.06))`

// Finding severity → verdict-aligned dot color (token hexes; not score-based).
function severityDot(sev: string): string {
  const s = sev.toLowerCase()
  if (s === 'critical') return C.crit
  if (s === 'passing') return C.green
  return C.amber
}

function toCardFindings(site: SiteSummary): VerdictCardFinding[] {
  return site.findings.slice(0, 3).map((f) => ({
    title: f.title,
    color: severityDot(f.severity),
    tag: f.estLift ?? f.severity,
  }))
}

function deltaSummary(site: SiteSummary): string {
  if (site.previousScore == null) return 'First scan'
  if (site.delta === 0) return 'No change since last scan'
  return site.delta! > 0 ? `Up ${site.delta} since last scan` : `Down ${Math.abs(site.delta!)} since last scan`
}

export interface DashboardOverviewProps {
  sites: SiteSummary[]
  url: string
  onUrlChange: (value: string) => void
  onScan: () => void
  scanning?: boolean
  error?: string | null
}

export default function DashboardOverview({ sites, url, onUrlChange, onScan, scanning = false, error }: DashboardOverviewProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasScans = sites.length > 0
  const focusScan = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    inputRef.current?.focus()
  }

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1040, margin: '0 auto' }}>
      {/* 1 — Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 21, color: C.inkPrimary, margin: 0, letterSpacing: '-0.3px' }}>Overview</h1>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--surface-accent)', border: `0.5px solid ${steelBorder(50)}`, padding: '3px 8px' }}>Dashboard</span>
        </div>
        <button type="button" onClick={focusScan} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--surface-accent)', background: steelFill(9), border: `0.5px solid ${steelBorder(50)}`, padding: '8px 16px', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>New scan →</button>
      </div>

      {/* 2 — Scan input panel */}
      <ScanPanel inputRef={inputRef} url={url} onUrlChange={onUrlChange} onScan={onScan} scanning={scanning} error={error} />

      {/* 3 — Conditional body */}
      {!hasScans ? <SampleSection /> : <RealCockpit sites={sites} />}
    </div>
  )
}

// ── 2. Scan input panel ─────────────────────────────────────────────────────────
function ScanPanel({ inputRef, url, onUrlChange, onScan, scanning, error }: {
  inputRef: React.RefObject<HTMLInputElement>
  url: string
  onUrlChange: (v: string) => void
  onScan: () => void
  scanning: boolean
  error?: string | null
}) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', marginBottom: 40, background: steelFill(4), border: `0.5px solid ${steelBorder(22)}`, padding: '28px 28px 22px' }}>
      <CornerBrackets corners={['tl', 'tr']} size={12} />
      <Bloom size={620} intensity={0.09} style={{ top: '34%' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: C.inkPrimary, margin: '0 0 8px', letterSpacing: '-0.2px' }}>Scan a site</h2>
        <p style={{ fontFamily: BODY, fontSize: 14, color: C.inkSecondary, lineHeight: 1.6, margin: '0 0 18px', maxWidth: 560 }}>
          Enter any website URL — you’ll get a 0–100 score, ranked findings, and a full report back.
        </p>

        <div style={{ display: 'flex', gap: 0, maxWidth: 580 }}>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !scanning) onScan() }}
            placeholder="your-site.com"
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 14, color: C.inkPrimary, background: 'rgba(255,255,255,0.03)', border: `1px solid ${steelFill(30)}`, borderRight: 'none', padding: '13px 16px', outline: 'none', borderRadius: 0 }}
          />
          <button type="button" onClick={onScan} disabled={scanning || !url.trim()} style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--surface-accent)', background: steelFill(10), border: `1px solid ${steelBorder(50)}`, padding: '13px 22px', borderRadius: 0, cursor: scanning || !url.trim() ? 'not-allowed' : 'pointer', opacity: scanning || !url.trim() ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {scanning ? 'Scanning…' : 'New scan →'}
          </button>
        </div>

        {error ? <p style={{ fontFamily: MONO, fontSize: 12, color: C.crit, margin: '12px 0 0' }}>{error}</p> : null}

        <ScansRemaining />

        <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkMuted, letterSpacing: '0.04em', margin: '16px 0 0', lineHeight: 1.6 }}>
          THE ENGINE · 307 checks · 27 categories · benchmarked against real sites in your vertical
        </p>
      </div>
    </section>
  )
}

// Real monthly quota — mirrors the shell QuotaBlock query shape (month-count of reports
// + plan from /api/profile + DASHBOARD_PLAN_MONTHLY_CAPS). Read-only here.
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
  const text = used == null ? 'checking your monthly quota…' : limit == null ? `${u} scans this month · unlimited` : `${remaining} of ${limit} scans left this month`

  return (
    <p style={{ fontFamily: MONO, fontSize: 11.5, color: exhausted ? C.crit : 'var(--surface-accent)', margin: '14px 0 0', letterSpacing: '0.02em' }}>
      {text}
      <span style={{ color: C.inkMuted, textTransform: 'capitalize' }}> · {plan}</span>
    </p>
  )
}

// ── 3a. No scans → "what you'll get" ghosted sample ──────────────────────────────
const SAMPLE_FINDINGS: VerdictCardFinding[] = [
  { title: 'No social proof above the fold', color: C.crit, tag: 'HIGH' },
  { title: 'Primary CTA unclear on mobile', color: C.crit, tag: 'HIGH' },
  { title: 'Pricing page lacks objection handling', color: C.amber, tag: 'MEDIUM' },
]

function SampleSection() {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.inkMuted, flexShrink: 0 }}>What you’ll get</span>
        <span aria-hidden style={{ flex: 1, height: 0, borderTop: `0.5px solid ${C.border}` }} />
      </div>
      <div style={{ maxWidth: 560 }}>
        <VerdictCard
          domain="acme-saas.com"
          score={37}
          verdictLabel="CRITICAL · 19TH PERCENTILE"
          summary="Scores below 81% of sites in its vertical. 14 conversion issues found, ranked by revenue impact."
          findings={SAMPLE_FINDINGS}
          footer="27 categories scored · 307 checks run · full report exportable →"
          sample
        />
        <p style={{ fontFamily: MONO, fontSize: 11, color: C.inkMuted, margin: '12px 0 0', letterSpacing: '0.02em' }}>
          ↑ a real report — run your first scan to generate yours
        </p>
      </div>
    </section>
  )
}

// ── 3b. Has scans → metric strip + verdict card(s) ───────────────────────────────
function RealCockpit({ sites }: { sites: SiteSummary[] }) {
  const sitesScanned = sites.length
  const reportsGenerated = sites.reduce((n, s) => n + s.history.length, 0)
  const valid = sites.map((s) => s.score).filter((n) => Number.isFinite(n))
  const avgScore = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null

  const viewMode = resolveViewMode(sites.length)
  const ordered = [...sites].sort((a, b) => new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime())

  return (
    <section>
      {/* Calm metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        <MetricTile label="Sites scanned" value={String(sitesScanned)} />
        <MetricTile label="Average score" value={avgScore == null ? '—' : String(avgScore)} valueColor={avgScore == null ? C.inkMuted : scoreColor(avgScore)} />
        <MetricTile label="Reports generated" value={String(reportsGenerated)} />
      </div>

      {viewMode === 'site' ? (
        <div style={{ maxWidth: 560 }}>
          <SiteVerdictCard site={ordered[0]} />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.inkMuted, flexShrink: 0 }}>Your sites</span>
            <span aria-hidden style={{ flex: 1, height: 0, borderTop: `0.5px solid ${C.border}` }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {ordered.map((s) => <SiteVerdictCard key={s.domain} site={s} />)}
          </div>
        </>
      )}
    </section>
  )
}

function SiteVerdictCard({ site }: { site: SiteSummary }) {
  return (
    <VerdictCard
      domain={site.domain}
      score={site.score}
      summary={deltaSummary(site)}
      findings={toCardFindings(site)}
      href={site.shareToken ? `/reports/${site.shareToken}` : undefined}
    />
  )
}

function MetricTile({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, padding: '18px 20px' }}>
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.inkMuted, margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, color: valueColor ?? C.inkPrimary, margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
    </div>
  )
}
