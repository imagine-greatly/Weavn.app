'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import ScoreRing from '@/components/ui/ScoreRing'
import Label from '@/components/ui/Label'
import WeavnMark from '@/components/ui/WeavnMark'
import EmptyState from '@/components/ui/EmptyState'
import SurfaceToggle, { SURFACE_NAV, useSurfaceCrossing } from '@/components/SurfaceToggle'
import { FREE_API_TRIAL_SCANS } from '@/lib/constants'
import { API_PLANS, type ApiTier } from '@/lib/pricing'
import { scoreColor, scoreToVerdict, estimatePercentile, ordinal } from '@/lib/verdict'
import VerdictRing from '@/components/ui/VerdictRing'
import Bloom from '@/components/ui/Bloom'
import CornerBrackets from '@/components/ui/CornerBrackets'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'usage' | 'apikeys' | 'webhooks' | 'billing' | 'docs'

interface ScanRow {
  domain: string
  score: number
  findings: number
  time: string
}

interface WebhookLog {
  status: number
  event: string
  url: string
  time: string
  date: string
}

interface UsageRow {
  id: string
  url: string
  score: number | null
  status: string
  created_at: string
  response_time_ms: number | null
  cost_usd: number | null
}

interface WebhookRow {
  id: string
  url: string | null
  event: string | null
  created_at: string
  status: string | number | null
}

// Registered webhook endpoint (from /api/developer/webhooks). Distinct from the
// delivery log (webhook_deliveries) — this is the subscription, not its history.
interface WebhookEndpoint {
  id: string
  url: string
  active: boolean
  created_at: string
}

// Trial-gated plans (mirrors FREE_TRIAL_PLANS in lib/usageTracking): these keys are
// capped at the lifetime free-trial ceiling; every other plan fails open (no gate yet).
const TRIAL_PLANS = ['playground', 'payg', 'free']

// ── Data helpers ──────────────────────────────────────────────────────────────

function domainFromUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatAbsDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// scoreToSeverity removed — scan rows now use the canonical verdict band (lib/verdict).

function webhookStatusCode(raw: string | number | null): number {
  if (typeof raw === 'number') return raw
  if (raw === 'success' || raw === 'delivered' || raw === '200') return 200
  if (raw === 'failed' || raw === 'error' || raw === '500') return 500
  return 200
}

// ── Static constants ──────────────────────────────────────────────────────────

const TAB_TITLES: Record<TabId, string> = {
  overview: 'Overview',
  usage:    'Usage',
  apikeys:  'API Keys',
  webhooks: 'Webhooks',
  billing:  'Billing',
  docs:     'Documentation',
}

// Paid API tiers — every figure read from API_PLANS (lib/pricing.ts, the single source
// of truth). Checkout is NOT wired (see BillingTab seam). No invented numbers.
const PAID_TIER_IDS: ApiTier[] = ['dev', 'builder', 'scale', 'enterprise']
const PAID_TIERS = PAID_TIER_IDS.map((id) => {
  const p = API_PLANS[id]
  const base = p.baseMonthlyUsd == null ? 'Custom' : `$${p.baseMonthlyUsd}/mo`
  const incl = p.includedScans == null ? 'custom volume' : `${p.includedScans.toLocaleString()} scans incl`
  const over = id === 'enterprise' ? `from $${p.overageUsd.toFixed(2)}/scan` : `$${p.overageUsd.toFixed(2)}/scan over`
  return { id, name: p.name, line: `${base} · ${incl} · ${over}` }
})

// ── Icons (inline SVG, 16px, stroke-current) ──────────────────────────────────

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4.5" x2="14" y2="4.5" />
      <line x1="2" y1="8"   x2="14" y2="8"   />
      <line x1="2" y1="11.5" x2="14" y2="11.5" />
    </svg>
  )
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="5.5" cy="8" r="3" />
      <path d="M8.5 8H14M12 8v2" />
    </svg>
  )
}

function IconWebhook() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10.5 5.5l1-1a2 2 0 0 1 2.83 2.83l-1 1" />
      <path d="M5.5 10.5l-1 1a2 2 0 0 1-2.83-2.83l1-1" />
      <line x1="6.5" y1="9.5" x2="9.5" y2="6.5" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h6l3 3v9H4V2z" />
      <path d="M10 2v3h3" />
      <line x1="6" y1="9"  x2="10" y2="9"  />
      <line x1="6" y1="12" x2="10" y2="12" />
    </svg>
  )
}

function IconBilling() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="3.5" width="12" height="9" />
      <line x1="2" y1="6.5" x2="14" y2="6.5" />
      <line x1="4.5" y1="10" x2="7" y2="10" />
    </svg>
  )
}

// ── Shared micro-components ───────────────────────────────────────────────────

// Scan-row verdict badge — canonical 3-band color (lib/verdict) + the descriptive
// verdict label. Replaces the old 4-level severity palette.
function SeverityBadge({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <span
      className="font-mono text-xs px-2 py-0.5 flex-shrink-0"
      style={{ color, border: `0.5px solid ${color}66`, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {scoreToVerdict(score)}
    </span>
  )
}

function MethodBadge({ method }: { method: 'POST' | 'GET' }) {
  return (
    <span className={`font-mono text-xs px-2 py-0.5 ${method === 'POST' ? 'bg-purple-dim text-purple-DEFAULT' : 'bg-background-subtle text-score-low'}`}>
      {method}
    </span>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

interface OverviewTabProps {
  keyPrefix: string | null
  createdLabel: string
  lastUsedLabel: string
  rotating: boolean
  rotateError: string | null
  onRotate: () => void
  scansUsed: number
  isTrialPlan: boolean
  plan: string
  monthScans: number
  monthSpend: number
  onViewUsage: () => void
  onViewDocs: () => void
}

function OverviewTab({ keyPrefix, createdLabel, lastUsedLabel, rotating, rotateError, onRotate, scansUsed, isTrialPlan, plan, monthScans, monthSpend, onViewUsage, onViewDocs }: OverviewTabProps) {
  const [keyCopied, setKeyCopied] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)

  // Only the key PREFIX is recoverable (the full secret is shown once at creation/
  // rotation); the snippet + copy carry the prefix.
  const keyForCurl = keyPrefix ?? 'YOUR_API_KEY'
  const keyMasked = keyPrefix ? `${keyPrefix}••••••••••••••••` : 'YOUR_API_KEY'
  const curlText =
    `curl -X POST https://api.weavn.app/v1/scan \\\n` +
    `  -H "Authorization: Bearer ${keyForCurl}" \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -d '{"url": "https://yoursite.com"}'`

  async function copyKey() {
    if (!keyPrefix) return
    try { await navigator.clipboard.writeText(keyPrefix); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000) } catch { /* clipboard unavailable */ }
  }
  async function copyCurl() {
    try { await navigator.clipboard.writeText(curlText); setCurlCopied(true); setTimeout(() => setCurlCopied(false), 2000) } catch { /* clipboard unavailable */ }
  }

  // Access readout — trial remaining (Playground) vs included-this-period (paid tiers).
  // Read straight from API_PLANS + the live api_keys.plan. No invented numbers.
  const apiPlan = API_PLANS[plan as ApiTier]
  const overageUsd = apiPlan?.overageUsd ?? API_PLANS.dev.overageUsd
  const included = apiPlan?.includedScans ?? null
  const meter = isTrialPlan
    ? { label: 'Trial remaining', value: `${Math.max(0, FREE_API_TRIAL_SCANS - scansUsed)} / ${FREE_API_TRIAL_SCANS}`, pct: Math.min(100, Math.round((scansUsed / FREE_API_TRIAL_SCANS) * 100)) as number | null, sub: 'lifetime free trial' }
    : included != null
      ? { label: 'Included this period', value: `${monthScans} / ${included}`, pct: Math.min(100, Math.round((monthScans / included) * 100)) as number | null, sub: 'resets on the 1st' }
      : { label: 'Usage', value: `${monthScans}`, pct: null as number | null, sub: 'this month · custom volume' }
  const planName = apiPlan?.name ?? (plan.charAt(0).toUpperCase() + plan.slice(1))

  // Purple is rationed to affordances; gray everything else. No bloom/brackets/glow.
  const purpleBtn: React.CSSProperties = { color: 'var(--surface-accent)', border: '0.5px solid color-mix(in srgb, var(--surface-accent) 45%, transparent)' }
  const dim = '#5A6070'

  return (
    <div className="px-8 py-8" style={{ maxWidth: 1040 }}>
      {/* 1 — Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-ink-primary" style={{ fontSize: 21, letterSpacing: '-0.3px' }}>Overview</h1>
          <span className="font-mono uppercase text-ink-muted border border-background-border" style={{ fontSize: 9.5, letterSpacing: '0.18em', padding: '3px 8px' }}>Developer</span>
        </div>
        <button onClick={onViewDocs} className="font-mono uppercase cursor-pointer bg-transparent text-ink-muted hover:text-ink-secondary transition-colors" style={{ fontSize: 11, letterSpacing: '0.08em' }}>Docs →</button>
      </div>

      {/* 2 — YOUR API KEY (the hero) */}
      <div className="bg-background-raised border border-background-border p-6 mb-px">
        <div className="font-mono uppercase text-ink-muted mb-3" style={{ fontSize: 10, letterSpacing: '0.2em' }}>Your API key</div>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="font-mono text-ink-primary bg-background-subtle border border-background-border flex-1 min-w-0 truncate" style={{ fontSize: 15, padding: '12px 16px' }}>{keyPrefix ? keyMasked : '— no active key —'}</code>
          <button onClick={copyKey} disabled={!keyPrefix} className="font-mono uppercase cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed" style={{ ...purpleBtn, fontSize: 11, letterSpacing: '0.08em', padding: '12px 14px' }}>{keyCopied ? 'Copied' : 'Copy'}</button>
          <button onClick={onRotate} disabled={rotating || !keyPrefix} className="font-mono uppercase cursor-pointer bg-transparent border border-background-border text-ink-secondary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed" style={{ fontSize: 11, letterSpacing: '0.08em', padding: '12px 14px' }}>{rotating ? 'Rotating…' : 'Regenerate'}</button>
        </div>
        <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>Created {createdLabel} · Last used {lastUsedLabel} · all permissions</div>
        {rotateError ? <div className="font-mono text-severity-critical mt-2" style={{ fontSize: 11 }}>{rotateError}</div> : null}
      </div>

      {/* 3 — FIRE YOUR FIRST SCAN */}
      <div className="bg-background-raised border border-background-border p-6 mb-px">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--surface-accent)' }}>Fire your first scan</span>
            <span className="font-mono text-ink-muted" style={{ fontSize: 10.5 }}>~90s · returns structured JSON</span>
          </div>
          <button onClick={copyCurl} className="font-mono uppercase cursor-pointer bg-transparent" style={{ ...purpleBtn, fontSize: 11, letterSpacing: '0.08em', padding: '4px 8px' }}>{curlCopied ? 'Copied ✓' : 'Copy'}</button>
        </div>
        <pre className="bg-background-subtle border border-background-border p-4 font-mono leading-relaxed m-0 whitespace-pre-wrap" style={{ fontSize: 12 }}>
          <span className="text-purple-DEFAULT">curl</span>
          <span className="text-ink-muted">{' -X POST '}</span>
          <span style={{ color: '#6F9BC6' }}>https://api.weavn.app/v1/scan</span>
          <span className="text-ink-muted">{' \\\n  -H "Authorization: Bearer '}</span>
          <span style={{ color: '#6F9BC6' }}>{keyMasked}</span>
          <span className="text-ink-muted">{'" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"url": "'}</span>
          <span className="text-ink-secondary">https://yoursite.com</span>
          <span className="text-ink-muted">{'"}\''}</span>
        </pre>
        <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>Paste your full key — it&apos;s shown once at creation. Lost it? Regenerate above.</div>
      </div>

      {/* 4 — ACCESS READOUT */}
      <div className="grid grid-cols-3 gap-px bg-background-border mb-px">
        <div className="bg-background-raised p-6">
          <div className="font-mono uppercase text-ink-muted mb-2" style={{ fontSize: 10, letterSpacing: '0.18em' }}>{meter.label}</div>
          <div className="font-display font-bold" style={{ fontSize: 22, color: '#E6E9EE' }}>{meter.value}</div>
          {meter.pct != null ? (
            <div className="relative w-full mt-3" style={{ height: 2, background: 'rgba(255,255,255,0.07)' }}>
              <div className="absolute top-0 left-0 h-full" style={{ width: `${meter.pct}%`, background: '#6E7587' }} />
            </div>
          ) : null}
          <div className="font-mono mt-2" style={{ fontSize: 10.5, color: dim }}>{meter.sub}</div>
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-mono uppercase text-ink-muted mb-2" style={{ fontSize: 10, letterSpacing: '0.18em' }}>Plan</div>
          <div className="font-display font-bold" style={{ fontSize: 22, color: '#E6E9EE' }}>{planName}</div>
          <div className="font-mono mt-2" style={{ fontSize: 10.5, color: dim }}>then ${overageUsd.toFixed(2)}/scan</div>
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-mono uppercase text-ink-muted mb-2" style={{ fontSize: 10, letterSpacing: '0.18em' }}>Scans this month</div>
          <div className="font-display font-bold" style={{ fontSize: 22, color: '#E6E9EE' }}>{monthScans}</div>
          <div className="font-mono mt-2" style={{ fontSize: 10.5, color: dim }}>${monthSpend.toFixed(2)} COGS</div>
        </div>
      </div>

      {/* 5 — Usage link */}
      <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-background-border flex-wrap">
        <span className="font-body text-ink-muted" style={{ fontSize: 13 }}>View request logs, throughput, and latency</span>
        <button onClick={onViewUsage} className="font-mono uppercase cursor-pointer bg-transparent" style={{ ...purpleBtn, fontSize: 11, letterSpacing: '0.08em', padding: '8px 14px' }}>Usage →</button>
      </div>
    </div>
  )
}

// ── Usage Tab (instrumentation) ─────────────────────────────────────────────────
// Real data only, scoped to the user's api_key_id (RLS: "Users view own usage").
// Consumes the migration-028 columns: status_code, endpoint, error_code, page_count,
// cached. No fabricated fields; the inspector shows logged metadata only.

type UsageRange = '24h' | '7d' | '30d'
const RANGE_MS: Record<UsageRange, number> = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 }

interface UsageLogRow {
  id: string
  created_at: string
  endpoint: string | null
  status: string
  status_code: number | null
  error_code: string | null
  response_time_ms: number | null
  cost_usd: number | null
  page_count: number | null
  cached: boolean | null
  url: string
  score: number | null
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length))
  return sortedAsc[idx]
}

// Bucket rows over the range into N slots (oldest→newest) for a sparkline.
function bucketSeries(rows: UsageLogRow[], range: UsageRange, agg: 'count' | 'avgDur'): number[] {
  const N = 24
  const now = Date.now()
  const span = RANGE_MS[range]
  const start = now - span
  const counts = new Array(N).fill(0)
  const sums = new Array(N).fill(0)
  for (const r of rows) {
    const t = new Date(r.created_at).getTime()
    if (t < start || t > now) continue
    let i = Math.floor(((t - start) / span) * N)
    if (i < 0) i = 0
    if (i >= N) i = N - 1
    counts[i] += 1
    sums[i] += r.response_time_ms ?? 0
  }
  return agg === 'count' ? counts : counts.map((c, i) => (c > 0 ? Math.round(sums[i] / c) : 0))
}

// status_code → color: 200 quiet gray, 4xx amber, 5xx red.
function codeColor(code: number | null): string {
  if (code == null) return '#6E7587'
  if (code >= 500) return '#E8635F'
  if (code >= 400) return '#EFB23E'
  return '#9398A8'
}
// score → display color: passing (>=70) muted gray (green is rationed to the success
// bar), 50–69 amber, <50 red.
function scoreDisplayColor(score: number | null): string {
  if (score == null) return '#5A6070'
  return score >= 70 ? '#9398A8' : scoreColor(score)
}

function GraySpark({ series }: { series: number[] }) {
  const max = Math.max(1, ...series)
  const n = series.length
  const pts = series.map((v, i) => `${n > 1 ? (i / (n - 1)) * 100 : 0},${(18 - (v / max) * 16).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" height={20} viewBox="0 0 100 20" preserveAspectRatio="none" style={{ display: 'block', marginTop: 10 }} aria-hidden>
      <polyline points={pts} fill="none" stroke="#6E7587" strokeWidth={1} strokeOpacity={0.5} />
    </svg>
  )
}

function DetailRow({ k, v, vColor }: { k: string; v: string; vColor?: string }) {
  return (
    <div>
      <div className="font-mono uppercase text-ink-muted mb-1" style={{ fontSize: 9, letterSpacing: '0.14em' }}>{k}</div>
      <div className="font-mono truncate" style={{ fontSize: 13, color: vColor ?? '#E6E9EE' }}>{v}</div>
    </div>
  )
}

function UsageTab({ keyId }: { keyId: string | null }) {
  const [range, setRange] = useState<UsageRange>('7d')
  const [rows, setRows] = useState<UsageLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'errors'>('all')
  const [selected, setSelected] = useState<UsageLogRow | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      if (!keyId) { if (!cancelled) { setRows([]); setLoading(false) } return }
      try {
        const supabase = getSupabaseBrowserClient()
        const since = new Date(Date.now() - RANGE_MS[range]).toISOString()
        // Scoped to the user's api_key_id; RLS "Users view own usage" enforces ownership.
        const { data } = await supabase
          .from('api_usage')
          .select('id, created_at, endpoint, status, status_code, error_code, response_time_ms, cost_usd, page_count, cached, url, score')
          .eq('api_key_id', keyId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(2000)
        if (cancelled) return
        setRows((data ?? []) as UsageLogRow[])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [keyId, range])

  const total = rows.length
  const successCount = rows.filter(r => r.status === 'success').length
  const errorCount = total - successCount
  const successPct = total ? Math.round((successCount / total) * 100) : 0
  const durs = rows.map(r => r.response_time_ms ?? 0).filter(n => n > 0).sort((a, b) => a - b)
  const p50 = percentile(durs, 50)
  const p95 = percentile(durs, 95)
  const spend = rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0)
  const cachedPct = total ? Math.round((rows.filter(r => r.cached).length / total) * 100) : 0
  const avgPages = total ? rows.reduce((s, r) => s + (r.page_count ?? 1), 0) / total : 0
  const throughput = bucketSeries(rows, range, 'count')
  const durSeries = bucketSeries(rows, range, 'avgDur')

  const logRows = rows
    .filter(r => filter === 'all' ? true : filter === 'success' ? r.status === 'success' : r.status !== 'success')
    .slice(0, 50)

  const fmtDur = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`)
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return iso } }
  const cols = '120px 92px 56px 64px 70px 1fr 56px'
  const activeChip: React.CSSProperties = { background: 'color-mix(in srgb, var(--surface-accent) 14%, transparent)', color: 'var(--surface-accent)' }
  const idleChip: React.CSSProperties = { background: 'transparent', color: '#6E7587' }

  return (
    <div className="px-8 py-8" style={{ maxWidth: 1100 }}>
      {/* 1 — Header + range toggle */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-ink-primary" style={{ fontSize: 21, letterSpacing: '-0.3px' }}>Usage</h1>
          <span className="font-mono uppercase text-ink-muted border border-background-border" style={{ fontSize: 9.5, letterSpacing: '0.18em', padding: '3px 8px' }}>Developer</span>
        </div>
        <div className="inline-flex border border-background-border">
          {(['24h', '7d', '30d'] as UsageRange[]).map(r => (
            <button key={r} onClick={() => setRange(r)} className="font-mono uppercase cursor-pointer" style={{ fontSize: 10, letterSpacing: '0.08em', padding: '7px 14px', ...(range === r ? activeChip : idleChip) }}>{r}</button>
          ))}
        </div>
      </div>

      {/* 2 — Metric strip */}
      <div className="grid grid-cols-4 gap-px bg-background-border mb-px">
        <div className="bg-background-raised p-6">
          <div className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>Scans</div>
          <div className="font-display font-bold" style={{ fontSize: 26, color: '#E6E9EE' }}>{total}</div>
          <GraySpark series={throughput} />
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>Duration</div>
          <div className="font-display font-bold" style={{ fontSize: 26, color: '#E6E9EE' }}>{fmtDur(p50)} <span className="font-mono" style={{ fontSize: 12, color: '#6E7587' }}>p50</span></div>
          <div className="font-mono mt-1" style={{ fontSize: 11, color: '#6E7587' }}>p95 {fmtDur(p95)}</div>
          <GraySpark series={durSeries} />
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>Success</div>
          <div className="font-display font-bold" style={{ fontSize: 26, color: '#E6E9EE' }}>{successPct}%</div>
          <div className="flex w-full mt-3" style={{ height: 2 }}>
            <div style={{ width: `${successPct}%`, background: '#00C48C' }} />
            <div style={{ width: `${100 - successPct}%`, background: errorCount > 0 ? '#E8635F' : 'rgba(255,255,255,0.07)' }} />
          </div>
          <div className="font-mono mt-2" style={{ fontSize: 10.5, color: '#5A6070' }}>{successCount} ok · {errorCount} err</div>
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>Spend · COGS</div>
          <div className="font-display font-bold" style={{ fontSize: 26, color: '#E6E9EE' }}>${spend.toFixed(2)}</div>
          <div className="font-mono mt-2" style={{ fontSize: 10.5, color: '#5A6070' }}>cached {cachedPct}% · {avgPages.toFixed(1)} pg avg</div>
        </div>
      </div>

      {/* 3 — Request log */}
      <div className="flex items-center gap-2 mt-8 mb-3 flex-wrap">
        <span className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.2em' }}>Request log</span>
        <span className="font-mono" style={{ fontSize: 10, color: '#5A6070' }}>· last 50</span>
        <div className="inline-flex border border-background-border ml-2">
          {(['all', 'success', 'errors'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="font-mono uppercase cursor-pointer" style={{ fontSize: 9.5, letterSpacing: '0.08em', padding: '5px 10px', ...(filter === f ? activeChip : idleChip) }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-background-raised border border-background-border">
        <div className="grid items-center px-6 py-3 border-b border-background-border" style={{ gridTemplateColumns: cols }}>
          {['TIME', 'ENDPOINT', 'CODE', 'DUR', 'COGS', 'TARGET', 'SCORE'].map(h => (
            <div key={h} className="font-mono uppercase text-ink-muted" style={{ fontSize: 9.5, letterSpacing: '0.12em' }}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div className="px-6 py-8 font-mono text-ink-muted" style={{ fontSize: 12 }}>Loading…</div>
        ) : logRows.length === 0 ? (
          <div className="px-6 py-8 font-mono text-ink-muted" style={{ fontSize: 12 }}>{total === 0 ? 'No requests in this range yet.' : 'No matching requests.'}</div>
        ) : logRows.map(r => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="grid items-center px-6 py-3 border-b border-background-border last:border-0 w-full text-left cursor-pointer hover:bg-background-interactive transition-colors"
            style={{ gridTemplateColumns: cols, background: selected?.id === r.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}
          >
            <span className="font-mono text-ink-muted truncate" style={{ fontSize: 11 }}>{fmtTime(r.created_at)}</span>
            <span className="font-mono text-ink-secondary truncate" style={{ fontSize: 11 }}>{r.endpoint ?? 'scan'}</span>
            <span className="font-mono" style={{ fontSize: 11, color: codeColor(r.status_code) }}>{r.status_code ?? '—'}</span>
            <span className="font-mono text-ink-muted" style={{ fontSize: 11 }}>{r.response_time_ms != null ? fmtDur(r.response_time_ms) : '—'}</span>
            <span className="font-mono text-ink-muted" style={{ fontSize: 11 }}>${(r.cost_usd ?? 0).toFixed(2)}</span>
            <span className="font-mono truncate" style={{ fontSize: 11, color: r.url ? '#9398A8' : '#EFB23E' }}>{r.url || r.error_code || '—'}</span>
            <span className="font-mono" style={{ fontSize: 11, color: scoreDisplayColor(r.score) }}>{r.score ?? '—'}</span>
          </button>
        ))}
      </div>

      {/* 4 — Request detail (inspector) — logged metadata only */}
      {selected ? (
        <div className="bg-background-raised border border-background-border mt-px p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.2em' }}>Request detail</span>
            <button onClick={() => setSelected(null)} className="font-mono uppercase cursor-pointer bg-transparent text-ink-muted hover:text-ink-secondary" style={{ fontSize: 10, letterSpacing: '0.08em' }}>Close ✕</button>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3" style={{ maxWidth: 640 }}>
            <DetailRow k="endpoint" v={selected.endpoint ?? 'scan'} />
            <DetailRow k="status" v={`${selected.status_code ?? '—'} · ${selected.status}`} vColor={codeColor(selected.status_code)} />
            <DetailRow k="duration" v={selected.response_time_ms != null ? fmtDur(selected.response_time_ms) : '—'} />
            <DetailRow k="cogs" v={`$${(selected.cost_usd ?? 0).toFixed(2)} · ${selected.page_count ?? 1} pg${selected.cached ? ' · cached' : ''}`} />
            <DetailRow k="target" v={selected.url || '—'} />
            <DetailRow k={selected.error_code ? 'error' : 'score'} v={selected.error_code ? selected.error_code : (selected.score != null ? `${selected.score} · ${ordinal(estimatePercentile(selected.score))} pct` : '—')} vColor={selected.error_code ? codeColor(selected.status_code) : scoreDisplayColor(selected.score)} />
          </div>
          <div className="font-mono mt-5" style={{ fontSize: 10.5, color: '#5A6070' }}>Detail reflects logged request metadata. Full request/response payloads aren&apos;t stored.</div>
        </div>
      ) : null}
    </div>
  )
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

interface ApiKeysTabProps {
  keyPrefix: string | null
  createdLabel: string
  lastUsedLabel: string
  rotating: boolean
  rotateError: string | null
  onRotate: () => void
  onRevoke: () => Promise<void>
}

function ApiKeysTab({ keyPrefix, createdLabel, lastUsedLabel, rotating, rotateError, onRotate, onRevoke }: ApiKeysTabProps) {
  const [spendLimit, setSpendLimit] = useState('')
  const [spendNotice, setSpendNotice] = useState(false)
  const [revoking, setRevoking] = useState(false)

  async function handleRevoke() {
    setRevoking(true)
    await onRevoke()
    setRevoking(false)
  }

  return (
    <div className="px-8 py-8">

      <div className="bg-background-raised border border-background-border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">PRODUCTION KEY</div>
          <button
            onClick={handleRevoke}
            disabled={revoking || !keyPrefix}
            className="font-body text-xs text-severity-critical hover:underline cursor-pointer bg-transparent border-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {revoking ? 'Revoking...' : 'Revoke'}
          </button>
        </div>

        <div className="font-mono text-sm text-text-secondary bg-background-subtle border border-background-border px-4 py-3 w-full mt-3">
          {keyPrefix ? `${keyPrefix}••••••••••••••••••••••` : '— no active key —'}
        </div>

        <div className="flex gap-6 mt-4">
          <span className="font-mono text-xs text-text-tertiary">Created {createdLabel}</span>
          <span className="font-mono text-xs text-text-tertiary">Last used {lastUsedLabel}</span>
          <span className="font-mono text-xs text-text-tertiary">All permissions</span>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-background-border">
          <span className="font-mono text-xs text-text-tertiary flex-shrink-0">MONTHLY SPENDING LIMIT</span>
          <input
            type="text"
            placeholder="$50.00"
            value={spendLimit}
            onChange={e => { setSpendLimit(e.target.value); setSpendNotice(false) }}
            className="bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-3 py-2 w-32 outline-none"
          />
          {/* TODO(wiring): no persistence path for spend limits yet (no column/endpoint).
              Held in form-state only — we surface an honest notice instead of faking a save. */}
          <button
            onClick={() => setSpendNotice(true)}
            className="border border-background-border font-body text-xs text-text-secondary px-3 py-2 cursor-pointer bg-transparent hover:text-text-primary transition-colors duration-150"
          >
            Save
          </button>
        </div>
        {spendNotice ? (
          <div className="font-mono text-xs text-purple-muted mt-3">
            Spend limits aren&apos;t wired up yet — this lands in the billing wiring phase. Your input is kept here for now.
          </div>
        ) : null}
      </div>

      <button
        onClick={onRotate}
        disabled={rotating || !keyPrefix}
        className="bg-purple-DEFAULT text-text-inverse font-body font-semibold text-sm px-5 py-2.5 inline-block hover:opacity-90 transition-opacity duration-150 border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {rotating ? 'Rotating…' : 'Rotate key →'}
      </button>
      <p className="font-mono text-xs text-text-tertiary mt-3">
        Rotating deactivates the current key immediately and shows the new key once.
      </p>
      {rotateError ? (
        <div className="font-mono text-xs text-severity-critical mt-2">{rotateError}</div>
      ) : null}

    </div>
  )
}

// ── Webhooks Tab ──────────────────────────────────────────────────────────────

function WebhooksTab({ webhookLog }: { webhookLog: WebhookLog[] }) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [endpoints, setEndpoints]   = useState<WebhookEndpoint[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  // List registered endpoints (real GET /api/developer/webhooks — session-auth).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/developer/webhooks', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setEndpoints((data.webhooks ?? []) as WebhookEndpoint[])
      } catch { /* leave empty */ }
      if (!cancelled) setListLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function handleRegister() {
    const url = webhookUrl.trim()
    if (!url || registering) return
    setRegistering(true); setError(null)
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to register endpoint')
      setEndpoints(prev => [data as WebhookEndpoint, ...prev])
      setWebhookUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register endpoint')
    } finally {
      setRegistering(false)
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    setDeletingId(id); setError(null)
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to delete endpoint')
      }
      setEndpoints(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete endpoint')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-8 py-8">

      {/* Register form */}
      <div className="bg-background-raised border border-background-border p-6 mb-6">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">REGISTER ENDPOINT</div>
        <div className="flex gap-3">
          <input
            type="url"
            placeholder="https://your-app.com/webhook"
            value={webhookUrl}
            onChange={e => { setWebhookUrl(e.target.value); setError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void handleRegister() }}
            className="flex-1 bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-4 py-3 placeholder:text-text-tertiary outline-none"
          />
          <button
            onClick={handleRegister}
            disabled={registering || !webhookUrl.trim()}
            className="bg-purple-DEFAULT text-text-inverse font-body font-semibold text-sm px-5 py-2.5 cursor-pointer border-0 hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {registering ? 'Registering…' : 'Register'}
          </button>
        </div>
        <div className="font-mono text-xs text-text-tertiary mt-3">
          Registered endpoints receive all scan events (scan.completed, scan.failed).
        </div>
        {/* TODO(wiring): the webhooks endpoint never returns a signing secret, so we do
            NOT fake a "secret shown once" here. Secret provisioning is a later backend add. */}
        {error ? <div className="font-mono text-xs text-severity-critical mt-2">{error}</div> : null}
      </div>

      {/* Registered endpoints (real list + delete) */}
      <div className="bg-background-raised border border-background-border mb-6">
        <div className="px-6 py-4 border-b border-background-border">
          <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">REGISTERED ENDPOINTS</span>
        </div>
        {listLoading ? (
          <div className="px-6 py-8 font-mono text-sm text-text-tertiary">Loading…</div>
        ) : endpoints.length === 0 ? (
          <div className="px-6 py-8 font-mono text-sm text-text-tertiary">No endpoints registered.</div>
        ) : endpoints.map(ep => (
          <div key={ep.id} className="flex items-center gap-4 px-6 py-4 border-b border-background-border last:border-0">
            <span className={`font-mono text-xs px-2 py-0.5 flex-shrink-0 ${ep.active ? 'bg-score-high/10 text-score-high' : 'bg-background-subtle text-text-tertiary'}`}>
              {ep.active ? 'active' : 'inactive'}
            </span>
            <span className="font-mono text-xs text-text-secondary truncate flex-1">{ep.url}</span>
            <span className="font-mono text-xs text-text-tertiary flex-shrink-0">{relativeTime(ep.created_at)}</span>
            <button
              onClick={() => handleDelete(ep.id)}
              disabled={deletingId === ep.id}
              className="font-body text-xs text-severity-critical hover:underline cursor-pointer bg-transparent border-0 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deletingId === ep.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ))}
      </div>

      {/* Delivery log (history from webhook_deliveries) */}
      <div className="bg-background-raised border border-background-border">
        <div className="px-6 py-4 border-b border-background-border">
          <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">DELIVERY LOG</span>
        </div>
        {webhookLog.length === 0 && (
          <EmptyState
            dense
            headline="No deliveries yet"
            sub="Delivered scan events (scan.completed, scan.failed) will appear here."
          />
        )}
        {webhookLog.map((log, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-background-border last:border-0">
            <span
              className={`font-mono text-xs px-2 py-0.5 flex-shrink-0 ${
                log.status === 200
                  ? 'bg-score-high/10 text-score-high'
                  : 'bg-severity-critical/10 text-severity-critical'
              }`}
            >
              {log.status}
            </span>
            <span className="font-mono text-xs text-text-secondary flex-shrink-0">{log.event}</span>
            <span className="font-body text-xs text-text-tertiary truncate flex-1">{log.url}</span>
            <span className="font-mono text-xs text-text-tertiary flex-shrink-0">{log.time}</span>
            <span className="font-mono text-xs text-text-tertiary flex-shrink-0">{log.date}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

// ── Billing Tab ───────────────────────────────────────────────────────────────

interface BillingTabProps {
  plan: string
  isTrialPlan: boolean
  monthScans: number
  scansUsed: number
}

function BillingTab({ plan, isTrialPlan, monthScans, scansUsed }: BillingTabProps) {
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [upgradeNotice, setUpgradeNotice] = useState(false)

  // Opens the REAL Stripe billing portal via /api/settings/portal (the working settings
  // path — NOT the non-existent /api/billing/portal). Users without a Stripe customer get
  // an honest "No Stripe customer found" error rather than a fake portal.
  async function openPortal() {
    if (portalBusy) return
    setPortalBusy(true); setPortalError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Authentication required.')
      const res = await fetch('/api/settings/portal', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(typeof json.error === 'string' ? json.error : 'Portal request failed.')
      window.location.href = json.url as string
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : 'Portal request failed.')
      setPortalBusy(false)
    }
  }

  return (
    <div className="px-8 py-8">

      {/* Current plan + manage billing */}
      <div className="bg-background-raised border border-background-border p-6 mb-6">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">CURRENT API PLAN</div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-display font-extrabold text-3xl text-text-primary capitalize">{plan}</div>
            <div className="font-mono text-xs text-text-tertiary mt-1">
              {isTrialPlan
                ? `${scansUsed} / ${FREE_API_TRIAL_SCANS} free trial scans used (lifetime)`
                : 'Usage-based billing'}
              {` · ${monthScans} this month`}
            </div>
          </div>
          <button
            onClick={openPortal}
            disabled={portalBusy}
            className="border border-purple-DEFAULT text-purple-DEFAULT font-body text-sm px-5 py-2.5 cursor-pointer bg-transparent hover:bg-purple-dim transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {portalBusy ? 'Opening…' : 'Manage billing →'}
          </button>
        </div>
        <div className="font-mono text-xs text-text-tertiary mt-3">
          Opens the Stripe billing portal to manage payment methods and invoices.
        </div>
        {portalError ? <div className="font-mono text-xs text-severity-critical mt-2">{portalError}</div> : null}
      </div>

      {/* Paid tiers — upgrade affordance only; checkout is NOT wired */}
      <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">API PLANS</div>
      <div className="grid grid-cols-2 gap-px bg-background-border mb-3">
        {PAID_TIERS.map(t => {
          const isCurrent = plan === t.id
          return (
            <div key={t.id} className="bg-background-raised p-5">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-lg text-text-primary">{t.name}</span>
                {isCurrent && <span className="font-mono text-xs text-purple-DEFAULT">CURRENT</span>}
              </div>
              <div className="font-mono text-xs text-text-tertiary mt-1">{t.line}</div>
              <button
                onClick={() => setUpgradeNotice(true)}
                disabled={isCurrent}
                className="mt-4 w-full border border-background-border text-text-secondary font-body text-xs px-4 py-2 cursor-pointer bg-transparent hover:text-text-primary hover:border-text-tertiary transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCurrent ? 'Current plan' : 'Upgrade'}
              </button>
            </div>
          )
        })}
      </div>

      {/* TODO(wiring): paid-tier checkout is not wired — there are no Stripe products for
          these tiers and api_keys.plan is not set from a purchase. We surface an honest
          notice instead of faking a charge. */}
      {upgradeNotice ? (
        <div className="font-mono text-xs text-purple-muted mb-3">
          Paid-tier checkout isn&apos;t wired up yet — upgrading API plans lands in the billing wiring phase. No charge was made.
        </div>
      ) : null}

      <Link href="/developers" className="font-body text-sm text-purple-DEFAULT no-underline hover:opacity-80 transition-opacity duration-150">
        View API pricing →
      </Link>

    </div>
  )
}

// ── Docs Tab ──────────────────────────────────────────────────────────────────

function DocsTab() {
  const endpoints: Array<{
    method: 'POST' | 'GET'
    path: string
    desc: string
    curl: React.ReactNode
  }> = [
    {
      method: 'POST',
      path: '/api/v1/scan',
      desc: 'Submit any URL for a full conversion audit. Returns synchronously in 60–120 seconds, or via webhook in async mode.',
      curl: (
        <>
          <span className="text-purple-DEFAULT">curl</span>
          <span className="text-text-tertiary">{' -X POST https://api.weavn.app/v1/scan \\\n  -H "Authorization: Bearer '}</span>
          <span className="text-score-high">weavn_live_••••</span>
          <span className="text-text-tertiary">{'" \\\n  -d \'{"url": "'}</span>
          <span className="text-score-high">https://your-site.com</span>
          <span className="text-text-tertiary">{"\"}'"}  </span>
        </>
      ),
    },
    {
      method: 'POST',
      path: '/api/v1/scan/batch',
      desc: 'Submit up to 10 URLs in a single request. Results delivered to your registered webhook endpoint.',
      curl: (
        <>
          <span className="text-purple-DEFAULT">curl</span>
          <span className="text-text-tertiary">{' -X POST https://api.weavn.app/v1/scan/batch \\\n  -H "Authorization: Bearer '}</span>
          <span className="text-score-high">weavn_live_••••</span>
          <span className="text-text-tertiary">{'" \\\n  -d \'{"urls": ["'}</span>
          <span className="text-score-high">https://site-a.com</span>
          <span className="text-text-tertiary">{'", "'}</span>
          <span className="text-score-high">https://site-b.com</span>
          <span className="text-text-tertiary">{"\"]}'"}</span>
        </>
      ),
    },
    {
      method: 'GET',
      path: '/api/v1/scans/{id}',
      desc: 'Retrieve a completed scan by ID. Returns the full JSON schema including all findings and AI-rewritten copy.',
      curl: (
        <>
          <span className="text-purple-DEFAULT">curl</span>
          <span className="text-text-tertiary">{' https://api.weavn.app/v1/scans/'}</span>
          <span className="text-score-high">scan_01HXYZ7K2M9N3P4Q</span>
          <span className="text-text-tertiary">{' \\\n  -H "Authorization: Bearer '}</span>
          <span className="text-score-high">weavn_live_••••</span>
          <span className="text-text-tertiary">{'"'}</span>
        </>
      ),
    },
  ]

  return (
    <div className="px-8 py-8">
      <Label>API QUICK REFERENCE</Label>
      <h2 className="font-display font-extrabold text-3xl text-text-primary mt-3 mb-8">
        Everything you need.
      </h2>

      {endpoints.map(ep => (
        <div key={ep.path} className="bg-background-raised border border-background-border p-6 mb-px">
          <div className="flex items-center gap-3 mb-4">
            <MethodBadge method={ep.method} />
            <span className="font-mono text-base text-text-primary">{ep.path}</span>
          </div>
          <p className="font-body text-sm text-text-secondary mb-4">{ep.desc}</p>
          <div className="bg-background-subtle border border-background-border p-4">
            <pre className="font-mono text-xs text-text-tertiary leading-relaxed m-0 whitespace-pre-wrap">
              {ep.curl}
            </pre>
          </div>
        </div>
      ))}

      <Link
        href="/docs"
        className="font-body text-sm text-purple-DEFAULT mt-6 inline-block no-underline hover:opacity-80 transition-opacity duration-150"
      >
        Full API reference →
      </Link>
    </div>
  )
}

// ── Main portal ───────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <IconGrid />    },
  { id: 'usage',    label: 'Usage',    icon: <IconList />    },
  { id: 'apikeys',  label: 'API Keys', icon: <IconKey />     },
  { id: 'webhooks', label: 'Webhooks', icon: <IconWebhook /> },
  { id: 'billing',  label: 'Billing',  icon: <IconBilling /> },
  { id: 'docs',     label: 'Docs',     icon: <IconDoc />     },
]

export default function DeveloperPortal() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { rootRef, surface, navSurface, phase, crossing, flipTo } = useSurfaceCrossing('console')

  // Live data
  const [loading, setLoading]         = useState(true)
  const [scansUsed, setScansUsed]     = useState(0)
  const [keyPrefix, setKeyPrefix]     = useState<string | null>(null)
  const [keyCreatedAt, setKeyCreatedAt] = useState<string | null>(null)
  const [keyLastUsedAt, setKeyLastUsedAt] = useState<string | null>(null)
  const [plan, setPlan]               = useState('playground')
  const [monthScans, setMonthScans]   = useState(0)
  const [monthSpend, setMonthSpend]   = useState(0)
  const [rawUsage, setRawUsage]       = useState<UsageRow[]>([])
  const [rawWebhooks, setRawWebhooks] = useState<WebhookRow[]>([])
  const [keyId, setKeyId]             = useState<string | null>(null)

  // Key rotation (real, via DELETE /api/developer/generate-key — the new key is
  // returned once and revealed here; only its hash is ever stored).
  const [rotating, setRotating]       = useState(false)
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [revealedCopied, setRevealedCopied] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('id, scans_used, plan, key_prefix, created_at, last_used_at')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (!keyRow) {
      setKeyPrefix(null); setScansUsed(0); setPlan('playground')
      setKeyCreatedAt(null); setKeyLastUsedAt(null)
      setMonthScans(0); setMonthSpend(0)
      setRawUsage([]); setRawWebhooks([])
      setKeyId(null)
      setLoading(false)
      return
    }

    const kr = keyRow as { id: string; scans_used: number; plan: string; key_prefix: string; created_at: string | null; last_used_at: string | null }
    setKeyId(kr.id)
    setScansUsed(kr.scans_used ?? 0)
    setPlan(kr.plan ?? 'playground')
    setKeyPrefix(kr.key_prefix ?? null)
    setKeyCreatedAt(kr.created_at ?? null)
    setKeyLastUsedAt(kr.last_used_at ?? null)

    const { data: usage } = await supabase
      .from('api_usage')
      .select('id, url, score, status, created_at, response_time_ms, cost_usd')
      .eq('api_key_id', kr.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setRawUsage((usage ?? []) as UsageRow[])

    // Month-to-date usage (current calendar month, UTC) — distinct from the lifetime
    // api_keys.scans_used. count is exact; spend sums up to 1000 rows for the month.
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { data: monthRows, count: monthCount } = await supabase
      .from('api_usage')
      .select('cost_usd', { count: 'exact' })
      .eq('api_key_id', kr.id)
      .eq('status', 'success')   // billable scans only — exclude error/reject instrumentation rows
      .gte('created_at', monthStart)
      .limit(1000)
    setMonthScans(monthCount ?? (monthRows?.length ?? 0))
    setMonthSpend((monthRows ?? []).reduce((s, r) => s + ((r as { cost_usd: number | null }).cost_usd ?? 0), 0))

    try {
      const { data: wh, error: whErr } = await supabase
        .from('webhook_deliveries')
        .select('id, url, event, created_at, status')
        .eq('api_key_id', kr.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!whErr) setRawWebhooks((wh ?? []) as WebhookRow[])
    } catch {
      // webhook_deliveries table may not exist yet
    }

    setLoading(false)
  }, [router])

  useEffect(() => { void loadData() }, [loadData])

  async function handleRotate() {
    if (rotating) return
    const ok = typeof window !== 'undefined'
      ? window.confirm('Rotate your API key? The current key stops working immediately and the new key is shown only once.')
      : false
    if (!ok) return
    setRotating(true)
    setRotateError(null)
    try {
      const res = await fetch('/api/developer/generate-key', { method: 'DELETE', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.key) throw new Error(typeof data?.error === 'string' ? data.error : 'Rotate failed. Please try again.')
      setRevealedKey(String(data.key))
      setRevealedCopied(false)
      await loadData() // new key starts fresh — refresh prefix + usage
    } catch (e) {
      setRotateError(e instanceof Error ? e.message : 'Rotate failed. Please try again.')
    } finally {
      setRotating(false)
    }
  }

  // Derived values. "This month" comes from the windowed monthScans/monthSpend, never
  // lifetime scans_used. The sidebar quota is DISPLAY-ONLY: the only enforced cap is the
  // lifetime free-trial ceiling on trial-plan keys (checkScanAllowed); paid tiers fail
  // open. TODO(wiring): paid-tier quota enforcement + month-windowed plan limits.
  const avgScore: number | null = (() => {
    const scored = rawUsage.filter(r => r.score !== null)
    if (!scored.length) return null
    return Math.round(scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length)
  })()
  const isTrialPlan = TRIAL_PLANS.includes(plan)
  const trialPct = isTrialPlan ? Math.min(100, Math.round((scansUsed / FREE_API_TRIAL_SCANS) * 100)) : 0
  const createdLabel = formatAbsDate(keyCreatedAt)
  const lastUsedLabel = keyLastUsedAt ? relativeTime(keyLastUsedAt) : 'never'

  const scanRows: ScanRow[] = rawUsage.map(r => ({
    domain:   domainFromUrl(r.url ?? ''),
    score:    r.score ?? 0,
    findings: 0,
    time:     relativeTime(r.created_at),
  }))
  // Most-recent scan duration (API response time) for the engine readout, if present.
  const lastScanMs: number | null = rawUsage[0]?.response_time_ms ?? null

  const webhookLogMapped: WebhookLog[] = rawWebhooks.map(r => ({
    status: webhookStatusCode(r.status),
    event:  r.event ?? 'scan.completed',
    url:    r.url ?? '',
    time:   '—',
    date:   relativeTime(r.created_at),
  }))

  async function handleRevoke() {
    await fetch('/api/developer/revoke-key', { method: 'POST', credentials: 'include' })
    await loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-base">
        <span className="font-mono text-sm" style={{ color: '#9D8CFF' }}>Loading...</span>
      </div>
    )
  }

  return (
    <div ref={rootRef} data-surface="console" className="flex h-screen overflow-hidden bg-background-base">

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 bg-background-raised border-r border-background-border flex flex-col h-full">

        {/* Identity — WeavnMark + "Weavn" wordmark, constant across both surfaces */}
        <div className="px-6 py-4 border-b border-background-border">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <WeavnMark size={26} />
            <span className="font-display font-extrabold text-sm text-text-primary">Weavn</span>
          </Link>
        </div>

        {/* Surface-specific nav (middle) — reconfigures on crossing */}
        <nav
          key={navSurface}
          className={`surface-nav flex-1 py-4${phase === 'leaving' ? ' is-leaving' : phase === 'entering' ? ' is-entering' : ''}`}
        >
          {navSurface === 'console'
            ? NAV_ITEMS.map((item, i) => {
                const active = activeTab === item.id
                const style: React.CSSProperties = { '--nav-i': i } as React.CSSProperties
                if (active) {
                  style.background = 'color-mix(in srgb, var(--surface-accent) 8%, transparent)'
                  style.borderLeftColor = 'var(--surface-accent)'
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={style}
                    className={`surface-nav-item w-full flex items-center gap-3 px-6 py-2.5 font-body text-sm cursor-pointer transition-colors duration-150 bg-transparent text-left border-0 border-l-2 ${
                      active
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background-interactive border-transparent'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )
              })
            : SURFACE_NAV.app.map((item, i) => (
                <div
                  key={item.label}
                  aria-hidden
                  style={{ '--nav-i': i } as React.CSSProperties}
                  className="surface-nav-item w-full flex items-center gap-3 px-6 py-2.5 font-body text-sm text-left border-0 border-l-2 border-transparent text-text-secondary"
                >
                  {item.label}
                </div>
              ))}
        </nav>

        {/* Surface toggle (bottom) */}
        <div className="border-t border-background-border flex-shrink-0">
          <SurfaceToggle current={surface} crossing={crossing} onFlip={flipTo} />
        </div>

        {/* Usage block — month-to-date activity + display-only trial quota */}
        <div className="px-6 py-5 border-t border-background-border">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">THIS MONTH</div>
          <div className="font-display font-extrabold text-2xl text-text-primary">{monthScans}</div>
          <div className="font-mono text-xs text-text-tertiary">{monthScans === 1 ? 'scan' : 'scans'} · ${monthSpend.toFixed(2)} spent</div>

          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-5 mb-2">Quota</div>
          {isTrialPlan ? (
            <>
              <div className="font-mono text-xs text-text-tertiary">{scansUsed} / {FREE_API_TRIAL_SCANS} free trial · lifetime</div>
              <div className="relative w-full h-px bg-background-border mt-3">
                <div className="absolute top-0 left-0 h-full" style={{ width: `${trialPct}%`, background: 'var(--surface-accent)' }} />
              </div>
            </>
          ) : (
            <div className="font-mono text-xs text-text-tertiary">{plan} · usage-based</div>
          )}
        </div>

        {/* Account (very bottom) — shared across both surfaces */}
        <div className="px-6 py-4 border-t border-background-border">
          <Link
            href="/app/account"
            className="flex items-center justify-between font-mono text-xs text-text-tertiary hover:text-text-primary transition-colors duration-150 no-underline"
          >
            <span>Account</span>
            <span style={{ color: 'var(--surface-accent)' }}>→</span>
          </Link>
        </div>

      </aside>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="surface-scrim-target surface-content-in flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 bg-background-base border-b border-background-border px-8 py-4 flex justify-between items-center z-10">
          <span className="font-display font-extrabold text-lg text-text-primary">
            {TAB_TITLES[activeTab]}
          </span>
          <Link
            href="/playground"
            className="bg-purple-DEFAULT text-text-inverse font-body font-semibold text-xs px-4 py-2 no-underline hover:opacity-90 transition-opacity duration-150"
          >
            New scan →
          </Link>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto bg-background-base">
          {activeTab === 'overview' && (
            <OverviewTab
              keyPrefix={keyPrefix}
              createdLabel={createdLabel}
              lastUsedLabel={lastUsedLabel}
              rotating={rotating}
              rotateError={rotateError}
              onRotate={handleRotate}
              scansUsed={scansUsed}
              isTrialPlan={isTrialPlan}
              plan={plan}
              monthScans={monthScans}
              monthSpend={monthSpend}
              onViewUsage={() => setActiveTab('usage')}
              onViewDocs={() => setActiveTab('docs')}
            />
          )}
          {activeTab === 'usage'    && <UsageTab keyId={keyId} />}
          {activeTab === 'apikeys'  && (
            <ApiKeysTab
              keyPrefix={keyPrefix}
              createdLabel={createdLabel}
              lastUsedLabel={lastUsedLabel}
              rotating={rotating}
              rotateError={rotateError}
              onRotate={handleRotate}
              onRevoke={handleRevoke}
            />
          )}
          {activeTab === 'webhooks' && <WebhooksTab webhookLog={webhookLogMapped} />}
          {activeTab === 'billing'  && (
            <BillingTab plan={plan} isTrialPlan={isTrialPlan} monthScans={monthScans} scansUsed={scansUsed} />
          )}
          {activeTab === 'docs'     && <DocsTab />}
        </div>

      </div>

      {/* One-time reveal of a freshly rotated key — the full secret is shown once */}
      {revealedKey && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 200 }}
        >
          <div
            className="bg-background-raised"
            style={{ maxWidth: 560, width: '100%', border: '1px solid rgba(157,140,255,0.3)', borderLeft: '3px solid #9D8CFF', padding: 28 }}
          >
            <p className="font-mono" style={{ fontSize: 11, color: '#9D8CFF', letterSpacing: '0.2em', marginBottom: 8, textTransform: 'uppercase' }}>
              New API key
            </p>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: '#F0F4FF', marginBottom: 8 }}>
              Copy your new key now.
            </h2>
            <p className="font-body" style={{ fontSize: 13, color: 'rgba(240,244,255,0.55)', marginBottom: 20, lineHeight: 1.6 }}>
              This is the only time the full key is shown — only its hash is stored. The previous key has been deactivated.
            </p>
            <div className="font-mono" style={{ fontSize: 13, color: '#F0F4FF', background: 'rgba(157,140,255,0.06)', border: '1px solid rgba(157,140,255,0.25)', padding: '14px 16px', wordBreak: 'break-all', marginBottom: 16 }}>
              {revealedKey}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(revealedKey).then(
                    () => { setRevealedCopied(true); setTimeout(() => setRevealedCopied(false), 2000) },
                    () => {}
                  )
                }}
                className="bg-purple-DEFAULT text-text-inverse font-body font-semibold text-sm px-5 py-2.5 border-0 cursor-pointer"
              >
                {revealedCopied ? 'Copied ✓' : 'Copy key'}
              </button>
              <button
                onClick={() => setRevealedKey(null)}
                className="border border-background-border text-text-secondary font-body text-sm px-5 py-2.5 bg-transparent cursor-pointer hover:text-text-primary transition-colors duration-150"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
