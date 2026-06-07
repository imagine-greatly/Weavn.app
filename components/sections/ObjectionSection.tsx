const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

const OBJECTIONS = [
  {
    q: 'Is this just a Lighthouse score?',
    a: 'Lighthouse measures page speed and technical performance. webdoc measures conversion — whether your headline drives action, whether your proof is above the fold, whether your CTA creates clarity or confusion. Different instrument entirely.',
    label: 'checks focused on conversion:',
    value: '307',
    valueColor: '#00C48C',
  },
  {
    q: 'Are the findings fabricated by AI?',
    a: 'Every finding must cite specific visible content on the page — what\'s present, what\'s absent, what\'s misplaced. The model cannot pass a check without referencing the actual page. Hallucinated findings fail validation and are dropped.',
    label: 'grounding rule:',
    value: 'cite visible content or fail',
    valueColor: '#00C48C',
  },
  {
    q: 'Will it work on my stack?',
    a: 'webdoc renders the full live page using headless Chrome with JavaScript execution complete before analysis begins. We see exactly what a real visitor sees — not raw HTML. Framework, CMS, or custom build: if a browser can load it, we can scan it.',
    label: 'renderer:',
    value: 'headless Chrome · stealth mode',
    valueColor: '#6F9BC6',
  },
  {
    q: 'How accurate are the findings?',
    a: 'Findings are ranked by estimated conversion uplift, not severity alone. Each one includes the specific evidence from your page, a concrete fix, and AI-rewritten copy. Accuracy improves as the corpus grows — every scan makes the benchmarks sharper.',
    label: 'benchmark corpus:',
    value: '4,800+ real sites',
    valueColor: '#6F9BC6',
  },
] as const

export default function ObjectionSection() {
  return (
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Eyebrow */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          Common objections
        </p>

        {/* Headline */}
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 40px', letterSpacing: '-0.5px' }}>
          Every question you&apos;re about to ask.
        </h2>

        {/* 2×2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OBJECTIONS.map((o) => (
            <div
              key={o.q}
              style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '24px 26px' }}
            >
              <p style={{ ...DISP, fontWeight: 600, fontSize: 16, color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1.35 }}>
                {o.q}
              </p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.65, margin: '0 0 18px' }}>
                {o.a}
              </p>
              <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>
                {o.label}{' '}
                <span style={{ ...DISP, fontWeight: 500, color: o.valueColor }}>{o.value}</span>
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
