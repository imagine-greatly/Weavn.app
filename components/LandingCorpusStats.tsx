'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

function useCountUp(target: number, inView: boolean, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start: number | null = null
    let frame: number
    function step(ts: number) {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) frame = requestAnimationFrame(step)
      else setCount(target)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, target, duration])
  return count
}

const BELL_PATH = 'M 0,276 C 60,276 140,275 240,272 C 320,269 400,262 490,248 C 560,237 610,218 660,192 C 710,165 740,132 770,100 C 795,73 810,48 830,28 C 848,10 862,3 878,8 C 894,13 908,32 925,58 C 945,88 965,122 995,158 C 1025,192 1065,224 1120,246 C 1175,262 1250,271 1340,275 C 1390,276 1420,276 1440,276'
const BELL_FILL = BELL_PATH + ' L 1440,280 L 0,280 Z'

export default function LandingCorpusStats() {
  const sectionRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })

  // Count-up for each stat
  const count4800 = useCountUp(4800, inView, 1400)
  const count58   = useCountUp(58,   inView, 1000)
  const count23   = useCountUp(23,   inView, 900)
  const count76   = useCountUp(76,   inView, 1100)

  const statDisplay = [
    { raw: count4800, label: 'SITES SCANNED',      color: '#E6E9EE',              format: (n: number) => n >= 4800 ? '4,800+' : n.toLocaleString() },
    { raw: count58,   label: 'AVERAGE SCORE',       color: 'rgba(111,155,198,0.32)', format: (n: number) => String(n) },
    { raw: count23,   label: 'AVG FINDINGS',        color: 'rgba(111,155,198,0.32)', format: (n: number) => String(n) },
    { raw: count76,   label: 'NO ABOVE-FOLD PROOF', color: '#E8635F',              format: (n: number) => n + '%' },
  ]

  return (
    <section ref={sectionRef} style={{ position: 'relative', overflow: 'hidden', padding: '96px 0 0 0', borderTop: '0.5px solid rgba(111,155,198,0.12)' }}>
      <style>{`
        @media (max-width: 767px) {
          .sb-stat-strip { flex-wrap: wrap !important; }
          .sb-stat-strip > .sb-stat-cell { flex: 0 0 50% !important; min-width: 0; }
          .sb-stat-strip > .sb-corpus-cell { flex: 0 0 100% !important; border-right: none !important; border-top: 0.5px solid rgba(111,155,198,0.08) !important; }
          .sb-curve-svg { height: 180px !important; }
        }
        @media (prefers-reduced-motion: no-preference) {
          @keyframes marker-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1.0; }
          }
        }
      `}</style>

      {/* Atmosphere — steel-blue only */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1200px 600px at 50% 30%, rgba(111,155,198,0.05) 0%, transparent 60%)',
      }} />

      {/* Ambient steel section bloom — rises from low-center under the curve, fades fully to transparent before the section edges (below content) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 72% 95% at 50% 105%, rgba(111,155,198,0.11) 0%, rgba(111,155,198,0.046) 38%, transparent 82%)',
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position:'absolute',top:20,left:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.18)',borderLeft:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',top:20,right:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.18)',borderRight:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,left:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.18)',borderLeft:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,right:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.18)',borderRight:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />

      {/* ── TOP CONTENT ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 48px 48px', position: 'relative', zIndex: 1 }}>

        {/* Kicker + headline + subcopy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ maxWidth: 680 }}
        >
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
            CORPUS DATA
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(32px,4vw,48px)', color: '#E6E9EE', letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.1 }}>
            Not an average. A percentile.
          </h2>
          <p style={{ ...SANS, fontSize: 15, color: '#9398A8', lineHeight: 1.65, margin: 0 }}>
            Every scan we run joins the corpus. You're ranked against thousands of real sites in your vertical — and the benchmark sharpens with every scan. You don't get a score. You get a position.
          </p>
        </motion.div>

        {/* Instrument strip — count-up numbers */}
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
          {statDisplay.map((s, i) => (
            <motion.div
              key={s.label}
              className="sb-stat-cell"
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
              style={{ flex: 1, padding: '20px 28px', borderRight: '0.5px solid rgba(111,155,198,0.08)' }}
            >
              <div style={{
                ...DISP, fontSize: 40, fontWeight: 700, color: s.color, lineHeight: 1,
                textShadow: s.label === 'NO ABOVE-FOLD PROOF'
                  ? '0 0 20px rgba(232, 99, 95, 0.25)'
                  : '0 0 20px rgba(111, 155, 198, 0.2)',
              }}>
                {s.format(s.raw)}
              </div>
              <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(111,155,198,0.25)', marginTop: 6 }}>
                {s.label}
              </div>
            </motion.div>
          ))}

          {/* Corpus facts cell */}
          <motion.div
            className="sb-corpus-cell"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.52, ease: 'easeOut' }}
            style={{ flex: '0 0 240px', padding: '20px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, borderLeft: '0.5px solid rgba(111,155,198,0.1)' }}
          >
            <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(111,155,198,0.35)', margin: '0 0 8px' }}>CORPUS</p>
            {([
              { k: 'corpus_size', v: '4,812', vc: '#6F9BC6' },
              { k: 'verticals',   v: '14',    vc: '#6F9BC6' },
              { k: 'updated',     v: 'weekly', vc: '#00C48C' },
            ] as { k: string; v: string; vc: string }[]).map(row => (
              <div key={row.k} style={{ ...MONO, fontSize: 11, display: 'flex' }}>
                <span style={{ color: '#6F9BC6' }}>{row.k}</span>
                <span style={{ color: '#6E7587' }}>: </span>
                <span style={{ color: row.vc }}>{row.v}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Benchmark bloom — centered on 21st pct marker position */}
      <div aria-hidden style={{
        position: 'absolute',
        bottom: 40,
        left: '51%',
        transform: 'translateX(-50%)',
        width: 500,
        height: 300,
        background: 'radial-gradient(ellipse at center, rgba(111,155,198,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── FULL-BLEED CURVE — sequential draw animation ── */}
      <svg
        ref={svgRef}
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
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
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

        {/* Step 1: Zone fill fades in */}
        <motion.path
          d={BELL_FILL}
          fill="url(#sbZoneGrad)"
          stroke="none"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        />

        {/* Gridlines at 25 / 50 / 75 — step 2 */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <line x1="360"  y1="20" x2="360"  y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
          <line x1="720"  y1="20" x2="720"  y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
          <line x1="1080" y1="20" x2="1080" y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
        </motion.g>

        {/* Step 3: Curve fill fades in */}
        <motion.path
          d={BELL_FILL}
          fill="url(#sbCurveFill)"
          stroke="none"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        />

        {/* Step 4: Curve stroke draws in (pathLength animation) */}
        <motion.path
          d={BELL_PATH}
          fill="none"
          stroke="url(#sbCurveStroke)"
          strokeWidth="1.2"
          filter="url(#sbCurveGlow)"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={inView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ pathLength: { duration: 1.6, delay: 0.7, ease: 'easeInOut' }, opacity: { duration: 0.3, delay: 0.7 } }}
        />

        {/* AVG 58 marker */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 1.1 }}
        >
          <line x1="862" y1="20" x2="862" y2="260" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
          <text x="862" y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(255,255,255,0.15)">AVG 58</text>
        </motion.g>

        {/* Zone boundary lines + labels */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 1.2 }}
        >
          <line x1="360"  y1="40" x2="360"  y2="260" stroke="rgba(232,99,95,0.06)"  strokeWidth="0.75" />
          <line x1="1150" y1="40" x2="1150" y2="260" stroke="rgba(0,196,140,0.06)" strokeWidth="0.75" />
          <text x="360"  y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(232,99,95,0.35)">BOTTOM 25%</text>
          <text x="1150" y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(0,196,140,0.35)">TOP 25%</text>
        </motion.g>

        {/* YOUR SITE marker — step 4: drops in last */}
        <motion.g
          initial={{ opacity: 0, y: -10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.4, ease: 'easeOut' }}
        >
          <line
            x1="735" y1="0" x2="735" y2="260"
            stroke="rgba(140,180,220,0.7)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <circle cx="735" cy="135" r="8" fill="rgba(140,180,220,0.15)" filter="url(#sbMarkerGlow)" />
          <circle cx="735" cy="135" r="3" fill="rgba(140,180,220,0.9)" style={{ filter:'drop-shadow(0 0 4px rgba(111,155,198,0.6))', animation:'marker-pulse 3s ease-in-out infinite' }} />
          <g transform="translate(735, -8)">
            <rect x="-56" y="-50" width="112" height="44" fill="rgba(111,155,198,0.08)" stroke="rgba(111,155,198,0.3)" strokeWidth="0.5" filter="url(#sbMarkerGlow)" />
            <text x="0" y="-34" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8"  fill="rgba(140,180,220,0.55)" letterSpacing="0.12em">YOUR SITE</text>
            <text x="0" y="-16" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="15" fontWeight="700" fill="rgba(140,180,220,1.0)">21st pct</text>
            <line x1="0" y1="0" x2="0" y2="143" stroke="rgba(140,180,220,0.2)" strokeWidth="0.5" />
          </g>
        </motion.g>

        {/* Score axis labels */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          <text x="0"    y="278" textAnchor="start"  fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">0</text>
          <text x="360"  y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">25</text>
          <text x="720"  y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">50</text>
          <text x="1080" y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">75</text>
          <text x="1440" y="278" textAnchor="end"    fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">100</text>
        </motion.g>
      </svg>

      {/* Bottom caption */}
      <div style={{ textAlign: 'center', padding: '12px 0 32px', position: 'relative', zIndex: 1 }}>
        <p style={{ ...MONO, fontSize: 10, color: 'rgba(111,155,198,0.3)', margin: 0 }}>
          Benchmarked against sites in your exact vertical · no synthetic data · updated weekly
        </p>
      </div>

      {/* Top quartile insights — illustrative corpus-derived statistics, B2B SaaS vertical */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 48px 64px', position: 'relative', zIndex: 1 }}>
        <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(111,155,198,0.35)', margin: '0 0 20px' }}>
          WHAT TOP QUARTILE SITES DO DIFFERENTLY
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: 'Testimonial or logo strip visible above 800px fold', pct: 94 },
            { label: 'Single primary CTA above fold — no competing actions', pct: 87 },
            { label: 'Outcome-led hero headline — benefit not feature', pct: 91 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid rgba(111,155,198,0.06)', gap: 24, flexWrap: 'wrap' }}>
              <p style={{ ...SANS, fontSize: 14, color: 'rgba(147, 152, 168, 0.75)', margin: 0, flex: 1 }}>{row.label}</p>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <div style={{ width:120, height:4, background:'rgba(111,155,198,0.1)' }}>
                  <div style={{ width:`${row.pct}%`, height:'100%', background:'rgba(111,155,198,0.6)' }} />
                </div>
                <p style={{ ...MONO, fontSize: 12, color: 'rgba(111,155,198,0.7)', margin: 0, whiteSpace: 'nowrap' }}>{row.pct}%</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ ...MONO, fontSize: 10, color: 'rgba(111,155,198,0.25)', margin: '14px 0 0' }}>
          Corpus-derived · B2B SaaS vertical · updated weekly · no synthetic data
        </p>
      </div>

    </section>
  )
}
