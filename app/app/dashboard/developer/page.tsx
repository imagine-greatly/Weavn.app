'use client'

import { useState } from 'react'
import Link from 'next/link'
import CodeBlock from '@/components/ui/CodeBlock'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  jsonKey:    '#8080c0',
  jsonStr:    '#00C48C',
  jsonMetric: '#6F9BC6',
  sevCrit:    '#E8635F',
  sevHigh:    '#EFB23E',
  inkPrimary: '#E6E9EE',
  inkSec:     '#9398A8',
  inkTert:    '#8E8EA0',
  inkMuted:   '#6E7587',
  bg:         '#050810',
  surface:    '#0A0E18',
} as const

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScanRequest {
  timestamp: string
  url: string
  duration_ms: number
  cost: string
  status: number | 'blocked'
}

interface Webhook {
  id: string
  url: string
  events: string[]
  last_status: number | null
  last_at: string | null
}

interface Invoice {
  date: string
  amount: string
  status: 'paid' | 'failed'
  pdf_url: string
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const PLAN = {
  name: 'Builder',
  scans_used: 34,
  scans_total: 200,
  resets_in: '23 days',
  next_billing: 'Jul 1, 2026',
  billing_email: 'dev@mycompany.com',
  overage: null as { scans: number; cost: string; rate: string } | null,
}

const API_KEY_MASKED  = 'wdoc_live_••••••••••••••••••••'
const API_KEY_FULL    = 'wdoc_live_sk_example_abcdef1234567890'

const REQUESTS: ScanRequest[] = [
  { timestamp: 'Jun 8, 12:34:21', url: 'https://acme-saas.com',           duration_ms: 87340, cost: '$0.15', status: 200 },
  { timestamp: 'Jun 8, 11:22:08', url: 'https://techflow.io',             duration_ms: 91200, cost: '$0.15', status: 200 },
  { timestamp: 'Jun 8, 09:15:44', url: 'https://buildspace.so',           duration_ms: 84500, cost: '$0.15', status: 200 },
  { timestamp: 'Jun 7, 16:48:33', url: 'https://lemonsqueezy.com',        duration_ms: 93100, cost: '$0.15', status: 200 },
  { timestamp: 'Jun 7, 14:22:11', url: 'https://example-badurl.notreal',  duration_ms: 2100,  cost: '$0.00', status: 422 },
  { timestamp: 'Jun 7, 11:09:57', url: 'https://loops.so',                duration_ms: 88900, cost: '$0.15', status: 200 },
  { timestamp: 'Jun 6, 15:33:20', url: 'https://mintlify.com',            duration_ms: 79800, cost: '$0.15', status: 200 },
  { timestamp: 'Jun 6, 10:14:05', url: 'https://tally.so',                duration_ms: 85600, cost: '$0.15', status: 200 },
]

const WEBHOOKS: Webhook[] = [
  {
    id: 'wh_01',
    url: 'https://myapp.com/webhooks/webdoc',
    events: ['scan.completed', 'scan.failed'],
    last_status: 200,
    last_at: 'Jun 8, 12:34:22',
  },
]

const INVOICES: Invoice[] = [
  { date: 'Jun 1, 2026',  amount: '$29.00', status: 'paid',   pdf_url: '#' },
  { date: 'May 1, 2026',  amount: '$29.00', status: 'paid',   pdf_url: '#' },
  { date: 'Apr 1, 2026',  amount: '$29.00', status: 'paid',   pdf_url: '#' },
]

// ── Bash code snippets ────────────────────────────────────────────────────────
const CODE_BASIC = `curl -X POST https://api.weavn.app/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-site.com"}'`

const CODE_ASYNC = `curl -X POST https://api.weavn.app/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-site.com",
    "async": true,
    "webhook_url": "https://your-endpoint.com/hook"
  }'`

const CODE_BATCH = `curl -X POST https://api.weavn.app/v1/scan/batch \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": [
      "https://site1.com",
      "https://site2.com",
      "https://site3.com"
    ],
    "async": true,
    "webhook_url": "https://your-endpoint.com/hook"
  }'`

// ── Status helpers ────────────────────────────────────────────────────────────
function statusColor(status: number | 'blocked'): string {
  if (status === 200) return T.jsonStr
  if (status === 'blocked') return T.sevCrit
  const n = Number(status)
  if (n >= 500) return T.sevCrit
  if (n >= 400) return T.sevHigh
  return T.inkSec
}

function statusText(status: number | 'blocked'): string {
  if (status === 200) return '200 OK'
  if (status === 'blocked') return 'blocked'
  return `${status}`
}

function usageColor(pct: number): string {
  if (pct > 90) return T.sevCrit
  if (pct > 60) return T.sevHigh
  return T.jsonStr
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function DeveloperDashboard() {
  const [keyRevealed, setKeyRevealed]   = useState(false)
  const [keyCopied, setKeyCopied]       = useState(false)
  const [activeTab, setActiveTab]       = useState<0 | 1 | 2>(0)
  const [codeCopied, setCodeCopied]     = useState(false)

  const usagePct = Math.round((PLAN.scans_used / PLAN.scans_total) * 100)
  const uColor = usageColor(usagePct)

  const tabCodes = [CODE_BASIC, CODE_ASYNC, CODE_BATCH]
  const tabLabels: ['Basic scan', 'Async + webhook', 'Batch'] = ['Basic scan', 'Async + webhook', 'Batch']

  function copyKey() {
    navigator.clipboard.writeText(API_KEY_FULL).then(() => {
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 1000)
    })
  }

  function copyCode() {
    navigator.clipboard.writeText(tabCodes[activeTab]).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 1000)
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px 80px' }}>

      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div style={{ padding: '40px 0 32px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: T.jsonMetric, marginBottom: 8 }}>
          API DASHBOARD
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: T.inkPrimary, marginBottom: 16 }}>
          API access. Usage. History.
        </h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, background: 'rgba(111,155,198,0.1)', color: T.jsonMetric, padding: '4px 12px' }}>
            {PLAN.name.toUpperCase()} PLAN
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: T.jsonStr, flexShrink: 0 }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonStr }}>API OPERATIONAL</span>
          </span>
        </div>
      </div>

      {/* ── SECTION 1 — API KEY + PLAN STATUS ────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 600px 400px at 50% 50%, rgba(111,155,198,0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="wd-panel" style={{ padding: 0, position: 'relative', marginBottom: 2 }}>
          {/* Panel header */}
          <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted }}>API KEY</span>
            <button style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
              Rotate key
            </button>
          </div>

          {/* Two-column body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '24px 20px' }}>
            {/* Left — API key */}
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, color: T.jsonStr, marginBottom: 14, letterSpacing: '0.02em' }}>
                {keyRevealed ? API_KEY_FULL : API_KEY_MASKED}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={copyKey}
                  style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: `0.5px solid ${T.jsonMetric}`, color: keyCopied ? T.jsonStr : T.jsonMetric, padding: '6px 14px', background: 'transparent', cursor: 'pointer', borderRadius: 0 }}
                >
                  {keyCopied ? 'COPIED ✓' : 'COPY KEY'}
                </button>
                <button
                  onClick={() => setKeyRevealed(r => !r)}
                  style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: '0.5px solid rgba(255,255,255,0.12)', color: T.inkSec, padding: '6px 14px', background: 'transparent', cursor: 'pointer', borderRadius: 0 }}
                >
                  {keyRevealed ? 'HIDE KEY' : 'SHOW KEY'}
                </button>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>
                Do not expose in client-side code. Server-side only.
              </p>
            </div>

            {/* Right — plan status */}
            <div>
              {/* Plan name */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 4 }}>PLAN</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 16, color: T.inkPrimary }}>{PLAN.name}</div>
              </div>

              {/* Scans usage */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8 }}>SCANS THIS PERIOD</div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${usagePct}%`, background: uColor, transition: 'width 0.6s ease-out' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: uColor }}>{PLAN.scans_used}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted }}>/ {PLAN.scans_total}</span>
                </div>
              </div>

              {/* Resets in */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 4 }}>RESETS IN</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 16, color: T.inkPrimary }}>{PLAN.resets_in}</div>
              </div>

              {/* Overage */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                {PLAN.overage ? (
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.sevHigh }}>
                    Overage: {PLAN.overage.scans} scans · {PLAN.overage.cost} at {PLAN.overage.rate}/scan
                  </span>
                ) : (
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonStr }}>No overage this period</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-separator" style={{ margin: '24px 0' }} />

      {/* ── SECTION 2 — RECENT SCAN REQUESTS ─────────────────────────────── */}
      <div className="wd-panel" style={{ padding: 0, marginBottom: 2 }}>
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted }}>RECENT REQUESTS · LAST 50</span>
          <button style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonMetric, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            Export CSV →
          </button>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 2.8fr 1fr 0.8fr 1fr', padding: '10px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          {['TIMESTAMP', 'URL', 'DURATION', 'COST', 'STATUS'].map(h => (
            <span key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted }}>{h}</span>
          ))}
        </div>

        {REQUESTS.length === 0 ? (
          <div style={{ padding: 32, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted, textAlign: 'center' }}>
            No scan requests yet. POST a URL to get started.
          </div>
        ) : REQUESTS.map((req, i) => {
          const sc = statusColor(req.status)
          return (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1.8fr 2.8fr 1fr 0.8fr 1fr',
                padding: '12px 20px',
                borderBottom: '0.5px solid rgba(255,255,255,0.03)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted }}>{req.timestamp}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonStr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.url}>
                {req.url.length > 40 ? req.url.slice(0, 40) + '…' : req.url}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonMetric }}>{req.duration_ms.toLocaleString()}ms</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkTert }}>{req.cost}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 5, height: 5, background: sc, flexShrink: 0 }} />
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: sc }}>{statusText(req.status)}</span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="section-separator" style={{ margin: '24px 0' }} />

      {/* ── SECTION 3 — WEBHOOK ENDPOINTS ────────────────────────────────── */}
      <div className="wd-panel" style={{ padding: 0, marginBottom: 2 }}>
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted }}>WEBHOOK ENDPOINTS</span>
          <button style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: `0.5px solid ${T.jsonMetric}`, color: T.jsonMetric, padding: '6px 12px', background: 'transparent', cursor: 'pointer', borderRadius: 0 }}>
            ADD WEBHOOK →
          </button>
        </div>

        {WEBHOOKS.length === 0 ? (
          <div style={{ padding: '28px 20px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted }}>No webhooks registered.</div>
            <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, color: T.inkTert, marginTop: 6 }}>Add a webhook to receive scan results asynchronously.</div>
          </div>
        ) : WEBHOOKS.map(wh => {
          const statusOk  = wh.last_status === 200
          const statusNone = wh.last_status === null
          const whColor = statusNone ? T.inkMuted : statusOk ? T.jsonStr : T.sevCrit
          const whText  = statusNone ? 'Not yet called' : statusOk ? '200 OK' : 'Failed'
          return (
            <div key={wh.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: T.jsonStr, marginBottom: 4 }}>{wh.url}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>{wh.events.join(', ')}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: whColor }} />
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: whColor }}>{whText}</span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>{wh.last_at ?? '—'}</div>
                <button style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0 0', display: 'block', marginLeft: 'auto' }}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-separator" style={{ margin: '24px 0' }} />

      {/* ── SECTION 4 — QUICK REFERENCE ──────────────────────────────────── */}
      <div style={{
        background: T.surface,
        borderTop: '1px solid rgba(111,155,198,0.25)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        boxShadow: '0 0 0 1px rgba(111,155,198,0.15), 0 0 30px rgba(111,155,198,0.06)',
        padding: 0,
        marginBottom: 2,
      }}>
        {/* Panel header */}
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted }}>QUICK REFERENCE</span>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex' }}>
          {tabLabels.map((label, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx as 0 | 1 | 2)}
              style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
                padding: '10px 0', marginRight: 20,
                borderBottom: activeTab === idx ? `2px solid ${T.jsonStr}` : '2px solid transparent',
                color: activeTab === idx ? T.inkPrimary : T.inkMuted,
                background: 'transparent', border: 'none',
                borderBottomStyle: 'solid',
                cursor: 'pointer',
                transition: 'color 0.1s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Code */}
        <div style={{ padding: 20 }}>
          <CodeBlock code={tabCodes[activeTab]} language="bash" />
          <button
            onClick={copyCode}
            style={{ marginTop: 12, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: `0.5px solid ${T.jsonMetric}`, color: codeCopied ? T.jsonStr : T.jsonMetric, padding: '5px 12px', background: 'transparent', cursor: 'pointer', borderRadius: 0 }}
          >
            {codeCopied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>

        <div style={{ padding: '0 20px 16px', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted }}>
          Full API reference →{' '}
          <Link href="/docs/api" style={{ color: T.jsonMetric, textDecoration: 'none' }}>
            /docs/api
          </Link>
        </div>
      </div>

      <div className="section-separator" style={{ margin: '24px 0' }} />

      {/* ── SECTION 5 — BILLING ──────────────────────────────────────────── */}
      <div className="wd-panel" style={{ padding: 0 }}>
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted }}>BILLING</span>
          <a
            href="/api/billing/portal"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonMetric, textDecoration: 'none' }}
          >
            Manage billing →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '20px' }}>
          {/* Left */}
          <div>
            {([
              { label: 'CURRENT PLAN',  value: PLAN.name,         mono: false },
              { label: 'NEXT BILLING',  value: PLAN.next_billing,  mono: false },
              { label: 'BILLING EMAIL', value: PLAN.billing_email, mono: true  },
            ] as { label: string; value: string; mono: boolean }[]).map(row => (
              <div key={row.label} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 4 }}>{row.label}</div>
                {row.mono ? (
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: T.inkSec }}>{row.value}</div>
                ) : (
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 15, color: T.inkPrimary }}>{row.value}</div>
                )}
              </div>
            ))}
          </div>

          {/* Right — invoices */}
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 12 }}>RECENT INVOICES</div>
            {INVOICES.length === 0 ? (
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted }}>No invoices yet.</div>
            ) : INVOICES.map((inv, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted }}>{inv.date}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkPrimary }}>{inv.amount}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: inv.status === 'paid' ? T.jsonStr : T.sevCrit }}>
                  {inv.status.toUpperCase()}
                </span>
                <a href={inv.pdf_url} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.jsonMetric, textDecoration: 'none' }}>PDF →</a>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
