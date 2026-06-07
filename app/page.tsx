'use client'

import { useState } from 'react'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import { Stat } from '@/components/ui/Stat'
import { CodeBlock } from '@/components/ui/CodeBlock'
import OutputSection from '@/components/sections/OutputSection'
import ResponseAnnotatorSection from '@/components/sections/ResponseAnnotatorSection'
import ObjectionSection from '@/components/sections/ObjectionSection'

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
          webdoc<span className="text-cyan-DEFAULT">.ai</span>
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
          className="bg-cyan-DEFAULT text-text-inverse font-body font-semibold text-sm px-4 py-1.5 no-underline hover:opacity-90 transition-opacity duration-150"
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
            'radial-gradient(ellipse 1200px 800px at 75% 50%, rgba(0,196,140,0.07) 0%, transparent 60%), radial-gradient(ellipse 800px 600px at 20% 80%, rgba(128,128,192,0.06) 0%, transparent 55%)',
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
            Website intelligence.<br />
            <span className="text-cyan-DEFAULT">One endpoint.</span>
          </h1>

          {/* Subheadline */}
          <p className="font-body text-lg text-text-secondary leading-relaxed max-w-md mt-5">
            The conversion audit API. Founders use it to diagnose their site. Agencies use it to run client audits. Developers build it into their products. One scan engine — 307 checks, ranked findings, AI-rewritten copy.
          </p>

          {/* Audience pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              href="/playground"
              className="font-mono text-xs px-3 py-1.5 border border-background-border text-text-tertiary transition-colors duration-150 hover:border-text-tertiary hover:text-text-primary no-underline"
            >
              Diagnose my site →
            </Link>
            <Link
              href="/pricing"
              className="font-mono text-xs px-3 py-1.5 border border-background-border text-text-tertiary transition-colors duration-150 hover:border-text-tertiary hover:text-text-primary no-underline"
            >
              Manage client audits →
            </Link>
            <Link
              href="/developer"
              className="font-mono text-xs px-3 py-1.5 border border-cyan-DEFAULT text-cyan-DEFAULT bg-cyan-dim transition-colors duration-150 no-underline"
            >
              Build with the API →
            </Link>
          </div>

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
              className="bg-cyan-DEFAULT text-text-inverse font-body font-bold text-sm px-6 py-3 no-underline hover:opacity-90 transition-opacity duration-150"
            >
              Get API key →
            </Link>
            <Link
              href="/playground"
              className="border border-background-border text-text-secondary font-body text-sm px-6 py-3 no-underline hover:border-text-tertiary hover:text-text-primary transition-colors duration-150"
            >
              Scan my site free →
            </Link>
            <Link
              href="/pricing"
              className="text-text-tertiary font-body text-sm hover:text-text-secondary transition-colors duration-150 underline underline-offset-4 decoration-background-border"
            >
              Agency plans →
            </Link>
          </div>

        </div>

        {/* Right column — terminal panel */}
        <div
          className="flex-[45] min-w-0 relative border border-background-border bg-background-raised"
          style={{
            boxShadow: '0 0 0 1px rgba(0,196,140,0.25), 0 0 40px rgba(0,196,140,0.12), 0 0 80px rgba(0,196,140,0.06), 0 0 120px rgba(128,128,192,0.08)',
            borderTop: '1px solid rgba(0,196,140,0.4)',
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
                    ? 'border-b-2 border-cyan-DEFAULT text-cyan-DEFAULT bg-background-raised -mb-px'
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
                <div className="bg-background-subtle border-l-2 border-cyan-DEFAULT px-3 py-2 mt-3">
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
                      <span className="font-body text-xs text-cyan-DEFAULT">Report →</span>
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

// ── Stats Strip ───────────────────────────────────────────────────────────────

function StatsStrip() {
  const STATS = [
    { value: '307',   label: 'CHECKS PER SCAN', color: '#E6E9EE' },
    { value: '$0.15', label: 'PER SCAN',         color: '#E6E9EE' },
    { value: '~90s',  label: 'MEDIAN RESPONSE',  color: '#E6E9EE' },
    { value: '27',    label: 'CATEGORIES',        color: '#E6E9EE' },
    { value: 'FREE',  label: 'CACHE HITS',        color: '#00C48C' },
  ]
  return (
    <section style={{ padding: '96px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid rgba(111,155,198,0.15)' }}>
          {STATS.map((s, i) => (
            <div
              key={s.value}
              style={{
                flex: 1,
                padding: '48px 48px 0',
                borderRight: i < STATS.length - 1 ? '0.5px solid rgba(111,155,198,0.12)' : 'none',
              }}
            >
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 56, color: s.color, lineHeight: 1, marginBottom: 10 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6E7587' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ─────────────────────────────────────────────────────────────

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

const HIW_CURL = `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-site.com",
    "finding_depth": "full",
    "async": false
  }'`

const HIW_JSON = `{
  "score": 61,
  "severity": "critical",
  "percentile": 63,
  "findings": 23,
  "rewritten_copy": {
    "headline": "Ship projects on time, every time.",
    "cta_primary": "Start free — no credit card"
  },
  "cost_usd": 0.15,
  "duration_ms": 87340
}`

const STEP_NUM_STYLE: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'inline-block',
  background: '#050810',
  border: '0.5px solid rgba(111,155,198,0.3)',
  padding: '6px 10px',
  marginBottom: 16,
  ...MONO,
  fontSize: 13,
  color: '#6F9BC6',
}

function HowItWorksSection() {
  return (
    <section style={{ padding: '96px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          How it works
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 48px', letterSpacing: '-0.5px' }}>
          POST a URL. Get a diagnosis.
        </h2>

        {/* Step header row — connecting line behind step numbers */}
        <div style={{ position: 'relative', marginBottom: 0 }}>
          <div className="hidden sm:block" style={{ position: 'absolute', top: 18, left: 0, right: 0, height: 1, background: 'rgba(111,155,198,0.2)', zIndex: 0 }} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div style={STEP_NUM_STYLE}>01</div>
              <p style={{ ...DISP, fontWeight: 700, fontSize: 18, color: '#E6E9EE', margin: '0 0 8px' }}>POST a URL</p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                Submit any URL via the API or paste it in the playground. Add optional parameters: site_type override, finding_depth, async mode, or page paths for multi-page scans.
              </p>
            </div>

            <div>
              <div style={STEP_NUM_STYLE}>02</div>
              <p style={{ ...DISP, fontWeight: 700, fontSize: 18, color: '#E6E9EE', margin: '0 0 8px' }}>307 checks run</p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                The page renders in headless Chrome. The site is classified: SaaS, ecommerce, service, B2B. Only relevant checks fire. SaaS sites get SaaS checks. 27 diagnostic categories total.
              </p>
            </div>

            <div>
              <div style={STEP_NUM_STYLE}>03</div>
              <p style={{ ...DISP, fontWeight: 700, fontSize: 18, color: '#E6E9EE', margin: '0 0 8px' }}>Get structured output</p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                Score, ranked findings, AI-rewritten copy, and industry benchmarks returned as JSON. Every finding references specific visible content — never fabricated.
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline dashed connector */}
        <div style={{ borderTop: '1px dashed rgba(111,155,198,0.15)', margin: '32px 0 0' }} />

        {/* Artifact row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" style={{ marginTop: 0 }}>

          {/* Artifact 01 — curl */}
          <div style={{ paddingTop: 24 }}>
            <div style={{ background: '#0A0E18', borderTop: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.12)', borderRight: '1px solid rgba(111,155,198,0.07)', borderBottom: '1px solid rgba(111,155,198,0.05)' }}>
              <CodeBlock language="bash" code={HIW_CURL} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{ ...MONO, fontSize: 11, color: '#00C48C', background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.06)', padding: '6px 12px' }}>307 checks</span>
              <span style={{ ...MONO, fontSize: 11, color: '#6F9BC6', background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.06)', padding: '6px 12px' }}>27 categories</span>
              <span style={{ ...MONO, fontSize: 11, color: '#6E7587', background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.06)', padding: '6px 12px' }}>~90s median</span>
            </div>
          </div>

          {/* Artifact 02 — scan state panel */}
          <div style={{ paddingTop: 24 }}>
            <div className="wd-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span className="status-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C48C', flexShrink: 0 }} />
                <span style={{ ...MONO, fontSize: 11, color: '#6E7587', textTransform: 'uppercase', letterSpacing: 1.5 }}>SCANNING</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {[
                  { name: 'hero_section',        done: true  },
                  { name: 'value_proposition',   done: true  },
                  { name: 'trust_credibility',   done: true  },
                  { name: 'cta_conversion',      done: false },
                  { name: 'social_proof',        done: false },
                ].map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 5, height: 5, flexShrink: 0, background: c.done ? '#00C48C' : 'rgba(110,117,135,0.4)', display: 'inline-block' }} />
                    <span style={{ ...MONO, fontSize: 11, color: c.done ? '#9398A8' : '#6E7587' }}>{c.name}</span>
                  </div>
                ))}
              </div>
              <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>running 307 checks across 27 categories</p>
            </div>
          </div>

          {/* Artifact 03 — output JSON */}
          <div style={{ paddingTop: 24 }}>
            <div style={{ background: '#0A0E18', borderTop: '1px solid rgba(111,155,198,0.2)', borderLeft: '1px solid rgba(111,155,198,0.12)', borderRight: '1px solid rgba(111,155,198,0.07)', borderBottom: '1px solid rgba(111,155,198,0.05)' }}>
              <CodeBlock language="json" code={HIW_JSON} />
            </div>
            <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '12px 0 0' }}>Build against this schema once. Every URL returns identical structure.</p>
          </div>

        </div>
      </div>
    </section>
  )
}


// ── Three Doors ───────────────────────────────────────────────────────────────

const DEV_JSON = `{
  "score": 61,
  "severity": "critical",
  "estimated_lift": "12–18%",
  "cost_usd": 0.15
}`

function ThreeDoorsSection() {
  return (
    <section style={{ padding: '96px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          One engine. Three interfaces.
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          Same scan. Different interface.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 40px' }}>
          Whether you&apos;re diagnosing your own site, managing client audits, or building conversion intelligence into a product — it&apos;s the same engine underneath.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ alignItems: 'stretch' }}>

          {/* Card 1 — Founders */}
          <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header zone */}
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>For founders</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Diagnose your site.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                Paste your URL. Get a full conversion audit in 90 seconds — score, ranked findings, AI-rewritten copy, and how you compare against your category.
              </p>
            </div>
            {/* Artifact zone */}
            <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.015)', flexGrow: 1 }}>
              <div style={{ background: '#050810', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <ScoreRing score={61} size="sm" animate={false} />
                  <div>
                    <p style={{ ...SANS, fontSize: 12, fontWeight: 500, color: '#E6E9EE', margin: 0 }}>acme-saas.com</p>
                    <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: 0 }}>63rd percentile · B2B SaaS</p>
                  </div>
                </div>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                  <p style={{ ...MONO, fontSize: 10, color: '#9398A8', margin: '0 0 3px' }}>
                    critical: <span style={{ color: '#E8635F' }}>hero headline is feature-led</span>
                  </p>
                  <p style={{ ...MONO, fontSize: 10, color: '#00C48C', margin: 0 }}>+12–18% lift with rewrite</p>
                </div>
              </div>
            </div>
            {/* CTA zone */}
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/scan" style={{ ...MONO, fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(0,196,140,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Scan my site free →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>Free · No account required</p>
            </div>
          </div>

          {/* Card 2 — Agencies */}
          <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header zone */}
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>For agencies</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Manage client audits.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                Client workspaces, white-label report links, multi-page scanning, competitor benchmarking. Show up to every call with data, not opinions.
              </p>
            </div>
            {/* Artifact zone */}
            <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.015)', flexGrow: 1 }}>
              <div style={{ background: '#050810', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px' }}>
                <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6E7587', margin: '0 0 3px' }}>PREPARED FOR</p>
                <p style={{ ...DISP, fontWeight: 500, fontSize: 14, color: '#E6E9EE', margin: '0 0 10px' }}>Acme Inc.</p>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                  {[
                    { k: 'score',     v: '61',                   vc: '#EFB23E' },
                    { k: 'findings',  v: '23 critical items',    vc: '#E8635F' },
                    { k: 'percentile',v: '63rd of B2B SaaS',     vc: '#6F9BC6' },
                  ].map(r => (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ ...MONO, fontSize: 10, color: '#6E7587' }}>{r.k}</span>
                      <span style={{ ...MONO, fontSize: 10, color: r.vc }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* CTA zone */}
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/pricing" style={{ ...MONO, fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(0,196,140,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                See agency plans →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>From $149/mo · 14-day trial</p>
            </div>
          </div>

          {/* Card 3 — Developers */}
          <div className="wd-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header zone */}
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>For developers</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Build with it.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                POST a URL, get structured JSON. Batch endpoint, async mode, webhooks. Integrate conversion intelligence into your product in an afternoon.
              </p>
            </div>
            {/* Artifact zone */}
            <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.015)', flexGrow: 1 }}>
              <div style={{ background: '#050810', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px' }}>
                <CodeBlock language="json" code={DEV_JSON} />
              </div>
            </div>
            {/* CTA zone */}
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/developer" style={{ ...MONO, fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(0,196,140,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Get API key →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>$0.15/scan · No monthly fee</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Stats Band ────────────────────────────────────────────────────────────────

const CORPUS_JSON = `{
  "benchmark_data": {
    "corpus_size": 4812,
    "industry_avg": 58,
    "top_quartile": 78,
    "most_common_critical": "feature_led_headline",
    "median_fix_time_hrs": 4,
    "sites_above_70": "31%",
    "updated": "weekly"
  }
}`

const CORPUS_STATS = [
  { value: '4,800+', label: 'Sites scanned',        color: '#E6E9EE' },
  { value: '58',     label: 'Average score',         color: '#EFB23E' },
  { value: '23',     label: 'Avg findings per site', color: '#EFB23E' },
  { value: '76%',    label: 'No above-fold proof',   color: '#E8635F' },
] as const

function StatsBand() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 0', background: '#080D18', borderTop: '0.5px solid rgba(239,178,62,0.12)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>

      {/* Amber bloom */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: 'radial-gradient(ellipse 1000px 500px at 50% 50%, rgba(239,178,62,0.06) 0%, transparent 60%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          Benchmark corpus
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          4,800 sites scanned. The benchmarks are real.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 540, lineHeight: 1.65, margin: '0 0 40px' }}>
          Every score is positioned against a real corpus of scanned sites, segmented by vertical. No synthetic data. No curated samples.
        </p>

        {/* Stat cells */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(239,178,62,0.15)', marginBottom: 32 }}>
          {CORPUS_STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: '24px 28px',
                background: '#0A0E18',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderLeft: i === 0 ? '1px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(255,255,255,0.06)',
                borderRight: i === CORPUS_STATS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ ...DISP, fontWeight: 700, fontSize: 48, color: s.color, lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
              <div style={{ ...MONO, fontSize: 11, color: '#6E7587', textTransform: 'uppercase', letterSpacing: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* JSON block with header */}
        <div style={{ background: '#0A0E18', borderTop: '1px solid rgba(255,255,255,0.12)', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            <span style={{ width: 5, height: 5, background: '#00C48C', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>benchmark_data · live corpus · updated weekly</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <CodeBlock language="json" code={CORPUS_JSON} />
          </div>
        </div>

        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', textAlign: 'center', margin: 0 }}>
          Aggregated from real scans · no synthetic data · updated weekly
        </p>
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
    features: ['1 scan included', 'Full conversion score', 'Top 3 findings', 'Benchmark position'],
    cta: 'TRY FREE →',
    href: '/playground',
    primary: false,
  },
  {
    tier: 'STARTER',
    price: { monthly: '$49', annual: '$39' },
    period: { monthly: '/ month', annual: '/ mo · billed annually' },
    features: ['20 scans / month', 'Auto competitor analysis', 'Score trending over time', 'Full findings ranked', 'Single user'],
    cta: 'START TRIAL →',
    href: '/signup?plan=starter',
    primary: false,
  },
  {
    tier: 'AGENCY',
    price: { monthly: '$149', annual: '$119' },
    period: { monthly: '/ month', annual: '/ mo · billed annually' },
    features: ['100 scans / month', 'Unlimited client workspaces', 'White-label report links', 'Multi-page scanning (3 pages)', 'PDF export with your logo', '3 team seats', '100 bundled API calls'],
    label: 'most selected',
    cta: 'START TRIAL →',
    href: '/signup?plan=agency',
    primary: true,
  },
  {
    tier: 'ENTERPRISE',
    price: { monthly: '$499', annual: '$399' },
    period: { monthly: '/ month', annual: '/ mo · billed annually' },
    features: ['500 scans / month', 'Everything in Agency', '10 team seats', 'White-label subdomain', 'Scan scheduling + alerts', 'Slack notifications'],
    cta: 'START TRIAL →',
    href: '/signup?plan=enterprise',
    primary: false,
  },
] as const

function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  return (
    <section style={{ padding: '96px 0', background: '#06090F', borderTop: '0.5px solid rgba(255,255,255,0.08)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          Plans &amp; pricing
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Start free. Scale when ready.
        </h2>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#6E7587', margin: '0 0 28px' }}>No contracts. Cancel anytime.</p>

        {/* Toggle */}
        <div className="wd-panel" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 36, padding: 4, width: 'fit-content' }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                padding: '7px 18px',
                border: 'none',
                cursor: 'pointer',
                background: billing === b ? '#00C48C' : 'transparent',
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
              className={`wd-panel${plan.primary ? ' wd-panel-primary' : ''}`}
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6' }}>
                  {plan.tier}
                </span>
                {'label' in plan && (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#6E7587', letterSpacing: 1 }}>
                    · {plan.label}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 42, color: '#E6E9EE', lineHeight: 1 }}>
                  {plan.price[billing]}
                </span>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: '#6E7587', marginTop: 4 }}>
                  {plan.period[billing]}
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                    <span style={{ width: 6, height: 6, background: '#00C48C', flexShrink: 0, marginTop: 4 }} />
                    <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: '#9398A8' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  padding: '11px 0',
                  textDecoration: 'none',
                  background: plan.primary ? '#00C48C' : 'transparent',
                  color: plan.primary ? '#050810' : '#E6E9EE',
                  border: plan.primary ? 'none' : '0.5px solid rgba(255,255,255,0.15)',
                  fontWeight: plan.primary ? 600 : 400,
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Developer callout */}
        <div className="wd-panel" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 8px' }}>
              For developers
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#E6E9EE', margin: '0 0 6px' }}>
              Build with the API
            </p>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', margin: 0 }}>
              POST a URL. Get structured JSON. 307 checks.{' '}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#00C48C' }}>
                From $0.15/scan · 25 free to start
              </span>
            </p>
          </div>
          <Link
            href="/developers#pricing"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#00C48C', border: '0.5px solid rgba(0,196,140,0.4)', padding: '11px 20px', textDecoration: 'none', flexShrink: 0 }}
          >
            SEE DEVELOPER PRICING →
          </Link>
        </div>

      </div>
    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCtaSection() {
  const [focused, setFocused] = useState(false)

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 0', background: '#080D18', borderTop: '0.5px solid rgba(0,196,140,0.2)' }}>
      <style>{`
        @keyframes scan-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,196,140,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(0,196,140,0); }
        }
        .scan-btn-pulse { animation: scan-pulse 2.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .scan-btn-pulse { animation: none; } }
      `}</style>

      {/* Green radial bloom */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 800px 400px at 50% 50%, rgba(0,196,140,0.07) 0%, transparent 60%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: '0 48px', textAlign: 'center' }}>

        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          Run it on your site
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 44, lineHeight: 1.1, color: '#E6E9EE', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          See your score in 90 seconds.
        </h2>
        <p style={{ ...SANS, fontSize: 16, color: '#9398A8', lineHeight: 1.65, margin: '0 0 32px' }}>
          Paste any URL. Get ranked findings, benchmarks, and AI-rewritten copy.
        </p>

        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6E7587', textAlign: 'left', margin: '0 0 6px' }}>
          POST /api/v1/scan
        </p>

        <div style={{
          display: 'flex',
          background: '#0A0E18',
          borderTop: `1px solid ${focused ? 'rgba(0,196,140,0.6)' : 'rgba(255,255,255,0.1)'}`,
          borderLeft: `1px solid ${focused ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.07)'}`,
          borderRight: `1px solid ${focused ? 'rgba(0,196,140,0.2)' : 'rgba(255,255,255,0.04)'}`,
          borderBottom: `1px solid ${focused ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.03)'}`,
          transition: 'border-color 0.15s',
          marginBottom: 8,
        }}>
          <span style={{ ...MONO, fontSize: 12, color: '#6E7587', padding: '0 12px', display: 'flex', alignItems: 'center', flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,0.08)' }}>
            https://
          </span>
          <input
            type="text"
            placeholder="your-site.com"
            style={{ flex: 1, background: 'transparent', ...MONO, fontSize: 14, color: '#E6E9EE', padding: '13px 14px', border: 'none', outline: 'none' }}
            readOnly
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={() => { window.location.href = '/scan' }}
          />
        </div>

        <Link
          href="/scan"
          className="scan-btn-pulse"
          style={{ display: 'block', ...MONO, fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', background: '#00C48C', color: '#050810', padding: '16px', textDecoration: 'none', textAlign: 'center', marginBottom: 16 }}
        >
          SCAN FREE →
        </Link>

        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
          307 CHECKS · ~90 SECONDS · NO ACCOUNT REQUIRED
        </p>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Is this just a Lighthouse score?',
    a: 'No. Lighthouse measures technical performance — page speed, accessibility, SEO signals. webdoc measures conversion — whether your messaging, trust signals, CTAs, and offer clarity are working. Completely different diagnostic.',
    accent: '#6F9BC6',
  },
  {
    q: 'How is the score calculated?',
    a: "307 checks across 27 categories. Each check is weighted by its estimated impact on conversion rate. The score is benchmarked against every other site webdoc has scanned in your industry category — so 61 means you're in the 63rd percentile for B2B SaaS, not just an abstract number.",
    accent: '#6F9BC6',
  },
  {
    q: "What happens to my site's data?",
    a: 'Scan results are stored and associated with your account. We use aggregate anonymized data to improve benchmarks. We do not sell or share individual scan results.',
    accent: '#8080c0',
  },
  {
    q: 'How accurate are the findings?',
    a: "Findings are grounded in specific visible content on your page — not generic advice. The AI is instructed to never fabricate a finding it can't point to in the actual page content. Unknown is better than wrong.",
    accent: '#8080c0',
  },
  {
    q: 'Can I use this for client sites?',
    a: "Yes — that's what the Agency plan is for. Unlimited client workspaces, white-label report links, multi-page scanning, and competitor benchmarking per client. $149/month.",
    accent: '#6F9BC6',
  },
]

function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <section style={{ padding: '96px 0' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 48px' }}>

        {/* Eyebrow + count badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: 0 }}>
            COMMON QUESTIONS
          </p>
          <span style={{ ...MONO, fontSize: 10, color: '#6F9BC6', background: '#0A0E18', border: '0.5px solid rgba(111,155,198,0.4)', padding: '2px 8px' }}>
            5 answers
          </span>
        </div>

        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 36px', letterSpacing: '-0.5px' }}>
          Common questions.
        </h2>

        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openFaq === i
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                background: isOpen ? '#0A0E18' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {/* Left accent bar — brightens when open */}
              <div style={{ width: 3, flexShrink: 0, alignSelf: 'stretch', background: item.accent, opacity: isOpen ? 1 : 0.6, transition: 'opacity 0.15s' }} />

              {/* Content */}
              <div style={{ flex: 1, padding: '0 18px' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '18px 0' }}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                >
                  <span style={{ ...SANS, fontWeight: 500, fontSize: 15, color: '#E6E9EE' }}>
                    {item.q}
                  </span>
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ flexShrink: 0, marginLeft: 16, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: isOpen ? item.accent : '#6E7587' }}
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {isOpen && (
                  <>
                    <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.7, padding: '0 24px 20px 0', margin: 0 }}>
                      {item.a}
                    </p>
                    <div style={{ height: '0.5px', background: item.accent, marginBottom: 0 }} />
                  </>
                )}
              </div>
            </div>
          )
        })}
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
            webdoc<span className="text-cyan-DEFAULT">.ai</span>
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
          <Link href="/signup" className="font-body text-sm text-cyan-DEFAULT hover:opacity-80 block mb-3 no-underline">Get API key →</Link>
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
      <StatsStrip />
      <div className="section-separator" />
      <OutputSection />
      <div className="section-separator" />
      <ResponseAnnotatorSection />
      <div className="section-separator" />
      <HowItWorksSection />
      <div className="section-separator" />
      <StatsBand />
      <div className="section-separator" />
      <ThreeDoorsSection />
      <div className="section-separator" />
      <PricingSection />
      <div className="section-separator" />
      <ObjectionSection />
      <div className="section-separator" />
      <FaqSection />
      <div className="section-separator" />
      <FinalCtaSection />
      <FooterSection />
    </main>
  )
}
