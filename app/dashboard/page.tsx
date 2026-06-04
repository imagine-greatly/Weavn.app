'use client'

import { useState } from 'react'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import Label from '@/components/ui/Label'

// ── Types ─────────────────────────────────────────────────────────────────────

type DashTabId = 'clients' | 'reports' | 'scheduled' | 'settings'

interface Client {
  name: string
  domain: string
  score: number
  delta: number | null
  lastScan: string
  nextScan: string
  frequency: 'Weekly' | 'Monthly' | 'Off'
}

// ── Static data ───────────────────────────────────────────────────────────────

const CLIENTS: Client[] = [
  { name: 'Acme SaaS',      domain: 'acme-saas.com',     score: 61, delta: 8,    lastScan: 'Jun 1, 2026',  nextScan: 'Jun 10, 2026', frequency: 'Weekly'  },
  { name: 'TechFlow',       domain: 'techflow.io',        score: 74, delta: 3,    lastScan: 'Jun 1, 2026',  nextScan: 'Jun 10, 2026', frequency: 'Weekly'  },
  { name: 'Buildspace',     domain: 'buildspace.so',      score: 48, delta: -3,   lastScan: 'Jun 1, 2026',  nextScan: 'Jul 1, 2026',  frequency: 'Monthly' },
  { name: 'Lemon Squeezy',  domain: 'lemonsqueezy.com',   score: 82, delta: 11,   lastScan: 'Jun 1, 2026',  nextScan: 'Jun 10, 2026', frequency: 'Weekly'  },
  { name: 'Pika',           domain: 'pika.art',           score: 55, delta: null, lastScan: 'May 20, 2026', nextScan: '—',            frequency: 'Off'     },
  { name: 'Loops',          domain: 'loops.so',           score: 79, delta: 5,    lastScan: 'Jun 1, 2026',  nextScan: 'Jun 10, 2026', frequency: 'Weekly'  },
  { name: 'Tally',          domain: 'tally.so',           score: 66, delta: -2,   lastScan: 'Jun 1, 2026',  nextScan: 'Jul 1, 2026',  frequency: 'Monthly' },
  { name: 'Mintlify',       domain: 'mintlify.com',       score: 91, delta: 4,    lastScan: 'Jun 1, 2026',  nextScan: 'Jun 10, 2026', frequency: 'Weekly'  },
]

const REPORT_ROWS = [
  { client: 'Acme SaaS',     url: 'webdocai.com/r/a3x9', generated: 'Jun 3, 2026',  views: 14 },
  { client: 'TechFlow',      url: 'webdocai.com/r/b7k2', generated: 'Jun 1, 2026',  views: 7  },
  { client: 'Buildspace',    url: 'webdocai.com/r/c5m8', generated: 'May 28, 2026', views: 23 },
  { client: 'Lemon Squeezy', url: 'webdocai.com/r/d2n1', generated: 'May 25, 2026', views: 31 },
  { client: 'Loops',         url: 'webdocai.com/r/e9p4', generated: 'May 20, 2026', views: 5  },
  { client: 'Mintlify',      url: 'webdocai.com/r/f4q7', generated: 'May 15, 2026', views: 41 },
]

const TAB_TITLES: Record<DashTabId, string> = {
  clients:   'Clients',
  reports:   'Reports',
  scheduled: 'Scheduled',
  settings:  'Settings',
}

const SPARKLINE_PTS = [53, 55, 58, 53, 61, 61]
const SPARK_DATES   = ['Apr 1', 'Apr 15', 'May 1', 'May 15', 'Jun 1', 'Jun 3']

function sparkPoints(data: number[]): string {
  const W = 200, H = 48, PAD = 4
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = PAD + ((max - v) / range) * (H - PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex flex-shrink-0 cursor-pointer border-0 transition-colors duration-150 ${
        checked ? 'bg-cyan-DEFAULT' : 'bg-background-border'
      }`}
      style={{ width: 40, height: 20 }}
    >
      <span
        className="absolute top-0.5 bg-background-base transition-transform duration-150"
        style={{ width: 16, height: 16, transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ── Sidebar icons ─────────────────────────────────────────────────────────────

function IconClients() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 14c0-3 2-4 5-4s5 1 5 4" />
      <path d="M11 7c1.5 0 3 .8 3 3" />
      <circle cx="11" cy="4.5" r="2" />
    </svg>
  )
}

function IconReports() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="12" height="12" />
      <line x1="5" y1="6"  x2="11" y2="6"  />
      <line x1="5" y1="9"  x2="11" y2="9"  />
      <line x1="5" y1="12" x2="8"  y2="12" />
    </svg>
  )
}

function IconScheduled() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="3" width="12" height="11" />
      <line x1="5" y1="1" x2="5" y2="5"  />
      <line x1="11" y1="1" x2="11" y2="5" />
      <line x1="2" y1="7" x2="14" y2="7"  />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l1.41-1.41M3.05 12.95l1.41-1.41" />
    </svg>
  )
}

// ── Clients Tab ───────────────────────────────────────────────────────────────

function ClientsTab({
  onSelectClient,
}: {
  onSelectClient: (c: Client) => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = CLIENTS
    .filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.domain.toLowerCase().includes(search.toLowerCase())
    )
    .filter(c => {
      if (filter === 'improving') return c.delta !== null && c.delta > 0
      if (filter === 'declining') return c.delta !== null && c.delta < 0
      if (filter === 'not-scanned') return false
      return true
    })

  return (
    <div className="px-8 py-8">
      {/* Filter bar */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-4 py-2.5 placeholder:text-text-tertiary outline-none"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-4 py-2.5 outline-none cursor-pointer"
        >
          <option value="all">All clients</option>
          <option value="improving">Improving</option>
          <option value="declining">Declining</option>
          <option value="not-scanned">Not scanned</option>
        </select>
      </div>

      {/* Client grid */}
      <div className="grid grid-cols-2 gap-px bg-background-border">
        {filtered.map(client => (
          <div
            key={client.domain}
            onClick={() => onSelectClient(client)}
            className="bg-background-raised p-6 hover:bg-background-interactive transition-colors duration-200 cursor-pointer"
          >
            {/* Top row */}
            <div className="flex justify-between items-start">
              <div className="min-w-0 pr-4">
                <div className="font-body text-sm font-semibold text-text-primary">{client.name}</div>
                <div className="font-mono text-xs text-text-tertiary mt-0.5">{client.domain}</div>
              </div>
              <ScoreRing score={client.score} size="sm" animated={false} />
            </div>

            {/* Delta */}
            <div className="flex items-center gap-2 mt-4">
              {client.delta === null ? (
                <span className="font-mono text-xs text-text-tertiary">No change</span>
              ) : client.delta > 0 ? (
                <span className="font-mono text-xs px-2 py-0.5 bg-score-high/10 text-score-high">
                  ↑ {client.delta} since last scan
                </span>
              ) : (
                <span className="font-mono text-xs px-2 py-0.5 bg-severity-critical/10 text-severity-critical">
                  ↓ {Math.abs(client.delta)} since last scan
                </span>
              )}
            </div>

            <div className="font-mono text-xs text-text-tertiary mt-2">Last scan: {client.lastScan}</div>
            <div className="font-mono text-xs text-text-tertiary">Next: {client.nextScan} ({client.frequency.toLowerCase()})</div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-background-border">
              <button
                onClick={e => { e.stopPropagation() }}
                className="border border-background-border font-body text-xs text-text-secondary px-3 py-1.5 hover:text-text-primary transition-colors duration-150 bg-transparent cursor-pointer"
              >
                View report
              </button>
              <button
                onClick={e => { e.stopPropagation() }}
                className="border border-cyan-DEFAULT font-body text-xs text-cyan-DEFAULT px-3 py-1.5 bg-transparent cursor-pointer hover:bg-cyan-glow transition-colors duration-150"
              >
                Generate link →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Client Drawer ─────────────────────────────────────────────────────────────

function ClientDrawer({
  client,
  open,
  onClose,
}: {
  client: Client | null
  open: boolean
  onClose: () => void
}) {
  const [linkGenerated, setLinkGenerated] = useState(false)
  const pts = sparkPoints(SPARKLINE_PTS)

  const sparkCoords = SPARKLINE_PTS.map((v, i) => {
    const W = 200, H = 48, PAD = 4
    const min = Math.min(...SPARKLINE_PTS), max = Math.max(...SPARKLINE_PTS)
    const range = max - min || 1
    return {
      x: parseFloat(((i / (SPARKLINE_PTS.length - 1)) * W).toFixed(1)),
      y: parseFloat((PAD + ((max - v) / range) * (H - PAD * 2)).toFixed(1)),
    }
  })

  const SCAN_HISTORY = [
    { date: 'Jun 3, 2026', score: 61, findings: 23 },
    { date: 'May 27, 2026', score: 53, findings: 27 },
    { date: 'May 13, 2026', score: 58, findings: 19 },
    { date: 'Apr 29, 2026', score: 55, findings: 22 },
  ]

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-[520px] bg-background-raised border-l border-background-border z-50 overflow-y-auto transition-transform duration-[250ms] ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {!client ? null : (
          <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative">
              <div>
                <div className="font-display font-extrabold text-2xl text-text-primary">{client.name}</div>
                <div className="font-mono text-xs text-text-tertiary mt-1">{client.domain}</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={client.score} size="lg" animated={true} />
              </div>
              <button
                onClick={onClose}
                className="absolute top-0 right-0 text-text-tertiary hover:text-text-primary transition-colors duration-150 bg-transparent border-0 cursor-pointer text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Score history sparkline */}
            <div className="mb-8">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">SCORE HISTORY</div>
              <svg width="200" height="48" viewBox="0 0 200 48" className="overflow-visible">
                <polyline
                  points={pts}
                  fill="none"
                  stroke="#00C8FF"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {sparkCoords.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill="#00C8FF" />
                ))}
              </svg>
              <div className="flex justify-between mt-2" style={{ width: 200 }}>
                {SPARK_DATES.map(d => (
                  <span key={d} className="font-mono text-[9px] text-text-tertiary">{d}</span>
                ))}
              </div>
            </div>

            {/* Scan history */}
            <div className="mb-8">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">SCAN HISTORY</div>
              {SCAN_HISTORY.map((s, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-background-border last:border-0">
                  <span className="font-mono text-xs text-text-tertiary w-24 flex-shrink-0">{s.date}</span>
                  <ScoreRing score={s.score} size="sm" animated={false} />
                  <span className="font-mono text-xs text-text-secondary">{s.findings} findings</span>
                  <Link href="/report" className="font-body text-xs text-cyan-DEFAULT ml-auto no-underline hover:opacity-80">
                    View →
                  </Link>
                </div>
              ))}
            </div>

            {/* White-label report */}
            <div className="bg-background-subtle border border-background-border p-5">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">WHITE-LABEL REPORT</div>
              {linkGenerated ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-text-secondary bg-background-base border border-background-border px-4 py-3 flex-1 min-w-0 truncate">
                      webdocai.com/r/{client.domain.split('.')[0].slice(0, 4)}x9
                    </div>
                    <button className="border border-background-border font-body text-xs text-text-secondary px-3 py-3 bg-transparent cursor-pointer hover:text-text-primary transition-colors duration-150 flex-shrink-0">
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={() => setLinkGenerated(false)}
                    className="font-body text-xs text-text-tertiary mt-3 bg-transparent border-0 cursor-pointer hover:text-text-primary transition-colors duration-150"
                  >
                    Regenerate
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setLinkGenerated(true)}
                  className="w-full bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-sm py-2.5 border-0 cursor-pointer hover:opacity-90 transition-opacity duration-150"
                >
                  Generate link →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  return (
    <div className="px-8 py-8">
      <div className="bg-background-raised border border-background-border">
        <div className="grid grid-cols-[2fr_2fr_1fr_80px_120px] px-6 py-3 border-b border-background-border">
          {['CLIENT', 'REPORT URL', 'GENERATED', 'VIEWS', 'ACTIONS'].map(h => (
            <div key={h} className="font-mono text-xs text-text-tertiary uppercase tracking-widest">{h}</div>
          ))}
        </div>
        {REPORT_ROWS.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_2fr_1fr_80px_120px] items-center px-6 py-4 border-b border-background-border last:border-0 hover:bg-background-interactive transition-colors duration-150"
          >
            <div className="font-mono text-xs text-text-secondary">{row.client}</div>
            <div className="font-mono text-xs text-text-tertiary truncate pr-4">{row.url}</div>
            <div className="font-mono text-xs text-text-tertiary">{row.generated}</div>
            <div className="font-mono text-xs text-text-secondary">{row.views}</div>
            <div className="flex gap-3">
              <button className="font-body text-xs text-cyan-DEFAULT bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity duration-150">
                Copy
              </button>
              <button className="font-body text-xs text-text-tertiary bg-transparent border-0 cursor-pointer hover:text-text-secondary transition-colors duration-150">
                Regenerate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Scheduled Tab ─────────────────────────────────────────────────────────────

function ScheduledTab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(CLIENTS.map(c => [c.domain, c.frequency !== 'Off']))
  )

  return (
    <div className="px-8 py-8">
      <div className="bg-background-raised border border-background-border">
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_80px] px-6 py-3 border-b border-background-border">
          {['CLIENT DOMAIN', 'FREQUENCY', 'NEXT SCAN', 'LAST SCORE', 'ON'].map(h => (
            <div key={h} className="font-mono text-xs text-text-tertiary uppercase tracking-widest">{h}</div>
          ))}
        </div>
        {CLIENTS.map((client, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1.5fr_1fr_80px] items-center px-6 py-4 border-b border-background-border last:border-0"
          >
            <div className="font-mono text-xs text-text-secondary">{client.domain}</div>
            <div className="font-mono text-xs text-text-tertiary">{client.frequency}</div>
            <div className={`font-mono text-xs ${client.frequency === 'Off' ? 'text-text-tertiary' : 'text-text-secondary'}`}>
              {client.nextScan}
            </div>
            <div className="flex items-center">
              <ScoreRing score={client.score} size="sm" animated={false} />
            </div>
            <Toggle
              checked={!!enabled[client.domain]}
              onChange={v => setEnabled(prev => ({ ...prev, [client.domain]: v }))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [agencyName, setAgencyName] = useState('My Agency')
  const [email, setEmail]           = useState('hello@myagency.com')
  const [whiteLabelOn, setWhiteLabelOn] = useState(true)

  const inputCls = 'w-full bg-background-subtle border border-background-border font-body text-sm text-text-primary px-4 py-2.5 outline-none placeholder:text-text-tertiary'

  return (
    <div className="px-8 py-8">

      {/* Agency details */}
      <div className="bg-background-raised border border-background-border p-6 mb-px">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">AGENCY DETAILS</div>
        <div className="flex flex-col gap-3 max-w-md">
          <input
            type="text"
            placeholder="Agency name"
            value={agencyName}
            onChange={e => setAgencyName(e.target.value)}
            className={inputCls}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls}
          />
          <button className="bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-sm px-5 py-2.5 border-0 cursor-pointer hover:opacity-90 transition-opacity duration-150 self-start mt-2">
            Save
          </button>
        </div>
      </div>

      {/* White-label */}
      <div className="bg-background-raised border border-background-border p-6 mb-px">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">WHITE-LABEL</div>
        <label className="flex items-center gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={whiteLabelOn}
            onChange={e => setWhiteLabelOn(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-body text-sm text-text-secondary">
            Remove webdoc.ai branding from reports
          </span>
        </label>
        <div className="border-2 border-dashed border-background-border p-8 text-center cursor-pointer hover:border-text-tertiary transition-colors duration-150">
          <p className="font-body text-sm text-text-tertiary">
            Drop logo here or click to upload. PNG or SVG, min 200px wide.
          </p>
        </div>
      </div>

      {/* Billing */}
      <div className="bg-background-raised border border-background-border p-6 mb-px">
        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">BILLING</div>
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex gap-8">
            <span className="font-mono text-xs text-text-tertiary">Current plan</span>
            <span className="font-mono text-xs text-text-secondary">Agency — $99/month</span>
          </div>
          <div className="flex gap-8">
            <span className="font-mono text-xs text-text-tertiary">Next billing</span>
            <span className="font-mono text-xs text-text-secondary">Jul 1, 2026</span>
          </div>
          <div className="flex gap-8">
            <span className="font-mono text-xs text-text-tertiary">Scans</span>
            <span className="font-mono text-xs text-text-secondary">34 of 50 used</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <Link href="/billing" className="font-body text-sm text-cyan-DEFAULT no-underline hover:opacity-80 transition-opacity duration-150">
            Manage billing →
          </Link>
          <button className="font-body text-xs text-severity-critical bg-transparent border-0 cursor-pointer hover:underline">
            Cancel plan
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────

const DASH_NAV: Array<{ id: DashTabId; label: string; icon: React.ReactNode }> = [
  { id: 'clients',   label: 'Clients',   icon: <IconClients />   },
  { id: 'reports',   label: 'Reports',   icon: <IconReports />   },
  { id: 'scheduled', label: 'Scheduled', icon: <IconScheduled /> },
  { id: 'settings',  label: 'Settings',  icon: <IconSettings />  },
]

// ── Main export ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab]   = useState<DashTabId>('clients')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function openDrawer(client: Client) {
    setSelectedClient(client)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-base">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-[240px] flex-shrink-0 bg-background-raised border-r border-background-border flex flex-col h-full">

        <div className="px-6 py-5 border-b border-background-border">
          <Link href="/" className="font-display font-extrabold text-sm text-text-primary no-underline">
            webdoc<span className="text-cyan-DEFAULT">.ai</span>
          </Link>
        </div>

        <nav className="flex-1 py-4">
          {DASH_NAV.map(item => (
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

        {/* Plan block */}
        <div className="px-6 py-5 border-t border-background-border">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">AGENCY PLAN</div>
          <div className="font-display font-extrabold text-2xl text-text-primary">$99<span className="font-body text-sm font-normal text-text-tertiary">/mo</span></div>
          <div className="font-mono text-xs text-text-tertiary mt-1">50 scans · 34 used</div>
          <div className="relative w-full h-px bg-background-border mt-3">
            <div className="absolute top-0 left-0 h-full bg-cyan-DEFAULT" style={{ width: '68%' }} />
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
          <button className="bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-xs px-4 py-2 border-0 cursor-pointer hover:opacity-90 transition-opacity duration-150">
            Add client →
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto bg-background-base">
          {activeTab === 'clients'   && <ClientsTab onSelectClient={openDrawer} />}
          {activeTab === 'reports'   && <ReportsTab />}
          {activeTab === 'scheduled' && <ScheduledTab />}
          {activeTab === 'settings'  && <SettingsTab />}
        </div>

      </div>

      {/* ── Client Drawer ────────────────────────────────────────────────── */}
      <ClientDrawer client={selectedClient} open={drawerOpen} onClose={closeDrawer} />

    </div>
  )
}
