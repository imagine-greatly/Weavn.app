'use client'

import { useEffect, useState } from 'react'
import VerdictCard, { type VerdictCardFinding } from '@/components/dashboard/VerdictCard'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { DASHBOARD_PLAN_MONTHLY_CAPS } from '@/lib/constants'
import { scoreColor } from '@/lib/verdict'
import { resolveViewMode, type SiteSummary } from '@/lib/dashboard'

/**
 * Founder Dashboard Overview — near-monochrome, color-as-signal (presentation only).
 * Data comes from app/app/page.tsx (sites + scan handler); quota read live here.
 *
 * Frame: black + hairline white-alpha borders + a gray text ramp. Color is rationed:
 * it appears ONLY on the verdict ring (the hero), the band-colored verdict label, the
 * band-colored avg-score, and genuinely-urgent (high/critical) finding markers. Steel
 * (var(--surface-accent)) is reserved for affordances (New scan button, report link).
 * NO bloom, NO corner brackets, no glow, no decorative color washes.
 */

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const C = {
  inkPrimary: '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted: '#6E7587',
  inkDim: '#5A6070',
  surface: '#0A0E18',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  crit: '#E8635F',  // --sev-critical — reserved for real urgency
  amber: '#EFB23E', // --sev-high
} as const

const STEEL = 'var(--surface-accent)' // interaction affordance only
const steelBorder = 'color-mix(in srgb, var(--surface-accent) 45%, transparent)'

// Finding severity → signal. Only high/critical carry color; everything else is muted.
function findingSignal(sev: string): { color: string; muted: boolean } {
  const s = sev.toLowerCase()
  if (s === 'critical') return { color: C.crit, muted: false }
  if (s === 'high') return { color: C.amber, muted: false }
  return { color: C.inkDim, muted: true } // warning / medium / low / passing → muted gray
}

function toCardFindings(site: SiteSummary): VerdictCardFinding[] {
  return site.findings.slice(0, 3).map((f) => {
    const sig = findingSignal(f.severity)
    return { title: f.title, color: sig.color, muted: sig.muted, tag: f.estLift ?? f.severity }
  })
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
  const hasScans = sites.length > 0

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1040, margin: '0 auto' }}>
      {/* 1 — Header: title + muted DASHBOARD tag + thin inline scan input */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 21, color: C.inkPrimary, margin: 0, letterSpacing: '-0.3px' }}>Overview</h1>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.inkMuted, border: `0.5px solid ${C.border}`, padding: '3px 8px' }}>Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: 0, flex: '0 1 380px', minWidth: 240 }}>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !scanning) onScan() }}
            placeholder="your-site.com"
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 13, color: C.inkPrimary, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRight: 'none', padding: '9px 12px', outline: 'none', borderRadius: 0 }}
          />
          <button type="button" onClick={onScan} disabled={scanning || !url.trim()} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: STEEL, background: 'transparent', border: `1px solid ${steelBorder}`, padding: '9px 16px', borderRadius: 0, cursor: scanning || !url.trim() ? 'not-allowed' : 'pointer', opacity: scanning || !url.trim() ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {scanning ? 'Scanning…' : 'New scan →'}
          </button>
        </div>
      </div>

      {/* 2 — Supporting copy + quota + engine line — muted gray register, flat */}
      <div style={{ marginBottom: 36, paddingBottom: 20, borderBottom: `0.5px solid ${C.border}` }}>
        <p style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkSecondary, lineHeight: 1.6, margin: '0 0 12px', maxWidth: 600 }}>
          Enter any website URL — you’ll get a 0–100 score, ranked findings, and a full report back.
        </p>
        {error ? <p style={{ fontFamily: MONO, fontSize: 12, color: C.crit, margin: '0 0 10px' }}>{error}</p> : null}
        <ScansRemaining />
        <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkMuted, letterSpacing: '0.04em', margin: '10px 0 0', lineHeight: 1.6 }}>
          THE ENGINE · 307 checks · 27 categories · benchmarked against real sites in your vertical
        </p>
      </div>

      {/* 3 — Conditional body */}
      {!hasScans ? <SampleSection /> : <RealCockpit sites={sites} />}
    </div>
  )
}

// Real monthly quota — mirrors the shell QuotaBlock query shape (month-count of reports
// + plan from /api/profile + DASHBOARD_PLAN_MONTHLY_CAPS). Gray register; red only when
// the quota is exhausted (a genuine "wrong/blocked" signal).
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
    <p style={{ fontFamily: MONO, fontSize: 11.5, color: exhausted ? C.crit : C.inkSecondary, margin: 0, letterSpacing: '0.02em' }}>
      {text}
      <span style={{ color: C.inkDim, textTransform: 'capitalize' }}> · {plan}</span>
    </p>
  )
}

// ── 3a. No scans → "what you'll get" ghosted sample (monochrome) ──────────────────
const SAMPLE_FINDINGS: VerdictCardFinding[] = [
  { title: 'No social proof above the fold', color: C.crit, tag: 'HIGH' },
  { title: 'Primary CTA unclear on mobile', color: C.crit, tag: 'HIGH' },
  { title: 'Pricing page lacks objection handling', color: C.inkDim, tag: 'MEDIUM', muted: true },
]

function SampleSection() {
  return (
    <section>
      <SectionLabel>What you’ll get</SectionLabel>
      <div style={{ maxWidth: 560 }}>
        <VerdictCard
          domain="acme-saas.com"
          score={37}
          verdictLabel="NEEDS WORK · 19TH PERCENTILE"
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

// ── 3b. Has scans → verdict card(s) + metric strip below ──────────────────────────
function RealCockpit({ sites }: { sites: SiteSummary[] }) {
  const sitesScanned = sites.length
  const reportsGenerated = sites.reduce((n, s) => n + s.history.length, 0)
  const valid = sites.map((s) => s.score).filter((n) => Number.isFinite(n))
  const avgScore = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null

  const viewMode = resolveViewMode(sites.length)
  const ordered = [...sites].sort((a, b) => new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime())

  return (
    <section>
      {viewMode === 'site' ? (
        <div style={{ maxWidth: 560 }}>
          <SiteVerdictCard site={ordered[0]} />
        </div>
      ) : (
        <>
          <SectionLabel>Your sites</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {ordered.map((s) => <SiteVerdictCard key={s.domain} site={s} />)}
          </div>
        </>
      )}

      {/* Metric strip — flat, hairline-divided; numbers bright gray except band-colored score */}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: C.border, border: `0.5px solid ${C.border}` }}>
        <MetricTile label="Sites tracked" value={String(sitesScanned)} />
        <MetricTile label="Avg score" value={avgScore == null ? '—' : String(avgScore)} valueColor={avgScore == null ? C.inkMuted : scoreColor(avgScore)} />
        <MetricTile label="Reports" value={String(reportsGenerated)} />
      </div>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.inkMuted, flexShrink: 0 }}>{children}</span>
      <span aria-hidden style={{ flex: 1, height: 0, borderTop: `0.5px solid ${C.border}` }} />
    </div>
  )
}

function MetricTile({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: C.surface, padding: '18px 20px' }}>
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.inkMuted, margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, color: valueColor ?? C.inkPrimary, margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
    </div>
  )
}
