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

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRESS_LABELS = [
  'Page content fetched',
  'Site type classified',
  'Running conversion checks...',
  'Analyzing trust signals...',
  'Checking message clarity...',
  'Generating findings...',
]

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
      subheadline: 'Get a clinical conversion audit of your site in 90 seconds. 260+ checks. Specific fixes.',
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
  const [scanState, setScanState]   = useState<ScanState>('idle')
  const [url, setUrl]               = useState('')
  const [visibleItems, setVisibleItems] = useState(0)

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
    setScanState('scanning')
  }

  // ── IDLE ───────────────────────────────────────────────────────────────────

  if (scanState === 'idle') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
        <div className="max-w-lg w-full mx-auto text-center">

          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-6">
            FREE CONVERSION SCAN
          </div>

          <h1 className="font-display font-bold text-4xl text-text-primary leading-tight mb-4">
            What&apos;s killing your conversions?
          </h1>

          <p className="font-body text-base text-text-secondary mb-10">
            Paste your URL. Get a clinical diagnostic in ~90 seconds. Free. No account required.
          </p>

          <div className="flex">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="https://yoursite.com"
              className="flex-1 bg-background-raised border border-background-border font-mono text-sm text-text-primary px-4 py-3 focus:border-cyan-DEFAULT focus:outline-none placeholder:text-text-tertiary"
            />
            <button
              onClick={handleScan}
              disabled={!url.trim()}
              className="bg-cyan-DEFAULT text-background-base font-mono text-sm font-bold px-6 py-3 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              SCAN MY SITE
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4 font-mono text-xs text-text-tertiary">
            <span>260+ checks</span>
            <span className="opacity-40">·</span>
            <span>~90 seconds</span>
            <span className="opacity-40">·</span>
            <span>No account needed</span>
          </div>

        </div>
      </div>
    )
  }

  // ── SCANNING ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      <style>{`
        @keyframes waveBar {
          from { height: 8px; }
          to   { height: 40px; }
        }
        @keyframes itemPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>

      <div className="max-w-sm w-full mx-auto text-center">

        {/* Domain */}
        <div className="font-mono text-sm text-text-secondary mb-8">
          Scanning {domainRef.current}...
        </div>

        {/* Waveform */}
        <div
          className="flex items-center justify-center mb-10"
          style={{ gap: 4, height: 60 }}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              style={{
                width:           3,
                borderRadius:    2,
                backgroundColor: '#00C8FF',
                animation:       `waveBar 1.2s ease-in-out ${Math.round((i / 19) * 800)}ms infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Progress items */}
        <div className="text-left inline-block">
          {PROGRESS_LABELS.slice(0, visibleItems).map((label, i) => {
            const isComplete = i < visibleItems - 1
            const isCurrent  = i === visibleItems - 1
            return (
              <div
                key={i}
                className="flex items-center gap-2 mb-2"
                style={isCurrent ? { animation: 'itemPulse 1.5s ease-in-out infinite' } : {}}
              >
                <span
                  className={`font-mono text-xs w-4 flex-shrink-0 ${
                    isComplete ? 'text-green-400' : 'text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span
                  className={`font-mono text-xs ${
                    isComplete ? 'text-text-secondary' :
                    isCurrent  ? 'text-text-primary'   :
                                 'text-text-tertiary'
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
