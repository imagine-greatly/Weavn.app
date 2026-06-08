'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanState = 'idle' | 'scanning'
type Severity  = 'critical' | 'high' | 'medium'

interface Finding {
  id: string
  title: string
  severity: Severity
  dimension: string
  impact: string
  explanation: string
  recommendation: string
  rewritten_copy: string | null
}

interface ScanResult {
  url: string
  domain: string
  score: number
  site_type: string
  benchmark: {
    industry: string
    percentile: number
    average_score: number
    top_quartile: number
  }
  dimensions: {
    conversion_architecture: number
    trust_signals: number
    message_clarity: number
    traffic_readiness: number
    technical_foundation: number
  }
  findings: Finding[]
  copy_rewrites: {
    headline: string
    subheadline: string
    cta: string
  }
  growth_blueprint: Array<{
    priority: number
    action: string
    effort: string
    impact: string
    timeframe: string
  }>
  scan_meta: {
    duration_ms: number
    cost_usd: number
    scanned_at: string
  }
}

// ── Phases ────────────────────────────────────────────────────────────────────

const PHASES = [
  { label: 'URL validated',                             completeAt: 1 },
  { label: 'Page rendered (headless Chrome)',           completeAt: 2 },
  { label: 'Site classified (SaaS / ecommerce / service)', completeAt: 3 },
  { label: 'Running 307 checks…',                 completeAt: 9 },
  { label: 'Scoring and benchmarking',                 completeAt: 10 },
  { label: 'Generating findings',                      completeAt: 11 },
] as const

const PROGRESS_LABELS = [
  'Rendering page via headless browser...',
  'Classifying site type and buyer complexity...',
  'Loading diagnostic profile — 307 checks...',
  'Running hero and messaging analysis...',
  'Evaluating trust signals and social proof...',
  'Checking CTA placement and conversion flow...',
  'Analyzing narrative arc and objection handling...',
  'Running technical and mobile checks...',
  'Benchmarking against corpus...',
  'Compiling strengths and priority findings...',
  'Generating structured output...',
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(rawUrl: string): string {
  try {
    const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    return new URL(normalized).hostname
  } catch {
    return rawUrl.replace(/^https?:\/\//i, '').split('/')[0]
  }
}

function buildMockData(url: string, domain: string): ScanResult {
  return {
    url,
    domain,
    score: 61,
    site_type: 'saas_product',
    benchmark: { industry: 'saas', percentile: 34, average_score: 67, top_quartile: 82 },
    dimensions: {
      conversion_architecture: 48,
      trust_signals: 55,
      message_clarity: 52,
      traffic_readiness: 71,
      technical_foundation: 68,
    },
    findings: [
      {
        id: 'MSG_001',
        title: 'Hero headline is product-focused, not outcome-focused',
        severity: 'critical',
        dimension: 'message_clarity',
        impact: 'high',
        explanation:
          'Your headline leads with what the product is rather than what the user gains. Visitors decide in under 3 seconds whether to stay. Outcome-led headlines convert 23% better on average across SaaS landing pages.',
        recommendation:
          'Rewrite to lead with the result the user experiences. Instead of naming the product category, name the transformation.',
        rewritten_copy: 'Stop losing signups to a homepage nobody understands.',
      },
      {
        id: 'TRS_001',
        title: 'No social proof visible in first viewport',
        severity: 'high',
        dimension: 'trust_signals',
        impact: 'high',
        explanation:
          'Trust signals positioned below the fold are ignored by 76% of visitors who bounce before scrolling. Your first viewport has no evidence anyone uses or trusts this product.',
        recommendation:
          'Move at least one trust signal above the fold — customer count, recognizable logo row, or a single sharp testimonial.',
        rewritten_copy: null,
      },
      {
        id: 'CTA_002',
        title: 'Primary CTA copy is generic',
        severity: 'high',
        dimension: 'conversion_architecture',
        impact: 'medium',
        explanation:
          "CTAs using generic verbs like 'Get Started' underperform specific action CTAs by 14–32%. Generic CTAs signal low confidence in your own value proposition.",
        recommendation:
          'Replace with a specific outcome CTA that matches exactly what happens when they click.',
        rewritten_copy: 'Scan my site free →',
      },
      {
        id: 'TRS_003',
        title: 'No risk reversal visible near primary CTA',
        severity: 'medium',
        dimension: 'trust_signals',
        impact: 'medium',
        explanation:
          'Risk reversals placed within 100px of the primary CTA reduce friction and increase clicks by 8–15%.',
        recommendation:
          'Add a one-line friction reducer directly below your CTA button.',
        rewritten_copy: 'No credit card required. Results in 90 seconds.',
      },
      {
        id: 'MSG_003',
        title: 'Value proposition requires prior category knowledge',
        severity: 'medium',
        dimension: 'message_clarity',
        impact: 'medium',
        explanation:
          'Your above-fold copy assumes visitors already know what your product category does. Cold traffic needs category context in the first sentence.',
        recommendation:
          'Add a one-sentence explainer that a stranger with no context could understand in under 5 seconds.',
        rewritten_copy: null,
      },
    ],
    copy_rewrites: {
      headline:    'Stop losing signups to a homepage nobody understands.',
      subheadline: 'Get a clinical conversion audit of your site in 90 seconds. 307 checks. Specific fixes.',
      cta:         'Scan my site free →',
    },
    growth_blueprint: [
      { priority: 1, action: 'Rewrite hero headline to lead with outcome',       effort: 'low', impact: 'high',   timeframe: 'today'     },
      { priority: 2, action: 'Add social proof above the fold',                  effort: 'low', impact: 'high',   timeframe: 'this_week' },
      { priority: 3, action: 'Replace generic CTA with specific action copy',    effort: 'low', impact: 'medium', timeframe: 'today'     },
      { priority: 4, action: 'Add risk reversal below primary CTA',              effort: 'low', impact: 'medium', timeframe: 'today'     },
    ],
    scan_meta: { duration_ms: 2340, cost_usd: 0.15, scanned_at: new Date().toISOString() },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter()
  const [scanState, setScanState]           = useState<ScanState>('idle')
  const [url, setUrl]                       = useState('')
  const [visibleItems, setVisibleItems]     = useState(0)
  const [showInitiating, setShowInitiating] = useState(false)
  const [initiatingVisible, setInitiatingVisible] = useState(false)

  const domainRef = useRef('')
  const urlRef    = useRef('')
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (scanState !== 'scanning') return

    setVisibleItems(1)
    let count = 1

    const advance = () => {
      count++
      if (count <= PROGRESS_LABELS.length) {
        setVisibleItems(count)
      }
      if (count < PROGRESS_LABELS.length) {
        timerRef.current = setTimeout(advance, 1200)
      } else {
        timerRef.current = setTimeout(() => {
          const dom  = domainRef.current
          const data = buildMockData(urlRef.current || 'https://example.com', dom)
          try { sessionStorage.setItem('scan_result', JSON.stringify(data)) } catch {}
          router.push('/report/' + dom)
        }, 1000)
      }
    }

    timerRef.current = setTimeout(advance, 1200)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [scanState, router])

  function handleScan() {
    const trimmed = url.trim()
    if (!trimmed || scanState === 'scanning') return
    urlRef.current    = trimmed
    domainRef.current = extractDomain(trimmed)
    setVisibleItems(0)
    setShowInitiating(true)
    setInitiatingVisible(true)

    setTimeout(() => {
      setInitiatingVisible(false)
      setTimeout(() => {
        setShowInitiating(false)
        setScanState('scanning')
      }, 300)
    }, 1500)
  }

  // ── INITIATING OVERLAY ────────────────────────────────────────────────────

  if (showInitiating) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background: '#050810',
          opacity: initiatingVisible ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      >
        <div className="text-center">
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#6E7587',
            marginBottom: 12,
          }}>
            INITIATING DIAGNOSTIC
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            color: '#00C48C',
            marginBottom: 6,
          }}>
            POST /api/v1/scan
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: '#6E7587',
            marginBottom: 2,
          }}>
            → url: {domainRef.current}
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: '#6E7587',
            marginBottom: 10,
          }}>
            → checks: 307
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: '#6E7587',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}>
            <span>→ classifying site...</span>
            <span style={{ animation: 'terminalBlink 1s step-end infinite', color: '#00C48C' }}>▋</span>
          </div>
        </div>
      </div>
    )
  }

  // ── IDLE ──────────────────────────────────────────────────────────────────

  if (scanState === 'idle') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', textAlign: 'center' }}>

          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#6E7587',
            marginBottom: 24,
          }}>
            FREE CONVERSION SCAN
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 36,
            color: '#E6E9EE',
            lineHeight: 1.2,
            marginBottom: 16,
          }}>
            What&apos;s killing your conversions?
          </h1>

          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15,
            color: '#9398A8',
            lineHeight: 1.6,
            marginBottom: 36,
          }}>
            Paste your URL. Get a clinical diagnostic in ~90 seconds. Free. No account required.
          </p>

          <div style={{ display: 'flex' }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="https://yoursite.com"
              style={{
                flex: 1,
                background: '#0A0E18',
                border: '1px solid #1C1C2E',
                borderRight: 'none',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: '#E6E9EE',
                padding: '12px 16px',
                borderRadius: 0,
                outline: 'none',
              }}
            />
            <button
              onClick={handleScan}
              disabled={!url.trim()}
              style={{
                background: '#00C48C',
                color: '#050810',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                border: 'none',
                borderRadius: 0,
                padding: '12px 20px',
                cursor: url.trim() ? 'pointer' : 'not-allowed',
                opacity: url.trim() ? 1 : 0.45,
                flexShrink: 0,
              }}
            >
              SCAN MY SITE
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 14,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: '#6E7587',
          }}>
            <span>307 checks</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>~90 seconds</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>No account needed</span>
          </div>

        </div>
      </div>
    )
  }

  // ── SCANNING ──────────────────────────────────────────────────────────────

  const firstIncompleteIdx = PHASES.findIndex(p => p.completeAt > visibleItems)

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      <style>{`
        @keyframes waveBar {
          from { height: 6px; }
          to   { height: 36px; }
        }
        @keyframes beamSweep {
          0%   { left: -22%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 112%; opacity: 0; }
        }
        @keyframes phasePulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.45; }
        }
        @keyframes ambPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,196,140,0.4); }
          50%      { box-shadow: 0 0 0 3px rgba(0,196,140,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scan-waveform-bar { animation-duration: 4s !important; }
          .scan-beam { animation-duration: 5s !important; opacity: 0.3 !important; }
        }
        @media (max-width: 640px) {
          .scan-waveform-wrap { height: 40px !important; }
          .scan-waveform-bar  { max-height: 28px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 400, width: '100%', margin: '0 auto', textAlign: 'center' }}>

        {/* Domain */}
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          color: '#00C48C',
          marginBottom: 28,
        }}>
          {domainRef.current}
        </div>

        {/* Waveform with beam overlay */}
        <div
          className="scan-waveform-wrap"
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            height: 56,
            marginBottom: 36,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="scan-waveform-bar"
              style={{
                width: 3,
                borderRadius: 0,
                backgroundColor: '#6F9BC6',
                animation: `waveBar 1.2s ease-in-out ${Math.round((i / 19) * 800)}ms infinite alternate`,
                flexShrink: 0,
              }}
            />
          ))}
          {/* Seamless beam sweep — fades in from left, fades out right, loops */}
          <div
            className="scan-beam"
            style={{
              position: 'absolute',
              top: 0,
              left: '-22%',
              width: '22%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(111,155,198,0.22) 50%, transparent 100%)',
              animation: 'beamSweep 2.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Phase indicator */}
        <div style={{ textAlign: 'left', display: 'inline-block', minWidth: 260 }}>
          {PHASES.map((phase, idx) => {
            const isDone   = phase.completeAt <= visibleItems
            const isActive = !isDone && idx === firstIncompleteIdx
            const isPending = !isDone && !isActive

            const squareColor = isDone   ? '#00C48C'
                              : isActive ? '#6F9BC6'
                              :            '#3A3A52'

            const labelColor = isDone   ? '#9398A8'
                             : isActive ? '#E6E9EE'
                             :            '#6E7587'

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                  animation: isActive ? 'phasePulse 1.5s ease-in-out infinite' : 'none',
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    background: squareColor,
                    flexShrink: 0,
                    animation: isActive ? 'ambPulse 1.5s ease-in-out infinite' : 'none',
                  }}
                />
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: labelColor,
                }}>
                  {phase.label}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
