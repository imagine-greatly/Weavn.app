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
  },
  {
    name: 'ASYNC MODE',
    value: 'Webhook delivery',
    detail: 'POST with async: true. Result delivered to your endpoint when ready.',
  },
  {
    name: 'BATCH ENDPOINT',
    value: 'Up to 10 URLs per request',
    detail: 'POST /api/v1/scan/batch — parallel execution, single webhook response.',
  },
  {
    name: 'RESPONSE TIME',
    value: '~90s median',
    detail: 'p50: 87s · p95: 142s · measured across 30-day rolling window.',
  },
]

const FAQS = [
  {
    q: 'How does caching work?',
    a: 'If you scan the same URL within 24 hours of a previous scan, the cached result is returned instantly at zero cost — no scan credit consumed. Cache is invalidated when we detect meaningful page changes via content fingerprinting.',
    accent: '#6F9BC6',
  },
  {
    q: "What's the difference between sync and async mode?",
    a: 'Sync mode (default) holds the HTTP connection open and returns the full JSON response when the scan completes — typically 87–142 seconds. Async mode accepts the request immediately (202), runs the scan in the background, and POSTs the result to your webhook endpoint when ready.',
    accent: '#8080C0',
  },
  {
    q: 'Can I mix brief and full scans in the same plan?',
    a: 'Yes. Brief scans (summary-only, no full finding detail) are available on all plans and consume the same scan credit as a full scan but return faster. Field selection lets you request only the response fields you need.',
    accent: '#6F9BC6',
  },
  {
    q: 'What happens if a site blocks the scanner?',
    a: 'The scanner returns a structured error with code BOT_BLOCKED. This does not consume a scan credit. We use Browserless Pro with stealth mode — most sites scan successfully, but Cloudflare Enterprise sites may block.',
    accent: '#6F9BC6',
  },
  {
    q: 'Is there an uptime SLA?',
    a: 'Enterprise plans include a written SLA. All other plans target 99.5% uptime with no formal guarantee. Status updates at status.webdocai.com.',
    accent: '#00C48C',
  },
]

const CURL_CODE = `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-site.com"}'`

// ── Sub-components ─────────────────────────────────────────────────────────────

function Bullet({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, listStyle: 'none' }}>
      <span
        style={{
          flexShrink: 0,
          width: 5,
          height: 5,
          backgroundColor: '#00C48C',
          marginTop: 7,
          display: 'block',
        }}
      />
      <span
        style={{
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 14,
          lineHeight: 1.65,
          color: '#9398A8',
        }}
      >
        {text}
      </span>
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <main style={{ backgroundColor: '#050810', minHeight: '100vh' }}>

      {/* ── 1. Hero band ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '96px 32px 48px',
          maxWidth: 896,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#6F9BC6',
            marginBottom: 16,
          }}
        >
          API PRICING
        </div>
        <h1
          className="font-score"
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 700,
            letterSpacing: '-1.5px',
            color: '#E6E9EE',
            margin: '0 0 16px',
          }}
        >
          Conversion intelligence. Per scan.
        </h1>
        <p
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 16,
            lineHeight: 1.6,
            color: '#9398A8',
            maxWidth: 672,
            margin: '0 auto 32px',
          }}
        >
          POST a URL. Get structured JSON. 307 checks across 27 categories. No dashboard required.
        </p>

        <div style={{ maxWidth: 672, margin: '0 auto' }}>
          <CodeBlock code={CURL_CODE} language="bash" />
        </div>
      </section>

      {/* ── 2. Rate gradient bar ──────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: '#0A0E18',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          padding: '40px 32px',
        }}
      >
        <div style={{ maxWidth: 768, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#6E7587',
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            PER-SCAN RATE
          </div>

          {/* Gradient bar */}
          <div
            style={{
              height: 8,
              background: 'linear-gradient(to right, #EFB23E, #6F9BC6, #00C48C)',
            }}
          />

          {/* Tick points */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {RATE_POINTS.map((point, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '0.5px', height: 12, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <div
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#6E7587',
                    marginTop: 4,
                  }}
                >
                  {point.label}
                </div>
                <div
                  className="font-score"
                  style={{ fontSize: 14, fontWeight: 500, color: point.color, marginTop: 2 }}
                >
                  {point.price}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 12,
              textAlign: 'center',
              marginTop: 24,
              color: '#6E7587',
            }}
          >
            Cache hits are never billed — at any tier.
          </p>
        </div>
      </section>

      {/* ── 3. Five plan cards ────────────────────────────────────────────────── */}
      <section id="pricing" style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          {/* PLAYGROUND */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              PLAYGROUND
            </div>
            <div
              className="font-score"
              style={{ fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              25 free
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 24,
              }}
            >
              then $0.25/scan
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <Bullet text="25 free scans" />
              <Bullet text="Full JSON response" />
              <Bullet text="No monthly fee" />
              <Bullet text="Rate limited" />
            </ul>
            <Link
              href="/developer"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#9398A8',
                border: '0.5px solid #6E7587',
                padding: '12px 0',
                marginTop: 24,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              GET API KEY →
            </Link>
          </div>

          {/* DEV */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              DEV
            </div>
            <div
              className="font-score"
              style={{ fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              $29
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 24,
              }}
            >
              /mo
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <Bullet text="300 scans/month" />
              <Bullet text="$0.19/scan overage" />
              <Bullet text="Webhook support" />
              <Bullet text="Async mode" />
              <Bullet text="Full JSON schema" />
            </ul>
            <Link
              href="/signup?plan=dev-api"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#6F9BC6',
                border: '0.5px solid #6F9BC6',
                padding: '12px 0',
                marginTop: 24,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              START DEV PLAN →
            </Link>
          </div>

          {/* BUILDER */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              BUILDER
            </div>
            <div
              className="font-score"
              style={{ fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              $99
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 24,
              }}
            >
              /mo
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <Bullet text="1,000 scans/month" />
              <Bullet text="$0.17/scan overage" />
              <Bullet text="Batch endpoint (10 URLs)" />
              <Bullet text="Webhook + async mode" />
              <Bullet text="Priority processing" />
            </ul>
            <Link
              href="/signup?plan=builder-api"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#050810',
                backgroundColor: '#00C48C',
                padding: '12px 0',
                marginTop: 24,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              START BUILDER PLAN →
            </Link>
          </div>

          {/* SCALE */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              SCALE
            </div>
            <div
              className="font-score"
              style={{ fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              $249
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 24,
              }}
            >
              /mo
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <Bullet text="3,000 scans/month" />
              <Bullet text="$0.15/scan overage" />
              <Bullet text="All batch + async features" />
              <Bullet text="Dedicated rate limits" />
              <Bullet text="Usage dashboard" />
            </ul>
            <Link
              href="/signup?plan=scale-api"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#6F9BC6',
                border: '0.5px solid #6F9BC6',
                padding: '12px 0',
                marginTop: 24,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              START SCALE PLAN →
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              ENTERPRISE
            </div>
            <div
              className="font-score"
              style={{ fontSize: 40, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, marginBottom: 4 }}
            >
              Custom
            </div>
            <div
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 14,
                color: '#8E8EA0',
                marginBottom: 24,
              }}
            >
              &nbsp;
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              <Bullet text="Volume pricing from $0.11/scan" />
              <Bullet text="SLA guarantee" />
              <Bullet text="Custom rate limits" />
              <Bullet text="Dedicated support" />
              <Bullet text="Invoice billing" />
            </ul>
            <Link
              href="mailto:hello@webdocai.com"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: '#9398A8',
                border: '0.5px solid #6E7587',
                padding: '12px 0',
                marginTop: 24,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              TALK TO US →
            </Link>
          </div>

        </div>
      </section>

      {/* ── 4. What's included ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 64px' }}>
        <div
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#6E7587',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          {"WHAT'S INCLUDED"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Cache Policy */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6F9BC6',
              }}
            >
              CACHE POLICY
            </div>
            <p className="font-score" style={{ fontSize: 17, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
              {KEY_FACTS[0].value}
            </p>
            <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>
              {KEY_FACTS[0].detail}
            </p>
            <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C', margin: 0, marginTop: 8 }}>
              cache_hit: true · cost_usd: 0.00
            </p>
          </div>

          {/* Async Mode */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6F9BC6',
              }}
            >
              ASYNC MODE
            </div>
            <p className="font-score" style={{ fontSize: 17, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
              {KEY_FACTS[1].value}
            </p>
            <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>
              {KEY_FACTS[1].detail}
            </p>
            <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, margin: 0, marginTop: 8 }}>
              <span style={{ color: '#8080C0' }}>async</span>
              <span style={{ color: '#9398A8' }}>: </span>
              <span style={{ color: '#00C48C' }}>true</span>
              <span style={{ color: '#9398A8' }}> · </span>
              <span style={{ color: '#8080C0' }}>webhook_url</span>
              <span style={{ color: '#9398A8' }}>: </span>
              <span style={{ color: '#00C48C' }}>your-endpoint</span>
            </p>
          </div>

          {/* Batch Endpoint */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6F9BC6',
              }}
            >
              BATCH ENDPOINT
            </div>
            <p className="font-score" style={{ fontSize: 17, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
              {KEY_FACTS[2].value}
            </p>
            <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>
              {KEY_FACTS[2].detail}
            </p>
            <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6', margin: 0, marginTop: 8 }}>
              POST /api/v1/scan/batch · up to 10 URLs
            </p>
          </div>

          {/* Response Time */}
          <div
            style={{
              backgroundColor: '#0A0E18',
              border: '0.5px solid rgba(255,255,255,0.07)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#6F9BC6',
              }}
            >
              RESPONSE TIME
            </div>
            <p className="font-score" style={{ fontSize: 17, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
              {KEY_FACTS[3].value}
            </p>
            <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>
              {KEY_FACTS[3].detail}
            </p>
            <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, margin: 0, marginTop: 8 }}>
              <span style={{ color: '#8080C0' }}>p50</span>
              <span style={{ color: '#9398A8' }}>: </span>
              <span style={{ color: '#6F9BC6' }}>87s</span>
              <span style={{ color: '#9398A8' }}> · </span>
              <span style={{ color: '#8080C0' }}>p95</span>
              <span style={{ color: '#9398A8' }}>: </span>
              <span style={{ color: '#6F9BC6' }}>142s</span>
            </p>
          </div>

        </div>
      </section>

      {/* ── 5. CTA pair ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/playground"
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 13,
              backgroundColor: '#00C48C',
              color: '#050810',
              padding: '13px 28px',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'opacity 0.15s',
            }}
          >
            TRY THE PLAYGROUND →
          </Link>
          <Link
            href="/docs/api"
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 13,
              border: '0.5px solid #6E7587',
              color: '#9398A8',
              padding: '13px 28px',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            READ THE DOCS →
          </Link>
        </div>
        <p
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            color: '#6E7587',
            marginTop: 16,
          }}
        >
          No credit card required to start.
        </p>
      </section>

      {/* ── 6. FAQ accordion ──────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 768, margin: '0 auto', padding: '0 32px 64px' }}>
        <div
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#6E7587',
            textAlign: 'center',
            marginBottom: 48,
          }}
        >
          DEVELOPER FAQ
        </div>

        {FAQS.map((faq, i) => (
          <div
            key={i}
            style={{
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${faq.accent}`,
              backgroundColor: openFaq === i ? '#0A0E18' : 'transparent',
              paddingLeft: 16,
              transition: 'background-color 0.2s',
            }}
          >
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                gap: 16,
              }}
            >
              <span
                style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#E6E9EE',
                }}
              >
                {faq.q}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  color: '#6E7587',
                  display: 'inline-block',
                  transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ▾
              </span>
            </button>
            {openFaq === i && (
              <p
                style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: 14,
                  color: '#9398A8',
                  lineHeight: 1.65,
                  paddingBottom: 16,
                  margin: 0,
                }}
              >
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ── 7. Footer routing band ────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          padding: '24px 0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 14,
            color: '#9398A8',
            margin: 0,
          }}
        >
          Need a dashboard?{' '}
          <Link href="/pricing" style={{ color: '#00C48C', textDecoration: 'none' }}>
            See agency plans →
          </Link>
        </p>
      </div>

    </main>
  )
}
