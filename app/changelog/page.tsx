import Label from '@/components/ui/Label'

type Tag = 'NEW' | 'IMPROVED' | 'FIX' | 'API'

const TAG_STYLE: Record<Tag, string> = {
  NEW:      'bg-[rgba(0,230,118,0.1)] border border-[rgba(0,230,118,0.3)] text-[#00E676]',
  IMPROVED: 'bg-[rgba(0,200,255,0.08)] border border-[rgba(0,200,255,0.25)] text-[#00C8FF]',
  FIX:      'bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.3)] text-[#F5A623]',
  API:      'bg-[rgba(74,158,255,0.1)] border border-[rgba(74,158,255,0.3)] text-[#4A9EFF]',
}

interface Entry {
  date: string
  tags: Tag[]
  title: string
  body: string
  bullets?: string[]
}

const ENTRIES: Entry[] = [
  {
    date: 'JUN 14, 2026',
    tags: ['API', 'IMPROVED'],
    title: 'v1 API response contract locked',
    body: 'The v1 scan response shape is now frozen and identical across the engine and every doc surface, so integrations can build against one stable schema.',
    bullets: [
      'Per-finding priority is a plain 1-based integer rank (1 = highest leverage); "P1"-style labels are derived as "P" + priority, never stored',
      'Removed the derived impact_tier and priority_rank finding fields',
      'Top-level verdict replaces top-level severity — a 5-band quality scale: Poor, Needs Work, Fair, Good, Excellent',
      'Per-finding severity stays a 4-value enum: critical, high, medium, low',
      'findings_summary is now a single integer count, not a triage object',
      'Error codes standardized: BOT_BLOCKED for bot-protected URLs, RATE_LIMITED on 429, and TRIAL_EXHAUSTED moved to 402',
    ],
  },
  {
    date: 'JUN 7, 2026',
    tags: ['NEW', 'IMPROVED'],
    title: 'Scanning pipeline — complete state',
    body: '307 checks across 27 categories fully deployed. Site-type gating, weighted scoring, strengths output, dimension benchmarking, finding priority scores, and page-type enforcement all live.',
    bullets: [
      '307 checks across 27 categories — commit 05d90af',
      'Site-type gating: universal, saas, ecommerce, service, b2b, creator, local',
      'Weighted scoring by site type and buyer complexity — 7 named profiles',
      'Strengths output — top passing checks with specific visible evidence',
      'Dimension benchmarking with percentile labels',
      'Finding priority scores: P1 fix this week, P2 fix this month, P3 when you can',
      'fix_effort and impact_tier on every finding',
      'findings_summary triage object in response',
      'Page-type enforcement in Sonnet prompt',
      'DIFF_ expanded to 12 checks',
      'SPEC_ expanded to 10 checks',
      'MSG_, NAV_, PSY_, CONV_, TRUST_, CTA_, RET_, EMAIL_, PAGE_, NARR_ all expanded',
      'Webhook retry: 3 attempts, 10s timeout, structured failure logging',
      'Rate limit headers on all API responses',
      'Normalized error shape via apiError()',
      '/pricing rebuilt as dashboard-only — PLANS in nav',
      '/developers built as API pricing page',
      '/product built as combined product and how-it-works page',
    ],
  },
  {
    date: 'JUN 5, 2026',
    tags: ['IMPROVED'],
    title: '307 diagnostic checks across 27 categories',
    body: 'Rubric expanded to 307 checks across 27 categories. Cleaned duplicate checks, merged Emotional Sequence into Narrative Flow, rebuilt thin categories (Return Visitor, Conversion Path, Offer Clarity), and expanded Page Speed, Accessibility, Mobile, SaaS, Checkout, and Email to 12 checks each.',
  },
  {
    date: 'JUN 3, 2026',
    tags: ['NEW', 'API'],
    title: 'Website Intelligence API — public launch',
    body: 'Weavn is now available as a fully documented API. POST any URL, get back a structured conversion audit in JSON.',
    bullets: [
      'POST /api/v1/scan — single URL scan',
      'POST /api/v1/scan/batch — up to 10 URLs',
      'GET /api/v1/scans — list and retrieve scans',
      'Async mode with webhook delivery',
      'Dynamic field selection',
      'Industry benchmarking across 9 categories',
    ],
  },
  {
    date: 'MAY 28, 2026',
    tags: ['NEW'],
    title: 'Agency dashboard — client workspaces and white-label reports',
    body: 'Agencies can now manage unlimited client workspaces, generate white-label report links, and track score trends per client.',
  },
  {
    date: 'MAY 20, 2026',
    tags: ['IMPROVED'],
    title: '260+ diagnostic checks — early rubric',
    body: 'Expanded the diagnostic rubric with new checks across narrative flow, emotional resonance, offer clarity, and specificity scoring.',
  },
  {
    date: 'MAY 12, 2026',
    tags: ['IMPROVED', 'API'],
    title: 'Fingerprint-based cache invalidation',
    body: 'Scans are now cached by content fingerprint, not URL. Re-scanning a URL after significant content changes triggers a fresh scan automatically.',
  },
  {
    date: 'MAY 1, 2026',
    tags: ['NEW'],
    title: 'Industry benchmarking',
    body: 'Every scan now includes a benchmark comparison — your score against the industry average and top quartile for your category. Supports B2B SaaS, ecommerce, agencies, coaches, and more.',
  },
]

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background-base">
      <div className="mx-auto max-w-[720px] px-8 py-24">

        <Label>CHANGELOG</Label>
        <h1 className="font-display font-bold text-4xl text-text-primary tracking-tight mt-3 mb-4">
          What&apos;s new.
        </h1>
        <p className="font-body text-base text-text-secondary">
          Updates, improvements, and fixes to the Weavn API and dashboard.
        </p>

        <div className="mt-16">
          {ENTRIES.map((entry, i) => (
            <div
              key={i}
              className={`relative pl-6 py-10 border-l-2 border-[#111827] ${
                i < ENTRIES.length - 1 ? 'border-b border-[#111827]' : ''
              }`}
            >
              {/* Timeline dot */}
              <div
                className="absolute rounded-full"
                style={{ left: -5, top: 6, width: 10, height: 10, backgroundColor: '#00C8FF' }}
              />

              <div className="flex items-center gap-4 mb-6">
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">
                  {entry.date}
                </span>
                {entry.tags.map(tag => (
                  <span
                    key={tag}
                    className={`font-ui-label px-2 py-0.5 ${TAG_STYLE[tag]}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h2 className="font-display font-bold text-xl text-text-primary mb-3">
                {entry.title}
              </h2>

              <p className="font-body text-sm text-text-secondary leading-relaxed">
                {entry.body}
              </p>

              {entry.bullets && (
                <div className="mt-4 pl-4 border-l border-[#111827]">
                  {entry.bullets.map((b, j) => (
                    <div key={j} className="mt-2 font-mono text-xs text-text-secondary">
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
