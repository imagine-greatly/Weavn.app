import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Weavn — Website Intelligence, Delivered as an API",
  description: "311 checks. One endpoint. Your site scored in 90 seconds. Paste any URL for a full conversion audit — ranked findings, AI-rewritten copy, and vertical benchmarks. Free to start.",
  openGraph: {
    title: "Weavn — Website Intelligence, Delivered as an API",
    description: "311 checks. One endpoint. 90 seconds. Conversion audit API for founders and developers.",
    url: "https://weavn.app",
    siteName: "Weavn",
    type: "website",
    images: [
      {
        url: "https://weavn.app/og/home.png",
        width: 1200,
        height: 630,
        alt: "Weavn — scan engine fork showing founder and developer paths",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weavn — Website Intelligence, Delivered as an API",
    description: "311 checks. One endpoint. 90 seconds. Free to start.",
    images: ["https://weavn.app/og/home.png"],
    creator: "@weavnapp",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://weavn.app",
  },
}

// Removed sections (curl/JSON hero, two-surface cards, corpus stats + bell curve,
// objections FAQ) live in components/LandingCurlHero.tsx, LandingTwoSurface.tsx,
// LandingCorpusStats.tsx, LandingObjectionsFaq.tsx for the founder/developer deep pages.

// ── Nav ─────────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] bg-background-base/90 backdrop-blur-md border-b border-background-border flex items-center px-8">
      <div className="flex items-center gap-8 flex-1">
        <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
          Weavn<span className="text-[#6F9BC6]"></span>
        </Link>
        <div className="flex items-center gap-6">
          {['Pricing', 'Developers', 'Docs', 'Changelog'].map(link => (
            <Link
              key={link}
              href={`/${link.toLowerCase()}`}
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 no-underline"
            >
              {link}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-body text-sm text-text-secondary no-underline hover:text-text-primary transition-colors duration-150">
          Scan my site
        </Link>
        <Link
          href="/auth?surface=dashboard"
          className="border border-background-border font-body text-sm text-text-secondary px-4 py-1.5 no-underline hover:text-text-primary hover:border-text-tertiary transition-colors duration-150"
        >
          Dashboard →
        </Link>
        <Link
          href="/auth?surface=api"
          className="font-body font-semibold text-sm px-4 py-1.5 no-underline transition-all duration-150"
          style={{ background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', color: '#6F9BC6' }}
        >
          Get API key →
        </Link>
      </div>
    </nav>
  )
}

// ── Hero — the scan-engine fork ──────────────────────────────────────────────

// Door cards sit in an UNEQUAL grid inside the 880px container (1.6fr / 1fr,
// gap 24px) so the API door reads as primary. Card top-centers land at x≈263
// (API door — wider, left) and x≈715 (dashboard door — narrower, right).
const FORK_LEFT_PATH = 'M 440 0 C 440 40 263 80 263 110'
const FORK_RIGHT_PATH = 'M 440 0 C 440 40 715 80 715 110'

// Dashboard (non-technical) door — secondary, kept short and quiet.
const FOUNDER_LINES = [
  'Plain-English fixes, ranked by conversion impact',
  'Free to start — no account, no code',
]

// API/developer door — primary, carries more detail than the dashboard door.
const DEVELOPER_LINES = [
  'POST any URL → structured JSON in ~90s',
  'Batch endpoint, async mode, webhooks',
  'Typed SDKs and copy-paste examples',
  '25 free scans, no subscription',
]

function HeroForkSection() {
  return (
    <section className="scanline-texture pt-[110px] pb-20 px-8 relative overflow-visible">
      <style>{`
        .fork-pulse { display: none; }
        @media (prefers-reduced-motion: no-preference) {
          .fork-pulse { display: initial; }
          .hero-bloom       { animation: bloom-breathe 8s ease-in-out infinite; }
          .engine-glyph     { animation: engine-breathe 3s ease-in-out infinite; }
          .branch-path      { stroke-dasharray: 1000; stroke-dashoffset: 1000;
                              animation: branch-draw-hp 1.4s cubic-bezier(0.4,0,0.2,1) 0.4s forwards; }
          @keyframes branch-draw-hp {
            to { stroke-dashoffset: 0; }
          }
          .door-card-l      { animation: card-rise 0.6s ease-out 0.25s both; }
          .door-card-r      { animation: card-rise 0.6s ease-out 0.45s both; }
          .door-card-founder:hover {
            box-shadow: 0 0 40px rgba(111,155,198,0.1), inset 0 1px 0 rgba(111,155,198,0.15);
            transition: box-shadow 0.35s ease;
          }
          .door-card-developer:hover {
            box-shadow: 0 0 40px rgba(157,140,255,0.1), inset 0 1px 0 rgba(157,140,255,0.15);
            transition: box-shadow 0.35s ease;
          }
          .door-cta-founder:hover  { box-shadow: 0 0 24px rgba(111,155,198,0.25); }
          .door-cta-developer:hover { box-shadow: 0 0 24px rgba(157,140,255,0.25); }
        }
      `}</style>

      {/* Hero bloom — 800×600 steel-blue radial at top-center, bleeds into section below */}
      <div
        aria-hidden
        className="hero-bloom"
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 600,
          background: 'radial-gradient(ellipse at center, rgba(111,155,198,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Corner ticks */}
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.15)', borderLeft: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.15)', borderRight: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.15)', borderLeft: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.15)', borderRight: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />

      <div className="relative z-10 max-w-[880px] mx-auto">

        {/* Headline */}
        <h1 className="font-display font-extrabold text-center text-[clamp(28px,4.4vw,48px)] leading-[1.06] tracking-[-0.04em] text-text-primary m-0">
          Website intelligence, delivered as an API.
        </h1>
        <h2 className="font-display font-bold text-center text-[clamp(18px,3.0vw,36px)] leading-[1.1] tracking-[-0.035em] text-text-primary/70 m-0">
          311 checks. One endpoint. 90 seconds.
        </h2>

        {/* Subhead */}
        <p className="font-body text-lg text-text-secondary leading-relaxed text-center max-w-[600px] mx-auto mt-5 mb-0">
          POST any URL. Get a report back in 90 seconds — a 0–100 score, ranked fixes, AI-rewritten copy, and percentile benchmarks.
        </p>

        {/* Scan-engine glyph */}
        <div className="flex flex-col items-center mt-12">
          <div className="engine-glyph" style={{ display: 'inline-block' }}>
            <img src="/weavn-logo.svg" alt="" width={150} height={139} style={{ display: 'block', flexShrink: 0, objectFit: 'contain' }} />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-interactive/60 mt-3 mb-0">THE SCAN ENGINE</p>
        </div>

        {/* Fork connectors — wide inverted Y (md+) */}
        <svg className="hidden md:block w-full mt-2" viewBox="0 0 880 110" height="110" aria-hidden>
          {/* Left branch → API door (purple, primary); right branch → dashboard door (steel) */}
          <path className="branch-path" d={FORK_LEFT_PATH} stroke="var(--data-impact)" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path className="branch-path" d={FORK_RIGHT_PATH} stroke="var(--interactive)" strokeWidth="1.5" fill="none" opacity="0.5" style={{ animationDelay: '0.55s' }} />
          <g className="fork-pulse">
            <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--data-impact)" opacity="0.45">
              <animateMotion dur="2.2s" repeatCount="indefinite" path={FORK_LEFT_PATH} />
            </rect>
            <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--interactive)" opacity="0.45">
              <animateMotion dur="2.2s" repeatCount="indefinite" path={FORK_RIGHT_PATH} />
            </rect>
          </g>
        </svg>

        {/* Below md — single short vertical connector to the first (primary API) door */}
        <div className="flex md:hidden justify-center mt-2 mb-0">
          <svg width="8" height="56" viewBox="0 0 8 56" aria-hidden>
            <line x1="4" y1="0" x2="4" y2="48" stroke="var(--data-impact)" strokeWidth="1.5" opacity="0.5" />
            <g className="fork-pulse">
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--data-impact)" opacity="0.45">
                <animateMotion dur="2.2s" repeatCount="indefinite" path="M 4 0 L 4 48" />
              </rect>
            </g>
          </svg>
        </div>

        {/* Surface split — deliberately unequal: API door primary (purple, wider,
            first), dashboard door secondary (steel, narrower, quieter). */}
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6 items-start">

          {/* Developers door — PRIMARY, pale purple, wider, the obvious path */}
          <div className="door-card-l door-card-developer bg-surface border border-background-border border-t-data-impact/40 flex flex-col p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-data-impact m-0 mb-3">FOR DEVELOPERS</p>
            <h2 className="font-display font-bold text-[28px] leading-[1.1] text-text-primary m-0 mb-3">Build with the data</h2>
            <p className="font-body text-sm text-text-secondary leading-relaxed m-0 mb-5">
              The same engine behind the reports, exposed as one endpoint — wire conversion intelligence straight into your stack.
            </p>

            {/* Endpoint snippet — detail the dashboard door doesn't carry */}
            <div className="font-mono text-[11px] leading-relaxed border border-data-impact/20 bg-data-impact/5 p-3 mb-5">
              <span className="text-data-impact">POST</span> <span className="text-text-secondary">/v1/scan</span><br />
              <span className="text-text-tertiary">{`{ "url": "https://yoursite.com" }`}</span><br />
              <span className="text-text-tertiary">→ 0–100 score · ranked findings · JSON</span>
            </div>

            <div className="flex-1">
              {DEVELOPER_LINES.map(line => (
                <p key={line} className="font-body text-sm text-text-secondary leading-relaxed m-0 mb-2">· {line}</p>
              ))}
            </div>
            <Link
              href="/developers"
              className="door-cta-developer font-mono text-xs font-semibold text-background-base bg-data-impact px-6 py-3.5 block text-center no-underline mt-6 transition-shadow duration-300"
            >
              Explore the API →
            </Link>
          </div>

          {/* Founders door — SECONDARY, steel blue, narrower, quieter (still a full path) */}
          <div className="door-card-r door-card-founder bg-surface border border-background-border border-t-interactive/40 flex flex-col p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-interactive m-0 mb-3">FOR FOUNDERS &amp; TEAMS</p>
            <h2 className="font-display font-bold text-xl leading-tight text-text-primary m-0 mb-3">See exactly what to fix</h2>
            <p className="font-body text-sm text-text-secondary leading-relaxed m-0 mb-4">
              The same engine, rendered visually — no code required.
            </p>
            <div className="flex-1">
              {FOUNDER_LINES.map(line => (
                <p key={line} className="font-body text-sm text-text-secondary leading-relaxed m-0 mb-2">· {line}</p>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="door-cta-founder font-mono text-xs text-interactive border border-interactive/30 px-5 py-2.5 block text-center no-underline mt-6 transition-colors duration-200 hover:border-interactive/60"
            >
              Scan my site →
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Trust strip ──────────────────────────────────────────────────────────────

// TODO: make corpus stats dynamic from a DB/API call (corpus_size: 4812, avg_score: 58, pct_missing_above_fold_proof: 76)
function TrustStrip() {
  return (
    <section className="border-y border-background-border py-4 px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-interactive text-center m-0">
        4,812 SITES SCANNED · AVG SCORE 58 · 76% MISSING ABOVE-FOLD PROOF · CORPUS UPDATED WEEKLY
      </p>
    </section>
  )
}

// ── Objection pair ────────────────────────────────────────────────────────────
// Copy lifted verbatim from components/LandingObjectionsFaq.tsx (cards 1–2).

const OBJECTION_PAIR = [
  {
    q: "How do I know it's not hallucinating?",
    a: "Every finding must cite specific visible content — what's present, absent, or misplaced on your actual page. The model cannot pass a check without grounding it in evidence. Findings that fail validation are dropped before they reach you.",
    data: 'grounding rule: cite visible content or fail',
  },
  {
    q: 'Why not just paste my URL into ChatGPT?',
    a: 'A language model sees text you paste, not your live page. Weavn renders the full DOM in headless Chrome, reads above-the-fold layout, runs 311 structured checks, and returns ranked JSON — not a chat response.',
    data: '311 checks · rendered DOM · not a chat response',
  },
]

function ObjectionPairSection() {
  return (
    <section className="py-16 px-8">
      <div className="max-w-[880px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {OBJECTION_PAIR.map(card => (
          <div key={card.q} className="bg-surface border border-background-border p-7">
            <p className="font-display font-semibold text-base text-text-primary leading-snug m-0 mb-3">{card.q}</p>
            <p className="font-body text-sm text-text-secondary leading-relaxed m-0 mb-3">{card.a}</p>
            <p className="font-mono text-[11px] text-interactive m-0">{card.data}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer className="border-t border-background-border bg-background-raised">
      <div className="max-w-[1280px] mx-auto px-8 py-12 grid grid-cols-4 gap-8">
        <div>
          <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
            Weavn<span className="text-[#6F9BC6]"></span>
          </Link>
          <p className="font-body text-sm text-text-secondary mt-3 max-w-xs leading-relaxed">
            The conversion audit API. 311 checks, ranked fixes, AI-rewritten copy. One endpoint.
          </p>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">PRODUCT</div>
          {['Playground', 'Pricing', 'Docs', 'Changelog'].map(l => (
            <Link
              key={l}
              href={`/${l.toLowerCase()}`}
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline"
            >
              {l}
            </Link>
          ))}
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">GET STARTED</div>
          <Link href="/dashboard" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-3 no-underline">Scan my site free →</Link>
          <Link href="/dashboard" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-3 no-underline">Agency plans →</Link>
          <Link href="/auth?surface=api" className="font-body text-sm text-[#6F9BC6] hover:opacity-80 block mb-3 no-underline">Get API key →</Link>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">RESOURCES</div>
          <Link href="/playground" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">API Playground →</Link>
          <Link href="/docs/api" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">API Reference →</Link>
          <Link href="/changelog" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">Changelog →</Link>
          <a href="https://status.weavn.app" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline" target="_blank" rel="noopener noreferrer">Status →</a>
        </div>
      </div>
      <div className="border-t border-background-border">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex justify-between items-center">
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
          <span className="font-mono text-xs text-text-tertiary">Status · Privacy · Terms</span>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-background-base min-h-screen">
      <NavBar />
      <HeroForkSection />
      <TrustStrip />
      <ObjectionPairSection />
      <FooterSection />
    </main>
  )
}
