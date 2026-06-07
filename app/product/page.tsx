import Link from 'next/link'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Stat } from '@/components/ui/Stat'

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
    <main className="bg-background-base min-h-screen">

      {/* ── 1. Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-8 text-center">
        <div className="section-label mb-4">THE ENGINE</div>
        <h1
          className="section-headline mb-6 mx-auto"
          style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1.5px', maxWidth: 900 }}
        >
          307 checks. One structured output.
        </h1>
        <p className="section-subhead max-w-2xl mx-auto">
          webdoc is a conversion audit API. POST any URL, get structured JSON in under 90 seconds.
          Every scan runs 307 diagnostic checks across 27 categories, classified by site type, scored
          against a corpus of real sites.
        </p>
      </section>

      {/* ── 2. Diagnostic Coverage ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="section-label mb-3">DIAGNOSTIC COVERAGE</div>
        <h2
          className="section-headline mb-12"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px' }}
        >
          27 categories. Nothing missed.
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
      </section>

      {/* ── 3. The Pipeline ───────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <div className="section-label mb-3">THE PIPELINE</div>
        <h2
          className="section-headline mb-12"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px' }}
        >
          What happens between POST and response.
        </h2>

        <div>
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.num} className="flex gap-6">

              {/* Left: step number + connector */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                <span
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#6F9BC6',
                    letterSpacing: '0.15em',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </span>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className="flex-1 mt-2"
                    style={{ width: 1, background: '#111827', minHeight: 24 }}
                  />
                )}
              </div>

              {/* Right: content block */}
              <div className="bg-background-raised border border-background-border p-6 mb-4 flex-1">
                <p
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: '#6F9BC6',
                    marginBottom: 4,
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
      </section>

      {/* ── 4. The Output ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <div className="section-label mb-3">WHAT COMES BACK</div>
        <h2
          className="section-headline mb-12"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px' }}
        >
          One response. Every surface covered.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="landing-card-electric bg-background-raised border border-background-border p-6">
            <div className="mb-3">
              <Stat value={61} label="WEIGHTED OVERALL SCORE" verdict="score" />
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary">
              0–100. Calibrated to site type and buyer complexity. Benchmarked against corpus.
            </p>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-6">
            <div className="mb-3">
              <Stat value={23} label="RANKED FINDINGS" verdict="problem-count" />
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary">
              Sorted P1→P3. Each with severity, fix_effort, impact_tier, and specific evidence from
              the page.
            </p>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-6">
            <div className="mb-3">
              <Stat value={5} label="VERIFIED STRENGTHS" verdict="good-count" />
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary">
              What&apos;s genuinely working above average. Referenced against specific visible content
              — never padded.
            </p>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-6">
            <div className="mb-3">
              <Stat value={7} label="DIMENSION BENCHMARKS" verdict="neutral" />
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary">
              Every dimension score positioned against industry average and percentile for your
              site&apos;s vertical.
            </p>
          </div>

        </div>
      </section>

      {/* ── 5. Three Audiences ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="section-label mb-3">WHO USES IT</div>
        <h2
          className="section-headline mb-12"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px' }}
        >
          Same engine. Three interfaces.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="landing-card-electric bg-background-raised border border-background-border p-8 flex flex-col">
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              FOR FOUNDERS
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary flex-1">
              Paste your URL. Get a full conversion audit in 90 seconds — score, ranked findings,
              strengths, and how you compare against your category. Free to start.
            </p>
            <div className="mt-8">
              <Link
                href="/scan"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 13,
                  border: '0.5px solid #00C48C',
                  color: '#00C48C',
                  padding: '12px 0',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                Scan my site free →
              </Link>
              <p
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 11,
                  textAlign: 'center',
                  marginTop: 8,
                  color: '#6E7587',
                }}
              >
                Free · No account required
              </p>
            </div>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-8 flex flex-col">
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              FOR AGENCIES
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary flex-1">
              Run client audits at scale. White-label report links, client workspaces, multi-page
              scanning. Show up to every call with data.
            </p>
            <div className="mt-8">
              <Link
                href="/pricing"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 13,
                  border: '0.5px solid #00C48C',
                  color: '#00C48C',
                  padding: '12px 0',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                See agency plans →
              </Link>
              <p
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 11,
                  textAlign: 'center',
                  marginTop: 8,
                  color: '#6E7587',
                }}
              >
                From $149/mo · 14-day trial
              </p>
            </div>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-8 flex flex-col">
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6E7587',
                marginBottom: 16,
              }}
            >
              FOR DEVELOPERS
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary flex-1">
              POST a URL, get structured JSON. Batch endpoint, async mode, webhooks. Integrate
              conversion intelligence into your product in an afternoon.
            </p>
            <div className="mt-8">
              <Link
                href="/developers"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 13,
                  border: '0.5px solid #00C48C',
                  color: '#00C48C',
                  padding: '12px 0',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                Get API key →
              </Link>
              <p
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 11,
                  textAlign: 'center',
                  marginTop: 8,
                  color: '#6E7587',
                }}
              >
                $0.15/scan · No monthly fee
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── 6. Final CTA ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes scan-cta-pulse {
          0%, 100% { border-color: rgba(0,196,140,0.3); }
          50% { border-color: rgba(0,196,140,0.8); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .scan-cta-pulse { animation: scan-cta-pulse 2s infinite; }
        }
      `}</style>
      <section
        style={{
          backgroundColor: '#0A0E18',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          padding: '64px 32px',
          textAlign: 'center',
        }}
      >
        <h2
          className="font-score"
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: '#E6E9EE',
            marginBottom: 16,
          }}
        >
          See it run on your site.
        </h2>
        <p
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 16,
            color: '#9398A8',
            maxWidth: 420,
            margin: '0 auto 32px',
          }}
        >
          Free scan. No account required. Results in 90 seconds.
        </p>
        <Link
          href="/scan"
          className="scan-cta-pulse"
          style={{
            display: 'inline-block',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 13,
            backgroundColor: '#00C48C',
            color: '#050810',
            padding: '13px 28px',
            textDecoration: 'none',
            border: '2px solid rgba(0,196,140,0.3)',
            transition: 'opacity 0.15s',
          }}
        >
          SCAN MY SITE →
        </Link>
        <p
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            color: '#6E7587',
            marginTop: 16,
          }}
        >
          307 CHECKS · ~90 SECONDS · NO ACCOUNT REQUIRED
        </p>
      </section>

    </main>
  )
}
