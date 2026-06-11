'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import ScoreRing from '@/components/ui/ScoreRing'
import LandingCorpusStats from '@/components/LandingCorpusStats'

// ── Style constants — all hex values sourced from existing tokens
// in tailwind.config.ts and globals.css. No new hex values introduced.
const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

const STEEL      = '#6F9BC6'   // --interactive / --accent-primary   rgb(111,155,198)
const CRIT       = '#E8635F'   // --sev-critical / --data-critical    rgb(232,99,95)
const HIGH_AMB   = '#EFB23E'   // --sev-high
const LIFT_GREEN = '#00C48C'   // --json-string / engine-developers
const INK_PRI    = '#E6E9EE'   // --ink-primary
const INK_SEC    = '#9398A8'   // --ink-secondary
const INK_MUT    = '#6E7587'   // --ink-muted
const SURFACE    = '#0A0E18'   // --surface
const BG_BASE    = '#050810'   // --bg / bg-base

// ── Shared chrome ─────────────────────────────────────────────────────────────

function Ticks() {
  const b = '0.5px solid rgba(111,155,198,0.18)'
  return (
    <>
      <div aria-hidden style={{ position:'absolute',top:20,left:20,width:14,height:14,borderTop:b,borderLeft:b,pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',top:20,right:20,width:14,height:14,borderTop:b,borderRight:b,pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,left:20,width:14,height:14,borderBottom:b,borderLeft:b,pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,right:20,width:14,height:14,borderBottom:b,borderRight:b,pointerEvents:'none',zIndex:1 }} />
    </>
  )
}

// ── Section 1 — Hero ─────────────────────────────────────────────────────────

function HeroSection() {
  const [scanUrl, setScanUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [scanBtnHovered, setScanBtnHovered] = useState(false)
  const router = useRouter()

  // Inbound links (auth redirect, rescan) arrive as /dashboard?url=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const url = params.get('url')
    if (url) setScanUrl(url.replace(/^https?:\/\//i, ''))
  }, [])

  const handleScan = async () => {
    if (!scanUrl || isScanning) return
    setScanError('')
    setIsScanning(true)
    try {
      const target = /^https?:\/\//i.test(scanUrl) ? scanUrl : `https://${scanUrl}`
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      if (res.status === 401) {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pendingUrl', target)
        router.push('/auth?surface=dashboard')
        return
      }
      const data = await res.json()
      if (data.reportId) {
        router.push(`/reports/${data.reportId}`)
      } else if (data.error) {
        setScanError(data.error)
      }
    } catch {
      setScanError('Scan failed. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <section
      id="scan"
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        padding: '112px 48px 80px',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Hero bloom */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1600px',
          height: '1200px',
          background: 'radial-gradient(ellipse at 50% 35%, rgba(111, 155, 198, 0.22) 0%, rgba(111, 155, 198, 0.066) 40%, rgba(111, 155, 198, 0.02) 65%, transparent 85%)',
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: '50%',
          animation: 'bloom-breathe 5s ease-in-out infinite',
        }}
      />
      <Ticks />
      <div style={{ position:'relative',zIndex:1,maxWidth:800,margin:'0 auto',width:'100%',textAlign:'center' }}>
        {/* Kicker */}
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 20px' }}>
          FOR ANYONE WITH A SITE TO FIX
        </p>
        {/* H1 */}
        <h1 style={{ ...DISP,fontSize:'clamp(36px,5vw,58px)',fontWeight:700,color:INK_PRI,letterSpacing:'-0.04em',margin:'0 0 24px',lineHeight:1.08 }}>
          Find out exactly what&apos;s stopping visitors from converting.
        </h1>
        {/* Subhead */}
        <p style={{ ...SANS,fontSize:17,color:INK_SEC,lineHeight:1.65,maxWidth:600,margin:'0 auto 44px' }}>
          Paste your URL. Get a 0–100 score, every conversion problem ranked by impact, AI-rewritten copy, and benchmarks against real sites in your vertical — in about 90 seconds.
        </p>

        {/* URL input + CTA */}
        <div style={{ maxWidth:580,margin:'0 auto',textAlign:'left' }}>
          <div style={{ display:'flex',flexWrap:'wrap' }}>
            <div
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              style={{
                display:'flex',flex:'1 1 280px',
                background:SURFACE,
                borderTop:'1px solid rgba(255,255,255,0.1)',
                borderLeft:'1px solid rgba(255,255,255,0.07)',
                borderRight:'1px solid rgba(255,255,255,0.04)',
                borderBottom:'1px solid rgba(255,255,255,0.03)',
                transition: 'box-shadow 0.3s ease',
                boxShadow: inputFocused
                  ? 'inset 0 0 0 1px rgba(111, 155, 198, 0.5), 0 0 20px rgba(111, 155, 198, 0.1)'
                  : 'inset 0 0 0 1px rgba(111, 155, 198, 0.2)',
              }}>
              <span style={{ ...MONO,fontSize:12,color:INK_MUT,padding:'0 12px',display:'flex',alignItems:'center',flexShrink:0,borderRight:'0.5px solid rgba(255,255,255,0.08)' }}>
                https://
              </span>
              <input
                type="text"
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleScan() }}
                placeholder="your-site.com"
                style={{ flex:1,minWidth:0,background:'transparent',...MONO,fontSize:14,color:INK_PRI,padding:'14px',border:'none',outline:'none',borderRadius:0 }}
              />
            </div>
            <button
              onClick={() => void handleScan()}
              disabled={isScanning || !scanUrl}
              onMouseEnter={() => setScanBtnHovered(true)}
              onMouseLeave={() => setScanBtnHovered(false)}
              style={{
                ...MONO,fontSize:13,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',
                background:'transparent',
                border:`1px solid ${isScanning || !scanUrl ? 'rgba(111,155,198,0.3)' : 'rgba(111,155,198,0.5)'}`,
                color:isScanning || !scanUrl ? 'rgba(111,155,198,0.4)' : STEEL,
                padding:'14px 24px',cursor:isScanning || !scanUrl ? 'not-allowed' : 'pointer',
                borderRadius:0,whiteSpace:'nowrap',transition:'box-shadow 0.2s ease',
                boxShadow: scanBtnHovered && !isScanning && scanUrl
                  ? '0 0 24px rgba(111, 155, 198, 0.3), 0 0 0 1px rgba(111, 155, 198, 0.4)'
                  : '0 0 16px rgba(111, 155, 198, 0.15)',
              }}
            >
              {isScanning ? 'SCANNING…' : 'SCAN MY SITE FREE →'}
            </button>
          </div>
          {scanError && (
            <p style={{ ...MONO,fontSize:11,color:CRIT,margin:'8px 0 0',textAlign:'center' }}>{scanError}</p>
          )}
          <p style={{ ...MONO,fontSize:11,color:INK_MUT,textAlign:'center',margin:'14px 0 0' }}>
            No account required.
          </p>
          {/* TODO: wire to live Supabase scan count query when stats endpoint is available */}
          <p style={{ ...MONO,fontSize:10,color:INK_MUT,textAlign:'center',margin:'8px 0 0',opacity:0.4 }}>
            · 4,812 sites scanned · last scan 4 minutes ago
          </p>
        </div>

        {/* Full-width dashboard preview panel */}
        <div style={{
          marginTop: 48,
          background: 'rgba(8,12,22,0.9)',
          border: '1px solid rgba(111,155,198,0.15)',
          boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.2)',
          padding: '24px 32px',
          textAlign: 'left',
        }}>
          {/* Panel header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ ...MONO, fontSize:9, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(111,155,198,0.45)', margin:0 }}>LIVE SCAN RESULT</p>
            <p style={{ ...MONO, fontSize:9, color:LIFT_GREEN, margin:0 }}>acme-saas.com</p>
          </div>
          <div style={{ height:1, background:'rgba(111,155,198,0.1)', marginBottom:16 }} />

          {/* Three-column panel body */}
          <style>{`
            @media(max-width:767px){
              .d-hero-panel{flex-direction:column!important}
              .d-hero-panel-mid{border-left:none!important;border-right:none!important;padding-left:0!important;padding-right:0!important;border-top:0.5px solid rgba(111,155,198,0.1)!important;border-bottom:0.5px solid rgba(111,155,198,0.1)!important;padding-top:16px!important;padding-bottom:16px!important;margin-top:16px!important;margin-bottom:16px!important}
              .d-hero-panel-right{padding-left:0!important;flex-direction:row!important;gap:20px!important;flex-wrap:wrap!important}
            }
          `}</style>
          <div className="d-hero-panel" style={{ display:'flex', gap:0, alignItems:'flex-start' }}>

            {/* Left — score ring + context */}
            <div style={{ flexShrink:0, paddingRight:24, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="38" stroke="rgba(111,155,198,0.12)" strokeWidth="4" fill="none" />
                <circle cx="48" cy="48" r="38" stroke={CRIT} strokeWidth="4" strokeDasharray="238.76" strokeDashoffset="93.12" strokeLinecap="round" fill="none" transform="rotate(-90 48 48)" />
                <text x="48" y="59" textAnchor="middle" fill={CRIT} style={{ fontFamily:'"Space Grotesk",sans-serif', fontSize:28, fontWeight:700 }}>61</text>
              </svg>
              <span style={{ ...MONO, fontSize:8, color:CRIT, border:`0.5px solid ${CRIT}`, padding:'1px 5px', textTransform:'uppercase', letterSpacing:'0.08em' }}>CRITICAL</span>
              <p style={{ ...MONO, fontSize:10, color:'rgba(111,155,198,0.7)', margin:0, textAlign:'center' }}>63rd percentile · B2B SaaS</p>
              <p style={{ ...SANS, fontSize:11, color:INK_MUT, margin:0, lineHeight:1.5, textAlign:'center' }}>37 sites score higher in your category</p>
            </div>

            {/* Middle — three findings */}
            <div className="d-hero-panel-mid" style={{ flex:'1 1 0', minWidth:0, borderLeft:'0.5px solid rgba(111,155,198,0.1)', borderRight:'0.5px solid rgba(111,155,198,0.1)', paddingLeft:24, paddingRight:24, display:'flex', flexDirection:'column' }}>
              {/* Finding 1 — CRITICAL */}
              <div style={{ paddingBottom:10, borderBottom:'0.5px solid rgba(255,255,255,0.05)', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4, gap:8 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:6, flex:1, minWidth:0 }}>
                    <span style={{ ...MONO, fontSize:8, color:CRIT, border:`0.5px solid rgba(232,99,95,0.4)`, padding:'1px 5px', textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0, marginTop:2 }}>CRITICAL</span>
                    <span style={{ ...DISP, fontSize:12, fontWeight:500, color:INK_PRI, lineHeight:1.3 }}>Hero headline is feature-led, not outcome-led</span>
                  </div>
                  <span style={{ ...MONO, fontSize:10, color:LIFT_GREEN, flexShrink:0 }}>+12–18%</span>
                </div>
                <p style={{ ...SANS, fontSize:11, fontStyle:'italic', color:INK_MUT, margin:'0 0 2px', lineHeight:1.4 }}>Your H1 describes the product, not the outcome</p>
                <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:0 }}>fix: rewrite to outcome-led · AI copy included</p>
              </div>
              {/* Finding 2 — HIGH */}
              <div style={{ paddingBottom:10, borderBottom:'0.5px solid rgba(255,255,255,0.05)', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4, gap:8 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:6, flex:1, minWidth:0 }}>
                    <span style={{ ...MONO, fontSize:8, color:HIGH_AMB, border:`0.5px solid rgba(239,178,62,0.4)`, padding:'1px 5px', textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0, marginTop:2 }}>HIGH</span>
                    <span style={{ ...DISP, fontSize:12, fontWeight:500, color:INK_PRI, lineHeight:1.3 }}>No above-fold social proof</span>
                  </div>
                  <span style={{ ...MONO, fontSize:10, color:LIFT_GREEN, flexShrink:0 }}>+8–11%</span>
                </div>
                <p style={{ ...SANS, fontSize:11, fontStyle:'italic', color:INK_MUT, margin:'0 0 2px', lineHeight:1.4 }}>Testimonials buried at 2,400px</p>
                <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:0 }}>fix: move one testimonial above fold</p>
              </div>
              {/* Finding 3 — HIGH */}
              <div>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4, gap:8 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:6, flex:1, minWidth:0 }}>
                    <span style={{ ...MONO, fontSize:8, color:HIGH_AMB, border:`0.5px solid rgba(239,178,62,0.4)`, padding:'1px 5px', textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0, marginTop:2 }}>HIGH</span>
                    <span style={{ ...DISP, fontSize:12, fontWeight:500, color:INK_PRI, lineHeight:1.3 }}>Dual primary CTAs create decision paralysis</span>
                  </div>
                  <span style={{ ...MONO, fontSize:10, color:LIFT_GREEN, flexShrink:0 }}>+6–9%</span>
                </div>
                <p style={{ ...SANS, fontSize:11, fontStyle:'italic', color:INK_MUT, margin:'0 0 2px', lineHeight:1.4 }}>Two competing CTAs split visitor attention</p>
                <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:0 }}>fix: consolidate to single primary action</p>
              </div>
            </div>

            {/* Right — stats column */}
            <div className="d-hero-panel-right" style={{ flexShrink:0, paddingLeft:24, display:'flex', flexDirection:'column', gap:12, alignItems:'flex-start' }}>
              <div>
                <p style={{ ...MONO, fontSize:18, fontWeight:700, color:INK_PRI, margin:'0 0 2px', lineHeight:1 }}>23</p>
                <p style={{ ...MONO, fontSize:8, color:INK_MUT, margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>FINDINGS</p>
              </div>
              <div>
                <p style={{ ...MONO, fontSize:18, fontWeight:700, color:CRIT, margin:'0 0 2px', lineHeight:1 }}>4</p>
                <p style={{ ...MONO, fontSize:8, color:INK_MUT, margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>CRITICAL</p>
              </div>
              <div>
                <p style={{ ...MONO, fontSize:18, fontWeight:700, color:HIGH_AMB, margin:'0 0 2px', lineHeight:1 }}>11</p>
                <p style={{ ...MONO, fontSize:8, color:INK_MUT, margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>HIGH</p>
              </div>
              <div>
                <p style={{ ...MONO, fontSize:18, fontWeight:700, color:LIFT_GREEN, margin:'0 0 2px', lineHeight:1 }}>~90s</p>
                <p style={{ ...MONO, fontSize:8, color:INK_MUT, margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>TIME</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 2 — The Output ────────────────────────────────────────────────────
// STATIC MOCK — hardcoded illustration, not a live scan.

type MockFinding = {
  severity: string
  severityColor: string
  bg: string
  border: string
  title: string
  desc: string
  lift: string
}

const MOCK_FINDINGS: MockFinding[] = [
  {
    severity: 'CRITICAL',
    severityColor: CRIT,
    bg: 'rgba(232,99,95,0.04)',
    border: 'rgba(232,99,95,0.2)',
    title: 'Hero headline is feature-led, not outcome-led',
    desc: 'Your headline describes what the product does, not what the visitor gets. Outcome-led headlines convert 12–18% better on average.',
    lift: '+12–18%',
  },
  {
    severity: 'HIGH',
    severityColor: HIGH_AMB,
    bg: 'rgba(239,178,62,0.04)',
    border: 'rgba(239,178,62,0.2)',
    title: 'No above-fold social proof',
    desc: 'Testimonials and trust signals are buried at 2,400px. Visitors are making trust decisions before they reach them.',
    lift: '+8–11%',
  },
  {
    severity: 'HIGH',
    severityColor: HIGH_AMB,
    bg: 'rgba(239,178,62,0.04)',
    border: 'rgba(239,178,62,0.2)',
    title: 'Dual primary CTAs create decision paralysis',
    desc: 'Two competing primary actions above the fold split attention. A single focused CTA outperforms in 73% of tested variants.',
    lift: '+6–9%',
  },
]

function OutputSection() {
  const ringRef = useRef<HTMLDivElement>(null)
  const ringInView = useInView(ringRef, { once: true, margin: '-80px' })
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1400px',
          height: '900px',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(111, 155, 198, 0.08) 0%, rgba(111, 155, 198, 0.024) 40%, rgba(111, 155, 198, 0.02) 65%, transparent 85%)',
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: '50%',
        }}
      />
      <div style={{ maxWidth:1000,margin:'0 auto',position:'relative',zIndex:1 }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          WHAT YOU GET
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          A report that tells you exactly what to fix.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:640,margin:'0 0 48px' }}>
          Not a generic score. Not vague suggestions. Specific findings grounded in what&apos;s actually on your page, ranked by estimated conversion impact, with plain-English fixes and AI-rewritten copy ready to drop in.
        </p>

        {/* Mock report card — static illustration */}
        <div style={{
          background: 'rgba(111, 155, 198, 0.02)',
          borderTop:'1px solid rgba(255,255,255,0.12)',
          borderLeft:'1px solid rgba(255,255,255,0.08)',
          borderRight:'1px solid rgba(255,255,255,0.04)',
          borderBottom:'1px solid rgba(255,255,255,0.03)',
          padding:32,
          boxShadow: 'inset 0 1px 0 0 rgba(111, 155, 198, 0.15), 0 0 0 1px rgba(111, 155, 198, 0.08)',
        }}>
          {/* Bridge line — contextualizes the mock for founders */}
          <p style={{ ...SANS,fontStyle:'italic',fontSize:13,color:INK_MUT,margin:'0 0 20px',lineHeight:1.55 }}>
            This is exactly what your report looks like — same format, same finding structure, grounded in what&apos;s actually on your page.
          </p>

          {/* Label */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:8 }}>
            <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:'rgba(111,155,198,0.35)',margin:0 }}>
              EXAMPLE SCAN RESULT — STATIC ILLUSTRATION
            </p>
            <p style={{ ...MONO,fontSize:9,color:LIFT_GREEN,margin:0 }}>acme-saas.com</p>
          </div>

          {/* Score row — ring draws in when scrolled into view */}
          <div style={{ display:'flex',alignItems:'center',gap:20,marginBottom:28,paddingBottom:24,borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexWrap:'wrap' }}>
            <div ref={ringRef} style={{ position:'relative' }}>
              {/* Ring-pulse glow */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '220px',
                  height: '220px',
                  background: 'radial-gradient(ellipse at center, rgba(232, 99, 95, 0.22) 0%, rgba(232, 99, 95, 0.066) 40%, rgba(232, 99, 95, 0.02) 65%, transparent 85%)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  borderRadius: '50%',
                  animation: 'ring-pulse 4s ease-in-out infinite',
                }}
              />
              <div style={{ filter:'drop-shadow(0 0 5px rgba(232,99,95,0.35))', position:'relative', zIndex: 1 }}>
                <ScoreRing score={61} size="lg" animate={ringInView} />
              </div>
            </div>
            <div>
              <p style={{ ...MONO,fontSize:11,color:'rgba(111, 155, 198, 0.8)',margin:'0 0 6px' }}>63rd percentile · B2B SaaS</p>
              <p style={{ ...SANS,fontSize:13,color:INK_SEC,margin:0,lineHeight:1.5,maxWidth:480 }}>
                37 sites in your category score higher. Your top 3 fixes could move you to the 78th percentile.
              </p>
            </div>
          </div>

          {/* Finding cards — staggered entry. Card 0 is fully expanded (static illustration). */}
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            {MOCK_FINDINGS.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: 'easeOut' }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: f.bg,
                  border: `0.5px solid ${f.border}`,
                  borderLeft: i === 0
                    ? '2px solid rgba(232, 99, 95, 0.45)'
                    : '2px solid rgba(239, 178, 62, 0.35)',
                  padding: 16,
                  transition: 'box-shadow 0.25s ease',
                  boxShadow: hoveredCard === i
                    ? i === 0
                      ? 'inset 0 1px 0 0 rgba(232, 99, 95, 0.12), 0 0 0 1px rgba(232, 99, 95, 0.2), 0 0 20px rgba(232, 99, 95, 0.07)'
                      : 'inset 0 1px 0 0 rgba(239, 178, 62, 0.1), 0 0 0 1px rgba(239, 178, 62, 0.18), 0 0 20px rgba(239, 178, 62, 0.06)'
                    : i === 0
                      ? 'inset 0 1px 0 0 rgba(232, 99, 95, 0.12)'
                      : 'inset 0 1px 0 0 rgba(239, 178, 62, 0.1)',
                }}
              >
                {/* A) Header row — severity badge, title, lift — same for all cards */}
                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8,gap:12,flexWrap:'wrap' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
                    <span style={{
                      ...MONO,fontSize:10,color:f.severityColor,
                      border:`0.5px solid ${f.border}`,
                      padding:'2px 8px',textTransform:'uppercase',letterSpacing:'0.1em',flexShrink:0,
                    }}>
                      {f.severity}
                    </span>
                    <span style={{ ...DISP,fontWeight:600,fontSize:14,color:INK_PRI }}>{f.title}</span>
                  </div>
                  <span style={{ ...MONO,fontSize:11,color:LIFT_GREEN,whiteSpace:'nowrap',flexShrink:0,textShadow:'0 0 8px rgba(0, 196, 140, 0.4)' }}>
                    EST. LIFT {f.lift}
                  </span>
                </div>
                {i === 0 ? (
                  // Expanded first finding — static illustration showing full report detail level
                  <>
                    {/* B) Evidence row */}
                    <div style={{ borderLeft:'2px solid rgba(232,99,95,0.3)',paddingLeft:12,marginBottom:12 }}>
                      <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:INK_MUT,margin:'0 0 5px' }}>EVIDENCE</p>
                      <p style={{ ...MONO,fontSize:12,color:INK_SEC,margin:0,lineHeight:1.55 }}>
                        Your H1 reads: &ldquo;The project management tool built for remote teams.&rdquo; This describes the product, not the outcome. No benefit statement above the fold.
                      </p>
                    </div>
                    {/* C) Fix row */}
                    <div style={{ marginBottom:14 }}>
                      <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:INK_MUT,margin:'0 0 5px' }}>FIX</p>
                      <p style={{ ...SANS,fontSize:13,color:INK_SEC,margin:0,lineHeight:1.55 }}>
                        Rewrite the headline to lead with the outcome the visitor gets, not the feature you built. What does the user achieve? Lead with that.
                      </p>
                    </div>
                    {/* D) Mini copy preview — static illustration */}
                    <div style={{ display:'flex',borderTop:'0.5px solid rgba(255,255,255,0.06)',marginBottom:14 }}>
                      <div style={{ flex:1,padding:'10px 12px 10px 0',borderRight:'0.5px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:INK_MUT,margin:'0 0 6px' }}>ORIGINAL</p>
                        <p style={{ ...SANS,fontSize:12,fontStyle:'italic',color:INK_MUT,margin:0,lineHeight:1.5 }}>
                          &ldquo;The project management tool built for remote teams.&rdquo;
                        </p>
                      </div>
                      <div style={{ flex:1,padding:'10px 0 10px 12px',borderLeft:'1px solid rgba(0, 196, 140, 0.2)' }}>
                        <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:'rgba(0, 196, 140, 0.9)',margin:'0 0 6px' }}>REWRITTEN</p>
                        <p style={{ ...SANS,fontSize:12,color:INK_PRI,margin:0,lineHeight:1.5 }}>
                          &ldquo;Ship projects on time, every time — no matter where your team works.&rdquo;
                        </p>
                      </div>
                    </div>
                    {/* E) Footer note */}
                    <p style={{ ...MONO,fontSize:10,color:INK_MUT,margin:0 }}>
                      2 additional findings not shown · full report includes all findings with evidence + fixes
                    </p>
                  </>
                ) : (
                  // Compact summary — cards 2 and 3
                  <p style={{ ...SANS,fontSize:13,color:INK_SEC,margin:0,lineHeight:1.55 }}>{f.desc}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 3 — AI-Rewritten Copy (standalone) ────────────────────────────────

const REWRITE_EXAMPLES = [
  {
    type: 'HEADLINE',
    original: 'The project management tool built for remote teams.',
    rewritten: 'Ship projects on time, every time — no matter where your team works.',
  },
  {
    type: 'PRIMARY CTA',
    original: 'Get started',
    rewritten: 'Start shipping on time — free',
  },
  {
    type: 'VALUE PROPOSITION',
    original: 'Powerful features for modern teams',
    rewritten: "Everything your team needs to hit every deadline — nothing you don’t",
  },
] as const

function AIRewriteSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`@media(max-width:639px){.d-rewrite-cols{flex-direction:column!important}}`}</style>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          AI-REWRITTEN COPY
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          Not just what&apos;s broken. How to fix it.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 32px' }}>
          Every critical finding includes a drop-in replacement — headline rewritten, CTA rewritten, copy rewritten. Ready to hand to your designer or paste directly.
        </p>

        {/* Three rewrite examples — static illustration */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8 }}>
          <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.18em',color:INK_MUT,margin:0 }}>THREE TYPES OF REWRITE INCLUDED</p>
          <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:'rgba(111,155,198,0.3)',margin:0 }}>EXAMPLE SCAN RESULT — STATIC ILLUSTRATION</p>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {REWRITE_EXAMPLES.map(ex => (
            <div key={ex.type}>
              <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:INK_MUT,margin:'0 0 6px' }}>{ex.type}</p>
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)',borderLeft:'1px solid rgba(255,255,255,0.07)',borderRight:'1px solid rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.03)',boxShadow:'inset 0 1px 0 0 rgba(111, 155, 198, 0.1)' }}>
                <div className="d-rewrite-cols" style={{ display:'flex' }}>
                  <div style={{ flex:1,padding:28,borderRight:'0.5px solid rgba(111,155,198,0.1)',background:'rgba(255,255,255,0.01)' }}>
                    <p style={{ ...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.18em',color:'rgba(255,255,255,0.25)',margin:'0 0 14px' }}>ORIGINAL</p>
                    <p style={{ ...SANS,fontSize:17,color:INK_SEC,margin:0,lineHeight:1.55,opacity:0.35 }}>&ldquo;{ex.original}&rdquo;</p>
                  </div>
                  <div style={{ flex:1,padding:28,position:'relative',borderLeft:'1px solid rgba(0, 196, 140, 0.25)',boxShadow:'inset 1px 0 0 0 rgba(0, 196, 140, 0.1)' }}>
                    <div aria-hidden="true" style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 40% 50%, rgba(0, 196, 140, 0.14) 0%, rgba(0, 196, 140, 0.05) 55%, transparent 80%)',pointerEvents:'none',zIndex:0,borderRadius:'inherit' }} />
                    <p style={{ position:'relative',...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.18em',color:'rgba(0, 196, 140, 0.9)',margin:'0 0 14px',textShadow:'0 0 12px rgba(0, 196, 140, 0.4)' }}>REWRITTEN</p>
                    <p style={{ position:'relative',...SANS,fontSize:17,color:INK_PRI,margin:0,lineHeight:1.55 }}>&ldquo;{ex.rewritten}&rdquo;</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:'16px 0 0' }}>
          Every critical and high-severity finding includes a drop-in replacement. No copywriter required.
        </p>
      </div>
    </section>
  )
}

// ── Section 4 — Report Anatomy ────────────────────────────────────────────────

const REPORT_ROWS = [
  { name: 'Conversion score', content: 'A 0–100 weighted composite across all 307 checks. Below 70 is flagged critical.' },
  { name: 'Percentile rank', content: 'Where your score sits against real sites in your exact vertical — not a generic industry average.' },
  { name: 'Ranked findings', content: 'Every failing check listed by priority. P1 down to P-whatever. Each one includes evidence, severity, and estimated conversion lift.' },
  { name: 'Evidence per finding', content: 'The specific element on your page that triggered the finding — what was present, absent, or misplaced.' },
  { name: 'Fix per finding', content: 'A plain-English description of exactly what to change and why. No interpretation required.' },
  { name: 'AI-rewritten copy', content: 'Drop-in replacement headlines, CTAs, and value propositions for every critical finding. Ready to hand to a designer.' },
]

function ReportAnatomySection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          INSIDE THE REPORT
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          Everything in one place. Nothing to interpret.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 40px' }}>
          Every webdoc report has the same structure. You always know what you&apos;re looking at and what to do with it.
        </p>

        {/* Report anatomy diagram — STATIC ILLUSTRATION */}
        <div style={{ display:'flex', gap:0, alignItems:'flex-start', marginBottom:32, flexWrap:'wrap' }}>
          {/* Left column — score ring */}
          <div style={{ flex:'0 0 35%', minWidth:180, display:'flex', flexDirection:'column', alignItems:'center', paddingRight:32, paddingTop:8 }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="rgba(111,155,198,0.12)" strokeWidth="4" fill="none" />
              <circle cx="50" cy="50" r="40" stroke={CRIT} strokeWidth="4" strokeDasharray="251.33" strokeDashoffset="97.97" strokeLinecap="round" fill="none" transform="rotate(-90 50 50)" />
              <text x="50" y="61" textAnchor="middle" fill={CRIT} style={{ fontFamily:'"Space Grotesk",sans-serif', fontSize:26, fontWeight:700 }}>61</text>
            </svg>
            <div style={{ textAlign:'center', marginTop:8 }}>
              <span style={{ ...MONO, fontSize:8, color:CRIT, border:`0.5px solid ${CRIT}`, padding:'1px 5px', textTransform:'uppercase', letterSpacing:'0.08em' }}>CRITICAL</span>
            </div>
            <p style={{ ...MONO, fontSize:9, color:INK_MUT, textAlign:'center', margin:'8px 0 0', lineHeight:1.5 }}>63rd pct · B2B SaaS</p>
            <div style={{ width:1, height:40, background:'rgba(111,155,198,0.2)', margin:'12px auto 0' }} />
            <p style={{ ...MONO, fontSize:8, color:INK_MUT, textAlign:'center', margin:'8px 0 0', textTransform:'uppercase', letterSpacing:'0.12em' }}>YOUR REPORT</p>
          </div>
          {/* Right column — six component boxes */}
          <div style={{ flex:'1 1 65%', minWidth:220 }}>
            {REPORT_ROWS.map((row, i) => (
              <div key={row.name} style={{ display:'flex', alignItems:'center', marginBottom: i < REPORT_ROWS.length - 1 ? 16 : 0 }}>
                <div style={{ width:40, height:1, background:'rgba(111,155,198,0.08)', flexShrink:0 }} />
                <div style={{ flex:1, borderLeft:'2px solid rgba(111,155,198,0.2)', paddingLeft:16 }}>
                  <p style={{ ...DISP, fontSize:14, fontWeight:500, color:INK_PRI, margin:'0 0 2px' }}>{row.name}</p>
                  <p style={{ ...SANS, fontSize:12, color:INK_MUT, margin:0, lineHeight:1.55 }}>{row.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ ...MONO,fontSize:11,color:INK_MUT,textAlign:'center',margin:0 }}>
          Delivered in dashboard · exportable as PDF · shareable via link
        </p>
      </div>
    </section>
  )
}

// ── Section 5 — Vertical Showcase ────────────────────────────────────────────

// STATIC ILLUSTRATION
const VERTICAL_CARDS = [
  {
    type: 'B2B SAAS',
    desc: 'Input your site as B2B SaaS. Checks target pricing page clarity, trial CTA placement, feature vs outcome framing, social proof positioning, and demo flow friction.',
    findings: [
      { sev: 'CRITICAL', sevColor: '#E8635F', sevBorder: 'rgba(232,99,95,0.4)', title: 'Trial CTA below fold on mobile', lift: '+8–12%', evidence: 'Primary action not visible on 375px viewport without scrolling' },
      { sev: 'HIGH', sevColor: '#EFB23E', sevBorder: 'rgba(239,178,62,0.4)', title: 'Feature list leads with capabilities, not outcomes', lift: '+6–9%', evidence: 'Above-fold copy describes what the product does, not what the user gets' },
    ],
  },
  {
    type: 'E-COMMERCE',
    desc: 'Input your site as e-commerce. Checks target product page proof, add-to-cart visibility, shipping cost transparency, cart abandonment signals, and purchase trust indicators.',
    findings: [
      { sev: 'CRITICAL', sevColor: '#E8635F', sevBorder: 'rgba(232,99,95,0.4)', title: 'No social proof on product page above add-to-cart', lift: '+10–15%', evidence: 'First testimonial appears at 1,800px — below the purchase decision point' },
      { sev: 'HIGH', sevColor: '#EFB23E', sevBorder: 'rgba(239,178,62,0.4)', title: 'Shipping cost not visible until checkout', lift: '+7–11%', evidence: 'Price anchoring incomplete — total cost unknown until final step' },
    ],
  },
  {
    type: 'AGENCY / SERVICE',
    desc: 'Input your site as agency or service. Checks target outcome specificity, case study placement, inquiry CTA clarity, service page trust signals, and contact form friction.',
    findings: [
      { sev: 'HIGH', sevColor: '#EFB23E', sevBorder: 'rgba(239,178,62,0.4)', title: 'No specific outcome stated in hero', lift: '+9–14%', evidence: "'We help businesses grow' is not a value proposition" },
      { sev: 'HIGH', sevColor: '#EFB23E', sevBorder: 'rgba(239,178,62,0.4)', title: 'Contact form requires 7 fields', lift: '+6–10%', evidence: 'Industry data shows >4 fields reduces submission rate by 50%+' },
    ],
  },
  {
    type: 'CREATOR / NEWSLETTER',
    desc: 'Input your site as creator or newsletter. Checks target opt-in value clarity, above-fold proof of content quality, subscribe CTA specificity, and social proof near the conversion point.',
    findings: [
      { sev: 'HIGH', sevColor: '#EFB23E', sevBorder: 'rgba(239,178,62,0.4)', title: 'No proof of content quality above fold', lift: '+8–12%', evidence: 'Visitor cannot evaluate what subscribing gets them before the opt-in ask' },
      { sev: 'HIGH', sevColor: '#EFB23E', sevBorder: 'rgba(239,178,62,0.4)', title: 'Single opt-in CTA with no supporting reason to act', lift: '+5–8%', evidence: 'No social proof, sample content, or urgency signal near the CTA' },
    ],
  },
]

function VerticalShowcaseSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`@media(max-width:767px){.d-vertical-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          BUILT FOR YOUR SITE TYPE
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          Different sites need different checks.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 40px' }}>
          Tell us what kind of site you have. We apply the check subset that actually matters for your conversion model — e-commerce gets e-commerce diagnostics, SaaS gets SaaS diagnostics. Not a generic audit applied to everything.
        </p>

        <div className="d-vertical-grid" style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:24 }}>
          {VERTICAL_CARDS.map(card => (
            <div key={card.type} style={{
              borderTop:'1px solid rgba(255,255,255,0.08)',
              borderLeft:'1px solid rgba(255,255,255,0.05)',
              borderRight:'1px solid rgba(255,255,255,0.03)',
              borderBottom:'1px solid rgba(255,255,255,0.03)',
              padding:20,
              boxShadow:'inset 0 1px 0 0 rgba(111,155,198,0.08)',
            }}>
              <p style={{ ...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.15em',color:STEEL,margin:'0 0 8px' }}>{card.type}</p>
              <p style={{ ...SANS,fontSize:13,color:INK_MUT,margin:'0 0 16px',lineHeight:1.55 }}>{card.desc}</p>
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                {card.findings.map((f, fi) => (
                  <div key={fi} style={{ borderLeft:`2px solid ${f.sevColor === '#E8635F' ? 'rgba(232,99,95,0.35)' : 'rgba(239,178,62,0.3)'}`, paddingLeft:10 }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4,gap:8 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <span style={{ ...MONO,fontSize:8,color:f.sevColor,border:`0.5px solid ${f.sevBorder}`,padding:'1px 4px',textTransform:'uppercase',letterSpacing:'0.08em',flexShrink:0 }}>{f.sev}</span>
                        <span style={{ ...DISP,fontSize:12,fontWeight:500,color:INK_PRI,lineHeight:1.3 }}>{f.title}</span>
                      </div>
                      <span style={{ ...MONO,fontSize:9,color:LIFT_GREEN,flexShrink:0 }}>{f.lift}</span>
                    </div>
                    <p style={{ ...SANS,fontSize:11,color:INK_MUT,margin:0,lineHeight:1.4,opacity:0.8 }}>{f.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ ...MONO,fontSize:11,color:INK_MUT,textAlign:'center',margin:0 }}>
          14 site type verticals · you choose your type · relevant checks applied automatically
        </p>
      </div>
    </section>
  )
}

// ── Section 6 — What We Check ─────────────────────────────────────────────────

const SCOPE_ITEMS_LEFT = [
  { cat: 'Value proposition', q: "Does your headline communicate a specific outcome, or just describe what you built?", ex: "ex: 'Hero headline is feature-led, not outcome-led · est. lift +12–18%'" },
  { cat: 'Social proof', q: "Are testimonials visible before 800px? Are they specific or generic?", ex: "ex: 'No testimonials visible above 800px fold · est. lift +8–11%'" },
  { cat: 'CTA clarity', q: "Is there one primary action above the fold, or are visitors choosing between competing options?", ex: "ex: 'Dual primary CTAs create decision paralysis · est. lift +6–9%'" },
  { cat: 'Offer structure', q: "Is your pricing, trial, or free tier visible and framed around value rather than cost?", ex: "ex: 'Pricing not visible without scrolling · est. lift +5–8%'" },
  { cat: 'Objection handling', q: "Does the page address the most common reasons someone wouldn't buy?", ex: "ex: 'No FAQ or risk-reversal above fold · est. lift +4–7%'" },
]

const SCOPE_ITEMS_RIGHT = [
  { cat: 'Visual hierarchy', q: "Does the eye flow naturally from headline to proof to action, or does layout compete with itself?", ex: "ex: 'Eye tracking path broken by competing elements · est. lift +5–9%'" },
  { cat: 'Trust signals', q: "Are security badges, guarantees, or credentials present where purchase anxiety peaks?", ex: "ex: 'No security badge near payment CTA · est. lift +3–6%'" },
  { cat: 'Mobile experience', q: "Does the page convert on mobile, or does it just render without breaking?", ex: "ex: 'Primary CTA below fold on 375px viewport · est. lift +8–12%'" },
  { cat: 'Load perception', q: "Does the page feel fast? Perceived load time affects conversion independent of actual speed.", ex: "ex: 'No loading state — page appears frozen for 2.1s · est. lift +4–7%'" },
  { cat: 'Above-fold layout', q: "What does a visitor see before scrolling? Is it enough to make them want to scroll?", ex: "ex: 'Value prop, proof, and CTA not all visible before scroll · est. lift +10–15%'" },
]

function WhatWeCheckSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1400px',
          height: '700px',
          background: 'radial-gradient(ellipse at center, rgba(111, 155, 198, 0.07) 0%, rgba(111, 155, 198, 0.021) 40%, rgba(111, 155, 198, 0.02) 65%, transparent 85%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <style>{`@media(max-width:767px){.d-scope-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth:1000,margin:'0 auto',position:'relative',zIndex:1 }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          SCOPE
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          27 categories. Every conversion surface.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 40px' }}>
          The engine checks every element a visitor encounters from the moment they land — not just your headline and CTA. If it affects whether someone converts, it&apos;s in the audit.
        </p>

        {/* Diagnostic grid — two columns, no cards */}
        <div className="d-scope-grid" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 48px',marginBottom:32 }}>
          <div>
            {SCOPE_ITEMS_LEFT.map(item => (
              <div key={item.cat} style={{ borderLeft:'2px solid rgba(111,155,198,0.2)',paddingLeft:16,marginBottom:32 }}>
                <p style={{ ...DISP,fontSize:14,fontWeight:500,color:INK_PRI,margin:'0 0 4px' }}>{item.cat}</p>
                <p style={{ ...SANS,fontSize:13,color:INK_MUT,margin:'0 0 6px',lineHeight:1.55 }}>{item.q}</p>
                <p style={{ ...MONO,fontSize:10,fontStyle:'italic',color:'rgba(111,155,198,0.55)',margin:0,lineHeight:1.5 }}>{item.ex}</p>
              </div>
            ))}
          </div>
          <div>
            {SCOPE_ITEMS_RIGHT.map(item => (
              <div key={item.cat} style={{ borderLeft:'2px solid rgba(111,155,198,0.2)',paddingLeft:16,marginBottom:32 }}>
                <p style={{ ...DISP,fontSize:14,fontWeight:500,color:INK_PRI,margin:'0 0 4px' }}>{item.cat}</p>
                <p style={{ ...SANS,fontSize:13,color:INK_MUT,margin:'0 0 6px',lineHeight:1.55 }}>{item.q}</p>
                <p style={{ ...MONO,fontSize:10,fontStyle:'italic',color:'rgba(111,155,198,0.55)',margin:0,lineHeight:1.5 }}>{item.ex}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ ...MONO,fontSize:11,color:'rgba(111, 155, 198, 0.6)',margin:'0 0 12px',textShadow:'0 0 8px rgba(111, 155, 198, 0.2)' }}>
          307 checks across 27 categories — every scan, every plan.
        </p>
        <p style={{ ...SANS,fontSize:13,color:INK_MUT,margin:0,lineHeight:1.65,maxWidth:640 }}>
          Each category runs multiple checks — a single visit to &apos;social proof&apos; might fire 12 individual checks across testimonial placement, specificity, recency, and logo strip visibility.
        </p>
      </div>
    </section>
  )
}

// ── Section 7 — How It Works ──────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    num: '01',
    title: 'You paste a URL',
    desc: 'Any publicly accessible page — homepage, pricing page, landing page. No installation, no code.',
    tag: null,
    bright: false,
  },
  {
    num: '02',
    title: 'Headless Chrome renders your page',
    desc: 'We load your actual live page in a real browser — the same DOM your visitors see, above-the-fold layout measured.',
    tag: 'browserless · stealth mode · full dom render · 1280×800',
    bright: true,
  },
  {
    num: '03',
    title: '307 checks fire across 27 categories',
    desc: 'Every conversion surface is evaluated — headline, CTA, social proof, trust signals, mobile layout, load perception, and more.',
    tag: 'parallel execution · ai-grounded · citation required or finding is dropped',
    bright: false,
  },
  {
    num: '04',
    title: 'Findings are ranked by conversion impact',
    desc: 'Each failing check is weighted by its estimated effect on conversion rate. Priority 1 matters most.',
    tag: 'corpus-calibrated weights · estimated lift range per finding',
    bright: false,
  },
  {
    num: '05',
    title: 'AI generates fixes and rewrites',
    desc: 'Every critical and high-severity finding gets a plain-English fix and drop-in replacement copy — ready to paste directly.',
    tag: 'grounded in visible content · not a generic suggestion',
    bright: false,
  },
  {
    num: '06',
    title: 'Report assembles with corpus benchmarks',
    desc: 'Your score is positioned against real sites in your exact vertical. You see where you stand and what to fix first.',
    tag: 'percentile ranking · vertical-specific · 4,812 site corpus',
    bright: false,
  },
]

function HowItWorksSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          THE PROCESS
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 48px',lineHeight:1.1 }}>
          What happens when you paste a URL.
        </h2>

        {/* Vertical pipeline */}
        <div style={{ position:'relative' }}>
          {/* Connector line */}
          <div style={{ position:'absolute',left:7,top:8,bottom:8,width:2,background:'rgba(111,155,198,0.2)',zIndex:0 }} />

          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.num} style={{ position:'relative',display:'flex',gap:24,alignItems:'flex-start',marginBottom: i < PIPELINE_STEPS.length - 1 ? 48 : 0 }}>
              {/* Node on connector line */}
              <div style={{ flexShrink:0,width:16,display:'flex',justifyContent:'center',paddingTop:5,zIndex:1 }}>
                <div style={{
                  width:10,height:10,borderRadius:'50%',
                  background: step.bright ? 'rgba(111,155,198,0.7)' : 'rgba(111,155,198,0.2)',
                  border: `1px solid ${step.bright ? 'rgba(111,155,198,0.9)' : 'rgba(111,155,198,0.35)'}`,
                  flexShrink:0,
                }} />
              </div>
              {/* Step content — full width */}
              <div style={{ flex:1,minWidth:0,paddingBottom:4 }}>
                <p style={{ ...MONO,fontSize:11,fontWeight:500,color:'rgba(111,155,198,0.7)',margin:'0 0 6px',letterSpacing:'0.08em' }}>{step.num}</p>
                <p style={{ ...DISP,fontSize:18,fontWeight:700,color:INK_PRI,margin:'0 0 10px',lineHeight:1.2 }}>{step.title}</p>
                <p style={{ ...SANS,fontSize:14,color:INK_SEC,lineHeight:1.65,margin:0,maxWidth:640 }}>{step.desc}</p>
                {step.tag && (
                  <p style={{ ...MONO,fontSize:10,color:INK_MUT,margin:'8px 0 0',letterSpacing:'0.04em',lineHeight:1.5 }}>{step.tag}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop:40,borderTop:'0.5px solid rgba(111,155,198,0.1)',paddingTop:24,textAlign:'center' }}>
          <p style={{ ...SANS,fontSize:14,color:INK_MUT,margin:'0 0 10px',lineHeight:1.65 }}>
            Total time from URL to full report: approximately 90 seconds.
          </p>
          <p style={{ ...MONO,fontSize:10,color:INK_MUT,margin:0,opacity:0.6 }}>
            No technical knowledge required — paste a URL, read the report, fix what matters.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Section 8 — Comparison ────────────────────────────────────────────────────

const CHATGPT_ITEMS = [
  'Sees text you paste, not your live page',
  'No structured checks — chat response only',
  'No conversion benchmarks',
  'No ranked output',
  'Rewrite quality varies with prompt skill',
]

const LIGHTHOUSE_ITEMS = [
  'Measures load speed and core web vitals',
  'Not a conversion audit — no CRO checks',
  'No findings about copy, CTA, or social proof',
  "Score doesn't correlate with conversion rate",
  'No fixes — just scores and flags',
]

const WEBDOC_ITEMS = [
  'Renders your live DOM in headless Chrome',
  '307 structured checks across 27 categories',
  'Ranked by estimated conversion impact',
  'Evidence cited per finding',
  'Plain-English fix + AI-rewritten copy included',
  'Benchmarked against real sites in your vertical',
]

const WEBDOC_ROWS = [
  { title: 'Renders your live DOM in headless Chrome', sub: 'not text you paste — your actual live page' },
  { title: '307 structured checks across 27 categories', sub: 'parallel execution · citation required per finding' },
  { title: 'Ranked by estimated conversion impact', sub: 'P1 matters most · work down the list' },
  { title: 'Evidence cited per finding', sub: 'what was present, absent, or misplaced on your page' },
  { title: 'Plain-English fix included', sub: 'no interpretation required · hand it to anyone' },
  { title: 'AI-rewritten copy for every critical finding', sub: 'drop-in headline, CTA, value prop · ready to paste' },
]

const STAT_CHIPS = ['307 CHECKS', '~90s MEDIAN', '4,812 SITES SCANNED']

function ComparisonSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`
        @media(max-width:1023px){.d-compare-grid{grid-template-columns:25fr 25fr 50fr!important}}
        @media(max-width:767px){.d-compare-grid{grid-template-columns:1fr!important}.d-compare-ghost-row{display:flex!important;gap:16px!important}.d-compare-ghost-row>div{flex:1!important}}
      `}</style>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          HOW IT COMPARES
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 48px',lineHeight:1.1 }}>
          Not ChatGPT. Not Lighthouse. Not a generic audit.
        </h2>

        <div className="d-compare-grid" style={{ display:'grid',gridTemplateColumns:'20fr 20fr 60fr',gap:16,alignItems:'start' }}>
          {/* Column 1 — ChatGPT (ghosted) */}
          <div style={{ border:'1px solid rgba(255,255,255,0.06)',padding:20,opacity:0.35 }}>
            <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.15em',color:'rgba(255,255,255,0.3)',margin:'0 0 10px' }}>CHATGPT</p>
            <p style={{ ...SANS,fontSize:13,color:'rgba(255,255,255,0.25)',margin:'0 0 16px',lineHeight:1.5 }}>A language model with no live page access</p>
            {CHATGPT_ITEMS.map(item => (
              <p key={item} style={{ ...SANS,fontSize:13,color:'rgba(255,255,255,0.25)',margin:'0 0 8px',lineHeight:1.5 }}>· {item}</p>
            ))}
          </div>

          {/* Column 2 — Lighthouse (ghosted) */}
          <div style={{ border:'1px solid rgba(255,255,255,0.06)',padding:20,opacity:0.35 }}>
            <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.15em',color:'rgba(255,255,255,0.3)',margin:'0 0 10px' }}>LIGHTHOUSE / PAGESPEED</p>
            <p style={{ ...SANS,fontSize:13,color:'rgba(255,255,255,0.25)',margin:'0 0 16px',lineHeight:1.5 }}>A technical performance tool</p>
            {LIGHTHOUSE_ITEMS.map(item => (
              <p key={item} style={{ ...SANS,fontSize:13,color:'rgba(255,255,255,0.25)',margin:'0 0 8px',lineHeight:1.5 }}>· {item}</p>
            ))}
          </div>

          {/* Column 3 — webdoc (dominant) */}
          <div style={{
            border:'1px solid rgba(111,155,198,0.5)',
            background:'rgba(111,155,198,0.04)',
            boxShadow:'0 0 60px rgba(111,155,198,0.1), 0 0 120px rgba(111,155,198,0.04), inset 0 1px 0 0 rgba(111,155,198,0.3)',
            padding:32,
          }}>
            {/* Badge row */}
            <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:STEEL,margin:'0 0 10px',border:'1px solid rgba(111,155,198,0.3)',padding:'4px 10px',display:'inline-block' }}>WHAT YOU ACTUALLY GET</p>
            {/* Name */}
            <p style={{ ...MONO,fontSize:16,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',color:'rgba(111,155,198,1.0)',margin:'0 0 10px',textShadow:'0 0 20px rgba(111,155,198,0.5)' }}>WEBDOC</p>
            {/* Descriptor */}
            <p style={{ ...SANS,fontSize:16,color:INK_PRI,margin:'0 0 16px',lineHeight:1.5 }}>A structured conversion audit engine</p>
            {/* Divider */}
            <div style={{ height:1,background:'rgba(111,155,198,0.15)',marginBottom:20 }} />
            {/* Six capability rows */}
            {WEBDOC_ROWS.map((row, ri) => (
              <div key={ri} style={{ borderLeft:'2px solid rgba(111,155,198,0.3)',paddingLeft:12,marginBottom: ri < WEBDOC_ROWS.length - 1 ? 16 : 0 }}>
                <p style={{ ...DISP,fontSize:15,fontWeight:500,color:INK_PRI,margin:'0 0 3px',lineHeight:1.3 }}>{row.title}</p>
                <p style={{ ...MONO,fontSize:10,color:INK_MUT,margin:0,lineHeight:1.4 }}>{row.sub}</p>
              </div>
            ))}
            {/* Divider + stat chips */}
            <div style={{ height:1,background:'rgba(111,155,198,0.15)',margin:'20px 0 16px' }} />
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {STAT_CHIPS.map(chip => (
                <span key={chip} style={{ ...MONO,fontSize:10,color:STEEL,border:'1px solid rgba(111,155,198,0.2)',padding:'6px 12px',letterSpacing:'0.06em' }}>{chip}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 9 — Why Different ─────────────────────────────────────────────────

type ObjectionCard = { q: string; a: string; tag: string }

const OBJECTIONS: ObjectionCard[] = [
  {
    q: "How do I know it's not hallucinating?",
    a: "Every finding must cite specific visible content — what's present, absent, or misplaced on your actual page. The model cannot pass a check without grounding it in evidence. Findings that fail validation are dropped before they reach you. You will never see a finding that isn't traceable to something real on your page.",
    tag: 'grounding rule: cite visible content or fail',
  },
  {
    q: 'Why not just paste my URL into ChatGPT?',
    a: "A language model sees the text you paste, not your live page. webdoc renders the full DOM in headless Chrome, reads your above-the-fold layout, measures element positions, runs 307 structured checks against conversion best practices, and returns ranked output with estimated lift numbers. ChatGPT returns a chat response. This returns a report.",
    tag: '307 checks · rendered DOM · ranked output · not a chat response',
  },
  {
    q: "I already know my site has problems. I don't have time to interpret a report.",
    a: "Every finding comes with a severity rank, a one-sentence plain-English description, a concrete fix, and drop-in replacement copy. There's nothing to interpret. Work down the list from priority 1. Most teams ship the top three fixes in an afternoon.",
    tag: 'ranked by impact · fix included · copy ready to paste',
  },
  {
    q: "Will it work on my site? It's built on Webflow / Squarespace / Framer.",
    a: "webdoc renders your live page in headless Chrome — it sees what a browser sees, not your CMS. Webflow, Squarespace, Framer, Shopify, WordPress, Next.js, custom stacks — if it's publicly accessible and loads in a browser, we can scan it. The only sites we can't scan are ones behind a login wall or that actively block automated access.",
    tag: 'renders in headless chrome · stack-agnostic · publicly accessible pages only',
  },
  {
    q: "How is the score calculated? What does 61 actually mean?",
    a: "Every check returns a pass, fail, or partial result. Fails are weighted by their estimated conversion impact — a broken value proposition costs more points than a missing favicon. The final score is a weighted composite across all 307 checks. A score of 61 means your page is passing the majority of checks but has meaningful conversion gaps, particularly in high-weight categories. Scores below 70 are flagged as critical — the data shows a strong correlation between sub-70 scores and above-average bounce rates in the corpus.",
    tag: 'weighted by conversion impact · not a vanity metric · corpus-calibrated',
  },
  {
    q: "What if I disagree with a finding?",
    a: "Every finding cites the specific visible evidence it's based on — what element was present, absent, or misplaced, and why that matters for conversion. If you read a finding and think the evidence is wrong, the fix is simple: look at your page and check. The grounding rule means the model cannot invent evidence. If the finding cites something that isn't there, that's a bug — use the feedback flag in the report and we'll investigate. In practice, the findings that users disagree with most are the ones that turn out to be most accurate.",
    tag: 'every finding cites evidence · flaggable · grounded or dropped',
  },
  {
    q: "How often should I scan?",
    a: "Scan whenever you ship a meaningful change — new hero, new CTA, new pricing, new landing page. For most users on Starter that means once or twice a month. Free plan gives you three scans a month which covers most iteration cycles. Scanning the same unchanged page repeatedly won't change your findings — the engine reads what's there, not what was there last week. The corpus updates weekly so your percentile can shift even without a rescan as new sites are benchmarked.",
    tag: 'scan on meaningful changes · corpus updates weekly · not a set-and-forget tool',
  },
  {
    q: "Is this just for SaaS? I run an e-commerce store.",
    a: "The engine classifies your site type automatically — SaaS, e-commerce, agency, creator, marketplace — and applies the relevant check subset for your category. A Shopify product page gets different diagnostics than a B2B SaaS pricing page. The corpus benchmarks are also segmented by vertical so your percentile is always against comparable sites, not a mixed average. E-commerce, SaaS, agencies, and creator sites are all actively represented in the corpus.",
    tag: 'auto-classified · vertical-specific checks · e-comm and SaaS both supported',
  },
  {
    q: "What happens after I scan? Do I need to stay subscribed?",
    a: "Your report is saved and accessible any time you log in. If you cancel your subscription your existing reports don't disappear — you keep read access to everything you've already scanned. You only need an active plan to run new scans. Free plan users keep their three monthly scans indefinitely with no expiry on past reports. There's no lock-in — the report is yours.",
    tag: 'reports persist · no lock-in · cancel anytime',
  },
]

function WhyDifferentSection() {
  const [hoveredFaq, setHoveredFaq] = useState<number | null>(null)
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`@media(max-width:767px){.d-diff-grid{grid-template-columns:1fr!important}}`}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1400px',
          height: '700px',
          background: 'radial-gradient(ellipse at center, rgba(111, 155, 198, 0.05) 0%, rgba(111, 155, 198, 0.015) 40%, rgba(111, 155, 198, 0.02) 65%, transparent 85%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Ticks />
      <div style={{ maxWidth:1200,margin:'0 auto',position:'relative',zIndex:1 }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          THE DIFFERENCE
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 48px',lineHeight:1.1 }}>
          Built for anyone with a site that needs to perform.
        </h2>
        <div className="d-diff-grid" style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:24 }}>
          {OBJECTIONS.map((card, i) => (
            <motion.div
              key={card.q}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
              onMouseEnter={() => setHoveredFaq(i)}
              onMouseLeave={() => setHoveredFaq(null)}
              style={{
                background: hoveredFaq === i ? 'rgba(111, 155, 198, 0.025)' : SURFACE,
                borderTop:'1px solid rgba(255,255,255,0.12)',
                borderLeft: hoveredFaq === i ? '1px solid rgba(111, 155, 198, 0.2)' : '1px solid rgba(255,255,255,0.08)',
                borderRight:'1px solid rgba(255,255,255,0.04)',
                borderBottom:'1px solid rgba(255,255,255,0.03)',
                padding:28,
                transition: 'box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
                boxShadow: hoveredFaq === i
                  ? 'inset 0 1px 0 0 rgba(111, 155, 198, 0.22), 0 0 0 1px rgba(111, 155, 198, 0.12), 0 0 20px rgba(111, 155, 198, 0.05)'
                  : 'inset 0 1px 0 0 rgba(111, 155, 198, 0.1)',
              }}>
              <p style={{ ...DISP,fontWeight:600,fontSize:17,color:INK_PRI,margin:'0 0 14px',lineHeight:1.35 }}>{card.q}</p>
              <p style={{ ...SANS,fontSize:14,color:INK_SEC,lineHeight:1.7,margin:'0 0 16px' }}>{card.a}</p>
              <p style={{ ...MONO,fontSize:11,color:STEEL,margin:0,textShadow:'0 0 6px rgba(111, 155, 198, 0.25)' }}>{card.tag}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 10 — Benchmarks ───────────────────────────────────────────────────
// Renders the existing LandingCorpusStats component (bell curve, percentile, corpus stats).

// ── Section 11 — Multi-Site / Scale ──────────────────────────────────────────

const SINGLE_SITE_FEATURES = [
  'Full conversion audit per scan',
  'Score + percentile against your vertical',
  'Plain-English fixes + AI copy rewrites',
  'Monthly scan cadence on Starter',
]

const MULTI_SITE_FEATURES = [
  "White-label PDF — your brand, not webdoc's",
  'Scan history and score tracking per site',
  '100 API calls bundled for workflow integration',
  'Vertical-matched benchmarks per client site',
  'Evidence-backed findings — nothing vague in a client meeting',
  'Plain-English output — hand it to a client without translation',
]

function MultiSiteSection() {
  return (
    <section style={{
      padding: '80px 48px',
      borderTop: '0.5px solid rgba(111,155,198,0.1)',
      position: 'relative',
      overflow: 'visible',
      background: 'radial-gradient(ellipse 1000px 500px at 50% 50%, rgba(157, 140, 255, 0.04) 0%, transparent 70%)',
    }}>
      <style>{`@media(max-width:767px){.d-scale-cols{flex-direction:column!important}.d-scale-divider{display:none!important}}`}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: INK_MUT, margin: '0 0 16px' }}>
          AT SCALE
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', color: INK_PRI, letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.1 }}>
          Running audits for more than one site?
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: INK_SEC, lineHeight: 1.65, maxWidth: 580, margin: '0 0 40px' }}>
          The dashboard handles multiple sites natively. Each site gets its own report, score history, and benchmarks. White-label the output and it&apos;s ready to hand to a client.
        </p>

        {/* Two use-case columns */}
        <div className="d-scale-cols" style={{ display: 'flex', gap: 0, marginBottom: 40 }}>
          {/* Single site */}
          <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: INK_MUT, margin: '0 0 12px' }}>
              SINGLE SITE OWNER
            </p>
            <p style={{ ...SANS, fontSize: 14, color: INK_MUT, margin: '0 0 20px', lineHeight: 1.65 }}>
              Scan your site. Get the report. Fix what matters. Free to start, upgrade when you need more scans or the full report.
            </p>
            <div>
              {SINGLE_SITE_FEATURES.map(f => (
                <p key={f} style={{ ...SANS, fontSize: 13, color: INK_SEC, margin: '0 0 8px', lineHeight: 1.5 }}>· {f}</p>
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="d-scale-divider" style={{ width: 1, background: 'rgba(157,140,255,0.15)', flexShrink: 0 }} />

          {/* Multi-site */}
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 32 }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(157,140,255,0.75)', margin: '0 0 12px' }}>
              MULTI-SITE / CLIENT WORK
            </p>
            <p style={{ ...SANS, fontSize: 14, color: INK_MUT, margin: '0 0 20px', lineHeight: 1.65 }}>
              Run audits across multiple sites. Deliver white-label reports. Track score history per client. The dashboard handles all of it.
            </p>
            <div style={{ borderLeft: '2px solid rgba(157,140,255,0.25)', paddingLeft: 16 }}>
              {MULTI_SITE_FEATURES.map(f => (
                <p key={f} style={{ ...SANS, fontSize: 13, color: INK_SEC, margin: '0 0 8px', lineHeight: 1.5 }}>· {f}</p>
              ))}
            </div>
          </div>
        </div>

        {/* White-label mock panel — STATIC ILLUSTRATION */}
        <div style={{
          background: 'rgba(8,12,22,0.95)',
          border: '1px solid rgba(157,140,255,0.2)',
          padding: 28,
          marginBottom: 12,
        }}>
          {/* Header row */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              {/* Logo placeholder */}
              <div style={{ width:48, height:48, background:'rgba(157,140,255,0.15)', border:'1px solid rgba(157,140,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ ...MONO, fontSize:14, fontWeight:700, color:'rgba(157,140,255,0.9)' }}>AC</span>
              </div>
              <div>
                <p style={{ ...DISP, fontSize:20, fontWeight:700, color:INK_PRI, margin:'0 0 2px' }}>ACME AGENCY</p>
                <p style={{ ...SANS, fontSize:13, color:INK_MUT, margin:'0 0 3px' }}>Conversion Audit Report</p>
                <p style={{ ...MONO, fontSize:10, color:INK_MUT, margin:0 }}>acme-client.com · June 2026 · B2B SaaS</p>
              </div>
            </div>
            {/* Score ring 56px */}
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" stroke="rgba(111,155,198,0.12)" strokeWidth="3" fill="none" />
                <circle cx="28" cy="28" r="22" stroke={CRIT} strokeWidth="3" strokeDasharray="138.23" strokeDashoffset="53.91" strokeLinecap="round" fill="none" transform="rotate(-90 28 28)" />
                <text x="28" y="33" textAnchor="middle" fill={CRIT} style={{ fontFamily:'"Space Grotesk",sans-serif', fontSize:12, fontWeight:700 }}>61</text>
              </svg>
              <div style={{ marginTop:4 }}>
                <span style={{ ...MONO, fontSize:8, color:CRIT, border:`0.5px solid ${CRIT}`, padding:'1px 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>CRITICAL</span>
              </div>
              <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:'4px 0 0' }}>63rd percentile</p>
            </div>
          </div>
          <div style={{ height:1, background:'rgba(157,140,255,0.12)', marginBottom:16 }} />
          {/* Three mini finding rows */}
          {[
            { sev:'CRITICAL', sevColor:CRIT, sevBorder:'rgba(232,99,95,0.4)', title:'Hero headline is feature-led', lift:'+12–18%' },
            { sev:'HIGH', sevColor:HIGH_AMB, sevBorder:'rgba(239,178,62,0.4)', title:'No above-fold social proof', lift:'+8–11%' },
            { sev:'HIGH', sevColor:HIGH_AMB, sevBorder:'rgba(239,178,62,0.4)', title:'Dual primary CTAs create decision paralysis', lift:'+6–9%' },
          ].map((f, fi) => (
            <div key={fi} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, paddingBottom: fi < 2 ? 10 : 0, borderBottom: fi < 2 ? '0.5px solid rgba(157,140,255,0.08)' : 'none', marginBottom: fi < 2 ? 10 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ ...MONO, fontSize:8, color:f.sevColor, border:`0.5px solid ${f.sevBorder}`, padding:'1px 5px', textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0 }}>{f.sev}</span>
                <span style={{ ...DISP, fontSize:13, fontWeight:500, color:INK_PRI }}>{f.title}</span>
              </div>
              <span style={{ ...MONO, fontSize:10, color:LIFT_GREEN, flexShrink:0 }}>{f.lift}</span>
            </div>
          ))}
          <p style={{ ...MONO, fontSize:10, color:INK_MUT, margin:'12px 0 0', fontStyle:'italic' }}>+ 20 more findings · full report · evidence + fixes included</p>
        </div>
        <p style={{ ...MONO, fontSize: 10, color: INK_MUT, margin: '0 0 32px' }}>
          This is what your client receives. Your name. Your branding. webdoc never appears.
        </p>

        {/* CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a
            href="#pricing"
            style={{
              ...MONO, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'rgba(157, 140, 255, 0.75)',
              border: '0.5px solid rgba(157, 140, 255, 0.3)',
              padding: '10px 16px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            SEE MULTI-SITE PLANS →
          </a>
          <p style={{ ...MONO, fontSize: 11, color: INK_MUT, margin: 0 }}>
            Agency plan · $149/mo · includes 100 API calls
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Section 12 — Pricing ──────────────────────────────────────────────────────
// TODO: wire paid-tier CTAs to Stripe checkout once plan IDs are confirmed.

type PricingCard = {
  name: string
  kicker?: string
  price: string
  priceSub: string
  highlight: boolean
  features: string[]
  cta: string
  ctaHref: string
  ctaFilled: boolean
}

const PRICING_CARDS: PricingCard[] = [
  {
    name: 'Free',
    price: '$0',
    priceSub: 'no credit card',
    highlight: false,
    features: [
      '3 scans per month',
      "Score + top 3 findings — enough to see what's broken, not enough to fix everything",
      'Benchmarked against corpus',
    ],
    cta: 'Start free →',
    ctaHref: '/auth?surface=dashboard',
    ctaFilled: false,
  },
  {
    name: 'Starter',
    kicker: 'WHERE MOST TEAMS START',
    price: '$49/mo',
    priceSub: 'month-to-month',
    highlight: true,
    features: [
      'Unlimited scans',
      'Full report — all findings ranked',
      'AI-rewritten copy included',
      'Cancel anytime',
    ],
    cta: 'Get started →',
    ctaHref: '/auth?surface=dashboard&plan=starter',
    ctaFilled: true,
  },
  {
    name: 'Agency',
    price: '$149/mo',
    priceSub: 'month-to-month',
    highlight: false,
    features: [
      'Everything in Starter',
      'White-label PDF reports',
      '100 API calls bundled',
      'Client management dashboard',
    ],
    cta: 'Get started →',
    ctaHref: '/auth?surface=dashboard&plan=agency',
    ctaFilled: false,
  },
  {
    name: 'Enterprise',
    price: '$499/mo',
    priceSub: 'annual billing',
    highlight: false,
    features: [
      'Everything in Agency',
      'Dedicated scan capacity',
      'SLA + priority support',
      'Custom vertical benchmarks',
    ],
    cta: 'Talk to us →',
    ctaHref: '/contact',
    ctaFilled: false,
  },
]

function PricingSection() {
  const [hoveredPricing, setHoveredPricing] = useState<number | null>(null)
  const getCardBoxShadow = (card: PricingCard, i: number): string | undefined => {
    const hov = hoveredPricing === i
    if (card.name === 'Starter') {
      return hov
        ? '0 0 0 1px rgba(111, 155, 198, 0.45), 0 0 50px rgba(111, 155, 198, 0.16), inset 0 1px 0 0 rgba(111, 155, 198, 0.25)'
        : '0 0 0 1px rgba(111, 155, 198, 0.3), 0 0 50px rgba(111, 155, 198, 0.1), inset 0 1px 0 0 rgba(111, 155, 198, 0.25)'
    }
    if (card.name === 'Agency') {
      return hov
        ? 'inset 0 1px 0 0 rgba(157, 140, 255, 0.22), 0 0 0 1px rgba(157, 140, 255, 0.12), 0 0 20px rgba(157, 140, 255, 0.05)'
        : 'inset 0 1px 0 0 rgba(157, 140, 255, 0.1)'
    }
    if (card.name === 'Enterprise') {
      return hov
        ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08)'
        : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
    }
    // Free
    return hov
      ? 'inset 0 1px 0 0 rgba(111, 155, 198, 0.15), 0 0 16px rgba(111, 155, 198, 0.04)'
      : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)'
  }
  return (
    <section id="pricing" style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`
        @media(max-width:1023px){.d-price-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:639px){.d-price-grid{grid-template-columns:1fr!important}}
      `}</style>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          DASHBOARD PLANS
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 12px',lineHeight:1.1 }}>
          Start free. Upgrade when you need more.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,margin:'0 0 48px' }}>
          Every plan runs the same 307-check engine. No feature-gated diagnostics.
        </p>
        <div className="d-price-grid" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16 }}>
          {PRICING_CARDS.map((card, i) => (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              onMouseEnter={() => setHoveredPricing(i)}
              onMouseLeave={() => setHoveredPricing(null)}
              style={{
                background: card.name === 'Starter'
                  ? 'rgba(111, 155, 198, 0.04)'
                  : card.name === 'Free'
                    ? 'rgba(255, 255, 255, 0.01)'
                    : SURFACE,
                borderTop: card.name === 'Enterprise' ? '1px solid rgba(255,255,255,0.15)' : card.highlight ? `2px solid ${STEEL}` : '1px solid rgba(255,255,255,0.1)',
                borderLeft: card.name === 'Enterprise' ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${card.highlight ? 'rgba(111,155,198,0.3)' : 'rgba(255,255,255,0.07)'}`,
                borderRight: card.name === 'Enterprise' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.04)',
                borderBottom: card.name === 'Enterprise' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                padding:24,
                display:'flex',flexDirection:'column',
                transition: 'box-shadow 0.25s ease',
                boxShadow: getCardBoxShadow(card, i),
              }}>
              {card.kicker && (
                <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:STEEL,margin:'0 0 8px',textShadow:'0 0 8px rgba(111, 155, 198, 0.3)' }}>
                  {card.kicker}
                </p>
              )}
              <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.12em',color: card.name === 'Enterprise' ? 'rgba(255,255,255,0.5)' : STEEL,margin:'0 0 8px' }}>
                {card.name}
              </p>
              <p style={{
                ...DISP,fontSize:36,fontWeight:700,lineHeight:1,margin:'0 0 4px',
                color: card.name === 'Free' ? 'rgba(255, 255, 255, 0.6)' : INK_PRI,
                textShadow: card.name === 'Starter' ? '0 0 16px rgba(111, 155, 198, 0.2)' : undefined,
              }}>
                {card.price}
              </p>
              <p style={{ ...MONO,fontSize:10,color:INK_MUT,margin:'0 0 20px' }}>{card.priceSub}</p>
              <div style={{ flex:1,marginBottom:20 }}>
                {card.features.map((f, j) => (
                  <p key={j} style={{ ...SANS,fontSize:13,color:INK_SEC,margin:'0 0 8px',lineHeight:1.45 }}>
                    · {f}
                  </p>
                ))}
              </div>
              <Link
                href={card.ctaHref}
                style={{
                  display:'block',textAlign:'center',padding:'11px',
                  ...MONO,fontSize:12,textTransform:'uppercase',letterSpacing:'0.12em',
                  textDecoration:'none',
                  color: card.ctaFilled ? BG_BASE : STEEL,
                  background: card.ctaFilled ? STEEL : 'transparent',
                  border:`1px solid ${STEEL}`,
                }}
              >
                {card.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── What Happens Next strip ───────────────────────────────────────────────────

function WhatHappensNextStrip() {
  return (
    <section style={{ padding:'64px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`@media(max-width:767px){.d-whn-connector{display:none!important}.d-whn-steps{flex-direction:column!important;gap:32px!important;align-items:flex-start!important}}`}</style>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.2em',color:INK_MUT,textAlign:'center',margin:'0 0 40px' }}>
          WHAT HAPPENS AFTER YOU SCAN
        </p>
        <div className="d-whn-steps" style={{ display:'flex',alignItems:'flex-start',gap:0 }}>
          <div style={{ flex:1,textAlign:'center',padding:'0 24px' }}>
            <p style={{ ...MONO,fontSize:18,fontWeight:700,color:'rgba(111,155,198,0.4)',margin:'0 0 10px',textShadow:'0 0 8px rgba(111,155,198,0.2)' }}>01</p>
            <p style={{ ...SANS,fontSize:15,fontWeight:500,color:INK_PRI,margin:'0 0 8px',lineHeight:1.3 }}>Scan runs</p>
            <p style={{ ...SANS,fontSize:13,color:INK_MUT,margin:0,lineHeight:1.6 }}>Your live page renders in headless Chrome. 307 checks fire. Takes about 90 seconds.</p>
          </div>
          <div className="d-whn-connector" style={{ width:1,background:'rgba(111,155,198,0.15)',alignSelf:'stretch',flexShrink:0 }} />
          <div style={{ flex:1,textAlign:'center',padding:'0 24px' }}>
            <p style={{ ...MONO,fontSize:18,fontWeight:700,color:'rgba(111,155,198,0.4)',margin:'0 0 10px',textShadow:'0 0 8px rgba(111,155,198,0.2)' }}>02</p>
            <p style={{ ...SANS,fontSize:15,fontWeight:500,color:INK_PRI,margin:'0 0 8px',lineHeight:1.3 }}>Report delivered</p>
            <p style={{ ...SANS,fontSize:13,color:INK_MUT,margin:0,lineHeight:1.6 }}>Every finding ranked by conversion impact. Evidence cited. Fix included. Copy rewritten.</p>
          </div>
          <div className="d-whn-connector" style={{ width:1,background:'rgba(111,155,198,0.15)',alignSelf:'stretch',flexShrink:0 }} />
          <div style={{ flex:1,textAlign:'center',padding:'0 24px' }}>
            <p style={{ ...MONO,fontSize:18,fontWeight:700,color:'rgba(111,155,198,0.4)',margin:'0 0 10px',textShadow:'0 0 8px rgba(111,155,198,0.2)' }}>03</p>
            <p style={{ ...SANS,fontSize:15,fontWeight:500,color:INK_PRI,margin:'0 0 8px',lineHeight:1.3 }}>Work the list</p>
            <p style={{ ...SANS,fontSize:13,color:INK_MUT,margin:0,lineHeight:1.6 }}>Start at priority 1. Most teams ship the top three fixes in an afternoon.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 13 — Final CTA ────────────────────────────────────────────────────
// Hero scan flow requires a URL before proceeding — OPTION A: duplicate URL input + handler.

function FinalCtaSection() {
  const [scanUrl, setScanUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)
  const router = useRouter()

  const handleScan = async () => {
    if (!scanUrl || isScanning) return
    setScanError('')
    setIsScanning(true)
    try {
      const target = /^https?:\/\//i.test(scanUrl) ? scanUrl : `https://${scanUrl}`
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      if (res.status === 401) {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pendingUrl', target)
        router.push('/auth?surface=dashboard')
        return
      }
      const data = await res.json()
      if (data.reportId) {
        router.push(`/reports/${data.reportId}`)
      } else if (data.error) {
        setScanError(data.error)
      }
    } catch {
      setScanError('Scan failed. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <section style={{ padding:'96px 48px',textAlign:'center',position:'relative',overflow:'visible',borderTop:'0.5px solid rgba(111,155,198,0.1)' }}>
      {/* Final CTA bloom */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1600px',
          height: '1000px',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(111, 155, 198, 0.20) 0%, rgba(111, 155, 198, 0.06) 40%, rgba(111, 155, 198, 0.02) 65%, transparent 85%)',
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: '50%',
          animation: 'bloom-breathe 6s ease-in-out infinite',
        }}
      />
      <Ticks />
      <div style={{ position:'relative',zIndex:1 }}>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 32px',lineHeight:1.1,textShadow:'0 0 40px rgba(111, 155, 198, 0.15)' }}>
          Ready to find out what&apos;s killing your conversions?
        </h2>
        <div style={{ maxWidth:560,margin:'0 auto',textAlign:'left' }}>
          <div style={{ display:'flex',flexWrap:'wrap' }}>
            <div
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              style={{
                display:'flex',flex:'1 1 280px',
                background:SURFACE,
                borderTop:'1px solid rgba(255,255,255,0.1)',
                borderLeft:'1px solid rgba(255,255,255,0.07)',
                borderRight:'1px solid rgba(255,255,255,0.04)',
                borderBottom:'1px solid rgba(255,255,255,0.03)',
                transition: 'box-shadow 0.3s ease',
                boxShadow: inputFocused
                  ? 'inset 0 0 0 1px rgba(111, 155, 198, 0.5), 0 0 20px rgba(111, 155, 198, 0.1)'
                  : 'inset 0 0 0 1px rgba(111, 155, 198, 0.2)',
              }}>
              <span style={{ ...MONO,fontSize:12,color:INK_MUT,padding:'0 12px',display:'flex',alignItems:'center',flexShrink:0,borderRight:'0.5px solid rgba(255,255,255,0.08)' }}>
                https://
              </span>
              <input
                type="text"
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleScan() }}
                placeholder="your-site.com"
                style={{ flex:1,minWidth:0,background:'transparent',...MONO,fontSize:14,color:INK_PRI,padding:'14px',border:'none',outline:'none',borderRadius:0 }}
              />
            </div>
            <button
              onClick={() => void handleScan()}
              disabled={isScanning || !scanUrl}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              style={{
                ...MONO,fontSize:13,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',
                background:'transparent',
                border:`1px solid ${isScanning || !scanUrl ? 'rgba(111,155,198,0.3)' : 'rgba(111,155,198,0.5)'}`,
                color:isScanning || !scanUrl ? 'rgba(111,155,198,0.4)' : STEEL,
                padding:'14px 24px',cursor:isScanning || !scanUrl ? 'not-allowed' : 'pointer',
                borderRadius:0,whiteSpace:'nowrap',transition:'box-shadow 0.2s ease',
                boxShadow: btnHovered && !isScanning && scanUrl
                  ? '0 0 24px rgba(111, 155, 198, 0.3), 0 0 0 1px rgba(111, 155, 198, 0.4)'
                  : '0 0 16px rgba(111, 155, 198, 0.15)',
              }}
            >
              {isScanning ? 'SCANNING…' : 'SCAN MY SITE FREE →'}
            </button>
          </div>
          {scanError && (
            <p style={{ ...MONO,fontSize:11,color:CRIT,margin:'8px 0 0' }}>{scanError}</p>
          )}
          <p style={{ ...MONO,fontSize:11,color:'rgba(111, 155, 198, 0.5)',textAlign:'center',marginTop:14,marginBottom:0 }}>
            No account required. Results in ~90 seconds.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [upgradeLinkHovered, setUpgradeLinkHovered] = useState(false)
  return (
    <main style={{ minHeight:'100vh' }}>
      <HeroSection />
      <OutputSection />
      <AIRewriteSection />
      <ReportAnatomySection />
      <VerticalShowcaseSection />
      <WhatWeCheckSection />
      <HowItWorksSection />
      <ComparisonSection />
      <WhyDifferentSection />
      <LandingCorpusStats />
      {/* Benchmarks CTA — smooth-scroll hook from corpus section into pricing */}
      <div style={{ textAlign:'center',padding:'0 48px 56px',background:BG_BASE }}>
        <a
          href="#pricing"
          onMouseEnter={() => setUpgradeLinkHovered(true)}
          onMouseLeave={() => setUpgradeLinkHovered(false)}
          style={{
            ...MONO,fontSize:11,
            color: upgradeLinkHovered ? 'rgba(111, 155, 198, 1)' : 'rgba(111, 155, 198, 0.7)',
            textDecoration:'none',letterSpacing:'0.08em',
            transition: 'color 0.2s ease',
            textShadow: upgradeLinkHovered ? '0 0 8px rgba(111, 155, 198, 0.3)' : undefined,
          }}
        >
          Upgrade to see what separates the top quartile in your vertical from everyone else.
        </a>
      </div>
      <MultiSiteSection />
      <PricingSection />
      <WhatHappensNextStrip />
      <FinalCtaSection />
    </main>
  )
}
