'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
        overflow: 'hidden',
      }}
    >
      {/* Atmosphere: steel blue radial bloom behind hero content at 4% opacity */}
      <div aria-hidden style={{
        position:'absolute',inset:0,pointerEvents:'none',zIndex:0,
        background:'radial-gradient(ellipse 1000px 700px at 50% 35%, rgba(111,155,198,0.04) 0%, transparent 60%)',
      }} />
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
            <div style={{
              display:'flex',flex:'1 1 280px',
              background:SURFACE,
              borderTop:'1px solid rgba(255,255,255,0.1)',
              borderLeft:'1px solid rgba(255,255,255,0.07)',
              borderRight:'1px solid rgba(255,255,255,0.04)',
              borderBottom:'1px solid rgba(255,255,255,0.03)',
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
              style={{
                ...MONO,fontSize:13,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',
                background:'transparent',
                border:`1px solid ${isScanning || !scanUrl ? 'rgba(111,155,198,0.3)' : 'rgba(111,155,198,0.5)'}`,
                color:isScanning || !scanUrl ? 'rgba(111,155,198,0.4)' : STEEL,
                padding:'14px 24px',cursor:isScanning || !scanUrl ? 'not-allowed' : 'pointer',
                borderRadius:0,whiteSpace:'nowrap',transition:'all 0.15s',
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
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'hidden' }}>
      <div aria-hidden style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:0, background:'radial-gradient(ellipse 800px 500px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 60%)' }} />
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
          background:SURFACE,
          borderTop:'1px solid rgba(255,255,255,0.12)',
          borderLeft:'1px solid rgba(255,255,255,0.08)',
          borderRight:'1px solid rgba(255,255,255,0.04)',
          borderBottom:'1px solid rgba(255,255,255,0.03)',
          padding:32,
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

          {/* Score row */}
          <div style={{ display:'flex',alignItems:'center',gap:20,marginBottom:28,paddingBottom:24,borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexWrap:'wrap' }}>
            {/* Atmosphere: sev-critical drop-shadow on score ring makes the critical score feel urgent */}
            <div style={{ filter:'drop-shadow(0 0 12px rgba(232,99,95,0.2))' }}>
              <ScoreRing score={61} size="lg" animate={false} />
            </div>
            <div>
              <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:'0 0 6px' }}>63rd percentile · B2B SaaS</p>
              <p style={{ ...SANS,fontSize:13,color:INK_SEC,margin:0,lineHeight:1.5,maxWidth:480 }}>
                37 sites in your category score higher. Your top 3 fixes could move you to the 78th percentile.
              </p>
            </div>
          </div>

          {/* Finding cards */}
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            {MOCK_FINDINGS.map((f, i) => (
              <div key={i} style={{ background:f.bg,border:`0.5px solid ${f.border}`,padding:16 }}>
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
                  <span style={{ ...MONO,fontSize:11,color:LIFT_GREEN,whiteSpace:'nowrap',flexShrink:0 }}>
                    EST. LIFT {f.lift}
                  </span>
                </div>
                <p style={{ ...SANS,fontSize:13,color:INK_SEC,margin:0,lineHeight:1.55 }}>{f.desc}</p>
              </div>
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
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'hidden' }}>
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
        }}>
          <div className="d-rewrite-cols" style={{ display:'flex' }}>
            <div style={{
              flex:1,padding:28,
              borderRight:'0.5px solid rgba(111,155,198,0.1)',
            }}>
              <p style={{ ...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.18em',color:INK_MUT,margin:'0 0 14px' }}>
                ORIGINAL
              </p>
              <p style={{ ...SANS,fontSize:17,color:INK_SEC,margin:0,lineHeight:1.55 }}>
                &ldquo;The project management tool built for remote teams.&rdquo;
              </p>
            </div>
            <div style={{
              flex:1,padding:28,
            }}>
              <p style={{ ...MONO,fontSize:10,textTransform:'uppercase',letterSpacing:'0.18em',color:LIFT_GREEN,margin:'0 0 14px' }}>
                REWRITTEN
              </p>
              <p style={{ ...SANS,fontSize:17,color:INK_PRI,margin:0,lineHeight:1.55 }}>
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
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'hidden' }}>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          SCOPE
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 16px',lineHeight:1.1 }}>
          27 categories. Every conversion surface.
        </h2>
        <p style={{ ...SANS,fontSize:15,color:INK_SEC,lineHeight:1.65,maxWidth:580,margin:'0 0 32px' }}>
          The engine checks every element a visitor encounters from the moment they land — not just your headline and CTA. If it affects whether someone converts, it&apos;s in the audit.
        </p>
        <div style={{ display:'flex',flexWrap:'wrap',gap:8,margin:'0 0 24px' }}>
          {CHECK_PILLS.map(pill => (
            <span key={pill} style={{
              ...SANS,fontSize:13,color:INK_SEC,
              background:SURFACE,
              border:'0.5px solid rgba(111,155,198,0.15)',
              padding:'6px 12px',
            }}>
              {pill}
            </span>
          ))}
        </div>
        <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:0 }}>
          307 checks across 27 categories — every scan, every plan.
        </p>
      </div>
    </section>
  )
}

// ── Section 5 — Social Proof (single quote) ───────────────────────────────────

function QuoteSection() {
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',textAlign:'center' }}>
      <div style={{ maxWidth:680,margin:'0 auto' }}>
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
        <p style={{ ...MONO,fontSize:11,color:INK_MUT,margin:0,letterSpacing:'0.1em' }}>
          — FOUNDER, B2B SAAS · VERIFIED SCAN
        </p>
      </div>
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
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'hidden' }}>
      <style>{`@media(max-width:767px){.d-hiw-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          THE PROCESS
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 48px',lineHeight:1.1 }}>
          Three steps. No technical knowledge required.
        </h2>
        <div className="d-hiw-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24 }}>
          {HOW_STEPS.map(step => (
            <div key={step.num} style={{
              background:SURFACE,
              borderTop:'1px solid rgba(255,255,255,0.1)',
              borderLeft:'1px solid rgba(255,255,255,0.07)',
              borderRight:'1px solid rgba(255,255,255,0.04)',
              borderBottom:'1px solid rgba(255,255,255,0.03)',
              padding:24,
            }}>
              <p style={{ ...MONO,fontSize:20,color:'rgba(111,155,198,0.25)',margin:'0 0 16px',fontWeight:700 }}>
                {step.num}
              </p>
              <p style={{ ...DISP,fontSize:18,fontWeight:600,color:INK_PRI,margin:'0 0 12px',lineHeight:1.25 }}>
                {step.title}
              </p>
              <p style={{ ...SANS,fontSize:14,color:INK_SEC,lineHeight:1.65,margin:0 }}>{step.desc}</p>
              {step.techTag && (
                <p style={{ ...MONO,fontSize:10,color:INK_MUT,margin:'12px 0 0',letterSpacing:'0.04em',lineHeight:1.5 }}>
                  {step.techTag}
                </p>
              )}
            </div>
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
  return (
    <section style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'hidden' }}>
      <style>{`@media(max-width:767px){.d-diff-grid{grid-template-columns:1fr!important}}`}</style>
      <div aria-hidden style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:0, background:'radial-gradient(ellipse 800px 500px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 65%)' }} />
      <Ticks />
      <div style={{ maxWidth:1200,margin:'0 auto',position:'relative',zIndex:1 }}>
        <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.2em',color:STEEL,margin:'0 0 16px' }}>
          THE DIFFERENCE
        </p>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 48px',lineHeight:1.1 }}>
          Built for founders with money on the line.
        </h2>
        <div className="d-diff-grid" style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:24 }}>
          {OBJECTIONS.map(card => (
            <div key={card.q} style={{
              background:SURFACE,
              borderTop:'1px solid rgba(255,255,255,0.12)',
              borderLeft:'1px solid rgba(255,255,255,0.08)',
              borderRight:'1px solid rgba(255,255,255,0.04)',
              borderBottom:'1px solid rgba(255,255,255,0.03)',
              padding:28,
            }}>
              <p style={{ ...DISP,fontWeight:600,fontSize:17,color:INK_PRI,margin:'0 0 14px',lineHeight:1.35 }}>{card.q}</p>
              <p style={{ ...SANS,fontSize:14,color:INK_SEC,lineHeight:1.7,margin:'0 0 16px' }}>{card.a}</p>
              <p style={{ ...MONO,fontSize:11,color:STEEL,margin:0 }}>{card.tag}</p>
            </div>
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
  return (
    <section id="pricing" style={{ padding:'80px 48px',borderTop:'0.5px solid rgba(111,155,198,0.1)',position:'relative',overflow:'hidden' }}>
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
          {PRICING_CARDS.map(card => (
            <div key={card.name} style={{
              background:SURFACE,
              borderTop: card.highlight ? `2px solid ${STEEL}` : '1px solid rgba(255,255,255,0.1)',
              borderLeft: `1px solid ${card.highlight ? 'rgba(111,155,198,0.3)' : 'rgba(255,255,255,0.07)'}`,
              borderRight:'1px solid rgba(255,255,255,0.04)',
              borderBottom:'1px solid rgba(255,255,255,0.03)',
              padding:24,
              display:'flex',flexDirection:'column',
            }}>
              {card.kicker && (
                <p style={{ ...MONO,fontSize:9,textTransform:'uppercase',letterSpacing:'0.15em',color:STEEL,margin:'0 0 8px' }}>
                  {card.kicker}
                </p>
              )}
              <p style={{ ...MONO,fontSize:11,textTransform:'uppercase',letterSpacing:'0.12em',color:STEEL,margin:'0 0 8px' }}>
                {card.name}
              </p>
              <p style={{ ...DISP,fontSize:36,fontWeight:700,color:INK_PRI,lineHeight:1,margin:'0 0 4px' }}>
                {card.price}
              </p>
              <p style={{ ...MONO,fontSize:10,color:INK_MUT,margin:'0 0 20px' }}>{card.priceSub}</p>
              <div style={{ flex:1,marginBottom:20 }}>
                {card.features.map((f, i) => (
                  <p key={i} style={{ ...SANS,fontSize:13,color:INK_SEC,margin:'0 0 8px',lineHeight:1.45 }}>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 9 — Final CTA ─────────────────────────────────────────────────────

function FinalCtaSection() {
  return (
    <section style={{ padding:'96px 48px',textAlign:'center',position:'relative',overflow:'hidden',borderTop:'0.5px solid rgba(111,155,198,0.1)' }}>
      <div aria-hidden style={{
        position:'absolute',inset:0,pointerEvents:'none',zIndex:0,
        background:'radial-gradient(ellipse 800px 500px at 50% 50%, rgba(111,155,198,0.06) 0%, transparent 60%)',
      }} />
      <Ticks />
      <div style={{ position:'relative',zIndex:1 }}>
        <h2 style={{ ...DISP,fontWeight:700,fontSize:'clamp(28px,4vw,44px)',color:INK_PRI,letterSpacing:'-0.5px',margin:'0 0 32px',lineHeight:1.1 }}>
          Ready to find out what&apos;s killing your conversions?
        </h2>
        <a
          href="#scan"
          style={{
            display:'inline-block',
            ...MONO,fontSize:13,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',
            background:'transparent',
            border:'1px solid rgba(111,155,198,0.5)',
            color:STEEL,
            padding:'14px 32px',
            textDecoration:'none',
          }}
        >
          SCAN MY SITE FREE →
        </a>
        <p style={{ ...MONO,fontSize:11,color:INK_MUT,marginTop:16,marginBottom:0 }}>
          No account required. Results in ~90 seconds.
        </p>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
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
        <a href="#pricing" style={{ ...MONO,fontSize:11,color:STEEL,textDecoration:'none',letterSpacing:'0.08em' }}>
          Upgrade to see what separates the top quartile in your vertical from everyone else.
        </a>
      </div>
      <PricingSection />
      <FinalCtaSection />
    </main>
  )
}
