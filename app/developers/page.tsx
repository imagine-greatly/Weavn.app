'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Data ──────────────────────────────────────────────────────────────────────

const RATE_POINTS = [
  { label: 'Playground', price: '$0.25' },
  { label: 'Dev', price: '$0.19' },
  { label: 'Builder', price: '$0.17' },
  { label: 'Scale', price: '$0.15' },
  { label: 'Enterprise', price: '$0.11' },
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
  },
  {
    q: "What's the difference between sync and async mode?",
    a: 'Sync mode (default) holds the HTTP connection open and returns the full JSON response when the scan completes — typically 87–142 seconds. Async mode accepts the request immediately (202), runs the scan in the background, and POSTs the result to your webhook endpoint when ready.',
  },
  {
    q: 'Can I mix brief and full scans in the same plan?',
    a: 'Yes. Brief scans (summary-only, no full finding detail) are available on all plans and consume the same scan credit as a full scan but return faster. Field selection lets you request only the response fields you need.',
  },
  {
    q: 'What happens if a site blocks the scanner?',
    a: 'The scanner returns a structured error with code BOT_BLOCKED. This does not consume a scan credit. We use Browserless Pro with stealth mode — most sites scan successfully, but Cloudflare Enterprise sites may block.',
  },
  {
    q: 'Is there an uptime SLA?',
    a: 'Enterprise plans include a written SLA. All other plans target 99.5% uptime with no formal guarantee. Status updates at status.webdocai.com.',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 mb-2">
      <span
        className="flex-shrink-0 rounded-full mt-[7px]"
        style={{ width: 4, height: 4, backgroundColor: '#3A3A52' }}
      />
      <span style={{ fontFamily: 'var(--font-stack-sans)', fontSize: 13, lineHeight: 1.65, color: '#8E8EA0' }}>
        {text}
      </span>
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <main className="bg-background-base min-h-screen">

      {/* ── 1. Hero band ─────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-12 max-w-4xl mx-auto px-8 text-center">
        <div className="section-label mb-4">API PRICING</div>
        <h1
          className="section-headline mb-4"
          style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1.5px' }}
        >
          Conversion intelligence. Per scan.
        </h1>
        <p className="section-subhead max-w-2xl mx-auto mb-8">
          POST a URL. Get structured JSON. 307 checks across 27 categories. No dashboard required.
        </p>

        {/* Terminal curl block */}
        <div className="bg-background-subtle border border-background-border p-4 max-w-2xl mx-auto text-left">
          <pre className="font-mono text-sm m-0 leading-relaxed whitespace-pre-wrap">
            <span style={{ color: '#00C8FF' }}>curl</span>
            <span style={{ color: '#8E8EA0' }}>{' -X POST '}</span>
            <span style={{ color: '#00C8FF' }}>https://webdocai.com/api/v1/scan</span>
            <span style={{ color: '#8E8EA0' }}>{' \\\n  -H "Authorization: Bearer '}</span>
            <span style={{ color: '#00C8FF' }}>wdoc_live_••••</span>
            <span style={{ color: '#8E8EA0' }}>{'" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"url": "'}</span>
            <span style={{ color: '#00C8FF' }}>https://your-site.com</span>
            <span style={{ color: '#8E8EA0' }}>{"\"}'"}  </span>
          </pre>
        </div>
      </section>

      {/* ── 2. Rate gradient bar ─────────────────────────────────────────────── */}
      <section
        className="bg-background-subtle py-10 px-8"
        style={{ borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="section-label text-center mb-6">PER-SCAN RATE</div>

          {/* Gradient bar */}
          <div
            className="w-full rounded-full"
            style={{
              height: 8,
              background: 'linear-gradient(to right, #FF8C00, #F5A623, #00C8FF, #00C48C)',
            }}
          />

          {/* 5 labeled tick points */}
          <div className="flex justify-between">
            {RATE_POINTS.map((point, i) => (
              <div key={i} className="flex flex-col items-center">
                <div style={{ width: 1, height: 12, backgroundColor: '#3A3A52' }} />
                <div className="font-ui-label text-text-secondary mt-1">{point.label}</div>
                <div className="font-mono text-sm mt-0.5" style={{ color: '#00C8FF' }}>{point.price}</div>
              </div>
            ))}
          </div>

          <p className="font-mono text-sm text-center mt-6" style={{ color: '#3A3A52' }}>
            Cache hits are never billed — at any tier.
          </p>
        </div>
      </section>

      {/* ── 3. Five plan cards ───────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          {/* PLAYGROUND */}
          <div className="landing-card-electric border border-background-border bg-background-subtle p-6 flex flex-col">
            <div className="font-ui-label text-text-secondary mb-4">PLAYGROUND</div>
            <div className="font-score text-4xl text-text-primary mb-1">25 free</div>
            <div className="font-mono text-xs text-text-secondary mb-6">then $0.25/scan</div>
            <ul className="list-none p-0 m-0 flex-1">
              <Bullet text="25 free scans" />
              <Bullet text="Full JSON response" />
              <Bullet text="No monthly fee" />
              <Bullet text="Rate limited" />
            </ul>
            <Link
              href="/developer"
              className="block text-center font-ui-label text-text-secondary py-3 mt-6 no-underline hover:text-text-primary transition-colors duration-150"
            >
              Get API key →
            </Link>
          </div>

          {/* DEV */}
          <div className="landing-card-electric border border-background-border bg-background-subtle p-6 flex flex-col">
            <div className="font-ui-label text-text-secondary mb-4">DEV</div>
            <div className="font-score text-4xl text-text-primary mb-1">$29</div>
            <div className="font-mono text-xs text-text-secondary mb-6">/mo</div>
            <ul className="list-none p-0 m-0 flex-1">
              <Bullet text="300 scans/month" />
              <Bullet text="$0.19/scan overage" />
              <Bullet text="Webhook support" />
              <Bullet text="Async mode" />
              <Bullet text="Full JSON schema" />
            </ul>
            <Link
              href="/signup?plan=dev-api"
              className="block text-center font-ui-label border border-[#00C8FF]/30 text-[#00C8FF] py-3 mt-6 no-underline hover:border-[#00C8FF]/60 transition-colors duration-150"
            >
              Start Dev plan →
            </Link>
          </div>

          {/* BUILDER — elevated / best value */}
          <div className="landing-card-electric relative border border-[#00C8FF]/30 bg-background-interactive glow-ambient p-6 flex flex-col mt-3 lg:mt-0">
            <div
              className="absolute font-ui-label px-3 py-1 whitespace-nowrap"
              style={{ top: -12, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#00C8FF', color: '#050810' }}
            >
              BEST VALUE
            </div>
            <div className="font-ui-label mb-4" style={{ color: '#00C8FF' }}>BUILDER</div>
            <div className="font-score text-4xl text-text-primary mb-1">$99</div>
            <div className="font-mono text-xs text-text-secondary mb-6">/mo</div>
            <ul className="list-none p-0 m-0 flex-1">
              <Bullet text="1,000 scans/month" />
              <Bullet text="$0.17/scan overage" />
              <Bullet text="Batch endpoint (10 URLs)" />
              <Bullet text="Webhook + async mode" />
              <Bullet text="Priority processing" />
            </ul>
            <Link
              href="/signup?plan=builder-api"
              className="block text-center font-ui-label py-3 mt-6 no-underline hover:opacity-90 transition-opacity duration-150"
              style={{ backgroundColor: '#00C8FF', color: '#050810' }}
            >
              Start Builder plan →
            </Link>
          </div>

          {/* SCALE */}
          <div className="landing-card-electric border border-background-border bg-background-subtle p-6 flex flex-col">
            <div className="font-ui-label text-text-secondary mb-4">SCALE</div>
            <div className="font-score text-4xl text-text-primary mb-1">$249</div>
            <div className="font-mono text-xs text-text-secondary mb-6">/mo</div>
            <ul className="list-none p-0 m-0 flex-1">
              <Bullet text="3,000 scans/month" />
              <Bullet text="$0.15/scan overage" />
              <Bullet text="All batch + async features" />
              <Bullet text="Dedicated rate limits" />
              <Bullet text="Usage dashboard" />
            </ul>
            <Link
              href="/signup?plan=scale-api"
              className="block text-center font-ui-label border border-[#00C8FF]/30 text-[#00C8FF] py-3 mt-6 no-underline hover:border-[#00C8FF]/60 transition-colors duration-150"
            >
              Start Scale plan →
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div className="landing-card-electric border border-background-border bg-background-subtle p-6 flex flex-col">
            <div className="font-ui-label text-text-secondary mb-4">ENTERPRISE</div>
            <div className="font-score text-4xl text-text-secondary mb-1">Custom</div>
            <div className="font-mono text-xs text-text-secondary mb-6">&nbsp;</div>
            <ul className="list-none p-0 m-0 flex-1">
              <Bullet text="Volume pricing from $0.11/scan" />
              <Bullet text="SLA guarantee" />
              <Bullet text="Custom rate limits" />
              <Bullet text="Dedicated support" />
              <Bullet text="Invoice billing" />
            </ul>
            <Link
              href="mailto:hello@webdocai.com"
              className="block text-center font-ui-label text-text-secondary py-3 mt-6 no-underline hover:text-text-primary transition-colors duration-150"
            >
              Talk to us →
            </Link>
          </div>

        </div>
      </section>

      {/* ── 4. Key facts grid ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 pb-16">
        <div className="section-label text-center mb-8">{"WHAT'S INCLUDED"}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KEY_FACTS.map(fact => (
            <div
              key={fact.name}
              className="border border-background-border bg-background-subtle p-6"
            >
              <div className="font-ui-label text-text-secondary mb-3">{fact.name}</div>
              <p
                className="font-body text-text-primary mb-2"
                style={{ fontFamily: 'var(--font-stack-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}
              >
                {fact.value}
              </p>
              <p
                className="text-text-secondary"
                style={{ fontFamily: 'var(--font-stack-sans)', fontSize: 13, lineHeight: 1.65 }}
              >
                {fact.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Two CTA buttons ───────────────────────────────────────────────── */}
      <section className="py-16 text-center">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/playground"
            className="font-ui-label border border-[#00C8FF]/30 text-[#00C8FF] px-6 py-3 no-underline hover:border-[#00C8FF]/60 transition-colors duration-150"
          >
            Try the playground →
          </Link>
          <Link
            href="/docs/api"
            className="font-ui-label text-text-secondary px-6 py-3 no-underline hover:text-text-primary transition-colors duration-150"
          >
            Read the docs →
          </Link>
        </div>
        <p className="font-mono text-xs mt-4" style={{ color: '#3A3A52' }}>
          No credit card required to start.
        </p>
      </section>

      {/* ── 6. FAQ accordion ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-8 pb-16">
        <div className="section-label text-center mb-12">DEVELOPER FAQ</div>

        {FAQS.map((faq, i) => (
          <div key={i} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex justify-between items-center py-4 cursor-pointer bg-transparent border-0 text-left gap-4"
            >
              <span
                className="font-body font-semibold"
                style={{ fontSize: 15, color: 'var(--text-primary)' }}
              >
                {faq.q}
              </span>
              <span
                className="flex-shrink-0 text-text-secondary transition-transform duration-200"
                style={{ display: 'inline-block', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>
            {openFaq === i && (
              <p
                className="pb-4 leading-relaxed"
                style={{ fontFamily: 'var(--font-stack-sans)', fontSize: 14, color: '#8E8EA0' }}
              >
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ── 7. Footer routing band ───────────────────────────────────────────── */}
      <div
        className="border-t py-6 text-center"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <p className="font-body text-sm" style={{ color: '#3A3A52' }}>
          Need a dashboard?{' '}
          <Link
            href="/pricing"
            className="no-underline hover:opacity-80 transition-opacity"
            style={{ color: '#00C8FF' }}
          >
            See agency plans →
          </Link>
        </p>
      </div>

    </main>
  )
}
