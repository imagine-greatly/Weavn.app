'use client'

import Link from 'next/link'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Stat } from '@/components/ui/Stat'
import { ScoreRing } from '@/components/ui/ScoreRing'

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
    title: '307 checks, correctly applied',
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
      'Findings are sorted by priority_rank (P1 fix this week, P2 fix this month, P3 when you can), each with fix_effort and impact_tier. Strengths surface what\'s working. The full response is a complete conversion diagnostic in one structured JSON object.',
    code: '{\n  "findings_summary": {\n    "p1_count": 3,\n    "p2_count": 8,\n    "p3_count": 12\n  },\n  "strengths": [...],\n  "findings": [...]\n}',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductPage() {
  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── 1. Hero — transparent, grid-exposed ──────────────────────────────── */}
      <section className="pt-24 pb-16 px-8 text-center">
        <div className="section-label mb-4">ENGINE</div>
        <h1
          className="section-headline mb-6 mx-auto"
          style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1.5px', maxWidth: 900 }}
        >
          307 checks. One response.
        </h1>
        <p className="section-subhead max-w-2xl mx-auto">
          webdoc is a conversion audit API. POST any URL, get structured JSON in under 90 seconds.
          Every scan runs 307 diagnostic checks across 27 categories, classified by site type, scored
          against a corpus of real sites.
        </p>
        {/* Stat row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 64px', marginTop: 48 }}>
          <Stat value="307" label="Checks per scan" verdict="neutral" />
          <Stat value="27" label="Diagnostic categories" verdict="neutral" />
          <Stat value="7" label="Scoring dimensions" verdict="neutral" />
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 2. Diagnostic Coverage — transparent + purple bloom ──────────────── */}
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
                <Stat value="307" label="TOTAL CHECKS" verdict="neutral" />
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
            background: 'radial-gradient(ellipse 800px 1200px at 15% 50%, rgba(111,155,198,0.06) 0%, transparent 60%)',
          }}
        />
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

      {/* ── 4. Output — #050810 + steel-blue bloom + instrument framing ─────── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#050810',
        borderTop: '0.5px solid rgba(111,155,198,0.15)',
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
      }}>
        {/* Ambient steel-blue bloom */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 1100px 600px at 50% 50%, rgba(111,155,198,0.07) 0%, transparent 65%)',
            'radial-gradient(ellipse 700px 350px at 50% 0%, rgba(111,155,198,0.04) 0%, transparent 55%)',
          ].join(', '),
        }} />
        {/* Corner ticks — instrument framing */}
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '56rem', margin: '0 auto', padding: '80px 32px' }}>
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 14px' }}>
            RESPONSE SCHEMA
          </p>
          <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px', color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1.15 }}>
            One response object.
          </h2>
          <div aria-hidden style={{ height: '0.5px', background: 'linear-gradient(to right, rgba(111,155,198,0.35), transparent)', maxWidth: 320, marginBottom: 48 }} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 61 — WEIGHTED SCORE — RED (< 70 = critical) */}
            <div style={{
              background: '#0A0E18',
              borderTop: '1px solid rgba(232,99,95,0.35)',
              borderLeft: '1px solid rgba(232,99,95,0.12)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              boxShadow: '0 0 28px rgba(232,99,95,0.05)',
              padding: 24, position: 'relative', overflow: 'hidden',
            }}>
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '35%', height: '0.5px', background: 'rgba(111,155,198,0.08)' }} />
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '0.5px', height: '35%', background: 'rgba(111,155,198,0.08)' }} />
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 52, lineHeight: 1, color: '#E8635F', display: 'block' }}>61</span>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587', marginTop: 6, display: 'block' }}>WEIGHTED OVERALL SCORE</span>
              </div>
              <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13, lineHeight: 1.65, color: '#9398A8', margin: '0 0 12px' }}>
                0–100. Calibrated to site type and buyer complexity. Benchmarked against corpus.
              </p>
              <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#E8635F', margin: 0 }}>CRITICAL · score &lt; 70</p>
            </div>

            {/* 23 — RANKED FINDINGS — STEEL BLUE */}
            <div style={{
              background: '#0A0E18',
              borderTop: '1px solid rgba(111,155,198,0.3)',
              borderLeft: '1px solid rgba(111,155,198,0.1)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              boxShadow: '0 0 28px rgba(111,155,198,0.04)',
              padding: 24, position: 'relative', overflow: 'hidden',
            }}>
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '35%', height: '0.5px', background: 'rgba(111,155,198,0.08)' }} />
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '0.5px', height: '35%', background: 'rgba(111,155,198,0.08)' }} />
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 52, lineHeight: 1, color: '#6F9BC6', display: 'block' }}>23</span>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587', marginTop: 6, display: 'block' }}>RANKED FINDINGS</span>
              </div>
              <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13, lineHeight: 1.65, color: '#9398A8', margin: '0 0 12px' }}>
                Sorted P1→P3. Each with severity, fix_effort, impact_tier, and specific evidence from the page.
              </p>
              <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6', margin: 0 }}>P1→P3 · priority ranked</p>
            </div>

            {/* 5 — VERIFIED STRENGTHS — SUCCESS GREEN */}
            <div style={{
              background: '#0A0E18',
              borderTop: '1px solid rgba(0,196,140,0.3)',
              borderLeft: '1px solid rgba(0,196,140,0.1)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              boxShadow: '0 0 28px rgba(0,196,140,0.04)',
              padding: 24, position: 'relative', overflow: 'hidden',
            }}>
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '35%', height: '0.5px', background: 'rgba(111,155,198,0.08)' }} />
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '0.5px', height: '35%', background: 'rgba(111,155,198,0.08)' }} />
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 52, lineHeight: 1, color: '#00C48C', display: 'block' }}>5</span>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587', marginTop: 6, display: 'block' }}>VERIFIED STRENGTHS</span>
              </div>
              <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13, lineHeight: 1.65, color: '#9398A8', margin: '0 0 12px' }}>
                What&apos;s genuinely working above average. Referenced against specific visible content — never padded.
              </p>
              <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C', margin: 0 }}>above average · evidence-referenced</p>
            </div>

            {/* 7 — DIMENSION BENCHMARKS — STEEL BLUE */}
            <div style={{
              background: '#0A0E18',
              borderTop: '1px solid rgba(111,155,198,0.3)',
              borderLeft: '1px solid rgba(111,155,198,0.1)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              boxShadow: '0 0 28px rgba(111,155,198,0.04)',
              padding: 24, position: 'relative', overflow: 'hidden',
            }}>
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '35%', height: '0.5px', background: 'rgba(111,155,198,0.08)' }} />
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '0.5px', height: '35%', background: 'rgba(111,155,198,0.08)' }} />
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 52, lineHeight: 1, color: '#6F9BC6', display: 'block' }}>7</span>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587', marginTop: 6, display: 'block' }}>DIMENSION BENCHMARKS</span>
              </div>
              <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13, lineHeight: 1.65, color: '#9398A8', margin: '0 0 12px' }}>
                Every dimension score positioned against industry average and percentile for your site&apos;s vertical.
              </p>
              <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6', margin: 0 }}>percentile-ranked · by vertical</p>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 5. Three Audiences — #050810 + convergence + three-lane beams ─────── */}
      <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden', background: '#050810' }}>

        <style>{`
          @keyframes prod-beamFlow {
            from { stroke-dashoffset: 13; }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes prod-coreNodeGlow {
            0%, 100% { box-shadow: 0 0 0 1px rgba(111,155,198,0.2), 0 0 14px rgba(111,155,198,0.12), 0 0 40px rgba(111,155,198,0.05); }
            50%       { box-shadow: 0 0 0 1px rgba(111,155,198,0.35), 0 0 22px rgba(111,155,198,0.25), 0 0 56px rgba(111,155,198,0.10); }
          }
          @media (max-width: 639px) {
            .prod-convergence { display: none !important; }
          }
          @media (prefers-reduced-motion: reduce) {
            .prod-beam { animation: none !important; }
            .prod-core-node { animation: none !important; }
          }
        `}</style>

        {/* Three-lane ambient blooms + engine bloom */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 500px 700px at 18% 75%, rgba(0,200,255,0.06) 0%, transparent 60%)',
            'radial-gradient(ellipse 500px 700px at 50% 75%, rgba(157,140,255,0.05) 0%, transparent 60%)',
            'radial-gradient(ellipse 500px 700px at 82% 75%, rgba(0,196,140,0.05) 0%, transparent 60%)',
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
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
            ACCESS
          </p>
          <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
            One engine. Three access points.
          </h2>
          <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 40px' }}>
            Whether you&apos;re diagnosing your own site, managing client audits, or building conversion intelligence into a product — it&apos;s the same engine underneath.
          </p>

          {/* Engine convergence — core node + three beams */}
          <div className="prod-convergence" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Core node */}
            <div style={{ position: 'relative', marginBottom: 0 }}>
              <div aria-hidden style={{ position: 'absolute', top: -5, left: -5, width: 9, height: 9, borderTop: '0.5px solid rgba(111,155,198,0.6)', borderLeft: '0.5px solid rgba(111,155,198,0.6)' }} />
              <div aria-hidden style={{ position: 'absolute', top: -5, right: -5, width: 9, height: 9, borderTop: '0.5px solid rgba(111,155,198,0.6)', borderRight: '0.5px solid rgba(111,155,198,0.6)' }} />
              <div aria-hidden style={{ position: 'absolute', bottom: -5, left: -5, width: 9, height: 9, borderBottom: '0.5px solid rgba(111,155,198,0.6)', borderLeft: '0.5px solid rgba(111,155,198,0.6)' }} />
              <div aria-hidden style={{ position: 'absolute', bottom: -5, right: -5, width: 9, height: 9, borderBottom: '0.5px solid rgba(111,155,198,0.6)', borderRight: '0.5px solid rgba(111,155,198,0.6)' }} />
              <div className="prod-core-node" style={{
                width: 52, height: 52,
                background: '#0A0E18',
                border: '0.5px solid rgba(111,155,198,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                animation: 'prod-coreNodeGlow 3.2s ease-in-out infinite',
              }}>
                <div aria-hidden style={{ position: 'absolute', width: '100%', height: '0.5px', background: 'rgba(111,155,198,0.18)' }} />
                <div aria-hidden style={{ position: 'absolute', width: '0.5px', height: '100%', background: 'rgba(111,155,198,0.18)' }} />
                <div style={{ width: 7, height: 7, background: '#6F9BC6', position: 'relative', zIndex: 1 }} />
              </div>
            </div>

            <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(111,155,198,0.45)', margin: '7px 0 0' }}>
              SCAN ENGINE
            </p>

            {/* Three beams */}
            <svg className="prod-beams" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="52" aria-hidden style={{ display: 'block', overflow: 'visible', marginTop: 4 }}>
              <line className="prod-beam" x1="50" y1="0" x2="16" y2="100" stroke="rgba(0,200,255,0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" pathLength="100" strokeDasharray="8 5" style={{ animation: 'prod-beamFlow 1.8s linear infinite' }} />
              <line className="prod-beam" x1="50" y1="0" x2="50" y2="100" stroke="rgba(157,140,255,0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" pathLength="100" strokeDasharray="8 5" style={{ animation: 'prod-beamFlow 1.8s linear infinite', animationDelay: '0.35s' }} />
              <line className="prod-beam" x1="50" y1="0" x2="84" y2="100" stroke="rgba(0,196,140,0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" pathLength="100" strokeDasharray="8 5" style={{ animation: 'prod-beamFlow 1.8s linear infinite', animationDelay: '0.7s' }} />
            </svg>

          </div>

          {/* Three equal-weight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ alignItems: 'stretch' }}>

            {/* Founders / cyan */}
            <div className="wd-panel" style={{
              display: 'flex', flexDirection: 'column',
              borderTop: '1px solid rgba(0,200,255,0.3)',
              borderLeft: '1px solid rgba(0,200,255,0.12)',
              boxShadow: '0 0 0 1px rgba(0,200,255,0.1), 0 0 28px rgba(0,200,255,0.07)',
            }}>
              <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#00C8FF', margin: '0 0 10px' }}>For founders</p>
                <h3 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Diagnose your site.</h3>
                <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                  Paste your URL. Get a full conversion audit in 90 seconds — score, ranked findings, strengths, and how you compare against your category. Free to start.
                </p>
              </div>
              <div style={{ padding: '20px 24px', background: 'rgba(0,200,255,0.02)', flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <ScoreRing score={61} size="md" animate={true} label="CONVERSION SCORE" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center' }}>
                  <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, margin: 0 }}>
                    <span style={{ color: '#6E7587' }}>critical: </span>
                    <span style={{ color: '#E8635F' }}>hero headline is feature-led</span>
                  </p>
                  <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, margin: 0 }}>
                    <span style={{ color: '#6E7587' }}>lift: </span>
                    <span style={{ color: '#00C48C' }}>+12–18% with rewrite</span>
                  </p>
                </div>
              </div>
              <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                <Link href="/scan" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(111,155,198,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Scan my site free →
                </Link>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>Free · No account required</p>
              </div>
            </div>

            {/* Agencies / purple */}
            <div className="wd-panel" style={{
              display: 'flex', flexDirection: 'column',
              borderTop: '1px solid rgba(157,140,255,0.3)',
              borderLeft: '1px solid rgba(157,140,255,0.12)',
              boxShadow: '0 0 0 1px rgba(157,140,255,0.1), 0 0 28px rgba(157,140,255,0.08)',
            }}>
              <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#9D8CFF', margin: '0 0 10px' }}>For agencies</p>
                <h3 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Manage client audits.</h3>
                <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                  Client workspaces, white-label report links, multi-page scanning. Show up to every call with data, not opinions.
                </p>
              </div>
              <div style={{ padding: '20px 24px', background: 'rgba(157,140,255,0.025)', flexGrow: 1 }}>
                <div style={{ background: '#050810', border: '0.5px solid rgba(157,140,255,0.18)', padding: '12px 14px', boxShadow: '0 0 16px rgba(157,140,255,0.06)' }}>
                  <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6E7587', margin: '0 0 3px' }}>PREPARED FOR</p>
                  <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500, fontSize: 14, color: '#E6E9EE', margin: '0 0 10px' }}>Acme Inc.</p>
                  <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                    {[
                      { k: 'score', v: '61', vc: '#E8635F' },
                      { k: 'findings', v: '23', vc: '#6F9BC6' },
                    ].map(r => (
                      <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6E7587' }}>{r.k}</span>
                        <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500, fontSize: 13, color: r.vc }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                <Link href="/pricing" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(111,155,198,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  See agency plans →
                </Link>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>From $149/mo · 14-day trial</p>
              </div>
            </div>

            {/* Developers / green */}
            <div className="wd-panel" style={{
              display: 'flex', flexDirection: 'column',
              borderTop: '1px solid rgba(0,196,140,0.28)',
              borderLeft: '1px solid rgba(0,196,140,0.1)',
              boxShadow: '0 0 0 1px rgba(0,196,140,0.1), 0 0 28px rgba(0,196,140,0.07)',
            }}>
              <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#00C48C', margin: '0 0 10px' }}>For developers</p>
                <h3 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Build with it.</h3>
                <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                  POST a URL, get structured JSON. Batch endpoint, async mode, webhooks. Integrate conversion intelligence into your product in an afternoon.
                </p>
              </div>
              <div style={{ padding: '20px 24px', background: 'rgba(0,196,140,0.02)', flexGrow: 1 }}>
                <div style={{ background: '#050810', border: '0.5px solid rgba(0,196,140,0.14)', padding: '12px 14px', boxShadow: '0 0 16px rgba(0,196,140,0.05)' }}>
                  <pre style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, lineHeight: 1.7, margin: 0, overflow: 'hidden', color: '#9398A8' }}>
                    {'{'}{'\n'}
                    {'  '}<span style={{ color: '#8080c0' }}>&quot;score&quot;</span>{': '}<span style={{ color: '#E8635F' }}>61</span>{','}{'\n'}
                    {'  '}<span style={{ color: '#6F9BC6' }}>&quot;severity&quot;</span>{': '}<span style={{ color: '#E8635F' }}>&quot;critical&quot;</span>{','}{'\n'}
                    {'  '}<span style={{ color: '#8080c0' }}>&quot;findings&quot;</span>{': '}<span style={{ color: '#6F9BC6' }}>23</span>{'\n'}
                    {'}'}
                  </pre>
                </div>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6E7587', margin: '10px 0 0' }}>full schema · 307 checks · $0.15/scan</p>
              </div>
              <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                <Link href="/developers" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#E6E9EE', border: '0.5px solid rgba(111,155,198,0.35)', padding: '10px 14px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Get API key →
                </Link>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#6E7587', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>$0.15/scan · No monthly fee</p>
              </div>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 6. Final CTA — #050810 + steel-blue bloom + instrument framing ─────── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '96px 0',
        background: '#050810',
        borderTop: '0.5px solid rgba(111,155,198,0.25)',
      }}>
        <style>{`
          @keyframes prod-scan-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(111,155,198,0.3); }
            50%       { box-shadow: 0 0 0 8px rgba(111,155,198,0); }
          }
          .prod-scan-btn { animation: prod-scan-pulse 2.5s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .prod-scan-btn { animation: none; } }
        `}</style>

        {/* Ambient bloom */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 1100px 600px at 50% 95%, rgba(111,155,198,0.07) 0%, transparent 65%)',
            'radial-gradient(ellipse 700px 350px at 50% 5%,  rgba(111,155,198,0.03) 0%, transparent 60%)',
          ].join(', '),
        }} />

        {/* Corner ticks */}
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '0 48px', textAlign: 'center' }}>

          {/* Wordmark presence */}
          <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1 }}>
            webdoc<span style={{ color: '#6F9BC6' }}>.ai</span>
          </p>
          <div aria-hidden style={{ height: '0.5px', background: 'linear-gradient(to right, transparent, rgba(111,155,198,0.3), transparent)', maxWidth: 240, margin: '0 auto 44px' }} />

          {/* Mono kicker */}
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 16px' }}>
            RUN A DIAGNOSTIC
          </p>

          <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
            See it run on your site.
          </h2>

          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#6E7587', lineHeight: 2, margin: '0 0 36px' }}>
            Free scan · no account required · results in 90 seconds.
          </p>

          {/* Status bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            padding: '8px 14px', marginBottom: 10, flexWrap: 'wrap', textAlign: 'left',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C48C', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: '#9398A8' }}>api.webdocai.com</span>
            <span style={{ color: '#6E7587' }}>·</span>
            <span style={{ color: '#6F9BC6' }}>POST /v1/scan</span>
            <span style={{ color: '#6E7587' }}>·</span>
            <span style={{ color: '#6F9BC6' }}>→ 200 OK</span>
          </div>

          {/* Field label */}
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6E7587', textAlign: 'left', margin: '0 0 5px' }}>
            POST /api/v1/scan
          </p>

          {/* Scan input — terminal motif */}
          <div style={{
            display: 'flex',
            background: '#0A0E18',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            marginBottom: 8, textAlign: 'left',
          }}>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#6E7587', padding: '0 12px', display: 'flex', alignItems: 'center', flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,0.08)' }}>
              https://
            </span>
            <input
              type="text"
              placeholder="your-site.com"
              readOnly
              onClick={() => { window.location.href = '/scan' }}
              style={{ flex: 1, background: 'transparent', fontFamily: '"IBM Plex Mono", monospace', fontSize: 14, color: '#E6E9EE', padding: '13px 14px', border: 'none', outline: 'none', cursor: 'pointer' }}
            />
          </div>

          {/* SCAN button — steel blue, full-width, mono label */}
          <Link
            href="/scan"
            className="prod-scan-btn"
            style={{
              display: 'block',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              background: '#6F9BC6',
              color: '#050810',
              padding: '14px 0',
              textDecoration: 'none',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            SCAN MY SITE →
          </Link>

          {/* Example response */}
          <div style={{
            background: '#0A0E18',
            borderTop: '1px solid rgba(111,155,198,0.18)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            padding: '12px 16px',
            marginBottom: 20,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: 1.5 }}>EXAMPLE RESPONSE</span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#00C48C' }}>200 OK</span>
            </div>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, lineHeight: 1.7 }}>
              <span style={{ color: '#8080C0' }}>score</span>
              <span style={{ color: '#6E7587' }}>: </span>
              <span style={{ color: '#E8635F' }}>61</span>
              <span style={{ color: '#6E7587' }}> · </span>
              <span style={{ color: '#8080C0' }}>findings</span>
              <span style={{ color: '#6E7587' }}>: </span>
              <span style={{ color: '#6F9BC6' }}>23</span>
              <span style={{ color: '#6E7587' }}> · </span>
              <span style={{ color: '#8080C0' }}>industry</span>
              <span style={{ color: '#6E7587' }}>: </span>
              <span style={{ color: '#6F9BC6' }}>&quot;saas&quot;</span>
              <span style={{ color: '#6E7587' }}> · </span>
              <span style={{ color: '#8080C0' }}>cost_usd</span>
              <span style={{ color: '#6E7587' }}>: </span>
              <span style={{ color: '#9398A8' }}>0.15</span>
            </div>
          </div>

        </div>
      </section>

    </main>
  )
}
