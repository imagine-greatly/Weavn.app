'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanState = 'idle' | 'scanning' | 'complete'
type Depth     = 'brief' | 'full'
type ResultTab = 'formatted' | 'raw'
type Severity  = 'critical' | 'high' | 'medium' | 'low'

interface Finding {
  priority: number
  severity: Severity
  category: string
  title: string
  estimated_lift: string
  detail: string
  fix: string
}

// ── Static data ───────────────────────────────────────────────────────────────

const FIELD_DEFS = [
  { key: 'score',            desc: '0–100'              },
  { key: 'findings',         desc: 'ranked issues'      },
  { key: 'benchmark',        desc: 'industry comparison' },
  { key: 'rewritten_copy',   desc: 'AI copy'            },
  { key: 'dimensions',       desc: '9 dimension scores' },
  { key: 'growth_blueprint', desc: 'action plan'        },
  { key: 'metadata',         desc: 'page stats'         },
  { key: 'recommendations',  desc: 'quick wins'         },
]

const SCAN_STEPS = [
  'Initializing Browserless session',
  'Rendering full page',
  'Extracting content — 847 words',
  'Running 260+ diagnostic checks',
  'Benchmarking against B2B SaaS',
  'Generating findings + copy rewrites',
]

const RESULT_FINDINGS: Finding[] = [
  {
    priority: 1, severity: 'critical', category: 'value_proposition',
    title: 'Hero headline is feature-led, not outcome-led',
    estimated_lift: '12–18%',
    detail: 'Visitors cannot determine what problem this solves or for whom within 5 seconds. Feature-led headlines reduce immediate resonance with outcome-seeking buyers.',
    fix: 'Reframe around the outcome your best customers achieve. Lead with the result, follow with the mechanism.',
  },
  {
    priority: 2, severity: 'high', category: 'social_proof',
    title: 'No above-fold proof — testimonials buried at 2,400px',
    estimated_lift: '8–11%',
    detail: 'Trust must be established before the first scroll. Visitors who don\'t see proof early leave before reaching your testimonials.',
    fix: 'Add a single high-authority quote or recognizable logo strip within the first 400px of viewport.',
  },
  {
    priority: 3, severity: 'high', category: 'cta_clarity',
    title: 'Dual primary CTAs create decision paralysis',
    estimated_lift: '6–9%',
    detail: '\'Start Free Trial\' and \'Book a Demo\' carry identical visual weight. Equal-weight choices cause visitors to default to neither.',
    fix: 'Elevate one CTA as primary. Demote the secondary to a plain text link beneath it.',
  },
  {
    priority: 4, severity: 'medium', category: 'specificity',
    title: 'Benefit claims are vague — no numbers, no timeframes',
    estimated_lift: '4–6%',
    detail: 'Claims like "save time" and "increase revenue" without supporting specifics are indistinguishable from competitor copy.',
    fix: 'Audit every benefit claim. Attach a number, a timeframe, or a customer-specific outcome to each.',
  },
  {
    priority: 5, severity: 'medium', category: 'navigation',
    title: 'Seven nav items competing with primary CTA',
    estimated_lift: '3–5%',
    detail: 'Navigation link count inversely correlates with conversion rate on landing pages. Seven options dilute attention from your primary action.',
    fix: 'Reduce nav to four items maximum on the landing page. Move secondary links to footer.',
  },
]

const RESULT_DATA = {
  scan_id: 'scan_01HXYZ7K2M9N3P4Q',
  url: 'https://acme-saas.com',
  score: 61,
  industry: 'B2B SaaS',
  benchmark: { industry_avg: 54, top_quartile: 78, percentile: 63 },
  dimensions: {
    value_proposition: 48, social_proof: 55, cta_clarity: 62,
    specificity: 44, navigation: 71, mobile_experience: 58,
    trust_signals: 67, pricing_clarity: 53, urgency: 49,
  },
  findings: RESULT_FINDINGS,
  rewritten_copy: {
    headline: 'Ship projects on time, every time.',
    subheadline: '4,200 teams have cut project delays by 40%. No status meetings required.',
    cta_primary: 'Start free — no credit card',
  },
  growth_blueprint: [
    { priority: 1, action: 'Rewrite hero headline to outcome-led copy', effort: 'Low', impact: '12–18%' },
    { priority: 2, action: 'Add social proof in first 400px of viewport', effort: 'Medium', impact: '8–11%' },
    { priority: 3, action: 'Simplify to one primary CTA', effort: 'Low', impact: '6–9%' },
  ],
  metadata: { word_count: 847, cta_count: 3, pages_scanned: 1, load_time_ms: 1240 },
  recommendations: [
    'Rewrite hero headline to lead with customer outcome',
    'Add logo strip or quote above the 400px mark',
    'Remove secondary CTA from hero section',
  ],
  cost_usd: 0.15,
  duration_ms: 87340,
}

const COPY_REWRITES = [
  { field: 'HEADLINE',    current: 'AI-powered project management platform',   rewritten: 'Ship projects on time, every time.'                                              },
  { field: 'SUBHEADLINE', current: 'Built for modern teams who want to move fast', rewritten: '4,200 teams have cut project delays by 40%. No status meetings required.' },
  { field: 'PRIMARY CTA', current: 'Get started',                               rewritten: 'Start free — no credit card'                                                   },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtElapsed(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')} elapsed`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex flex-shrink-0 cursor-pointer border-0 transition-colors duration-150 ${checked ? 'bg-cyan-DEFAULT' : 'bg-background-border'}`}
      style={{ width: 40, height: 20 }}
    >
      <span
        className="absolute top-0.5 bg-background-base transition-transform duration-150"
        style={{ width: 16, height: 16, transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

const SEVERITY_CLS: Record<Severity, string> = {
  critical: 'bg-severity-critical/10 text-severity-critical',
  high:     'bg-severity-high/10 text-severity-high',
  medium:   'bg-severity-medium/10 text-severity-medium',
  low:      'bg-severity-low/10 text-severity-low',
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`font-mono text-xs px-2 py-0.5 ${SEVERITY_CLS[severity]}`}>{severity}</span>
}

function JsonNode({ value, indent = 0 }: { value: unknown; indent?: number }) {
  const pad  = '  '.repeat(indent)
  const pad1 = '  '.repeat(indent + 1)

  if (value === null)            return <span className="text-text-tertiary">null</span>
  if (typeof value === 'boolean') return <span className="text-severity-high">{String(value)}</span>
  if (typeof value === 'number')  return <span className="text-cyan-DEFAULT">{value}</span>
  if (typeof value === 'string')  return <span className="text-score-high">&quot;{value}&quot;</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text-tertiary">[]</span>
    return (
      <>
        <span className="text-text-tertiary">{'['}</span>
        {value.map((item, i) => (
          <span key={i} style={{ display: 'block' }}>
            {pad1}<JsonNode value={item} indent={indent + 1} />{i < value.length - 1 && <span className="text-text-tertiary">,</span>}
          </span>
        ))}
        <span style={{ display: 'block' }}>{pad}<span className="text-text-tertiary">{']'}</span></span>
      </>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-text-tertiary">{'{}'}</span>
    return (
      <>
        <span className="text-text-tertiary">{'{'}</span>
        {entries.map(([k, v], i) => (
          <span key={k} style={{ display: 'block' }}>
            {pad1}<span className="text-[#8080c0]">&quot;{k}&quot;</span>
            <span className="text-text-tertiary">: </span>
            <JsonNode value={v} indent={indent + 1} />
            {i < entries.length - 1 && <span className="text-text-tertiary">,</span>}
          </span>
        ))}
        <span style={{ display: 'block' }}>{pad}<span className="text-text-tertiary">{'}'}</span></span>
      </>
    )
  }

  return <span className="text-text-tertiary">{String(value)}</span>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [url, setUrl]               = useState('')
  const [fields, setFields]         = useState<Record<string, boolean>>(
    Object.fromEntries(FIELD_DEFS.map(f => [f.key, true]))
  )
  const [depth, setDepth]           = useState<Depth>('full')
  const [findingLimit, setFindingLimit] = useState(10)
  const [asyncMode, setAsyncMode]   = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [scanState, setScanState]   = useState<ScanState>('idle')
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('formatted')
  const [completedSteps, setCompletedSteps]   = useState(0)
  const [elapsedSeconds, setElapsedSeconds]   = useState(0)
  const [copied, setCopied]         = useState(false)

  const stepTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function handleRunScan() {
    if (!url.trim() || scanState === 'scanning') return
    setScanState('scanning')
    setCompletedSteps(0)
    setElapsedSeconds(0)
    setActiveResultTab('formatted')

    if (stepTimerRef.current)    clearInterval(stepTimerRef.current)
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)

    let step = 0
    let secs = 0

    stepTimerRef.current = setInterval(() => {
      step++
      setCompletedSteps(step)
      if (step >= SCAN_STEPS.length) {
        if (stepTimerRef.current)    clearInterval(stepTimerRef.current)
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
        setTimeout(() => setScanState('complete'), 800)
      }
    }, 13000)

    elapsedTimerRef.current = setInterval(() => {
      secs++
      setElapsedSeconds(secs)
    }, 1000)
  }

  function handleCopyJson() {
    navigator.clipboard?.writeText(JSON.stringify(RESULT_DATA, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function buildCurlPreview() {
    const enabled = FIELD_DEFS.filter(f => fields[f.key]).map(f => f.key)
    const target  = url || 'https://your-site.com'
    const body: Record<string, unknown> = { url: target }
    if (enabled.length < FIELD_DEFS.length) body.fields = enabled
    if (depth === 'brief') body.depth = 'brief'
    if (findingLimit !== 10) body.finding_limit = findingLimit
    if (asyncMode && webhookUrl) body.webhook_url = webhookUrl
    const bodyStr = JSON.stringify(body, null, 2)

    return (
      <pre className="font-mono text-xs leading-relaxed m-0 whitespace-pre-wrap">
        <span className="text-cyan-DEFAULT">curl</span>
        <span className="text-text-tertiary">{` -X POST https://webdocai.com/api/v1/scan \\\n  -H "Authorization: Bearer `}</span>
        <span className="text-score-high">wdoc_live_••••</span>
        <span className="text-text-tertiary">{`" \\\n  -d '`}</span>
        <span className="text-score-high">{bodyStr}</span>
        <span className="text-text-tertiary">{"'"}</span>
      </pre>
    )
  }

  const inputCls = 'w-full bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-4 py-3 outline-none focus:border-cyan-DEFAULT transition-colors duration-150 placeholder:text-text-tertiary'

  return (
    <div className="flex h-screen overflow-hidden bg-background-base">

      {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
      <aside className="w-[420px] flex-shrink-0 bg-background-raised border-r border-background-border flex flex-col overflow-y-auto">

        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-background-border flex-shrink-0">
          <Link href="/" className="font-display font-extrabold text-sm text-text-primary no-underline">
            webdoc<span className="text-cyan-DEFAULT">.ai</span>
          </Link>
          <div className="font-mono text-xs text-text-tertiary mt-1">API Playground</div>
        </div>

        {/* URL Input */}
        <div className="px-6 py-5 border-b border-background-border flex-shrink-0">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">TARGET URL</div>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRunScan()}
            placeholder="https://your-site.com"
            className={inputCls}
          />
          <div className="font-mono text-xs text-text-tertiary mt-2">No auth required. Results are not stored.</div>
        </div>

        {/* Field Selection */}
        <div className="px-6 py-5 border-b border-background-border flex-shrink-0">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">RESPONSE FIELDS</div>
          <div className="font-body text-xs text-text-tertiary mb-4">Select which fields to include in the response.</div>
          {FIELD_DEFS.map(f => (
            <div key={f.key} className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id={`f-${f.key}`}
                checked={!!fields[f.key]}
                onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.checked }))}
                className="appearance-none w-4 h-4 border border-background-border bg-background-subtle checked:bg-cyan-DEFAULT checked:border-cyan-DEFAULT cursor-pointer flex-shrink-0"
              />
              <label htmlFor={`f-${f.key}`} className="font-mono text-xs text-text-secondary flex-1 cursor-pointer">{f.key}</label>
              <span className="font-mono text-xs text-text-tertiary">{f.desc}</span>
            </div>
          ))}
        </div>

        {/* Depth */}
        <div className="px-6 py-5 border-b border-background-border flex-shrink-0">
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">FINDING DEPTH</div>
          <div className="flex">
            {(['brief', 'full'] as Depth[]).map(d => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`flex-1 py-2.5 font-mono text-xs text-center border cursor-pointer bg-transparent transition-colors duration-150 ${
                  depth === d
                    ? 'bg-cyan-dim border-cyan-DEFAULT text-cyan-DEFAULT'
                    : 'border-background-border text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="font-mono text-xs text-text-tertiary">FINDING LIMIT</span>
            <input
              type="number"
              value={findingLimit}
              onChange={e => setFindingLimit(Math.max(1, parseInt(e.target.value) || 10))}
              min={1}
              max={50}
              className="w-16 bg-background-subtle border border-background-border font-mono text-sm text-text-primary px-3 py-1.5 text-center outline-none focus:border-cyan-DEFAULT transition-colors duration-150"
            />
          </div>
        </div>

        {/* Async Mode */}
        <div className="px-6 py-5 border-b border-background-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-xs text-text-secondary">Async mode</div>
              <div className="font-mono text-xs text-text-tertiary mt-1">Returns immediately with scan_id. Result via webhook.</div>
            </div>
            <Toggle checked={asyncMode} onChange={setAsyncMode} />
          </div>
          {asyncMode && (
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://your-app.com/webhook"
              className={`${inputCls} mt-4`}
            />
          )}
        </div>

        {/* Run Button */}
        <div className="px-6 py-6 mt-auto sticky bottom-0 bg-background-raised border-t border-background-border flex-shrink-0">
          <button
            onClick={handleRunScan}
            disabled={!url.trim() || scanState === 'scanning'}
            className="w-full bg-cyan-DEFAULT text-text-inverse font-body font-bold text-sm py-4 border-0 cursor-pointer hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanState === 'scanning' ? 'Scanning...' : 'Run scan →'}
          </button>
          <div className="font-mono text-xs text-text-tertiary text-center mt-3">~90 seconds · $0.15 per scan in production</div>
        </div>

      </aside>

      {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
      <div className="flex-1 bg-background-base overflow-y-auto">

        {/* STATE 1 — IDLE */}
        {scanState === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full px-8">
            <div className="font-mono text-xs text-text-tertiary text-center mb-6">Paste a URL and run a scan.</div>
            <div className="bg-background-raised border border-background-border p-6 max-w-lg w-full">
              {buildCurlPreview()}
            </div>
          </div>
        )}

        {/* STATE 2 — SCANNING */}
        {scanState === 'scanning' && (
          <div className="px-8 py-8">
            <div className="bg-background-raised border border-background-border p-6 max-w-lg">
              <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-4">SCANNING</div>
              <div className="font-mono text-sm text-text-primary mb-6 break-all">{url}</div>
              {SCAN_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <div
                    className={`flex-shrink-0 ${
                      i < completedSteps  ? 'bg-score-high' :
                      i === completedSteps ? 'bg-cyan-DEFAULT animate-pulse' :
                                             'bg-background-border'
                    }`}
                    style={{ width: 6, height: 6 }}
                  />
                  <span className={`font-mono text-xs ${
                    i < completedSteps   ? 'text-text-secondary' :
                    i === completedSteps  ? 'text-text-primary' :
                                           'text-text-tertiary'
                  }`}>
                    {step}
                  </span>
                </div>
              ))}
              <div className="font-mono text-xs text-text-tertiary mt-6">{fmtElapsed(elapsedSeconds)}</div>
            </div>
          </div>
        )}

        {/* STATE 3 — RESULTS */}
        {scanState === 'complete' && (
          <div className="flex flex-col min-h-full">

            {/* Top bar */}
            <div className="flex justify-between items-center px-8 py-4 border-b border-background-border sticky top-0 bg-background-base z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <ScoreRing score={RESULT_DATA.score} size="sm" animated={false} />
                <span className="font-body text-sm text-text-primary">acme-saas.com</span>
                <span className="font-mono text-xs text-text-tertiary">{RESULT_DATA.findings.length} findings</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="border border-background-border font-body text-xs text-text-secondary px-3 py-1.5 bg-transparent cursor-pointer hover:text-text-primary transition-colors duration-150"
                >
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
                <Link
                  href="/reports/demo"
                  className="bg-cyan-DEFAULT text-text-inverse font-body text-xs font-semibold px-3 py-1.5 no-underline hover:opacity-90 transition-opacity duration-150"
                >
                  Open report →
                </Link>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-background-border px-8 flex-shrink-0">
              {(['formatted', 'raw'] as ResultTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveResultTab(tab)}
                  className={`font-body text-sm pb-3 px-4 cursor-pointer border-0 bg-transparent transition-colors duration-150 ${
                    activeResultTab === tab
                      ? 'border-b-2 border-cyan-DEFAULT text-text-primary -mb-px'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {tab === 'formatted' ? 'Formatted' : 'Raw JSON'}
                </button>
              ))}
            </div>

            {/* FORMATTED TAB */}
            {activeResultTab === 'formatted' && (
              <div className="px-8 py-6">

                {/* Score ring centered */}
                <div className="flex justify-center mb-8">
                  <div className="text-center">
                    <ScoreRing score={RESULT_DATA.score} size="lg" animated={true} />
                    <div className="font-mono text-xs text-text-tertiary mt-2 uppercase tracking-widest">CONVERSION SCORE</div>
                  </div>
                </div>

                {/* Benchmark band */}
                <div className="bg-background-raised border border-background-border p-4 mb-10">
                  <div className="grid grid-cols-3 gap-px bg-background-border">
                    {[
                      { label: 'INDUSTRY AVG',  value: RESULT_DATA.benchmark.industry_avg, cls: 'text-text-secondary' },
                      { label: 'YOUR SCORE',     value: RESULT_DATA.score,                  cls: 'text-score-mid'      },
                      { label: 'TOP QUARTILE',   value: RESULT_DATA.benchmark.top_quartile, cls: 'text-text-secondary' },
                    ].map(cell => (
                      <div key={cell.label} className="bg-background-raised px-4 py-3">
                        <div className={`font-display font-extrabold text-2xl ${cell.cls}`}>{cell.value}</div>
                        <div className="font-mono text-[10px] text-text-tertiary mt-1 uppercase tracking-widest">{cell.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="relative w-full h-px bg-background-border mt-4">
                    <div className="absolute top-1/2 -translate-y-1/2 bg-text-tertiary" style={{ left: `${RESULT_DATA.benchmark.industry_avg}%`, width: 3, height: 10 }} />
                    <div className="absolute -translate-y-1/2 bg-score-mid" style={{ left: `${RESULT_DATA.score}%`, width: 3, height: 14, top: '50%' }} />
                    <div className="absolute top-1/2 -translate-y-1/2 bg-text-tertiary" style={{ left: `${RESULT_DATA.benchmark.top_quartile}%`, width: 3, height: 10 }} />
                  </div>
                </div>

                {/* Findings */}
                <div className="mb-10">
                  <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">
                    FINDINGS — {RESULT_FINDINGS.length} ranked by revenue impact
                  </div>
                  {RESULT_FINDINGS.map(f => (
                    <div key={f.priority} className="bg-background-raised border border-background-border p-5 mb-px">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="font-display font-extrabold text-2xl text-text-tertiary flex-shrink-0 leading-none" style={{ opacity: 0.4 }}>
                            0{f.priority}
                          </div>
                          <div>
                            <SeverityBadge severity={f.severity} />
                            <div className="font-body font-semibold text-sm text-text-primary leading-snug mt-2">{f.title}</div>
                            <div className="font-mono text-xs text-text-tertiary mt-1">{f.category}</div>
                          </div>
                        </div>
                        <div className="font-mono text-xs text-score-mid bg-score-mid/10 px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                          ↑ {f.estimated_lift}
                        </div>
                      </div>
                      <p className="font-body text-sm text-text-secondary mt-4 leading-relaxed">{f.detail}</p>
                      <div className="bg-background-subtle border-l-2 border-cyan-DEFAULT px-4 py-3 mt-4">
                        <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">RECOMMENDED FIX</div>
                        <p className="font-body text-sm text-text-primary leading-relaxed">{f.fix}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Copy rewrites */}
                <div className="mb-8">
                  <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">AI-REWRITTEN COPY</div>
                  {COPY_REWRITES.map(block => (
                    <div key={block.field} className="bg-background-raised border border-background-border p-5 mb-px">
                      <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">{block.field}</div>
                      <div className="grid grid-cols-2">
                        <div className="border-r border-background-border pr-5">
                          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">CURRENT</div>
                          <p className="font-body text-sm text-text-secondary italic">{block.current}</p>
                        </div>
                        <div className="pl-5">
                          <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-2">REWRITTEN</div>
                          <p className="font-body text-sm text-text-primary font-medium">{block.rewritten}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* RAW JSON TAB */}
            {activeResultTab === 'raw' && (
              <div className="flex-1 bg-background-subtle p-8 overflow-auto">
                <pre className="font-mono text-xs leading-relaxed m-0 text-text-tertiary" style={{ whiteSpace: 'pre' }}>
                  <JsonNode value={RESULT_DATA} />
                </pre>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
