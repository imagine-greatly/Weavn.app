'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Stat } from '@/components/ui/Stat'
import { ScoreRing } from '@/components/ui/ScoreRing'

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES: { name: string; tier: 'core' | 'universal' | 'vertical' }[] = [
  { name: 'Hero Section', tier: 'core' },
  { name: 'Trust & Credibility', tier: 'core' },
  { name: 'CTA & Conversion', tier: 'core' },
  { name: 'Messaging & Clarity', tier: 'core' },
  { name: 'Social Proof', tier: 'core' },
  { name: 'SEO & Metadata', tier: 'universal' },
  { name: 'Navigation & UX', tier: 'universal' },
  { name: 'Psychology & Persuasion', tier: 'core' },
  { name: 'Page & Content Gaps', tier: 'universal' },
  { name: 'Offer & Pricing', tier: 'core' },
  { name: 'Email & Retention', tier: 'vertical' },
  { name: 'Product Page', tier: 'vertical' },
  { name: 'Mobile Experience', tier: 'universal' },
  { name: 'Checkout & Purchase', tier: 'vertical' },
  { name: 'Page Speed & Technical', tier: 'universal' },
  { name: 'Competitive Differentiation', tier: 'universal' },
  { name: 'Specificity & Claims', tier: 'core' },
  { name: 'Return & Retention', tier: 'vertical' },
  { name: 'Accessibility', tier: 'universal' },
  { name: 'Universal', tier: 'universal' },
  { name: 'SaaS-Specific', tier: 'vertical' },
  { name: 'E-commerce', tier: 'vertical' },
  { name: 'Agency & Service', tier: 'vertical' },
  { name: 'Conversion Path', tier: 'core' },
  { name: 'Narrative Flow', tier: 'core' },
  { name: 'Objection Handling', tier: 'core' },
  { name: 'Offer Clarity', tier: 'core' },
]

const TIER_STYLES = {
  core:      { border: '#00C48C', bg: 'rgba(0,196,140,0.06)',    color: '#00C48C' },
  universal: { border: '#6F9BC6', bg: 'rgba(111,155,198,0.06)',  color: '#6F9BC6' },
  vertical:  { border: '#8080C0', bg: 'rgba(128,128,192,0.06)',  color: '#8080C0' },
} as const

interface PipelineStep {
  num: string
  label: string
  title: string
  description: string
  code: string | null
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    num: '01',
    label: 'URL SUBMISSION',
    title: 'Request received',
    description:
      'You POST a URL with optional parameters: fields to return, finding_depth (brief or full), async mode, page paths for multi-page scans, and site_type override. The API validates the URL and queues the scan.',
    code: 'POST /api/v1/scan\n{\n  "url": "https://your-site.com",\n  "finding_depth": "full",\n  "async": false\n}',
  },
  {
    num: '02',
    label: 'BROWSER RENDERING',
    title: 'Full page render',
    description:
      'Browserless Pro renders the full page using headless Chrome with stealth mode enabled. JavaScript executes completely before analysis begins. We see exactly what a real visitor sees — not the raw HTML.',
    code: null,
  },
  {
    num: '03',
    label: 'SITE CLASSIFICATION',
    title: 'Intelligence before checks',
    description:
      'Before a single check runs, the scanner classifies the site across four dimensions: site type (SaaS, ecommerce, service, B2B, creator, local), price point tier, buyer complexity (transactional, consultative, enterprise), and traffic temperature. This classification gates which checks apply and how severity is weighted.',
    code: '{\n  "site_type": "saas",\n  "buyer_complexity": "consultative",\n  "score_profile": "saas_consultative"\n}',
  },
  {
    num: '04',
    label: 'CHECK EXECUTION',
    title: '311 checks, correctly applied',
    description:
      "Universal checks run on every site. Vertical checks run only when relevant — ecommerce checks never fire on a SaaS scan, SaaS checks never fire on a service site. Page-type checks apply only to the matching page. This means every finding is relevant to what's actually being scanned.",
    code: null,
  },
  {
    num: '05',
    label: 'AI ANALYSIS',
    title: 'Sonnet evaluates the page',
    description:
      "Claude Sonnet reads the rendered page content and evaluates each applicable check. Every finding must reference specific visible content — never fabricated. The model identifies what's present, what's absent, and what's present but incorrectly placed.",
    code: null,
  },
  {
    num: '06',
    label: 'WEIGHTED SCORING',
    title: 'Score calibrated to site type',
    description:
      "Seven dimension scores are computed and weighted by the site's classification profile. Trust signals weight higher for consultative buyers. Checkout friction weights higher for ecommerce. The overall score reflects what actually matters for that site's conversion context — not a generic average.",
    code: '{\n  "score": 61,\n  "score_profile": "saas_consultative",\n  "dimensions": {\n    "trust_signals": 37,\n    "conversion_architecture": 58,\n    "message_clarity": 63\n  }\n}',
  },
  {
    num: '07',
    label: 'BENCHMARKING',
    title: 'Positioned against real sites',
    description:
      'Each dimension score is compared against accumulated corpus data from sites in the same vertical. A trust score of 37 on a SaaS site returns "Bottom 15% of SaaS sites" — not a generic percentile. Benchmarks improve as corpus volume grows.',
    code: '{\n  "dimension_benchmarks": {\n    "trust_signals": {\n      "score": 37,\n      "average": 61,\n      "percentile_label": "Bottom 15% of SaaS sites"\n    }\n  }\n}',
  },
  {
    num: '08',
    label: 'OUTPUT ASSEMBLY',
    title: 'Structured response returned',
    description:
      'Findings are sorted by priority — a 1-based rank, lowest number first — each with severity and fix_effort. Strengths surface what\'s working. The full response is a complete conversion diagnostic in one structured JSON object.',
    code: '{\n  "findings_summary": 23,\n  "strengths": [...],\n  "findings": [...]\n}',
  },
]

// ── Three-panel pipeline (INPUT / PROCESSING / OUTPUT) ───────────────────────

const HIW_SCAN_CATS = [
  'hero_section', 'value_proposition', 'trust_credibility',
  'cta_conversion', 'social_proof', 'benchmark_positioning',
  'copy_effectiveness', 'mobile_experience', 'trust_signals',
]

const HIW_JSON_LINES: { delay: number; indent: boolean; content: React.ReactNode }[] = [
  { delay: 0.1,  indent: false, content: <span style={{ color: '#6E7587' }}>{'{'}</span> },
  { delay: 0.3,  indent: true,  content: <><span style={{ color: '#8080c0' }}>&quot;score&quot;</span><span style={{ color: '#9398A8' }}>: </span><span style={{ color: '#E8635F' }}>61</span><span style={{ color: '#6E7587' }}>,</span></> },
  { delay: 0.5,  indent: true,  content: <><span style={{ color: '#8080c0' }}>&quot;severity&quot;</span><span style={{ color: '#9398A8' }}>: </span><span style={{ color: '#E8635F' }}>&quot;critical&quot;</span><span style={{ color: '#6E7587' }}>,</span></> },
  { delay: 0.7,  indent: true,  content: <><span style={{ color: '#8080c0' }}>&quot;percentile&quot;</span><span style={{ color: '#9398A8' }}>: </span><span style={{ color: '#6F9BC6' }}>63</span><span style={{ color: '#6E7587' }}>,</span></> },
  { delay: 0.9,  indent: true,  content: <><span style={{ color: '#8080c0' }}>&quot;findings&quot;</span><span style={{ color: '#9398A8' }}>: </span><span style={{ color: '#6F9BC6' }}>23</span><span style={{ color: '#6E7587' }}>,</span></> },
  { delay: 1.1,  indent: true,  content: <><span style={{ color: '#8080c0' }}>&quot;industry&quot;</span><span style={{ color: '#9398A8' }}>: </span><span style={{ color: '#00C48C' }}>&quot;B2B SaaS&quot;</span><span style={{ color: '#6E7587' }}>,</span></> },
  { delay: 1.3,  indent: true,  content: <><span style={{ color: '#8080c0' }}>&quot;cost_usd&quot;</span><span style={{ color: '#9398A8' }}>: </span><span style={{ color: '#9398A8' }}>0.15</span></> },
  { delay: 1.5,  indent: false, content: <span style={{ color: '#6E7587' }}>{'}'}</span> },
]

function HowItWorksSection() {
  const [litIdx, setLitIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setLitIdx(i => (i + 1) % HIW_SCAN_CATS.length), 400)
    return () => clearInterval(t)
  }, [])

  return (
    <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden', background: '#050810' }}>
      <style>{`
        @keyframes hiw-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes hiw-flow { from{left:-22%} to{left:112%} }
        @keyframes hiw-json-line { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @media (prefers-reduced-motion: reduce) {
          .hiw-cursor{animation:none!important}
          .hiw-flow-dot{display:none!important}
          .hiw-json-line{animation:none!important;opacity:1!important;transform:none!important}
        }
      `}</style>

      {/* Three-lane ambient blooms */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 480px 700px at 16% 70%, rgba(111,155,198,0.08) 0%, transparent 60%)',
          'radial-gradient(ellipse 480px 700px at 50% 70%, rgba(128,128,192,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 480px 700px at 84% 70%, rgba(0,196,140,0.06) 0%, transparent 60%)',
        ].join(', '),
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Header */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 16px' }}>
          THE PIPELINE
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
          Three steps. One structured response.
        </h2>
        <p style={{ ...MONO, fontSize: 12, color: '#6E7587', margin: '0 0 48px', letterSpacing: '0.04em' }}>
          One POST request. 311 checks fire in sequence. Structured JSON returns.
        </p>

        {/* Step connector row with traveling highlight */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div className="hidden sm:block" style={{ position: 'absolute', top: 15, left: '16%', right: '16%', height: 1, background: 'rgba(111,155,198,0.12)', overflow: 'hidden' }}>
            <div className="hiw-flow-dot" style={{
              position: 'absolute', top: 0, height: '100%', width: '22%',
              background: 'linear-gradient(to right, transparent, rgba(111,155,198,0.55), transparent)',
              animation: 'hiw-flow 2.2s linear infinite',
            }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {([
              { num: '01', label: 'INPUT',      accent: '#6F9BC6', aRgba: '111,155,198' },
              { num: '02', label: 'PROCESSING', accent: '#9D8CFF', aRgba: '157,140,255' },
              { num: '03', label: 'OUTPUT',     accent: '#00C48C', aRgba: '0,196,140'   },
            ] as const).map(s => (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  ...MONO, fontSize: 12, color: s.accent,
                  background: '#050810',
                  border: `0.5px solid rgba(${s.aRgba},0.3)`,
                  padding: '5px 12px',
                  letterSpacing: '0.15em',
                  position: 'relative', zIndex: 1,
                }}>
                  {s.num}
                </div>
                <div style={{ ...MONO, fontSize: 10, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.65 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three equal panels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          {/* Panel 01 — INPUT */}
          <div style={{
            background: '#0A0E18',
            borderTop: '1px solid rgba(111,155,198,0.42)',
            borderLeft: '1px solid rgba(111,155,198,0.14)',
            borderRight: '1px solid rgba(111,155,198,0.07)',
            borderBottom: '1px solid rgba(111,155,198,0.05)',
            boxShadow: '0 0 0 1px rgba(111,155,198,0.1), 0 0 24px rgba(111,155,198,0.07)',
            minHeight: 320, display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(111,155,198,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.15em' }}>terminal · curl</span>
            </div>
            <div style={{ padding: '16px', flexGrow: 1, position: 'relative', zIndex: 2 }}>
              <pre style={{ ...MONO, fontSize: 12, lineHeight: 1.85, margin: 0, color: '#9398A8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <span style={{ color: '#00C8FF' }}>curl</span>{' -X POST \\\n'}
                {'  https://api.weavn.app/v1/scan \\\n'}
                {'  -H '}<span style={{ color: '#8080c0' }}>&quot;Authorization: Bearer </span><span style={{ color: '#E8635F' }}>weavn_live_••••</span><span style={{ color: '#8080c0' }}>&quot;</span>{' \\\n'}
                {'  -d '}<span style={{ color: '#8080c0' }}>&apos;&#123;&quot;url&quot;: &quot;</span><span style={{ color: '#00C48C' }}>https://your-site.com</span><span style={{ color: '#8080c0' }}>&quot;&#125;&apos;</span>
                <span className="hiw-cursor" style={{ display: 'inline-block', width: 7, height: 13, background: '#6F9BC6', verticalAlign: 'text-bottom', marginLeft: 3, animation: 'hiw-cursor-blink 1s step-end infinite' }} />
              </pre>
            </div>
            <div style={{ padding: '0 14px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
              {[{ l: '311 checks', c: '#00C48C' }, { l: '27 categories', c: '#6F9BC6' }, { l: '~90s median', c: '#6E7587' }].map(x => (
                <span key={x.l} style={{ ...MONO, fontSize: 10, color: x.c, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', padding: '4px 8px' }}>{x.l}</span>
              ))}
            </div>
          </div>

          {/* Panel 02 — PROCESSING */}
          <div style={{
            background: '#0A0E18',
            borderTop: '1px solid rgba(157,140,255,0.42)',
            borderLeft: '1px solid rgba(157,140,255,0.12)',
            borderRight: '1px solid rgba(157,140,255,0.06)',
            borderBottom: '1px solid rgba(157,140,255,0.04)',
            boxShadow: '0 0 0 1px rgba(157,140,255,0.08), 0 0 24px rgba(157,140,255,0.07)',
            minHeight: 320, display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(157,140,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.15em' }}>SCANNING</span>
              <span style={{ ...MONO, fontSize: 10, color: '#9D8CFF', marginLeft: 'auto' }}>ai · 311 checks</span>
            </div>
            <div style={{ padding: '14px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {HIW_SCAN_CATS.map((name, i) => {
                const isLit = i <= litIdx
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 5, height: 5, flexShrink: 0, display: 'inline-block', background: isLit ? '#00C48C' : 'rgba(110,117,135,0.2)', transition: 'background 0.18s' }} />
                    <span style={{ ...MONO, fontSize: 11, color: isLit ? '#9398A8' : '#3B4257', transition: 'color 0.18s' }}>{name}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '10px 14px 14px' }}>
              <span style={{ ...MONO, fontSize: 11, color: '#404860' }}>running 311 checks · 27 categories</span>
              <span style={{ ...MONO, fontSize: 11, color: '#9D8CFF' }}> ···</span>
            </div>
          </div>

          {/* Panel 03 — OUTPUT */}
          <div style={{
            background: '#0A0E18',
            borderTop: '1px solid rgba(0,196,140,0.42)',
            borderLeft: '1px solid rgba(0,196,140,0.12)',
            borderRight: '1px solid rgba(0,196,140,0.06)',
            borderBottom: '1px solid rgba(0,196,140,0.04)',
            boxShadow: '0 0 0 1px rgba(0,196,140,0.08), 0 0 24px rgba(0,196,140,0.07)',
            minHeight: 320, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(0,196,140,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.15em' }}>response.json</span>
              <span style={{ ...MONO, fontSize: 10, color: '#00C48C', marginLeft: 'auto' }}>200 OK</span>
            </div>
            <div style={{ padding: '14px 16px', flexGrow: 1 }}>
              {HIW_JSON_LINES.map((line, i) => (
                <div
                  key={i}
                  className="hiw-json-line"
                  style={{
                    ...MONO, fontSize: 12, lineHeight: 1.9,
                    paddingLeft: line.indent ? 16 : 0,
                    opacity: 0,
                    animation: `hiw-json-line 0.3s ease-out ${line.delay}s both`,
                  }}
                >
                  {line.content}
                </div>
              ))}
            </div>
            <div style={{ padding: '0 16px 14px' }}>
              <p style={{ ...MONO, fontSize: 11, color: '#404860', margin: 0 }}>Build against this schema once. Every URL returns identical structure.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductPage() {
  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── 1. Hero — steel-blue bloom, corner ticks ──────────────────────────── */}
      <section className="pt-24 pb-16 px-8 text-center" style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 900px 700px at 50% 40%, rgba(111,155,198,0.07) 0%, transparent 60%)' }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20,    width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)',   pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20,   width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)',  pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20,  width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)',  pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-label mb-4">THE ENGINE</div>
          <h1
            className="section-headline mb-6 mx-auto"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1.5px', maxWidth: 900 }}
          >
            311 checks. 90 seconds. One structured response.
          </h1>
          <p className="section-subhead max-w-2xl mx-auto">
            Everything that happens between POST and 200 OK — and why it produces a score you can trust.
          </p>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <Link href="/dashboard" style={{ ...MONO, fontSize: 11, color: '#6F9BC6', textDecoration: 'none' }}>
              ← Back to how it works
            </Link>
            <Link href="/developers" style={{ ...MONO, fontSize: 11, color: '#9D8CFF', textDecoration: 'none' }}>
              See the API →
            </Link>
          </div>
          {/* Colored stat row — 311 cyan / 27 steel blue / 7 purple */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 64px', marginTop: 48 }}>
            {([
              { value: '311', label: 'Checks per scan',       color: '#00C8FF', bloom: 'rgba(0,200,255,0.07)'   },
              { value: '27',  label: 'Diagnostic categories', color: '#6F9BC6', bloom: 'rgba(111,155,198,0.07)' },
              { value: '7',   label: 'Scoring dimensions',    color: '#9D8CFF', bloom: 'rgba(157,140,255,0.07)' },
            ] as const).map(s => (
              <div key={s.value} style={{ position: 'relative', padding: '4px 8px' }}>
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 90px 70px at 50% 50%, ${s.bloom} 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 48, lineHeight: 1, color: s.color }}>{s.value}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587' }}>{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 2. The pipeline — INPUT / PROCESSING / OUTPUT ─────────────────────── */}
      <HowItWorksSection />
      <div className="section-separator" />

      {/* ── 2b. Diagnostic Coverage — transparent + purple bloom ──────────────── */}
      <section
        className="max-w-7xl mx-auto px-8 pb-20"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Purple bloom */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: 'radial-gradient(ellipse 1000px 600px at 50% 50%, rgba(128,128,192,0.06) 0%, transparent 60%)',
          }}
        />
        {/* Corner ticks */}
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20,    width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderLeft:   '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20,   width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderRight:  '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20,  width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderLeft:  '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-label mb-3">COVERAGE</div>
          <h2
            className="section-headline mb-12"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px' }}
          >
            27 diagnostic categories.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

            {/* Left: copy + stat blocks */}
            <div>
              <p className="section-subhead mb-10" style={{ fontSize: 16 }}>
                Every scan evaluates the full conversion surface of a page — not just the obvious
                elements. Checks are gated by site type: a SaaS site gets SaaS checks. An ecommerce
                site gets ecommerce checks. Universal checks run on everything.
              </p>
              <div className="flex gap-10">
                <Stat value="311" label="TOTAL CHECKS" verdict="neutral" />
                <Stat value="27" label="CATEGORIES" verdict="neutral" />
                <Stat value="7" label="DIAGNOSTIC DIMENSIONS" verdict="neutral" />
              </div>
            </div>

            {/* Right: category chips + legend */}
            <div>
              {/* Grid header */}
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '0.5px solid rgba(255,255,255,0.05)',
              }}>
                27 CATEGORIES · SITE-TYPE GATED · UNIVERSAL + VERTICAL
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const s = TIER_STYLES[cat.tier]
                  return (
                    <div
                      key={cat.name}
                      style={{
                        border: `0.5px solid ${s.border}`,
                        backgroundColor: s.bg,
                        padding: '10px 14px',
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: s.color,
                        cursor: 'default',
                      }}
                    >
                      {cat.name}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
                {[
                  { color: '#00C48C', label: 'conversion core' },
                  { color: '#6F9BC6', label: 'universal' },
                  { color: '#8080C0', label: 'vertical-specific' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 5, height: 5, backgroundColor: item.color, display: 'block', flexShrink: 0 }} />
                    <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6E7587' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 3. Pipeline — mounted module bg #080D18 + blue bloom ─────────────── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#080D18',
        borderTop: '0.5px solid rgba(128,128,192,0.15)',
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
      }}>
        {/* Blue bloom — technical, left-anchored */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: [
              'radial-gradient(ellipse 800px 1200px at 15% 50%, rgba(111,155,198,0.07) 0%, transparent 60%)',
              'radial-gradient(ellipse 500px 800px at 90% 70%, rgba(0,196,140,0.04) 0%, transparent 55%)',
            ].join(', '),
          }}
        />
        {/* Corner ticks */}
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20,    width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderLeft:   '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20,   width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderRight:  '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20,  width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderLeft:  '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '80px 32px', position: 'relative', zIndex: 1 }}>
          <div className="section-label mb-3">PIPELINE</div>
          <h2
            className="section-headline mb-12"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px' }}
          >
            POST to response. Eight steps.
          </h2>

          {/* Pipeline with continuous vertical spine */}
          <div style={{ position: 'relative' }}>
            {/* Full-height spine line */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 15,
                top: 24,
                bottom: 24,
                width: 2,
                background: 'rgba(111,155,198,0.12)',
                zIndex: 0,
              }}
            />
            {PIPELINE_STEPS.map((step) => (
              <div key={step.num} className="flex gap-6" style={{ position: 'relative', zIndex: 1 }}>

                {/* Left: step number with horizontal tick from spine */}
                <div
                  className="flex-shrink-0"
                  style={{ width: 32, paddingTop: 24, position: 'relative' }}
                >
                  {/* Horizontal tick */}
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 17,
                      top: 30,
                      width: 16,
                      height: 1,
                      background: 'rgba(111,155,198,0.25)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#6F9BC6',
                      letterSpacing: '0.15em',
                      lineHeight: 1,
                      display: 'block',
                      background: '#080D18',
                      paddingRight: 4,
                    }}
                  >
                    {step.num}
                  </span>
                </div>

                {/* Right: wd-panel step card */}
                <div className="wd-panel flex-1" style={{ padding: 24, marginBottom: 16 }}>
                  <p
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: '#6F9BC6',
                      marginBottom: 8,
                      borderLeft: '2px solid rgba(111,155,198,0.3)',
                      paddingLeft: 8,
                    }}
                  >
                    {step.label}
                  </p>
                  <h3 className="font-display font-bold text-lg text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="font-body text-sm leading-relaxed text-text-secondary">
                    {step.description}
                  </p>
                  {step.code !== null && (
                    <div className="mt-3">
                      <CodeBlock code={step.code} language="json" />
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 4. One response object — four stat panels + schema preview ───────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0', borderTop: '0.5px solid rgba(111,155,198,0.1)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(111,155,198,0.06) 0%, transparent 60%)',
        }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
            RESPONSE SCHEMA
          </p>
          <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 36, color: '#E6E9EE', margin: '0 0 8px', lineHeight: 1.15 }}>
            One response object.
          </h2>
          <div aria-hidden style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(111,155,198,0.3), transparent)', margin: '0 0 48px' }} />

          {/* 2×2 stat grid */}
          <style>{`
            @media (max-width: 767px) { .prod-stat-grid { grid-template-columns: 1fr !important; } }
          `}</style>
          <div className="prod-stat-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            background: 'rgba(111,155,198,0.1)',
            marginBottom: 48,
          }}>

            {/* Panel 1 — Weighted Overall Score (red) */}
            <div style={{ background: '#050810', padding: '32px 36px' }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 64, color: '#E8635F', lineHeight: 1 }}>61</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginTop: 8 }}>WEIGHTED OVERALL SCORE</div>
              <div style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.6, marginTop: 12 }}>0–100. Calibrated to site type and buyer complexity. Benchmarked against 4,812 real sites in your vertical.</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#E8635F', marginTop: 12 }}>FAIR · 5-band verdict</div>
            </div>

            {/* Panel 2 — Ranked Findings (steel blue) */}
            <div style={{ background: '#050810', padding: '32px 36px' }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 64, color: '#6F9BC6', lineHeight: 1 }}>23</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginTop: 8 }}>RANKED FINDINGS</div>
              <div style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.6, marginTop: 12 }}>Sorted by priority rank. Each with severity, fix_effort, and specific evidence from the page.</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6', marginTop: 12 }}>1 → N · priority ranked</div>
            </div>

            {/* Panel 3 — Verified Strengths (green) */}
            <div style={{ background: '#050810', padding: '32px 36px' }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 64, color: '#00C48C', lineHeight: 1 }}>5</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginTop: 8 }}>VERIFIED STRENGTHS</div>
              <div style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.6, marginTop: 12 }}>What&apos;s genuinely working above average. Referenced against specific visible content — never padded.</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C', marginTop: 12 }}>above average · evidence-referenced</div>
            </div>

            {/* Panel 4 — Dimension Benchmarks (steel blue) */}
            <div style={{ background: '#050810', padding: '32px 36px' }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 64, color: '#6F9BC6', lineHeight: 1 }}>7</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginTop: 8 }}>DIMENSION BENCHMARKS</div>
              <div style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.6, marginTop: 12 }}>Every dimension score positioned against industry average and percentile for your site&apos;s vertical.</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6', marginTop: 12 }}>percentile-ranked · by vertical</div>
            </div>

          </div>

          {/* Schema preview panel */}
          <div style={{
            background: '#0A0E18',
            borderTop: '1px solid rgba(157,140,255,0.35)',
            borderLeft: '1px solid rgba(157,140,255,0.12)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 5, height: 5, background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6E7587' }}>response · application/json · 200 OK</span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C', marginLeft: 'auto' }}>200 OK</span>
            </div>
            <div style={{ padding: '16px 20px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, lineHeight: 1.85 }}>
              <div><span style={{ color: '#6E7587' }}>{'{'}</span></div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: '#8080c0' }}>&quot;score&quot;</span><span style={{ color: '#6E7587' }}>: </span><span style={{ color: '#E8635F' }}>61</span><span style={{ color: '#6E7587' }}>,</span>
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: '#8080c0' }}>&quot;verdict&quot;</span><span style={{ color: '#6E7587' }}>: </span><span style={{ color: '#6F9BC6' }}>&quot;Fair&quot;</span><span style={{ color: '#6E7587' }}>,</span>
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: '#8080c0' }}>&quot;percentile&quot;</span><span style={{ color: '#6E7587' }}>: </span><span style={{ color: '#6F9BC6' }}>63</span><span style={{ color: '#6E7587' }}>,</span>
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: '#8080c0' }}>&quot;findings&quot;</span><span style={{ color: '#6E7587' }}>: [...23 items],</span>
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: '#8080c0' }}>&quot;strengths&quot;</span><span style={{ color: '#6E7587' }}>: </span><span style={{ color: '#00C48C' }}>[...5 items]</span><span style={{ color: '#6E7587' }}>,</span>
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: '#8080c0' }}>&quot;benchmark&quot;</span><span style={{ color: '#6E7587' }}>: {'{'}...7 dimensions{'}'}</span><span style={{ color: '#6E7587' }}>,</span>
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: '#8080c0' }}>&quot;cost_usd&quot;</span><span style={{ color: '#6E7587' }}>: 0.15</span>
              </div>
              <div><span style={{ color: '#6E7587' }}>{'}'}</span></div>
            </div>
            <div style={{ padding: '10px 20px 16px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6E7587', textAlign: 'center' }}>
              · Build against this schema once · Same structure regardless of site type or plan
            </div>
          </div>

        </div>
      </section>
      <div className="section-separator" />

      {/* ── 5. Two-surface access ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0', borderTop: '0.5px solid rgba(111,155,198,0.1)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(111,155,198,0.05) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 500px at 85% 60%, rgba(157,140,255,0.04) 0%, transparent 55%)',
          ].join(', '),
        }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
            ACCESS
          </p>
          <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 36, color: '#E6E9EE', margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
            Two ways to use the same engine.
          </h2>
          <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 48px' }}>
            The scan engine and its output are identical regardless of how you access it.
          </p>

          <style>{`
            @media (max-width: 767px) { .prod-access-grid { grid-template-columns: 1fr !important; } }
          `}</style>
          <div className="prod-access-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Dashboard */}
            <div className="wd-panel" style={{ padding: '32px', borderTop: '1px solid rgba(111,155,198,0.4)', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', margin: '0 0 12px' }}>DASHBOARD</p>
              <h3 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 12px' }}>Results without writing code.</h3>
              <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.65, margin: '0 0 24px', flexGrow: 1 }}>
                Scan any site from the dashboard. See your score, ranked findings, AI-rewritten copy, and how you benchmark against your vertical. Track over time. Send white-label reports to clients.
              </p>
              <div style={{ marginBottom: 24 }}>
                {([
                  { k: 'interface',        v: 'dashboard' },
                  { k: 'account_required', v: 'false (first scan)' },
                  { k: 'white_label',      v: 'agency+' },
                  { k: 'scans_from',       v: '$0 free' },
                ] as { k: string; v: string }[]).map(s => (
                  <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#8080c0', flexShrink: 0 }}>{s.k}</span>
                    <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
                    <span style={{ color: '#E6E9EE' }}>{s.v}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth?surface=dashboard" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '11px 20px', textDecoration: 'none', display: 'inline-block', background: 'transparent' }}>
                Open dashboard →
              </Link>
            </div>

            {/* API */}
            <div className="wd-panel" style={{ padding: '32px', borderTop: '1px solid rgba(157,140,255,0.4)', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9D8CFF', margin: '0 0 12px' }}>API</p>
              <h3 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 12px' }}>Build conversion intelligence into anything.</h3>
              <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.65, margin: '0 0 24px', flexGrow: 1 }}>
                POST any URL, get structured JSON. Integrate the scan engine into your product, pipeline, or automation. Batch endpoint, async mode, webhooks. No dashboard required.
              </p>
              <div style={{ marginBottom: 24 }}>
                {([
                  { k: 'endpoint',    v: 'POST /api/v1/scan' },
                  { k: 'response',    v: 'structured JSON' },
                  { k: 'trial_scans', v: '25 free' },
                  { k: 'async_mode',  v: 'true' },
                ] as { k: string; v: string }[]).map(s => (
                  <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#8080c0', flexShrink: 0 }}>{s.k}</span>
                    <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
                    <span style={{ color: s.v === 'true' ? '#00C48C' : s.v.startsWith('POST') ? '#9D8CFF' : '#E6E9EE' }}>{s.v}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth?surface=api" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '11px 20px', textDecoration: 'none', display: 'inline-block', background: 'transparent' }}>
                Get API key →
              </Link>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 6. Final CTA — two equal exit segments ─────────────────────────────── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#050810',
        borderTop: '0.5px solid rgba(111,155,198,0.25)',
      }}>
        <style>{`
          @media (max-width: 767px) {
            .prod-exit-segments { flex-direction: column !important; }
            .prod-exit-left { border-right: none !important; border-bottom: 0.5px solid rgba(255,255,255,0.06) !important; }
          }
        `}</style>

        {/* Ambient bloom */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 600px 400px at 22% 50%, rgba(111,155,198,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 400px at 78% 50%, rgba(157,140,255,0.07) 0%, transparent 60%)',
          ].join(', '),
        }} />

        {/* Corner ticks */}
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

        <div className="prod-exit-segments" style={{ position: 'relative', zIndex: 1, display: 'flex' }}>

          {/* LEFT — Dashboard */}
          <div className="prod-exit-left" style={{ flex: 1, padding: '64px 56px', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 12px' }}>USING THE DASHBOARD?</p>
            <h2 style={{ ...DISP, fontSize: 22, fontWeight: 700, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>
              See what a scan returns in plain English.
            </h2>
            <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', margin: '0 0 28px' }}>Score, ranked fixes, rewritten copy — no code required.</p>
            <Link href="/dashboard" style={{ ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '11px 24px', background: 'transparent', textDecoration: 'none', display: 'inline-block' }}>
              How it works →
            </Link>
          </div>

          {/* RIGHT — API */}
          <div style={{ flex: 1, padding: '64px 56px' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 12px' }}>BUILDING WITH THE API?</p>
            <h2 style={{ ...DISP, fontSize: 22, fontWeight: 700, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>
              Full endpoint reference and schema.
            </h2>
            <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', margin: '0 0 28px' }}>Plans, rate limits, async mode, batch endpoint.</p>
            <Link href="/developers" style={{ ...MONO, fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '11px 24px', background: 'transparent', textDecoration: 'none', display: 'inline-block' }}>
              API docs →
            </Link>
          </div>

        </div>
      </section>

    </main>
  )
}
