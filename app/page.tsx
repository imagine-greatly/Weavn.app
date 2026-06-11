import Link from 'next/link'
import WebdocMark from '@/components/ui/WebdocMark'

// Removed sections (curl/JSON hero, two-surface cards, corpus stats + bell curve,
// objections FAQ) live in components/LandingCurlHero.tsx, LandingTwoSurface.tsx,
// LandingCorpusStats.tsx, LandingObjectionsFaq.tsx for the founder/developer deep pages.

// ── Nav ─────────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] bg-background-base/90 backdrop-blur-md border-b border-background-border flex items-center px-8">
      <div className="flex items-center gap-8 flex-1">
        <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
          webdoc<span className="text-[#6F9BC6]">.ai</span>
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

// Door cards sit in a 2-col grid inside the 880px container (gap 24px), so the
// card top-centers land at x≈214 and x≈666 in the 880-wide viewBox.
const FORK_LEFT_PATH = 'M 440 0 C 440 38 330 52 214 102'
const FORK_RIGHT_PATH = 'M 440 0 C 440 38 550 52 666 102'

const FOUNDER_LINES = [
  'Plain-English fixes, ranked by conversion impact',
  'Visual report with your score and benchmarks',
  'Free to start — no account, no code',
]

const DEVELOPER_LINES = [
  'POST any URL → structured JSON in ~90s',
  'Batch endpoint, async mode, webhooks',
  '25 free scans, no subscription',
]

function HeroForkSection() {
  return (
    <section className="scanline-texture pt-[110px] pb-20 px-8 relative overflow-hidden">
      <style>{`
        .fork-pulse { display: none; }
        @media (prefers-reduced-motion: no-preference) {
          .fork-pulse { display: initial; }
        }
      `}</style>

      {/* Ambient bloom */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: 'radial-gradient(ellipse 1000px 700px at 50% 28%, rgba(111,155,198,0.05) 0%, transparent 60%)',
        }}
      />
      {/* Corner ticks */}
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.15)', borderLeft: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.15)', borderRight: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.15)', borderLeft: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.15)', borderRight: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />

      <div className="relative z-10 max-w-[880px] mx-auto">

        {/* Headline */}
        <h1 className="font-display font-extrabold text-center text-[clamp(38px,5.5vw,64px)] leading-[1.06] tracking-[-0.04em] text-text-primary m-0">
          The conversion audit API.
        </h1>

        {/* Subhead */}
        <p className="font-body text-lg text-text-secondary leading-relaxed text-center max-w-[600px] mx-auto mt-5 mb-0">
          Paste any URL. Get a 0–100 score, 307 ranked findings, AI-rewritten copy, and corpus benchmarks — in about 90 seconds. No account required.
        </p>

        {/* Scan-engine glyph */}
        <div className="flex flex-col items-center mt-12">
          <WebdocMark size={150} />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-interactive/60 mt-3 mb-0">THE SCAN ENGINE</p>
        </div>

        {/* Fork connectors — wide inverted Y (md+) */}
        <svg className="hidden md:block w-full mt-2" viewBox="0 0 880 110" height="110" aria-hidden>
          <path d={FORK_LEFT_PATH} stroke="var(--interactive)" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d={FORK_RIGHT_PATH} stroke="var(--engine-developers)" strokeWidth="1.5" fill="none" opacity="0.5" />
          <rect x="211" y="99" width="6" height="6" fill="var(--interactive)" />
          <rect x="663" y="99" width="6" height="6" fill="var(--engine-developers)" />
          <g className="fork-pulse">
            <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--interactive)" opacity="0.45">
              <animateMotion dur="2.2s" repeatCount="indefinite" path={FORK_LEFT_PATH} />
            </rect>
            <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--engine-developers)" opacity="0.45">
              <animateMotion dur="2.2s" repeatCount="indefinite" path={FORK_RIGHT_PATH} />
            </rect>
          </g>
        </svg>

        {/* Below md — single short vertical connector to the first door */}
        <div className="flex md:hidden justify-center mt-2 mb-0">
          <svg width="8" height="56" viewBox="0 0 8 56" aria-hidden>
            <line x1="4" y1="0" x2="4" y2="48" stroke="var(--interactive)" strokeWidth="1.5" opacity="0.5" />
            <rect x="1" y="48" width="6" height="6" fill="var(--interactive)" />
            <g className="fork-pulse">
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--interactive)" opacity="0.45">
                <animateMotion dur="2.2s" repeatCount="indefinite" path="M 4 0 L 4 48" />
              </rect>
            </g>
          </svg>
        </div>

        {/* Door cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Founders door — steel blue */}
          <div className="bg-surface border border-background-border border-t-interactive/40 flex flex-col p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-interactive m-0 mb-3">FOR FOUNDERS &amp; TEAMS</p>
            <h2 className="font-display font-bold text-2xl leading-tight text-text-primary m-0 mb-4">See exactly what to fix</h2>
            <div className="flex-1">
              {FOUNDER_LINES.map(line => (
                <p key={line} className="font-body text-sm text-text-secondary leading-relaxed m-0 mb-2">· {line}</p>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="font-mono text-xs text-interactive border border-interactive/50 px-6 py-3 block text-center no-underline mt-6"
            >
              Scan my site free →
            </Link>
          </div>

          {/* Developers door — green */}
          <div className="bg-surface border border-background-border border-t-engine-developers/40 flex flex-col p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-engine-developers m-0 mb-3">FOR DEVELOPERS</p>
            <h2 className="font-display font-bold text-2xl leading-tight text-text-primary m-0 mb-4">Build with the data</h2>
            <div className="flex-1">
              {DEVELOPER_LINES.map(line => (
                <p key={line} className="font-body text-sm text-text-secondary leading-relaxed m-0 mb-2">· {line}</p>
              ))}
            </div>
            <Link
              href="/auth?surface=api"
              className="font-mono text-xs text-engine-developers border border-engine-developers/50 px-6 py-3 block text-center no-underline mt-6"
            >
              Get API key →
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Trust strip ──────────────────────────────────────────────────────────────

function TrustStrip() {
  return (
    <section className="border-y border-background-border py-4 px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-interactive text-center m-0">
        307 CHECKS · GROUNDED IN VISIBLE CONTENT · NO SYNTHETIC DATA · BENCHMARKED BY VERTICAL
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
    a: 'A language model sees text you paste, not your live page. webdoc renders the full DOM in headless Chrome, reads above-the-fold layout, runs 307 structured checks, and returns ranked JSON — not a chat response.',
    data: '307 checks · rendered DOM · not a chat response',
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
            webdoc<span className="text-[#6F9BC6]">.ai</span>
          </Link>
          <p className="font-body text-sm text-text-secondary mt-3 max-w-xs leading-relaxed">
            The conversion audit API. 307 checks, ranked findings, AI-rewritten copy. One endpoint.
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
          <a href="https://status.webdocai.com" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline" target="_blank" rel="noopener noreferrer">Status →</a>
        </div>
      </div>
      <div className="border-t border-background-border">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex justify-between items-center">
          <span className="font-mono text-xs text-text-tertiary">© 2026 webdoc.ai</span>
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
    <main className="bg-background-base min-h-screen instrument-grid">
      <NavBar />
      <HeroForkSection />
      <TrustStrip />
      <ObjectionPairSection />
      <FooterSection />
    </main>
  )
}
