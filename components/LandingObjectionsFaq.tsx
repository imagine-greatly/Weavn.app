// Former homepage "The questions that come up." objections FAQ — removed from /
// in the fork-first redesign. Kept intact for reuse on the founder/developer
// deep pages in a later session.

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

const OBJECTION_CARDS = [
  {
    q: "How do I know it's not hallucinating?",
    a: "Every finding must cite specific visible content — what's present, absent, or misplaced on your actual page. The model cannot pass a check without grounding it in evidence. Findings that fail validation are dropped before they reach you.",
    data: 'grounding rule: cite visible content or fail',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Why not just paste my URL into ChatGPT?',
    a: 'A language model sees text you paste, not your live page. Weavn renders the full DOM in headless Chrome, reads above-the-fold layout, runs 307 structured checks, and returns ranked JSON — not a chat response.',
    data: '307 checks · rendered DOM · not a chat response',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Are the lift numbers real or made up?',
    a: "Lift estimates are calibrated against a corpus of audited pages with known conversion data. Each check has an expected impact range based on real comparisons. The number is an estimate — not a guarantee — but it's grounded, not invented.",
    data: 'calibrated from corpus · p50 top-fix lift: +8%',
    dataColor: '#00C48C',
  },
  {
    q: 'Will it understand my site?',
    a: 'Weavn classifies your site type — SaaS, e-commerce, agency, creator — then applies the relevant check subset. A Shopify product page and a SaaS pricing page get different diagnostics. Classification runs automatically.',
    data: 'site types: SaaS · e-comm · agency · creator',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What do I actually do with the results?',
    a: 'Findings are ranked by estimated conversion uplift. Fix the highest-priority ones first. Each includes evidence, a concrete fix, and drop-in replacement copy. Most teams ship the top three improvements in an afternoon.',
    data: 'avg fix time for top 3: ~4hrs · copy included',
    dataColor: '#00C48C',
  },
  {
    q: 'Can you even scan my site?',
    a: "If it's publicly accessible, yes. Weavn renders the live page in headless Chrome with stealth mode enabled. Works on Next.js, Webflow, Squarespace, Shopify, WordPress, and custom stacks. Sites behind login walls cannot be scanned.",
    data: 'requires: public URL · no login walls',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What does it cost?',
    a: 'Three scans per month free, no account required. Pay-per-scan starts at $0.25. Subscription plans from $49/month. Cache hits on the same URL within 24 hours are always free regardless of plan.',
    data: '3 free/mo · from $0.25/scan · cache free',
    dataColor: '#00C48C',
  },
  {
    q: 'Can I use it for client work?',
    a: 'Yes. The Agency plan includes client workspaces, white-label report links, and 100 bundled API calls per month. Reports carry no Weavn branding. Scan any publicly accessible client URL and send them the link.',
    data: 'agency: $149/mo · white-label · API bundled',
    dataColor: '#6F9BC6',
  },
] as const

export default function LandingObjectionsFaq() {
  return (
    <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden' }}>
      {/* ambient bloom */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 800px 500px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 65%)' }} />
      {/* corner ticks */}
      <div style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.18)', borderLeft: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.18)', borderRight: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.18)', borderLeft: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.18)', borderRight: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#6F9BC6', marginBottom: 16 }}>OBJECTIONS</div>
          <h2 style={{ ...DISP, fontSize: 36, fontWeight: 700, color: '#E6E9EE', margin: 0, lineHeight: 1.2 }}>The questions that come up.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OBJECTION_CARDS.map((card) => (
            <div
              key={card.q}
              style={{
                background: '#0A0E18',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                padding: '22px 24px',
              }}
            >
              <p style={{ ...DISP, fontWeight: 600, fontSize: 16, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.35 }}>
                {card.q}
              </p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.65, margin: '0 0 12px' }}>
                {card.a}
              </p>
              <p style={{ ...MONO, fontSize: 11, color: card.dataColor, margin: 0 }}>
                {card.data}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
