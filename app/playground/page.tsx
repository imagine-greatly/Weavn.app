'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanState    = 'idle' | 'scanning' | 'complete' | 'error'
type FindingDepth = 'brief' | 'full'
type ResponseTab  = 'response' | 'findings' | 'benchmarks' | 'metadata'
type Severity     = 'critical' | 'high' | 'medium'
type FieldKey     = 'score' | 'findings' | 'benchmarks' | 'copy_rewrites' | 'growth_blueprint' | 'metadata'

interface FieldDef {
  key: FieldKey
  defaultChecked: boolean
}

interface Finding {
  id: string
  title: string
  severity: Severity
  dimension: string
  explanation: string
  recommendation: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELDS: FieldDef[] = [
  { key: 'score',            defaultChecked: true  },
  { key: 'findings',         defaultChecked: true  },
  { key: 'benchmarks',       defaultChecked: true  },
  { key: 'copy_rewrites',    defaultChecked: false },
  { key: 'growth_blueprint', defaultChecked: false },
  { key: 'metadata',         defaultChecked: false },
]

const SCAN_LINES = [
  '> Fetching page content...',
  '> Running 260+ diagnostic checks...',
  '> Generating findings...',
] as const

const MOCK_FINDINGS: Finding[] = [
  {
    id: 'MSG_001',
    title: 'Hero headline is product-focused, not outcome-focused',
    severity: 'critical',
    dimension: 'message_clarity',
    explanation:
      'Your headline leads with what the product is rather than what the user gains. Outcome-led headlines convert 23% better on average across SaaS sites.',
    recommendation:
      'Rewrite the headline to lead with the result the user experiences, not the feature you built.',
  },
  {
    id: 'TRS_001',
    title: 'No social proof visible in first viewport',
    severity: 'high',
    dimension: 'trust_signals',
    explanation:
      'Trust signals positioned below the fold are ignored by 76% of visitors who bounce before scrolling.',
    recommendation:
      'Move at least one trust signal — customer count, logo row, or testimonial — above the fold.',
  },
  {
    id: 'CTA_002',
    title: 'Primary CTA copy is generic',
    severity: 'high',
    dimension: 'conversion_architecture',
    explanation:
      "CTAs using generic verbs like 'Get Started' or 'Sign Up' underperform specific action CTAs by 14–32%.",
    recommendation:
      'Replace with a specific outcome CTA that matches your value proposition.',
  },
]

const MOCK_BENCHMARK = {
  industry:      'saas',
  percentile:    34,
  average_score: 67,
  top_quartile:  82,
}

const MOCK_META = {
  duration_ms: 2340,
  cost_usd:    0.15,
  tokens_used: 4821,
  complexity:  'standard',
  cached:      false,
}

// ── JSON viewer ───────────────────────────────────────────────────────────────

function highlightValue(raw: string) {
  const stripped = raw.replace(/,\s*$/, '')
  const trail    = raw.slice(stripped.length)

  if (/^".*"$/.test(stripped)) {
    return (
      <>
        <span className="text-green-400">{stripped}</span>
        {trail && <span className="text-text-secondary">{trail}</span>}
      </>
    )
  }
  if (/^-?\d+(\.\d+)?$/.test(stripped)) {
    return (
      <>
        <span className="text-amber-400">{stripped}</span>
        {trail && <span className="text-text-secondary">{trail}</span>}
      </>
    )
  }
  if (stripped === 'true' || stripped === 'false' || stripped === 'null') {
    return (
      <>
        <span className="text-purple-400">{stripped}</span>
        {trail && <span className="text-text-secondary">{trail}</span>}
      </>
    )
  }
  return <span className="text-text-secondary">{raw}</span>
}

function highlightLine(line: string) {
  const m = /^(\s*)("[^"]+")\s*:\s*(.+)$/.exec(line)
  if (m) {
    const [, indent, key, value] = m
    return (
      <>
        {indent}
        <span className="text-cyan-DEFAULT">{key}</span>
        <span className="text-text-secondary">{': '}</span>
        {highlightValue(value)}
      </>
    )
  }
  return <span className="text-text-secondary">{line}</span>
}

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const lines = JSON.stringify(data, null, 2).split('\n')
  return (
    <div className="p-4 font-mono text-sm leading-6">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-8 flex-shrink-0 text-right mr-4 text-text-tertiary text-xs leading-6 select-none">
            {i + 1}
          </span>
          <span className="flex-1">{highlightLine(line)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Severity badge ────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'text-red-400 border border-red-400/30',
  high:     'text-amber-400 border border-amber-400/30',
  medium:   'text-yellow-400 border border-yellow-400/30',
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`font-mono text-xs uppercase px-2 py-0.5 ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  )
}

// ── Response payload builder ──────────────────────────────────────────────────

function buildResponseData(
  fields: Record<FieldKey, boolean>,
  url: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (fields.score)            data.score            = 61
  if (fields.findings)         data.findings         = MOCK_FINDINGS
  if (fields.benchmarks)       data.benchmark        = MOCK_BENCHMARK
  if (fields.copy_rewrites)    data.copy_rewrites    = {
    headline: 'Stop losing signups to a homepage nobody understands.',
    cta:      'Scan my site free →',
  }
  if (fields.growth_blueprint) data.growth_blueprint = [
    { priority: 1, action: 'Rewrite hero headline', effort: 'low', impact: 'high' },
  ]
  if (fields.metadata)         data.metadata         = {
    url:         url || 'https://example.com',
    scanned_at:  new Date().toISOString(),
    duration_ms: MOCK_META.duration_ms,
    cost_usd:    MOCK_META.cost_usd,
    tokens_used: MOCK_META.tokens_used,
    complexity:  MOCK_META.complexity,
    cached:      MOCK_META.cached,
  }
  return data
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [url, setUrl]         = useState('')
  const [fields, setFields]   = useState<Record<FieldKey, boolean>>({
    score:            true,
    findings:         true,
    benchmarks:       true,
    copy_rewrites:    false,
    growth_blueprint: false,
    metadata:         false,
  })
  const [depth, setDepth]     = useState<FindingDepth>('brief')
  const [limit, setLimit]     = useState(5)
  const [scanState, setScanState]   = useState<ScanState>('idle')
  const [activeTab, setActiveTab]   = useState<ResponseTab>('response')
  const [jsonCopied, setJsonCopied] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleRunScan() {
    if (!url.trim() || scanState === 'scanning') return
    if (timerRef.current) clearTimeout(timerRef.current)
    setScanState('scanning')
    setActiveTab('response')
    timerRef.current = setTimeout(
      () => setScanState('complete'),
      SCAN_LINES.length * 600 + 400,
    )
  }

  function handleCopyJson() {
    const data = buildResponseData(fields, url)
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2))
    setJsonCopied(true)
    setTimeout(() => setJsonCopied(false), 2000)
  }

  function handleCopyCurl() {
    const body: Record<string, unknown> = {
      url:    url || 'https://example.com',
      fields: FIELDS.filter(f => fields[f.key]).map(f => f.key),
    }
    if (fields.findings) {
      body.finding_depth = depth
      body.finding_limit = limit
    }
    const text = [
      'curl -X POST https://webdocai.com/api/v1/scan \\',
      '  -H "Authorization: Bearer YOUR_API_KEY" \\',
      '  -H "Content-Type: application/json" \\',
      `  -d '${JSON.stringify(body, null, 2)}'`,
    ].join('\n')
    navigator.clipboard?.writeText(text)
    setCurlCopied(true)
    setTimeout(() => setCurlCopied(false), 2000)
  }

  function toggleField(key: FieldKey) {
    setFields(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Build curl body (live-updating)
  const curlBody: Record<string, unknown> = {
    url:    url || 'https://example.com',
    fields: FIELDS.filter(f => fields[f.key]).map(f => f.key),
  }
  if (fields.findings) {
    curlBody.finding_depth = depth
    curlBody.finding_limit = limit
  }

  // Tabs available after scan
  const tabs: { key: ResponseTab; label: string }[] = [
    { key: 'response',   label: 'Full Response' },
    ...(fields.findings   ? [{ key: 'findings'   as ResponseTab, label: 'Findings'   }] : []),
    ...(fields.benchmarks ? [{ key: 'benchmarks' as ResponseTab, label: 'Benchmarks' }] : []),
    ...(fields.metadata   ? [{ key: 'metadata'   as ResponseTab, label: 'Metadata'   }] : []),
  ]

  const responseData = buildResponseData(fields, url)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background-base">
      <style>{`
        @keyframes typeIn {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>

      {/* TOP BAR */}
      <div className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-background-border bg-background-raised">
        <span className="font-mono text-xs text-text-tertiary">
          webdoc.ai / API Explorer
        </span>
        <span className="font-mono text-xs text-text-secondary">
          POST /api/v1/scan
        </span>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
        <aside className="w-[380px] flex-shrink-0 border-r border-background-border overflow-y-auto">

          {/* 1 — URL */}
          <div className="p-4 border-b border-background-border">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-2">
              TARGET URL
            </div>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRunScan()}
              placeholder="https://example.com"
              className="w-full bg-background-base border border-background-border font-mono text-sm text-text-primary px-3 py-2 focus:border-cyan-DEFAULT focus:outline-none placeholder:text-text-tertiary"
            />
          </div>

          {/* 2 — Response Fields */}
          <div className="p-4 border-b border-background-border">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
              RESPONSE FIELDS
            </div>
            {FIELDS.map(f => (
              <div
                key={f.key}
                onClick={() => toggleField(f.key)}
                className="flex items-center gap-3 mb-2.5 cursor-pointer"
              >
                <span
                  className={`w-3 h-3 flex-shrink-0 border flex items-center justify-center ${
                    fields[f.key]
                      ? 'bg-cyan-DEFAULT border-cyan-DEFAULT'
                      : 'bg-background-base border-background-border'
                  }`}
                >
                  {fields[f.key] && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path
                        d="M1 3L3 5L7 1"
                        stroke="#050810"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`font-mono text-sm ${
                    fields[f.key] ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {f.key}
                </span>
              </div>
            ))}
          </div>

          {/* 3 — Finding Options (conditional) */}
          {fields.findings && (
            <div className="p-4 border-b border-background-border">
              <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-3">
                FINDING OPTIONS
              </div>

              {/* Depth toggle */}
              <div className="flex mb-3">
                {(['brief', 'full'] as FindingDepth[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`flex-1 py-1.5 font-mono text-xs bg-transparent border cursor-pointer transition-colors ${
                      depth === d
                        ? 'bg-background-border border-background-border text-text-primary'
                        : 'border-background-border text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Limit */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">
                  LIMIT
                </span>
                <input
                  type="number"
                  value={limit}
                  min={1}
                  max={10}
                  onChange={e =>
                    setLimit(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-16 text-center font-mono text-sm text-text-primary bg-background-base border border-background-border px-2 py-1 focus:border-cyan-DEFAULT focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 4 — Run button */}
          <div className="p-4 border-b border-background-border">
            <button
              onClick={handleRunScan}
              disabled={!url.trim() || scanState === 'scanning'}
              className="w-full py-3 bg-cyan-DEFAULT text-background-base font-mono text-sm font-bold tracking-widest uppercase cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {scanState === 'scanning' ? (
                <>
                  {'SCANNING...'}
                  <span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
                </>
              ) : (
                'RUN SCAN'
              )}
            </button>
          </div>

          {/* 5 — Curl equivalent */}
          <div className="p-4 border-b border-background-border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">
                CURL EQUIVALENT
              </span>
              <button
                onClick={handleCopyCurl}
                className="font-mono text-xs text-text-tertiary hover:text-cyan-DEFAULT transition-colors"
              >
                {curlCopied ? 'copied' : 'copy'}
              </button>
            </div>
            <div className="bg-background-raised p-3">
              <pre className="font-mono text-xs text-text-secondary leading-relaxed m-0 whitespace-pre-wrap break-all">
                <span className="text-cyan-DEFAULT">curl</span>
                {` -X POST https://webdocai.com/api/v1/scan \\\n`}
                {`  -H "Authorization: Bearer YOUR_API_KEY" \\\n`}
                {`  -H "Content-Type: application/json" \\\n`}
                {`  -d '${JSON.stringify(curlBody, null, 2)}'`}
              </pre>
            </div>
          </div>

          {/* 6 — Stats (after scan) */}
          {scanState === 'complete' && (
            <div className="p-4">
              <div className="flex gap-6 font-mono text-xs text-text-tertiary">
                <span>
                  {'DURATION  '}
                  <span className="text-cyan-DEFAULT">2.3s</span>
                </span>
                <span>
                  {'COST  '}
                  <span className="text-cyan-DEFAULT">$0.15</span>
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* IDLE */}
          {scanState === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <p className="font-mono text-sm text-text-tertiary">
                Run a scan to see the response
              </p>
              <p className="font-mono text-xs text-text-tertiary">
                Results appear here as structured JSON
              </p>
            </div>
          )}

          {/* SCANNING */}
          {scanState === 'scanning' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="font-mono text-sm text-text-secondary">
                {SCAN_LINES.map((line, i) => (
                  <div
                    key={i}
                    className="whitespace-nowrap mb-1"
                    style={{
                      animation: `typeIn 0.7s steps(38) ${i * 0.6}s both`,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPLETE */}
          {scanState === 'complete' && (
            <>
              {/* Tab bar */}
              <div className="flex-shrink-0 border-b border-background-border flex items-center">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`font-mono text-xs px-4 py-3 bg-transparent border-0 cursor-pointer transition-colors ${
                      activeTab === tab.key
                        ? 'border-b-2 border-cyan-DEFAULT text-text-primary -mb-px'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <button
                  onClick={handleCopyJson}
                  className="ml-auto mr-4 font-mono text-xs text-text-tertiary hover:text-cyan-DEFAULT transition-colors"
                >
                  {jsonCopied ? 'copied' : 'copy json'}
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">

                {activeTab === 'response' && (
                  <JsonViewer data={responseData} />
                )}

                {activeTab === 'findings' && (
                  <div>
                    {MOCK_FINDINGS.map(f => (
                      <div
                        key={f.id}
                        className="border-b border-background-border py-3 px-4"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-text-tertiary">{f.id}</span>
                          <SeverityBadge severity={f.severity} />
                        </div>
                        <div className="font-body text-sm text-text-primary mt-1">{f.title}</div>
                        <div className="font-body text-xs text-text-secondary mt-1 leading-relaxed">
                          {f.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'benchmarks' && (
                  <div className="p-4">
                    <table className="w-full font-mono text-xs">
                      <thead>
                        <tr className="border-b border-background-border">
                          <th className="text-left pb-3 text-text-tertiary font-normal">METRIC</th>
                          <th className="text-right pb-3 text-text-tertiary font-normal">VALUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          ['Industry',      MOCK_BENCHMARK.industry],
                          ['Percentile',    `${MOCK_BENCHMARK.percentile}th`],
                          ['Average Score', String(MOCK_BENCHMARK.average_score)],
                          ['Top Quartile',  String(MOCK_BENCHMARK.top_quartile)],
                        ] as [string, string][]).map(([k, v], i) => (
                          <tr
                            key={k}
                            className={`border-b border-background-border ${
                              i % 2 === 0 ? 'bg-background-raised' : ''
                            }`}
                          >
                            <td className="text-text-tertiary py-2 px-2">{k}</td>
                            <td className="text-text-primary py-2 px-2 text-right">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'metadata' && (
                  <div className="p-4 grid grid-cols-2 gap-4 font-mono text-xs">
                    {([
                      ['url',         url || 'https://example.com'],
                      ['duration_ms', String(MOCK_META.duration_ms)],
                      ['cost_usd',    String(MOCK_META.cost_usd)],
                      ['tokens_used', String(MOCK_META.tokens_used)],
                      ['complexity',  MOCK_META.complexity],
                      ['cached',      String(MOCK_META.cached)],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k}>
                        <div className="text-text-tertiary mb-0.5">{k}</div>
                        <div className="text-text-primary">{v}</div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </>
          )}

          {/* ERROR */}
          {scanState === 'error' && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-sm text-red-400">
                Scan failed. Please try again.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex-shrink-0 h-11 flex items-center justify-center border-t border-background-border bg-background-raised">
        <span className="font-mono text-xs text-text-tertiary">
          {'Ready to integrate?  '}
          <Link href="/developer" className="text-cyan-DEFAULT hover:underline">
            Get your API key →
          </Link>
        </span>
      </div>
    </div>
  )
}
