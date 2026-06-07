const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

export default function OutputSection() {
  return (
    <section style={{ padding: '96px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Eyebrow */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          The output
        </p>

        {/* Headline */}
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          It doesn&apos;t grade you. It rewrites you.
        </h2>

        {/* Sub */}
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 540, lineHeight: 1.65, margin: '0 0 36px' }}>
          Every finding comes back with the severity, the projected lift, and drop-in replacement copy — not a vague suggestion. Here&apos;s one finding from a real scan.
        </p>

        {/* Finding card */}
        <div style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.07)' }}>

          {/* Top bar */}
          <div style={{
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
            padding: '13px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}>
            <span style={{
              ...MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 1,
              background: 'rgba(232,99,95,0.13)', color: '#E8635F', padding: '4px 9px', flexShrink: 0,
            }}>
              CRITICAL
            </span>
            <span style={{ ...MONO, fontSize: 11.5, color: '#8080c0' }}>
              value_proposition
            </span>
            <span style={{ ...DISP, fontWeight: 500, fontSize: 14, color: '#00C48C', marginLeft: 'auto' }}>
              +12–18% conversion
            </span>
          </div>

          {/* Finding title */}
          <div style={{ padding: '18px 20px 10px' }}>
            <p style={{ ...SANS, fontSize: 15.5, fontWeight: 500, color: '#E6E9EE', margin: 0, lineHeight: 1.4 }}>
              Hero headline is feature-led, not outcome-led
            </p>
          </div>

          {/* Diff block */}
          <div style={{ padding: '6px 20px 22px' }}>

            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#E8635F', margin: '0 0 8px' }}>
              Current
            </p>
            <p style={{
              ...DISP, fontWeight: 500, fontSize: 18, color: '#8E8EA0',
              textDecoration: 'line-through',
              textDecorationColor: 'rgba(232,99,95,0.6)',
              margin: '0 0 20px', lineHeight: 1.3,
            }}>
              Project management software for modern teams
            </p>

            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#00C48C', margin: '0 0 8px' }}>
              Rewritten
            </p>
            <p style={{ ...DISP, fontWeight: 600, fontSize: 22, color: '#00C48C', lineHeight: 1.2, margin: 0 }}>
              Ship projects on time, every time.
            </p>

          </div>

          {/* Footer strip */}
          <div style={{
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
            padding: '13px 20px',
            display: 'flex',
            gap: 28,
            flexWrap: 'wrap',
          }}>
            <span style={{ ...MONO, fontSize: 11, color: '#9398A8' }}>
              severity:{' '}<span style={{ color: '#E8635F' }}>critical</span>
            </span>
            <span style={{ ...MONO, fontSize: 11, color: '#9398A8' }}>
              fix_effort:{' '}<span style={{ color: '#6F9BC6' }}>low</span>
            </span>
            <span style={{ ...MONO, fontSize: 11, color: '#9398A8' }}>
              percentile:{' '}<span style={{ color: '#6F9BC6' }}>63</span>
            </span>
          </div>

        </div>
      </div>
    </section>
  )
}
