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
        textAlign: 'center',
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
      <div style={{ position:'relative',zIndex:1,maxWidth:680,margin:'0 auto',width:'100%' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 20px' }}>
          FOR FOUNDERS &amp; TEAMS
        </p>
        <h1 style={{ ...DISP,fontSize:'clamp(36px,5vw,58px)',fontWeight:700,color:INK_PRI,letterSpacing:'-0.04em',margin:'0 0 24px',lineHeight:1.08 }}>
          Find out exactly what&apos;s stopping visitors from converting.
        </h1>
        <p style={{ ...SANS,fontSize:17,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 auto 44px' }}>
          Paste your URL. Get a 0–100 score, every conversion problem ranked by impact, AI-rewritten copy, and benchmarks against real sites in your vertical — in about 90 seconds.
        </p>

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
            <p style={{ ...MONO,fontSize:11,color:CRIT,margin:'8px 0 0' }}>{scanError}</p>
          )}
          <p style={{ ...MONO,fontSize:11,color:INK_MUT,textAlign:'center',margin:'14px 0 0' }}>
            No account required.
          </p>
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

          {/* Score row — 4B: ring draws in when scrolled into view */}
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

          {/* Finding cards — 4C: staggered entry. Card 0 is fully expanded (static illustration). */}
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
// Promoted from inside the report mock to its own full-width section.

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
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 40px' }}>
          Every critical finding includes a drop-in replacement — headline rewritten, CTA rewritten, copy rewritten. Ready to hand to your designer or paste directly.
        </p>

        {/* Before / after example */}
        <div style={{
          borderTop:'1px solid rgba(255,255,255,0.1)',
          borderLeft:'1px solid rgba(255,255,255,0.07)',
          borderRight:'1px solid rgba(255,255,255,0.04)',
          borderBottom:'1px solid rgba(255,255,255,0.03)',
          boxShadow: 'inset 0 1px 0 0 rgba(111, 155, 198, 0.1)',
        }}>
          <div className="d-rewrite-cols" style={{ display:'flex' }}>
            <div style={{
              flex:1,padding:28,
              borderRight:'0.5px solid rgba(111,155,198,0.1)',
            }}>
              <p style={{ ...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.18em',color:'rgba(255, 255, 255, 0.25)',margin:'0 0 14px' }}>
                ORIGINAL
              </p>
              <p style={{ ...SANS,fontSize:17,color:INK_SEC,margin:0,lineHeight:1.55,opacity:0.45 }}>
                &ldquo;The project management tool built for remote teams.&rdquo;
              </p>
            </div>
            <div style={{
              flex:1,padding:28,position:'relative',
              borderLeft: '1px solid rgba(0, 196, 140, 0.25)',
              boxShadow: 'inset 1px 0 0 0 rgba(0, 196, 140, 0.1)',
            }}>
              {/* AI rewrite bloom */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(ellipse at 40% 50%, rgba(0, 196, 140, 0.14) 0%, rgba(0, 196, 140, 0.05) 55%, transparent 80%)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  borderRadius: 'inherit',
                }}
              />
              <p style={{ position:'relative',...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.18em',color:'rgba(0, 196, 140, 0.9)',margin:'0 0 14px',textShadow:'0 0 12px rgba(0, 196, 140, 0.4)' }}>
                REWRITTEN
              </p>
              <p style={{ position:'relative',...SANS,fontSize:17,color:INK_PRI,margin:0,lineHeight:1.55 }}>
                &ldquo;Ship projects on time, every time — no matter where your team works.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 4 — What We Check ────────────────────────────────────────────────

const CHECK_PILLS = [
  'Value proposition', 'Social proof', 'CTA clarity', 'Offer structure',
  'Objection handling', 'Visual hierarchy', 'Trust signals',
  'Mobile experience', 'Load perception', 'Above-fold layout',
]

function WhatWeCheckSection() {
  const [hoveredPill, setHoveredPill] = useState<string | null>(null)
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
      <div style={{ maxWidth:1000,margin:'0 auto',position:'relative',zIndex:1 }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          SCOPE
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          27 categories. Every conversion surface.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 32px' }}>
          The engine checks every element a visitor encounters from the moment they land — not just your headline and CTA. If it affects whether someone converts, it&apos;s in the audit.
        </p>
        {/* 4E: Pills stagger in */}
        <div style={{ display:'flex',flexWrap:'wrap',gap:8,margin:'0 0 24px' }}>
          {CHECK_PILLS.map((pill, i) => (
            <motion.span
              key={pill}
              initial={{ opacity: 0, scale: 0.82 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.3, delay: i * 0.045, ease: 'easeOut' }}
              onMouseEnter={() => setHoveredPill(pill)}
              onMouseLeave={() => setHoveredPill(null)}
              style={{
                ...SANS,fontSize:13,
                color: hoveredPill === pill ? 'rgba(255, 255, 255, 0.95)' : INK_SEC,
                background: hoveredPill === pill ? 'rgba(111, 155, 198, 0.06)' : SURFACE,
                border: `0.5px solid ${hoveredPill === pill ? 'rgba(111, 155, 198, 0.5)' : 'rgba(111,155,198,0.15)'}`,
                padding:'6px 12px',
                display:'inline-block',
                cursor: 'default',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease, background 0.2s ease',
                boxShadow: hoveredPill === pill ? '0 0 0 1px rgba(111, 155, 198, 0.2), inset 0 0 10px rgba(111, 155, 198, 0.05)' : undefined,
              }}
            >
              {pill}
            </motion.span>
          ))}
        </div>
        <p style={{ ...MONO,fontSize:11,color:'rgba(111, 155, 198, 0.6)',margin:0,textShadow:'0 0 8px rgba(111, 155, 198, 0.2)' }}>
          307 checks across 27 categories — every scan, every plan.
        </p>
        {/* Example findings by category — static illustration */}
        <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.18em',color:INK_MUT,margin:'32px 0 16px' }}>
          EXAMPLE FINDINGS BY CATEGORY
        </p>
        <style>{`@media(max-width:767px){.d-scope-examples{grid-template-columns:1fr!important}}`}</style>
        <div className="d-scope-examples" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,margin:'0 0 16px' }}>
          <div style={{ background:SURFACE,borderTop:'1px solid rgba(255,255,255,0.1)',borderLeft:'1px solid rgba(255,255,255,0.07)',borderRight:'1px solid rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.03)',padding:16,boxShadow:'inset 0 1px 0 0 rgba(111, 155, 198, 0.1)' }}>
            <span style={{ ...MONO,fontSize:9,border:'0.5px solid rgba(111,155,198,0.25)',color:STEEL,padding:'2px 8px',textTransform:'uppercase',letterSpacing:'0.1em',display:'inline-block',margin:'0 0 10px' }}>VALUE PROPOSITION</span>
            <p style={{ ...DISP,fontSize:13,fontWeight:600,color:INK_PRI,margin:'0 0 6px',lineHeight:1.35 }}>Hero headline describes features, not outcomes</p>
            <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:0 }}>Affects 12–18% conversion lift when corrected</p>
          </div>
          <div style={{ background:SURFACE,borderTop:'1px solid rgba(255,255,255,0.1)',borderLeft:'1px solid rgba(255,255,255,0.07)',borderRight:'1px solid rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.03)',padding:16,boxShadow:'inset 0 1px 0 0 rgba(111, 155, 198, 0.1)' }}>
            <span style={{ ...MONO,fontSize:9,border:'0.5px solid rgba(111,155,198,0.25)',color:STEEL,padding:'2px 8px',textTransform:'uppercase',letterSpacing:'0.1em',display:'inline-block',margin:'0 0 10px' }}>SOCIAL PROOF</span>
            <p style={{ ...DISP,fontSize:13,fontWeight:600,color:INK_PRI,margin:'0 0 6px',lineHeight:1.35 }}>No testimonials visible above 800px fold</p>
            <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:0 }}>73% of high-converting sites show social proof above fold</p>
          </div>
          <div style={{ background:SURFACE,borderTop:'1px solid rgba(255,255,255,0.1)',borderLeft:'1px solid rgba(255,255,255,0.07)',borderRight:'1px solid rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.03)',padding:16,boxShadow:'inset 0 1px 0 0 rgba(111, 155, 198, 0.1)' }}>
            <span style={{ ...MONO,fontSize:9,border:'0.5px solid rgba(111,155,198,0.25)',color:STEEL,padding:'2px 8px',textTransform:'uppercase',letterSpacing:'0.1em',display:'inline-block',margin:'0 0 10px' }}>CTA CLARITY</span>
            <p style={{ ...DISP,fontSize:13,fontWeight:600,color:INK_PRI,margin:'0 0 6px',lineHeight:1.35 }}>Two competing primary CTAs above fold</p>
            <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:0 }}>Single focused CTA outperforms split CTAs in 73% of variants</p>
          </div>
        </div>
        <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:0 }}>
          Every category produces findings like these — grounded in what&apos;s actually on your page.
        </p>
      </div>
    </section>
  )
}

// ── Section 5 — Social Proof (single quote) ───────────────────────────────────

function QuoteSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',textAlign:'center',position:'relative',overflow:'visible' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1000px',
          height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(111, 155, 198, 0.07) 0%, rgba(111, 155, 198, 0.021) 40%, rgba(111, 155, 198, 0.02) 65%, transparent 85%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* 4F: Quote fades up */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        style={{ maxWidth:680,margin:'0 auto',position:'relative',zIndex:1 }}
      >
        <div aria-hidden style={{ position:'absolute',left:'-24px',top:0,bottom:0,width:'2px',background:'linear-gradient(to bottom, transparent, rgba(111, 155, 198, 0.4), transparent)',pointerEvents:'none' }} />
        <p style={{
          ...SANS,
          fontStyle:'italic',
          fontSize:'clamp(18px,2.2vw,24px)',
          color:INK_PRI,
          lineHeight:1.65,
          margin:'0 0 20px',
        }}>
          &ldquo;I scanned our landing page expecting vague suggestions. Instead I got a ranked list of exactly what was broken and why. Fixed the top two findings in an afternoon. Our trial signup rate went up 14% the following week.&rdquo;
        </p>
        <p style={{ ...MONO,fontSize:11,color:'rgba(111, 155, 198, 0.6)',margin:0,letterSpacing:'0.1em' }}>
          — FOUNDER, B2B SAAS · VERIFIED SCAN
        </p>
      </motion.div>
    </section>
  )
}

// ── Section 5 — How It Works ──────────────────────────────────────────────────

type HowStep = { num: string; title: string; desc: string; techTag?: string }

const HOW_STEPS: HowStep[] = [
  {
    num: '01',
    title: 'Paste your URL',
    desc: 'Drop any publicly accessible URL into the scan field. No installation, no code, no browser extension.',
  },
  {
    num: '02',
    title: 'We render your live page',
    desc: 'webdoc loads your actual page in a real browser — the same thing your visitors see, above-the-fold layout and all. Not cached text. Not a scrape. Your live site.',
    techTag: 'headless chrome · full dom render · above-fold layout measured',
  },
  {
    num: '03',
    title: 'Get your ranked report',
    desc: 'In about 90 seconds you receive a full conversion audit — every finding ranked by estimated impact, plain-English fixes, AI-rewritten copy, and your percentile against real sites in your vertical.',
  },
]

function HowItWorksSection() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`@media(max-width:767px){.d-hiw-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          THE PROCESS
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 48px',lineHeight:1.1 }}>
          Three steps. No technical knowledge required.
        </h2>
        {/* 4G: Step cards stagger in */}
        <div className="d-hiw-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24 }}>
          {HOW_STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              onMouseEnter={() => setHoveredStep(i)}
              onMouseLeave={() => setHoveredStep(null)}
              style={{
                background: hoveredStep === i ? 'rgba(111, 155, 198, 0.04)' : 'rgba(111, 155, 198, 0.025)',
                borderTop:'1px solid rgba(255,255,255,0.1)',
                borderLeft: i === 1 ? '1px solid rgba(111, 155, 198, 0.2)' : '1px solid rgba(255,255,255,0.07)',
                borderRight:'1px solid rgba(255,255,255,0.04)',
                borderBottom:'1px solid rgba(255,255,255,0.03)',
                padding:24,
                transition: 'box-shadow 0.25s ease, background 0.25s ease',
                boxShadow: hoveredStep === i
                  ? 'inset 0 1px 0 0 rgba(111, 155, 198, 0.22), 0 0 24px rgba(111, 155, 198, 0.05)'
                  : 'inset 0 1px 0 0 rgba(111, 155, 198, 0.12)',
              }}>
              <p style={{
                ...MONO,fontSize:20,
                color: i === 1 ? 'rgba(111,155,198,0.55)' : 'rgba(111,155,198,0.35)',
                margin:'0 0 16px',fontWeight:700,
                textShadow: '0 0 10px rgba(111,155,198,0.25)',
              }}>
                {step.num}
              </p>
              <p style={{ ...DISP,fontSize:18,fontWeight:600,color:INK_PRI,margin:'0 0 12px',lineHeight:1.25 }}>
                {step.title}
              </p>
              <p style={{ ...SANS,fontSize:14,color:INK_SEC,lineHeight:1.65,margin:0 }}>{step.desc}</p>
              {step.techTag && (
                <p style={{
                  ...MONO,fontSize:10,margin:'12px 0 0',letterSpacing:'0.04em',lineHeight:1.5,
                  color: i === 1 ? 'rgba(111, 155, 198, 0.65)' : INK_MUT,
                  textShadow: i === 1 ? '0 0 8px rgba(111, 155, 198, 0.2)' : undefined,
                }}>
                  {step.techTag}
                </p>
              )}
              {i === 2 && (
                // static illustration — mini report hierarchy preview showing "ranked" means priority-ordered with lift numbers
                <div style={{ marginTop:16,background:'rgba(5,8,16,0.6)',borderTop:'0.5px solid rgba(255,255,255,0.08)',borderLeft:'0.5px solid rgba(255,255,255,0.06)',borderRight:'0.5px solid rgba(255,255,255,0.04)',borderBottom:'0.5px solid rgba(255,255,255,0.03)',padding:'12px 14px' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                    <span style={{ ...MONO,fontSize:10,color:CRIT }}>P1 · CRITICAL</span>
                    <span style={{ ...MONO,fontSize:10,color:LIFT_GREEN,textShadow:'0 0 6px rgba(0, 196, 140, 0.3)' }}>+12–18%</span>
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                    <span style={{ ...MONO,fontSize:10,color:HIGH_AMB }}>P2 · HIGH</span>
                    <span style={{ ...MONO,fontSize:10,color:'rgba(0, 196, 140, 0.6)' }}>+8–11%</span>
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                    <span style={{ ...MONO,fontSize:10,color:HIGH_AMB }}>P3 · HIGH</span>
                    <span style={{ ...MONO,fontSize:10,color:'rgba(0, 196, 140, 0.6)' }}>+6–9%</span>
                  </div>
                  <p style={{ ...MONO,fontSize:9,color:INK_MUT,margin:0,letterSpacing:'0.04em' }}>
                    ranked by conversion impact · fixes included
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 6 — Why Different ─────────────────────────────────────────────────

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
    a: "Every finding comes with a severity rank, a one-sentence plain-English description, a concrete fix, and drop-in replacement copy. There's nothing to interpret. Work down the list from priority 1. Most founders ship the top three fixes in an afternoon.",
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
    a: "Every finding cites the specific visible evidence it's based on — what element was present, absent, or misplaced, and why that matters for conversion. If you read a finding and think the evidence is wrong, the fix is simple: look at your page and check. The grounding rule means the model cannot invent evidence. If the finding cites something that isn't there, that's a bug — use the feedback flag in the report and we'll investigate. In practice, the findings founders disagree with most are the ones that turn out to be most accurate.",
    tag: 'every finding cites evidence · flaggable · grounded or dropped',
  },
  {
    q: "How often should I scan?",
    a: "Scan whenever you ship a meaningful change — new hero, new CTA, new pricing, new landing page. For most founders on Starter that means once or twice a month. Free plan gives you three scans a month which covers most iteration cycles. Scanning the same unchanged page repeatedly won't change your findings — the engine reads what's there, not what was there last week. The corpus updates weekly so your percentile can shift even without a rescan as new sites are benchmarked.",
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
          Built for founders with money on the line.
        </h2>
        {/* 4H: FAQ cards stagger in + hover glow */}
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

// ── Section 7 — Benchmarks ────────────────────────────────────────────────────
// Renders the existing LandingCorpusStats component (bell curve, percentile, corpus stats).

// ── Section 8 — Pricing ───────────────────────────────────────────────────────
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
      'Score + top 3 findings — enough to know what’s wrong, not enough to fix everything',
      'Benchmarked against corpus',
    ],
    cta: 'Start free →',
    ctaHref: '/auth?surface=dashboard',
    ctaFilled: false,
  },
  {
    name: 'Starter',
    kicker: 'MOST FOUNDERS START HERE',
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
                borderTop: card.highlight ? `2px solid ${STEEL}` : '1px solid rgba(255,255,255,0.1)',
                borderLeft: `1px solid ${card.highlight ? 'rgba(111,155,198,0.3)' : 'rgba(255,255,255,0.07)'}`,
                borderRight:'1px solid rgba(255,255,255,0.04)',
                borderBottom:'1px solid rgba(255,255,255,0.03)',
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
              <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.12em',color:STEEL,margin:'0 0 8px' }}>
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

// ── Section 9 — Final CTA ─────────────────────────────────────────────────────

function FinalCtaSection() {
  const [ctaBtnHovered, setCtaBtnHovered] = useState(false)
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
        <a
          href="#scan"
          onMouseEnter={() => setCtaBtnHovered(true)}
          onMouseLeave={() => setCtaBtnHovered(false)}
          style={{
            display:'inline-block',
            ...MONO,fontSize:13,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',
            background:'transparent',
            border:'1px solid rgba(111,155,198,0.5)',
            color:STEEL,
            padding:'14px 32px',
            textDecoration:'none',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            boxShadow: ctaBtnHovered
              ? '0 0 0 1px rgba(111, 155, 198, 0.6), 0 0 40px rgba(111, 155, 198, 0.28)'
              : '0 0 0 1px rgba(111, 155, 198, 0.4), 0 0 30px rgba(111, 155, 198, 0.18)',
            transform: ctaBtnHovered ? 'translateY(-1px)' : 'translateY(0)',
          }}
        >
          SCAN MY SITE FREE →
        </a>
        <p style={{ ...MONO,fontSize:11,color:'rgba(111, 155, 198, 0.5)',marginTop:16,marginBottom:0 }}>
          No account required. Results in ~90 seconds.
        </p>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [upgradeLinkHovered, setUpgradeLinkHovered] = useState(false)
  return (
    // instrument-grid: fine (64px) + macro (320px) grid from globals.css, same as homepage
    <main className="instrument-grid" style={{ minHeight:'100vh',background:BG_BASE }}>
      <HeroSection />
      <OutputSection />
      <AIRewriteSection />
      <WhatWeCheckSection />
      <QuoteSection />
      <HowItWorksSection />
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
      <PricingSection />
      <FinalCtaSection />
    </main>
  )
}
