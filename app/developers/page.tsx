'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CodeBlock } from '@/components/ui/CodeBlock'

// ── Data ──────────────────────────────────────────────────────────────────────

const RATE_POINTS = [
  { label: 'Playground', price: '$0.25', color: '#EFB23E' },
  { label: 'Dev', price: '$0.19', color: '#EFB23E' },
  { label: 'Builder', price: '$0.17', color: '#6F9BC6' },
  { label: 'Scale', price: '$0.15', color: '#00C48C' },
  { label: 'Enterprise', price: '$0.11', color: '#00C48C' },
]

const KEY_FACTS = [
  {
    name: 'CACHE POLICY',
    value: 'Cache hits never billed',
    detail: 'Identical URL rescanned within 24h returns cached result at zero cost.',
    why: 'Scan the same URL multiple times in your pipeline for free.',
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C', margin: 0 }}>
        cache_hit: true · cost_usd: 0.00
      </p>
    ),
  },
  {
    name: 'ASYNC MODE',
    value: 'Webhook delivery',
    detail: 'POST with async: true. Result delivered to your endpoint when ready.',
    why: "Don't block your process waiting 90 seconds — fire and forget.",
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, margin: 0 }}>
        <span style={{ color: '#8080C0' }}>async</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#00C48C' }}>true</span>
        <span style={{ color: '#9398A8' }}> · </span>
        <span style={{ color: '#8080C0' }}>webhook_url</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#00C48C' }}>your-endpoint</span>
      </p>
    ),
  },
  {
    name: 'BATCH ENDPOINT',
    value: 'Up to 10 URLs per request',
    detail: 'POST /api/v1/scan/batch — parallel execution, single webhook response.',
    why: "Audit a full site's key pages in one request.",
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6', margin: 0 }}>
        POST /api/v1/scan/batch · up to 10 URLs
      </p>
    ),
  },
  {
    name: 'RESPONSE TIME',
    value: '~90s median',
    detail: 'p50: 87s · p95: 142s · measured across 30-day rolling window.',
    why: 'p95 is 142s — plan timeouts accordingly.',
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, margin: 0 }}>
        <span style={{ color: '#8080C0' }}>p50</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#6F9BC6' }}>87s</span>
        <span style={{ color: '#9398A8' }}> · </span>
        <span style={{ color: '#8080C0' }}>p95</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#6F9BC6' }}>142s</span>
      </p>
    ),
  },
]

const FAQS = [
  {
    q: 'How does authentication work?',
    a: 'Every request requires a Bearer token in the Authorization header. Get your key from the developer portal — it starts with wdoc_live_. Keys are scoped to your account and plan. Do not expose your key in client-side code.',
    accent: '#6F9BC6',
  },
  {
    q: 'How does caching work?',
    a: 'Identical URL rescanned within 24 hours returns the cached result at zero cost — billed at $0.00 regardless of plan. Cache is invalidated when the page content changes significantly (detected via fingerprint). You can force a fresh scan by passing force_refresh: true.',
    accent: '#00C48C',
  },
  {
    q: "What's the difference between sync and async mode?",
    a: 'Sync mode holds the connection open and returns the full response when the scan completes (~90s). Async mode returns immediately with a scan_id and POSTs the result to your webhook_url when ready. Use async for batch processing or when you need to avoid timeout issues.',
    accent: '#8080C0',
  },
  {
    q: "What happens if a site blocks the scanner?",
    a: "webdoc uses Browserless Pro with stealth mode and a real Chrome user agent. Most sites scan cleanly. Cloudflare Enterprise with aggressive bot detection occasionally blocks scans — when this happens the API returns a structured error with block_reason: 'automated_access_blocked'. We are actively working on defeat strategies for these cases.",
    accent: '#6F9BC6',
  },
  {
    q: 'Is there an uptime SLA?',
    a: 'Enterprise plans include a formal SLA. All other plans target 99.5% uptime. Status and incident history at status.webdocai.com. Planned maintenance is announced 48 hours in advance via the dashboard.',
    accent: '#00C48C',
  },
]

const CURL_CODE = `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-site.com"}'`

// ── Tokens ────────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// ── Sub-components ─────────────────────────────────────────────────────────────

function Bullet({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, listStyle: 'none' }}>
      <span style={{ flexShrink: 0, width: 5, height: 5, backgroundColor: '#00C48C', marginTop: 7, display: 'block' }} />
      <span style={{ ...SANS, fontSize: 14, lineHeight: 1.65, color: '#9398A8' }}>{text}</span>
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── 1. Hero — transparent, grid-exposed ──────────────────────────────── */}
      <section style={{ padding: '96px 32px 48px', maxWidth: 896, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', marginBottom: 16 }}>
          API PRICING
        </div>
        <h1 style={{ ...DISP, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#E6E9EE', margin: '0 0 16px' }}>
          Conversion intelligence. Per scan.
        </h1>
        <p style={{ ...SANS, fontSize: 16, lineHeight: 1.6, color: '#9398A8', maxWidth: 672, margin: '0 auto 32px' }}>
          POST a URL. Get structured JSON. 307 checks across 27 categories. No dashboard required.
        </p>

        {/* CodeBlock with live API emission */}
        <div
          style={{
            maxWidth: 672,
            margin: '0 auto',
            borderTop: '1px solid rgba(111,155,198,0.3)',
            borderLeft: '1px solid rgba(111,155,198,0.15)',
            borderRight: '1px solid rgba(111,155,198,0.08)',
            borderBottom: '1px solid rgba(111,155,198,0.05)',
            boxShadow: '0 0 0 1px rgba(111,155,198,0.2), 0 0 30px rgba(111,155,198,0.08)',
          }}
        >
          <CodeBlock code={CURL_CODE} language="bash" />
        </div>

        {/* Metric chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          {[
            { label: '307 checks', color: '#00C48C' },
            { label: '~90s median', color: '#6F9BC6' },
            { label: 'cache hits free', color: '#00C48C' },
          ].map(({ label, color }) => (
            <div key={label} style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.06)', padding: '6px 12px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color }}>
              {label}
            </div>
          ))}
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 2. Rate gradient bar — transparent, grid-exposed + dual bloom ────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '40px 32px' }}>
        {/* Amber/green dual bloom */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: [
              'radial-gradient(ellipse 300px 200px at 15% 50%, rgba(239,178,62,0.06) 0%, transparent 70%)',
              'radial-gradient(ellipse 300px 200px at 85% 50%, rgba(0,196,140,0.06) 0%, transparent 70%)',
            ].join(', '),
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 768, margin: '0 auto' }}>
          <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6E7587', textAlign: 'center', marginBottom: 24 }}>
            PER-SCAN RATE · DECREASES WITH VOLUME
          </div>

          <div style={{ height: 8, background: 'linear-gradient(to right, #EFB23E, #6F9BC6, #00C48C)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {RATE_POINTS.map((point, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '0.5px', height: 12, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6E7587', marginTop: 4 }}>
                  {point.label}
                </div>
                <div style={{ ...DISP, fontSize: 14, fontWeight: 500, color: point.color, marginTop: 2 }}>
                  {point.price}
                </div>
              </div>
            ))}
          </div>

          <p style={{ ...SANS, fontSize: 13, color: '#9398A8', textAlign: 'center', marginTop: 24, maxWidth: 480, margin: '24px auto 0' }}>
            Cache hits on identical URLs within 24 hours are always free — billed at $0.00 regardless of plan.
          </p>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 3. Five plan cards — mounted module bg #06090F ───────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#06090F', borderTop: '0.5px solid rgba(111,155,198,0.15)' }}>
        {/* Builder card bloom — primary conversion tier */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: 'radial-gradient(ellipse 500px 700px at 50% 50%, rgba(111,155,198,0.06) 0%, transparent 60%)',
          }}
        />
        <div id="pricing" style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

            {/* PLAYGROUND */}
            <div className="wd-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginBottom: 16 }}>PLAYGROUND</div>
              <div style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>25 free</div>
              <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 24 }}>then $0.25/scan</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                <Bullet text="25 free scans" />
                <Bullet text="Full JSON response" />
                <Bullet text="No monthly fee" />
                <Bullet text="Rate limited" />
              </ul>
              <div style={{ margin: '16px 0', borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <CodeBlock language="json" code={`{ "url": "https://your-site.com", "async": false }`} />
              </div>
              <Link href="/developer" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#9398A8', border: '0.5px solid #6E7587', padding: '12px 0', marginTop: 8, textDecoration: 'none', transition: 'color 0.15s' }}>
                GET API KEY →
              </Link>
            </div>

            {/* DEV */}
            <div className="wd-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginBottom: 16 }}>DEV</div>
              <div style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>$29</div>
              <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 24 }}>/mo</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                <Bullet text="300 scans/month" />
                <Bullet text="$0.19/scan overage" />
                <Bullet text="Webhook support" />
                <Bullet text="Async mode" />
                <Bullet text="Full JSON schema" />
              </ul>
              <div style={{ margin: '16px 0', borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <CodeBlock language="json" code={`{ "url": "https://your-site.com",\n  "finding_depth": "full",\n  "webhook_url": "https://your-endpoint.com" }`} />
              </div>
              <Link href="/signup?plan=dev-api" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#6F9BC6', border: '0.5px solid #6F9BC6', padding: '12px 0', marginTop: 8, textDecoration: 'none', transition: 'opacity 0.15s' }}>
                START DEV PLAN →
              </Link>
            </div>

            {/* BUILDER */}
            <div className="wd-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6', marginBottom: 16 }}>BUILDER</div>
              <div style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>$99</div>
              <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 24 }}>/mo</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                <Bullet text="1,000 scans/month" />
                <Bullet text="$0.17/scan overage" />
                <Bullet text="Batch endpoint (10 URLs)" />
                <Bullet text="Webhook + async mode" />
                <Bullet text="Priority processing" />
              </ul>
              <div style={{ margin: '16px 0', borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <CodeBlock language="json" code={`{ "urls": ["site1.com", "site2.com"],\n  "async": true, "batch": true }`} />
              </div>
              <Link href="/signup?plan=builder-api" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#050810', backgroundColor: '#00C48C', padding: '12px 0', marginTop: 8, textDecoration: 'none', transition: 'opacity 0.15s' }}>
                START BUILDER PLAN →
              </Link>
            </div>

            {/* SCALE */}
            <div className="wd-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginBottom: 16 }}>SCALE</div>
              <div style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>$249</div>
              <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 24 }}>/mo</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                <Bullet text="3,000 scans/month" />
                <Bullet text="$0.15/scan overage" />
                <Bullet text="All batch + async features" />
                <Bullet text="Dedicated rate limits" />
                <Bullet text="Usage dashboard" />
              </ul>
              <div style={{ margin: '16px 0', borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <CodeBlock language="json" code={`{ "batch": true, "priority": "high",\n  "rate_limit": "dedicated" }`} />
              </div>
              <Link href="/signup?plan=scale-api" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#6F9BC6', border: '0.5px solid #6F9BC6', padding: '12px 0', marginTop: 8, textDecoration: 'none', transition: 'opacity 0.15s' }}>
                START SCALE PLAN →
              </Link>
            </div>

            {/* ENTERPRISE */}
            <div className="wd-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', marginBottom: 16 }}>ENTERPRISE</div>
              <div style={{ ...DISP, fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}>Custom</div>
              <div style={{ ...SANS, fontSize: 14, color: '#8E8EA0', marginBottom: 24 }}>&nbsp;</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                <Bullet text="Volume pricing from $0.11/scan" />
                <Bullet text="SLA guarantee" />
                <Bullet text="Custom rate limits" />
                <Bullet text="Dedicated support" />
                <Bullet text="Invoice billing" />
              </ul>
              <div style={{ margin: '16px 0', borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 12, ...MONO, fontSize: 11, color: '#6E7587', lineHeight: 1.7 }}>
                custom rate limits · dedicated infrastructure · SLA guarantee
              </div>
              <Link href="mailto:hello@webdocai.com" style={{ display: 'block', textAlign: 'center', ...MONO, fontSize: 13, color: '#9398A8', border: '0.5px solid #6E7587', padding: '12px 0', marginTop: 8, textDecoration: 'none', transition: 'color 0.15s' }}>
                TALK TO US →
              </Link>
            </div>

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 4. What's included — mounted module bg #080D18 ───────────────────── */}
      <section style={{ background: '#080D18', borderTop: '0.5px solid rgba(128,128,192,0.15)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px' }}>
          <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6E7587', textAlign: 'center', marginBottom: 32 }}>
            {"WHAT'S INCLUDED"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {KEY_FACTS.map((fact) => (
              <div
                key={fact.name}
                className="wd-panel"
                style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6F9BC6' }}>
                  {fact.name}
                </div>
                <p style={{ ...DISP, fontSize: 17, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
                  {fact.value}
                </p>
                <p style={{ ...SANS, fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>
                  {fact.detail}
                </p>
                <p style={{ ...SANS, fontSize: 13, lineHeight: 1.5, color: '#6E7587', fontStyle: 'italic', margin: '2px 0 0' }}>
                  {fact.why}
                </p>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 }}>
                  {fact.artifact}
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 5. CTA pair — mounted module bg #06090F ──────────────────────────── */}
      <section style={{ background: '#06090F', borderTop: '0.5px solid rgba(0,196,140,0.12)', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link
            href="/playground"
            style={{ ...MONO, fontSize: 13, backgroundColor: '#00C48C', color: '#050810', padding: '13px 28px', textDecoration: 'none', display: 'inline-block', transition: 'opacity 0.15s' }}
          >
            TRY THE PLAYGROUND →
          </Link>
          <Link
            href="/docs/api"
            style={{ ...MONO, fontSize: 13, border: '0.5px solid #6E7587', color: '#9398A8', padding: '13px 28px', textDecoration: 'none', display: 'inline-block', transition: 'color 0.15s, border-color 0.15s' }}
          >
            READ THE DOCS →
          </Link>
        </div>
        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', marginTop: 16 }}>
          No credit card required to start.
        </p>
      </section>
      <div className="section-separator" />

      {/* ── 6. FAQ — transparent, grid-exposed ───────────────────────────────── */}
      <section style={{ maxWidth: 768, margin: '0 auto', padding: '48px 32px 64px' }}>
        <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6E7587', textAlign: 'center', marginBottom: 48 }}>
          DEVELOPER FAQ
        </div>

        {FAQS.map((faq, i) => {
          const isOpen = openFaq === i
          return (
            <div
              key={i}
              style={{
                borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${isOpen ? faq.accent : 'rgba(111,155,198,0.3)'}`,
                backgroundColor: isOpen ? '#0A0E18' : 'transparent',
                paddingLeft: 16,
                transition: 'background-color 0.2s, border-left-color 0.2s',
              }}
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', textAlign: 'left', gap: 16 }}
              >
                <span style={{ ...SANS, fontSize: 16, fontWeight: 500, color: '#E6E9EE' }}>{faq.q}</span>
                <span style={{ flexShrink: 0, color: isOpen ? faq.accent : '#6E7587', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s, color 0.2s', fontSize: 16, lineHeight: 1 }}>▾</span>
              </button>
              {isOpen && (
                <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.65, paddingBottom: 16, margin: 0 }}>
                  {faq.a}
                </p>
              )}
            </div>
          )
        })}
      </section>
      <div className="section-separator" />

      {/* ── 7. Footer — transparent ──────────────────────────────────────────── */}
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <p style={{ ...SANS, fontSize: 14, color: '#9398A8', margin: 0 }}>
          Need a dashboard?{' '}
          <Link href="/pricing" style={{ color: '#00C48C', textDecoration: 'none' }}>
            See agency plans →
          </Link>
        </p>
      </div>

    </main>
  )
}
