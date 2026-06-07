import Link from 'next/link'

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Hero Section', 'Trust & Credibility', 'CTA & Conversion',
  'Messaging & Clarity', 'Social Proof', 'SEO & Metadata',
  'Navigation & UX', 'Psychology & Persuasion', 'Page & Content Gaps',
  'Offer & Pricing', 'Email & Retention', 'Product Page',
  'Mobile Experience', 'Checkout & Purchase', 'Page Speed & Technical',
  'Competitive Differentiation', 'Specificity & Claims', 'Return & Retention',
  'Accessibility', 'Universal', 'SaaS-Specific',
  'E-commerce', 'Agency & Service', 'Conversion Path',
  'Narrative Flow', 'Objection Handling', 'Offer Clarity',
]

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
              <div>
                <div className="font-score text-4xl" style={{ color: '#00C8FF' }}>307</div>
                <div className="font-ui-label text-[10px] mt-1" style={{ color: '#00C8FF' }}>
                  TOTAL CHECKS
                </div>
              </div>
              <div>
                <div className="font-score text-4xl text-text-primary">27</div>
                <div className="font-ui-label text-[10px] mt-1 text-text-secondary">CATEGORIES</div>
              </div>
              <div>
                <div className="font-score text-4xl text-text-primary">7</div>
                <div className="font-ui-label text-[10px] mt-1 text-text-secondary">
                  DIAGNOSTIC DIMENSIONS
                </div>
              </div>
            </div>
          </div>

          {/* Right: category chips */}
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                className="bg-background-raised border border-background-border px-3 py-2 font-ui-label text-xs text-text-secondary hover:border-[rgba(0,200,255,0.3)] hover:text-text-primary transition-colors duration-150 cursor-default"
              >
                {cat}
              </div>
            ))}
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
                <span className="font-score text-2xl leading-none" style={{ color: '#3A3A52' }}>
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
                <p className="font-ui-label text-xs mb-1" style={{ color: '#00C8FF' }}>
                  {step.label}
                </p>
                <h3 className="font-display font-bold text-lg text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
                {step.code !== null && (
                  <pre
                    className="bg-background-subtle border border-background-border font-mono text-xs p-3 mt-3 overflow-x-auto"
                    style={{ color: '#8E8EA0', whiteSpace: 'pre-wrap' }}
                  >
                    {step.code}
                  </pre>
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
            <div className="font-score text-5xl mb-1" style={{ color: '#00C8FF' }}>61</div>
            <div className="font-ui-label text-xs mb-3 text-text-secondary">
              WEIGHTED OVERALL SCORE
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary">
              0–100. Calibrated to site type and buyer complexity. Benchmarked against corpus.
            </p>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-6">
            <div className="font-score text-5xl mb-1" style={{ color: '#FF8C00' }}>23</div>
            <div className="font-ui-label text-xs mb-3 text-text-secondary">RANKED FINDINGS</div>
            <p className="font-body text-sm leading-relaxed text-text-secondary">
              Sorted P1→P3. Each with severity, fix_effort, impact_tier, and specific evidence from
              the page.
            </p>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-6">
            <div className="font-score text-5xl mb-1" style={{ color: '#00E676' }}>5</div>
            <div className="font-ui-label text-xs mb-3 text-text-secondary">VERIFIED STRENGTHS</div>
            <p className="font-body text-sm leading-relaxed text-text-secondary">
              What&apos;s genuinely working above average. Referenced against specific visible content
              — never padded.
            </p>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-6">
            <div className="font-score text-5xl mb-1" style={{ color: '#00C8FF' }}>7</div>
            <div className="font-ui-label text-xs mb-3 text-text-secondary">
              DIMENSION BENCHMARKS
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
            <div className="font-ui-label text-xs mb-4" style={{ color: '#00C8FF' }}>
              FOR FOUNDERS
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary flex-1">
              Paste your URL. Get a full conversion audit in 90 seconds — score, ranked findings,
              strengths, and how you compare against your category. Free to start.
            </p>
            <div className="mt-8">
              <Link
                href="/scan"
                className="block text-center font-ui-label border border-[#00C8FF]/30 text-[#00C8FF] py-3 no-underline hover:border-[#00C8FF]/60 transition-colors duration-150"
              >
                Scan my site free →
              </Link>
              <p className="font-ui-label text-[10px] text-center mt-2" style={{ color: '#3A3A52' }}>
                Free · No account required
              </p>
            </div>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-8 flex flex-col">
            <div className="font-ui-label text-xs mb-4" style={{ color: '#00C8FF' }}>
              FOR AGENCIES
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary flex-1">
              Run client audits at scale. White-label report links, client workspaces, multi-page
              scanning. Show up to every call with data.
            </p>
            <div className="mt-8">
              <Link
                href="/pricing"
                className="block text-center font-ui-label border border-[#00C8FF]/30 text-[#00C8FF] py-3 no-underline hover:border-[#00C8FF]/60 transition-colors duration-150"
              >
                See agency plans →
              </Link>
              <p className="font-ui-label text-[10px] text-center mt-2" style={{ color: '#3A3A52' }}>
                From $149/mo · 14-day trial
              </p>
            </div>
          </div>

          <div className="landing-card-electric bg-background-raised border border-background-border p-8 flex flex-col">
            <div className="font-ui-label text-xs mb-4" style={{ color: '#00C8FF' }}>
              FOR DEVELOPERS
            </div>
            <p className="font-body text-sm leading-relaxed text-text-secondary flex-1">
              POST a URL, get structured JSON. Batch endpoint, async mode, webhooks. Integrate
              conversion intelligence into your product in an afternoon.
            </p>
            <div className="mt-8">
              <Link
                href="/developers"
                className="block text-center font-ui-label border border-[#00C8FF]/30 text-[#00C8FF] py-3 no-underline hover:border-[#00C8FF]/60 transition-colors duration-150"
              >
                Get API key →
              </Link>
              <p className="font-ui-label text-[10px] text-center mt-2" style={{ color: '#3A3A52' }}>
                $0.15/scan · No monthly fee
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── 6. Final CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-background-raised border-t border-background-border py-16 px-8 text-center">
        <h2
          className="section-headline text-3xl mb-4 mx-auto"
          style={{ letterSpacing: '-0.5px' }}
        >
          See it run on your site.
        </h2>
        <p className="section-subhead mb-8 mx-auto" style={{ fontSize: 16, maxWidth: 420 }}>
          Free scan. No account required. Results in 90 seconds.
        </p>
        <Link
          href="/scan"
          className="landing-cta-button-pulse inline-block font-ui-label py-4 px-8 no-underline hover:opacity-90 transition-opacity duration-150"
          style={{ backgroundColor: '#00C8FF', color: '#050810' }}
        >
          Scan my site →
        </Link>
        <p className="font-ui-label mt-4" style={{ color: '#3A3A52', fontSize: 10 }}>
          307 checks · ~90 seconds · no account required
        </p>
      </section>

    </main>
  )
}
