'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'
import ScoreRing from '@/components/ui/ScoreRing'
import Label from '@/components/ui/Label'
import SurfaceSwitcher from '@/components/SurfaceSwitcher'
import { FREE_API_TRIAL_SCANS } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'scans' | 'apikeys' | 'webhooks' | 'docs'
type Severity = 'critical' | 'high' | 'medium' | 'low'

interface ScanRow {
  domain: string
  score: number
  findings: number
  time: string
  severity: Severity
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

function scoreToSeverity(score: number): Severity {
  if (score < 40) return 'critical'
  if (score < 60) return 'high'
  if (score < 75) return 'medium'
  return 'low'
}

function webhookStatusCode(raw: string | number | null): number {
  if (typeof raw === 'number') return raw
  if (raw === 'success' || raw === 'delivered' || raw === '200') return 200
  if (raw === 'failed' || raw === 'error' || raw === '500') return 500
  return 200
}

// ── Static constants ──────────────────────────────────────────────────────────

const TAB_TITLES: Record<TabId, string> = {
  overview: 'Overview',
  scans:    'Scans',
  apikeys:  'API Keys',
  webhooks: 'Webhooks',
  docs:     'Documentation',
}

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

// ── Shared micro-components ───────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const cls: Record<Severity, string> = {
    critical: 'bg-severity-critical/10 text-severity-critical',
    high:     'bg-severity-high/10 text-severity-high',
    medium:   'bg-severity-medium/10 text-severity-medium',
    low:      'bg-severity-low/10 text-severity-low',
  }
  return (
    <span className={`font-mono text-xs px-2 py-0.5 flex-shrink-0 ${cls[severity]}`}>
      {severity}
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
  monthScans: number
  monthSpend: number
  avgScore: number
  keyPrefix: string | null
  scanRows: ScanRow[]
  createdLabel: string
  lastUsedLabel: string
  rotating: boolean
  rotateError: string | null
  onRotate: () => void
}

function OverviewTab({ monthScans, monthSpend, avgScore, keyPrefix, scanRows, createdLabel, lastUsedLabel, rotating, rotateError, onRotate }: OverviewTabProps) {
  const [copied, setCopied] = useState(false)

  // Copies the visible key prefix — the full secret is only shown once at creation
  // (only its hash is stored), so the prefix is all that remains recoverable here.
  async function handleCopy() {
    if (!keyPrefix) return
    try {
      await navigator.clipboard.writeText(keyPrefix)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="px-8 py-8">

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-px bg-background-border mb-px">
        <div className="bg-background-raised p-6">
          <div className="font-display font-extrabold text-4xl text-text-primary">{monthScans}</div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-1">SCANS THIS MONTH</div>
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-display font-extrabold text-4xl text-text-primary">${monthSpend.toFixed(2)}</div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-1">SPENT THIS MONTH</div>
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-display font-extrabold text-4xl text-score-mid">{avgScore}</div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-1">AVERAGE SCORE</div>
        </div>
      </div>

      {/* API Key block */}
      <div className="bg-background-raised border border-background-border p-6 mt-px mb-px">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">API KEY</div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm text-text-secondary bg-background-subtle border border-background-border px-4 py-2.5 flex-1 min-w-0 truncate">
            {keyPrefix ? `${keyPrefix}••••••••••••••••••••••••••` : '— no active key —'}
          </div>
          <button
            onClick={handleCopy}
            disabled={!keyPrefix}
            className="border border-background-border text-text-tertiary font-body text-xs px-3 py-2.5 hover:text-text-primary hover:border-text-tertiary transition-colors duration-150 cursor-pointer bg-transparent flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onRotate}
            disabled={rotating || !keyPrefix}
            className="text-text-tertiary font-body text-xs hover:text-text-primary transition-colors duration-150 bg-transparent border-0 cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {rotating ? 'Rotating…' : 'Regenerate →'}
          </button>
        </div>
        <div className="font-mono text-xs text-text-tertiary mt-3">
          Created: {createdLabel} · Last used: {lastUsedLabel}
        </div>
        {rotateError ? (
          <div className="font-mono text-xs text-severity-critical mt-2">{rotateError}</div>
        ) : null}
      </div>

      {/* Activity feed */}
      <div className="bg-background-raised border border-background-border mt-px">
        <div className="px-6 py-4 border-b border-background-border flex justify-between items-center">
          <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">RECENT SCANS</span>
          <span className="font-body text-xs text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors duration-150">
            View all →
          </span>
        </div>
        {scanRows.length === 0 && (
          <div className="px-6 py-8 font-mono text-sm text-text-tertiary">No scans yet.</div>
        )}
        {scanRows.slice(0, 8).map((row, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-background-border last:border-0 hover:bg-background-interactive transition-colors duration-150 cursor-pointer"
          >
            <ScoreRing score={row.score} size="sm" animated={false} />
            <div className="flex-1 min-w-0">
              <div className="font-body text-sm text-text-primary">{row.domain}</div>
              <div className="font-mono text-xs text-text-tertiary">{row.findings} findings · $0.15</div>
            </div>
            <div className="font-mono text-xs text-text-tertiary ml-auto flex-shrink-0">{row.time}</div>
            <SeverityBadge severity={row.severity} />
          </div>
        ))}
      </div>

    </div>
  )
}

// ── Scans Tab ─────────────────────────────────────────────────────────────────

function ScansTab({ scanRows }: { scanRows: ScanRow[] }) {
  const [search, setSearch]           = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [sort, setSort]               = useState('newest')

  const filtered = scanRows
    .filter(s => !search || s.domain.toLowerCase().includes(search.toLowerCase()))
    .filter(s => {
      if (scoreFilter === '70+')   return s.score >= 70
      if (scoreFilter === '40-69') return s.score >= 40 && s.score < 70
      if (scoreFilter === '0-39')  return s.score < 40
      return true
    })
    .slice()
    .sort((a, b) => {
      if (sort === 'lowest')  return a.score - b.score
      if (sort === 'highest') return b.score - a.score
      return 0
    })

  const inputCls =
    'bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-4 py-2.5 outline-none'

  return (
    <div className="px-8 py-8">

      {/* Filter bar */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search domains..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`flex-1 ${inputCls} placeholder:text-text-tertiary`}
        />
        <select
          value={scoreFilter}
          onChange={e => setScoreFilter(e.target.value)}
          className={`${inputCls} cursor-pointer`}
        >
          <option value="all">All scores</option>
          <option value="70+">70+ (good)</option>
          <option value="40-69">40–69 (mid)</option>
          <option value="0-39">0–39 (low)</option>
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className={`${inputCls} cursor-pointer`}
        >
          <option value="newest">Newest first</option>
          <option value="lowest">Lowest score</option>
          <option value="highest">Highest score</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-background-raised border border-background-border">
        <div className="grid grid-cols-[2fr_80px_80px_72px_96px] px-6 py-3 border-b border-background-border">
          {['DOMAIN', 'SCORE', 'FINDINGS', 'COST', 'DATE'].map(h => (
            <div key={h} className="font-mono text-xs text-text-tertiary uppercase tracking-widest">{h}</div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-6 py-8 font-mono text-sm text-text-tertiary">No results.</div>
        )}
        {filtered.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_80px_80px_72px_96px] items-center px-6 py-4 border-b border-background-border last:border-0 hover:bg-background-interactive cursor-pointer transition-colors duration-150"
          >
            <div className="font-body text-sm text-text-primary">{row.domain}</div>
            <div><ScoreRing score={row.score} size="sm" animated={false} /></div>
            <div className="font-mono text-sm text-text-secondary">{row.findings}</div>
            <div className="font-mono text-sm text-text-tertiary">$0.15</div>
            <div className="font-mono text-xs text-text-tertiary">{row.time}</div>
          </div>
        ))}
      </div>

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
  const [webhookUrl, setWebhookUrl]       = useState('')
  const [scanCompleted, setScanCompleted] = useState(true)
  const [scanFailed, setScanFailed]       = useState(false)

  return (
    <div className="px-8 py-8">

      {/* Register form */}
      <div className="bg-background-raised border border-background-border p-6 mb-6">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">REGISTER ENDPOINT</div>
        <input
          type="url"
          placeholder="https://your-app.com/webhook"
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
          className="w-full bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-4 py-3 placeholder:text-text-tertiary outline-none"
        />
        <div className="flex gap-3 mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scanCompleted}
              onChange={e => setScanCompleted(e.target.checked)}
            />
            <span className="font-body text-xs text-text-secondary">scan.completed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scanFailed}
              onChange={e => setScanFailed(e.target.checked)}
            />
            <span className="font-body text-xs text-text-secondary">scan.failed</span>
          </label>
        </div>
        <button className="bg-purple-DEFAULT text-text-inverse font-body font-semibold text-sm px-5 py-2.5 mt-4 cursor-pointer border-0 hover:opacity-90 transition-opacity duration-150">
          Register endpoint
        </button>
      </div>

      {/* Delivery log */}
      <div className="bg-background-raised border border-background-border">
        <div className="px-6 py-4 border-b border-background-border">
          <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">DELIVERY LOG</span>
        </div>
        {webhookLog.length === 0 && (
          <div className="px-6 py-8 font-mono text-sm text-text-tertiary">No deliveries yet.</div>
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
            {log.status === 500 && (
              <span className="font-body text-xs text-purple-DEFAULT cursor-pointer hover:underline flex-shrink-0">
                Retry
              </span>
            )}
          </div>
        ))}
      </div>

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
  { id: 'scans',    label: 'Scans',    icon: <IconList />    },
  { id: 'apikeys',  label: 'API Keys', icon: <IconKey />     },
  { id: 'webhooks', label: 'Webhooks', icon: <IconWebhook /> },
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
      setLoading(false)
      return
    }

    const kr = keyRow as { id: string; scans_used: number; plan: string; key_prefix: string; created_at: string | null; last_used_at: string | null }
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
  const avgScore = (() => {
    const scored = rawUsage.filter(r => r.score !== null)
    if (!scored.length) return 0
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
    severity: scoreToSeverity(r.score ?? 0),
  }))

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
    <div className="flex h-screen overflow-hidden bg-background-base">

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 bg-background-raised border-r border-background-border flex flex-col h-full">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-background-border">
          <Link href="/" className="font-display font-extrabold text-sm text-text-primary no-underline">
            Weavn
          </Link>
        </div>

        {/* Surface-switcher — move between Developers (/console) and Dashboard (/app) */}
        <div className="px-6 py-4 border-b border-background-border">
          <SurfaceSwitcher active="console" />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-2.5 font-body text-sm cursor-pointer transition-colors duration-150 bg-transparent text-left border-0 border-l-2 ${
                activeTab === item.id
                  ? 'bg-background-interactive text-text-primary border-purple-DEFAULT'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-interactive border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

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
                <div className="absolute top-0 left-0 h-full bg-purple-DEFAULT" style={{ width: `${trialPct}%` }} />
              </div>
            </>
          ) : (
            <div className="font-mono text-xs text-text-tertiary">{plan} · usage-based</div>
          )}
        </div>

      </aside>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

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
              monthScans={monthScans}
              monthSpend={monthSpend}
              avgScore={avgScore}
              keyPrefix={keyPrefix}
              scanRows={scanRows}
              createdLabel={createdLabel}
              lastUsedLabel={lastUsedLabel}
              rotating={rotating}
              rotateError={rotateError}
              onRotate={handleRotate}
            />
          )}
          {activeTab === 'scans'    && <ScansTab scanRows={scanRows} />}
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
