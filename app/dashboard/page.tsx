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
  const [siteCount, setSiteCount] = useState(4812)
  const [lastScanSec, setLastScanSec] = useState(240)
  const router = useRouter()

  useEffect(() => {
    let tick = 0
    const id = window.setInterval(() => {
      tick += 1
      setLastScanSec(s => s > 540 ? 30 + Math.floor(Math.random() * 90) : s + 10)
      if (tick % 5 === 0) setSiteCount(c => c + 1)
    }, 10000)
    return () => window.clearInterval(id)
  }, [])

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
          width: '1000px',
          height: '800px',
          background: 'radial-gradient(ellipse at 50% 35%, rgba(111, 155, 198, 0.05) 0%, rgba(111, 155, 198, 0.015) 40%, rgba(111, 155, 198, 0.004) 65%, transparent 85%)',
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: '50%',
          animation: 'bloom-breathe 5s ease-in-out infinite',
        }}
      />
      <Ticks />
      {/* GHOST_RING_START — remove this entire block to delete */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-120px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 480,
          height: 480,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.07,
        }}
      >
        <svg width="480" height="480" viewBox="0 0 480 480" aria-hidden style={{ display: 'block' }}>
          <circle cx="240" cy="240" r="215" fill="none" stroke="rgba(111,155,198,0.4)" strokeWidth="3" />
          <circle cx="240" cy="240" r="215" fill="none" stroke="#6F9BC6" strokeWidth="3"
            strokeDasharray="973 378" transform="rotate(-90 240 240)" strokeLinecap="round" />
          <text x="240" y="240" dominantBaseline="central" textAnchor="middle"
            fill="#6F9BC6" fontFamily="'Space Grotesk', sans-serif" fontWeight={600} fontSize={38}>72</text>
        </svg>
      </div>
      {/* GHOST_RING_END */}
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
          <p style={{ ...MONO,fontSize:10,color:INK_MUT,textAlign:'center',margin:'8px 0 0',opacity:0.4 }}>
            · {siteCount.toLocaleString()} sites scanned · last scan {lastScanSec < 60 ? `${lastScanSec} seconds` : `${Math.floor(lastScanSec / 60)} minutes`} ago
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
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible',background:BG_BASE }}>
      <div style={{ maxWidth:1000,margin:'0 auto',position:'relative',zIndex:1 }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          WHAT YOU GET
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          See what&apos;s costing you conversions. Get the fix for each.
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
        <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:'20px 0 0',lineHeight:1.6 }}>
          Rewrites cover headline, CTA, and value-prop — every critical finding, ready to paste. No copywriter required.
        </p>
      </div>
    </section>
  )
}

// ── Section 4 — Grounding Proof ───────────────────────────────────────────────

function GroundingProofSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'visible' }}>
      <style>{`@media(max-width:639px){.d-ground-cols{flex-direction:column!important}}`}</style>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:INK_MUT,margin:'0 0 16px' }}>
          HOW IT STAYS HONEST
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          Every finding cites evidence. No evidence, no finding.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 40px' }}>
          The model cannot surface a finding without grounding it in something specific and visible on your page. Findings that fail validation are dropped before they reach you. This is not a preference — it is enforced at the model level.
        </p>

        {/* Demonstration panel — STATIC ILLUSTRATION */}
        <div style={{ background:'rgba(8,12,22,0.9)', border:'1px solid rgba(111,155,198,0.12)', boxShadow:'inset 0 1px 0 0 rgba(111,155,198,0.15)', marginBottom:0 }}>
          <div className="d-ground-cols" style={{ display:'flex' }}>

            {/* Evidence output — the raw, cited evidence the model is forced to surface */}
            <div style={{ flex:1, padding:28, background:'rgba(0,0,0,0.2)' }}>
              <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.18em',color:INK_MUT,margin:'0 0 16px' }}>EVIDENCE ON YOUR PAGE</p>
              <div style={{ display:'flex',flexDirection:'column',gap:3 }}>
                {[
                  { key:'h1_text',         val:'"The project management\\ntool built for remote\\nteams."', string:true },
                  { key:'location',        val:'above_fold',      string:false },
                  { key:'char_count',      val:'47',              string:false },
                  { key:'classification',  val:'"feature_led"',   string:true  },
                  { key:'outcome_statement', val:'false',         string:false },
                  { key:'benefit_visible', val:'false',           string:false },
                  { key:'above_fold',      val:'true',            string:false },
                ].map((line, li) => (
                  <div key={li} style={{ display:'flex',gap:8,alignItems:'flex-start' }}>
                    <span style={{ ...MONO,fontSize:11,color:'rgba(111,155,198,0.5)',width:16,flexShrink:0,textAlign:'right',marginTop:1 }}>{li+1}</span>
                    <span style={{ ...MONO,fontSize:11,lineHeight:1.55 }}>
                      <span style={{ color:STEEL }}>{line.key}</span>
                      <span style={{ color:INK_MUT }}>: </span>
                      <span style={{ color: line.string ? LIFT_GREEN : 'rgba(239,178,62,0.85)' }}>{line.val}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Grounding rule strip */}
          <div style={{ borderTop:'0.5px solid rgba(111,155,198,0.1)',padding:'14px 28px',display:'flex',justifyContent:'center',gap:16,flexWrap:'wrap' }}>
            <span style={{ ...MONO,fontSize:10,color:STEEL }}>grounding_rule: cite_visible_content_or_fail</span>
            <span style={{ ...MONO,fontSize:10,color:INK_MUT }}>·</span>
            <span style={{ ...MONO,fontSize:10,color:STEEL }}>findings_dropped_without_evidence: true</span>
            <span style={{ ...MONO,fontSize:10,color:INK_MUT }}>·</span>
            <span style={{ ...MONO,fontSize:10,color:STEEL }}>validation: enforced_at_model_level</span>
          </div>
        </div>

        <p style={{ ...SANS,fontSize:13,color:INK_MUT,textAlign:'center',margin:'16px 0 0',lineHeight:1.6 }}>
          You will never see a finding that isn&apos;t traceable to something real on your page.
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
      {/* Section 6 atmospheric bloom */}
      <div aria-hidden="true" style={{ position:'absolute',top:0,left:'50%',width:'1000px',height:'800px',background:'radial-gradient(ellipse at 50% 35%, rgba(111, 155, 198, 0.05) 0%, rgba(111, 155, 198, 0.015) 40%, rgba(111, 155, 198, 0.004) 65%, transparent 85%)',pointerEvents:'none',zIndex:-1,animation:'bloom-breathe 5s ease-in-out infinite' }} />
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

// SVG connecting line — matches homepage branch-line style (var(--interactive), strokeWidth 1.5, opacity 0.5, one cubic bezier per gap, no animation).
// STRICT top/bottom edge routing — each segment runs ONLY in the whitespace between two cards:
//   start = bottom-edge center of card N   (x = card center, y = card.offsetTop + card.offsetHeight) — ON card N's bottom border
//   end   = top-edge center of card N+1    (x = card center, y = card.offsetTop)                     — ON card N+1's top border
//   CP1 = (start_x, start_y + gap*0.4)   CP2 = (end_x, end_y - gap*0.4)
//   → vertical tangent at both endpoints, so the curve leaves/enters each card perpendicular to its border and
//     cannot clip a corner at any horizontal distance between cards.
// Card heights are content-driven (minHeight 290, but the illustration cards render taller), so the live path is
// measured from real rendered offsets at runtime (see HowItWorksSection). This constant is the SSR / no-JS fallback,
// built with the same formula assuming the 290px min height: slot pitch 360 → tops 360,720,1080,1440,1800 · centers
// x=230/770 · gap≈70 · cp=gap*0.4≈28.
const PIPELINE_SNAKE_FALLBACK = [
  'M 230 290 C 230 318 770 332 770 360',
  'M 770 650 C 770 678 230 692 230 720',
  'M 230 1010 C 230 1038 770 1052 770 1080',
  'M 770 1370 C 770 1398 230 1412 230 1440',
  'M 230 1730 C 230 1758 770 1772 770 1800',
].join(' ')

const PIPELINE_FAIL = new Set([3, 8, 13, 18, 22, 26, 28])

function StepAnim({ idx }: { idx: number }) {
  if (idx === 0) return (
    <div style={{ marginTop: 12 }}>
      <span style={{ ...MONO, fontSize: 12, color: LIFT_GREEN }}>https://acme-saas.com</span>
      <span className="pl-cursor" style={{ ...MONO, fontSize: 12, color: LIFT_GREEN }}>|</span>
    </div>
  )
  if (idx === 1) return (
    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 260, height: 120, border: '1px solid rgba(111,155,198,0.2)', overflow: 'hidden' }}>
        {/* Browser chrome strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 16, borderBottom: '0.5px solid rgba(111,155,198,0.12)', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <div style={{ flex: 1, height: 5, background: 'rgba(111,155,198,0.07)' }} />
        </div>
        {/* Page skeleton */}
        <div style={{ position: 'absolute', top: 26, left: 12, width: '62%', height: 6, background: 'rgba(111,155,198,0.14)' }} />
        <div style={{ position: 'absolute', top: 38, left: 12, width: '80%', height: 4, background: 'rgba(111,155,198,0.07)' }} />
        <div style={{ position: 'absolute', top: 48, left: 12, width: '52%', height: 4, background: 'rgba(111,155,198,0.07)' }} />
        <div style={{ position: 'absolute', top: 62, left: 12, right: 12, height: 1, background: 'rgba(111,155,198,0.08)' }} />
        <div style={{ position: 'absolute', top: 71, left: 12, width: '70%', height: 4, background: 'rgba(111,155,198,0.05)' }} />
        <div style={{ position: 'absolute', top: 81, left: 12, width: '55%', height: 4, background: 'rgba(111,155,198,0.05)' }} />
        <div style={{ position: 'absolute', top: 95, left: 12, width: '42%', height: 4, background: 'rgba(111,155,198,0.04)' }} />
        <div className="pl-scan" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(111,155,198,0.45)' }} />
      </div>
    </div>
  )
  if (idx === 2) return (
    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 14px)', gap: 6 }}>
        {Array.from({ length: 30 }).map((_, si) => (
          <div key={si} className="pl-check" style={{
            width: 14, height: 14,
            background: 'rgba(111,155,198,0.15)',
            animationDelay: `${si * 0.067}s`,
            '--target-bg': PIPELINE_FAIL.has(si) ? 'rgba(232,99,95,0.7)' : 'rgba(0,196,140,0.7)',
          } as React.CSSProperties} />
        ))}
      </div>
    </div>
  )
  if (idx === 3) return (
    <div style={{ marginTop: 12 }}>
      {[
        { label: 'P1', w: '90%', c: 'rgba(232,99,95,0.7)' },
        { label: 'P2', w: '70%', c: 'rgba(239,178,62,0.7)' },
        { label: 'P3', w: '55%', c: 'rgba(239,178,62,0.7)' },
      ].map((b, bi) => (
        <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: bi < 2 ? 10 : 0 }}>
          <span style={{ ...MONO, fontSize: 9, color: INK_MUT, width: 24, flexShrink: 0 }}>{b.label}</span>
          <div style={{ flex: 1, height: 12, background: 'rgba(111,155,198,0.08)' }}>
            <div className="pl-bar" style={{
              height: '100%', background: b.c,
              animationDelay: `${bi * 0.25}s`,
              '--bar-w': b.w,
            } as React.CSSProperties} />
          </div>
        </div>
      ))}
    </div>
  )
  if (idx === 4) return (
    <div style={{ marginTop: 12 }}>
      <p className="pl-orig" style={{ ...SANS, fontSize: 12, fontStyle: 'italic', color: INK_MUT, margin: '0 0 6px', lineHeight: 1.4 }}>
        &ldquo;The project management tool...&rdquo;
      </p>
      <p className="pl-rewrite" style={{ ...SANS, fontSize: 12, color: LIFT_GREEN, margin: 0, lineHeight: 1.4 }}>
        &ldquo;Ship projects on time...&rdquo;
      </p>
    </div>
  )
  return (
    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
      <svg width="260" height="110" viewBox="0 0 260 110" aria-hidden>
        <line x1="0" y1="103" x2="260" y2="103" stroke="rgba(111,155,198,0.1)" strokeWidth="0.5" />
        <path d="M 0 103 C 46 103 84 88 108 66 C 126 50 136 28 149 18 C 162 9 169 17 178 33 C 197 66 227 99 260 103" fill="none" stroke="rgba(111,155,198,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="149" y1="4" x2="149" y2="103" stroke="rgba(111,155,198,0.2)" strokeWidth="0.75" strokeDasharray="4 3" />
        <text x="149" y="14" textAnchor="middle" fontFamily='"IBM Plex Mono",monospace' fontSize="9" fill="rgba(111,155,198,0.5)">63rd pct</text>
        <circle className="pl-pulse" cx="149" cy="26" r="7" fill="rgba(111,155,198,0.7)" />
      </svg>
    </div>
  )
}

function HowItWorksSection() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  // Live connecting line — measured from the real rendered card edges so each segment starts/ends exactly on a card
  // border regardless of content-driven height. Seeded with the SSR / no-JS fallback to avoid a hydration gap.
  const [snake, setSnake] = useState<string>(PIPELINE_SNAKE_FALLBACK)
  const [lineBox, setLineBox] = useState<string>('0 0 1000 2100')

  useEffect(() => {
    const compute = () => {
      const wrap = wrapRef.current
      const cards = cardRefs.current.filter((c): c is HTMLDivElement => c != null)
      if (!wrap || cards.length < 2) return
      const segs: string[] = []
      for (let i = 0; i < cards.length - 1; i++) {
        const a = cards[i], b = cards[i + 1]
        const startX = a.offsetLeft + a.offsetWidth / 2   // bottom-edge center of card N
        const startY = a.offsetTop + a.offsetHeight        // ON card N's bottom border
        const endX = b.offsetLeft + b.offsetWidth / 2      // top-edge center of card N+1
        const endY = b.offsetTop                           // ON card N+1's top border
        const gap = endY - startY
        // vertical tangents at both edges: CP1 below start, CP2 above end
        segs.push(`M ${startX} ${startY} C ${startX} ${startY + gap * 0.4} ${endX} ${endY - gap * 0.4} ${endX} ${endY}`)
      }
      setSnake(segs.join(' '))
      // viewBox = real wrap px → 1:1 with the SVG element, no aspect distortion of the path
      setLineBox(`0 0 ${wrap.offsetWidth} ${wrap.offsetHeight}`)
    }
    compute()
    const ro = new ResizeObserver(compute)
    if (wrapRef.current) ro.observe(wrapRef.current)
    cardRefs.current.forEach(c => { if (c) ro.observe(c) })
    window.addEventListener('resize', compute)
    return () => { ro.disconnect(); window.removeEventListener('resize', compute) }
  }, [])

  return (
    <section style={{ padding: '80px 48px', borderTop: '0.5px solid rgba(111,155,198,0.1)', position: 'relative', overflow: 'visible' }}>
      <style>{`
        @keyframes pl-blink    { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes pl-scan     { 0%{top:0px} 100%{top:110px} }
        @keyframes pl-check    { 0%{background:rgba(111,155,198,0.15)} 50%,80%{background:var(--target-bg)} 100%{background:rgba(111,155,198,0.15)} }
        @keyframes pl-bar      { 0%,100%{width:0} 55%,80%{width:var(--bar-w)} }
        @keyframes pl-orig     { 0%{opacity:1} 38%,100%{opacity:0} }
        @keyframes pl-rewrite  { 0%,33%{opacity:0} 72%,100%{opacity:1} }
        @keyframes pl-pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
        @media (prefers-reduced-motion: no-preference) {
          .pl-cursor  { animation: pl-blink   1s   step-end    infinite }
          .pl-scan    { animation: pl-scan    2.5s ease-in-out infinite }
          .pl-check   { animation: pl-check   2.2s ease-out    infinite }
          .pl-bar     { animation: pl-bar     2.5s ease-out    infinite }
          .pl-orig    { animation: pl-orig    3s   ease-in-out infinite }
          .pl-rewrite { animation: pl-rewrite 3s   ease-in-out infinite }
          .pl-pulse   { transform-box:fill-box; transform-origin:center; animation:pl-pulse 2s ease-in-out infinite }
        }
        @media (max-width:767px) {
          .d-pl-wrap  { height:auto!important }
          .d-pl-step  { position:static!important; width:100%!important; margin-bottom:24px!important; left:auto!important; top:auto!important }
          .d-pl-svg   { display:none!important }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: STEEL, margin: '0 0 16px' }}>
          THE PROCESS
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', color: INK_PRI, letterSpacing: '-0.5px', margin: '0 0 48px', lineHeight: 1.1 }}>
          What happens when you paste a URL.
        </h2>

        {/* Step pipeline */}
        <div ref={wrapRef} className="d-pl-wrap" style={{ position: 'relative', height: 2100 }}>

          {/* SVG connector — strict top/bottom edge routing measured from real card edges (see HowItWorksSection).
              overflow:visible + no clip-path / mask / overflow:hidden so the path can never be visually cropped into a card. */}
          <svg className="d-pl-svg" aria-hidden
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}
            viewBox={lineBox}
            preserveAspectRatio="none"
          >
            <path d={snake} stroke="var(--interactive)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
          </svg>

          {/* Step cards */}
          {PIPELINE_STEPS.map((step, i) => {
            const isLeft = i % 2 === 0
            return (
              <div key={step.num} ref={el => { cardRefs.current[i] = el }} className="d-pl-step" style={{
                position: 'absolute',
                top: i * 360,
                left: isLeft ? 0 : '54%',
                width: '46%',
                minHeight: 290,
                zIndex: 1,
                background: 'rgba(111,155,198,0.03)',
                border: '1px solid rgba(111,155,198,0.12)',
                boxShadow: 'inset 0 1px 0 0 rgba(111,155,198,0.15)',
                padding: '20px 24px',
              }}>
                <p style={{ ...MONO, fontSize: 24, fontWeight: 500, color: 'rgba(111,155,198,0.7)', margin: '0 0 8px', lineHeight: 1, letterSpacing: '-0.02em' }}>{step.num}</p>
                <p style={{ ...DISP, fontSize: 17, fontWeight: 700, color: INK_PRI, margin: '0 0 8px', lineHeight: 1.2 }}>{step.title}</p>
                <p style={{ ...SANS, fontSize: 14, color: INK_SEC, lineHeight: 1.6, margin: 0, maxWidth: 340 }}>{step.desc}</p>
                {step.tag && (
                  <p style={{ ...MONO, fontSize: 10, color: INK_MUT, margin: '6px 0 0', letterSpacing: '0.04em', lineHeight: 1.5 }}>{step.tag}</p>
                )}
                <StepAnim idx={i} />
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, borderTop: '0.5px solid rgba(111,155,198,0.1)', paddingTop: 24, textAlign: 'center' }}>
          <p style={{ ...SANS, fontSize: 14, color: INK_MUT, margin: '0 0 10px', lineHeight: 1.65 }}>
            Total time from URL to full report: approximately 90 seconds.
          </p>
          <p style={{ ...MONO, fontSize: 10, color: INK_MUT, margin: 0, opacity: 0.6 }}>
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
    a: "A language model sees the text you paste, not your live page. Weavn renders the full DOM in headless Chrome, reads your above-the-fold layout, measures element positions, runs 307 structured checks against conversion best practices, and returns ranked output with estimated lift numbers. ChatGPT returns a chat response. This returns a report.",
    tag: '307 checks · rendered DOM · ranked output · not a chat response',
  },
  {
    q: "I already know my site has problems. I don't have time to interpret a report.",
    a: "Every finding comes with a severity rank, a one-sentence plain-English description, a concrete fix, and drop-in replacement copy. There's nothing to interpret. Work down the list from priority 1. Most teams ship the top three fixes in an afternoon.",
    tag: 'ranked by impact · fix included · copy ready to paste',
  },
  {
    q: "Will it work on my site? It's built on Webflow / Squarespace / Framer.",
    a: "Weavn renders your live page in headless Chrome — it sees what a browser sees, not your CMS. Webflow, Squarespace, Framer, Shopify, WordPress, Next.js, custom stacks — if it's publicly accessible and loads in a browser, we can scan it. The only sites we can't scan are ones behind a login wall or that actively block automated access.",
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
    a: "The engine classifies your site type automatically across 14 site-type verticals — SaaS, e-commerce, agency, creator, marketplace — and applies the relevant check subset for your category with no configuration required. A Shopify product page gets different diagnostics than a B2B SaaS pricing page. The corpus benchmarks are also segmented by vertical so your percentile is always against comparable sites, not a mixed average. E-commerce, SaaS, agencies, and creator sites are all actively represented in the corpus.",
    tag: '14 verticals · auto-classified · e-comm and SaaS both supported',
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
      {/* Section 9 atmospheric bloom */}
      <div aria-hidden="true" style={{ position:'absolute',top:0,left:'50%',width:'1000px',height:'800px',background:'radial-gradient(ellipse at 50% 35%, rgba(111, 155, 198, 0.05) 0%, rgba(111, 155, 198, 0.015) 40%, rgba(111, 155, 198, 0.004) 65%, transparent 85%)',pointerEvents:'none',zIndex:-1,animation:'bloom-breathe 5s ease-in-out infinite' }} />
      <style>{`@media(max-width:767px){.d-diff-grid{grid-template-columns:1fr!important}}`}</style>
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

const AGENCY_CAPS = [
  {
    title: 'White-label PDF export',
    desc: 'Every report exports as a branded PDF with your agency name, logo, and color. Hand it to a client — webdoc never appears.',
  },
  {
    title: 'Client management dashboard',
    desc: 'All client sites in one view. Score history, scan dates, finding trends. Know which clients need attention without opening every report.',
  },
  {
    title: '100 API calls bundled',
    desc: 'Programmatically trigger scans, pull results into your own tools, or automate client onboarding. 100 calls included per month.',
  },
  {
    title: 'Vertical-matched benchmarks per client',
    desc: "Each client's score is benchmarked against their exact vertical. E-commerce client gets e-commerce comparisons. Makes the audit more defensible.",
  },
]

const REPORT_FINDINGS = [
  { p:'P1', sev:'CRITICAL', sevColor:CRIT,     sevBorder:'rgba(232,99,95,0.4)',   title:'Hero headline is feature-led, not outcome-led',     lift:'+12–18%' },
  { p:'P2', sev:'HIGH',     sevColor:HIGH_AMB, sevBorder:'rgba(239,178,62,0.4)',  title:'No above-fold social proof',                        lift:'+8–11%'  },
  { p:'P3', sev:'HIGH',     sevColor:HIGH_AMB, sevBorder:'rgba(239,178,62,0.4)',  title:'Dual primary CTAs create decision paralysis',       lift:'+6–9%'   },
  { p:'P4', sev:'HIGH',     sevColor:HIGH_AMB, sevBorder:'rgba(239,178,62,0.4)',  title:'Pricing not visible without scrolling',             lift:'+5–8%'   },
  { p:'P5', sev:'LOW',      sevColor:INK_MUT,  sevBorder:'rgba(110,117,135,0.4)', title:'Missing favicon — minor trust signal',              lift:'+1–2%'   },
]

function MultiSiteSection() {
  return (
    <section style={{
      padding: '80px 48px',
      borderTop: '0.5px solid rgba(111,155,198,0.1)',
      position: 'relative',
      overflow: 'visible',
    }}>
      <style>{`
        @media(max-width:767px){.d-agency-cap-grid{grid-template-columns:1fr!important}}
        @media(max-width:639px){.d-report-meta{flex-direction:column!important;gap:8px!important}.d-report-table-row{flex-wrap:wrap!important}}
      `}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: INK_MUT, margin: '0 0 16px' }}>
          AT SCALE
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', color: INK_PRI, letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.1 }}>
          Run client audits. Deliver branded reports. Track every site.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: INK_SEC, lineHeight: 1.65, maxWidth: 600, margin: '0 0 40px' }}>
          The Agency plan turns Weavn into a client-facing audit tool. Scan any site, deliver a white-label report under your brand, and track score history per client — all from one dashboard.
        </p>

        {/* White-label report mock — STATIC ILLUSTRATION */}
        <div style={{
          background: 'rgba(6,9,18,0.95)',
          border: '1px solid rgba(157,140,255,0.2)',
          boxShadow: '0 0 60px rgba(157,140,255,0.06), inset 0 1px 0 0 rgba(157,140,255,0.15)',
          marginBottom: 12,
        }}>
          {/* Report header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'28px 32px', borderBottom:'1px solid rgba(157,140,255,0.1)', flexWrap:'wrap', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:52, height:52, background:'rgba(157,140,255,0.15)', border:'1px solid rgba(157,140,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ ...MONO, fontSize:18, fontWeight:700, color:'rgba(157,140,255,0.9)' }}>AC</span>
              </div>
              <div>
                <p style={{ ...DISP, fontSize:22, fontWeight:700, color:INK_PRI, margin:'0 0 3px' }}>ACME AGENCY</p>
                <p style={{ ...SANS, fontSize:13, color:INK_MUT, margin:0 }}>Conversion Audit Report · Prepared for Client</p>
              </div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="28" stroke="rgba(111,155,198,0.12)" strokeWidth="3.5" fill="none" />
                <circle cx="36" cy="36" r="28" stroke={CRIT} strokeWidth="3.5" strokeDasharray="175.93" strokeDashoffset="68.61" strokeLinecap="round" fill="none" transform="rotate(-90 36 36)" />
                <text x="36" y="44" textAnchor="middle" fill={CRIT} style={{ fontFamily:'"Space Grotesk",sans-serif', fontSize:22, fontWeight:700 }}>61</text>
              </svg>
              <div style={{ marginTop:4 }}>
                <span style={{ ...MONO, fontSize:8, color:CRIT, border:`0.5px solid ${CRIT}`, padding:'1px 5px', textTransform:'uppercase', letterSpacing:'0.08em' }}>CRITICAL</span>
              </div>
              <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:'4px 0 0' }}>63rd percentile · B2B SaaS</p>
            </div>
          </div>

          {/* Meta row */}
          <div className="d-report-meta" style={{ display:'flex', padding:'12px 32px', background:'rgba(157,140,255,0.03)', borderBottom:'1px solid rgba(157,140,255,0.08)', gap:0 }}>
            {[
              { label:'CLIENT SITE', val:'acme-client.com' },
              { label:'SCAN DATE',   val:'June 11, 2026' },
              { label:'VERTICAL',    val:'B2B SaaS' },
              { label:'FINDINGS',    val:'23 total · 4 critical' },
            ].map((m, mi, arr) => (
              <div key={mi} style={{ flex:1, paddingRight:16, paddingLeft: mi > 0 ? 16 : 0, borderLeft: mi > 0 ? '1px solid rgba(157,140,255,0.1)' : 'none' }}>
                <p style={{ ...MONO, fontSize:8, textTransform:'uppercase', letterSpacing:'0.15em', color:INK_MUT, margin:'0 0 2px' }}>{m.label}</p>
                <p style={{ ...MONO, fontSize:11, color:INK_SEC, margin:0 }}>{m.val}</p>
              </div>
            ))}
          </div>

          {/* Findings table */}
          <div style={{ padding:'0 32px 28px' }}>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'40px 80px 1fr 80px 100px', gap:12, padding:'12px 0', borderBottom:'1px solid rgba(157,140,255,0.12)', marginBottom:4 }}>
              {['PRIORITY','SEVERITY','FINDING','EST. LIFT','STATUS'].map(h => (
                <p key={h} style={{ ...MONO, fontSize:8, textTransform:'uppercase', letterSpacing:'0.15em', color:INK_MUT, margin:0 }}>{h}</p>
              ))}
            </div>
            {REPORT_FINDINGS.map((f, fi) => (
              <div key={fi} style={{ display:'grid', gridTemplateColumns:'40px 80px 1fr 80px 100px', gap:12, padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.04)', alignItems:'center' }}>
                <p style={{ ...MONO, fontSize:11, color:INK_MUT, margin:0 }}>{f.p}</p>
                <span style={{ ...MONO, fontSize:8, color:f.sevColor, border:`0.5px solid ${f.sevBorder}`, padding:'2px 6px', textTransform:'uppercase', letterSpacing:'0.08em', justifySelf:'start' }}>{f.sev}</span>
                <p style={{ ...DISP, fontSize:13, fontWeight:500, color:INK_PRI, margin:0, lineHeight:1.3 }}>{f.title}</p>
                <p style={{ ...MONO, fontSize:11, color:LIFT_GREEN, margin:0 }}>{f.lift}</p>
                <p style={{ ...MONO, fontSize:9, color:LIFT_GREEN, margin:0 }}>FIX INCLUDED</p>
              </div>
            ))}
            <p style={{ ...MONO, fontSize:10, color:INK_MUT, margin:'12px 0 0', fontStyle:'italic', textAlign:'center' }}>+ 18 more findings in full report</p>
          </div>

          {/* Report footer */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'16px 32px', borderTop:'1px solid rgba(157,140,255,0.08)', background:'rgba(157,140,255,0.02)', flexWrap:'wrap', gap:8 }}>
            <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:0 }}>ACME AGENCY · Conversion Intelligence</p>
            <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:0 }}>Powered by Weavn · 307 checks · verified findings</p>
            <p style={{ ...MONO, fontSize:9, color:INK_MUT, margin:0 }}>CONFIDENTIAL · acme-client.com</p>
          </div>
        </div>

        <p style={{ ...SANS, fontSize:13, color:INK_MUT, textAlign:'center', margin:'0 0 40px', fontStyle:'italic', lineHeight:1.6 }}>
          This is what your client receives. Your name, your branding. Weavn never appears in the deliverable.
        </p>

        {/* Capability grid */}
        <div className="d-agency-cap-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:24, marginBottom:40 }}>
          {AGENCY_CAPS.map(cap => (
            <div key={cap.title} style={{ borderLeft:'2px solid rgba(157,140,255,0.25)', paddingLeft:16 }}>
              <p style={{ ...DISP, fontSize:15, fontWeight:600, color:INK_PRI, margin:'0 0 6px' }}>{cap.title}</p>
              <p style={{ ...SANS, fontSize:13, color:INK_MUT, margin:0, lineHeight:1.6 }}>{cap.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
          <a href="#pricing" style={{
            ...MONO, fontSize:12, textTransform:'uppercase', letterSpacing:'0.1em',
            color:'rgba(157,140,255,0.75)', border:'0.5px solid rgba(157,140,255,0.3)',
            padding:'10px 16px', textDecoration:'none', display:'inline-block',
          }}>SEE AGENCY PLAN →</a>
          <p style={{ ...MONO, fontSize:11, color:INK_MUT, margin:0 }}>Agency plan · $149/mo · white-label included · 100 API calls</p>
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
    <section style={{ padding:'96px 48px',textAlign:'center',position:'relative',overflow:'visible',borderTop:'0.5px solid rgba(111,155,198,0.1)',background:BG_BASE }}>
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
      <GroundingProofSection />
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
