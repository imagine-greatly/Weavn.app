'use client'

import { useState } from 'react'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import Label from '@/components/ui/Label'

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

// ── Static data ───────────────────────────────────────────────────────────────

const ALL_SCANS: ScanRow[] = [
  { domain: 'acme-saas.com',  score: 61, findings: 23, time: '2m ago',  severity: 'critical' },
  { domain: 'stripe.com',     score: 78, findings: 11, time: '14m ago', severity: 'high'     },
  { domain: 'notion.so',      score: 71, findings: 15, time: '1h ago',  severity: 'high'     },
  { domain: 'linear.app',     score: 83, findings: 8,  time: '3h ago',  severity: 'medium'   },
  { domain: 'vercel.com',     score: 76, findings: 12, time: '5h ago',  severity: 'high'     },
  { domain: 'framer.com',     score: 69, findings: 17, time: '8h ago',  severity: 'critical' },
  { domain: 'webflow.com',    score: 74, findings: 14, time: '1d ago',  severity: 'high'     },
  { domain: 'ghost.org',      score: 88, findings: 6,  time: '2d ago',  severity: 'low'      },
  { domain: 'figma.com',      score: 55, findings: 19, time: '3d ago',  severity: 'high'     },
  { domain: 'loom.com',       score: 44, findings: 25, time: '4d ago',  severity: 'critical' },
  { domain: 'basecamp.com',   score: 92, findings: 4,  time: '5d ago',  severity: 'low'      },
  { domain: 'intercom.com',   score: 67, findings: 16, time: '6d ago',  severity: 'medium'   },
]

const WEBHOOK_LOG: WebhookLog[] = [
  { status: 200, event: 'scan.completed', url: 'https://your-app.com/webhook', time: '34ms', date: '2m ago'  },
  { status: 200, event: 'scan.completed', url: 'https://your-app.com/webhook', time: '41ms', date: '14m ago' },
  { status: 200, event: 'scan.completed', url: 'https://your-app.com/webhook', time: '28ms', date: '1h ago'  },
  { status: 500, event: 'scan.completed', url: 'https://your-app.com/webhook', time: '—',    date: '3h ago'  },
  { status: 200, event: 'scan.completed', url: 'https://your-app.com/webhook', time: '37ms', date: '5h ago'  },
  { status: 200, event: 'scan.failed',    url: 'https://your-app.com/webhook', time: '29ms', date: '8h ago'  },
]

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
    <span className={`font-mono text-xs px-2 py-0.5 ${method === 'POST' ? 'bg-cyan-dim text-cyan-DEFAULT' : 'bg-background-subtle text-score-low'}`}>
      {method}
    </span>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-8 py-8">

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-px bg-background-border mb-px">
        <div className="bg-background-raised p-6">
          <div className="font-display font-extrabold text-4xl text-text-primary">34</div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-1">SCANS THIS MONTH</div>
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-display font-extrabold text-4xl text-text-primary">$5.10</div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-1">SPENT THIS MONTH</div>
        </div>
        <div className="bg-background-raised p-6">
          <div className="font-display font-extrabold text-4xl text-score-mid">61</div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-1">AVERAGE SCORE</div>
        </div>
      </div>

      {/* API Key block */}
      <div className="bg-background-raised border border-background-border p-6 mt-px mb-px">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">API KEY</div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm text-text-secondary bg-background-subtle border border-background-border px-4 py-2.5 flex-1 min-w-0 truncate">
            wdoc_live_••••••••••••••••••••••••••
          </div>
          <button
            onClick={handleCopy}
            className="border border-background-border text-text-tertiary font-body text-xs px-3 py-2.5 hover:text-text-primary hover:border-text-tertiary transition-colors duration-150 cursor-pointer bg-transparent flex-shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="text-text-tertiary font-body text-xs hover:text-text-primary transition-colors duration-150 bg-transparent border-0 cursor-pointer flex-shrink-0">
            Regenerate →
          </button>
        </div>
        <div className="font-mono text-xs text-text-tertiary mt-3">
          Last used: 2 minutes ago · Created: Jun 1, 2026
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-background-raised border border-background-border mt-px">
        <div className="px-6 py-4 border-b border-background-border flex justify-between items-center">
          <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">RECENT SCANS</span>
          <span className="font-body text-xs text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors duration-150">
            View all →
          </span>
        </div>
        {ALL_SCANS.slice(0, 8).map((row, i) => (
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

function ScansTab() {
  const [search, setSearch]           = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [sort, setSort]               = useState('newest')

  const filtered = ALL_SCANS
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

function ApiKeysTab() {
  const [spendLimit, setSpendLimit] = useState('')

  return (
    <div className="px-8 py-8">

      <div className="bg-background-raised border border-background-border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">PRODUCTION KEY</div>
          <button className="font-body text-xs text-severity-critical hover:underline cursor-pointer bg-transparent border-0">
            Revoke
          </button>
        </div>

        <div className="font-mono text-sm text-text-secondary bg-background-subtle border border-background-border px-4 py-3 w-full mt-3">
          wdoc_live_••••••••••••••••••••••••••
        </div>

        <div className="flex gap-6 mt-4">
          <span className="font-mono text-xs text-text-tertiary">Created Jun 1, 2026</span>
          <span className="font-mono text-xs text-text-tertiary">Last used 2m ago</span>
          <span className="font-mono text-xs text-text-tertiary">All permissions</span>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-background-border">
          <span className="font-mono text-xs text-text-tertiary flex-shrink-0">MONTHLY SPENDING LIMIT</span>
          <input
            type="text"
            placeholder="$50.00"
            value={spendLimit}
            onChange={e => setSpendLimit(e.target.value)}
            className="bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-3 py-2 w-32 outline-none"
          />
          <button className="border border-background-border font-body text-xs text-text-secondary px-3 py-2 cursor-pointer bg-transparent hover:text-text-primary transition-colors duration-150">
            Save
          </button>
        </div>
      </div>

      <Link
        href="/developer/keys"
        className="bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-sm px-5 py-2.5 no-underline inline-block hover:opacity-90 transition-opacity duration-150"
      >
        Create new key →
      </Link>

    </div>
  )
}

// ── Webhooks Tab ──────────────────────────────────────────────────────────────

function WebhooksTab() {
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
        <button className="bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-sm px-5 py-2.5 mt-4 cursor-pointer border-0 hover:opacity-90 transition-opacity duration-150">
          Register endpoint
        </button>
      </div>

      {/* Delivery log */}
      <div className="bg-background-raised border border-background-border">
        <div className="px-6 py-4 border-b border-background-border">
          <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">DELIVERY LOG</span>
        </div>
        {WEBHOOK_LOG.map((log, i) => (
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
              <span className="font-body text-xs text-cyan-DEFAULT cursor-pointer hover:underline flex-shrink-0">
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
          <span className="text-cyan-DEFAULT">curl</span>
          <span className="text-text-tertiary">{' -X POST https://webdocai.com/api/v1/scan \\\n  -H "Authorization: Bearer '}</span>
          <span className="text-score-high">wdoc_live_••••</span>
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
          <span className="text-cyan-DEFAULT">curl</span>
          <span className="text-text-tertiary">{' -X POST https://webdocai.com/api/v1/scan/batch \\\n  -H "Authorization: Bearer '}</span>
          <span className="text-score-high">wdoc_live_••••</span>
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
          <span className="text-cyan-DEFAULT">curl</span>
          <span className="text-text-tertiary">{' https://webdocai.com/api/v1/scans/'}</span>
          <span className="text-score-high">scan_01HXYZ7K2M9N3P4Q</span>
          <span className="text-text-tertiary">{' \\\n  -H "Authorization: Bearer '}</span>
          <span className="text-score-high">wdoc_live_••••</span>
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
        className="font-body text-sm text-cyan-DEFAULT mt-6 inline-block no-underline hover:opacity-80 transition-opacity duration-150"
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
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="flex h-screen overflow-hidden bg-background-base">

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 bg-background-raised border-r border-background-border flex flex-col h-full">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-background-border">
          <Link href="/" className="font-display font-extrabold text-sm text-text-primary no-underline">
            webdoc<span className="text-cyan-DEFAULT">.ai</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-2.5 font-body text-sm cursor-pointer transition-colors duration-150 bg-transparent text-left border-0 border-l-2 ${
                activeTab === item.id
                  ? 'bg-background-interactive text-text-primary border-cyan-DEFAULT'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-interactive border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Usage block */}
        <div className="px-6 py-5 border-t border-background-border">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">THIS MONTH</div>
          <div className="font-display font-extrabold text-2xl text-text-primary">34</div>
          <div className="font-mono text-xs text-text-tertiary">of unlimited · $5.10 spent</div>
          <div className="relative w-full h-px bg-background-border mt-3">
            <div className="absolute top-0 left-0 h-full bg-cyan-DEFAULT" style={{ width: '10%' }} />
          </div>
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
            className="bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-xs px-4 py-2 no-underline hover:opacity-90 transition-opacity duration-150"
          >
            New scan →
          </Link>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto bg-background-base">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'scans'    && <ScansTab />}
          {activeTab === 'apikeys'  && <ApiKeysTab />}
          {activeTab === 'webhooks' && <WebhooksTab />}
          {activeTab === 'docs'     && <DocsTab />}
        </div>

      </div>
    </div>
  )
}
