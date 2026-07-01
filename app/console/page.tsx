'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import ScoreRing from '@/components/ui/ScoreRing'
import EmptyState from '@/components/ui/EmptyState'
import Sidebar, { type SidebarNavItem } from '@/components/shell/Sidebar'

const STEEL = '#6F9BC6'
const PURPLE = '#9D8CFF'
import { FREE_API_TRIAL_SCANS } from '@/lib/constants'
import { API_PLANS, type ApiTier } from '@/lib/pricing'
import { scoreColor, scoreToVerdict, estimatePercentile, ordinal } from '@/lib/verdict'
import VerdictRing from '@/components/ui/VerdictRing'
import Bloom from '@/components/ui/Bloom'
import CornerBrackets from '@/components/ui/CornerBrackets'
import Sparkline from '@/components/console/Sparkline'
import MetricCard from '@/components/console/MetricCard'
import UsageChart from '@/components/console/UsageChart'
import StatusPill from '@/components/console/StatusPill'
import ScoreChip from '@/components/console/ScoreChip'
import SegmentedMeter from '@/components/console/SegmentedMeter'
import Panel from '@/components/console/Panel'
import Field from '@/components/console/Field'
import Button from '@/components/console/Button'

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
// of truth). Catalog-driven from API_PLANS; checkout wired via BillingTab startCheckout
// (POST /api/stripe/checkout, surface:'api'). No invented numbers.
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
      style={{ color, border: `1px solid ${color}66`, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {scoreToVerdict(score)}
    </span>
  )
}

function MethodBadge({ method }: { method: 'POST' | 'GET' }) {
  return (
    <span className={`font-mono text-xs px-2 py-0.5 ${method === 'POST' ? 'bg-purple-dim text-purple-DEFAULT' : 'bg-background-subtle text-ink-secondary'}`}>
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
  monthSeries: number[]
  successPct: number
  name: string | null
  onViewUsage: () => void
  onViewDocs: () => void
}

const OVERVIEW_ACCENT = '#9D8CFF'
const SPEND_CAP_USD = 50

// Small inline viz — quiet card accents, not standalone primitives. Pure SVG / flex,
// zero radius (the ring is circular geometry, exempt by the locked rule).
function SpendRing({ value, cap, accent = OVERVIEW_ACCENT }: { value: number; cap: number; accent?: string }) {
  const pct = Math.max(0, Math.min(1, cap > 0 ? value / cap : 0))
  const size = 46, sw = 5, r = (size - sw) / 2, circ = 2 * Math.PI * r
  const color = value > cap ? '#FF5C5C' : accent
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="butt"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

function MiniBars({ data, accent = OVERVIEW_ACCENT, height = 56 }: { data: number[]; accent?: string; height?: number }) {
  const max = Math.max(1, ...data)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, flex: 1, minWidth: 0 }} aria-hidden>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, background: v > 0 ? accent : 'rgba(255,255,255,0.06)', opacity: v > 0 ? 0.85 : 1 }} />
      ))}
    </div>
  )
}

function OverviewTab({ name, keyPrefix, createdLabel, lastUsedLabel, rotating, rotateError, onRotate, scansUsed, isTrialPlan, plan, monthScans, monthSpend, monthSeries, successPct, onViewUsage, onViewDocs }: OverviewTabProps) {
  const [keyCopied, setKeyCopied] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)

  // Only the key PREFIX is recoverable (the full secret is shown once at creation/
  // rotation); the snippet + copy carry the prefix.
  const keyForCurl = keyPrefix ?? 'YOUR_API_KEY'
  const keyMasked = keyPrefix ? `${keyPrefix}••••••••••••••••` : 'YOUR_API_KEY'
  const curlText =
    `curl -X POST https://weavn.app/api/v1/scan \\\n` +
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
  const included = apiPlan?.includedScans ?? null
  const meter = isTrialPlan
    ? { label: 'Trial remaining', value: `${Math.max(0, FREE_API_TRIAL_SCANS - scansUsed)} / ${FREE_API_TRIAL_SCANS}`, used: scansUsed as number, total: FREE_API_TRIAL_SCANS as number | null, sub: 'lifetime free trial' }
    : included != null
      ? { label: 'Included this period', value: `${monthScans} / ${included}`, used: monthScans as number, total: included as number | null, sub: 'resets on the 1st' }
      : { label: 'Usage', value: `${monthScans}`, used: monthScans as number, total: null as number | null, sub: 'this month · custom volume' }

  const dim = 'rgba(240,244,255,0.42)'

  // Greeting (Claude-Console home rhythm) — time-of-day + first name when known.
  const hr = new Date().getHours()
  const partOfDay = hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening'
  const greeting = name ? `Good ${partOfDay}, ${name}` : `Good ${partOfDay}`

  // 3-up metric badges + scan-volume trend, all from real data.
  const meterPct = meter.total != null ? Math.min(100, Math.round((meter.used / meter.total) * 100)) : null
  const meterBadge = meterPct != null ? { label: `${meterPct}% used`, tone: 'neutral' as const } : undefined
  const recent7 = monthSeries.slice(-7).reduce((a, b) => a + b, 0)
  const prev7 = monthSeries.slice(-14, -7).reduce((a, b) => a + b, 0)
  const volDelta = prev7 === 0 ? null : Math.round(((recent7 - prev7) / prev7) * 100)
  const volBadge = volDelta == null
    ? undefined
    : { label: `${volDelta >= 0 ? '▲' : '▼'} ${Math.abs(volDelta)}% vs previous 7d`, tone: (volDelta >= 0 ? 'green' : 'neutral') as 'green' | 'neutral' }

  const primaryLink: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#9D8CFF', background: 'var(--btn-primary-fill)', border: 'var(--btn-primary-border)',
    padding: '9px 14px', textDecoration: 'none', whiteSpace: 'nowrap',
  }

  return (
    <div className="px-8 py-8" style={{ maxWidth: 1080, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 1 — Greeting row (home rhythm) */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 6 }}>
        <h1 className="font-display font-bold" style={{ fontSize: 24, letterSpacing: '-0.4px', color: '#F0F4FF' }}>{greeting}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={onViewDocs} style={{ border: 'none', padding: '8px 8px', color: '#6E7587' }}>Docs</Button>
          <Button variant="ghost" onClick={copyKey} disabled={!keyPrefix} className="disabled:opacity-40 disabled:cursor-not-allowed" style={{ padding: '9px 14px' }}>{keyCopied ? 'Key copied' : 'API key'}</Button>
          <Link href="/playground" style={primaryLink}>Run a scan →</Link>
        </div>
      </div>

      {/* 2 — 3-up metric row (Trial/Included · Spend vs cap · Success rate) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard
          accent={OVERVIEW_ACCENT}
          title={meter.label}
          info={isTrialPlan ? 'Lifetime free-trial scans remaining before billing starts.' : 'Included scans this billing period.'}
          badge={meterBadge}
          value={meter.value}
          sub={meter.sub}
        >
          {meter.total != null ? <SegmentedMeter used={meter.used} total={meter.total} accent={OVERVIEW_ACCENT} /> : null}
        </MetricCard>
        <MetricCard
          accent={OVERVIEW_ACCENT}
          title="Spend this month"
          info={`Real model spend this month against the $${SPEND_CAP_USD} reference cap.`}
          value={`$${monthSpend.toFixed(2)}`}
          sub={`of $${SPEND_CAP_USD.toFixed(2)} cap`}
          side={<SpendRing value={monthSpend} cap={SPEND_CAP_USD} accent={OVERVIEW_ACCENT} />}
        />
        <MetricCard
          accent={OVERVIEW_ACCENT}
          title="Success rate"
          info="Share of recent requests that completed successfully."
          value={`${successPct}%`}
          sub="of recent requests"
          sparkline={monthSeries}
        />
      </div>

      {/* 3 — Scan volume (wide: number left, bars right, trend badge) */}
      <Panel header="Scan volume" action={volBadge ? (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.06em', padding: '2px 7px', whiteSpace: 'nowrap', ...(volBadge.tone === 'green' ? { color: '#00C48C', background: 'rgba(0,196,140,0.10)', border: '1px solid rgba(0,196,140,0.22)' } : { color: 'rgba(240,244,255,0.50)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }) }}>{volBadge.label}</span>
      ) : undefined}>
        <div className="flex items-center gap-8" style={{ minHeight: 56 }}>
          <div style={{ flexShrink: 0 }}>
            <div className="font-display font-bold" style={{ fontSize: 32, lineHeight: 1, color: '#F0F4FF' }}>{monthScans}</div>
            <div className="font-mono" style={{ fontSize: 11, color: dim, marginTop: 7 }}>scans this month</div>
          </div>
          <MiniBars data={monthSeries} accent={OVERVIEW_ACCENT} />
        </div>
      </Panel>

      {/* 4 — Your API key */}
      <Panel header="Your API key">
        <div className="flex items-center gap-3 flex-wrap">
          <Field as="code" className="flex-1 min-w-0 truncate" style={{ color: '#E6E9EE', fontSize: 15 }}>{keyPrefix ? keyMasked : '— no active key —'}</Field>
          <Button variant="primary" onClick={copyKey} disabled={!keyPrefix} className="disabled:opacity-40 disabled:cursor-not-allowed" style={{ padding: '12px 14px' }}>{keyCopied ? 'Copied' : 'Copy'}</Button>
          <Button variant="ghost" onClick={onRotate} disabled={rotating || !keyPrefix} className="disabled:opacity-40 disabled:cursor-not-allowed" style={{ padding: '12px 14px' }}>{rotating ? 'Rotating…' : 'Regenerate'}</Button>
        </div>
        <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>Created {createdLabel} · Last used {lastUsedLabel} · all permissions</div>
        {rotateError ? <div className="font-mono text-severity-critical mt-2" style={{ fontSize: 11 }}>{rotateError}</div> : null}
      </Panel>

      {/* 5 — Fire your first scan */}
      <Panel
        header="Fire your first scan"
        action={<Button variant="primary" onClick={copyCurl} style={{ padding: '6px 10px' }}>{curlCopied ? 'Copied ✓' : 'Copy'}</Button>}
      >
        <div className="font-mono" style={{ fontSize: 10.5, color: dim, marginBottom: 10 }}>60–120s · returns structured JSON</div>
        <Field as="pre" className="leading-relaxed m-0 whitespace-pre-wrap" style={{ fontSize: 12, padding: 16 }}>
          <span className="text-purple-DEFAULT">curl</span>
          <span className="text-ink-muted">{' -X POST '}</span>
          <span style={{ color: '#6F9BC6' }}>https://weavn.app/api/v1/scan</span>
          <span className="text-ink-muted">{' \\\n  -H "Authorization: Bearer '}</span>
          <span style={{ color: '#6F9BC6' }}>{keyMasked}</span>
          <span className="text-ink-muted">{'" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"url": "'}</span>
          <span className="text-ink-secondary">https://yoursite.com</span>
          <span className="text-ink-muted">{'"}\''}</span>
        </Field>
        <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>Paste your full key — it&apos;s shown once at creation. Lost it? Regenerate above.</div>
      </Panel>

      {/* 6 — Usage link */}
      <div className="flex items-center justify-between gap-4 flex-wrap" style={{ marginTop: 8, paddingTop: 16, borderTop: 'var(--divider)' }}>
        <span className="font-body" style={{ fontSize: 13, color: dim }}>View request logs, throughput, and latency</span>
        <Button variant="ghost" onClick={onViewUsage} style={{ padding: '8px 14px' }}>Usage →</Button>
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

// Bucket rows over the range into N slots (oldest→newest) for a sparkline / chart.
//   count  = scans per bucket · avgDur = mean response_time_ms · spend = summed cost_usd
function bucketSeries(rows: UsageLogRow[], range: UsageRange, agg: 'count' | 'avgDur' | 'spend'): number[] {
  const N = 24
  const now = Date.now()
  const span = RANGE_MS[range]
  const start = now - span
  const counts = new Array(N).fill(0)
  const durSums = new Array(N).fill(0)
  const costSums = new Array(N).fill(0)
  for (const r of rows) {
    const t = new Date(r.created_at).getTime()
    if (t < start || t > now) continue
    let i = Math.floor(((t - start) / span) * N)
    if (i < 0) i = 0
    if (i >= N) i = N - 1
    counts[i] += 1
    durSums[i] += r.response_time_ms ?? 0
    costSums[i] += r.cost_usd ?? 0
  }
  if (agg === 'count') return counts
  if (agg === 'spend') return costSums
  return counts.map((c, i) => (c > 0 ? Math.round(durSums[i] / c) : 0))
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

function DetailRow({ k, v, vColor }: { k: string; v: string; vColor?: string }) {
  return (
    <div>
      <div className="font-mono uppercase text-ink-muted mb-1" style={{ fontSize: 9, letterSpacing: '0.14em' }}>{k}</div>
      <div className="font-mono truncate" style={{ fontSize: 13, color: vColor ?? '#E6E9EE' }}>{v}</div>
    </div>
  )
}

const USAGE_ACCENT = '#9D8CFF'

function UsageTab({ keyId, keyPrefix, accent = USAGE_ACCENT }: { keyId: string | null; keyPrefix: string | null; accent?: string }) {
  const [range, setRange] = useState<UsageRange>('7d')
  // Fetch TWO windows back in one query (same table, wider `since` — no new endpoint) so we
  // can split current vs prior client-side and show a true prior-window delta.
  const [allRows, setAllRows] = useState<UsageLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'errors'>('all')
  const [selected, setSelected] = useState<UsageLogRow | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      if (!keyId) { if (!cancelled) { setAllRows([]); setLoading(false) } return }
      try {
        const supabase = getSupabaseBrowserClient()
        const since = new Date(Date.now() - 2 * RANGE_MS[range]).toISOString()
        // Scoped to the user's api_key_id; RLS "Users view own usage" enforces ownership.
        const { data } = await supabase
          .from('api_usage')
          .select('id, created_at, endpoint, status, status_code, error_code, response_time_ms, cost_usd, page_count, cached, url, score')
          .eq('api_key_id', keyId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(4000)
        if (cancelled) return
        setAllRows((data ?? []) as UsageLogRow[])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [keyId, range])

  // Split the 2× window into the current window (drives every metric + the log) and the
  // immediately-prior window of equal length (drives the delta badges only).
  const span = RANGE_MS[range]
  const nowMs = Date.now()
  const curStart = nowMs - span
  const rows = allRows.filter(r => new Date(r.created_at).getTime() >= curStart)
  const priorRows = allRows.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t < curStart && t >= nowMs - 2 * span
  })

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
  // Spend sparkline is the cumulative running COGS across the window (a rising curve).
  let spendRun = 0
  const spendCumulative = bucketSeries(rows, range, 'spend').map(v => (spendRun += v))

  // Scans delta vs the prior window. Null when there's no prior data (no fake precision).
  const scansDelta = priorRows.length === 0 ? null : Math.round(((total - priorRows.length) / priorRows.length) * 100)

  const logRows = rows
    .filter(r => filter === 'all' ? true : filter === 'success' ? r.status === 'success' : r.status !== 'success')
    .slice(0, 50)

  // Scans here run ~90s, so raw ms reads wrong ("0ms"); show seconds for anything ≥1s.
  const fmtDur = (ms: number) => (ms >= 10000 ? `${Math.round(ms / 1000)}s` : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`)

  // curl one-liner used as the request-log empty-state CTA (prefix only — full key shown once).
  const curlOneLiner = `curl -X POST https://weavn.app/api/v1/scan -H "Authorization: Bearer ${keyPrefix ?? 'YOUR_API_KEY'}" -d '{"url":"https://yoursite.com"}'`
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return iso } }
  const cols = '128px 96px 64px 72px 74px 1fr 60px 28px'
  const activeChip: React.CSSProperties = { background: 'color-mix(in srgb, var(--surface-accent) 14%, transparent)', color: 'var(--surface-accent)' }
  const idleChip: React.CSSProperties = { background: 'transparent', color: '#6E7587' }

  const dataAsOf = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const groupBy = range === '24h' ? 'hour' : 'day'
  const chipLabel: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,244,255,0.40)' }
  const scansBadge = scansDelta == null
    ? undefined
    : { label: `${scansDelta >= 0 ? '▲' : '▼'} ${Math.abs(scansDelta)}% vs previous ${range}`, tone: (scansDelta >= 0 ? 'green' : 'neutral') as 'green' | 'neutral' }

  return (
    <div className="px-8 py-8" style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 1 — Title */}
      <h1 className="font-display font-bold" style={{ fontSize: 24, letterSpacing: '-0.4px', color: '#F0F4FF', marginBottom: 2 }}>Usage</h1>

      {/* 1b — Filter-chip row + data-as-of note */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span style={chipLabel}>Range</span>
            <div className="inline-flex" style={{ border: 'var(--panel-border)' }}>
              {(['24h', '7d', '30d'] as UsageRange[]).map(r => (
                <button key={r} onClick={() => setRange(r)} className="font-mono uppercase cursor-pointer" style={{ fontSize: 10, letterSpacing: '0.08em', padding: '7px 14px', ...(range === r ? activeChip : idleChip) }}>{r}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={chipLabel}>Group by</span>
            <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.04em', padding: '6px 12px', border: 'var(--panel-border)', color: 'rgba(240,244,255,0.62)' }}>{groupBy}</span>
          </div>
        </div>
        <span className="font-mono" style={{ fontSize: 10.5, color: 'rgba(240,244,255,0.40)' }}>Data as of {dataAsOf} · live</span>
      </div>

      {/* 2 — Metric cards (calm anatomy: info dot · title · badge) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard
          accent={accent}
          title="Scans"
          info="Total scans in the selected range."
          value={total}
          badge={scansBadge}
          sub={`${range.toUpperCase()} window`}
          sparkline={throughput}
        />
        <MetricCard
          accent={accent}
          title="Duration"
          info="Median (p50) and p95 response time."
          value={durs.length ? fmtDur(p50) : '—'}
          valueSuffix={durs.length ? 'p50' : undefined}
          sub={durs.length ? `p95 ${fmtDur(p95)}` : 'no timing yet'}
          sparkline={durSeries}
        />
        <MetricCard
          accent={accent}
          title="Success rate"
          info="Share of requests that completed successfully."
          value={`${successPct}%`}
          sub={`${successCount} ok · ${errorCount} err`}
        >
          <div style={{ display: 'flex', width: '100%', height: 4 }}>
            <div style={{ width: `${successPct}%`, background: '#00C48C' }} />
            <div style={{ width: `${100 - successPct}%`, background: errorCount > 0 ? '#FF5C5C' : 'rgba(255,255,255,0.07)' }} />
          </div>
        </MetricCard>
        <MetricCard
          accent={accent}
          title="Spend"
          info="Real model spend for the selected range."
          value={`$${spend.toFixed(2)}`}
          badge={{ label: 'Spend', tone: 'neutral' }}
          sub={`cached ${cachedPct}% · ${avgPages.toFixed(1)} pg avg`}
          sparkline={spendCumulative}
        />
      </div>

      {/* 2b — Scans over time (primary area chart) */}
      <Panel
        header="Scans over time"
        action={<span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: '0.12em', color: '#5A6070' }}>{range.toUpperCase()}</span>}
      >
        <UsageChart data={throughput} period={range} accent={accent} unitLabel="scans" />
      </Panel>

      {/* 3 — Request log */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 12 }}>
        <span className="font-body" style={{ fontSize: 15, letterSpacing: '-0.1px', color: 'rgba(240,244,255,0.82)' }}>Request log</span>
        <span className="font-mono" style={{ fontSize: 10.5, color: 'rgba(240,244,255,0.40)' }}>last 50</span>
        <div className="inline-flex ml-1" style={{ border: 'var(--panel-border)' }}>
          {(['all', 'success', 'errors'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="font-mono uppercase cursor-pointer" style={{ fontSize: 9.5, letterSpacing: '0.08em', padding: '5px 10px', ...(filter === f ? activeChip : idleChip) }}>{f}</button>
          ))}
        </div>
      </div>

      <Panel flushBody>
        <div className="grid items-center px-6" style={{ gridTemplateColumns: cols, minHeight: 44, borderBottom: 'var(--divider)' }}>
          {['Time', 'Endpoint', 'Code', 'Duration', 'Spend', 'Target', 'Score', ''].map((h, i) => (
            <div key={i} className="font-body" style={{ fontSize: 12, color: 'rgba(240,244,255,0.40)' }}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div className="px-6 py-8 font-mono text-ink-muted" style={{ fontSize: 12 }}>Loading…</div>
        ) : logRows.length === 0 ? (
          total === 0 ? (
            <EmptyState dense headline="No requests yet" sub="Fire your first scan and it lands here in real time — structured JSON in 60–120s.">
              <Field as="code" className="block text-left" style={{ fontSize: 11, lineHeight: 1.6, color: '#9398A8', maxWidth: 540, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{curlOneLiner}</Field>
            </EmptyState>
          ) : (
            <div className="px-6 py-8 font-mono text-ink-muted" style={{ fontSize: 12 }}>No matching requests.</div>
          )
        ) : logRows.map(r => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="grid items-center px-6 last:border-0 w-full text-left cursor-pointer hover:bg-background-interactive transition-colors"
            style={{ gridTemplateColumns: cols, minHeight: 56, borderBottom: 'var(--divider)', background: selected?.id === r.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}
          >
            <span className="font-mono text-ink-muted truncate" style={{ fontSize: 11 }}>{fmtTime(r.created_at)}</span>
            <span className="font-mono text-ink-secondary truncate" style={{ fontSize: 11 }}>{r.endpoint ?? 'scan'}</span>
            <span><StatusPill code={r.status_code} /></span>
            <span className="font-mono text-ink-muted" style={{ fontSize: 11 }}>{r.response_time_ms != null ? fmtDur(r.response_time_ms) : '—'}</span>
            <span className="font-mono text-ink-muted" style={{ fontSize: 11 }}>${(r.cost_usd ?? 0).toFixed(2)}</span>
            <span className="font-mono truncate" style={{ fontSize: 11, color: r.url ? '#9398A8' : '#EFB23E' }}>{r.url || r.error_code || '—'}</span>
            <span><ScoreChip score={r.score} /></span>
            <span aria-hidden style={{ fontSize: 14, lineHeight: 1, color: 'rgba(240,244,255,0.28)', textAlign: 'right' }}>⋮</span>
          </button>
        ))}
      </Panel>

      {/* 4 — Request detail (inspector) — logged metadata only */}
      {selected ? (
        <Panel
          className="mt-3"
          header="Request detail"
          action={<button onClick={() => setSelected(null)} className="font-mono uppercase cursor-pointer bg-transparent text-ink-muted hover:text-ink-secondary" style={{ fontSize: 10, letterSpacing: '0.08em' }}>Close ✕</button>}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-3" style={{ maxWidth: 640 }}>
            <DetailRow k="endpoint" v={selected.endpoint ?? 'scan'} />
            <DetailRow k="status" v={`${selected.status_code ?? '—'} · ${selected.status}`} vColor={codeColor(selected.status_code)} />
            <DetailRow k="duration" v={selected.response_time_ms != null ? fmtDur(selected.response_time_ms) : '—'} />
            <DetailRow k="cogs" v={`$${(selected.cost_usd ?? 0).toFixed(2)} · ${selected.page_count ?? 1} pg${selected.cached ? ' · cached' : ''}`} />
            <DetailRow k="target" v={selected.url || '—'} />
            <DetailRow k={selected.error_code ? 'error' : 'score'} v={selected.error_code ? selected.error_code : (selected.score != null ? `${selected.score} · ${ordinal(estimatePercentile(selected.score))} pct` : '—')} vColor={selected.error_code ? codeColor(selected.status_code) : scoreDisplayColor(selected.score)} />
          </div>
          <div className="font-mono mt-5" style={{ fontSize: 10.5, color: '#5A6070' }}>Detail reflects logged request metadata. Full request/response payloads aren&apos;t stored.</div>
        </Panel>
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

  // Same color budget as Overview/Usage: purple rationed to affordances, gray
  // everything else, red reserved for genuine destructive/failure signal.
  const dim = '#5A6070'
  const danger = '#E8635F'

  async function handleRevoke() {
    setRevoking(true)
    await onRevoke()
    setRevoking(false)
  }

  return (
    <div className="px-8 py-8" style={{ maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 8 }}>
        <h1 className="font-display font-bold text-ink-primary" style={{ fontSize: 21, letterSpacing: '-0.3px' }}>API Keys</h1>
        <span className="font-mono uppercase text-ink-muted" style={{ fontSize: 9.5, letterSpacing: '0.18em', padding: '3px 8px', border: 'var(--panel-border)' }}>Developer</span>
      </div>

      {/* Production key panel */}
      <Panel
        header="Production key"
        action={
          <button
            onClick={handleRevoke}
            disabled={revoking || !keyPrefix}
            className="font-mono uppercase cursor-pointer bg-transparent border-0 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: 10.5, letterSpacing: '0.08em', color: danger }}
          >
            {revoking ? 'Revoking…' : 'Revoke'}
          </button>
        }
      >
        <Field as="code" className="block truncate" style={{ color: '#E6E9EE', fontSize: 15 }}>
          {keyPrefix ? `${keyPrefix}••••••••••••••••••••••` : '— no active key —'}
        </Field>

        <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>Created {createdLabel} · Last used {lastUsedLabel} · all permissions</div>

        <div className="flex items-center gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: 'var(--divider)' }}>
          <span className="font-mono uppercase text-ink-muted flex-shrink-0" style={{ fontSize: 10, letterSpacing: '0.18em' }}>Monthly spending limit</span>
          <input
            type="text"
            placeholder="$50.00"
            value={spendLimit}
            onChange={e => { setSpendLimit(e.target.value); setSpendNotice(false) }}
            className="font-mono text-ink-primary w-32 outline-none placeholder:text-ink-muted"
            style={{ fontSize: 13, padding: '8px 12px', background: 'var(--field-bg)', border: 'var(--field-border)' }}
          />
          {/* TODO(wiring): no persistence path for spend limits yet (no column/endpoint).
              Held in form-state only — we surface an honest notice instead of faking a save. */}
          <Button variant="ghost" onClick={() => setSpendNotice(true)} style={{ padding: '8px 12px' }}>Save</Button>
        </div>
        {spendNotice ? (
          <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>
            Spend limits aren&apos;t wired up yet — this lands in the billing wiring phase. Your input is kept here for now.
          </div>
        ) : null}
      </Panel>

      {/* Rotate — primary affordance (purple); destructive-on-confirm, so paired with a quiet caption */}
      <Panel>
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="primary"
            onClick={onRotate}
            disabled={rotating || !keyPrefix}
            className="disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ padding: '12px 16px' }}
          >
            {rotating ? 'Rotating…' : 'Rotate key →'}
          </Button>
          <span className="font-mono" style={{ fontSize: 11, color: dim }}>
            Rotating deactivates the current key immediately and shows the new key once.
          </span>
        </div>
        {rotateError ? (
          <div className="font-mono mt-3" style={{ fontSize: 11, color: danger }}>{rotateError}</div>
        ) : null}
      </Panel>
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

  // Same color budget as Overview/Usage: purple only on affordances, gray
  // everything else; delivery status colored only on failure (codeColor).
  const dim = '#5A6070'
  const danger = '#E8635F'

  return (
    <div className="px-8 py-8" style={{ maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 8 }}>
        <h1 className="font-display font-bold text-ink-primary" style={{ fontSize: 21, letterSpacing: '-0.3px' }}>Webhooks</h1>
        <span className="font-mono uppercase text-ink-muted" style={{ fontSize: 9.5, letterSpacing: '0.18em', padding: '3px 8px', border: 'var(--panel-border)' }}>Developer</span>
      </div>

      {/* Register form */}
      <Panel header="Register endpoint">
        <div className="flex gap-3 flex-wrap">
          <input
            type="url"
            placeholder="https://your-app.com/webhook"
            value={webhookUrl}
            onChange={e => { setWebhookUrl(e.target.value); setError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void handleRegister() }}
            className="flex-1 min-w-0 font-mono text-ink-primary placeholder:text-ink-muted outline-none"
            style={{ fontSize: 13, padding: '12px 16px', background: 'var(--field-bg)', border: 'var(--field-border)' }}
          />
          <Button
            variant="primary"
            onClick={handleRegister}
            disabled={registering || !webhookUrl.trim()}
            className="disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ padding: '12px 16px' }}
          >
            {registering ? 'Registering…' : 'Register'}
          </Button>
        </div>
        <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>
          Registered endpoints receive all scan events (scan.completed, scan.failed).
        </div>
        {/* TODO(wiring): the webhooks endpoint never returns a signing secret, so we do
            NOT fake a "secret shown once" here. Secret provisioning is a later backend add. */}
        {error ? <div className="font-mono mt-2" style={{ fontSize: 11, color: danger }}>{error}</div> : null}
      </Panel>

      {/* Registered endpoints (real list + delete) */}
      <Panel header="Registered endpoints" flushBody>
        {listLoading ? (
          <div className="px-6 py-8 font-mono text-ink-muted" style={{ fontSize: 12 }}>Loading…</div>
        ) : endpoints.length === 0 ? (
          <div className="px-6 py-8 font-mono text-ink-muted" style={{ fontSize: 12 }}>No endpoints registered.</div>
        ) : endpoints.map(ep => (
          <div key={ep.id} className="flex items-center gap-4 px-6 py-4 last:border-0" style={{ borderBottom: 'var(--divider)' }}>
            {/* Active is a quiet state, not a success signal — gray, never green */}
            <span className="font-mono uppercase flex-shrink-0" style={{ fontSize: 9.5, letterSpacing: '0.08em', padding: '2px 8px', border: 'var(--panel-border)', color: ep.active ? '#9398A8' : dim }}>
              {ep.active ? 'active' : 'inactive'}
            </span>
            <span className="font-mono text-ink-secondary truncate flex-1" style={{ fontSize: 12 }}>{ep.url}</span>
            <span className="font-mono text-ink-muted flex-shrink-0" style={{ fontSize: 11 }}>{relativeTime(ep.created_at)}</span>
            <button
              onClick={() => handleDelete(ep.id)}
              disabled={deletingId === ep.id}
              className="font-mono uppercase cursor-pointer bg-transparent border-0 hover:underline flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontSize: 10.5, letterSpacing: '0.08em', color: danger }}
            >
              {deletingId === ep.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ))}
      </Panel>

      {/* Delivery log (history from webhook_deliveries) */}
      <Panel header="Delivery log" flushBody>
        {webhookLog.length === 0 && (
          <EmptyState
            dense
            headline="No deliveries yet"
            sub="Delivered scan events (scan.completed, scan.failed) will appear here."
          />
        )}
        {webhookLog.map((log, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 last:border-0" style={{ borderBottom: 'var(--divider)' }}>
            {/* Status code colored only on failure (codeColor): 200 quiet gray, 4xx amber, 5xx red */}
            <span className="font-mono flex-shrink-0" style={{ fontSize: 11, color: codeColor(log.status) }}>{log.status}</span>
            <span className="font-mono text-ink-secondary flex-shrink-0" style={{ fontSize: 11 }}>{log.event}</span>
            <span className="font-mono text-ink-muted truncate flex-1" style={{ fontSize: 11 }}>{log.url}</span>
            <span className="font-mono flex-shrink-0" style={{ fontSize: 11, color: dim }}>{log.time}</span>
            <span className="font-mono text-ink-muted flex-shrink-0" style={{ fontSize: 11 }}>{log.date}</span>
          </div>
        ))}
      </Panel>

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
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

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

  // Real Stripe Checkout for the API track — mirrors the dashboard's startCheckout
  // (app/app/billing/page.tsx) but pins surface:'api' so the route validates against
  // the API tier catalog. Only self-serve (cta.kind==='checkout') tiers reach here.
  // No monthly/annual toggle exists on this tab yet → interval defaults to 'month'.
  async function startCheckout(tierId: ApiTier) {
    if (checkoutBusy) return
    setCheckoutBusy(tierId); setCheckoutError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { window.location.href = '/auth?mode=signup'; return }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: tierId, interval: 'month', surface: 'api' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(typeof json.error === 'string' ? json.error : 'Checkout failed.')
      window.location.href = json.url as string
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed.')
      setCheckoutBusy(null)
    }
  }

  // Same color budget as Overview/Usage: purple rationed to affordances + active
  // state (Manage billing, the CURRENT tag), gray everything else, red on failure.
  const dim = '#5A6070'
  const danger = '#E8635F'

  return (
    <div className="px-8 py-8" style={{ maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 8 }}>
        <h1 className="font-display font-bold text-ink-primary" style={{ fontSize: 21, letterSpacing: '-0.3px' }}>Billing</h1>
        <span className="font-mono uppercase text-ink-muted" style={{ fontSize: 9.5, letterSpacing: '0.18em', padding: '3px 8px', border: 'var(--panel-border)' }}>Developer</span>
      </div>

      {/* Current plan + manage billing */}
      <Panel header="Current API plan">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-display font-bold capitalize" style={{ fontSize: 28, color: '#E6E9EE' }}>{plan}</div>
            <div className="font-mono mt-1" style={{ fontSize: 11, color: dim }}>
              {isTrialPlan
                ? `${scansUsed} / ${FREE_API_TRIAL_SCANS} free trial scans used (lifetime)`
                : 'Usage-based billing'}
              {` · ${monthScans} this month`}
            </div>
          </div>
          <Button
            variant="primary"
            onClick={openPortal}
            disabled={portalBusy}
            className="disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ padding: '10px 16px' }}
          >
            {portalBusy ? 'Opening…' : 'Manage billing →'}
          </Button>
        </div>
        <div className="font-mono mt-3" style={{ fontSize: 11, color: dim }}>
          Opens the Stripe billing portal to manage payment methods and invoices.
        </div>
        {portalError ? <div className="font-mono mt-2" style={{ fontSize: 11, color: danger }}>{portalError}</div> : null}
      </Panel>

      {/* Paid tiers — real Stripe Checkout (surface:'api'). Checkout vs contact CTA is
          read from API_PLANS[t.id].cta.kind (dev/builder/scale = checkout; enterprise =
          contact), never hardcoded. */}
      <div className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.2em', marginTop: 8 }}>API plans</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {PAID_TIERS.map(t => {
          const isCurrent = plan === t.id
          const isContact = API_PLANS[t.id].cta.kind === 'contact'
          const busy = checkoutBusy === t.id
          return (
            <Panel key={t.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-bold text-ink-primary" style={{ fontSize: 17 }}>{t.name}</span>
                {/* Active-state marker — purple is on-budget here */}
                {isCurrent && <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--surface-accent)' }}>Current</span>}
              </div>
              <div className="font-mono mt-1" style={{ fontSize: 11, color: dim }}>{t.line}</div>
              <Button
                variant="ghost"
                onClick={() => {
                  if (isCurrent) return
                  // Enterprise (cta.kind==='contact') books a call — NOT Stripe Checkout.
                  if (isContact) { window.location.href = '/contact'; return }
                  void startCheckout(t.id)
                }}
                disabled={isCurrent || busy}
                className="mt-4 w-full disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontSize: 10.5, padding: '8px 12px', textAlign: 'center', display: 'block' }}
              >
                {isCurrent ? 'Current plan' : isContact ? 'Talk to us →' : busy ? 'Redirecting…' : 'Upgrade'}
              </Button>
            </Panel>
          )
        })}
      </div>

      {checkoutError ? (
        <div className="font-mono mt-3 mb-3" style={{ fontSize: 11, color: danger }}>{checkoutError}</div>
      ) : null}

      {/* Inline text-link → gray (purple reserved for button affordances), matches Overview's "Docs →" */}
      <Link href="/developers" className="font-mono uppercase text-ink-muted hover:text-ink-secondary no-underline transition-colors inline-block mt-4" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
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
          <span className="text-ink-muted">{' -X POST https://weavn.app/api/v1/scan \\\n  -H "Authorization: Bearer '}</span>
          <span style={{ color: '#6F9BC6' }}>weavn_live_••••</span>
          <span className="text-ink-muted">{'" \\\n  -d \'{"url": "'}</span>
          <span style={{ color: '#6F9BC6' }}>https://your-site.com</span>
          <span className="text-ink-muted">{"\"}'"}  </span>
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
          <span className="text-ink-muted">{' -X POST https://weavn.app/api/v1/scan/batch \\\n  -H "Authorization: Bearer '}</span>
          <span style={{ color: '#6F9BC6' }}>weavn_live_••••</span>
          <span className="text-ink-muted">{'" \\\n  -d \'{"urls": ["'}</span>
          <span style={{ color: '#6F9BC6' }}>https://site-a.com</span>
          <span className="text-ink-muted">{'", "'}</span>
          <span style={{ color: '#6F9BC6' }}>https://site-b.com</span>
          <span className="text-ink-muted">{"\"]}'"}</span>
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
          <span className="text-ink-muted">{' https://weavn.app/api/v1/scans/'}</span>
          <span style={{ color: '#6F9BC6' }}>sc_3f9a2c7e8b1d4f60</span>
          <span className="text-ink-muted">{' \\\n  -H "Authorization: Bearer '}</span>
          <span style={{ color: '#6F9BC6' }}>weavn_live_••••</span>
          <span className="text-ink-muted">{'"'}</span>
        </>
      ),
    },
  ]

  return (
    <div className="px-8 py-8">
      <div className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.2em' }}>API quick reference</div>
      <h2 className="font-display font-extrabold text-3xl text-ink-primary mt-3 mb-8">
        Everything you need.
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {endpoints.map(ep => (
          <Panel key={ep.path}>
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method={ep.method} />
              <span className="font-mono text-base text-ink-primary">{ep.path}</span>
            </div>
            <p className="font-body text-sm text-ink-secondary mb-4">{ep.desc}</p>
            <Field as="pre" className="text-xs text-ink-muted leading-relaxed m-0 whitespace-pre-wrap" style={{ padding: 16 }}>
              {ep.curl}
            </Field>
          </Panel>
        ))}
      </div>

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
  const [userName, setUserName]       = useState<string | null>(null)

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

    // First name for the greeting — full_name metadata if present, else the email local-part.
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
    const rawName = meta.full_name ?? meta.name ?? (user.email ? user.email.split('@')[0] : '')
    const firstName = rawName ? rawName.split(/[ .]/)[0] : ''
    setUserName(firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : null)

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

  // Recent-activity shape for the "Scans this month" sparkline — the loaded usage rows
  // bucketed by day over the last 14 days (oldest→newest). Real data, no fabrication.
  const monthSeries: number[] = (() => {
    const days = 14
    const out = new Array(days).fill(0)
    const dayMs = 86_400_000
    const now = Date.now()
    for (const r of rawUsage) {
      const ageDays = Math.floor((now - new Date(r.created_at).getTime()) / dayMs)
      if (ageDays >= 0 && ageDays < days) out[days - 1 - ageDays] += 1
    }
    return out
  })()

  // Success rate over the loaded usage rows (real data). 100 when there's nothing yet.
  const successPct: number = rawUsage.length
    ? Math.round((rawUsage.filter(r => r.status === 'success').length / rawUsage.length) * 100)
    : 100

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

  // Shared Sidebar inputs (developer = purple; doorway points back to the steel dashboard).
  const consoleNav: SidebarNavItem[] = NAV_ITEMS.map(item => ({
    label: item.label,
    active: activeTab === item.id,
    onClick: () => setActiveTab(item.id),
  }))
  const consoleIncluded = API_PLANS[plan as ApiTier]?.includedScans ?? null
  const consoleQuota = isTrialPlan
    ? { label: 'Trial', primary: `${scansUsed} / ${FREE_API_TRIAL_SCANS} scans`, pct: trialPct, sub: 'lifetime free trial', warn: trialPct >= 100 }
    : consoleIncluded != null
      ? { label: 'This month', primary: `${monthScans} / ${consoleIncluded} scans`, pct: Math.min(100, Math.round((monthScans / consoleIncluded) * 100)), sub: 'included this period', warn: monthScans >= consoleIncluded }
      : { label: 'This month', primary: `${monthScans} scans · $${monthSpend.toFixed(2)}`, pct: 0, sub: `${plan} · usage-based`, warn: false }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-base">
        <span className="font-mono text-sm" style={{ color: '#9D8CFF' }}>Loading...</span>
      </div>
    )
  }

  return (
    <div data-surface="console" className="flex h-screen overflow-hidden bg-background-base">

      {/* ── Left Sidebar (shared component, purple) — doorway to the steel dashboard ─ */}
      <Sidebar
        fixed={false}
        accent={PURPLE}
        modeLabel="Developer"
        workspaceName={userName ?? 'Workspace'}
        workspacePlan={plan}
        nav={consoleNav}
        quota={consoleQuota}
        doorway={{ label: '← Dashboard', href: '/app', accent: STEEL }}
        account={{ label: 'Account', href: '/app/account' }}
      />

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 bg-background-base px-8 py-4 flex justify-between items-center z-10" style={{ borderBottom: 'var(--divider)' }}>
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
              name={userName}
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
              monthSeries={monthSeries}
              successPct={successPct}
              onViewUsage={() => setActiveTab('usage')}
              onViewDocs={() => setActiveTab('docs')}
            />
          )}
          {activeTab === 'usage'    && <UsageTab keyId={keyId} keyPrefix={keyPrefix} />}
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
          {/* Monochrome chrome — no decorative purple frame; purple rationed to the Copy affordance */}
          <div
            style={{ maxWidth: 560, width: '100%', padding: 28, background: 'var(--panel-bg)', border: 'var(--panel-border)' }}
          >
            <p className="font-mono uppercase text-ink-muted" style={{ fontSize: 10, letterSpacing: '0.2em', marginBottom: 8 }}>
              New API key
            </p>
            <h2 className="font-display font-bold text-ink-primary" style={{ fontSize: 22, marginBottom: 8 }}>
              Copy your new key now.
            </h2>
            <p className="font-body" style={{ fontSize: 13, color: '#9398A8', marginBottom: 20, lineHeight: 1.6 }}>
              This is the only time the full key is shown — only its hash is stored. The previous key has been deactivated.
            </p>
            <Field className="text-ink-primary" style={{ fontSize: 13, padding: '14px 16px', wordBreak: 'break-all', marginBottom: 16 }}>
              {revealedKey}
            </Field>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                variant="primary"
                onClick={() => {
                  navigator.clipboard?.writeText(revealedKey).then(
                    () => { setRevealedCopied(true); setTimeout(() => setRevealedCopied(false), 2000) },
                    () => {}
                  )
                }}
                style={{ padding: '12px 16px' }}
              >
                {revealedCopied ? 'Copied ✓' : 'Copy key'}
              </Button>
              <Button variant="ghost" onClick={() => setRevealedKey(null)} style={{ padding: '12px 16px' }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
