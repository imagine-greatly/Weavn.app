import type { Metadata } from 'next'
import Link from 'next/link'
import SiteFooter from '@/components/landing/SiteFooter'

export const metadata: Metadata = {
  title: 'The Engine — Weavn',
  description:
    'One conversion-intelligence engine. Any renderable URL is put through 311 checks across 27 categories, scored on 7 dimensions, and returned as a structured verdict.',
  openGraph: {
    title: 'The Engine — Weavn',
    description:
      'Any renderable URL → 311 checks across 27 categories → a structured verdict scored on 7 dimensions. The shared engine behind the API and the white-label reports.',
    url: 'https://weavn.app/engine',
    siteName: 'Weavn',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Engine — Weavn',
    description:
      'Any renderable URL → 311 checks across 27 categories → a structured verdict scored on 7 dimensions.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://weavn.app/engine' },
}

// ── Design tokens (locked system — inline to match the /developers + / idiom) ──
// Purple #9D8CFF leads the page (brand primary / API accent). Steel #6F9BC6 appears
// ONLY where the agency door is referenced. Green #00C48C is success semantics only.
const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

const PANEL_INNER: React.CSSProperties = {
  background: '#06090F',
  border: '1px solid rgba(157,140,255,0.14)',
  borderRadius: 0,
  overflow: 'hidden',
}

// ── Data ──────────────────────────────────────────────────────────────────────

// The authoritative 7 dimensions — keys + human labels from lib/apiPrompt.ts.
const DIMENSIONS: { key: string; label: string; desc: string }[] = [
  {
    key: 'conversion_architecture',
    label: 'Conversion Architecture',
    desc: 'How the page structures the path from arrival to action — hero, hierarchy, and where the CTA sits in the flow.',
  },
  {
    key: 'trust_signals',
    label: 'Trust Signals',
    desc: 'Whether proof is present and credible — outcome-specific testimonials, named sources, contextualized logos, not decoration.',
  },
  {
    key: 'message_clarity',
    label: 'Message Clarity',
    desc: 'Whether a cold visitor grasps what this is and who it is for in seconds — headline, subhead, and body pulling one direction.',
  },
  {
    key: 'traffic_readiness',
    label: 'Traffic Readiness',
    desc: 'Whether the page is prepared to convert the traffic pointed at it — intent match and continuity from the click to the page.',
  },
  {
    key: 'technical_foundation',
    label: 'Technical Foundation',
    desc: 'The mechanics that gate conversion before copy matters — render, speed, and mobile behavior that quietly make or break trust.',
  },
  {
    key: 'objection_handling',
    label: 'Objection Handling',
    desc: 'Whether the page anticipates and neutralizes buyer doubt — risk reversal near the CTA, FAQs, and clear ICP fit.',
  },
  {
    key: 'offer_clarity',
    label: 'Offer Clarity',
    desc: 'Whether the offer reads as a complete unit — what it does, who it is for, what it costs, and the differentiator, stated not implied.',
  },
]

// 27 diagnostic categories — the full conversion surface, site-type gated.
const CATEGORIES: string[] = [
  'Hero Section', 'Trust & Credibility', 'CTA & Conversion', 'Messaging & Clarity',
  'Social Proof', 'SEO & Metadata', 'Navigation & UX', 'Psychology & Persuasion',
  'Page & Content Gaps', 'Offer & Pricing', 'Email & Retention', 'Product Page',
  'Mobile Experience', 'Checkout & Purchase', 'Page Speed & Technical', 'Competitive Differentiation',
  'Specificity & Claims', 'Return & Retention', 'Accessibility', 'Universal',
  'SaaS-Specific', 'E-commerce', 'Agency & Service', 'Conversion Path',
  'Narrative Flow', 'Objection Handling', 'Offer Clarity',
]

// Live-scan feed rows (processing panel) — real check/dimension names.
const SCAN_ROWS = [
  'hero_section', 'message_clarity', 'trust_signals',
  'cta_conversion', 'social_proof', 'objection_handling',
  'offer_clarity', 'mobile_experience', 'traffic_readiness',
]

// ── Shared chrome ─────────────────────────────────────────────────────────────

// Section-scale corner ticks (purple — page is purple-led).
function Ticks({ c = 'rgba(157,140,255,0.22)' }: { c?: string }) {
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: `0.5px solid ${c}`, borderLeft: `0.5px solid ${c}`, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: `0.5px solid ${c}`, borderRight: `0.5px solid ${c}`, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: `0.5px solid ${c}`, borderLeft: `0.5px solid ${c}`, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: `0.5px solid ${c}`, borderRight: `0.5px solid ${c}`, pointerEvents: 'none', zIndex: 1 }} />
    </>
  )
}

// JSON syntax helpers — keys indigo, string values neutral lavender (green reserved
// for success only), numbers purple, punctuation muted.
function K({ c }: { c: string }) { return <span style={{ color: '#8080c0' }}>&quot;{c}&quot;</span> }
function S({ c }: { c: string }) { return <span style={{ color: '#B7B4D8' }}>&quot;{c}&quot;</span> }
function N({ c }: { c: string }) { return <span style={{ color: '#9D8CFF' }}>{c}</span> }
function Muted({ c }: { c: string }) { return <span style={{ color: '#6E7587' }}>{c}</span> }

// ── What the engine does: INPUT / PROCESSING / OUTPUT (CSS-only animation) ─────

function EngineFlow() {
  return (
    <section style={{ padding: '88px 0 40px', position: 'relative', overflow: 'hidden', background: '#050810' }}>
      <style>{`
        @keyframes eng-cursor { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes eng-flow { from{left:-22%} to{left:112%} }
        @keyframes eng-json-line { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes eng-scan-row { 0%{opacity:.22} 12%{opacity:1} 64%{opacity:1} 88%{opacity:.22} 100%{opacity:.22} }
        .eng-scan-row { animation: eng-scan-row 3.6s linear infinite both; }
        @media (prefers-reduced-motion: reduce) {
          .eng-cursor{animation:none!important}
          .eng-flow-dot{display:none!important}
          .eng-json-line{animation:none!important;opacity:1!important;transform:none!important}
          .eng-scan-row{animation:none!important;opacity:1!important}
        }
      `}</style>

      {/* Three-lane ambient blooms — purple-led */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 480px 700px at 16% 70%, rgba(157,140,255,0.08) 0%, transparent 60%)',
          'radial-gradient(ellipse 480px 700px at 50% 70%, rgba(128,128,192,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 480px 700px at 84% 70%, rgba(0,196,140,0.05) 0%, transparent 60%)',
        ].join(', '),
      }} />
      <Ticks />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 16px' }}>
          WHAT THE ENGINE DOES
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
          URL in. Structured verdict out.
        </h2>
        <p style={{ ...MONO, fontSize: 12, color: '#6E7587', margin: '0 0 48px', letterSpacing: '0.04em' }}>
          One request. The page is rendered, then 311 checks fire across 27 categories. Structured JSON returns.
        </p>

        {/* Step connector row with traveling highlight */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div className="hidden sm:block" style={{ position: 'absolute', top: 15, left: '16%', right: '16%', height: 1, background: 'rgba(157,140,255,0.14)', overflow: 'hidden' }}>
            <div className="eng-flow-dot" style={{
              position: 'absolute', top: 0, height: '100%', width: '22%',
              background: 'linear-gradient(to right, transparent, rgba(157,140,255,0.6), transparent)',
              animation: 'eng-flow 2.2s linear infinite',
            }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {([
              { num: '01', label: 'INPUT', accent: '#9D8CFF', aRgba: '157,140,255' },
              { num: '02', label: 'PROCESSING', accent: '#8080c0', aRgba: '128,128,192' },
              { num: '03', label: 'OUTPUT', accent: '#00C48C', aRgba: '0,196,140' },
            ] as const).map(s => (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ ...MONO, fontSize: 12, color: s.accent, background: '#050810', border: `0.5px solid rgba(${s.aRgba},0.35)`, padding: '5px 12px', letterSpacing: '0.15em', position: 'relative', zIndex: 1 }}>
                  {s.num}
                </div>
                <div style={{ ...MONO, fontSize: 10, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7 }}>
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
            borderTop: '1px solid rgba(157,140,255,0.42)',
            borderLeft: '1px solid rgba(157,140,255,0.14)',
            borderRight: '1px solid rgba(157,140,255,0.07)',
            borderBottom: '1px solid rgba(157,140,255,0.05)',
            boxShadow: '0 0 0 1px rgba(157,140,255,0.1), 0 0 24px rgba(157,140,255,0.07)',
            minHeight: 320, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(157,140,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.15em' }}>input · any renderable url</span>
            </div>
            <div style={{ padding: '16px', flexGrow: 1, position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(157,140,255,0.25)', padding: '12px 14px', background: '#050810' }}>
                <span style={{ ...MONO, fontSize: 11, color: '#9D8CFF' }}>URL</span>
                <span style={{ ...MONO, fontSize: 12.5, color: '#B7B4D8', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>https://your-site.com</span>
                <span className="eng-cursor" style={{ display: 'inline-block', width: 7, height: 13, background: '#9D8CFF', marginLeft: 2, animation: 'eng-cursor 1s step-end infinite', flexShrink: 0 }} />
              </div>
              <p style={{ ...MONO, fontSize: 10.5, color: '#6E7587', margin: 0, lineHeight: 1.6 }}>
                Any live page the engine can render — homepage, pricing, product, landing. No tag, no SDK, no access to your code.
              </p>
            </div>
            <div style={{ padding: '0 14px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
              {[{ l: '311 checks', c: '#9D8CFF' }, { l: '27 categories', c: '#8080c0' }, { l: '7 dimensions', c: '#8080c0' }].map(x => (
                <span key={x.l} style={{ ...MONO, fontSize: 10, color: x.c, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', padding: '4px 8px' }}>{x.l}</span>
              ))}
            </div>
          </div>

          {/* Panel 02 — PROCESSING */}
          <div style={{
            background: '#0A0E18',
            borderTop: '1px solid rgba(128,128,192,0.4)',
            borderLeft: '1px solid rgba(128,128,192,0.12)',
            borderRight: '1px solid rgba(128,128,192,0.06)',
            borderBottom: '1px solid rgba(128,128,192,0.04)',
            minHeight: 320, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(128,128,192,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.15em' }}>SCANNING</span>
              <span style={{ ...MONO, fontSize: 10, color: '#9D8CFF', marginLeft: 'auto' }}>311 checks</span>
            </div>
            <div style={{ padding: '14px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {SCAN_ROWS.map((name, i) => (
                <div key={name} className="eng-scan-row" style={{ display: 'flex', alignItems: 'center', gap: 8, animationDelay: `${(i * 0.4).toFixed(1)}s` }}>
                  <span style={{ width: 5, height: 5, flexShrink: 0, display: 'inline-block', background: '#00C48C' }} />
                  <span style={{ ...MONO, fontSize: 11, color: '#9398A8' }}>{name}</span>
                </div>
              ))}
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
              {([
                { d: 0.1, indent: false, c: <Muted c="{" /> },
                { d: 0.3, indent: true, c: <><K c="score" /><Muted c=": " /><span style={{ color: '#9D8CFF' }}>61</span><Muted c="," /></> },
                { d: 0.5, indent: true, c: <><K c="verdict" /><Muted c=": " /><span style={{ color: '#EFB23E' }}>&quot;Fair&quot;</span><Muted c="," /></> },
                { d: 0.7, indent: true, c: <><K c="dimensions" /><Muted c=": { … }," /></> },
                { d: 0.9, indent: true, c: <><K c="findings" /><Muted c=": [ … ]," /></> },
                { d: 1.1, indent: true, c: <><K c="strengths" /><Muted c=": [ … ]" /></> },
                { d: 1.3, indent: false, c: <Muted c="}" /> },
              ]).map((line, i) => (
                <div key={i} className="eng-json-line" style={{ ...MONO, fontSize: 12, lineHeight: 1.9, paddingLeft: line.indent ? 16 : 0, opacity: 0, animation: `eng-json-line 0.3s ease-out ${line.d}s both` }}>
                  {line.c}
                </div>
              ))}
            </div>
            <div style={{ padding: '0 16px 14px' }}>
              <p style={{ ...MONO, fontSize: 11, color: '#404860', margin: 0 }}>7 dimension scores · ranked findings · verified strengths.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EnginePage() {
  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── 1. HERO — purple-led, corner ticks, stat row ──────────────────────── */}
      <section className="pt-24 pb-16 px-8 text-center" style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 960px 720px at 50% 38%, rgba(157,140,255,0.09) 0%, transparent 60%)' }} />
        <Ticks c="rgba(157,140,255,0.28)" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#9D8CFF', margin: '0 0 18px' }}>
            THE ENGINE
          </p>
          <h1 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1.5px', lineHeight: 1.08, color: '#E6E9EE', margin: '0 auto 22px', maxWidth: 900 }}>
            Any renderable URL becomes a structured verdict.
          </h1>
          <p style={{ ...SANS, fontSize: 17, lineHeight: 1.7, color: '#9398A8', maxWidth: 660, margin: '0 auto' }}>
            The page is rendered in full, put through 311 checks across 27 categories, scored on 7 dimensions, and returned as one structured verdict — the same engine behind the API and the white-label reports.
          </p>

          {/* Stat row — 311 checks · 27 categories · 7 dimensions (purple-led) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 64px', marginTop: 48 }}>
            {([
              { value: '311', label: 'Checks per scan', color: '#9D8CFF' },
              { value: '27', label: 'Diagnostic categories', color: '#A99BFF' },
              { value: '7', label: 'Scored dimensions', color: '#B7ABFF' },
            ] as const).map(s => (
              <div key={s.value} style={{ position: 'relative', padding: '4px 8px' }}>
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90px 70px at 50% 50%, rgba(157,140,255,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <span style={{ ...DISP, fontWeight: 700, fontSize: 48, lineHeight: 1, color: s.color }}>{s.value}</span>
                  <span style={{ ...MONO, fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587' }}>{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 2. WHAT THE ENGINE DOES — the pipeline + coverage grid ────────────── */}
      <EngineFlow />

      {/* 27-category coverage grid */}
      <section className="max-w-6xl mx-auto px-8 pb-24" style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 1000px 600px at 50% 50%, rgba(128,128,192,0.06) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginBottom: 12, paddingBottom: 8, borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            27 CATEGORIES · SITE-TYPE GATED · UNIVERSAL + VERTICAL
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <div key={cat} style={{ border: '0.5px solid rgba(128,128,192,0.28)', backgroundColor: 'rgba(128,128,192,0.05)', padding: '10px 14px', ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9398A8' }}>
                {cat}
              </div>
            ))}
          </div>
          <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '16px 0 0' }}>
            Universal checks run on every page. Vertical checks fire only when the site type calls for them — so every finding is relevant to what is actually being scanned.
          </p>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 3. THE 7 DIMENSIONS ───────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(157,140,255,0.12)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 900px 600px at 50% 0%, rgba(157,140,255,0.06) 0%, transparent 60%)' }} />
        <Ticks />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '72px 32px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 16px' }}>
            THE SEVEN DIMENSIONS
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-1px', color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1.15 }}>
            Seven dimensions. One score.
          </h2>
          <p style={{ ...SANS, fontSize: 15, lineHeight: 1.65, color: '#9398A8', maxWidth: 640, margin: '0 0 40px' }}>
            Every check maps to one of seven scored dimensions. Each is returned as a 0&ndash;100 sub-score under its exact contract key, so a verdict is never a single opaque number.
          </p>

          <div style={{ ...PANEL_INNER }}>
            {DIMENSIONS.map((d, i) => (
              <div key={d.key} style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr',
                gap: 20,
                padding: '18px 22px',
                alignItems: 'baseline',
                borderBottom: i < DIMENSIONS.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                  <span style={{ ...MONO, fontSize: 12.5, color: '#9D8CFF', letterSpacing: '0.01em', wordBreak: 'break-word' }}>{d.key}</span>
                  <span style={{ ...DISP, fontSize: 15, fontWeight: 600, color: '#E6E9EE' }}>{d.label}</span>
                </div>
                <p style={{ ...SANS, fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>{d.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '14px 0 0' }}>
            Keys are stable across every scan and every plan — build against them once.
          </p>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 4. TWO-PASS RECONCILIATION ────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(157,140,255,0.05) 0%, transparent 62%)' }} />
        <Ticks />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '72px 32px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 16px' }}>
            TWO-PASS RECONCILIATION
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-1px', color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1.15 }}>
            One pass is not trusted. So the engine runs two.
          </h2>
          <p style={{ ...SANS, fontSize: 15, lineHeight: 1.65, color: '#9398A8', maxWidth: 660, margin: '0 0 40px' }}>
            A single pass of a language model against a rubric wobbles. The engine runs the full rubric twice and reconciles the passes. Per-pass variance is about &plusmn;3 points, so the coverage score is published as a tight band rather than a false-precision number.
          </p>

          <style>{`@media (max-width: 767px){ .eng-recon-grid{ grid-template-columns:1fr !important } }`}</style>
          <div className="eng-recon-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'stretch' }}>
            {/* Pass 1 */}
            <div style={{ ...PANEL_INNER, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8080c0' }}>PASS 1</span>
              <span style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1 }}>59</span>
              <span style={{ ...SANS, fontSize: 13, lineHeight: 1.55, color: '#9398A8' }}>Full 311-check rubric, evaluated end to end. A coverage reading.</span>
            </div>
            {/* Pass 2 */}
            <div style={{ ...PANEL_INNER, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8080c0' }}>PASS 2</span>
              <span style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1 }}>62</span>
              <span style={{ ...SANS, fontSize: 13, lineHeight: 1.55, color: '#9398A8' }}>The same rubric, independently re-run. A second reading of the same page.</span>
            </div>
            {/* Reconciled band */}
            <div style={{
              background: '#0A0E18',
              borderTop: '1px solid rgba(0,196,140,0.4)',
              borderLeft: '1px solid rgba(0,196,140,0.14)',
              borderRight: '1px solid rgba(0,196,140,0.06)',
              borderBottom: '1px solid rgba(0,196,140,0.04)',
              padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', minWidth: 180,
            }}>
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#00C48C' }}>RECONCILED</span>
              <span style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1 }}>
                61 <span style={{ ...MONO, fontSize: 18, color: '#00C48C', fontWeight: 400 }}>&plusmn;3</span>
              </span>
              <span style={{ ...SANS, fontSize: 13, lineHeight: 1.55, color: '#9398A8' }}>Published as a band. Stable enough to track a page over time.</span>
            </div>
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 5. BENCHMARKING ───────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(255,255,255,0.06)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(157,140,255,0.05) 0%, transparent 62%)' }} />
        <Ticks />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '72px 32px' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            <div>
              <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 16px' }}>
                BENCHMARKING
              </p>
              <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 38px)', letterSpacing: '-0.8px', color: '#E6E9EE', margin: '0 0 16px', lineHeight: 1.15 }}>
                Scored against an industry corpus.
              </h2>
              <p style={{ ...SANS, fontSize: 15, lineHeight: 1.7, color: '#9398A8', margin: '0 0 16px' }}>
                A bare score is hard to act on. Each dimension is positioned against an industry corpus, so a reading comes back as above or below the norm for that vertical — not just a number floating in space.
              </p>
              <p style={{ ...SANS, fontSize: 15, lineHeight: 1.7, color: '#9398A8', margin: 0 }}>
                The framing is deliberately honest: benchmarks sharpen as corpus volume grows. The engine returns where a page sits relative to its vertical, not a manufactured percentile.
              </p>
            </div>

            {/* Benchmark object shape — qualitative, no fabricated corpus/percentile stats */}
            <div style={{ ...PANEL_INNER }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <span style={{ width: 5, height: 5, background: '#00C48C', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>benchmark · vs. vertical</span>
              </div>
              <div style={{ padding: '16px 20px', ...MONO, fontSize: 12, lineHeight: 1.85 }}>
                <div><Muted c="{" /></div>
                <div style={{ paddingLeft: 16 }}><K c="benchmark" /><Muted c=": {" /></div>
                <div style={{ paddingLeft: 32 }}><K c="trust_signals" /><Muted c=": {" /></div>
                <div style={{ paddingLeft: 48 }}><K c="score" /><Muted c=": " /><N c="37" /><Muted c="," /></div>
                <div style={{ paddingLeft: 48 }}><K c="vs_vertical" /><Muted c=": " /><span style={{ color: '#EFB23E' }}>&quot;below average&quot;</span></div>
                <div style={{ paddingLeft: 32 }}><Muted c="}," /></div>
                <div style={{ paddingLeft: 32 }}><K c="offer_clarity" /><Muted c=": {" /></div>
                <div style={{ paddingLeft: 48 }}><K c="score" /><Muted c=": " /><N c="58" /><Muted c="," /></div>
                <div style={{ paddingLeft: 48 }}><K c="vs_vertical" /><Muted c=": " /><S c="above average" /></div>
                <div style={{ paddingLeft: 32 }}><Muted c="}" /></div>
                <div style={{ paddingLeft: 16 }}><Muted c="}" /></div>
                <div><Muted c="}" /></div>
              </div>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', margin: 0, padding: '0 20px 14px' }}>
                Positioned against an industry corpus. Benchmarks sharpen as corpus volume grows.
              </p>
            </div>
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 6. WHY THE FULL RUBRIC IS LOAD-BEARING ────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 900px 600px at 50% 40%, rgba(157,140,255,0.05) 0%, transparent 62%)' }} />
        <Ticks />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '72px 32px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 16px' }}>
            WHY THE FULL RUBRIC
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-1px', color: '#E6E9EE', margin: '0 0 16px', lineHeight: 1.15 }}>
            The full rubric is what makes the score reproducible.
          </h2>
          <p style={{ ...SANS, fontSize: 15, lineHeight: 1.7, color: '#9398A8', maxWidth: 680, margin: '0 0 40px' }}>
            It is tempting to run a handful of checks and call it a score. But a subset drifts — the same page lands in a different band from one run to the next, and the findings point in inconsistent directions. Running the complete rubric is the whole point: it is what makes a coverage score reproducible, and reproducibility is what you can actually build on.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Partial rubric — drifts */}
            <div style={{
              background: '#0A0E18',
              borderTop: '1px solid rgba(239,178,62,0.4)',
              borderLeft: '0.5px solid rgba(239,178,62,0.12)',
              borderRight: '0.5px solid rgba(255,255,255,0.03)',
              borderBottom: '0.5px solid rgba(255,255,255,0.03)',
              padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16,
            }}>
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#EFB23E', background: 'rgba(239,178,62,0.08)', border: '0.5px solid rgba(239,178,62,0.25)', padding: '5px 10px', flexShrink: 0, whiteSpace: 'nowrap' }}>PARTIAL RUBRIC</span>
              <div>
                <p style={{ ...DISP, fontSize: 16, fontWeight: 600, color: '#E6E9EE', margin: '0 0 4px' }}>Drifts. Directionally inconsistent.</p>
                <p style={{ ...SANS, fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>A subset of checks gives a different band on re-run and disagrees with itself on what matters. You cannot track a page against a number that moves on its own.</p>
              </div>
            </div>

            {/* Full rubric — reproducible (success) */}
            <div style={{
              background: '#0A0E18',
              borderTop: '1px solid rgba(0,196,140,0.42)',
              borderLeft: '0.5px solid rgba(0,196,140,0.14)',
              borderRight: '0.5px solid rgba(0,196,140,0.06)',
              borderBottom: '0.5px solid rgba(0,196,140,0.04)',
              padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16,
            }}>
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#00C48C', background: 'rgba(0,196,140,0.08)', border: '0.5px solid rgba(0,196,140,0.25)', padding: '5px 10px', flexShrink: 0, whiteSpace: 'nowrap' }}>FULL 311-CHECK RUBRIC</span>
              <div>
                <p style={{ ...DISP, fontSize: 16, fontWeight: 600, color: '#E6E9EE', margin: '0 0 4px' }}>Reproducible. The same URL lands in the same band.</p>
                <p style={{ ...SANS, fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>Every check runs, every scan. Reconciled across two passes and published as a band, the score holds still — so a change in the score means a change in the page, not the method.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 7. THE TWO OUTPUTS + BOTH DOORS ───────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(157,140,255,0.15)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 700px 500px at 22% 50%, rgba(157,140,255,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 700px 500px at 80% 55%, rgba(111,155,198,0.06) 0%, transparent 60%)',
          ].join(', '),
        }} />
        <Ticks />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '72px 32px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 16px' }}>
            TWO OUTPUTS, ONE ENGINE
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-1px', color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1.15 }}>
            The same engine ships two ways.
          </h2>
          <p style={{ ...SANS, fontSize: 15, lineHeight: 1.65, color: '#9398A8', maxWidth: 620, margin: '0 0 40px' }}>
            Same 311 checks. Same 7 dimensions. Same reconciled score. What changes is the surface it comes out of.
          </p>

          <style>{`@media (max-width: 767px){ .eng-outputs-grid{ grid-template-columns:1fr !important } }`}</style>
          <div className="eng-outputs-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 44 }}>

            {/* Output A — structured JSON via the API (purple) */}
            <div className="wd-panel" style={{ padding: '30px 32px', borderTop: '1px solid rgba(157,140,255,0.4)', display: 'flex', flexDirection: 'column' }}>
              <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9D8CFF', margin: '0 0 12px' }}>OUTPUT · API</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 21, color: '#E6E9EE', margin: '0 0 12px' }}>Structured JSON.</h3>
              <p style={{ ...SANS, fontSize: 14, lineHeight: 1.65, color: '#9398A8', margin: '0 0 22px', flexGrow: 1 }}>
                POST a URL, get the verdict back as one structured object — score, 7 dimension sub-scores, ranked findings with on-page evidence, and drop-in copy rewrites. The shape never changes, so you build against it once.
              </p>
              <div style={{ ...MONO, fontSize: 12, color: '#6E7587', marginBottom: 22 }}>
                <span style={{ color: '#9D8CFF' }}>POST</span> /api/v1/scan
              </div>
              <Link href="/developers" style={{ ...MONO, fontSize: 12, letterSpacing: '0.04em', color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '11px 20px', textDecoration: 'none', display: 'inline-block', background: 'transparent' }}>
                Read the v1 contract →
              </Link>
            </div>

            {/* Output B — white-label report via the dashboard (steel = agency door) */}
            <div className="wd-panel" style={{ padding: '30px 32px', borderTop: '1px solid rgba(111,155,198,0.4)', display: 'flex', flexDirection: 'column' }}>
              <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', margin: '0 0 12px' }}>OUTPUT · DASHBOARD</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 21, color: '#E6E9EE', margin: '0 0 12px' }}>A white-label scored report.</h3>
              <p style={{ ...SANS, fontSize: 14, lineHeight: 1.65, color: '#9398A8', margin: '0 0 22px', flexGrow: 1 }}>
                The same verdict, rendered as a client-ready report — the score, what is working, the ranked fixes, and how the page benchmarks. Branded as yours, no code required. This is the door agencies use.
              </p>
              <div style={{ ...MONO, fontSize: 12, color: '#6E7587', marginBottom: 22 }}>
                <span style={{ color: '#6F9BC6' }}>report</span> · white-label · no code
              </div>
              <Link href="/agencies" style={{ ...MONO, fontSize: 12, letterSpacing: '0.04em', color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '11px 20px', textDecoration: 'none', display: 'inline-block', background: 'transparent' }}>
                White-label reports for agencies →
              </Link>
            </div>
          </div>

          {/* Both doors — closing band */}
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 32, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            <Link href="/developers" style={{ ...MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9D8CFF', background: 'rgba(157,140,255,0.1)', border: '1px solid rgba(157,140,255,0.5)', padding: '13px 26px', textDecoration: 'none', display: 'inline-block' }}>
              Read the v1 contract →
            </Link>
            <Link href="/agencies" style={{ ...MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6F9BC6', background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', padding: '13px 26px', textDecoration: 'none', display: 'inline-block' }}>
              White-label reports for agencies →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
