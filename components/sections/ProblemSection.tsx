import ScoreRing from '@/components/ui/ScoreRing'

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9B6B6B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 2 }}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const BAD_ROWS = [
  "Gut feel and 'best practices'",
  'A/B tests that take months to read',
  'A $5k agency audit — a PDF of opinions',
  'Lighthouse — measures speed, not conversion',
] as const

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

export default function ProblemSection() {
  return (
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Eyebrow */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          The problem
        </p>

        {/* Headline */}
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 36px', letterSpacing: '-0.5px' }}>
          Conversion advice is opinion.<br />
          One endpoint returns a measurement.
        </h2>

        {/* Contrast grid — responsive via Tailwind */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Left card — the old way */}
          <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)', padding: '22px 24px' }}>
            <p style={{ ...MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6E7587', margin: '0 0 18px' }}>
              How it&apos;s diagnosed today
            </p>
            {BAD_ROWS.map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '11px 0' }}>
                <XIcon />
                <span style={{ ...SANS, fontSize: 14, color: '#8E8EA0', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Right card — what the API returns */}
          <div style={{ background: '#0A0E18', border: '0.5px solid rgba(0,196,140,0.22)', padding: '22px 24px' }}>
            <p style={{ ...MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1.5, color: '#00C48C', margin: '0 0 18px' }}>
              What the API returns
            </p>

            {/* Score ring row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <ScoreRing score={61} size="md" animate={true} />
              <span style={{ ...SANS, fontSize: 12, color: '#9398A8', lineHeight: 1.5 }}>
                A weighted score, calibrated to your site type and buyer.
              </span>
            </div>

            {/* Finding row */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  ...MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 1,
                  background: 'rgba(232,99,95,0.13)', color: '#E8635F', padding: '3px 8px', flexShrink: 0,
                }}>
                  CRITICAL
                </span>
                <span style={{ ...SANS, fontSize: 13, color: '#E6E9EE', lineHeight: 1.4 }}>
                  Hero headline is feature-led, not outcome-led
                </span>
              </div>
            </div>

            {/* Lift line */}
            <p style={{ ...SANS, fontSize: 13, color: '#9398A8', margin: '0 0 10px' }}>
              Projected <span style={{ color: '#00C48C' }}>+12–18%</span> with the rewrite included
            </p>

            {/* Meta line */}
            <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>
              cited from visible page content · never fabricated
            </p>
          </div>
        </div>

        {/* Footer stat */}
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <span style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E8635F' }}>76%</span>
          <span style={{ ...SANS, fontSize: 15, color: '#9398A8' }}>
            {' '}of the sites we&apos;ve scanned have no proof above the fold — and most founders have no idea.
          </span>
        </div>

      </div>
    </section>
  )
}
