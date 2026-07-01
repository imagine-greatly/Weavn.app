'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import VerdictCard, { type VerdictCardFinding } from '@/components/dashboard/VerdictCard'
import VerdictRing from '@/components/ui/VerdictRing'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { DASHBOARD_PLAN_MONTHLY_CAPS } from '@/lib/constants'
import { scoreColor } from '@/lib/verdict'
import { formatDate } from '@/lib/dashboard'
import {
  DASH, MONO, BODY, DISP, STEEL, steelLine,
  Panel, SectionLabel, StatTile,
} from '@/components/dashboard/ui'

/**
 * Overview — the founder cockpit: a prominent scan entry, a summary of coverage across
 * sites, and a preview of recent reports (the full history lives in the Reports tab).
 * Near-monochrome: color is rationed to the coverage ring/score and real urgency; steel
 * is affordance-only. Coverage framing throughout — no fabricated percentile/corpus claims.
 */

/** One scan (report) for the recent preview — every scan, not rolled up by domain. */
export interface ScanHistoryRow {
  domain: string
  score: number
  date: string
  shareToken: string | null
}

export interface DashboardOverviewProps {
  /** Most-recent completed scans, newest first (bounded — drives the preview + summary). */
  scans: ScanHistoryRow[]
  /** Exact all-time completed-report count (keeps the Reports tile honest beyond the window). */
  total?: number | null
  url: string
  onUrlChange: (value: string) => void
  onScan: () => void
  scanning?: boolean
  error?: string | null
}

const RECENT_LIMIT = 5

export default function DashboardOverview({ scans, total, url, onUrlChange, onScan, scanning = false, error }: DashboardOverviewProps) {
  const hasScans = scans.length > 0

  // Plan drives the single, contextual Agency nudge (no padlocks). Default to no nudge
  // while loading so nothing flashes; show only for confirmed founder (non-agency) plans.
  const [plan, setPlan] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (!cancelled && typeof d?.plan === 'string') setPlan(d.plan)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const isFounder = plan != null && plan !== 'agency' && plan !== 'enterprise'

  // Summary — derived from the bounded columns only (no analysis blob needed here).
  const uniqueSites = new Set(scans.map(s => s.domain)).size
  const validScores = scans.map(s => s.score).filter(n => Number.isFinite(n) && n > 0)
  const avgScore = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null

  return (
    <div style={{ padding: '40px 32px 72px', maxWidth: 1040, margin: '0 auto' }}>
      {/* 1 — Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: STEEL, margin: '0 0 12px' }}>Dashboard</p>
        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: DASH.ink, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Overview</h1>
        <p style={{ fontFamily: BODY, fontSize: 15, color: DASH.ink2, margin: '10px 0 0', maxWidth: 560, lineHeight: 1.6 }}>
          Scan any page for a coverage score, ranked findings, and a full report — in about a minute.
        </p>
      </div>

      {/* 2 — Scan entry (the hero action) */}
      <Panel accent style={{ padding: '22px 24px', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px', minWidth: 240 }}>
            <label style={{ display: 'block', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DASH.ink3, marginBottom: 10 }}>
              New scan
            </label>
            <div style={{ display: 'flex' }}>
              <input
                type="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !scanning) onScan() }}
                placeholder="your-site.com"
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
          </div>
          <div style={{ flex: '1 1 200px', minWidth: 180, borderLeft: `1px solid ${DASH.hair}`, paddingLeft: 20 }}>
            <ScansRemaining />
            <p style={{ fontFamily: MONO, fontSize: 10, color: DASH.ink4, letterSpacing: '0.04em', margin: '8px 0 0', lineHeight: 1.6 }}>
              311 checks · 27 categories · every scan
            </p>
          </div>
        </div>
      </Panel>

      {/* 3 — Body: empty illustration, or summary + recent */}
      {!hasScans ? (
        <EmptySection />
      ) : (
        <>
          {/* Summary metric strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: DASH.line, border: `1px solid ${DASH.line}`, boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05)', marginBottom: 40 }}>
            <StatTile label="Sites tracked" value={String(uniqueSites)} />
            <StatTile label="Avg coverage" value={avgScore == null ? '—' : `${avgScore}%`} valueColor={avgScore == null ? DASH.ink3 : scoreColor(avgScore)} />
            <StatTile label="Reports" value={String(total ?? scans.length)} />
          </div>

          {/* Recent — a preview; the full history is the Reports tab */}
          <SectionLabel right={
            <Link href="/app/reports" style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: STEEL, textDecoration: 'none' }}>
              View all →
            </Link>
          }>
            Recent
          </SectionLabel>
          <Panel style={{ padding: 0 }}>
            {scans.slice(0, RECENT_LIMIT).map((s, i, arr) => (
              <RecentRow key={`${s.domain}-${s.date}-${i}`} scan={s} last={i === arr.length - 1} />
            ))}
          </Panel>
          {(total ?? scans.length) > RECENT_LIMIT && (
            <p style={{ fontFamily: MONO, fontSize: 10.5, color: DASH.ink4, textAlign: 'center', margin: '16px 0 0', letterSpacing: '0.04em' }}>
              Showing {Math.min(RECENT_LIMIT, scans.length)} of {total ?? scans.length} · <Link href="/app/reports" style={{ color: STEEL, textDecoration: 'none' }}>see all reports →</Link>
            </p>
          )}
        </>
      )}

      {/* 4 — Contextual Agency nudge — founders only, one instance, no padlock */}
      {isFounder && (
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${DASH.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: BODY, fontSize: 13, color: DASH.ink3, lineHeight: 1.5 }}>
            Managing multiple client sites? Agency adds white-label reports and a client dashboard.
          </span>
          <a href="/app/billing" className="dash-btn" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: STEEL, border: `1px solid ${steelLine(45)}`, padding: '9px 15px', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.14s, border-color 0.14s' }}>
            View plans →
          </a>
        </div>
      )}
    </div>
  )
}

// Real monthly quota — mirrors the shell QuotaBlock query shape. Gray register; red
// only when the quota is exhausted (a genuine "blocked" signal).
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
  const text = used == null ? 'checking your monthly quota…' : limit == null ? `${u} scans this month · no cap` : `${remaining} of ${limit} scans left this month`

  return (
    <>
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DASH.ink3, margin: '0 0 8px' }}>Usage</p>
      <p style={{ fontFamily: MONO, fontSize: 12, color: exhausted ? DASH.crit : DASH.ink2, margin: 0, letterSpacing: '0.02em', lineHeight: 1.5 }}>
        {text}
        <span style={{ color: DASH.ink4, textTransform: 'capitalize' }}> · {plan}</span>
      </p>
    </>
  )
}

// ── No scans → clearly-labeled illustration of what a report looks like ───────────
const SAMPLE_FINDINGS: VerdictCardFinding[] = [
  { title: 'No social proof above the fold', color: DASH.crit, tag: 'HIGH' },
  { title: 'Primary CTA unclear on mobile', color: DASH.crit, tag: 'HIGH' },
  { title: 'Pricing page lacks objection handling', color: DASH.ink4, tag: 'MEDIUM', muted: true },
]

function EmptySection() {
  return (
    <section>
      <SectionLabel>What you’ll get</SectionLabel>
      <div style={{ maxWidth: 580 }}>
        <VerdictCard
          domain="acme-saas.com"
          score={37}
          verdictLabel="37% ±3 coverage · high upside"
          summary="Ranked findings across the conversion surface, each with evidence and a drop-in rewrite."
          findings={SAMPLE_FINDINGS}
          footer="27 categories scored · 311 checks run · full report exportable →"
          sample
        />
        <p style={{ fontFamily: MONO, fontSize: 11, color: DASH.ink3, margin: '14px 0 0', letterSpacing: '0.02em' }}>
          ↑ an illustration — run your first scan to generate your real report
        </p>
      </div>
    </section>
  )
}

// ── Recent preview row — compact; opens the in-depth report ───────────────────────
function RecentRow({ scan, last }: { scan: ScanHistoryRow; last: boolean }) {
  const inner = (
    <>
      <VerdictRing score={scan.score} size="sm" animate={false} />
      <span style={{ fontFamily: BODY, fontSize: 14.5, color: DASH.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.domain}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, color: scoreColor(scan.score), minWidth: 56, textAlign: 'right', flexShrink: 0 }}>{scan.score}%</span>
      <span style={{ fontFamily: MONO, fontSize: 11.5, color: DASH.ink3, minWidth: 96, textAlign: 'right', flexShrink: 0 }}>{formatDate(scan.date)}</span>
      <span aria-hidden className="dash-row-arrow" style={{ fontFamily: MONO, fontSize: 13, color: STEEL, flexShrink: 0 }}>→</span>
    </>
  )
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 16, width: '100%', textAlign: 'left',
    padding: '15px 20px', borderBottom: last ? 'none' : `1px solid ${DASH.hair}`, textDecoration: 'none',
  }
  if (!scan.shareToken) return <div style={{ ...rowStyle, opacity: 0.62 }}>{inner}</div>
  return (
    <Link href={`/reports/${scan.shareToken}`} className="dash-row" style={rowStyle}>
      {inner}
    </Link>
  )
}
