import type { Metadata } from 'next'
import Link from 'next/link'
import HomeScanInput from '@/components/landing/HomeScanInput'
import SiteFooter from '@/components/landing/SiteFooter'
import { DASHBOARD_PLANS } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Weavn — One conversion-intelligence engine, shipped two ways',
  description:
    'One engine. 311 checks across 27 categories, 7 scored dimensions. Ship it as an API for your platform, or as white-label scored reports for your agency.',
  openGraph: {
    title: 'Weavn — One engine, two ways to ship it',
    description: 'Conversion intelligence as an API, or white-label reports for agencies. 311 checks · 27 categories · 7 dimensions.',
    url: 'https://weavn.app',
    siteName: 'Weavn',
    type: 'website',
    images: [{ url: 'https://weavn.app/og/home.png', width: 1200, height: 630, alt: 'Weavn — one engine, two ways to ship it' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weavn — One engine, two ways to ship it',
    description: 'Conversion intelligence as an API, or white-label reports for agencies. 311 · 27 · 7.',
    images: ['https://weavn.app/og/home.png'],
    creator: '@weavnapp',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://weavn.app' },
}

// ── Locked design tokens (inline, matching the site idiom) ────────────────────
const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

const PURPLE = '#9D8CFF' // API + brand primary
const STEEL = '#6F9BC6'  // agency track only
const AMBER = '#EFB23E'  // 61 → Fair band (verdict is semantic, never themed by accent)
const RED = '#E8635F'

// ── The ONE sample scan — rendered two ways in the hero. Same scan_id, domain,
// score, verdict, and top finding on both sides. Real v1 contract fields only. ──
const SCAN = {
  scan_id: 'sc_a8d3f2c1',
  url: 'https://acme-analytics.com',
  domain: 'acme-analytics.com',
  score: 61,
  verdict: 'Fair',
  findings_summary: 23,
  topFinding: {
    title: 'Hero headline is feature-led, not outcome-led',
    severity: 'critical',
    dimension: 'Message Clarity',
    impact_estimate: '+12–18% conversion lift',
    rewritten_copy: 'See revenue impact in one dashboard.',
    priority: 1,
  },
}

// Corner-bracket marks; expects a position:relative parent.
function Brackets({ c = 'rgba(157,140,255,0.45)' }: { c?: string }) {
  const b = `1px solid ${c}`
  const s = 11
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: 6, left: 6, width: s, height: s, borderTop: b, borderLeft: b, pointerEvents: 'none', zIndex: 2 }} />
      <div aria-hidden style={{ position: 'absolute', top: 6, right: 6, width: s, height: s, borderTop: b, borderRight: b, pointerEvents: 'none', zIndex: 2 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 6, left: 6, width: s, height: s, borderBottom: b, borderLeft: b, pointerEvents: 'none', zIndex: 2 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 6, right: 6, width: s, height: s, borderBottom: b, borderRight: b, pointerEvents: 'none', zIndex: 2 }} />
    </>
  )
}

// JSON syntax-color helpers (match /developers)
function K({ c }: { c: string }) { return <span style={{ color: '#8080c0' }}>&quot;{c}&quot;</span> }
function S({ c }: { c: string }) { return <span style={{ color: '#00C48C' }}>&quot;{c}&quot;</span> }
function N({ c }: { c: string }) { return <span style={{ color: STEEL }}>{c}</span> }
function Muted({ c }: { c: string }) { return <span style={{ color: '#6E7587' }}>{c}</span> }

// Static score dial (inline SVG — no client dependency).
function ScoreDial({ score, color }: { score: number; color: string }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const off = circ * (1 - score / 100)
  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width={96} height={96} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...DISP, fontWeight: 700, fontSize: 26, color: '#E6E9EE', lineHeight: 1 }}>{score}</span>
        <span style={{ ...MONO, fontSize: 8.5, letterSpacing: '0.14em', color: '#6E7587', marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

function Dot({ c }: { c: string }) {
  return <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />
}

// ── 1. HERO — THE DUALITY ─────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '72px 32px 56px' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 900px 640px at 32% 26%, rgba(157,140,255,0.10) 0%, transparent 60%)',
          'radial-gradient(ellipse 760px 560px at 78% 60%, rgba(111,155,198,0.08) 0%, transparent 62%)',
        ].join(', '),
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#9398A8', margin: '0 0 20px' }}>
          CONVERSION INTELLIGENCE ENGINE
        </p>
        <h1 style={{ ...DISP, fontSize: 'clamp(34px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.04em', color: '#E6E9EE', margin: '0 0 18px', lineHeight: 1.03, maxWidth: 900 }}>
          One engine. 311 checks. Two ways to ship it.
        </h1>
        <p style={{ ...SANS, fontSize: 18, lineHeight: 1.6, color: '#9398A8', maxWidth: 620, margin: '0 0 28px' }}>
          Conversion intelligence &mdash; as an API for your platform, or white-label reports for your agency.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 44 }}>
          <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: PURPLE, background: 'rgba(157,140,255,0.1)', border: `1px solid rgba(157,140,255,0.55)`, padding: '13px 26px', textDecoration: 'none' }}>
            Get API key →
          </Link>
          <Link href="/agencies" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: STEEL, background: 'transparent', border: `1px solid rgba(111,155,198,0.5)`, padding: '13px 26px', textDecoration: 'none' }}>
            For agencies →
          </Link>
        </div>

        {/* The duality — same scan, two renderings */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* LEFT — the API: raw v1 JSON (purple-tinted) */}
          <div style={{ position: 'relative', background: '#080D18', padding: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid rgba(157,140,255,0.16)' }}>
              <span style={{ ...MONO, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: PURPLE }}>API · response.json</span>
              <span style={{ ...MONO, fontSize: 10.5, color: '#00C48C' }}>200 OK</span>
            </div>
            <pre style={{ ...MONO, fontSize: 12, lineHeight: 1.85, margin: 0, padding: '18px 18px 20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#9398A8' }}>
<Muted c="{" />{'\n  '}
<K c="scan_id" /><Muted c=": " /><S c="sc_a8d3f2c1" /><Muted c="," />{'\n  '}
<K c="url" /><Muted c=": " /><S c="https://acme-analytics.com" /><Muted c="," />{'\n  '}
<K c="score" /><Muted c=": " /><span style={{ color: AMBER }}>61</span><Muted c="," />{'\n  '}
<K c="verdict" /><Muted c=": " /><span style={{ color: AMBER }}>&quot;Fair&quot;</span><Muted c="," />{'\n  '}
<K c="dimensions" /><Muted c=": {" />{'\n    '}
<K c="conversion_architecture" /><Muted c=": " /><N c="58" /><Muted c="," />{'\n    '}
<K c="message_clarity" /><Muted c=": " /><N c="42" /><Muted c="," />{'  '}<Muted c="// 7 dimensions" />{'\n  '}
<Muted c="}," />{'\n  '}
<K c="findings_summary" /><Muted c=": " /><N c="23" /><Muted c="," />{'\n  '}
<K c="findings" /><Muted c=": [{" />{'\n    '}
<K c="title" /><Muted c=": " /><span style={{ color: '#E6E9EE' }}>&quot;Hero headline is feature-led, not outcome-led&quot;</span><Muted c="," />{'\n    '}
<K c="severity" /><Muted c=": " /><span style={{ color: RED }}>&quot;critical&quot;</span><Muted c="," />{'\n    '}
<K c="dimension" /><Muted c=": " /><S c="Message Clarity" /><Muted c="," />{'\n    '}
<K c="impact_estimate" /><Muted c=": " /><S c="+12–18% conversion lift" /><Muted c="," />{'\n    '}
<K c="rewritten_copy" /><Muted c=": " /><span style={{ color: '#00C48C' }}>&quot;See revenue impact in one dashboard.&quot;</span><Muted c="," />{'\n    '}
<K c="priority" /><Muted c=": " /><N c="1" />{'\n  '}
<Muted c="}]" />{'  '}<Muted c="// …22 more, ranked" />{'\n'}
<Muted c="}" />
            </pre>
          </div>

          {/* RIGHT — the agency: same scan as a white-label report (steel-tinted) */}
          <div style={{ position: 'relative', background: '#0A0F16', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `0.5px solid rgba(111,155,198,0.18)` }}>
              <span style={{ ...MONO, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: STEEL }}>Dashboard · white-label report</span>
              <span style={{ ...MONO, fontSize: 10.5, color: '#6E7587' }}>PDF-ready</span>
            </div>
            <div style={{ padding: '20px 20px 22px' }}>
              {/* YOUR LOGO slot + confidential tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ ...MONO, fontSize: 10, letterSpacing: '0.16em', color: STEEL, border: `1px dashed rgba(111,155,198,0.5)`, padding: '8px 14px' }}>YOUR LOGO</span>
                <span style={{ ...MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6E7587' }}>Confidential</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
                <ScoreDial score={SCAN.score} color={AMBER} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: AMBER, margin: '0 0 6px' }}>Verdict · Fair</p>
                  <p style={{ ...DISP, fontWeight: 700, fontSize: 18, color: '#E6E9EE', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{SCAN.domain}</p>
                  <p style={{ ...MONO, fontSize: 10.5, color: '#6E7587', margin: 0 }}>23 findings · 27 categories scored</p>
                </div>
              </div>
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { t: 'Hero headline is feature-led, not outcome-led', c: RED, tag: 'CRITICAL' },
                  { t: 'No risk-reversal near the primary CTA', c: AMBER, tag: 'HIGH' },
                  { t: 'Testimonials lack named roles and outcomes', c: '#6E7587', tag: 'MED' },
                ].map((f) => (
                  <div key={f.t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Dot c={f.c} />
                    <span style={{ ...SANS, fontSize: 13, color: '#C7CBD4', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.t}</span>
                    <span style={{ ...MONO, fontSize: 9, letterSpacing: '0.1em', color: f.c }}>{f.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p style={{ ...MONO, fontSize: 10.5, color: '#6E7587', margin: '12px 0 0', letterSpacing: '0.02em' }}>
          ↑ One scan of <span style={{ color: '#9398A8' }}>acme-analytics.com</span> &mdash; score <span style={{ color: AMBER }}>61</span>, same findings &mdash; rendered as JSON for the API and as a white-label report for the dashboard.
        </p>
      </div>
    </section>
  )
}

// ── 2. DEPTH STRIP ─────────────────────────────────────────────────────────────
function DepthStrip() {
  const items = ['311 checks', '27 categories', '7 dimensions', 'industry-benchmarked', '60–120s per scan']
  return (
    <section style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#070B14' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '16px 32px', display: 'flex', flexWrap: 'wrap', gap: '8px 22px', alignItems: 'center', justifyContent: 'center' }}>
        {items.map((it, i) => (
          <span key={it} style={{ ...MONO, fontSize: 11.5, letterSpacing: '0.04em', color: '#9398A8', display: 'inline-flex', alignItems: 'center', gap: 22 }}>
            {i > 0 && <span aria-hidden style={{ color: '#3A4252' }}>·</span>}
            {it}
          </span>
        ))}
      </div>
    </section>
  )
}

// ── 3. SCAN ANY URL RIGHT NOW ──────────────────────────────────────────────────
function LiveScanSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '64px 32px 68px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9398A8', margin: '0 0 16px' }}>SCAN ANY URL — RIGHT NOW</p>
        <h2 style={{ ...DISP, fontSize: 'clamp(24px, 3.4vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#E6E9EE', margin: '0 0 14px', lineHeight: 1.12 }}>
          Point it at a real site. Watch the real engine run.
        </h2>
        <p style={{ ...SANS, fontSize: 15, lineHeight: 1.65, color: '#9398A8', maxWidth: 620, margin: '0 0 28px' }}>
          The same 311-check scan the API and the dashboard run &mdash; no sandbox, no canned result.
        </p>
        <HomeScanInput />
      </div>
    </section>
  )
}

// ── 4. TWO DOORS ───────────────────────────────────────────────────────────────
function TwoDoorsSection() {
  const agencyPrice = DASHBOARD_PLANS.agency.priceMonthlyUsd ?? 249
  return (
    <section style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 32px 72px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
          {/* PLATFORMS & DEVELOPERS — purple */}
          <div style={{ position: 'relative', background: '#080D18', border: `1px solid rgba(157,140,255,0.22)`, padding: '32px 30px', display: 'flex', flexDirection: 'column' }}>
            <Brackets />
            <p style={{ ...MONO, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: PURPLE, margin: '0 0 16px' }}>Platforms &amp; developers</p>
            <p style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 18px', lineHeight: 1.2 }}>Your product, with a conversion score inside.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              {['Your user pastes their site →', 'One POST /api/v1/scan →', 'Score + ranked findings render in your UI'].map((l) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Dot c={PURPLE} />
                  <span style={{ ...MONO, fontSize: 13, color: '#C7CBD4' }}>{l}</span>
                </div>
              ))}
            </div>
            <Link href="/developers" style={{ ...MONO, fontSize: 12, letterSpacing: '0.05em', color: PURPLE, textDecoration: 'none', marginTop: 'auto', borderTop: '0.5px solid rgba(157,140,255,0.18)', paddingTop: 16 }}>
              Read the full v1 contract →
            </Link>
          </div>

          {/* AGENCIES — steel */}
          <div style={{ position: 'relative', background: '#0A0F16', border: `1px solid rgba(111,155,198,0.22)`, padding: '32px 30px', display: 'flex', flexDirection: 'column' }}>
            <Brackets c="rgba(111,155,198,0.45)" />
            <p style={{ ...MONO, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: STEEL, margin: '0 0 16px' }}>Agencies</p>
            <p style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 18px', lineHeight: 1.2 }}>Bill it like the deliverable it is.</p>
            <div style={{ background: '#070B12', border: '0.5px solid rgba(111,155,198,0.18)', padding: '16px 18px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ ...DISP, fontWeight: 700, fontSize: 20, color: STEEL }}>${agencyPrice}/mo</span>
                <span style={{ ...MONO, fontSize: 13, color: '#6E7587' }}>→</span>
                <span style={{ ...SANS, fontSize: 14, color: '#C7CBD4' }}>audits typically billed <span style={{ color: '#E6E9EE' }}>$500–1,500</span> each</span>
              </div>
            </div>
            {/* small report thumbnail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 14px', marginBottom: 22 }}>
              <ScoreDial score={SCAN.score} color={AMBER} />
              <div>
                <p style={{ ...MONO, fontSize: 9.5, letterSpacing: '0.12em', color: STEEL, margin: '0 0 4px' }}>YOUR LOGO</p>
                <p style={{ ...SANS, fontSize: 13, color: '#C7CBD4', margin: 0 }}>Branded, client-ready report</p>
              </div>
            </div>
            <Link href="/agencies" style={{ ...MONO, fontSize: 12, letterSpacing: '0.05em', color: STEEL, textDecoration: 'none', marginTop: 'auto', borderTop: '0.5px solid rgba(111,155,198,0.18)', paddingTop: 16 }}>
              See the agency workflow →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── 5. POSITIONING STRIKE ──────────────────────────────────────────────────────
function PositioningSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(157,140,255,0.09) 0%, transparent 78%)' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', padding: '72px 32px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8080c0', margin: '0 0 20px' }}>POSITIONING</p>
        <h2 style={{ ...DISP, fontSize: 'clamp(26px, 3.8vw, 42px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#E6E9EE', margin: '0 0 22px', lineHeight: 1.1 }}>
          Every tool gives away a free audit. We&apos;re the engine they&apos;d run it on.
        </h2>
        <p style={{ ...SANS, fontSize: 16, lineHeight: 1.7, color: '#9398A8', margin: 0, maxWidth: 700 }}>
          Free site-audit tools are everywhere &mdash; most run on a static checklist and a confident tone. Weavn is the scored engine that would sit beneath one: 311 checks against the live rendered page, evidence-cited findings, and structured JSON on every call. So if you ship a free-audit tool, you&apos;re not a competitor &mdash; you&apos;re one <span style={{ ...MONO, fontSize: 14, color: PURPLE }}>POST /api/v1/scan</span> away from being a customer.
        </p>
      </div>
    </section>
  )
}

// ── 6. TRUST ROW ───────────────────────────────────────────────────────────────
function TrustRow() {
  const items = [
    { label: 'v1 stable', note: 'breaking changes ship as v2', href: '/docs/api' },
    { label: 'Status', note: 'component health, live', href: '/status' },
    { label: 'Changelog', note: 'every contract change, dated', href: '/changelog' },
    { label: 'Transparent pricing', note: 'per-scan · every plan states its real cap', href: '/pricing' },
  ]
  return (
    <section style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 32px' }}>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16 }}>
          {items.map((it) => (
            <Link key={it.label} href={it.href} style={{ textDecoration: 'none', display: 'block' }}>
              <p style={{ ...MONO, fontSize: 12.5, color: '#C7CBD4', margin: '0 0 4px' }}>{it.label} →</p>
              <p style={{ ...SANS, fontSize: 12, color: '#6E7587', margin: 0, lineHeight: 1.5 }}>{it.note}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 7. CLOSING CTA PAIR ────────────────────────────────────────────────────────
function ClosingCta() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 700px 400px at 50% 10%, rgba(157,140,255,0.08) 0%, transparent 70%)' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
        <h2 style={{ ...DISP, fontSize: 'clamp(26px, 3.8vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#E6E9EE', lineHeight: 1.12, margin: '0 0 14px' }}>
          One engine. Pick your door.
        </h2>
        <p style={{ ...SANS, fontSize: 15, lineHeight: 1.6, color: '#9398A8', margin: '0 0 30px' }}>
          Ship a conversion score inside your product, or bill white-label audits under your own brand.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: PURPLE, background: 'rgba(157,140,255,0.1)', border: `1px solid rgba(157,140,255,0.55)`, padding: '14px 28px', textDecoration: 'none' }}>
            Get API key →
          </Link>
          <Link href="/agencies" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: STEEL, background: 'transparent', border: `1px solid rgba(111,155,198,0.5)`, padding: '14px 28px', textDecoration: 'none' }}>
            For agencies →
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <main className="bg-background-base min-h-screen">
      <HeroSection />
      <DepthStrip />
      <LiveScanSection />
      <TwoDoorsSection />
      <PositioningSection />
      <TrustRow />
      <ClosingCta />
      <SiteFooter />
    </main>
  )
}
