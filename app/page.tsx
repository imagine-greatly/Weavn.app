'use client'

import { useState } from 'react'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import Label from '@/components/ui/Label'

// ── Syntax-highlighted JSON primitives ──────────────────────────────────────

function K({ c }: { c: string }) {
  return <span className="text-[#8080c0]">{c}</span>
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
          {['Docs', 'Pricing', 'Changelog'].map(link => (
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
      {'  '}<K c='"score"' /><P c=": " /><N c="61" /><P c="," />{'\n'}
      {'  '}<K c='"industry"' /><P c=": " /><S c='"B2B SaaS"' /><P c="," />{'\n'}
      {'  '}<K c='"benchmark"' /><P c=": {" />{'\n'}
      {'    '}<K c='"industry_avg"' /><P c=": " /><N c="54" /><P c="," />{'\n'}
      {'    '}<K c='"top_quartile"' /><P c=": " /><N c="78" /><P c="," />{'\n'}
      {'    '}<K c='"percentile"' /><P c=": " /><N c="63" />{'\n'}
      {'  '}<P c="}," />{'\n'}
      {'  '}<K c='"findings"' /><P c=": [" />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="1" /><P c="," />{'\n'}
      {'      '}<K c='"severity"' /><P c=": " /><S c='"critical"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"value_proposition"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"Hero headline is feature-led, not outcome-led"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"12–18% conversion uplift"' />{'\n'}
      {'    '}<P c="}," />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="2" /><P c="," />{'\n'}
      {'      '}<K c='"severity"' /><P c=": " /><S c='"high"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"social_proof"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"No above-fold proof — testimonials buried at 2,400px"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"8–11% conversion uplift"' />{'\n'}
      {'    '}<P c="}," />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="3" /><P c="," />{'\n'}
      {'      '}<K c='"severity"' /><P c=": " /><S c='"high"' /><P c="," />{'\n'}
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
    <section className="scanline-texture min-h-screen pt-[120px] pb-20 px-8">
      <div className="max-w-[1280px] mx-auto flex gap-16 items-start">

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
            The conversion audit API. Founders use it to diagnose their site. Agencies use it to run client audits. Developers build it into their products. One scan engine — 260+ checks, ranked findings, AI-rewritten copy.
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
          <div className="flex gap-8 mt-12 pt-8 border-t border-background-border">
            {[
              { value: '210', label: 'checks per scan' },
              { value: '$0.15', label: 'per scan' },
              { value: '90s', label: 'median response' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="font-display font-extrabold text-2xl text-text-primary tracking-tight">{stat.value}</div>
                <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — terminal panel */}
        <div className="flex-[45] min-w-0 relative glow-cyan border border-background-border bg-background-raised">

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

// ── Signal Band ───────────────────────────────────────────────────────────────

function SignalBand() {
  return (
    <div className="w-full bg-background-raised border-y border-background-border py-5">
      <p className="text-center font-mono text-sm text-text-tertiary">
        POST /api/v1/scan{' '}
        <span className="text-cyan-DEFAULT">→</span>{' '}
        200 OK{' '}
        <span className="text-text-tertiary">·</span>{' '}
        {'{'}
        <span className="text-score-high">&quot;score&quot;</span>: 61, <span className="text-score-high">&quot;findings&quot;</span>: 23, <span className="text-score-high">&quot;duration_ms&quot;</span>: 87340, <span className="text-score-high">&quot;cost_usd&quot;</span>: 0.15
        {'}'}
      </p>
    </div>
  )
}

// ── Response Section JSON ─────────────────────────────────────────────────────

function ResponseJson() {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <P c="{" />{'\n'}
      {'  '}<K c='"scan_id"' /><P c=": " /><S c='"scan_01HXYZ7K2M9N3P4Q"' /><P c="," />{'\n'}
      {'  '}<K c='"url"' /><P c=": " /><S c='"https://acme-saas.com"' /><P c="," />{'\n'}
      {'  '}<K c='"score"' /><P c=": " /><N c="61" /><P c="," />{'\n'}
      {'  '}<K c='"benchmark"' /><P c=": {" />{'\n'}
      {'    '}<K c='"industry_avg"' /><P c=": " /><N c="54" /><P c="," />{'\n'}
      {'    '}<K c='"top_quartile"' /><P c=": " /><N c="78" /><P c="," />{'\n'}
      {'    '}<K c='"percentile"' /><P c=": " /><N c="63" />{'\n'}
      {'  '}<P c="}," />{'\n'}
      {'  '}<K c='"findings"' /><P c=": [" />{'\n'}
      {[
        { p: 1, sev: 'critical', cat: 'value_proposition', title: 'Hero headline is feature-led, not outcome-led', lift: '12–18% conversion uplift', detail: 'Current headline names a feature. Visitors need to know what changes for them.', fix: 'Rewrite to: "Ship projects on time, every time." — outcome-led, present tense.' },
        { p: 2, sev: 'high', cat: 'social_proof', title: 'No above-fold proof — testimonials buried at 2,400px', lift: '8–11% conversion uplift', detail: 'Trust signals exist but appear below three full viewport scrolls.', fix: 'Surface one logo strip or testimonial within 600px of page top.' },
        { p: 3, sev: 'high', cat: 'cta_clarity', title: 'Dual primary CTAs create decision paralysis', lift: '6–9% conversion uplift', detail: 'Two equal-weight CTA buttons in the hero split intent and reduce each click.', fix: 'Demote secondary CTA to a text link. One primary action per section.' },
        { p: 4, sev: 'medium', cat: 'pricing_clarity', title: 'Pricing page is missing comparison anchoring', lift: '4–7% conversion uplift', detail: 'No tier comparison means visitors cannot self-select. Most leave to find it elsewhere.', fix: 'Add a 2-column comparison with the most common objection addressed per tier.' },
        { p: 5, sev: 'medium', cat: 'mobile_experience', title: 'CTA is not visible on first scroll on mobile', lift: '3–6% conversion uplift', detail: 'At 390px viewport the primary button is below fold on first paint.', fix: 'Move CTA above the product screenshot or add a sticky mobile CTA bar.' },
      ].map((f, i, arr) => (
        <span key={f.p}>
          {'    '}<P c="{" />{'\n'}
          {'      '}<K c='"priority"' /><P c=": " /><N c={String(f.p)} /><P c="," />{'\n'}
          {'      '}<K c='"severity"' /><P c=": " /><S c={`"${f.sev}"`} /><P c="," />{'\n'}
          {'      '}<K c='"category"' /><P c=": " /><S c={`"${f.cat}"`} /><P c="," />{'\n'}
          {'      '}<K c='"title"' /><P c=": " /><S c={`"${f.title}"`} /><P c="," />{'\n'}
          {'      '}<K c='"estimated_lift"' /><P c=": " /><S c={`"${f.lift}"`} /><P c="," />{'\n'}
          {'      '}<K c='"detail"' /><P c=": " /><S c={`"${f.detail}"`} /><P c="," />{'\n'}
          {'      '}<K c='"fix"' /><P c=": " /><S c={`"${f.fix}"`} />{'\n'}
          {'    '}<P c={i < arr.length - 1 ? '},' : '}'} />{'\n'}
        </span>
      ))}
      {'  '}<P c="]," />{'\n'}
      {'  '}<K c='"rewritten_copy"' /><P c=": {" />{'\n'}
      {'    '}<K c='"headline"' /><P c=": " /><S c='"Ship projects on time, every time."' /><P c="," />{'\n'}
      {'    '}<K c='"subheadline"' /><P c=": " /><S c='"The project management layer your team actually uses."' /><P c="," />{'\n'}
      {'    '}<K c='"cta_primary"' /><P c=": " /><S c='"Start free — no credit card"' />{'\n'}
      {'  '}<P c="}," />{'\n'}
      {'  '}<K c='"cost_usd"' /><P c=": " /><N c="0.15" /><P c="," />{'\n'}
      {'  '}<K c='"duration_ms"' /><P c=": " /><N c="87340" />{'\n'}
      <P c="}" />
    </div>
  )
}

function ResponseSection() {
  return (
    <section className="py-24 px-8 border-t border-background-border">
      <div className="max-w-[1280px] mx-auto">
        <Label>THE RESPONSE IS THE PRODUCT</Label>
        <h2 className="font-display font-extrabold text-4xl tracking-tight text-text-primary mt-3 mb-4">
          260+ checks. One structured output.
        </h2>
        <p className="font-body text-text-secondary text-lg max-w-2xl mb-16">
          Every scan returns the same predictable schema. Build against it once. Every URL you POST returns findings ranked by estimated revenue impact, benchmarked against your industry, with AI-rewritten copy attached.
        </p>

        <div className="flex gap-12 items-start">
          {/* JSON panel */}
          <div className="flex-[60] min-w-0 bg-background-raised border border-background-border p-6">
            <ResponseJson />
          </div>

          {/* Annotation rail */}
          <div className="flex-[40] min-w-0">
            {[
              {
                field: 'score',
                note: '0–100. Benchmarked against 2,400+ scanned sites in your industry vertical.',
              },
              {
                field: 'findings[].estimated_lift',
                note: 'Projected conversion uplift if this finding is addressed. Ranked by impact, not severity.',
              },
              {
                field: 'benchmark.percentile',
                note: 'Where this site sits relative to all sites webdoc has scanned in the same industry.',
              },
              {
                field: 'rewritten_copy',
                note: 'AI-rewritten headline, subheadline, and primary CTA. Drop-in replacements, not suggestions.',
              },
            ].map(a => (
              <div key={a.field} className="border-l-2 border-background-border pl-4 mb-8">
                <div className="font-mono text-xs text-cyan-DEFAULT">{a.field}</div>
                <div className="font-body text-sm text-text-secondary mt-1">{a.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Endpoints Section ─────────────────────────────────────────────────────────

const ENDPOINTS = [
  {
    label: 'Scan a URL',
    method: 'POST',
    path: '/api/v1/scan',
    desc: 'Submit a URL for a full conversion audit. Returns synchronously or via webhook in async mode.',
    timing: 'p50: 87s · p95: 142s',
    curl: (
      <span>
        <span className="text-cyan-DEFAULT">curl</span>
        <span className="text-text-tertiary">{' -X POST https://webdocai.com/api/v1/scan \\\n  -H "Authorization: Bearer '}</span>
        <span className="text-score-high">wdoc_live_••••</span>
        <span className="text-text-tertiary">{'" \\\n  -H "Content-Type: application/json" \\\n  -d \''}</span>
        <span className="text-text-tertiary">{'{\n    "'}</span>
        <span className="text-score-high">url</span>
        <span className="text-text-tertiary">{'": "'}</span>
        <span className="text-score-high">https://acme-saas.com</span>
        <span className="text-text-tertiary">{'"\n  }\''}  </span>
      </span>
    ),
  },
  {
    label: 'Batch scan',
    method: 'POST',
    path: '/api/v1/scan/batch',
    desc: 'Submit up to 10 URLs in a single request. Results delivered via webhook.',
    timing: 'p50: 94s · p95: 160s',
    curl: (
      <span>
        <span className="text-cyan-DEFAULT">curl</span>
        <span className="text-text-tertiary">{' -X POST https://webdocai.com/api/v1/scan/batch \\\n  -H "Authorization: Bearer '}</span>
        <span className="text-score-high">wdoc_live_••••</span>
        <span className="text-text-tertiary">{'" \\\n  -d \''}</span>
        <span className="text-text-tertiary">{'{\n    "'}</span>
        <span className="text-score-high">urls</span>
        <span className="text-text-tertiary">{'": ["'}</span>
        <span className="text-score-high">https://site-a.com</span>
        <span className="text-text-tertiary">{'", "'}</span>
        <span className="text-score-high">https://site-b.com</span>
        <span className="text-text-tertiary">{'"],\n    "'}</span>
        <span className="text-score-high">webhook_url</span>
        <span className="text-text-tertiary">{'": "'}</span>
        <span className="text-score-high">https://your-app.com/webhook</span>
        <span className="text-text-tertiary">{'"\n  }\''}  </span>
      </span>
    ),
  },
  {
    label: 'Retrieve result',
    method: 'GET',
    path: '/api/v1/scans/{id}',
    desc: 'Retrieve a completed scan by ID. Full JSON schema returned.',
    timing: 'p50: 120ms · p95: 340ms',
    curl: (
      <span>
        <span className="text-cyan-DEFAULT">curl</span>
        <span className="text-text-tertiary">{' https://webdocai.com/api/v1/scans/'}</span>
        <span className="text-score-high">scan_01HXYZ7K2M9N3P4Q</span>
        <span className="text-text-tertiary">{' \\\n  -H "Authorization: Bearer '}</span>
        <span className="text-score-high">wdoc_live_••••</span>
        <span className="text-text-tertiary">{'"'}  </span>
      </span>
    ),
  },
]

function EndpointsSection() {
  const [active, setActive] = useState(0)
  const ep = ENDPOINTS[active]

  return (
    <section className="py-24 px-8 border-t border-background-border">
      <div className="max-w-[1280px] mx-auto">
        <Label>API SURFACE</Label>
        <h2 className="font-display font-extrabold text-4xl tracking-tight text-text-primary mt-3 mb-10">
          Three endpoints. That&apos;s it.
        </h2>

        {/* Tab bar */}
        <div className="flex border-b border-background-border mb-8">
          {ENDPOINTS.map((e, i) => (
            <button
              key={e.label}
              onClick={() => setActive(i)}
              className={`font-body text-sm pb-3 px-4 cursor-pointer border-0 bg-transparent transition-colors duration-150 ${
                i === active
                  ? 'border-b-2 border-cyan-DEFAULT text-text-primary -mb-px'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Two column */}
        <div className="flex gap-8 items-start">
          {/* Left: metadata */}
          <div className="w-[35%]">
            <span
              className={`font-mono text-xs px-2 py-0.5 ${
                ep.method === 'POST'
                  ? 'bg-cyan-dim text-cyan-DEFAULT'
                  : 'bg-background-subtle text-score-low'
              }`}
            >
              {ep.method}
            </span>
            <div className="font-mono text-sm text-text-primary mt-2">{ep.path}</div>
            <div className="font-body text-sm text-text-secondary mt-2">{ep.desc}</div>
            <div className="font-mono text-xs text-text-tertiary mt-4">{ep.timing}</div>
          </div>

          {/* Right: curl block */}
          <div className="flex-1 bg-background-subtle border border-background-border p-6">
            <pre className="font-mono text-sm m-0 leading-relaxed whitespace-pre-wrap">
              {ep.curl}
            </pre>
          </div>
        </div>

        <Link href="/docs" className="font-body text-sm text-cyan-DEFAULT mt-8 inline-block no-underline hover:opacity-80 transition-opacity duration-150">
          View full API reference →
        </Link>
      </div>
    </section>
  )
}

// ── Three Doors ───────────────────────────────────────────────────────────────

function ThreeDoorsSection() {
  return (
    <section className="py-24 px-8 border-t border-background-border">
      <div className="max-w-[1280px] mx-auto">
        <Label>ONE ENGINE. THREE WAYS IN.</Label>
        <h2 className="font-display font-bold text-4xl text-text-primary tracking-tight mt-3 mb-4">
          Same scan. Different interface.
        </h2>
        <p className="font-body text-lg text-text-secondary max-w-2xl mb-16">
          Whether you&apos;re diagnosing your own site, managing client audits, or building conversion
          intelligence into a product — it&apos;s the same engine underneath.
        </p>

        <div className="grid grid-cols-3 gap-px bg-background-border">

          {/* Panel 1 — Founders */}
          <div className="bg-background-raised p-10 hover:bg-background-interactive transition-colors duration-200 cursor-pointer">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-6">FOR FOUNDERS</div>
            <h3 className="font-display font-bold text-2xl text-text-primary leading-snug mb-4">
              Diagnose your site.
            </h3>
            <p className="font-body text-sm text-text-secondary leading-relaxed mb-8">
              Paste your URL. Get a full conversion audit in 90 seconds — score, ranked findings,
              AI-rewritten copy, and how you compare against 3 competitors in your category.
              Free to start.
            </p>
            <div>
              <Link
                href="/playground"
                className="font-body text-sm text-text-secondary border-b border-background-border pb-0.5 no-underline hover:text-text-primary hover:border-text-tertiary transition-colors duration-150"
              >
                Scan my site →
              </Link>
              <div className="font-mono text-xs text-text-tertiary mt-3">Free · No account required</div>
            </div>
          </div>

          {/* Panel 2 — Agencies */}
          <div className="bg-background-raised p-10 hover:bg-background-interactive transition-colors duration-200 cursor-pointer">
            <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest mb-6">FOR AGENCIES</div>
            <h3 className="font-display font-bold text-2xl text-text-primary leading-snug mb-4">
              Manage client audits.
            </h3>
            <p className="font-body text-sm text-text-secondary leading-relaxed mb-8">
              Client workspaces, white-label report links, multi-page scanning, and competitor
              benchmarking per client. Show up to every call with data, not opinions.
            </p>
            <div>
              <Link
                href="/pricing"
                className="font-body text-sm text-cyan-DEFAULT border-b pb-0.5 no-underline transition-colors duration-150"
                style={{ borderColor: 'rgba(0,200,255,0.3)' }}
              >
                See agency plan →
              </Link>
              <div className="font-mono text-xs text-text-tertiary mt-3">From $149/month · 14-day free trial</div>
            </div>
          </div>

          {/* Panel 3 — Developers */}
          <div className="bg-background-raised p-10 hover:bg-background-interactive transition-colors duration-200 cursor-pointer">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-6">FOR DEVELOPERS</div>
            <h3 className="font-display font-bold text-2xl text-text-primary leading-snug mb-4">
              Build with it.
            </h3>
            <p className="font-body text-sm text-text-secondary leading-relaxed mb-8">
              POST a URL, get structured JSON back. Dynamic field selection, async mode,
              batch endpoint, webhooks. Integrate conversion intelligence into your product
              in an afternoon.
            </p>
            <div>
              <Link
                href="/signup"
                className="font-body text-sm text-text-secondary border-b border-background-border pb-0.5 no-underline hover:text-text-primary transition-colors duration-150"
              >
                Get API key →
              </Link>
              <div className="font-mono text-xs text-text-tertiary mt-3">$0.15/scan · No monthly fee</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Use Cases ─────────────────────────────────────────────────────────────────

const USE_CASES = [
  {
    tag: '01 — SAAS FOUNDERS',
    headline: 'Know why your trial page isn\'t converting.',
    body: 'POST your pricing page at 11pm. By 11:02 you have 23 ranked findings, a rewritten headline, and a benchmark showing exactly where you sit against your category.',
    detail: 'Integrate in an afternoon. The response schema is stable — build against it once.',
  },
  {
    tag: '02 — AGENCIES',
    headline: 'Show up to every client call with data.',
    body: 'Batch scan your entire client roster Sunday night. By Monday morning every client has a white-label report link. Findings in plain English. Score trending over time.',
    detail: 'Dashboard plan includes client workspaces, scheduled scans, and PDF export with your logo.',
  },
  {
    tag: '03 — DEVELOPERS',
    headline: 'Add conversion intelligence to your product.',
    body: 'Your users paste a URL. Your product returns a score, ranked findings, and AI-rewritten copy. A genuine diagnostic feature — not another integration.',
    detail: 'Dynamic field selection means you only request the fields your UI needs. Pay $0.15 per scan regardless of field count.',
  },
]

function UseCasesSection() {
  return (
    <section className="py-24 px-8 border-t border-background-border">
      <div className="max-w-[1280px] mx-auto">
        <Label>USE CASES</Label>
        <h2 className="font-display font-extrabold text-4xl tracking-tight text-text-primary mt-3 mb-12">
          What teams build with it.
        </h2>

        <div className="grid grid-cols-3 gap-px bg-background-border">
          {USE_CASES.map(uc => (
            <div
              key={uc.tag}
              className="bg-background-base p-9 hover:bg-background-raised transition-colors duration-200"
            >
              <div className="font-mono text-xs text-cyan-DEFAULT tracking-widest">{uc.tag}</div>
              <h3 className="font-display font-bold text-xl text-text-primary mt-4 leading-snug">{uc.headline}</h3>
              <p className="font-body text-sm text-text-secondary mt-3 leading-relaxed">{uc.body}</p>
              <p className="font-body text-xs text-text-tertiary mt-6 pt-4 border-t border-background-border leading-relaxed">
                {uc.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const API_FEATURES = [
  'POST /api/v1/scan',
  'POST /api/v1/scan/batch (up to 10 URLs)',
  'Async mode + webhooks',
  'Dynamic field selection',
  'Industry benchmarking included',
  '260+ conversion checks per scan',
]

const DASH_FEATURES = [
  'Everything in API',
  'Client workspaces',
  'White-label report links (no webdoc branding)',
  'Scheduled scans — weekly or monthly',
  'Score trending over time',
  'PDF export with your logo',
]

function Bullet() {
  return <span className="w-1 h-1 bg-cyan-DEFAULT flex-shrink-0 mt-1.5 inline-block" style={{ width: 4, height: 4 }} />
}

function PricingSection() {
  return (
    <section className="py-24 px-8 border-t border-background-border">
      <div className="max-w-[1280px] mx-auto">
        <Label>PRICING</Label>
        <h2 className="font-display font-extrabold text-4xl tracking-tight text-text-primary mt-3 mb-12">
          Simple. No minimums.
        </h2>

        <div className="grid grid-cols-2 gap-px bg-background-border max-w-4xl">
          {/* API plan */}
          <div className="bg-background-raised p-12">
            <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest">API ACCESS</div>
            <div className="mt-4">
              <span className="font-display font-extrabold text-6xl text-text-primary tracking-tight">$0.15</span>
              <span className="font-body text-text-tertiary text-base ml-2">/ scan</span>
            </div>
            <div className="font-body text-sm text-text-tertiary mt-2 mb-10">Pay as you go. No monthly fee. No minimum.</div>
            <ul className="list-none p-0 m-0 mb-0">
              {API_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-3 mb-3">
                  <Bullet />
                  <span className="font-body text-sm text-text-secondary">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center bg-cyan-DEFAULT text-text-inverse font-body font-bold text-sm py-3.5 mt-10 no-underline hover:opacity-90 transition-opacity duration-150"
            >
              Get API key — free to start →
            </Link>
          </div>

          {/* Dashboard plan */}
          <div className="bg-background-raised p-12 border-l-2 border-cyan-DEFAULT relative">
            <div className="absolute top-4 right-4 bg-cyan-DEFAULT text-text-inverse font-mono text-xs px-2 py-1">
              AGENCY
            </div>
            <div className="font-mono text-xs text-cyan-DEFAULT uppercase tracking-widest">DASHBOARD + API</div>
            <div className="mt-4">
              <span className="font-display font-extrabold text-6xl text-text-primary tracking-tight">$99</span>
              <span className="font-body text-text-tertiary text-base ml-2">/ month</span>
            </div>
            <div className="font-body text-sm text-text-tertiary mt-2 mb-10">50 scans included. White-label reports.</div>
            <ul className="list-none p-0 m-0 mb-0">
              {DASH_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-3 mb-3">
                  <Bullet />
                  <span className="font-body text-sm text-text-secondary">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup?plan=dashboard"
              className="block text-center bg-transparent border border-cyan-DEFAULT text-cyan-DEFAULT font-body font-bold text-sm py-3.5 mt-10 no-underline hover:bg-cyan-glow transition-colors duration-150"
            >
              Start 14-day trial →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer className="border-t border-background-border py-10 px-8">
      <div className="max-w-[1280px] mx-auto flex justify-between items-center">
        <Link href="/" className="font-display font-extrabold text-sm text-text-primary no-underline">
          webdoc<span className="text-cyan-DEFAULT">.ai</span>
        </Link>
        <div className="flex gap-7">
          {['API Docs', 'Changelog', 'Status', 'Privacy'].map(l => (
            <Link
              key={l}
              href={`/${l.toLowerCase().replace(' ', '-')}`}
              className="font-body text-xs text-text-tertiary no-underline hover:text-text-secondary transition-colors duration-150"
            >
              {l}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-background-base min-h-screen">
      <NavBar />
      <HeroSection />
      <SignalBand />
      <ResponseSection />
      <EndpointsSection />
      <ThreeDoorsSection />
      <UseCasesSection />
      <PricingSection />
      <FooterSection />
    </main>
  )
}
