'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import ResponseAnnotatorSection from '@/components/sections/ResponseAnnotatorSection'
import WebdocMark from '@/components/ui/WebdocMark'

// ── Syntax-highlighted JSON primitives ──────────────────────────────────────

function K({ c }: { c: string }) {
  return <span className="text-[#8080c0]">{c}</span>  // json-key purple
}
function M({ c }: { c: string }) {
  return <span className="text-[#6F9BC6]">{c}</span>  // json-metric blue (measurement/dimension keys)
}
function S({ c }: { c: string }) {
  return <span className="text-score-high">{c}</span>
}
function N({ c }: { c: string }) {
  return <span className="text-cyan-DEFAULT">{c}</span>
}
function P({ c }: { c: string }) {
  return <span className="text-text-tertiary">{c}</span>
}

// ── Nav ─────────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] bg-background-base/90 backdrop-blur-md border-b border-background-border flex items-center px-8">
      <div className="flex items-center gap-8 flex-1">
        <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
          webdoc<span className="text-[#6F9BC6]">.ai</span>
        </Link>
        <div className="flex items-center gap-6">
          {['Pricing', 'Developers', 'Docs', 'Changelog'].map(link => (
            <Link
              key={link}
              href={`/${link.toLowerCase()}`}
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 no-underline"
            >
              {link}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/playground" className="font-body text-sm text-text-secondary no-underline hover:text-text-primary transition-colors duration-150">
          Scan my site
        </Link>
        <Link
          href="/dashboard"
          className="border border-background-border font-body text-sm text-text-secondary px-4 py-1.5 no-underline hover:text-text-primary hover:border-text-tertiary transition-colors duration-150"
        >
          Dashboard →
        </Link>
        <Link
          href="/signup"
          className="font-body font-semibold text-sm px-4 py-1.5 no-underline transition-all duration-150"
          style={{ background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', color: '#6F9BC6' }}
        >
          Get API key →
        </Link>
      </div>
    </nav>
  )
}

// ── Hero JSON panel ──────────────────────────────────────────────────────────

function HeroJson() {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <P c="{" />{'\n'}
      {'  '}<K c='"scan_id"' /><P c=": " /><S c='"scan_01HXYZ7K2M9N3P4Q"' /><P c="," />{'\n'}
      {'  '}<K c='"url"' /><P c=": " /><S c='"https://acme-saas.com"' /><P c="," />{'\n'}
      {'  '}<M c='"score"' /><P c=": " /><N c="61" /><P c="," />{'\n'}
      {'  '}<K c='"industry"' /><P c=": " /><S c='"B2B SaaS"' /><P c="," />{'\n'}
      {'  '}<K c='"benchmark"' /><P c=": {" />{'\n'}
      {'    '}<M c='"industry_avg"' /><P c=": " /><N c="54" /><P c="," />{'\n'}
      {'    '}<M c='"top_quartile"' /><P c=": " /><N c="78" /><P c="," />{'\n'}
      {'    '}<M c='"percentile"' /><P c=": " /><N c="63" />{'\n'}
      {'  '}<P c="}," />{'\n'}
      {'  '}<K c='"findings"' /><P c=": [" />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="1" /><P c="," />{'\n'}
      {'      '}<M c='"severity"' /><P c=": " /><S c='"critical"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"value_proposition"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"Hero headline is feature-led, not outcome-led"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"12–18% conversion uplift"' />{'\n'}
      {'    '}<P c="}," />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="2" /><P c="," />{'\n'}
      {'      '}<M c='"severity"' /><P c=": " /><S c='"high"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"social_proof"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"No above-fold proof — testimonials buried at 2,400px"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"8–11% conversion uplift"' />{'\n'}
      {'    '}<P c="}," />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="3" /><P c="," />{'\n'}
      {'      '}<M c='"severity"' /><P c=": " /><S c='"high"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"cta_clarity"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"Dual primary CTAs create decision paralysis"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"6–9% conversion uplift"' />{'\n'}
      {'    '}<P c="}" />{'\n'}
      {'  '}<P c="]," />{'\n'}
      {'  '}<K c='"rewritten_copy"' /><P c=": {" />{'\n'}
      {'    '}<K c='"headline"' /><P c=": " /><S c='"Ship projects on time, every time."' /><P c="," />{'\n'}
      {'    '}<K c='"cta_primary"' /><P c=": " /><S c='"Start free — no credit card"' />{'\n'}
      {'  '}<P c="}," />{'\n'}
      {'  '}<K c='"cost_usd"' /><P c=": " /><N c="0.15" /><P c="," />{'\n'}
      {'  '}<K c='"duration_ms"' /><P c=": " /><N c="87340" />{'\n'}
      <P c="}" />
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

type HeroTab = 'api' | 'report' | 'agency'

const HERO_TABS: { id: HeroTab; label: string }[] = [
  { id: 'api', label: 'API Response' },
  { id: 'report', label: 'Scan Report' },
  { id: 'agency', label: 'Agency View' },
]

const REPORT_FINDINGS = [
  { severity: 'critical' as const, lift: '↑ 12–18% lift', title: 'Hero headline is feature-led, not outcome-led' },
  { severity: 'high' as const, lift: '↑ 8–11% lift', title: 'No above-fold proof — first signal at 2,400px' },
  { severity: 'high' as const, lift: '↑ 6–9% lift', title: 'Dual CTAs create decision paralysis' },
]

const AGENCY_CLIENTS = [
  { domain: 'acme-saas.com', score: 61, delta: 8, positive: true },
  { domain: 'techflow.io', score: 74, delta: 3, positive: true },
  { domain: 'buildspace.so', score: 48, delta: 3, positive: false },
  { domain: 'loops.so', score: 79, delta: 5, positive: true },
]

function HeroSection() {
  const [activeHeroTab, setActiveHeroTab] = useState<HeroTab>('api')

  return (
    <section className="scanline-texture min-h-screen pt-[120px] pb-20 px-8 relative overflow-hidden">

      {/* Full-bleed ambient blooms — green behind the JSON panel, purple lower-left */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'radial-gradient(ellipse 1200px 800px at 75% 50%, rgba(111,155,198,0.07) 0%, transparent 60%), radial-gradient(ellipse 800px 600px at 20% 80%, rgba(128,128,192,0.06) 0%, transparent 55%)',
        }}
      />

      <div className="max-w-[1280px] mx-auto flex gap-16 items-start relative z-10">

        {/* Left column */}
        <div className="flex-[55] min-w-0">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 bg-background-raised border border-background-border px-3 py-1 mb-8">
            <span className="status-dot w-1.5 h-1.5 rounded-full bg-score-high flex-shrink-0" />
            <span className="font-mono text-xs text-text-tertiary">POST /api/v1/scan → 200 OK · 87,340ms</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-5xl leading-[1.04] tracking-[-0.04em] text-text-primary">
            307 checks. Your score<br />
            <span className="text-cyan-DEFAULT">in 90 seconds.</span>
          </h1>

          {/* Subheadline */}
          <p className="font-body text-lg text-text-secondary leading-relaxed max-w-md mt-5">
            Paste any URL. Get a full conversion audit — score, ranked findings, AI-rewritten copy, benchmarked against real sites in your vertical.
          </p>

          {/* Curl block */}
          <div className="wd-panel p-4 mt-8">
            <pre className="font-mono text-sm m-0 leading-relaxed whitespace-pre-wrap">
              <span className="text-cyan-DEFAULT">curl</span>
              <span className="text-text-tertiary">{' -X POST https://webdocai.com/api/v1/scan \\\n  -H "Authorization: Bearer '}</span>
              <span className="text-score-high">wdoc_live_••••</span>
              <span className="text-text-tertiary">{'" \\\n  -d \''}</span>
              <span className="text-text-tertiary">{'{"url": "'}</span>
              <span className="text-score-high">https://your-site.com</span>
              <span className="text-text-tertiary">{'"}\''}  </span>
            </pre>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/signup"
              className="font-body font-bold text-sm px-6 py-3 no-underline transition-all duration-150"
              style={{ background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', color: '#6F9BC6' }}
            >
              Get API key →
            </Link>
            <Link
              href="/playground"
              className="border border-background-border text-text-secondary font-body text-sm px-6 py-3 no-underline hover:border-text-tertiary hover:text-text-primary transition-colors duration-150"
            >
              Scan my site free →
            </Link>
          </div>

        </div>

        {/* Right column — terminal panel */}
        <div
          className="flex-[45] min-w-0 relative bg-background-raised"
          style={{
            boxShadow: '0 0 0 1px rgba(0,196,140,0.25), 0 0 40px rgba(0,196,140,0.12), 0 0 80px rgba(0,196,140,0.06), 0 0 120px rgba(0,196,140,0.08)',
            borderTop: '1px solid rgba(111,155,198,0.35)',
            borderLeft: '0.5px solid rgba(111,155,198,0.15)',
            borderRight: '0.5px solid rgba(255,255,255,0.06)',
            borderBottom: '0.5px solid rgba(255,255,255,0.04)',
          }}
        >

          {/* Tab bar */}
          <div className="flex border-b border-background-border bg-background-subtle">
            {HERO_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveHeroTab(tab.id)}
                className={`font-mono text-xs px-4 py-2.5 border-0 cursor-pointer transition-colors duration-150 ${
                  activeHeroTab === tab.id
                    ? 'border-b-2 border-[#6F9BC6] text-[#6F9BC6] bg-background-raised -mb-px'
                    : 'text-text-tertiary hover:text-text-secondary bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Window chrome */}
          <div className="bg-background-subtle border-b border-background-border px-4 py-2.5 flex items-center gap-2">
            <span className="w-2 h-2 bg-severity-critical/30" />
            <span className="w-2 h-2 bg-severity-medium/30" />
            <span className="w-2 h-2 bg-score-high/30" />
            <span className="font-mono text-xs text-text-tertiary ml-2">
              {activeHeroTab === 'api' && 'response.json'}
              {activeHeroTab === 'report' && 'report.html'}
              {activeHeroTab === 'agency' && 'clients.dashboard'}
            </span>
            <div className="ml-auto">
              {activeHeroTab === 'agency'
                ? <span className="font-mono text-xs text-text-tertiary">8 clients</span>
                : <ScoreRing score={61} size="sm" animated={activeHeroTab === 'api'} />
              }
            </div>
          </div>

          {/* Tab content */}
          <div className="p-5 overflow-auto max-h-[calc(100vh-220px)] relative">

            {activeHeroTab === 'api' && (
              <>
                <HeroJson />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background-raised to-transparent pointer-events-none" />
              </>
            )}

            {activeHeroTab === 'report' && (
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <ScoreRing size="md" animated={false} score={61} />
                  <div>
                    <div className="font-display font-bold text-lg text-text-primary">acme-saas.com</div>
                    <div className="font-mono text-xs text-text-tertiary mt-1">63rd percentile · B2B SaaS</div>
                  </div>
                </div>
                {REPORT_FINDINGS.map((f, i) => (
                  <div key={i} className="bg-background-subtle border border-background-border p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.severity === 'critical' ? 'bg-severity-critical' : 'bg-severity-high'}`} />
                      <span className="font-mono text-xs text-text-tertiary">{f.severity}</span>
                      <span className="ml-auto font-mono text-xs text-score-mid">{f.lift}</span>
                    </div>
                    <div className="font-body text-xs text-text-primary leading-snug">{f.title}</div>
                  </div>
                ))}
                <div className="bg-background-subtle border-l-2 border-[#6F9BC6] px-3 py-2 mt-3">
                  <div className="font-mono text-xs text-text-tertiary mb-1">AI REWRITE</div>
                  <div className="font-body text-xs text-text-primary">Ship projects on time, every time.</div>
                </div>
              </div>
            )}

            {activeHeroTab === 'agency' && (
              <div>
                {AGENCY_CLIENTS.map(c => (
                  <div key={c.domain} className="flex items-center gap-3 py-3 border-b border-background-border last:border-0">
                    <ScoreRing size="sm" animated={false} score={c.score} />
                    <div className="flex-1">
                      <div className="font-body text-xs text-text-primary">{c.domain}</div>
                      <div className="font-mono text-xs text-text-tertiary mt-0.5">Last scan: 2 days ago</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className={`font-mono text-xs px-1.5 py-0.5 ${c.positive ? 'bg-score-high/10 text-score-high' : 'bg-severity-critical/10 text-severity-critical'}`}>
                        {c.positive ? `↑${c.delta}` : `↓${c.delta}`}
                      </span>
                      <span className="font-body text-xs text-[#6F9BC6]">Report →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  )
}

// ── How It Works ─────────────────────────────────────────────────────────────

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

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
          'radial-gradient(ellipse 480px 700px at 16% 70%, rgba(111,155,198,0.06) 0%, transparent 60%)',
          'radial-gradient(ellipse 480px 700px at 50% 70%, rgba(128,128,192,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 480px 700px at 84% 70%, rgba(0,196,140,0.05) 0%, transparent 60%)',
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
          One POST request. 307 checks fire in sequence. Structured JSON returns.
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
            {/* Scanline texture */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'repeating-linear-gradient(0deg,rgba(0,0,0,0.035) 0px,rgba(0,0,0,0.035) 1px,transparent 1px,transparent 2px)' }} />
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(111,155,198,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.15em' }}>terminal · curl</span>
            </div>
            <div style={{ padding: '16px', flexGrow: 1, position: 'relative', zIndex: 2 }}>
              <pre style={{ ...MONO, fontSize: 12, lineHeight: 1.85, margin: 0, color: '#9398A8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <span style={{ color: '#00C8FF' }}>curl</span>{' -X POST \\\n'}
                {'  https://webdocai.com/api/v1/scan \\\n'}
                {'  -H '}<span style={{ color: '#8080c0' }}>&quot;Authorization: Bearer </span><span style={{ color: '#E8635F' }}>wdoc_live_••••</span><span style={{ color: '#8080c0' }}>&quot;</span>{' \\\n'}
                {'  -d '}<span style={{ color: '#8080c0' }}>&apos;&#123;&quot;url&quot;: &quot;</span><span style={{ color: '#00C48C' }}>https://your-site.com</span><span style={{ color: '#8080c0' }}>&quot;&#125;&apos;</span>
                <span className="hiw-cursor" style={{ display: 'inline-block', width: 7, height: 13, background: '#6F9BC6', verticalAlign: 'text-bottom', marginLeft: 3, animation: 'hiw-cursor-blink 1s step-end infinite' }} />
              </pre>
            </div>
            <div style={{ padding: '0 14px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
              {[{ l: '307 checks', c: '#00C48C' }, { l: '27 categories', c: '#6F9BC6' }, { l: '~90s median', c: '#6E7587' }].map(x => (
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
              <span style={{ ...MONO, fontSize: 10, color: '#9D8CFF', marginLeft: 'auto' }}>ai · 307 checks</span>
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
              <span style={{ ...MONO, fontSize: 11, color: '#404860' }}>running 307 checks · 27 categories</span>
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


// ── Two Surface ──────────────────────────────────────────────────────────────

function TwoSurfaceSection() {
  return (
    <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden', background: '#050810' }}>

      <style>{`
        @keyframes surf-ring-blue  { 0%,100%{transform:scale(0.88);opacity:0.5} 50%{transform:scale(1.18);opacity:0.9} }
        @keyframes surf-ring-purp  { 0%,100%{transform:scale(0.82);opacity:0.45} 50%{transform:scale(1.12);opacity:0.85} }
        @keyframes surf-ring-green { 0%,100%{transform:scale(0.9);opacity:0.4} 50%{transform:scale(1.08);opacity:0.75} }
        @keyframes surf-core-rot   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ts-bloom-db {
          0%   { box-shadow: 0 0 0 1px rgba(111,155,198,0.08), 0 0 28px rgba(111,155,198,0.06); }
          20%  { box-shadow: 0 0 0 1px rgba(111,155,198,0.3),  0 0 50px rgba(111,155,198,0.2);  }
          100% { box-shadow: 0 0 0 1px rgba(111,155,198,0.08), 0 0 28px rgba(111,155,198,0.06); }
        }
        @keyframes ts-bloom-api {
          0%   { box-shadow: 0 0 0 1px rgba(157,140,255,0.08), 0 0 28px rgba(157,140,255,0.07); }
          20%  { box-shadow: 0 0 0 1px rgba(157,140,255,0.3),  0 0 50px rgba(157,140,255,0.2);  }
          100% { box-shadow: 0 0 0 1px rgba(157,140,255,0.08), 0 0 28px rgba(157,140,255,0.07); }
        }
        .ts-card-db  { animation: ts-bloom-db  2s ease-out infinite 2s;   }
        .ts-card-api { animation: ts-bloom-api 2s ease-out infinite 2.8s; }
        @media (max-width: 639px) { .surf-veins { display: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          .surf-ring     { animation: none !important; opacity: 0.5 !important; }
          .surf-core-spin{ animation: none !important; }
          .surf-bead     { display: none !important; }
          .ts-card-db, .ts-card-api { animation: none !important; }
        }
      `}</style>

      {/* Ambient blooms */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 600px 700px at 20% 75%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 600px 700px at 80% 75%, rgba(157,140,255,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 800px 400px at 50% 20%, rgba(111,155,198,0.04) 0%, transparent 55%)',
        ].join(', '),
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Section header */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>THE ENGINE</p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          One engine. Two ways in.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 56px' }}>
          The same 307-check scan engine underneath everything. Use the dashboard if you want results without writing code. Use the API if you want to build with the data.
        </p>

        {/* Engine convergence visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>

          <WebdocMark size={80} animated={true} />

          {/* Engine label */}
          <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: 'rgba(111,155,198,0.5)', margin: '7px 0 0' }}>SCAN ENGINE</p>

          {/* Two-vein SVG — paths provide mpath reference, beads travel along them */}
          <svg
            className="surf-veins"
            viewBox="0 0 900 120"
            width="100%"
            height="120"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <filter id="ts-bead-glow" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                </feMerge>
              </filter>
            </defs>

            {/* mpath references — invisible */}
            <path id="ts-path-db"  d="M 450,0 C 340,35 180,80 150,120" stroke="none" fill="none" />
            <path id="ts-path-api" d="M 450,0 C 560,35 720,80 750,120" stroke="none" fill="none" />

            {/* Dashboard bead — primary */}
            <circle className="surf-bead" r="2" fill="#6F9BC6" filter="url(#ts-bead-glow)">
              <animateMotion dur="2s" repeatCount="indefinite" begin="0s" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1">
                <mpath href="#ts-path-db"/>
              </animateMotion>
              <animate attributeName="opacity" values="0;0;0.95;0.95;0" keyTimes="0;0.05;0.15;0.85;1" dur="2s" repeatCount="indefinite" begin="0s"/>
            </circle>

            {/* Dashboard bead — trail */}
            <circle className="surf-bead" r="2" fill="#6F9BC6" filter="url(#ts-bead-glow)">
              <animateMotion dur="2s" repeatCount="indefinite" begin="0.15s" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1">
                <mpath href="#ts-path-db"/>
              </animateMotion>
              <animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.05;0.15;0.85;1" dur="2s" repeatCount="indefinite" begin="0.15s"/>
            </circle>

            {/* API bead — primary */}
            <circle className="surf-bead" r="2" fill="#9D8CFF" filter="url(#ts-bead-glow)">
              <animateMotion dur="2s" repeatCount="indefinite" begin="0.8s" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1">
                <mpath href="#ts-path-api"/>
              </animateMotion>
              <animate attributeName="opacity" values="0;0;0.95;0.95;0" keyTimes="0;0.05;0.15;0.85;1" dur="2s" repeatCount="indefinite" begin="0.8s"/>
            </circle>

            {/* API bead — trail */}
            <circle className="surf-bead" r="2" fill="#9D8CFF" filter="url(#ts-bead-glow)">
              <animateMotion dur="2s" repeatCount="indefinite" begin="0.95s" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1">
                <mpath href="#ts-path-api"/>
              </animateMotion>
              <animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.05;0.15;0.85;1" dur="2s" repeatCount="indefinite" begin="0.95s"/>
            </circle>
          </svg>
        </div>

        {/* Two surface cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ alignItems: 'stretch' }}>

          {/* DASHBOARD — steel blue */}
          <div className="wd-panel ts-card-db" style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(111,155,198,0.4)',
            borderLeft: '1px solid rgba(111,155,198,0.12)',
            boxShadow: '0 0 0 1px rgba(111,155,198,0.08), 0 0 28px rgba(111,155,198,0.06)',
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>Dashboard</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Results without code.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                Scan your site, track your score, send client reports. Full conversion audit in 90 seconds. No API key required.
              </p>
            </div>
            <div style={{ padding: '20px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {([
                { k: 'interface',         v: 'dashboard' },
                { k: 'scans_per_month',   v: '3 free → 500' },
                { k: 'white_label',       v: 'pro+' },
                { k: 'client_workspaces', v: 'pro+' },
                { k: 'account_required',  v: 'false (first scan)' },
              ] as { k: string; v: string }[]).map(s => (
                <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', ...MONO, fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: '#8080c0', flexShrink: 0 }}>{s.k}</span>
                  <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
                  <span style={{ color: s.v === 'dashboard' ? '#00C48C' : '#E6E9EE' }}>{s.v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/scan" style={{ ...MONO, fontSize: 11, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 14px', display: 'block', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent' }}>
                Open dashboard →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center' as const, marginTop: 8, marginBottom: 0 }}>Free to start · from $49/mo</p>
            </div>
          </div>

          {/* API — purple */}
          <div className="wd-panel ts-card-api" style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(157,140,255,0.4)',
            borderLeft: '1px solid rgba(157,140,255,0.12)',
            boxShadow: '0 0 0 1px rgba(157,140,255,0.08), 0 0 28px rgba(157,140,255,0.07)',
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#9D8CFF', margin: '0 0 10px' }}>API</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Build with the data.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                POST any URL. Get structured JSON — score, findings, benchmarks, rewritten copy. Same engine. No dashboard required.
              </p>
            </div>
            <div style={{ padding: '20px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {([
                { k: 'endpoint',       v: 'POST /api/v1/scan' },
                { k: 'response',       v: 'structured JSON' },
                { k: 'trial_scans',    v: '25 free' },
                { k: 'async_mode',     v: 'true' },
                { k: 'batch_endpoint', v: 'true' },
              ] as { k: string; v: string }[]).map(s => (
                <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', ...MONO, fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: '#8080c0', flexShrink: 0 }}>{s.k}</span>
                  <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
                  <span style={{ color: s.v === 'true' || s.v === 'structured JSON' || s.v === '25 free' ? '#00C48C' : s.v.startsWith('POST') ? '#9D8CFF' : '#E6E9EE' }}>{s.v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/developer" style={{ ...MONO, fontSize: 11, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '10px 14px', display: 'block', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent' }}>
                Get API key →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center' as const, marginTop: 8, marginBottom: 0 }}>25 free scans · from $29/mo</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Stats Band ────────────────────────────────────────────────────────────────

const CORPUS_STATS = [
  { value: '4,800+', label: 'Sites scanned',        color: '#E6E9EE' },
  { value: '58',     label: 'Average score',         color: '#6F9BC6' },
  { value: '23',     label: 'Avg findings per site', color: '#6F9BC6' },
  { value: '76%',    label: 'No above-fold proof',   color: '#E8635F' },
] as const

function StatsBand() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 0', borderTop: '0.5px solid rgba(111,155,198,0.15)' }}>
      <style>{`
        @keyframes sb-marker-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .sb-marker-enter { animation: sb-marker-in 0.6s ease-out 0.5s both; }
        @media (prefers-reduced-motion: reduce) { .sb-marker-enter { animation:none; opacity:1; transform:none; } }
        @media (max-width: 767px) {
          .sb-layout { flex-direction: column !important; }
          .sb-stats-row > div { flex: 0 0 50% !important; min-width: 0; }
        }
      `}</style>

      {/* Atmosphere */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 900px 600px at 65% 50%, rgba(111,155,198,0.06) 0%, transparent 60%)',
          'radial-gradient(ellipse 500px 400px at 15% 60%, rgba(157,140,255,0.04) 0%, transparent 55%)',
        ].join(', '),
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position:'absolute',top:20,left:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.2)',borderLeft:'0.5px solid rgba(111,155,198,0.2)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',top:20,right:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.2)',borderRight:'0.5px solid rgba(111,155,198,0.2)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,left:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.2)',borderLeft:'0.5px solid rgba(111,155,198,0.2)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,right:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.2)',borderRight:'0.5px solid rgba(111,155,198,0.2)',pointerEvents:'none',zIndex:1 }} />

      <div
        className="sb-layout"
        style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 48px', display: 'flex', gap: 64 }}
      >

        {/* LEFT COLUMN — copy */}
        <div style={{ flex: '0 0 38%', alignSelf: 'stretch' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
            CORPUS DATA
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,3.5vw,42px)', color: '#E6E9EE', letterSpacing: '-0.5px', margin: '0 0 20px', lineHeight: 1.15 }}>
            Benchmarked against your vertical. Not a generic average.
          </h2>
          <p style={{ ...SANS, fontSize: 15, color: '#9398A8', lineHeight: 1.7, margin: '0 0 32px' }}>
            Every score is positioned against real sites in your exact vertical. A B2B SaaS site is measured against other B2B SaaS sites. An ecommerce site against ecommerce. The corpus grows with every scan — the more sites we process, the sharper the percentiles get.
          </p>

          {/* Instrument panel */}
          <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.08)', padding: '16px 20px', margin: '0 0 24px' }}>
            {([
              { k: 'corpus_size',       v: '4,812 sites', vc: '#6F9BC6' },
              { k: 'verticals_tracked', v: '14',          vc: '#6F9BC6' },
              { k: 'updated',           v: 'weekly',      vc: '#00C48C' },
            ] as { k: string; v: string; vc: string }[]).map((row, i) => (
              <div key={row.k} style={{ display: 'flex', gap: 0, ...MONO, fontSize: 12, marginBottom: i < 2 ? 8 : 0 }}>
                <span style={{ color: '#8080c0' }}>{row.k}</span>
                <span style={{ color: '#6E7587' }}>: </span>
                <span style={{ color: row.vc }}>{row.v}</span>
              </div>
            ))}
          </div>

          <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>
            No synthetic data. No curated samples. Real scans only.
          </p>
        </div>

        {/* RIGHT COLUMN — curve + stats */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ overflow: 'hidden' }}>

            {/* Stats row */}
            <div className="sb-stats-row" style={{ display: 'flex' }}>
              {CORPUS_STATS.map((s, i) => (
                <div key={s.label} style={{ flex: 1, padding: '20px 24px', borderRight: i < CORPUS_STATS.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div style={{ ...DISP, fontWeight: 700, fontSize: 40, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Curve area */}
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...MONO, fontSize: 9, color: 'rgba(111,155,198,0.35)' }}>SCORE 0</span>
                <span style={{ ...MONO, fontSize: 9, color: 'rgba(111,155,198,0.35)' }}>SCORE DISTRIBUTION · 4,812 SITES</span>
                <span style={{ ...MONO, fontSize: 9, color: 'rgba(111,155,198,0.35)' }}>SCORE 100</span>
              </div>
              <svg viewBox="0 0 800 160" width="100%" height="160" preserveAspectRatio="none" aria-hidden style={{ display: 'block' }}>
                <defs>
                  <filter id="sbGlow" x="-20%" y="-60%" width="140%" height="220%">
                    <feGaussianBlur stdDeviation="1.2" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <line x1="200" y1="10" x2="200" y2="148" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
                <line x1="400" y1="10" x2="400" y2="148" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
                <line x1="600" y1="10" x2="600" y2="148" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
                <path d="M 0,158 C 40,158 80,155 140,145 C 200,132 260,108 320,82 C 370,60 410,20 464,10 C 510,2 540,8 580,28 C 630,52 680,95 730,128 C 770,150 790,157 800,158" fill="none" stroke="#6F9BC6" strokeWidth="1.0" strokeOpacity="0.7" filter="url(#sbGlow)" />
                <line x1="464" y1="12" x2="464" y2="148" stroke="rgba(255,255,255,0.1)" strokeWidth="0.75" />
                <text x="464" y="155" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="rgba(255,255,255,0.15)">AVG 58</text>
                <g className="sb-marker-enter">
                  <line x1="504" y1="10" x2="504" y2="148" stroke="rgba(111,155,198,0.5)" strokeWidth="0.75" strokeDasharray="3 3" />
                  <circle cx="504" cy="22" r="2" fill="#6F9BC6" opacity="0.6" />
                  <text x="504" y="7" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="400" fill="rgba(111,155,198,0.8)">YOUR SITE</text>
                  <text x="504" y="158" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="400" fill="rgba(111,155,198,0.8)">63rd pct</text>
                </g>
                <text x="200" y="158" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="rgba(111,155,198,0.2)">25</text>
                <text x="400" y="158" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="rgba(111,155,198,0.2)">50</text>
                <text x="600" y="158" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="rgba(111,155,198,0.2)">75</text>
              </svg>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px 20px' }}>
              <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0, textAlign: 'center' }}>
                Benchmarked against sites in your exact vertical · updated as corpus grows
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    tier: 'FREE',
    price: { monthly: '$0', annual: '$0' },
    period: { monthly: 'no account required', annual: 'no account required' },
    economy: '3 scans · try the instrument',
    economyColor: '#00C48C',
    features: ['1 scan included', 'Full conversion score', 'Top 3 findings', 'Benchmark position'],
    cta: 'TRY FREE →',
    href: '/playground',
  },
  {
    tier: 'STARTER',
    price: { monthly: '$49', annual: '$39' },
    period: { monthly: '/ month', annual: '/ mo · billed annually' },
    economy: '$2.45/scan effective rate',
    economyColor: '#6F9BC6',
    features: ['20 scans / month', 'Auto competitor analysis', 'Score trending over time', 'Full findings ranked', 'Single user'],
    cta: 'START TRIAL →',
    href: '/signup?plan=starter',
  },
  {
    tier: 'AGENCY',
    price: { monthly: '$149', annual: '$119' },
    period: { monthly: '/ month', annual: '/ mo · billed annually' },
    economy: '$1.49/scan + 100 API calls bundled',
    economyColor: '#00C48C',
    features: ['100 scans / month', 'Unlimited client workspaces', 'White-label report links', 'Multi-page scanning (3 pages)', 'PDF export with your logo', '3 team seats', '100 bundled API calls'],
    cta: 'START TRIAL →',
    href: '/signup?plan=agency',
  },
  {
    tier: 'ENTERPRISE',
    price: { monthly: '$499', annual: '$399' },
    period: { monthly: '/ month', annual: '/ mo · billed annually' },
    economy: 'custom rate · dedicated support',
    economyColor: '#6E7587',
    features: ['500 scans / month', 'Everything in Agency', '10 team seats', 'White-label subdomain', 'Scan scheduling + alerts', 'Slack notifications'],
    cta: 'START TRIAL →',
    href: '/signup?plan=enterprise',
  },
] as const

function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  return (
    <section style={{ padding: '96px 0', borderTop: '1px solid rgba(111,155,198,0.1)', position: 'relative' }}>
      {/* ambient bloom */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 800px 500px at 50% 30%, rgba(111,155,198,0.04) 0%, transparent 70%)' }} />
      {/* corner ticks */}
      <div style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.2)', borderRight: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.2)', borderRight: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>

        <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#6F9BC6', marginBottom: 16 }}>PLANS</div>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Infrastructure pricing. No contracts.
        </h2>
        <p style={{ ...SANS, fontSize: 14, color: '#6E7587', margin: '0 0 28px' }}>Four tiers. Pay per scan or subscribe. Cancel anytime.</p>

        {/* Toggle */}
        <div className="wd-panel" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 36, padding: 4, width: 'fit-content' }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                ...MONO,
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: 1.5,
                padding: '7px 18px',
                border: 'none',
                cursor: 'pointer',
                background: billing === b ? '#6F9BC6' : 'transparent',
                color: billing === b ? '#050810' : '#6E7587',
                fontWeight: billing === b ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {b === 'annual' ? 'Annual (save 20%)' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {PLANS.map(plan => (
            <div
              key={plan.tier}
              className="wd-panel"
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#6F9BC6' }}>
                  {plan.tier}
                </span>
              </div>

              <div style={{ marginBottom: 24 }}>
                <span style={{ ...DISP, fontWeight: 700, fontSize: 42, color: '#E6E9EE', lineHeight: 1 }}>
                  {plan.price[billing]}
                </span>
                <div style={{ ...SANS, fontSize: 12, color: '#6E7587', marginTop: 4 }}>
                  {plan.period[billing]}
                </div>
                <div style={{ ...MONO, fontSize: 11, color: plan.economyColor, marginTop: 6 }}>
                  {plan.economy}
                </div>
              </div>

              <div style={{ flex: 1 }} />

              <Link
                href={plan.href}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  ...MONO,
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase' as const,
                  padding: '11px 0',
                  textDecoration: 'none',
                  background: 'transparent',
                  color: '#6F9BC6',
                  border: '0.5px solid rgba(111,155,198,0.35)',
                  fontWeight: 400,
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Full pricing link */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Link href="/pricing" style={{ ...MONO, fontSize: 11, color: '#6F9BC6', textDecoration: 'none', letterSpacing: 1 }}>
            See full pricing &amp; comparison →
          </Link>
        </div>

        {/* API access link */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <Link
            href="/developers#pricing"
            style={{ ...MONO, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9D8CFF', textDecoration: 'none', borderBottom: '0.5px solid rgba(157,140,255,0.35)', paddingBottom: 2 }}
          >
            API access → see developer pricing
          </Link>
        </div>

      </div>
    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCtaSection() {
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      borderTop: '0.5px solid rgba(111,155,198,0.15)',
      minHeight: 280,
      display: 'flex',
      alignItems: 'center',
    }}>
      <style>{`
        @media (max-width: 767px) {
          .final-cta-segments { flex-direction: column !important; }
          .final-cta-left { border-right: none !important; border-bottom: 0.5px solid rgba(255,255,255,0.06) !important; }
        }
      `}</style>

      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 600px 400px at 20% 50%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 600px 400px at 80% 50%, rgba(157,140,255,0.05) 0%, transparent 60%)',
        ].join(', '),
      }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%' }} className="final-cta-segments">

        {/* LEFT — Dashboard */}
        <div className="final-cta-left" style={{ flex: 1, padding: '64px 56px', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
          <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 12px' }}>RESULTS WITHOUT CODE</p>
          <h2 style={{ ...DISP, fontSize: 24, fontWeight: 700, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>
            Scan your site. Track your score. Send client reports.
          </h2>
          <p style={{ ...SANS, fontSize: 14, color: '#9398A8', margin: '0 0 28px' }}>No API key required. Free to start.</p>
          <Link href="/scan" style={{ ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '11px 24px', background: 'transparent', textDecoration: 'none', display: 'inline-block' }}>
            Open dashboard →
          </Link>
        </div>

        {/* RIGHT — API */}
        <div style={{ flex: 1, padding: '64px 56px' }}>
          <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 12px' }}>BUILD WITH THE DATA</p>
          <h2 style={{ ...DISP, fontSize: 24, fontWeight: 700, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>
            POST a URL. Get structured JSON. Same engine underneath.
          </h2>
          <p style={{ ...SANS, fontSize: 14, color: '#9398A8', margin: '0 0 28px' }}>25 free scans. No subscription required.</p>
          <Link href="/developer" style={{ ...MONO, fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '11px 24px', background: 'transparent', textDecoration: 'none', display: 'inline-block' }}>
            Get API key →
          </Link>
        </div>

      </div>
    </section>
  )
}

// ── Objections ────────────────────────────────────────────────────────────────

const OBJECTION_CARDS = [
  {
    q: "How do I know it's not hallucinating?",
    a: "Every finding must cite specific visible content — what's present, absent, or misplaced on your actual page. The model cannot pass a check without grounding it in evidence. Findings that fail validation are dropped before they reach you.",
    data: 'grounding rule: cite visible content or fail',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Why not just paste my URL into ChatGPT?',
    a: 'A language model sees text you paste, not your live page. webdoc renders the full DOM in headless Chrome, reads above-the-fold layout, runs 307 structured checks, and returns ranked JSON — not a chat response.',
    data: '307 checks · rendered DOM · not a chat response',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Are the lift numbers real or made up?',
    a: "Lift estimates are calibrated against a corpus of audited pages with known conversion data. Each check has an expected impact range based on real comparisons. The number is an estimate — not a guarantee — but it's grounded, not invented.",
    data: 'calibrated from corpus · p50 top-fix lift: +8%',
    dataColor: '#00C48C',
  },
  {
    q: 'Will it understand my site?',
    a: 'webdoc classifies your site type — SaaS, e-commerce, agency, creator — then applies the relevant check subset. A Shopify product page and a SaaS pricing page get different diagnostics. Classification runs automatically.',
    data: 'site types: SaaS · e-comm · agency · creator',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What do I actually do with the results?',
    a: 'Findings are ranked by estimated conversion uplift. Fix the highest-priority ones first. Each includes evidence, a concrete fix, and drop-in replacement copy. Most teams ship the top three improvements in an afternoon.',
    data: 'avg fix time for top 3: ~4hrs · copy included',
    dataColor: '#00C48C',
  },
  {
    q: 'Can you even scan my site?',
    a: "If it's publicly accessible, yes. webdoc renders the live page in headless Chrome with stealth mode enabled. Works on Next.js, Webflow, Squarespace, Shopify, WordPress, and custom stacks. Sites behind login walls cannot be scanned.",
    data: 'requires: public URL · no login walls',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What does it cost?',
    a: 'Three scans per month free, no account required. Pay-per-scan starts at $0.25. Subscription plans from $49/month. Cache hits on the same URL within 24 hours are always free regardless of plan.',
    data: '3 free/mo · from $0.25/scan · cache free',
    dataColor: '#00C48C',
  },
  {
    q: 'Can I use it for client work?',
    a: 'Yes. The Agency plan includes client workspaces, white-label report links, and 100 bundled API calls per month. Reports carry no webdoc branding. Scan any publicly accessible client URL and send them the link.',
    data: 'agency: $149/mo · white-label · API bundled',
    dataColor: '#6F9BC6',
  },
] as const

function FaqCardsSection() {
  return (
    <section style={{ padding: '96px 0', position: 'relative' }}>
      {/* ambient bloom */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 700px 400px at 50% 40%, rgba(111,155,198,0.05) 0%, transparent 70%)' }} />
      {/* corner ticks */}
      <div style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.2)', borderRight: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.2)', borderRight: '1px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#6F9BC6', marginBottom: 16 }}>OBJECTIONS</div>
          <h2 style={{ ...DISP, fontSize: 36, fontWeight: 700, color: '#E6E9EE', margin: 0, lineHeight: 1.2 }}>The questions that come up.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OBJECTION_CARDS.map((card) => (
            <div
              key={card.q}
              style={{
                background: '#0A0E18',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                padding: '22px 24px',
              }}
            >
              <p style={{ ...DISP, fontWeight: 600, fontSize: 16, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.35 }}>
                {card.q}
              </p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.65, margin: '0 0 12px' }}>
                {card.a}
              </p>
              <p style={{ ...MONO, fontSize: 11, color: card.dataColor, margin: 0 }}>
                {card.data}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer className="border-t border-background-border bg-background-raised">
      <div className="max-w-[1280px] mx-auto px-8 py-12 grid grid-cols-4 gap-8">
        <div>
          <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
            webdoc<span className="text-[#6F9BC6]">.ai</span>
          </Link>
          <p className="font-body text-sm text-text-secondary mt-3 max-w-xs leading-relaxed">
            The conversion audit API. 307 checks, ranked findings, AI-rewritten copy. One endpoint.
          </p>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">PRODUCT</div>
          {['Playground', 'Pricing', 'Docs', 'Changelog'].map(l => (
            <Link
              key={l}
              href={`/${l.toLowerCase()}`}
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline"
            >
              {l}
            </Link>
          ))}
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">GET STARTED</div>
          <Link href="/playground" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-3 no-underline">Scan my site free →</Link>
          <Link href="/pricing" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-3 no-underline">Agency plans →</Link>
          <Link href="/signup" className="font-body text-sm text-[#6F9BC6] hover:opacity-80 block mb-3 no-underline">Get API key →</Link>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">RESOURCES</div>
          <Link href="/playground" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">API Playground →</Link>
          <Link href="/docs/api" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">API Reference →</Link>
          <Link href="/changelog" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">Changelog →</Link>
          <a href="https://status.webdocai.com" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline" target="_blank" rel="noopener noreferrer">Status →</a>
        </div>
      </div>
      <div className="border-t border-background-border">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex justify-between items-center">
          <span className="font-mono text-xs text-text-tertiary">© 2026 webdoc.ai</span>
          <span className="font-mono text-xs">
            <span className="text-ink-muted">Built in public by Devon Morrell · </span>
            <a
              href="https://x.com/devonmorrell"
              className="text-ink-muted no-underline hover:underline transition-colors duration-150"
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow the build →
            </a>
          </span>
          <span className="font-mono text-xs text-text-tertiary">Status · Privacy · Terms</span>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-background-base min-h-screen instrument-grid">
      <NavBar />
      <HeroSection />
      <div className="section-separator" />
      <ResponseAnnotatorSection />
      <div className="section-separator" />
      <HowItWorksSection />
      <div className="section-separator" />
      <StatsBand />
      <div className="section-separator" />
      <TwoSurfaceSection />
      <div className="section-separator" />
      <PricingSection />
      <div className="section-separator" />
      <FaqCardsSection />
      <div className="section-separator" />
      <FinalCtaSection />
      <FooterSection />
    </main>
  )
}
