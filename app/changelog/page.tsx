import Label from '@/components/ui/Label'

type Tag = 'NEW' | 'IMPROVED' | 'FIX' | 'API'

const TAG_STYLE: Record<Tag, string> = {
  NEW:      'bg-cyan-dim border border-cyan text-cyan',
  IMPROVED: 'bg-score-high/10 text-score-high border border-score-high/20',
  FIX:      'bg-severity-high/10 text-severity-high border border-severity-high/20',
  API:      'bg-background-raised border border-background-border text-text-tertiary',
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
    date: 'JUN 3, 2026',
    tags: ['NEW', 'API'],
    title: 'Website Intelligence API — public launch',
    body: 'webdoc is now available as a fully documented API. POST any URL, get back a structured conversion audit in JSON.',
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
    date: 'JUN 5, 2026',
    tags: ['IMPROVED'],
    title: '264 diagnostic checks across 27 categories',
    body: 'Rubric expanded to 264 checks across 27 categories. Cleaned duplicate checks, merged Emotional Sequence into Narrative Flow, rebuilt thin categories (Return Visitor, Conversion Path, Offer Clarity), and expanded Page Speed, Accessibility, Mobile, SaaS, Checkout, and Email to 12 checks each.',
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
    title: '260+ diagnostic checks across 9 dimensions',
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
          Updates, improvements, and fixes to the webdoc API and dashboard.
        </p>

        <div className="mt-16">
          {ENTRIES.map((entry, i) => (
            <div
              key={i}
              className={`py-10 ${i < ENTRIES.length - 1 ? 'border-b border-background-border' : ''}`}
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-widest">
                  {entry.date}
                </span>
                {entry.tags.map(tag => (
                  <span
                    key={tag}
                    className={`font-mono text-xs px-2 py-0.5 ${TAG_STYLE[tag]}`}
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
                <div className="mt-4 pl-4 border-l border-background-border">
                  {entry.bullets.map((b, j) => (
                    <div key={j} className="mt-2 font-body text-sm text-text-secondary leading-relaxed">
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
