import type { Metadata } from 'next'
import Link from 'next/link'
import HomeCurlRequest from '@/components/landing/HomeCurlRequest'

export const metadata: Metadata = {
  title: 'Weavn — Conversion intelligence as an API',
  description:
    'One POST request. 311 checks across 27 categories. Structured JSON back — a coverage score, ranked findings, and drop-in copy rewrites. 25 free scans, no sales call.',
  openGraph: {
    title: 'Weavn — Conversion intelligence as an API',
    description: 'One POST request. 311 checks across 27 categories. Structured JSON back. 25 free scans.',
    url: 'https://weavn.app',
    siteName: 'Weavn',
    type: 'website',
    images: [
      {
        url: 'https://weavn.app/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Weavn — conversion intelligence as an API',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weavn — Conversion intelligence as an API',
    description: 'One POST request. 311 checks across 27 categories. Structured JSON back. 25 free scans.',
    images: ['https://weavn.app/og/home.png'],
    creator: '@weavnapp',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://weavn.app' },
}

// ── Design tokens (locked system — inline to match the /developers idiom) ─────
const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// Purple #9D8CFF is the API/developer accent and carries the page. Steel #6F9BC6
// appears ONLY in the agency column. Green #00C48C is success semantics only.
const PANEL: React.CSSProperties = {
  background: '#080D18',
  border: '1px solid rgba(157,140,255,0.18)',
  borderRadius: 0,
  position: 'relative',
}
const PANEL_INNER: React.CSSProperties = {
  background: '#06090F',
  border: '1px solid rgba(157,140,255,0.14)',
  borderRadius: 0,
  overflow: 'hidden',
}

// Four corner-bracket marks; expects a position:relative parent.
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

function Ticks({ rgba = '111,155,198' }: { rgba?: string }) {
  const b = `0.5px solid rgba(${rgba},0.2)`
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: b, borderLeft: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: b, borderRight: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: b, borderLeft: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: b, borderRight: b, pointerEvents: 'none', zIndex: 1 }} />
    </>
  )
}

function PanelHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
      <span style={{ ...MONO, fontSize: 11, color: '#9398A8', display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: '0.05em' }}>
        <span aria-hidden style={{ width: 7, height: 7, background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
        {label}
      </span>
      {right}
    </div>
  )
}

// JSON syntax-color helpers (match /developers)
function K({ c }: { c: string }) { return <span style={{ color: '#8080c0' }}>&quot;{c}&quot;</span> }
function S({ c }: { c: string }) { return <span style={{ color: '#00C48C' }}>&quot;{c}&quot;</span> }
function N({ c }: { c: string }) { return <span style={{ color: '#6F9BC6' }}>{c}</span> }
function Muted({ c }: { c: string }) { return <span style={{ color: '#6E7587' }}>{c}</span> }

// ── 1. HERO ───────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '72px 32px 56px' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 1000px 700px at 50% 30%, rgba(157,140,255,0.09) 0%, transparent 60%)',
          'radial-gradient(ellipse 500px 300px at 50% 0%, rgba(157,140,255,0.05) 0%, transparent 55%)',
        ].join(', '),
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ ...PANEL, padding: 'clamp(24px, 4vw, 48px)' }}>
          <Brackets />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">

            {/* LEFT — the pitch */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#9D8CFF', margin: '0 0 20px' }}>
                WEBSITE INTELLIGENCE API
              </p>
              <h1 style={{ ...DISP, fontSize: 'clamp(34px, 4.6vw, 56px)', fontWeight: 700, letterSpacing: '-0.04em', color: '#E6E9EE', margin: '0 0 20px', lineHeight: 1.05 }}>
                Conversion intelligence as an API.
              </h1>
              <p style={{ ...SANS, fontSize: 17, lineHeight: 1.65, color: '#9398A8', maxWidth: 480, margin: '0 0 30px' }}>
                One POST request. 311 checks across 27 categories. Structured JSON back &mdash; a coverage score, ranked findings, and drop-in copy rewrites, in 60&ndash;120 seconds.
              </p>

              {/* CTAs — primary GET YOUR API KEY, secondary VIEW DOCS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
                <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9D8CFF', background: 'rgba(157,140,255,0.1)', border: '1px solid rgba(157,140,255,0.5)', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' }}>
                  Get your API key →
                </Link>
                <Link href="/docs/api" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9398A8', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' }}>
                  View docs →
                </Link>
              </div>

              {/* Stat chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['311 checks', '27 categories', '60–120s typical'].map(label => (
                  <span key={label} style={{ ...MONO, fontSize: 11, letterSpacing: '0.04em', color: '#9398A8', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.12)', padding: '5px 12px' }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT — compact response teaser (locked v1 contract fields) */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={PANEL_INNER}>
                <PanelHeader label="RESPONSE.JSON" right={<span style={{ ...MONO, fontSize: 11, color: '#00C48C' }}>200 OK</span>} />
                <pre style={{ ...MONO, fontSize: 12.5, lineHeight: 1.95, margin: 0, padding: '16px 18px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#9398A8' }}>
<Muted c="{" />{'\n  '}
<K c="scan_id" /><Muted c=": " /><S c="sc_a8d3f2c1" /><Muted c="," />{'\n  '}
<K c="url" /><Muted c=": " /><S c="https://your-site.com" /><Muted c="," />{'\n  '}
<K c="score" /><Muted c=": " /><span style={{ color: '#EFB23E' }}>61</span><Muted c="," />{'\n  '}
<K c="verdict" /><Muted c=": " /><span style={{ color: '#EFB23E' }}>&quot;Fair&quot;</span><Muted c="," />{'\n  '}
<K c="findings_summary" /><Muted c=": " /><N c="23" />{'\n'}
<Muted c="}" />
                </pre>
              </div>
              <p style={{ ...MONO, fontSize: 10.5, color: '#6E7587', margin: '10px 0 0', letterSpacing: '0.02em' }}>
                Same shape on every call. Build against the schema once.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

// ── 2. LIVE PAYLOAD PROOF ──────────────────────────────────────────────────────

function PayloadProofSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 72% 95% at 50% 105%, rgba(157,140,255,0.10) 0%, rgba(157,140,255,0.04) 40%, transparent 82%)',
      }} />
      <Ticks rgba="157,140,255" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 896, margin: '0 auto', padding: '64px 32px 72px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8080c0', margin: '0 0 16px' }}>
          LIVE PAYLOAD
        </p>
        <h2 style={{ ...DISP, fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 700, letterSpacing: '-0.8px', color: '#E6E9EE', margin: '0 0 16px', lineHeight: 1.12 }}>
          Every finding comes back scored, ranked, and rewritten.
        </h2>
        <p style={{ ...SANS, fontSize: 15, lineHeight: 1.65, color: '#9398A8', maxWidth: 640, margin: '0 0 36px' }}>
          A coverage score, per-dimension coverage, and each issue as a structured finding &mdash; with an impact estimate and a drop-in <span style={{ ...MONO, fontSize: 13, color: '#8080c0' }}>rewritten_copy</span> field you can paste straight in.
        </p>

        <div style={PANEL_INNER}>
          <PanelHeader label="response · application/json" right={<span style={{ ...MONO, fontSize: 11, color: '#00C48C' }}>200 OK</span>} />
          <pre style={{ ...MONO, fontSize: 12.5, lineHeight: 1.85, margin: 0, padding: '18px 20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#9398A8' }}>
<Muted c="{" />{'\n  '}
<K c="scan_id" /><Muted c=": " /><S c="sc_a8d3f2c1" /><Muted c="," />{'\n  '}
<K c="url" /><Muted c=": " /><S c="https://your-site.com" /><Muted c="," />{'\n  '}
<K c="score" /><Muted c=": " /><span style={{ color: '#EFB23E' }}>61</span><Muted c="," />{'  '}<Muted c="// coverage score, 0–100" />{'\n  '}
<K c="verdict" /><Muted c=": " /><span style={{ color: '#EFB23E' }}>&quot;Fair&quot;</span><Muted c="," />{'\n  '}
<K c="findings_summary" /><Muted c=": " /><N c="23" /><Muted c="," />{'\n  '}
<K c="dimensions" /><Muted c=": {" />{'\n    '}
<K c="conversion_architecture" /><Muted c=": " /><N c="58" /><Muted c="," />{'\n    '}
<K c="message_clarity" /><Muted c=": " /><N c="42" /><Muted c="," />{'  '}<Muted c="// …5 more" />{'\n  '}
<Muted c="}," />{'\n  '}
<K c="findings" /><Muted c=": [" />{'\n    '}
<Muted c="{" />{'\n      '}
<K c="title" /><Muted c=": " /><span style={{ color: '#E6E9EE' }}>&quot;Hero headline is feature-led, not outcome-led&quot;</span><Muted c="," />{'\n      '}
<K c="severity" /><Muted c=": " /><span style={{ color: '#E8635F' }}>&quot;critical&quot;</span><Muted c="," />{'\n      '}
<K c="dimension" /><Muted c=": " /><S c="Conversion Architecture" /><Muted c="," />{'\n      '}
<K c="impact_estimate" /><Muted c=": " /><S c="+12-18% conversion lift" /><Muted c="," />{'\n      '}
<K c="rewritten_copy" /><Muted c=": " /><span style={{ color: '#00C48C' }}>&quot;See revenue impact in one dashboard.&quot;</span><Muted c="," />{'\n      '}
<K c="priority" /><Muted c=": " /><N c="1" />{'\n    '}
<Muted c="}" />{'  '}<Muted c="// …22 more, ranked" />{'\n  '}
<Muted c="]" />{'\n'}
<Muted c="}" />
          </pre>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px', marginTop: 18 }}>
          {[
            'scan_id carries an sc_ prefix',
            'Every finding cites visible page evidence',
            'v1 is stable — breaking changes ship as v2',
          ].map(fact => (
            <span key={fact} style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>· {fact}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 3. THE ONE-LINE REQUEST ────────────────────────────────────────────────────

function RequestSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 800px 500px at 50% 0%, rgba(157,140,255,0.05) 0%, transparent 60%)' }} />
      <Ticks rgba="157,140,255" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 896, margin: '0 auto', padding: '64px 32px 72px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8080c0', margin: '0 0 16px' }}>
          THE REQUEST
        </p>
        <h2 style={{ ...DISP, fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 700, letterSpacing: '-0.8px', color: '#E6E9EE', margin: '0 0 16px', lineHeight: 1.12 }}>
          One endpoint. One line to your first scan.
        </h2>
        <p style={{ ...SANS, fontSize: 15, lineHeight: 1.65, color: '#9398A8', maxWidth: 640, margin: '0 0 32px' }}>
          A standard REST endpoint &mdash; any HTTP client that sends a Bearer token and a JSON body works.
        </p>

        <HomeCurlRequest />

        <p style={{ ...SANS, fontSize: 13.5, lineHeight: 1.6, color: '#6E7587', margin: '18px 0 0', maxWidth: 680 }}>
          Need it async? Add <span style={{ ...MONO, fontSize: 12.5, color: '#8080c0' }}>&quot;async&quot;: true</span> and a <span style={{ ...MONO, fontSize: 12.5, color: '#8080c0' }}>webhook_url</span> &mdash; the API returns a <span style={{ ...MONO, fontSize: 12.5, color: '#8080c0' }}>scan_id</span> immediately and POSTs the completed result to your endpoint.
        </p>
      </div>
    </section>
  )
}

// ── 4. WHO IT'S FOR ─────────────────────────────────────────────────────────────

const AUDIENCES = [
  {
    kicker: 'PLATFORMS & BUILDERS',
    accent: '#9D8CFF',
    accentBorder: 'rgba(157,140,255,0.4)',
    title: 'Give every site on your platform a conversion score.',
    body: 'Embed a live score in your site builder, CRM, or e-commerce app. Re-scan on publish and surface the delta.',
    cta: 'Explore the API →',
    href: '/developers',
  },
  {
    kicker: 'AGENCIES',
    accent: '#6F9BC6',
    accentBorder: 'rgba(111,155,198,0.4)',
    title: 'White-label scored reports your clients pay for.',
    body: 'Deliver branded audits under your own name from the dashboard — or batch-scan client sites through the API.',
    cta: 'See the agency dashboard →',
    href: '/dashboard',
  },
  {
    kicker: 'DEVELOPERS',
    accent: '#9D8CFF',
    accentBorder: 'rgba(157,140,255,0.4)',
    title: '25 free scans. No sales call.',
    body: 'Get a key, run a real scan in the playground, and build against a schema that never changes shape.',
    cta: 'Open the playground →',
    href: '/playground',
  },
]

function WhoItsForSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <Ticks />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto', padding: '64px 32px 72px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8080c0', margin: '0 0 16px' }}>
          WHO IT&apos;S FOR
        </p>
        <h2 style={{ ...DISP, fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 700, letterSpacing: '-0.8px', color: '#E6E9EE', margin: '0 0 40px', lineHeight: 1.12 }}>
          One engine. Three ways in.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AUDIENCES.map(a => (
            <div
              key={a.kicker}
              style={{
                background: '#0A0E18',
                borderTop: `1px solid ${a.accentBorder}`,
                borderLeft: '0.5px solid rgba(255,255,255,0.06)',
                borderRight: '0.5px solid rgba(255,255,255,0.03)',
                borderBottom: '0.5px solid rgba(255,255,255,0.03)',
                padding: '24px 24px 22px',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: a.accent, margin: '0 0 14px' }}>{a.kicker}</p>
              <p style={{ ...DISP, fontSize: 19, fontWeight: 600, color: '#E6E9EE', lineHeight: 1.25, margin: '0 0 10px' }}>{a.title}</p>
              <p style={{ ...SANS, fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0, flexGrow: 1 }}>{a.body}</p>
              <Link href={a.href} style={{ ...MONO, fontSize: 11, letterSpacing: '0.05em', color: a.accent, textDecoration: 'none', marginTop: 20, borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                {a.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 5. POSITIONING STRIKE ────────────────────────────────────────────────────

function PositioningSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(157,140,255,0.10) 0%, rgba(157,140,255,0.04) 40%, transparent 82%)' }} />
      <Ticks rgba="157,140,255" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', padding: '72px 32px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8080c0', margin: '0 0 20px' }}>
          POSITIONING
        </p>
        <h2 style={{ ...DISP, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-1px', color: '#E6E9EE', margin: '0 0 24px', lineHeight: 1.1 }}>
          Every agency gives away a free audit. We&apos;re the engine underneath.
        </h2>
        <p style={{ ...SANS, fontSize: 16, lineHeight: 1.7, color: '#9398A8', margin: '0 0 16px', maxWidth: 700 }}>
          Free site-audit tools are everywhere. Most run on a static checklist and a confident tone. Weavn is the scored engine that would sit beneath one &mdash; 311 checks against your live rendered page, evidence-cited findings, and structured JSON on every call.
        </p>
        <p style={{ ...SANS, fontSize: 16, lineHeight: 1.7, color: '#9398A8', margin: 0, maxWidth: 700 }}>
          So if you run a free-audit tool, you&apos;re not a competitor. You&apos;re one <span style={{ ...MONO, fontSize: 14, color: '#9D8CFF' }}>POST /api/v1/scan</span> away from being a customer.
        </p>
      </div>
    </section>
  )
}

// ── 6. TRUST / INFRA SIGNALS ────────────────────────────────────────────────

const INFRA_SIGNALS = [
  { label: 'API VERSION', value: 'v1 · stable', note: 'Breaking changes ship as v2. Build against the schema once.', href: '/docs/api', linkText: 'Read the contract →', external: false },
  { label: 'STATUS', value: 'All systems operational', note: 'Component health. Target 99.5% uptime.', href: '/status', linkText: 'View status →', external: false },
  { label: 'CHANGELOG', value: 'What ships, when', note: 'Every contract change is logged and dated.', href: '/changelog', linkText: 'See the changelog →', external: false },
  { label: 'PRICING', value: 'Per-scan, transparent', note: 'Rate decreases with volume. Cache hits are free.', href: '/developers', linkText: 'See API plans →', external: false },
]

function TrustSignalsSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto', padding: '56px 32px 64px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6E7587', margin: '0 0 28px' }}>
          INFRASTRUCTURE
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INFRA_SIGNALS.map(sig => (
            <div key={sig.label} style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.08)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: 0 }}>{sig.label}</p>
              <p style={{ ...MONO, fontSize: 14, color: '#E6E9EE', margin: 0 }}>{sig.value}</p>
              <p style={{ ...SANS, fontSize: 13, lineHeight: 1.55, color: '#6E7587', margin: 0, flexGrow: 1 }}>{sig.note}</p>
              {sig.external ? (
                <a href={sig.href} target="_blank" rel="noopener noreferrer" style={{ ...MONO, fontSize: 11, color: '#6F9BC6', textDecoration: 'none' }}>{sig.linkText}</a>
              ) : (
                <Link href={sig.href} style={{ ...MONO, fontSize: 11, color: '#6F9BC6', textDecoration: 'none' }}>{sig.linkText}</Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 7. FOOTER CTA ────────────────────────────────────────────────────────────

function FooterCtaSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 700px 400px at 50% 20%, rgba(157,140,255,0.08) 0%, transparent 70%)' }} />
      <Ticks rgba="157,140,255" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
        <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8080c0', margin: '0 0 14px' }}>Start building</p>
        <h2 style={{ ...DISP, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.8px', color: '#E6E9EE', lineHeight: 1.15, margin: '0 0 14px' }}>
          Conversion intelligence, one request away.
        </h2>
        <p style={{ ...SANS, fontSize: 15, lineHeight: 1.6, color: '#9398A8', margin: '0 0 30px' }}>
          Same engine on every plan. Build against the schema once.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
          <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9D8CFF', background: 'rgba(157,140,255,0.1)', border: '1px solid rgba(157,140,255,0.5)', padding: '13px 26px', textDecoration: 'none', display: 'inline-block' }}>
            Get your API key →
          </Link>
          <Link href="/docs/api" style={{ ...MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9398A8', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', padding: '13px 26px', textDecoration: 'none', display: 'inline-block' }}>
            View docs →
          </Link>
        </div>
        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>
          Or try{' '}
          <Link href="/playground" style={{ color: '#6F9BC6', textDecoration: 'none' }}>25 free scans in the playground →</Link>
          {' '}— no card, no sales call.
        </p>
      </div>
    </section>
  )
}

// ── Footer ──────────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer className="border-t border-background-border bg-background-raised">
      <div className="max-w-[1280px] mx-auto px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
            Weavn
          </Link>
          <p className="font-body text-sm text-text-secondary mt-3 max-w-xs leading-relaxed">
            Conversion intelligence as an API. 311 checks across 27 categories, ranked findings, AI-rewritten copy. One endpoint.
          </p>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">DEVELOPERS</div>
          <Link href="/developers" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline">API overview →</Link>
          <Link href="/docs/api" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline">API reference →</Link>
          <Link href="/playground" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline">Playground →</Link>
          <Link href="/changelog" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline">Changelog →</Link>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">PRODUCT</div>
          <Link href="/product" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline">The engine →</Link>
          <Link href="/dashboard" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline">Dashboard →</Link>
          <Link href="/dashboard#agencies" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline">Agencies →</Link>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">GET STARTED</div>
          <Link href="/auth?surface=api" className="font-body text-sm text-[#9D8CFF] hover:opacity-80 block mb-2 no-underline">Get your API key →</Link>
          <Link href="/auth?surface=dashboard" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">Scan my site →</Link>
          <Link href="/status" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">Status →</Link>
        </div>
      </div>
      <div className="border-t border-background-border">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex flex-wrap justify-between items-center gap-3">
          <span className="font-mono text-xs text-text-tertiary">© 2026 Weavn</span>
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
          <span className="font-mono text-xs text-text-tertiary">Privacy · Terms</span>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-background-base min-h-screen">
      <HeroSection />
      <PayloadProofSection />
      <RequestSection />
      <WhoItsForSection />
      <PositioningSection />
      <TrustSignalsSection />
      <FooterCtaSection />
      <FooterSection />
    </main>
  )
}
