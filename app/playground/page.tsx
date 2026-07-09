'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { ScoreRing } from '@/components/ui/ScoreRing'

// ── Types ──────────────────────────────────────────────────────────────────────

type ScanState    = 'idle' | 'scanning' | 'complete' | 'error'
type FindingDepth = 'brief' | 'full'
type AsyncMode    = 'false' | 'true'
type SiteType     = 'auto' | 'saas' | 'ecommerce'

// ── Placeholders (no mocked response — the panel is empty until a real scan runs) ─

const IDLE_PLACEHOLDER     = `// Response will appear here\n// POST a URL to run a real scan`
const SCANNING_PLACEHOLDER = `// running a live 311-check scan against the real engine…\n// this usually takes 60–120 seconds`

// Pull a human message out of any of the real error envelopes the API can return:
//   playground rate-limit  → { error: "rate_limited", message }
//   v1 structured error     → { error: { code, message, status } }
//   config / misc           → { error: "…" }
function extractError(data: Record<string, unknown>): string {
  if (typeof data.message === 'string') return data.message
  const err = data.error
  if (err && typeof err === 'object' && typeof (err as Record<string, unknown>).message === 'string') {
    return (err as Record<string, unknown>).message as string
  }
  if (typeof err === 'string') return err
  return 'Scan failed. Please try again.'
}

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
  const [responseData, setResponseData]   = useState<Record<string, unknown> | null>(null)
  const [httpStatus, setHttpStatus]       = useState<number | null>(null)
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)
  const startRef  = useRef(0)

  async function handleRunScan(override?: string) {
    const target = (override ?? url).trim()
    if (!target || scanState === 'scanning') return
    if (override && override !== url) setUrl(override)
    setScanState('scanning')
    setScanScore(0)
    setErrorMsg(null)
    setResponseData(null)
    setHttpStatus(null)
    startRef.current = Date.now()

    try {
      const res = await fetch('/api/playground/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      const data = (await res.json()) as Record<string, unknown>
      setDurationMs(Date.now() - startRef.current)
      setResponseData(data)
      setHttpStatus(res.status)

      if (res.ok && typeof data.score === 'number') {
        setScanScore(data.score)
        setScanState('complete')
      } else {
        setScanScore(0)
        setErrorMsg(extractError(data))
        setScanState('error')
      }
    } catch {
      setDurationMs(Date.now() - startRef.current)
      setErrorMsg('Network error — please try again.')
      setScanState('error')
    }
  }

  // Pre-fill + auto-run from the homepage hand-off (/playground?url=…). Client-only
  // read (no Suspense needed); runs once on mount. Rate-limit / bot-block / quota
  // errors surface exactly as a normal run — no special-casing, no mock.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('url')
    if (u && u.trim()) void handleRunScan(u.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const responseCode =
    scanState === 'scanning'                        ? SCANNING_PLACEHOLDER :
    (scanState === 'complete' || scanState === 'error') && responseData
      ? JSON.stringify(responseData, null, 2)
      : IDLE_PLACEHOLDER

  const statusLabel: string | null =
    scanState === 'idle'     ? null :
    scanState === 'scanning' ? 'scanning… up to 2 min' :
    scanState === 'error'    ? `${httpStatus ?? ''} · error`.trim() :
                               `${httpStatus ?? 200} OK · ${(durationMs / 1000).toFixed(1)}s`

  const statusColor =
    scanState === 'error' ? '#E8635F' :
    scanState === 'complete' ? '#00C48C' :
    scanState === 'scanning' ? '#00C48C' : '#6E7587'

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
          maxWidth: 580,
        }}>
          A real, full 311-check scan against the live engine — the exact JSON the API returns, no mocked data. One free scan per hour; get your own key for more.
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

            {/* Demo-key row — shared, rate-limited key held server-side; never exposed */}
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 8,
              }}>
                DEMO KEY · SHARED · 1 SCAN / HR
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#00C48C' }}>
                  weavn_live_••••••••
                </span>
                <Link
                  href="/auth?surface=api"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: '#9D8CFF',
                    background: 'none',
                    border: '0.5px solid rgba(157,140,255,0.4)',
                    borderRadius: 0,
                    padding: '3px 8px',
                    textDecoration: 'none',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Get your own →
                </Link>
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
                onKeyDown={e => e.key === 'Enter' && void handleRunScan()}
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
                onClick={() => void handleRunScan()}
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
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#6E7587',
                margin: '10px 0 0',
                lineHeight: 1.5,
              }}>
                Live scan runs with defaults — the toggles above shape the curl you&apos;d run with your own key.
              </p>
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
                  color: statusColor,
                  animation: scanState === 'scanning'
                    ? 'playgroundStatusPulse 1.5s ease-in-out infinite'
                    : 'none',
                }}>
                  {statusLabel ?? 'waiting for scan'}
                </span>

                <ScoreRing score={scanScore} size="sm" animate={scanState === 'complete'} />
              </div>

              {/* Error banner — honest surfacing of rate-limit / bot-block / failure */}
              {scanState === 'error' && errorMsg && (
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '0.5px solid rgba(232,99,95,0.2)',
                  background: 'rgba(232,99,95,0.06)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: '#E8635F',
                  lineHeight: 1.5,
                }}>
                  {errorMsg}
                </div>
              )}

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
        {/* Explainer — 3 columns (real top-level response fields) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 40,
          marginBottom: 40,
        }}>
          {[
            { label: 'score',         body: '0–100. Calibrated to your site type.' },
            { label: 'findings[]',    body: 'Ranked by estimated conversion impact.' },
            { label: 'copy_rewrites', body: 'Drop-in replacement copy, included.' },
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
            Ready for more?{' '}
            <Link href="/auth?surface=api" style={{ color: '#9D8CFF', textDecoration: 'none' }}>
              Get your API key — 25 free scans →
            </Link>
          </span>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8' }}>
            Delivering audits to clients?{' '}
            <Link href="/agencies" style={{ color: '#6F9BC6', textDecoration: 'none' }}>
              For agencies →
            </Link>
          </span>
        </div>
      </section>
    </main>
  )
}
