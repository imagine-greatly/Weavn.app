// Former homepage "One engine. Two ways in." dashboard/API cards section —
// removed from / in the fork-first redesign. Kept intact for reuse on the
// founder/developer deep pages in a later session.

import Link from 'next/link'
import WebdocMark from '@/components/ui/WebdocMark'

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

export default function LandingTwoSurface() {
  return (
    <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden', background: '#050810' }}>

      <style>{`
        @media (max-width: 639px) { .ts-veins { display: none !important; } }
      `}</style>

      {/* Ambient blooms */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 600px 700px at 20% 75%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 600px 700px at 80% 75%, rgba(157,140,255,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 800px 400px at 50% 20%, rgba(111,155,198,0.04) 0%, transparent 55%)',
        ].join(', '),
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Section header */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>THE ENGINE</p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          One engine. Two ways in.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 56px' }}>
          The same 307-check scan engine underneath everything. Use the dashboard if you want results without writing code. Use the API if you want to build with the data.
        </p>

        {/* Engine convergence visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>

          <WebdocMark size={80} animated={true} />

          {/* Engine label */}
          <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: 'rgba(111,155,198,0.5)', margin: '7px 0 0' }}>SCAN ENGINE</p>

          {/* Static vein paths — one engine, two surfaces */}
          <svg
            className="ts-veins"
            viewBox="0 0 900 120"
            width="100%"
            height="120"
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
            aria-hidden
            style={{ display: 'block' }}
          >
            <defs>
              <filter id="vein-glow" x="-50%" y="-100%" width="200%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path
              d="M 450,0 C 442,18 418,42 370,62 C 310,86 220,105 150,116"
              stroke="#6F9BC6"
              strokeWidth="0.8"
              fill="none"
              opacity="0.55"
              filter="url(#vein-glow)"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 450,0 C 458,18 482,42 530,62 C 590,86 680,105 750,116"
              stroke="#9D8CFF"
              strokeWidth="0.8"
              fill="none"
              opacity="0.55"
              filter="url(#vein-glow)"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* Two surface cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ alignItems: 'stretch' }}>

          {/* DASHBOARD — steel blue */}
          <div className="wd-panel" style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(111,155,198,0.4)',
            borderLeft: '1px solid rgba(111,155,198,0.12)',
            boxShadow: '0 0 0 1px rgba(111,155,198,0.08), 0 0 28px rgba(111,155,198,0.06)',
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>Dashboard</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Results without code.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                Paste a URL, get a full conversion report.
              </p>
            </div>
            <div style={{ padding: '20px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {[
                'Full conversion audit in 90 seconds',
                'Findings ranked by revenue impact',
                'AI-rewritten copy included',
              ].map(line => (
                <p key={line} style={{ ...SANS, fontSize: 13, color: '#9398A8', margin: '0 0 8px' }}>
                  · {line}
                </p>
              ))}
            </div>
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/dashboard" style={{ ...MONO, fontSize: 11, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 14px', display: 'block', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent' }}>
                Open Dashboard →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center' as const, marginTop: 8, marginBottom: 0 }}>Free to start · no credit card</p>
            </div>
          </div>

          {/* API — purple */}
          <div className="wd-panel" style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(157,140,255,0.4)',
            borderLeft: '1px solid rgba(157,140,255,0.12)',
            boxShadow: '0 0 0 1px rgba(157,140,255,0.08), 0 0 28px rgba(157,140,255,0.07)',
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#9D8CFF', margin: '0 0 10px' }}>API</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Build with the data.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                One endpoint, structured JSON out.
              </p>
            </div>
            <div style={{ padding: '20px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {([
                { k: 'endpoint',       v: 'POST /api/v1/scan' },
                { k: 'response',       v: 'structured JSON' },
                { k: 'trial_scans',    v: '25 free' },
                { k: 'async_mode',     v: 'true' },
                { k: 'batch_endpoint', v: 'true' },
              ] as { k: string; v: string }[]).map(s => (
                <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', ...MONO, fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: '#8080c0', flexShrink: 0 }}>{s.k}</span>
                  <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
                  <span style={{ color: s.v === 'true' || s.v === 'structured JSON' || s.v === '25 free' ? '#00C48C' : s.v.startsWith('POST') ? '#9D8CFF' : '#E6E9EE' }}>{s.v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 11, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '10px 14px', display: 'block', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent' }}>
                Get API Key →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center' as const, marginTop: 8, marginBottom: 0 }}>25 free scans · from $29/mo</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
