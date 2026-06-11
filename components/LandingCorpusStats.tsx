// Former homepage "Not an average. A percentile." corpus section, including the
// benchmark bell-curve visualization — removed from / in the fork-first redesign.
// Kept intact for reuse on the founder/developer deep pages in a later session.

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

export default function LandingCorpusStats() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 0 0 0', borderTop: '0.5px solid rgba(111,155,198,0.12)' }}>
      <style>{`
        @keyframes sb-marker-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .sb-marker-enter { animation: sb-marker-in 0.6s ease-out 0.4s both; }
        @media (prefers-reduced-motion: reduce) { .sb-marker-enter { animation:none; opacity:1; transform:none; } }
        @media (max-width: 767px) {
          .sb-stat-strip { flex-wrap: wrap !important; }
          .sb-stat-strip > .sb-stat-cell { flex: 0 0 50% !important; min-width: 0; }
          .sb-stat-strip > .sb-corpus-cell { flex: 0 0 100% !important; border-right: none !important; border-top: 0.5px solid rgba(111,155,198,0.08) !important; }
          .sb-curve-svg { height: 180px !important; }
        }
      `}</style>

      {/* Atmosphere */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 1200px 600px at 50% 30%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 600px 400px at 20% 60%, rgba(157,140,255,0.03) 0%, transparent 55%)',
        ].join(', '),
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position:'absolute',top:20,left:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.18)',borderLeft:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',top:20,right:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.18)',borderRight:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,left:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.18)',borderLeft:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,right:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.18)',borderRight:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />

      {/* ── TOP CONTENT ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 48px 48px', position: 'relative', zIndex: 1 }}>

        {/* Kicker + headline + subcopy */}
        <div style={{ maxWidth: 680 }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
            CORPUS DATA
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(32px,4vw,48px)', color: '#E6E9EE', letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.1 }}>
            Not an average. A percentile.
          </h2>
          <p style={{ ...SANS, fontSize: 15, color: '#9398A8', lineHeight: 1.65, margin: 0 }}>
            Every score is positioned against real sites in your exact vertical — not a generic industry average. B2B SaaS vs B2B SaaS. Ecommerce vs ecommerce. The corpus grows with every scan.
          </p>
        </div>

        {/* Instrument strip */}
        <div
          className="sb-stat-strip"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            marginTop: 40,
            borderTop: '0.5px solid rgba(111,155,198,0.12)',
            borderBottom: '0.5px solid rgba(111,155,198,0.12)',
          }}
        >
          {([
            { value: '4,800+', label: 'SITES SCANNED',      color: '#E6E9EE' },
            { value: '58',     label: 'AVERAGE SCORE',       color: 'rgba(111,155,198,0.32)' },
            { value: '23',     label: 'AVG FINDINGS',        color: 'rgba(111,155,198,0.32)' },
            { value: '76%',    label: 'NO ABOVE-FOLD PROOF', color: '#E8635F' },
          ] as { value: string; label: string; color: string }[]).map(s => (
            <div
              key={s.label}
              className="sb-stat-cell"
              style={{ flex: 1, padding: '20px 28px', borderRight: '0.5px solid rgba(111,155,198,0.08)' }}
            >
              <div style={{ ...DISP, fontSize: 40, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(111,155,198,0.25)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}

          {/* Corpus facts cell */}
          <div
            className="sb-corpus-cell"
            style={{ flex: '0 0 240px', padding: '20px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, borderLeft: '0.5px solid rgba(111,155,198,0.1)' }}
          >
            <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(111,155,198,0.35)', margin: '0 0 8px' }}>CORPUS</p>
            {([
              { k: 'corpus_size', v: '4,812', vc: '#6F9BC6' },
              { k: 'verticals',   v: '14',    vc: '#6F9BC6' },
              { k: 'updated',     v: 'weekly', vc: '#00C48C' },
            ] as { k: string; v: string; vc: string }[]).map(row => (
              <div key={row.k} style={{ ...MONO, fontSize: 11, display: 'flex' }}>
                <span style={{ color: '#8080c0' }}>{row.k}</span>
                <span style={{ color: '#6E7587' }}>: </span>
                <span style={{ color: row.vc }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmark bloom — 600×300 steel-blue radial centered behind bell curve */}
      <div aria-hidden style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 300,
        background: 'radial-gradient(ellipse at center, rgba(111,155,198,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── FULL-BLEED CURVE ── */}
      <svg
        className="sb-curve-svg"
        width="100%"
        height="280"
        viewBox="0 0 1440 280"
        preserveAspectRatio="none"
        overflow="visible"
        aria-hidden
        style={{ display: 'block', marginTop: 0 }}
      >
        <defs>
          <linearGradient id="sbZoneGrad" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#E8635F" stopOpacity="0.06" />
            <stop offset="35%"  stopColor="#6F9BC6" stopOpacity="0.04" />
            <stop offset="65%"  stopColor="#6F9BC6" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#00C48C" stopOpacity="0.07" />
          </linearGradient>

          <linearGradient id="sbCurveFill" x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#6F9BC6" stopOpacity="0.07" />
            <stop offset="60%"  stopColor="#6F9BC6" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#6F9BC6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sbCurveStroke" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#E8635F" stopOpacity="0.25" />
            <stop offset="20%"  stopColor="#E8635F" stopOpacity="0.15" />
            <stop offset="38%"  stopColor="#6F9BC6" stopOpacity="0.6" />
            <stop offset="55%"  stopColor="#6F9BC6" stopOpacity="0.95" />
            <stop offset="65%"  stopColor="#6F9BC6" stopOpacity="0.85" />
            <stop offset="82%"  stopColor="#6F9BC6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00C48C" stopOpacity="0.2" />
          </linearGradient>

          <filter id="sbCurveGlow" x="-5%" y="-60%" width="110%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="sbMarkerGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Zone fill */}
        <path
          d="M 0,276 C 60,276 140,275 240,272 C 320,269 400,262 490,248 C 560,237 610,218 660,192 C 710,165 740,132 770,100 C 795,73 810,48 830,28 C 848,10 862,3 878,8 C 894,13 908,32 925,58 C 945,88 965,122 995,158 C 1025,192 1065,224 1120,246 C 1175,262 1250,271 1340,275 C 1390,276 1420,276 1440,276 L 1440,280 L 0,280 Z"
          fill="url(#sbZoneGrad)"
          stroke="none"
        />

        {/* 2. Gridlines at 25 / 50 / 75 */}
        <line x1="360"  y1="20" x2="360"  y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
        <line x1="720"  y1="20" x2="720"  y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
        <line x1="1080" y1="20" x2="1080" y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />

        {/* 3. Curve fill */}
        <path
          d="M 0,276 C 60,276 140,275 240,272 C 320,269 400,262 490,248 C 560,237 610,218 660,192 C 710,165 740,132 770,100 C 795,73 810,48 830,28 C 848,10 862,3 878,8 C 894,13 908,32 925,58 C 945,88 965,122 995,158 C 1025,192 1065,224 1120,246 C 1175,262 1250,271 1340,275 C 1390,276 1420,276 1440,276 L 1440,280 L 0,280 Z"
          fill="url(#sbCurveFill)"
          stroke="none"
        />

        {/* 4. Curve stroke — horizontal color gradient + glow */}
        <path
          d="M 0,276 C 60,276 140,275 240,272 C 320,269 400,262 490,248 C 560,237 610,218 660,192 C 710,165 740,132 770,100 C 795,73 810,48 830,28 C 848,10 862,3 878,8 C 894,13 908,32 925,58 C 945,88 965,122 995,158 C 1025,192 1065,224 1120,246 C 1175,262 1250,271 1340,275 C 1390,276 1420,276 1440,276"
          fill="none"
          stroke="url(#sbCurveStroke)"
          strokeWidth="1.2"
          filter="url(#sbCurveGlow)"
          vectorEffect="non-scaling-stroke"
        />

        {/* 5. AVG 58 marker */}
        <line x1="862" y1="20" x2="862" y2="260" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
        <text x="862" y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(255,255,255,0.15)">AVG 58</text>

        {/* 6. Zone boundary lines */}
        <line x1="360"  y1="40" x2="360"  y2="260" stroke="rgba(232,99,95,0.06)"  strokeWidth="0.75" />
        <line x1="1150" y1="40" x2="1150" y2="260" stroke="rgba(0,196,140,0.06)" strokeWidth="0.75" />
        {/* 6. Zone boundary labels */}
        <text x="360"  y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(232,99,95,0.35)">BOTTOM 25%</text>
        <text x="1150" y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(0,196,140,0.35)">TOP 25%</text>

        {/* 7. YOUR SITE marker at x=980, curve y≈135 */}
        <g className="sb-marker-enter">
          <line
            x1="980" y1="0" x2="980" y2="260"
            stroke="rgba(140,180,220,0.7)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <circle cx="980" cy="135" r="8" fill="rgba(140,180,220,0.15)" filter="url(#sbMarkerGlow)" />
          <circle cx="980" cy="135" r="3" fill="rgba(140,180,220,0.9)" />
          <g transform="translate(980, -8)">
            <rect x="-56" y="-50" width="112" height="44" fill="#080D18" stroke="rgba(140,180,220,0.35)" strokeWidth="0.5" />
            <text x="0" y="-34" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8"  fill="rgba(140,180,220,0.55)" letterSpacing="0.12em">YOUR SITE</text>
            <text x="0" y="-16" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="15" fontWeight="700" fill="rgba(140,180,220,1.0)">63rd pct</text>
            <line x1="0" y1="0" x2="0" y2="143" stroke="rgba(140,180,220,0.2)" strokeWidth="0.5" />
          </g>
        </g>

        {/* 8. Score axis labels */}
        <text x="0"    y="278" textAnchor="start"  fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">0</text>
        <text x="360"  y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">25</text>
        <text x="720"  y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">50</text>
        <text x="1080" y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">75</text>
        <text x="1440" y="278" textAnchor="end"    fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">100</text>
      </svg>

      {/* 9. Bottom caption */}
      <div style={{ textAlign: 'center', padding: '12px 0 32px', position: 'relative', zIndex: 1 }}>
        <p style={{ ...MONO, fontSize: 10, color: 'rgba(111,155,198,0.3)', margin: 0 }}>
          Benchmarked against sites in your exact vertical · no synthetic data · updated weekly
        </p>
      </div>

    </section>
  )
}
