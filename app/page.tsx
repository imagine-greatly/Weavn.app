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
            'radial-gradient(ellipse 800px 600px at 75% 50%, rgba(0,196,140,0.05) 0%, transparent 60%), radial-gradient(ellipse 600px 400px at 25% 80%, rgba(128,128,192,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-[1280px] mx-auto flex gap-16 items-start relative z-10">

        {/* Left column */}
        <div className="flex-[55] min-w-0">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 bg-background-raised border border-background-border px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-score-high animate-pulse flex-shrink-0" />
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
          <div className="bg-background-subtle border border-background-border p-4 mt-8">
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

          {/* Stats row */}
          <div className="flex flex-row gap-8 mt-9 pt-6 border-t border-background-border overflow-x-auto scroll-track-hide-scrollbar">
            {[
              { value: '307',   label: 'CHECKS PER SCAN'  },
              { value: '$0.15', label: 'PER SCAN'         },
              { value: '~90s',  label: 'MEDIAN RESPONSE'  },
              { value: '27',    label: 'CATEGORIES'       },
              { value: 'FREE',  label: 'CACHE HITS'       },
            ].map(s => (
              <div key={s.value} className="flex-shrink-0">
                <Stat value={s.value} label={s.label} verdict="neutral" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column — terminal panel */}
        <div
          className="flex-[45] min-w-0 relative border border-background-border bg-background-raised"
          style={{
            boxShadow: '0 0 60px rgba(0,196,140,0.06), 0 0 120px rgba(128,128,192,0.04)',
            borderTop: '0.5px solid rgba(0,196,140,0.2)',
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

function HowItWorksSection() {
  return (
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <style>{`
        @keyframes wiwScanPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        .wiw-scan-label {
          animation: wiwScanPulse 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wiw-scan-label { animation: none; opacity: 0.7; }
        }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          How it works
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 48px', letterSpacing: '-0.5px' }}>
          POST a URL. Get a diagnosis.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          {/* Step 01 */}
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>
              01 —
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#E6E9EE', margin: '0 0 8px' }}>
              POST a URL
            </p>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: '0 0 16px' }}>
              Submit any URL via the API or paste it in the playground. Add optional parameters: site_type override, finding_depth, async mode, or page paths for multi-page scans.
            </p>
            <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px' }}>
              <CodeBlock language="bash" code={`curl -X POST /api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -d '{"url":"https://your-site.com"}'`} />
            </div>
          </div>

          {/* Step 02 */}
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>
              02 —
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#E6E9EE', margin: '0 0 8px' }}>
              307 checks run
            </p>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: '0 0 16px' }}>
              The page renders in headless Chrome. The site is classified: SaaS, ecommerce, service, B2B. Only relevant checks fire. SaaS sites get SaaS checks. 27 diagnostic categories total.
            </p>
            <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <ScoreRing score={0} size="sm" animate={false} />
              <span className="wiw-scan-label" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587', letterSpacing: 1 }}>
                scanning…
              </span>
            </div>
          </div>

          {/* Step 03 */}
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>
              03 —
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#E6E9EE', margin: '0 0 8px' }}>
              Get structured output
            </p>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: '0 0 16px' }}>
              Score, ranked findings, AI-rewritten copy, and industry benchmarks returned as JSON. Every finding references specific visible content — never fabricated.
            </p>
            <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px' }}>
              <CodeBlock language="json" code={`{
  "score": 61,
  "percentile": 63,
  "findings": 23,
  "rewritten_copy": {
    "headline": "Ship projects on time."
  }
}`} />
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}


// ── Three Doors ───────────────────────────────────────────────────────────────

function ThreeDoorsSection() {
  return (
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          One engine. Three interfaces.
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          Same scan. Different interface.
        </h2>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 40px' }}>
          Whether you&apos;re diagnosing your own site, managing client audits, or building conversion intelligence into a product — it&apos;s the same engine underneath.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Card 1 — Founders */}
          <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 14px' }}>
              For founders
            </p>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>
              Diagnose your site.
            </h3>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: '0 0 18px' }}>
              Paste your URL. Get a full conversion audit in 90 seconds — score, ranked findings, AI-rewritten copy, and how you compare against your category.
            </p>
            <div style={{ background: '#050810', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px', flex: 1, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <ScoreRing score={61} size="sm" animate={false} />
                <div>
                  <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#E6E9EE', margin: 0 }}>acme-saas.com</p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587', margin: 0 }}>63rd percentile · B2B SaaS</p>
                </div>
              </div>
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#9398A8', margin: '0 0 3px' }}>
                  critical: <span style={{ color: '#E8635F' }}>Hero headline is feature-led</span>
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#00C48C', margin: 0 }}>+12–18% lift with rewrite</p>
              </div>
            </div>
            <div style={{ paddingTop: 18, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/scan" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(0,196,140,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Scan my site free →
              </Link>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>Free · No account required</p>
            </div>
          </div>

          {/* Card 2 — Agencies */}
          <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 14px' }}>
              For agencies
            </p>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>
              Manage client audits.
            </h3>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: '0 0 18px' }}>
              Client workspaces, white-label report links, multi-page scanning, competitor benchmarking. Show up to every call with data, not opinions.
            </p>
            <div style={{ background: '#050810', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px', flex: 1, marginBottom: 18 }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6E7587', margin: '0 0 3px' }}>PREPARED FOR</p>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 14, color: '#E6E9EE', margin: '0 0 10px' }}>Acme Inc.</p>
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587' }}>score</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#EFB23E', fontWeight: 600 }}>61</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587' }}>findings</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#E8635F' }}>23 critical items</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587' }}>percentile</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6F9BC6' }}>63rd of B2B SaaS sites</span>
                </div>
              </div>
            </div>
            <div style={{ paddingTop: 18, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/pricing" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(0,196,140,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                See agency plans →
              </Link>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>From $149/mo · 14-day trial</p>
            </div>
          </div>

          {/* Card 3 — Developers */}
          <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 14px' }}>
              For developers
            </p>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>
              Build with it.
            </h3>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: '0 0 18px' }}>
              POST a URL, get structured JSON. Batch endpoint, async mode, webhooks. Integrate conversion intelligence into your product in an afternoon.
            </p>
            <div style={{ background: '#050810', border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px', flex: 1, marginBottom: 18 }}>
              <CodeBlock language="bash" code={`curl -X POST /api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -d '{"url":"https://your-site.com"}'`} />
            </div>
            <div style={{ paddingTop: 18, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/developer" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(0,196,140,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Get API key →
              </Link>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>$0.15/scan · No monthly fee</p>
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

function StatsBand() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>

      {/* Ambient amber bloom behind the verdict stat row */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: 'radial-gradient(ellipse 800px 300px at 50% 60%, rgba(239,178,62,0.03) 0%, transparent 70%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          Benchmark corpus
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          4,800 sites scanned. The benchmarks are real.
        </h2>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: '#9398A8', maxWidth: 540, lineHeight: 1.65, margin: '0 0 40px' }}>
          Every score is positioned against a real corpus of scanned sites, segmented by vertical. No synthetic data. No curated samples.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.06)', marginBottom: 32 }}>
          {([
            { value: '4,800+', label: 'Sites scanned',           verdict: 'neutral'        },
            { value: 58,       label: 'Average score',            verdict: 'score'          },
            { value: 23,       label: 'Avg findings per site',    verdict: 'problem-count'  },
            { value: '76%',    label: 'No above-fold proof',      verdict: 'problem-count'  },
          ] as const).map(s => (
            <div key={s.label} style={{ background: '#0A0E18', padding: '24px' }}>
              <Stat value={s.value} label={s.label} verdict={s.verdict} />
            </div>
          ))}
        </div>

        <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '16px 20px', marginBottom: 20 }}>
          <CodeBlock language="json" code={CORPUS_JSON} />
        </div>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6E7587', textAlign: 'center', margin: 0 }}>
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
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          Plans &amp; pricing
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Start free. Scale when ready.
        </h2>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#6E7587', margin: '0 0 28px' }}>No contracts. Cancel anytime.</p>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 36, background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: 4, width: 'fit-content' }}>
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
              style={{
                background: '#0A0E18',
                border: plan.primary ? '0.5px solid rgba(0,196,140,0.35)' : '0.5px solid rgba(255,255,255,0.07)',
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
        <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
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
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(0,196,140,0.25); }
          50%       { box-shadow: 0 0 0 1px rgba(0,196,140,0.7); }
        }
        .cta-btn-pulse { animation: ctaPulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cta-btn-pulse { animation: none; }
        }
      `}</style>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 48px', textAlign: 'center' }}>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          Run it on your site
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 38, lineHeight: 1.1, color: '#E6E9EE', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          See your score in 90 seconds.
        </h2>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: '#9398A8', lineHeight: 1.65, margin: '0 0 28px' }}>
          Paste any URL. Get ranked findings, benchmarks, and AI-rewritten copy.
        </p>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6F9BC6', textAlign: 'left', margin: '0 0 6px' }}>
          POST /api/v1/scan
        </p>

        <div style={{ display: 'flex', border: `0.5px solid ${focused ? '#00C48C' : 'rgba(255,255,255,0.12)'}`, background: '#0A0E18', transition: 'border-color 0.15s' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#6E7587', padding: '0 12px', display: 'flex', alignItems: 'center', flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,0.08)' }}>
            https://
          </span>
          <input
            type="text"
            placeholder="your-site.com"
            style={{ flex: 1, background: 'transparent', fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: '#E6E9EE', padding: '13px 14px', border: 'none', outline: 'none' }}
            readOnly
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={() => { window.location.href = '/scan' }}
          />
          <Link
            href="/scan"
            className="cta-btn-pulse"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', background: '#00C48C', color: '#050810', padding: '13px 20px', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center' }}
          >
            SCAN FREE →
          </Link>
        </div>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6E7587', marginTop: 16 }}>
          307 checks · ~90 seconds · no account required
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
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          FAQ
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 36px', letterSpacing: '-0.5px' }}>
          Common questions.
        </h2>

        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              background: openFaq === i ? '#0A0E18' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            {/* Left accent bar */}
            <div style={{ width: 3, flexShrink: 0, alignSelf: 'stretch', background: item.accent }} />

            {/* Content */}
            <div style={{ flex: 1, padding: '0 18px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '18px 0' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 15, color: '#E6E9EE' }}>
                  {item.q}
                </span>
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ flexShrink: 0, marginLeft: 16, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#6E7587' }}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {openFaq === i && (
                <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#9398A8', lineHeight: 1.65, paddingBottom: 18, margin: 0 }}>
                  {item.a}
                </p>
              )}
            </div>
          </div>
        ))}
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
    <main className="bg-background-base min-h-screen home-atmosphere">
      <NavBar />
      <HeroSection />
      <OutputSection />
      <ResponseAnnotatorSection />
      <HowItWorksSection />
      <StatsBand />
      <ThreeDoorsSection />
      <PricingSection />
      <ObjectionSection />
      <FaqSection />
      <FinalCtaSection />
      <FooterSection />
    </main>
  )
}
