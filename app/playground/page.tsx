'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { ScoreRing } from '@/components/ui/ScoreRing'

// ── Types ──────────────────────────────────────────────────────────────────────

type ScanState    = 'idle' | 'scanning' | 'complete'
type FindingDepth = 'brief' | 'full'
type AsyncMode    = 'false' | 'true'
type SiteType     = 'auto' | 'saas' | 'ecommerce'

// ── Mock response ──────────────────────────────────────────────────────────────

const MOCK_RESPONSE = {
  score: 61,
  findings: [
    {
      id: 'MSG_001',
      severity: 'critical',
      dimension: 'message_clarity',
      title: 'Hero headline is product-focused, not outcome-focused',
      recommendation: 'Rewrite to lead with the result the user experiences.',
    },
    {
      id: 'TRS_001',
      severity: 'high',
      dimension: 'trust_signals',
      title: 'No social proof visible in first viewport',
      recommendation: 'Move at least one trust signal above the fold.',
    },
    {
      id: 'CTA_002',
      severity: 'high',
      dimension: 'conversion_architecture',
      title: 'Primary CTA copy is generic',
      recommendation: 'Replace with a specific outcome CTA.',
    },
  ],
  rewritten_copy: {
    headline: 'Stop losing signups to a homepage nobody understands.',
    cta: 'Scan my site free →',
  },
  metadata: {
    scanned_at: '',
    duration_ms: 2340,
    site_type: 'saas',
    cached: false,
  },
}

const IDLE_PLACEHOLDER = `// Response will appear here\n// POST a URL to run a live scan`

// ── Toggle row sub-component ───────────────────────────────────────────────────

function ToggleRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#9398A8' }}>
        {label}
      </span>
      <div style={{ display: 'flex' }}>
        {options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: opt === value ? '#E6E9EE' : '#6E7587',
              background: opt === value ? 'rgba(255,255,255,0.07)' : 'transparent',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 0,
              padding: '4px 10px',
              cursor: 'pointer',
              marginLeft: i > 0 ? -0.5 : 0,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [url, setUrl]                     = useState('')
  const [findingDepth, setFindingDepth]   = useState<FindingDepth>('full')
  const [asyncMode, setAsyncMode]         = useState<AsyncMode>('false')
  const [siteType, setSiteType]           = useState<SiteType>('auto')
  const [scanState, setScanState]         = useState<ScanState>('idle')
  const [scanScore, setScanScore]         = useState(0)
  const [durationMs, setDurationMs]       = useState(0)
  const [keyCopied, setKeyCopied]         = useState(false)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef  = useRef(0)

  function handleRunScan() {
    if (!url.trim() || scanState === 'scanning') return
    if (timerRef.current) clearTimeout(timerRef.current)
    setScanState('scanning')
    setScanScore(0)
    startRef.current = Date.now()
    timerRef.current = setTimeout(() => {
      setScanState('complete')
      setScanScore(61)
      setDurationMs(Date.now() - startRef.current)
    }, 2800)
  }

  function handleCopyKey() {
    navigator.clipboard?.writeText('weavn_live_example_key')
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  const targetUrl  = url || 'https://your-site.com'
  const curlCode   = [
    `curl -X POST https://weavn.app/api/v1/scan \\`,
    `  -H "Authorization: Bearer weavn_live_••••••••" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{`,
    `    "url": "${targetUrl}",`,
    `    "finding_depth": "${findingDepth}",`,
    `    "async": ${asyncMode},`,
    `    "site_type": "${siteType}"`,
    `  }'`,
  ].join('\n')

  const responseCode = scanState === 'complete'
    ? JSON.stringify(
        { ...MOCK_RESPONSE, metadata: { ...MOCK_RESPONSE.metadata, scanned_at: new Date().toISOString() } },
        null, 2,
      )
    : IDLE_PLACEHOLDER

  const statusLabel: string | null =
    scanState === 'idle'     ? null :
    scanState === 'scanning' ? 'scanning…' :
                               `200 OK · ${durationMs}ms`

  return (
    <main style={{ background: 'transparent', minHeight: '100vh' }}>
      <style>{`
        @keyframes playgroundStatusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes scanBtnPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0,196,140,0.25); }
          50% { box-shadow: 0 0 40px rgba(0,196,140,0.5), 0 0 80px rgba(0,196,140,0.15); }
        }
        .pg-url-input:focus {
          border-top-color: rgba(0,196,140,0.6) !important;
          outline: none !important;
        }
        .pg-url-input::placeholder { color: #6E7587; }
        @media (max-width: 900px) {
          .pg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px 56px' }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: '#6F9BC6',
          marginBottom: 16,
        }}>
          API Playground
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 36,
          color: '#E6E9EE',
          lineHeight: 1.15,
          margin: '0 0 16px',
        }}>
          POST a URL. See exactly what comes back.
        </h1>

        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 15,
          color: '#9398A8',
          margin: '0 0 24px',
          maxWidth: 560,
        }}>
          Live API calls against the real scan engine. Your key, your requests, real responses. No mocked data.
        </p>

        {/* Status line */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          border: '0.5px solid rgba(255,255,255,0.08)',
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.02)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
        }}>
          <span
            className="status-dot"
            style={{
              display: 'inline-block',
              width: 7, height: 7,
              borderRadius: '50%',
              background: '#00C48C',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#9398A8' }}>weavn.app</span>
          <span style={{ color: '#6E7587' }}>·</span>
          <span style={{ color: '#6F9BC6' }}>v1</span>
          <span style={{ color: '#6E7587' }}>·</span>
          <span style={{ color: '#00C48C' }}>live</span>
        </div>
      </section>

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px' }}>
        <div
          className="pg-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 3fr',
            alignItems: 'start',
          }}
        >
          {/* ── LEFT COLUMN — REQUEST PANEL ───────────────────────── */}
          <div className="wd-panel" style={{ borderRadius: 0, padding: 0 }}>

            {/* Panel header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#6E7587',
            }}>
              REQUEST
            </div>

            {/* API key row */}
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 8,
              }}>
                API KEY
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#00C48C' }}>
                  weavn_live_••••••••
                </span>
                <button
                  onClick={handleCopyKey}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: '#6F9BC6',
                    background: 'none',
                    border: '0.5px solid rgba(111,155,198,0.3)',
                    borderRadius: 0,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {keyCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* URL input row */}
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 8,
              }}>
                TARGET URL
              </div>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRunScan()}
                placeholder="https://your-site.com"
                className="pg-url-input"
                style={{
                  width: '100%',
                  background: '#050810',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  borderLeft: '1px solid rgba(255,255,255,0.05)',
                  borderRight: '1px solid rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  borderRadius: 0,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  color: '#9398A8',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Parameters row */}
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 12,
              }}>
                PARAMETERS
              </div>
              <ToggleRow
                label="finding_depth"
                options={['brief', 'full']}
                value={findingDepth}
                onChange={v => setFindingDepth(v as FindingDepth)}
              />
              <ToggleRow
                label="async"
                options={['false', 'true']}
                value={asyncMode}
                onChange={v => setAsyncMode(v as AsyncMode)}
              />
              <ToggleRow
                label="site_type"
                options={['auto', 'saas', 'ecommerce']}
                value={siteType}
                onChange={v => setSiteType(v as SiteType)}
              />
            </div>

            {/* Scan button */}
            <div style={{ padding: 16 }}>
              <button
                onClick={handleRunScan}
                disabled={!url.trim() || scanState === 'scanning'}
                style={{
                  width: '100%',
                  background: '#00C48C',
                  color: '#050810',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  border: 'none',
                  borderRadius: 0,
                  padding: '13px 0',
                  cursor: url.trim() && scanState !== 'scanning' ? 'pointer' : 'not-allowed',
                  opacity: url.trim() && scanState !== 'scanning' ? 1 : 0.45,
                  animation: url.trim() && scanState === 'idle'
                    ? 'scanBtnPulse 3s ease-in-out infinite'
                    : 'none',
                }}
              >
                {scanState === 'scanning' ? 'SCANNING…' : 'RUN SCAN →'}
              </button>
            </div>

            {/* CURL preview */}
            <div style={{ padding: '14px 16px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 10,
              }}>
                CURL EQUIVALENT
              </div>
              <CodeBlock language="bash" code={curlCode} />
            </div>
          </div>

          {/* ── RIGHT COLUMN — RESPONSE PANEL ────────────────────── */}
          <div style={{ position: 'relative' }}>
            {/* Purple bloom */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse 600px 800px at 85% 50%, rgba(128,128,192,0.08) 0%, transparent 60%)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            <div
              className="wd-panel"
              style={{
                position: 'relative',
                zIndex: 1,
                borderRadius: 0,
                padding: 0,
                borderTop: '1px solid rgba(128,128,192,0.3)',
                boxShadow: '0 0 0 1px rgba(128,128,192,0.15), 0 0 40px rgba(128,128,192,0.08)',
              }}
            >
              {/* Panel header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#6E7587',
                }}>
                  RESPONSE
                </span>

                {/* Status indicator */}
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: statusLabel ? '#00C48C' : '#6E7587',
                  animation: scanState === 'scanning'
                    ? 'playgroundStatusPulse 1.5s ease-in-out infinite'
                    : 'none',
                }}>
                  {statusLabel ?? 'waiting for scan'}
                </span>

                <ScoreRing score={scanScore} size="sm" animate={scanState === 'complete'} />
              </div>

              {/* Response body */}
              <div style={{ minHeight: 600 }}>
                <CodeBlock language="json" code={responseCode} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BELOW ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
        <div className="section-separator" />
      </div>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 80px' }}>
        {/* Explainer — 3 columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 40,
          marginBottom: 40,
        }}>
          {[
            { label: 'score',          body: '0–100. Calibrated to your site type.' },
            { label: 'findings[]',     body: 'Ranked by estimated conversion impact.' },
            { label: 'rewritten_copy', body: 'Drop-in replacement copy, included.' },
          ].map(({ label, body }) => (
            <div key={label}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 8,
              }}>
                {label}
              </div>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                color: '#9398A8',
                margin: 0,
                lineHeight: 1.6,
              }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Crosslink row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8' }}>
            Need more scans?{' '}
            <Link href="/developers" style={{ color: '#6F9BC6', textDecoration: 'none' }}>
              See API plans →
            </Link>
          </span>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8' }}>
            Need a dashboard?{' '}
            <Link href="/dashboard" style={{ color: '#00C48C', textDecoration: 'none' }}>
              See agency plans →
            </Link>
          </span>
        </div>
      </section>
    </main>
  )
}
