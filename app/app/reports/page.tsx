'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReportLayout from '@/components/ReportLayout'
import type { ReportPayload } from '@/lib/reportSchema'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import { supabaseReportToPayload } from '@/lib/supabaseReportToPayload'
import { formatDate } from '@/lib/dashboard'
import { scoreColor } from '@/lib/verdict'
import {
  DASH, MONO, BODY, DISP, STEEL, steelLine,
  Panel, GhostButton, Skeleton,
} from '@/components/dashboard/ui'

/**
 * Reports — the founder/dashboard-tier CONTENT surface. It renders the full in-depth
 * report (ReportLayout: score, 7 dimensions, findings, rewrites, blueprint) for the
 * user's most recent scan by default, no click required. A compact metadata-only
 * switcher strip above it swaps the report content IN PLACE (via ?scan=<id>) — an
 * in-tab state swap, never a route change.
 *
 * Deliberately distinct from the Agency "Clients" roster: the switcher is a tab strip,
 * not a card roster — no entity naming, no add/rename/remove/manage, no per-item
 * actions, no search/sort/pagination. Capped display only. The heavy `analysis` blob
 * is fetched one scan at a time (only for the report currently on screen).
 */

const SWITCH_LIMIT = 5

interface SwitchRow {
  id: string
  domain: string
  score: number
  date: string
}

interface SelectedReport {
  domain: string
  scanDate: string | null
  payload: ReportPayload
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ViewerSkeleton />}>
      <ReportsContent />
    </Suspense>
  )
}

function ReportsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scanParam = searchParams.get('scan')

  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<SwitchRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState<SelectedReport | null>(null)
  const [loadingReport, setLoadingReport] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The scan on screen: the deep-linked one if present, else the most recent.
  const selectedId = useMemo(() => scanParam ?? rows[0]?.id ?? null, [scanParam, rows])

  // ── Load the switcher list (metadata only — never the analysis blob) ──────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) { setLoadingList(false) } return }
        if (!cancelled) setUserId(user.id)
        const { data } = await supabase
          .from('reports')
          .select('id, domain, health_score, created_at, status')
          .eq('user_id', user.id)
          .neq('status', 'pending').neq('status', 'failed').neq('status', 'error')
          .order('created_at', { ascending: false })
          .limit(SWITCH_LIMIT)
        if (cancelled) return
        setRows((data ?? []).map((r) => ({
          id: r.id as string,
          domain: r.domain as string,
          score: (r.health_score as number | null) ?? 0,
          date: r.created_at as string,
        })))
      } catch {
        if (!cancelled) setError('Could not load your reports. Please refresh.')
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Load the SELECTED scan's report (one heavy blob at a time) ────────────────
  // selectedId is only null before the list resolves or when there are zero scans;
  // the zero-scans branch renders the empty state early, so the spinner never sticks.
  useEffect(() => {
    if (!selectedId || !userId) return
    let cancelled = false
    setLoadingReport(true)
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data } = await supabase
          .from('reports')
          .select('domain, health_score, created_at, analysis, status')
          .eq('id', selectedId)
          .eq('user_id', userId)
          .maybeSingle()
        if (cancelled) return
        if (!data || !data.analysis) { setSelected(null); return }
        const payload = supabaseReportToPayload(
          (data.health_score as number | null) ?? 0,
          (data.analysis ?? {}) as Record<string, unknown>,
        )
        setSelected({ domain: (data.domain as string) ?? '', scanDate: (data.created_at as string | null) ?? null, payload })
      } catch {
        if (!cancelled) setError('Could not load this report. Please try another.')
      } finally {
        if (!cancelled) setLoadingReport(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedId, userId])

  // In-tab swap: update the query param; the effect above reloads the content.
  function selectScan(id: string) {
    if (id === selectedId) return
    router.replace(`/app/reports?scan=${id}`, { scroll: false })
  }

  // ── Initial full-tab skeleton ─────────────────────────────────────────────────
  if (loadingList && rows.length === 0) return <ViewerSkeleton />

  // ── Empty — no scans yet (never render an empty switcher strip) ────────────────
  if (!loadingList && rows.length === 0) {
    return (
      <div style={{ padding: '40px 32px 72px', maxWidth: 1040, margin: '0 auto' }}>
        <Header />
        {error ? <p style={{ fontFamily: MONO, fontSize: 12, color: DASH.crit, margin: '0 0 16px' }}>{error}</p> : null}
        <EmptyState />
      </div>
    )
  }

  const showSwitcher = rows.length > 1

  return (
    <div style={{ padding: '32px 0 72px' }}>
      <div style={{ padding: '0 32px', maxWidth: 1040, margin: '0 auto' }}>
        <Header />
        {error ? <p style={{ fontFamily: MONO, fontSize: 12, color: DASH.crit, margin: '0 0 16px' }}>{error}</p> : null}
      </div>

      {/* Scan switcher — tab strip, metadata only. Not a roster: no borders/shadows,
          no entity actions, no search/sort/pagination. */}
      {showSwitcher && (
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 32px' }}>
          <div
            role="tablist"
            aria-label="Recent scans"
            style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: `1px solid ${DASH.line}`, marginTop: 4 }}
          >
            {rows.map((r) => (
              <SwitchTab key={r.id} row={r} active={r.id === selectedId} onSelect={() => selectScan(r.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Report content — swaps in place */}
      <div style={{ maxWidth: 1040, margin: '0 auto', marginTop: showSwitcher ? 0 : 8 }}>
        {loadingReport ? (
          <div style={{ padding: '0 32px' }}><ReportSkeleton /></div>
        ) : selected ? (
          <ReportLayout domain={selected.domain} payload={selected.payload} scanDate={selected.scanDate} fillContainer />
        ) : (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <p style={{ fontFamily: BODY, fontSize: 14, color: DASH.ink2, margin: 0 }}>
              This report isn’t ready yet. Pick another scan above.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Switcher tab — domain · date · score, nothing else ────────────────────────────
function SwitchTab({ row, active, onSelect }: { row: SwitchRow; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      style={{
        display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start',
        padding: '11px 16px', background: 'transparent', border: 'none',
        borderBottom: `2px solid ${active ? STEEL : 'transparent'}`,
        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'left',
        transition: 'border-color 0.14s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderBottomColor = steelLine(30) }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderBottomColor = 'transparent' }}
    >
      <span style={{ fontFamily: BODY, fontSize: 13.5, color: active ? DASH.ink : DASH.ink2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.domain}</span>
      <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.02em', color: DASH.ink3 }}>
        {formatDate(row.date)} · <span style={{ color: active ? scoreColor(row.score) : DASH.ink3 }}>{row.score}%</span>
      </span>
    </button>
  )
}

function Header() {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: STEEL, margin: '0 0 12px' }}>Reports</p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: DASH.ink, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Your report</h1>
      <p style={{ fontFamily: BODY, fontSize: 15, color: DASH.ink2, margin: '10px 0 0', maxWidth: 560, lineHeight: 1.6 }}>
        The full breakdown for your most recent scan — coverage, every finding, all seven dimensions, and rewrites. Switch scans above to read another.
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <Panel style={{ padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', marginBottom: 22 }} aria-hidden>
        <div style={{ position: 'absolute', inset: -28, background: `radial-gradient(circle at center, ${steelLine(16)} 0%, transparent 68%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', width: 84, height: 84, border: `1px solid ${DASH.line}`, opacity: 0.6 }} />
      </div>
      <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: DASH.ink, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
        No report to show yet
      </h2>
      <p style={{ fontFamily: BODY, fontSize: 14, color: DASH.ink2, margin: '0 0 24px', lineHeight: 1.6, maxWidth: 380 }}>
        Run your first scan and its full report opens right here — coverage score, ranked findings, and rewrites.
      </p>
      <GhostButton href="/app">Run your first scan →</GhostButton>
      <p style={{ fontFamily: MONO, fontSize: 10, color: DASH.ink4, margin: '16px 0 0', letterSpacing: '0.04em' }}>
        or use “New scan” in the top bar from anywhere
      </p>
    </Panel>
  )
}

// ── Loading states ────────────────────────────────────────────────────────────
function ViewerSkeleton() {
  return (
    <div style={{ padding: '32px 32px 72px', maxWidth: 1040, margin: '0 auto' }}>
      <Skeleton w={90} h={11} style={{ marginBottom: 14 }} />
      <Skeleton w={200} h={26} style={{ marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${DASH.line}`, paddingBottom: 12, marginBottom: 20 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton w={110} h={13} /><Skeleton w={80} h={10} />
          </div>
        ))}
      </div>
      <ReportSkeleton />
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>
      <Skeleton w={166} h={166} style={{ borderRadius: '50%', marginBottom: 20 }} />
      <Skeleton w={240} h={16} style={{ marginBottom: 10 }} />
      <Skeleton w={320} h={12} style={{ marginBottom: 40 }} />
      <div style={{ width: '100%', maxWidth: 720, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 1, background: DASH.line, border: `1px solid ${DASH.line}`, marginBottom: 32 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ background: DASH.panel, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w="70%" h={9} /><Skeleton w={32} h={20} />
          </div>
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ border: `1px solid ${DASH.hair}`, padding: 16 }}>
            <Skeleton w="45%" h={13} style={{ marginBottom: 10 }} /><Skeleton w="90%" h={11} />
          </div>
        ))}
      </div>
    </div>
  )
}
