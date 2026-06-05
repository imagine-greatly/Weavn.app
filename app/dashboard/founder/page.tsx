'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab      = 'overview' | 'scan-history' | 'findings' | 'benchmarks' | 'settings'
type Severity = 'critical' | 'high' | 'medium'
type Status   = 'open' | 'fixed'

interface Finding {
  id: string
  title: string
  severity: Severity
  dimension: string
  explanation: string
  recommendation: string
}

interface ScanEntry {
  date: string
  score: number
  change: number | null
  findings: number
}

interface BenchmarkEntry {
  yours: number
  avg: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOCK_FINDINGS: Finding[] = [
  {
    id: 'MSG_001',
    title: 'Hero headline is product-focused, not outcome-focused',
    severity: 'critical',
    dimension: 'message_clarity',
    explanation:
      'Your headline leads with what the product is rather than what the user gains. Outcome-led headlines convert 23% better on average across SaaS landing pages.',
    recommendation:
      'Rewrite to lead with the result the user experiences. Instead of naming the product category, name the transformation.',
  },
  {
    id: 'TRS_001',
    title: 'No social proof visible in first viewport',
    severity: 'high',
    dimension: 'trust_signals',
    explanation:
      'Trust signals positioned below the fold are ignored by 76% of visitors who bounce before scrolling.',
    recommendation:
      'Move at least one trust signal above the fold — customer count, recognizable logo row, or a single sharp testimonial.',
  },
  {
    id: 'CTA_002',
    title: 'Primary CTA copy is generic',
    severity: 'high',
    dimension: 'conversion_architecture',
    explanation:
      "CTAs using generic verbs like 'Get Started' underperform specific action CTAs by 14–32%.",
    recommendation:
      'Replace with a specific outcome CTA that matches exactly what happens when they click.',
  },
  {
    id: 'TRS_003',
    title: 'No risk reversal visible near primary CTA',
    severity: 'medium',
    dimension: 'trust_signals',
    explanation:
      'Risk reversals placed within 100px of the primary CTA reduce friction and increase clicks by 8–15%.',
    recommendation:
      'Add a one-line friction reducer directly below your CTA button.',
  },
  {
    id: 'MSG_003',
    title: 'Value proposition requires prior category knowledge',
    severity: 'medium',
    dimension: 'message_clarity',
    explanation:
      'Your above-fold copy assumes visitors already know what your product category does. Cold traffic needs category context.',
    recommendation:
      'Add a one-sentence explainer that a stranger with no context could understand in under 5 seconds.',
  },
]

const SCAN_HISTORY: ScanEntry[] = [
  { date: 'Jun 4, 2026',  score: 61, change: 0,    findings: 5  },
  { date: 'Jun 2, 2026',  score: 61, change: 3,    findings: 5  },
  { date: 'May 21, 2026', score: 58, change: 7,    findings: 6  },
  { date: 'May 9, 2026',  score: 51, change: 0,    findings: 8  },
  { date: 'Apr 28, 2026', score: 51, change: 7,    findings: 8  },
  { date: 'Apr 12, 2026', score: 44, change: null, findings: 11 },
]

const CHART_SCORES = [44, 51, 51, 58, 61, 61]
const CHART_DATES  = ['Apr 12', 'Apr 28', 'May 9', 'May 21', 'Jun 2', 'Jun 4']

const BENCHMARK_DATA: Record<string, BenchmarkEntry> = {
  conversion_architecture: { yours: 48, avg: 62 },
  trust_signals:           { yours: 55, avg: 61 },
  message_clarity:         { yours: 52, avg: 65 },
  traffic_readiness:       { yours: 71, avg: 58 },
  technical_foundation:    { yours: 68, avg: 63 },
}

const NAV_ITEMS: { key: Tab; label: string }[] = [
  { key: 'overview',      label: 'Overview'      },
  { key: 'scan-history',  label: 'Scan History'  },
  { key: 'findings',      label: 'Findings'      },
  { key: 'benchmarks',    label: 'Benchmarks'    },
  { key: 'settings',      label: 'Settings'      },
]

const TAB_LABELS: Record<Tab, string> = {
  'overview':      'Overview',
  'scan-history':  'Scan History',
  'findings':      'Findings',
  'benchmarks':    'Benchmarks',
  'settings':      'Settings',
}

// ── SVG chart helpers ─────────────────────────────────────────────────────────

const CL = 40    // chart left padding
const CT = 10    // chart top padding
const CW = 540   // chart usable width (600 - CL - 20)
const CH = 152   // chart usable height (192 - CT - 30)

function scoreToSvgY(score: number): number {
  return CT + CH - (score / 100) * CH
}

function indexToSvgX(i: number, total: number): number {
  return CL + (i / (total - 1)) * CW
}

function smoothLinePath(scores: number[]): string {
  const n = scores.length
  if (n < 2) return ''
  const pts: [number, number][] = scores.map((s, i) => [
    indexToSvgX(i, n),
    scoreToSvgY(s),
  ])
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < n; i++) {
    const prev     = pts[i - 1]
    const curr     = pts[i]
    const prevPrev = pts[Math.max(0, i - 2)]
    const next     = pts[Math.min(n - 1, i + 1)]
    const cp1x = prev[0] + (curr[0] - prevPrev[0]) * 0.3
    const cp1y = prev[1] + (curr[1] - prevPrev[1]) * 0.3
    const cp2x = curr[0] - (next[0] - prev[0]) * 0.3
    const cp2y = curr[1] - (next[1] - prev[1]) * 0.3
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`
  }
  return d
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function barHex(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#facc15'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function formatDimension(key: string): string {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SEVERITY_DOTS: Record<Severity, string> = {
  critical: 'bg-red-400',
  high:     'bg-amber-400',
  medium:   'bg-yellow-400',
}

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: 'text-red-400 border border-red-400/30',
  high:     'text-amber-400 border border-amber-400/30',
  medium:   'text-yellow-400 border border-yellow-400/30',
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`font-mono text-xs uppercase px-2 py-0.5 ${SEVERITY_BADGE[severity]}`}>
      {severity}
    </span>
  )
}

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative flex-shrink-0 cursor-pointer border-0 rounded-full transition-colors ${
        active ? 'bg-cyan-DEFAULT' : 'bg-background-border'
      }`}
      style={{ width: 40, height: 24 }}
    >
      <span
        className="absolute top-1 rounded-full transition-all"
        style={{
          width:           16,
          height:          16,
          backgroundColor: active ? '#050810' : '#2D3748',
          left:            active ? 20 : 4,
        }}
      />
    </button>
  )
}

function ChangeCell({ change }: { change: number | null }) {
  if (change === null || change === 0) {
    return <span className="text-text-tertiary">—</span>
  }
  if (change > 0) {
    return <span className="text-green-400">+{change}</span>
  }
  return <span className="text-red-400">{change}</span>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FounderDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [mounted, setMounted]     = useState(false)

  const [findingStatuses, setFindingStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(MOCK_FINDINGS.map(f => [f.id, 'open' as Status]))
  )
  const [weeklyDigest, setWeeklyDigest]       = useState(true)
  const [scoreDropAlerts, setScoreDropAlerts] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  function toggleFindingStatus(id: string) {
    setFindingStatuses(prev => ({
      ...prev,
      [id]: prev[id] === 'open' ? 'fixed' : 'open',
    }))
  }

  const linePath   = smoothLinePath(CHART_SCORES)
  const lastScore  = CHART_SCORES[CHART_SCORES.length - 1]
  const firstScore = CHART_SCORES[0]
  const delta      = lastScore - firstScore
  const n          = CHART_SCORES.length
  const lastX      = indexToSvgX(n - 1, n)
  const lastY      = scoreToSvgY(lastScore)

  const gridScores = [25, 50, 75, 100]

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background-base">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 border-r border-background-border bg-background-base flex flex-col">

        {/* Site identity */}
        <div className="px-5 pt-6 pb-5 border-b border-background-border flex-shrink-0">
          <div className="font-display font-bold text-base text-text-primary">
            yoursite.com
          </div>
          <div className="font-mono text-xs text-text-tertiary mt-1">
            Score{'  '}
            <span className="text-cyan-DEFAULT">61</span>
          </div>
          <div className="font-mono text-xs text-text-tertiary mt-1">Starter</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-5 py-3 font-body text-sm text-left bg-transparent border-0 cursor-pointer transition-colors ${
                activeTab === item.key
                  ? 'text-text-primary bg-background-raised border-r-2 border-cyan-DEFAULT'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-raised/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Usage */}
        <div className="border-t border-background-border px-5 py-4 flex-shrink-0">
          <div className="font-mono text-xs text-text-tertiary mb-2">
            SCANS THIS MONTH
          </div>
          <div className="w-full h-1 bg-background-border rounded-full mb-1 overflow-hidden">
            <div
              className="h-full bg-cyan-DEFAULT rounded-full"
              style={{ width: mounted ? '40%' : '0%', transition: 'width 700ms ease-out' }}
            />
          </div>
          <div className="font-mono text-xs text-text-tertiary">8 / 20 used</div>
          <div className="font-mono text-xs text-text-tertiary mt-3">Resets Jul 1</div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 h-12 border-b border-background-border px-8 flex items-center justify-between">
          <span className="font-display font-semibold text-base text-text-primary">
            {TAB_LABELS[activeTab]}
          </span>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-text-tertiary">
              Last scanned 3 days ago
            </span>
            <button className="border border-background-border font-mono text-xs text-text-primary px-4 py-1.5 bg-transparent cursor-pointer hover:border-cyan-DEFAULT transition-colors">
              RESCAN
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── OVERVIEW ───────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="px-8 py-8">

              {/* Score trend */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">
                    SCORE OVER TIME
                  </span>
                  <span className="font-mono text-xs text-text-tertiary">Last 6 scans</span>
                </div>

                <div className="w-full relative" style={{ height: 192 }}>
                  <svg width="100%" height="192" viewBox="0 0 600 192" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {gridScores.map(s => {
                      const y = scoreToSvgY(s)
                      return (
                        <g key={s}>
                          <line x1={CL} y1={y} x2={CL + CW} y2={y} stroke="#1a1f2e" strokeWidth={1} />
                          <text
                            x={CL - 6} y={y} textAnchor="end" dominantBaseline="middle"
                            fontSize={10} fill="#2D3748" fontFamily="'IBM Plex Mono', monospace"
                          >
                            {s}
                          </text>
                        </g>
                      )
                    })}
                    {/* X axis labels */}
                    {CHART_DATES.map((label, i) => (
                      <text
                        key={i}
                        x={indexToSvgX(i, n)}
                        y={192 - 6}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#2D3748"
                        fontFamily="'IBM Plex Mono', monospace"
                      >
                        {label}
                      </text>
                    ))}
                    {/* Line */}
                    <path
                      d={linePath}
                      stroke="#00C8FF"
                      strokeWidth={2}
                      fill="none"
                      style={{
                        strokeDasharray: 3000,
                        strokeDashoffset: mounted ? 0 : 3000,
                        transition: 'stroke-dashoffset 1.2s ease-out',
                      }}
                    />
                    {/* Regular dots */}
                    {CHART_SCORES.slice(0, -1).map((s, i) => (
                      <circle
                        key={i}
                        cx={indexToSvgX(i, n)}
                        cy={scoreToSvgY(s)}
                        r={4}
                        fill="#00C8FF"
                        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease-out' }}
                      />
                    ))}
                    {/* Last dot glow ring */}
                    <circle cx={lastX} cy={lastY} r={10} fill="none" stroke="#00C8FF" strokeOpacity={0.3}
                      style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease-out' }}
                    />
                    <circle cx={lastX} cy={lastY} r={6} fill="#00C8FF"
                      style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease-out' }}
                    />
                  </svg>
                </div>

                <div className="text-right mt-1">
                  <span className="font-mono text-sm text-green-400">
                    +{delta} since first scan
                  </span>
                </div>
              </div>

              {/* Stat boxes */}
              <div className="grid grid-cols-3 gap-px bg-background-border mb-10">
                {[
                  { label: 'CURRENT SCORE', value: '61', sub: 'Below average' },
                  { label: 'INDUSTRY RANK', value: '34th', sub: 'Percentile · SaaS' },
                  { label: 'OPEN FINDINGS', value: '5', sub: '2 critical' },
                ].map(box => (
                  <div key={box.label} className="bg-background-base p-5">
                    <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">
                      {box.label}
                    </div>
                    <div className="font-display font-bold text-3xl text-text-primary">
                      {box.value}
                    </div>
                    <div className="font-mono text-xs text-text-tertiary mt-1">{box.sub}</div>
                  </div>
                ))}
              </div>

              {/* Top findings */}
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">
                OPEN FINDINGS&nbsp;&nbsp;·&nbsp;&nbsp;TOP 3
              </div>
              {MOCK_FINDINGS.slice(0, 3).map(f => (
                <div
                  key={f.id}
                  className="flex items-start gap-4 py-4 border-b border-background-border"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${SEVERITY_DOTS[f.severity]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm text-text-primary truncate">{f.title}</div>
                    <div className="font-mono text-xs text-text-tertiary mt-0.5">
                      {f.dimension}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-text-tertiary flex-shrink-0">{f.id}</span>
                </div>
              ))}
              <button
                onClick={() => setActiveTab('findings')}
                className="font-mono text-xs text-cyan-DEFAULT hover:underline mt-4 block bg-transparent border-0 cursor-pointer p-0"
              >
                View all findings →
              </button>
            </div>
          )}

          {/* ── SCAN HISTORY ────────────────────────────────────────────── */}
          {activeTab === 'scan-history' && (
            <div className="px-8 py-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-background-border pb-3">
                    {['DATE', 'SCORE', 'CHANGE', 'FINDINGS', 'REPORT'].map(col => (
                      <th
                        key={col}
                        className="text-left pb-3 font-mono text-xs text-text-tertiary uppercase tracking-widest font-normal"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SCAN_HISTORY.map((entry, i) => (
                    <tr key={i} className="border-b border-background-border">
                      <td className="py-4 font-mono text-xs text-text-secondary">{entry.date}</td>
                      <td className="py-4 font-display font-bold text-base text-text-primary">
                        {entry.score}
                      </td>
                      <td className="py-4 font-mono text-xs">
                        <ChangeCell change={entry.change} />
                      </td>
                      <td className="py-4 font-mono text-xs text-text-secondary">
                        {entry.findings} issues
                      </td>
                      <td className="py-4 font-mono text-xs text-cyan-DEFAULT hover:underline cursor-pointer">
                        View →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── FINDINGS ────────────────────────────────────────────────── */}
          {activeTab === 'findings' && (
            <div className="px-8 py-8">
              {MOCK_FINDINGS.map(f => {
                const status = findingStatuses[f.id] ?? 'open'
                return (
                  <div key={f.id} className="border border-background-border p-5 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-text-tertiary">{f.id}</span>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <button
                        onClick={() => toggleFindingStatus(f.id)}
                        className={`font-mono text-xs px-2 py-0.5 bg-transparent cursor-pointer transition-colors border ${
                          status === 'fixed'
                            ? 'text-green-400 border-green-400/30'
                            : 'text-text-tertiary border-background-border hover:border-cyan-DEFAULT'
                        }`}
                      >
                        {status === 'fixed' ? 'FIXED' : 'OPEN'}
                      </button>
                    </div>
                    <div className="font-body font-medium text-base text-text-primary mt-2 mb-3">
                      {f.title}
                    </div>
                    <div className="font-body text-sm text-text-secondary leading-relaxed mb-3">
                      {f.explanation}
                    </div>
                    <div className="border-l-2 border-cyan-DEFAULT/30 pl-3">
                      <span className="font-mono text-xs text-cyan-DEFAULT mr-1">FIX:</span>
                      <span className="font-body text-sm text-text-secondary">
                        {f.recommendation}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── BENCHMARKS ──────────────────────────────────────────────── */}
          {activeTab === 'benchmarks' && (
            <div className="px-8 py-8">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">
                YOUR SITE VS INDUSTRY
              </div>
              <p className="font-body text-sm text-text-secondary mb-8">
                Compared against 2,400+ SaaS sites in the webdoc.ai corpus.
              </p>

              {Object.entries(BENCHMARK_DATA).map(([key, data]) => {
                const gap = data.yours - data.avg
                return (
                  <div key={key} className="mb-8">
                    <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
                      {formatDimension(key)}
                    </div>
                    {/* Your bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-text-secondary w-8 flex-shrink-0">YOU</span>
                      <div className="flex-1 h-2 bg-background-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width:           mounted ? `${data.yours}%` : '0%',
                            backgroundColor: barHex(data.yours),
                            transition:      'width 700ms ease-out',
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs text-text-primary w-8 text-right flex-shrink-0">
                        {data.yours}
                      </span>
                    </div>
                    {/* Avg bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-text-secondary w-8 flex-shrink-0">AVG</span>
                      <div className="flex-1 h-2 bg-background-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width:      mounted ? `${data.avg}%` : '0%',
                            backgroundColor: '#1a1f2e',
                            transition: 'width 700ms ease-out 100ms',
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs text-text-primary w-8 text-right flex-shrink-0">
                        {data.avg}
                      </span>
                    </div>
                    {/* Gap */}
                    {gap !== 0 && (
                      <div
                        className={`font-mono text-xs ml-11 ${
                          gap > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {gap > 0
                          ? `↑ ${gap} points above average`
                          : `↓ ${Math.abs(gap)} points below average`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── SETTINGS ────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="px-8 py-8">

              {/* Your site */}
              <div className="mb-8">
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
                  YOUR SITE
                </div>
                <input
                  readOnly
                  value="yoursite.com"
                  className="w-full font-mono text-sm text-text-primary bg-background-raised border border-background-border px-4 py-3 outline-none"
                />
                <div className="font-mono text-xs text-text-tertiary mt-2">
                  Contact support to change your tracked domain.
                </div>
              </div>

              {/* Notifications */}
              <div className="mb-8">
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
                  NOTIFICATIONS
                </div>
                {[
                  {
                    label:   'Weekly digest email',
                    active:  weeklyDigest,
                    toggle:  () => setWeeklyDigest(p => !p),
                  },
                  {
                    label:   'Score drop alerts',
                    active:  scoreDropAlerts,
                    toggle:  () => setScoreDropAlerts(p => !p),
                  },
                ].map(row => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-4 border-b border-background-border"
                  >
                    <span className="font-body text-sm text-text-primary">{row.label}</span>
                    <Toggle active={row.active} onToggle={row.toggle} />
                  </div>
                ))}
              </div>

              {/* Plan */}
              <div>
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
                  PLAN
                </div>
                <div className="bg-background-raised border border-background-border p-5">
                  <div className="font-body text-sm text-text-primary">
                    Starter&nbsp;&nbsp;·&nbsp;&nbsp;$49/month
                  </div>
                  <div className="font-mono text-xs text-text-tertiary mt-1">
                    Renews Jul 4, 2026
                  </div>
                  <div className="flex gap-3 mt-4 flex-wrap">
                    <button className="border border-background-border font-mono text-xs text-text-secondary px-4 py-2 bg-transparent cursor-pointer hover:border-cyan-DEFAULT transition-colors">
                      Upgrade to Agency →
                    </button>
                    <button className="font-mono text-xs text-text-tertiary px-4 py-2 bg-transparent border-0 cursor-pointer hover:text-red-400 transition-colors">
                      Cancel plan
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
