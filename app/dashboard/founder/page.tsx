'use client'

import { useState, useRef, useEffect } from 'react'
import ScoreRing from '@/components/ui/ScoreRing'

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
  zone1bg:    '#06090F',
  zone3bg:    '#07090F',
} as const

function scoreBandColor(n: number): string {
  if (n >= 70) return T.jsonStr
  if (n >= 50) return T.sevHigh
  return T.sevCrit
}

function severityColor(s: string): string {
  if (s === 'critical') return T.sevCrit
  if (s === 'high')     return T.sevHigh
  if (s === 'medium')   return T.jsonMetric
  return T.inkMuted
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Priority = 1 | 2 | 3

interface Finding {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  explanation: string
  recommendation: string
  priority: Priority
  estimated_lift: string
  fix_effort: 'low' | 'medium' | 'high'
  percentile: number
  industry_avg: string
  rewritten_copy: { headline: string; cta_primary: string }
}

interface DimensionScore {
  key: string
  label: string
  score: number
  industry_avg: number
  percentile: number
}

interface ScanData {
  url: string
  domain: string
  site_type: string
  scan_date: string
  duration_ms: number
  score: number
  benchmark: { percentile: number; industry: string }
  findings: Finding[]
  dimension_scores: DimensionScore[]
  strengths: string[]
}

interface PastScan { date: string; score: number }

// ── Mock data ─────────────────────────────────────────────────────────────────
const HAS_SCANS = true

const PAST_SCANS: PastScan[] = [
  { date: 'Apr 12', score: 44 },
  { date: 'Apr 28', score: 51 },
  { date: 'May 9',  score: 51 },
  { date: 'May 21', score: 58 },
  { date: 'Jun 2',  score: 61 },
  { date: 'Jun 8',  score: 61 },
]

const SCAN: ScanData = {
  url:         'webdocai.com',
  domain:      'webdocai.com',
  site_type:   'B2B SAAS',
  scan_date:   'Jun 8, 2026',
  duration_ms: 87340,
  score:       61,
  benchmark:   { percentile: 34, industry: 'B2B SaaS' },
  findings: [
    {
      id: 'MSG-001', priority: 1, severity: 'critical',
      category: 'MESSAGE_CLARITY',
      title: 'Hero headline is product-focused, not outcome-focused',
      explanation: 'Current headline: "The website intelligence platform." This names the product category but communicates zero user benefit. Outcome-led headlines convert 23% better across SaaS landing pages.',
      recommendation: 'Rewrite to lead with the result the user experiences. Name the transformation, not the tool. "Find what\'s costing you conversions. Fix it today." speaks directly to the outcome.',
      estimated_lift: '+18–24%', fix_effort: 'low', percentile: 12, industry_avg: '58%',
      rewritten_copy: { headline: 'Find what\'s costing you conversions. Fix it today.', cta_primary: 'Scan my site free →' },
    },
    {
      id: 'TRS-001', priority: 1, severity: 'high',
      category: 'TRUST_SIGNALS',
      title: 'No social proof visible in first viewport',
      explanation: 'Zero trust signals appear above the fold. No customer count, logo row, or testimonial. Trust signals below the fold are ignored by 76% of visitors who bounce before scrolling.',
      recommendation: 'Move at least one trust signal above the fold. Customer count or a sharp single testimonial. "Trusted by 1,200+ founders" requires 4 words and recovers hesitant visitors.',
      estimated_lift: '+12–16%', fix_effort: 'low', percentile: 22, industry_avg: '63%',
      rewritten_copy: { headline: '1,200+ SaaS founders have run their site through this.', cta_primary: 'Join them →' },
    },
    {
      id: 'CTA-001', priority: 1, severity: 'high',
      category: 'CONVERSION_ARCHITECTURE',
      title: 'Primary CTA copy is generic',
      explanation: 'CTA reads "Get Started" — one of the 5 lowest-performing CTA patterns. Generic verbs underperform specific action CTAs by 14–32% across tested SaaS pages.',
      recommendation: 'Replace with a specific outcome CTA. Match the verb to what literally happens when they click. "Get my report" outperforms "Get Started" by an average of 22%.',
      estimated_lift: '+14–22%', fix_effort: 'low', percentile: 18, industry_avg: '61%',
      rewritten_copy: { headline: 'Get your full conversion audit free', cta_primary: 'Scan my site — takes 90 seconds →' },
    },
    {
      id: 'TRS-002', priority: 2, severity: 'medium',
      category: 'TRUST_SIGNALS',
      title: 'No risk reversal near primary CTA',
      explanation: 'There is no friction reducer within 100px of the primary CTA. Risk reversals placed near the CTA reduce click hesitation by 8–15%.',
      recommendation: 'Add a one-line friction reducer directly below the button. "No credit card. No signup. Just a URL." costs 6 words and recovers hesitant visitors.',
      estimated_lift: '+8–12%', fix_effort: 'low', percentile: 41, industry_avg: '55%',
      rewritten_copy: { headline: 'Your full conversion audit — no signup, just a URL.', cta_primary: 'Run free audit →' },
    },
    {
      id: 'MSG-002', priority: 2, severity: 'medium',
      category: 'MESSAGE_CLARITY',
      title: 'Value proposition requires category knowledge',
      explanation: 'Above-fold copy assumes the visitor understands what "website conversion intelligence" means. Cold traffic from ads will not have this context and will bounce within 4 seconds.',
      recommendation: 'Add one sentence that a stranger with no context understands in 5 seconds. Explain the category, then the benefit.',
      estimated_lift: '+6–10%', fix_effort: 'low', percentile: 38, industry_avg: '52%',
      rewritten_copy: { headline: 'Paste your URL. We run 307 checks. You get a ranked fix list in 90 seconds.', cta_primary: 'Try it free →' },
    },
    {
      id: 'OBJ-001', priority: 3, severity: 'medium',
      category: 'OBJECTION_HANDLING',
      title: 'No objection handling on pricing page',
      explanation: 'Pricing page lists features and price but provides zero objection handling. "Is this worth it?" is the primary question at this stage and goes unanswered.',
      recommendation: 'Add a 3-item FAQ below pricing. Address the top 3 objections: "What if my score is already good?", "Can I cancel?", "How is this different from Analytics?"',
      estimated_lift: '+4–8%', fix_effort: 'medium', percentile: 44, industry_avg: '50%',
      rewritten_copy: { headline: 'The diagnostic your ad spend deserves.', cta_primary: 'Start free →' },
    },
  ],
  dimension_scores: [
    { key: 'conversion_architecture', label: 'Conversion Arch.',    score: 48, industry_avg: 62, percentile: 21 },
    { key: 'trust_signals',           label: 'Trust Signals',        score: 55, industry_avg: 61, percentile: 38 },
    { key: 'message_clarity',         label: 'Message Clarity',      score: 52, industry_avg: 65, percentile: 29 },
    { key: 'traffic_readiness',       label: 'Traffic Readiness',    score: 71, industry_avg: 58, percentile: 73 },
    { key: 'technical_foundation',    label: 'Technical Foundation', score: 68, industry_avg: 63, percentile: 61 },
    { key: 'objection_handling',      label: 'Objection Handling',   score: 44, industry_avg: 53, percentile: 18 },
    { key: 'offer_clarity',           label: 'Offer Clarity',        score: 72, industry_avg: 60, percentile: 76 },
  ],
  strengths: [
    'Page load speed in top 15% of B2B SaaS sites — under 1.8s on mobile',
    'SSL certificate valid, HTTPS enforced, no mixed content warnings',
    'OpenGraph metadata complete — social previews render correctly',
    'Schema markup present — Google can extract business entity data',
    'Primary navigation is unambiguous — 3 items, clear hierarchy',
  ],
}

// ── SVG chart helpers ─────────────────────────────────────────────────────────
const CW = 560
const CH = 80
const CPY = 8

function scoreToY(s: number): number { return CPY + (1 - s / 100) * (CH - CPY * 2) }
function idxToX(i: number, n: number): number { return (i / (n - 1)) * CW }

// ── Priority labels + pills ───────────────────────────────────────────────────
const P_LABEL: Record<Priority, string> = {
  1: 'P1 — FIX THIS WEEK',
  2: 'P2 — FIX THIS MONTH',
  3: 'P3 — WHEN YOU CAN',
}

const P_PILL: Record<Priority, { bg: string; color: string; text: string }> = {
  1: { bg: 'rgba(232,99,95,0.13)',   color: '#E8635F', text: 'P1 CRITICAL' },
  2: { bg: 'rgba(239,178,62,0.13)',  color: '#EFB23E', text: 'P2 HIGH'     },
  3: { bg: 'rgba(111,155,198,0.13)', color: '#6F9BC6', text: 'P3 MEDIUM'   },
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function FounderDashboard() {
  const scan = SCAN
  const pastScans = PAST_SCANS

  const firstP1Id = scan.findings.find(f => f.priority === 1)?.id ?? scan.findings[0]?.id ?? ''
  const [selectedId, setSelectedId] = useState<string>(firstP1Id)
  const [urlInput, setUrlInput]     = useState('')
  const [urlFocused, setUrlFocused] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const animatedRef = useRef(false)

  useEffect(() => {
    if (!animatedRef.current && !sessionStorage.getItem('founder-ring-animated')) {
      animatedRef.current = true
      sessionStorage.setItem('founder-ring-animated', '1')
      setShouldAnimate(true)
    }
  }, [])

  const selectedFinding = scan.findings.find(f => f.id === selectedId) ?? null

  const grouped = ([1, 2, 3] as Priority[])
    .map(p => ({ priority: p, findings: scan.findings.filter(f => f.priority === p) }))
    .filter(g => g.findings.length > 0)

  function copyHeadline(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  // ── EMPTY STATE ──────────────────────────────────────────────────────────────
  if (!HAS_SCANS) {
    return (
      <>
        <style>{`
          @keyframes _scan_pulse { 0%,100%{opacity:1} 50%{opacity:.75} }
          ._scan_btn { animation: _scan_pulse 2s ease-in-out infinite; }
        `}</style>
        <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
          <div style={{ width: '100%', maxWidth: 560, padding: '0 24px' }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: T.jsonMetric, marginBottom: 12 }}>SCAN</p>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 36, color: T.inkPrimary, marginBottom: 12, lineHeight: 1.1 }}>Paste your URL. Get a diagnosis.</h1>
            <p style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 15, color: T.inkSec, marginBottom: 32 }}>307 checks. Ranked findings. Rewritten copy. Under 90 seconds.</p>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', padding: '8px 14px', marginBottom: 16 }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: T.jsonStr, flexShrink: 0 }} />
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkSec }}>api.webdocai.com</span>
              <span style={{ color: T.inkMuted }}>·</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonMetric }}>endpoint: /v1/scan</span>
            </div>

            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted, marginBottom: 6 }}>POST /api/v1/scan</p>

            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onFocus={() => setUrlFocused(true)}
              onBlur={() => setUrlFocused(false)}
              placeholder="https://your-site.com"
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: T.bg,
                borderTop:    `1px solid ${urlFocused ? 'rgba(0,196,140,0.6)' : 'rgba(255,255,255,0.1)'}`,
                borderLeft:   '1px solid rgba(255,255,255,0.07)',
                borderRight:  '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: T.inkSec,
                padding: '14px 16px', outline: 'none', borderRadius: 0,
                transition: 'border-top-color 0.15s',
              }}
            />

            <button
              className="_scan_btn"
              style={{
                display: 'block', width: '100%', background: T.jsonStr, color: T.bg,
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 13,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '14px', border: 'none', cursor: 'pointer', borderRadius: 0, marginBottom: 12,
              }}
            >
              SCAN MY SITE →
            </button>

            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted, textAlign: 'center' }}>
              307 CHECKS · ~90 SECONDS · RESULTS SAVED TO YOUR DASHBOARD
            </p>
          </div>
        </div>
      </>
    )
  }

  // ── LOADED STATE ─────────────────────────────────────────────────────────────
  const n = pastScans.length
  const lastScore = pastScans[n - 1]?.score ?? scan.score
  const lineColor = scoreBandColor(lastScore)
  const chartPts = pastScans.map((p, i) => `${idxToX(i, n).toFixed(1)},${scoreToY(p.score).toFixed(1)}`).join(' ')
  const y70 = scoreToY(70)

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>

      {/* ── ZONE 1 — INSTRUMENT HEADER ──────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        background: T.zone1bg,
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        padding: '16px 32px',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 24,
      }}>
        {/* Left */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: T.jsonStr }}>{scan.domain}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, background: 'rgba(111,155,198,0.1)', color: T.jsonMetric, padding: '3px 8px' }}>{scan.site_type}</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>
              Scanned {scan.scan_date} · {scan.duration_ms.toLocaleString()}ms
            </span>
          </div>
        </div>

        {/* Center */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <ScoreRing score={scan.score} size="lg" animate={shouldAnimate} />
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonMetric }}>
            {scan.benchmark.percentile}th of {scan.benchmark.industry} sites
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            {([
              { label: 'FINDINGS',  value: scan.findings.length,  color: T.sevHigh  },
              { label: 'STRENGTHS', value: scan.strengths.length,  color: T.jsonStr  },
              { label: 'COST',      value: '$0.15',                color: T.inkTert  },
            ] as { label: string; value: string | number; color: string }[]).map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>{s.label}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 18, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ background: 'transparent', border: `0.5px solid ${T.jsonMetric}`, color: T.jsonMetric, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, padding: '8px 16px', cursor: 'pointer', borderRadius: 0 }}>
              RESCAN →
            </button>
            <button style={{ background: 'transparent', border: 'none', color: T.inkMuted, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, cursor: 'pointer', padding: '8px 0', borderRadius: 0 }}>
              SHARE REPORT →
            </button>
          </div>
        </div>
      </header>

      {/* ── ZONES 2 + 3 ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '55fr 45fr', overflow: 'hidden' }}>

        {/* ── ZONE 2 — LEFT PANEL ─────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', padding: 32 }}>

          {/* Findings list */}
          {grouped.map((group, gi) => (
            <div key={group.priority}>
              <div style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted,
                padding: gi === 0 ? '0 0 10px' : '16px 0 10px',
                borderTop: gi === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.05)',
              }}>
                {P_LABEL[group.priority]}
              </div>

              {group.findings.map(f => {
                const sel = f.id === selectedId
                const sc = severityColor(f.severity)
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                      borderLeft: sel ? '3px solid rgba(128,128,192,0.4)' : `3px solid ${sc}`,
                      background: sel ? 'rgba(128,128,192,0.04)' : 'transparent',
                      padding: '14px 16px',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 15, fontWeight: 500, color: T.inkPrimary, marginBottom: 4 }}>{f.title}</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonKey }}>{f.category}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, background: `${sc}1a`, color: sc, padding: '2px 6px' }}>{f.severity.toUpperCase()}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonStr }}>{f.estimated_lift}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Dimension scores */}
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted, padding: '32px 0 16px' }}>
            DIMENSION SCORES
          </div>
          {scan.dimension_scores.map(dim => {
            const dc = scoreBandColor(dim.score)
            const pct = dim.percentile >= 50 ? `top ${100 - dim.percentile}%` : `bottom ${dim.percentile}%`
            return (
              <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted, width: 140, flexShrink: 0 }}>{dim.label}</span>
                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${dim.score}%`, background: dc }} />
                  <div style={{ position: 'absolute', top: 0, left: `${dim.industry_avg}%`, width: 1.5, height: '100%', background: 'rgba(255,255,255,0.3)' }} />
                </div>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 13, color: dc, width: 28, textAlign: 'right' }}>{dim.score}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted, width: 80, textAlign: 'right' }}>{pct}</span>
              </div>
            )
          })}

          {/* Strengths */}
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted, padding: '32px 0 16px' }}>
            VERIFIED STRENGTHS
          </div>
          {scan.strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: 5, height: 5, background: T.jsonStr, flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, color: T.inkSec }}>{s}</span>
            </div>
          ))}

          {/* Score history */}
          {pastScans.length > 1 && (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted, padding: '32px 0 16px' }}>
                SCORE HISTORY
              </div>
              <div className="wd-panel" style={{ padding: '16px 20px' }}>
                <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" height={CH} style={{ display: 'block', overflow: 'visible' }}>
                  <line x1={0} y1={y70} x2={CW} y2={y70} stroke="rgba(0,196,140,0.2)" strokeWidth={1} strokeDasharray="4 4" />
                  <text x={4} y={y70 - 3} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill={T.inkMuted}>70</text>
                  <polyline points={chartPts} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                  {pastScans.map((p, i) => (
                    <circle key={i} cx={idxToX(i, n)} cy={scoreToY(p.score)} r={3} fill={lineColor}
                      style={{ filter: `drop-shadow(0 0 4px ${lineColor}80)` }} />
                  ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {pastScans.map((p, i) => (
                    <span key={i} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: T.inkMuted }}>{p.date}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── ZONE 3 — RIGHT PANEL (finding detail) ───────────────────────── */}
        <div style={{
          overflowY: 'auto',
          background: T.zone3bg,
          borderTop: '1px solid rgba(128,128,192,0.25)',
          borderLeft: '0.5px solid rgba(128,128,192,0.1)',
          boxShadow: 'inset 0 0 40px rgba(128,128,192,0.06), 0 0 60px rgba(128,128,192,0.04)',
          padding: 28,
        }}>
          {!selectedFinding ? (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted, textAlign: 'center', paddingTop: 60 }}>
              Select a finding from the list.
            </div>
          ) : (() => {
            const f = selectedFinding
            const sc = severityColor(f.severity)
            const pp = P_PILL[f.priority]
            return (
              <div>
                {/* Header bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, padding: '3px 9px', background: pp.bg, color: pp.color }}>{pp.text}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonKey }}>{f.category}</span>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonMetric }}>fix_effort: {f.fix_effort}</span>
                </div>

                {/* Title */}
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 22, color: T.inkPrimary, lineHeight: 1.2, marginBottom: 20 }}>
                  {f.title}
                </h2>

                {/* Evidence */}
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(111,155,198,0.3)', marginBottom: 16 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted, marginBottom: 8 }}>EVIDENCE FROM PAGE</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: T.inkSec, lineHeight: 1.65 }}>{f.explanation}</div>
                </div>

                {/* Fix */}
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(0,196,140,0.3)', marginBottom: 16 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted, marginBottom: 8 }}>RECOMMENDED FIX</div>
                  <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 15, color: T.inkSec, lineHeight: 1.65 }}>{f.recommendation}</div>
                </div>

                {/* Metrics row */}
                <div style={{ padding: '16px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                  {([
                    { label: 'estimated_lift', value: f.estimated_lift,      color: T.jsonStr   },
                    { label: 'percentile',      value: `${f.percentile}th`,  color: T.jsonMetric },
                    { label: 'industry_avg',    value: f.industry_avg,       color: T.jsonMetric },
                    { label: 'severity',        value: f.severity,           color: sc           },
                  ] as { label: string; value: string; color: string }[]).map(m => (
                    <div key={m.label}>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>{m.label}</div>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 15, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Rewritten copy */}
                <div style={{ padding: 16, background: 'rgba(0,196,140,0.03)', borderTop: '1px solid rgba(0,196,140,0.12)' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted, marginBottom: 12 }}>
                    REWRITTEN COPY · INCLUDED IN RESPONSE
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted, flexShrink: 0 }}>headline:</span>
                    <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 16, color: T.jsonStr, fontWeight: 500 }}>{f.rewritten_copy.headline}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted, flexShrink: 0 }}>cta_primary:</span>
                    <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, color: T.jsonStr }}>{f.rewritten_copy.cta_primary}</span>
                  </div>
                  <button
                    onClick={() => copyHeadline(f.rewritten_copy.headline)}
                    style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: `0.5px solid ${T.jsonMetric}`, color: copied ? T.jsonStr : T.jsonMetric, padding: '6px 12px', background: 'transparent', cursor: 'pointer', borderRadius: 0 }}
                  >
                    {copied ? 'Copied ✓' : 'Copy headline'}
                  </button>
                </div>
              </div>
            )
          })()}
        </div>

      </div>
    </div>
  )
}
