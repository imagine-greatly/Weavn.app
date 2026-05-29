"use client";

import { useState, useEffect, useRef, useLayoutEffect, useMemo, useId } from "react";
import {
  HowPacketsTransition,
  HowPipelineTransition,
  HowTargetTransition,
  HowTraceTransition,
  MistTransitionDown,
  MistTransitionUp,
} from "@/components/PageTransitions";
import { ScrollReveal } from "@/components/ScrollReveal";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import DIAGNOSTIC_CHECKS from "@/lib/diagnosticRubric";

/**
 * How-it-works page — diagnostic pipeline from URL to report.
 * Technical walkthrough: precise, sequential, authoritative.
 * DESIGN_SYSTEM.md: typography, glow, colors.
 */

export default function HowItWorksPage() {
  const [url, setUrl] = useState("");

  return (
    <div className="min-h-screen">
      <HowItWorksHero />
      <HowPipelineTransition />
      <ProcessSteps />
      <MistTransitionDown />
      <HowPacketsTransition />
      <TechnologySection />
      <MistTransitionUp />
      <HowTraceTransition />
      <MistTransitionDown />
      <CompleteDiagnosticDatabase />
      <MistTransitionUp />
      <FAQSection />
      <HowTargetTransition />
      <LandingFinalCTA url={url} onUrlChange={setUrl} />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function HowItWorksHero() {
  return (
    <section
      className="relative flex min-h-[70svh] flex-col items-center justify-center overflow-hidden px-6 pt-[120px] pb-20"
      style={{ zIndex: 1 }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div
          className="absolute rounded-full"
          style={{
            width: 800,
            height: 600,
            background: "radial-gradient(ellipse, rgba(0,200,255,0.03) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative z-[2] flex w-full max-w-[min(960px,calc(100vw-48px))] flex-col items-center text-center">
        <p
          className="font-mono text-[11px] uppercase"
          style={{ color: "var(--text-muted)", letterSpacing: "3px" }}
        >
          THE PROCESS
        </p>
        <ScrollReveal variant="headline">
          <h1
            className="mt-4 text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(44px, 5.2vw, 72px)",
              lineHeight: 0.98,
              letterSpacing: "-2.5px",
              fontWeight: 800,
            }}
          >
            URL to diagnostic report. Depth scales with your site's complexity.
            <span style={{ color: "var(--cyan)" }}>.</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="card">
          <p
            className="mt-6 font-sans text-[18px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Pipeline stages from URL submission through ranked findings and the scan report output.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── Step 1 visual: terminal typing + FETCHING ─────────────────────────────
function Step1Visual() {
  return (
    <div
      className="rounded-lg border p-4 font-mono text-[13px]"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        minHeight: 140,
      }}
    >
      <div className="flex items-center gap-1">
        <span style={{ color: "var(--cyan)", opacity: 0.7 }}>&gt;_</span>
          <span style={{ color: "var(--text-primary)" }}>
            <span
              className="inline-block overflow-hidden whitespace-nowrap border-r-2 pr-0.5"
              style={{
                borderRightColor: "var(--cyan)",
                animation: "typeUrl 2.5s steps(19) infinite",
              }}
            >
              https://yoursite.com
            </span>
          </span>
        <span
          className="inline-block h-4 w-0.5 bg-[var(--cyan)]"
          style={{ animation: "blink 1s step-end infinite" }}
        />
      </div>
      <div
        className="mt-3 font-mono text-[11px]"
        style={{
          color: "var(--green)",
          animation: "showFetching 3s ease-in-out infinite",
        }}
      >
        FETCHING
      </div>
    </div>
  );
}

// ─── Step 2 visual: site type classification (cycling highlight) ───────────
const SITE_TYPES = ["ECOMMERCE", "SAAS", "SERVICE", "LOCAL", "CONTENT"];
function Step2Visual() {
  return (
    <div
      className="rounded-lg border p-4 font-mono text-[12px]"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        minHeight: 140,
      }}
    >
      <div className="mb-3" style={{ color: "var(--text-muted)" }}>
        CLASSIFYING SITE MODEL
      </div>
      <div className="space-y-1.5">
        {SITE_TYPES.map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-2"
            style={{
              animation: "step2Highlight 5s ease-in-out infinite",
              animationDelay: `${-i * 1}s`,
            }}
          >
            <span>●</span>
            <span>{label}</span>
            <span
              style={{
                marginLeft: "auto",
                color: "var(--green)",
                animation: "step2CheckOpacity 5s ease-in-out infinite",
                animationDelay: `${-i * 1}s`,
              }}
            >
              ✓
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3 visual: wireframe + scanline ──────────────────────────────────
function Step3Visual() {
  return (
    <div
      className="relative rounded-lg border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        minHeight: 140,
      }}
    >
      <div className="absolute inset-0 flex flex-col gap-1 p-3">
        <div
          className="h-4 rounded flex-shrink-0"
          style={{
            background: "var(--border-default)",
            animation: "wireframeHighlight 4s ease-in-out infinite",
          }}
        />
        <div
          className="h-8 rounded flex-shrink-0"
          style={{
            background: "var(--border-default)",
            animation: "wireframeHighlight 4s ease-in-out infinite 0.25s",
          }}
        />
        <div
          className="h-5 rounded flex-shrink-0"
          style={{
            background: "var(--border-default)",
            animation: "wireframeHighlight 4s ease-in-out infinite 0.5s",
          }}
        />
        <div
          className="h-4 rounded flex-shrink-0"
          style={{
            background: "var(--border-default)",
            animation: "wireframeHighlight 4s ease-in-out infinite 0.75s",
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.8), transparent)",
          animation: "scanlineDown 4s linear infinite",
        }}
      />
    </div>
  );
}

// ─── Step 4 visual: findings list with stagger ──────────────────────────────
const FINDING_ITEMS = [
  { badge: "CRITICAL", color: "var(--red)", text: "Hero headline fails eight-second read" },
  { badge: "HIGH", color: "var(--orange)", text: "Primary CTA under-motivates action" },
  { badge: "LOW", color: "var(--green)", text: "Meta description present" },
];

function Step4Visual() {
  return (
    <div
      className="rounded-lg border p-3 font-mono text-[11px]"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        minHeight: 140,
      }}
    >
      {FINDING_ITEMS.map((item, i) => (
        <div
          key={item.text}
          className="flex items-center gap-2 py-1.5 opacity-0"
          style={{
            animation: "findingAppear 4s ease-in-out infinite",
            animationDelay: `${i * 0.4}s`,
            animationFillMode: "both",
          }}
        >
          <span
            className="rounded px-1.5 py-0.5"
            style={{
              color: item.color,
              border: `1px solid ${item.color}`,
              background: `${item.color}15`,
            }}
          >
            [{item.badge}]
          </span>
          <span style={{ color: "var(--text-secondary)" }}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Step 5 visual: mini report (score ring + bar + card) ──────────────────
function Step5Visual() {
  const [score, setScore] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setScore((s) => (s >= 62 ? 0 : s + 1));
    }, 35);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        minHeight: 140,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 flex-shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="var(--border-default)"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="2"
              strokeDasharray="100.5 100.5"
              strokeDashoffset={100.5 * (1 - score / 62)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.05s linear" }}
            />
          </svg>
          <span
            className="font-score absolute inset-0 flex items-center justify-center text-[14px]"
            style={{ color: "var(--orange)" }}
          >
            {score}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1 h-1 w-full rounded-full" style={{ background: "var(--border-default)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: "62%",
                background: "var(--cyan)",
              }}
            />
          </div>
          <div
            className="rounded border-l-2 py-1 pl-2"
            style={{
              borderLeftColor: "var(--red)",
              background: "rgba(255,45,45,0.06)",
              fontSize: 10,
              color: "var(--text-secondary)",
            }}
          >
            Hero headline fails eight-second read
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Process steps data ───────────────────────────────────────────────────
const STEPS = [
  {
    num: 1,
    title: "Submit your URL for diagnostic analysis",
    visual: <Step1Visual />,
    explanationTitle: "Target pages are retrieved and parsed",
    explanationBody:
      "WebDoc requests your URL and ingests raw HTML for the landing page and up to two additional subpages on Pro. Free tier scans the landing page only. Headlines, CTAs, body copy, trust markers, and structural elements are extracted for scoring.",
    tag: "PRO: LANDING PAGE + UP TO 2 SUBPAGES",
  },
  {
    num: 2,
    title: "Site model classification runs",
    visual: <Step2Visual />,
    explanationTitle: "Business model weights the diagnostic",
    explanationBody:
      "Ecommerce, SaaS, service, local, and content models use different scoring weights. WebDoc infers the model from page signals and applies the matching check set so findings stay comparable within that archetype.",
    tag: "FIVE SITE MODELS",
  },
  {
    num: 3,
    title: "WebDoc performs surgical site scan",
    visual: <Step3Visual />,
    explanationTitle: "Two hundred checks across six revenue dimensions",
    explanationBody:
      "Two hundred checks run across Conversion Architecture, Trust Signals, Message Clarity, Traffic Readiness, Technical Foundation, and Vertical Signals in parallel. Each check binds to a cited principle and produces machine-readable evidence from your DOM.",
    tag: "200 CHECKS · 6 REVENUE DIMENSIONS",
  },
  {
    num: 4,
    title: "Findings ranked by revenue impact",
    visual: <Step4Visual />,
    explanationTitle: "Severity and ordering by suppression",
    explanationBody:
      "Findings are not flat-listed. WebDoc orders the set by revenue impact so critical suppression appears first. Each row carries severity, quoted evidence, and the governing principle reference.",
    tag: "PRIORITY REVENUE IMPACT RANKING",
  },
  {
    num: 5,
    title: "Diagnostic report and resolutions delivered",
    visual: <Step5Visual />,
    explanationTitle: "WebDoc Score, dimension scores, and resolution text",
    explanationBody:
      "Output includes the WebDoc Score, per-dimension scores, the full finding set with resolutions, and on Pro a hero diagnostic rewrite aligned to the same finding set. Copy is written for direct implementation.",
    tag: "FULL SCAN REPORT",
  },
];

// ─── The Process — large step visualization ────────────────────────────────
/** One spine + one dot; travel distance = sum of [data-timeline-segment] heights (~80px per gap). */
function ProcessTimelineSpine({
  spine,
  animId,
}: {
  spine: { top: number; height: number };
  animId: string;
}) {
  const { keyframesCss, totalSec, kfName } = useMemo(() => {
    const h = spine.height;
    const travelSec = Math.max(6, Math.min(8, h / 80));
    const fadeOut = 0.3;
    const pause = 0.2;
    const fadeIn = 0.2;
    const totalSec = travelSec + fadeOut + pause + fadeIn;
    const kfName = `timelineDotLoop_${animId}`;
    const pTravelEnd = (travelSec / totalSec) * 100;
    const pFadeOutEnd = ((travelSec + fadeOut) / totalSec) * 100;
    const pJump = pFadeOutEnd + 0.02;
    const pPauseEnd = ((travelSec + fadeOut + pause) / totalSec) * 100;

    const keyframesCss = `@keyframes ${kfName} {
  0% { top: 0%; opacity: 1; }
  ${pTravelEnd}% { top: 100%; opacity: 1; }
  ${pFadeOutEnd}% { top: 100%; opacity: 0; }
  ${pJump}% { top: 0%; opacity: 0; }
  ${pPauseEnd}% { top: 0%; opacity: 0; }
  100% { top: 0%; opacity: 1; }
}`;

    return { keyframesCss, totalSec, kfName };
  }, [spine.height, animId]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: keyframesCss }} />
      <div
        aria-hidden
        className="pointer-events-none absolute z-[1] w-px -translate-x-1/2"
        style={{
          left: "50%",
          top: spine.top,
          height: spine.height,
          background: "rgba(0,200,255,0.2)",
        }}
      />
      <div
        className="pointer-events-none absolute z-[2] -translate-x-1/2 overflow-visible"
        style={{
          left: "50%",
          top: spine.top,
          height: spine.height,
          width: 1,
        }}
      >
        <div
          className="absolute h-2 w-2 rounded-full"
          style={{
            left: "50%",
            top: 0,
            transform: "translate(-50%, -50%)",
            background: "var(--cyan)",
            boxShadow: "0 0 8px rgba(0,200,255,0.6)",
            animation: `${kfName} ${totalSec}s linear infinite`,
          }}
        />
      </div>
    </>
  );
}

function ProcessSteps() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [spine, setSpine] = useState<{ top: number; height: number } | null>(null);
  const animId = useId().replace(/:/g, "");

  useLayoutEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const measure = () => {
      const segs = root.querySelectorAll<HTMLElement>("[data-timeline-segment]");
      if (segs.length === 0) return;
      const cr = root.getBoundingClientRect();
      let top = Infinity;
      let bottom = -Infinity;
      segs.forEach((s) => {
        const r = s.getBoundingClientRect();
        top = Math.min(top, r.top - cr.top);
        bottom = Math.max(bottom, r.bottom - cr.top);
      });
      const height = Math.max(1, bottom - top);
      setSpine({ top, height });
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section className="relative w-full overflow-hidden py-[80px] px-6">
      <div ref={wrapRef} className="relative mx-auto max-w-[min(1100px,calc(100vw-48px))]">
        {spine && spine.height > 0 ? <ProcessTimelineSpine spine={spine} animId={animId} /> : null}
        {STEPS.map((step, index) => (
          <div key={step.num}>
            <div
              className={`relative z-[3] grid items-center gap-10 md:grid-cols-2 md:gap-14 ${
                index % 2 === 1 ? "md:direction-rtl" : ""
              }`}
              style={index % 2 === 1 ? { direction: "rtl" } : undefined}
            >
              <div style={index % 2 === 1 ? { direction: "ltr" } : undefined} className="relative">
                <ScrollReveal variant="card" index={index}>
                  <div className="relative">
                    <span
                      className="font-score pointer-events-none absolute -left-2 -top-4 select-none text-[120px] leading-none"
                      style={{ color: "rgba(0,200,255,0.06)" }}
                    >
                      {step.num}
                    </span>
                    <div className="relative z-[1] pt-6">{step.visual}</div>
                  </div>
                </ScrollReveal>
              </div>
              <div style={index % 2 === 1 ? { direction: "ltr" } : undefined}>
                <ScrollReveal variant="headline">
                  <p className="font-ui-label" style={{ color: "var(--text-muted)" }}>
                    STEP {step.num}
                  </p>
                  <h3
                    className="mt-1 max-w-[min(36rem,100%)] font-sans font-extrabold"
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "clamp(20px, 2vw, 26px)",
                      lineHeight: 0.98,
                      letterSpacing: "-0.8px",
                      fontWeight: 800,
                    }}
                  >
                    {step.title}
                  </h3>
                </ScrollReveal>
                <ScrollReveal variant="card">
                  <h4
                    className="mt-6 max-w-[min(40rem,100%)] font-sans font-extrabold"
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "clamp(24px, 2.6vw, 36px)",
                      lineHeight: 0.98,
                      letterSpacing: "-1.2px",
                      fontWeight: 800,
                    }}
                  >
                    {step.explanationTitle}
                  </h4>
                  <p
                    className="mt-4 font-sans text-[15px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {step.explanationBody}
                  </p>
                  <p
                    className="mt-4 font-mono text-[11px]"
                    style={{ color: "var(--cyan)" }}
                  >
                    {step.tag}
                  </p>
                </ScrollReveal>
              </div>
            </div>
            {index < STEPS.length - 1 ? (
              <div
                data-timeline-segment
                aria-hidden
                className="relative z-[2] h-20 w-full shrink-0"
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Technology section ───────────────────────────────────────────────────
const TECH_CARDS = [
  {
    title: "DIAGNOSTIC ENGINE",
    body:
      "Scoring maps to established persuasion and attention models (Cialdini, AIDA, loss framing, cognitive load, Von Restorff). Each flagged finding cites the principle and ties it to on-page evidence.",
  },
  {
    title: "PATTERN LIBRARY",
    body:
      "Benchmarks derive from high-converting page archetypes by vertical. Ecommerce, SaaS, and service layouts are scored against distinct reference patterns rather than a single generic template.",
  },
  {
    title: "SEMANTIC AI",
    body:
      "Inference runs on large language models for natural-language reading of headlines, CTAs, and supporting copy. The stack prioritizes semantic classification over keyword matching alone.",
  },
];

function TechnologySection() {
  return (
    <section
      className="relative w-full overflow-hidden py-[120px] px-6"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="mx-auto max-w-[min(1100px,calc(100vw-48px))] text-center">
        <p className="font-ui-label" style={{ color: "var(--text-muted)" }}>
          UNDER THE HOOD
        </p>
        <ScrollReveal variant="headline">
          <h2
            className="mx-auto mt-3 max-w-[min(52rem,calc(100vw-48px))] text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(36px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-1.5px",
              fontWeight: 800,
            }}
          >
            Diagnostic models plus live page evidence
            <span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TECH_CARDS.map((card, i) => (
            <ScrollReveal key={card.title} variant="card" index={i}>
              <div
                className="rounded-lg border p-6 text-left transition-[border-color,box-shadow] duration-200"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
                  e.currentTarget.style.boxShadow = "var(--cyan-glow-soft)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <p className="font-mono text-[12px]" style={{ color: "var(--cyan)" }}>
                  {card.title}
                </p>
                <p
                  className="mt-4 font-sans text-[14px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {card.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Complete Diagnostic Database ─────────────────────────────────────────

const DIMENSION_CATEGORIES: { name: string; categories: string[] }[] = [
  {
    name: "Conversion Architecture",
    categories: ["CTA & Conversion", "Checkout & Purchase Friction", "Offer & Pricing", "Email & Retention"],
  },
  {
    name: "Trust & Credibility",
    categories: ["Trust & Credibility", "Social Proof", "Return Visitor & Retention"],
  },
  {
    name: "Message Clarity",
    categories: ["Hero Section", "Messaging & Clarity", "Specificity & Claim Quality"],
  },
  {
    name: "Psychology & Persuasion",
    categories: ["Psychology & Persuasion", "Emotional Sequence & Page Flow", "Competitive Differentiation"],
  },
  {
    name: "Traffic Readiness",
    categories: ["SEO & Metadata", "Page & Content Gaps"],
  },
  {
    name: "Technical Foundation",
    categories: ["Navigation & UX", "Mobile Experience", "Page Speed & Technical", "Product Page", "Accessibility & Inclusion"],
  },
  {
    name: "Vertical & Universal Signals",
    categories: ["Universal & Cross-Vertical", "SaaS-Specific", "E-commerce Specific", "Agency & Service", "Conversion Path Expansion"],
  },
  {
    name: "Narrative Flow",
    categories: ["Narrative Flow"],
  },
];

const SEVERITY_DOT: Record<string, { background: string }> = {
  Critical: { background: "rgba(0,200,255,1)" },
  High:     { background: "rgba(0,200,255,0.45)" },
  Medium:   { background: "rgba(0,200,255,0.18)" },
  Low:      { background: "rgba(0,200,255,0.07)" },
};

function CompleteDiagnosticDatabase() {
  const [openDim, setOpenDim] = useState<string | null>(null);

  const dimensions = DIMENSION_CATEGORIES.map((dim) => {
    const checks = DIAGNOSTIC_CHECKS.filter((c) => dim.categories.includes(c.category));
    return { ...dim, checks };
  });

  return (
    <section
      className="relative w-full overflow-hidden px-6 py-[120px]"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="mx-auto max-w-[min(1100px,calc(100vw-48px))]">
        <p className="font-ui-label text-center" style={{ color: "var(--text-muted)" }}>
          COMPLETE DIAGNOSTIC DATABASE
        </p>
        <ScrollReveal variant="headline">
          <h2
            className="mx-auto mt-3 max-w-[min(52rem,calc(100vw-48px))] text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(36px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-1.5px",
              fontWeight: 800,
            }}
          >
            All 200 checks, every scan
            <span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal variant="card">
          <p
            className="mx-auto mt-5 max-w-[540px] text-center font-sans text-[16px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Every check WebDoc runs, grouped by revenue dimension. Click a dimension to expand its full check list.
          </p>
        </ScrollReveal>

        <div className="mt-14 space-y-3">
          {dimensions.map((dim, di) => {
            const isOpen = openDim === dim.name;
            return (
              <ScrollReveal key={dim.name} variant="card" index={di}>
                <div
                  className="overflow-hidden rounded-sm border transition-[border-color] duration-200"
                  style={{
                    borderColor: isOpen ? "rgba(0,200,255,0.3)" : "var(--border-default)",
                    background: "var(--bg-card)",
                  }}
                >
                  {/* Dimension header — always visible */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setOpenDim(isOpen ? null : dim.name)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className="shrink-0 font-mono text-[10px] uppercase tracking-[2px] tabular-nums"
                        style={{ color: "var(--cyan)", minWidth: 60 }}
                      >
                        {dim.checks.length} CHECKS
                      </span>
                      <span
                        className="font-sans font-extrabold"
                        style={{
                          color: "var(--text-primary)",
                          fontSize: "clamp(15px, 1.4vw, 18px)",
                          letterSpacing: "-0.4px",
                          lineHeight: 1.1,
                        }}
                      >
                        {dim.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className="font-mono text-[16px] transition-transform duration-200"
                        style={{
                          color: "var(--text-muted)",
                          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        +
                      </span>
                    </div>
                  </button>

                  {/* Expanded check list */}
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t px-6 pb-6 pt-4" style={{ borderColor: "var(--border-default)" }}>
                        {/* Group by sub-category */}
                        {dim.categories.map((cat) => {
                          const catChecks = dim.checks.filter((c) => c.category === cat);
                          if (!catChecks.length) return null;
                          return (
                            <div key={cat} className="mb-8 last:mb-0">
                              <p
                                className="mb-4 font-mono text-[9px] uppercase"
                                style={{ color: "rgba(100,120,140,0.45)", letterSpacing: "3px" }}
                              >
                                {cat}
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {catChecks.map((check) => {
                                  const dot = SEVERITY_DOT[check.severity];
                                  return (
                                    <div
                                      key={check.id}
                                      className="flex items-start gap-3"
                                    >
                                      <span
                                        className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{ background: dot.background }}
                                      />
                                      <span
                                        className="font-mono text-[11px] leading-snug"
                                        style={{ color: "var(--text-secondary)" }}
                                      >
                                        {check.title}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Total tally */}
        <ScrollReveal variant="card">
          <div
            className="mt-8 flex items-center justify-center gap-3 rounded-sm border px-6 py-4"
            style={{
              borderColor: "rgba(0,200,255,0.15)",
              background: "rgba(0,200,255,0.03)",
            }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
              Total
            </span>
            <span
              className="font-sans font-extrabold"
              style={{ color: "var(--cyan)", fontSize: 22, letterSpacing: "-0.8px" }}
            >
              200
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
              checks · every scan · no sampling
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Supported site types",
    a: "WebDoc classifies ecommerce, SaaS, service, local, and content sites and applies the corresponding weighting. Conversion architecture rules apply across types; the active check set shifts with the inferred model.",
  },
  {
    q: "PageSpeed, SEMrush, and WebDoc",
    a: "PageSpeed reports technical performance. SEMrush reports search visibility. WebDoc reports conversion architecture and suppression signals with quoted evidence and ranked resolutions. Use them together; they measure different layers.",
  },
  {
    q: "Scraper blocks and thin HTML",
    a: "Heavy client-rendered stacks (React, Vue, Next.js) sometimes return partial HTML. WebDoc analyzes every byte returned and flags incomplete capture when the DOM is below threshold. Standard server-rendered sites usually return full content.",
  },
  {
    q: "Finding accuracy",
    a: "Each finding includes quoted copy or structure from your page. Nothing is invented. A flag always traces to a specific DOM element or text span the model evaluated.",
  },
  {
    q: "Scan duration",
    a: "Scan duration scales with your site's complexity. Simple server-rendered sites complete in under 2 minutes. Complex JavaScript-heavy sites take longer — because they receive a more thorough analysis. Every scan covers your homepage plus up to two additional subpages.",
  },
  {
    q: "Competitor URLs",
    a: "Public URLs are valid targets. Pro carries the full finding set and history for comparative diagnostics across tracked domains.",
  },
  {
    q: "Rescan cadence",
    a: "Rescan after you ship resolutions from the prior report. Pro history supports two- to four-week comparison cycles to track WebDoc Score movement.",
  },
  {
    q: "Data retention",
    a: "Reports persist in your account for re-open and score tracking. Crawled page text is not sold or used to train third-party models.",
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative w-full overflow-hidden py-[120px] px-6">
      <div className="mx-auto max-w-[min(900px,calc(100vw-48px))]">
        <p className="font-ui-label text-center" style={{ color: "var(--text-muted)" }}>
          DIAGNOSTIC REFERENCE
        </p>
        <ScrollReveal variant="headline">
          <h2
            className="mx-auto mt-3 max-w-[min(52rem,calc(100vw-48px))] text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(36px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-1.5px",
              fontWeight: 800,
            }}
          >
            Pipeline and product facts<span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>

        <div className="mt-14 space-y-0">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="border-b transition-colors"
              style={{ borderColor: "var(--border-default)" }}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 py-5 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  borderLeft: "2px solid transparent",
                  paddingLeft: 20,
                  ...(openIndex === i ? { borderLeftColor: "var(--cyan)", paddingLeft: 18 } : {}),
                }}
              >
                <span
                  className="max-w-[min(36rem,calc(100%-2rem))] font-sans font-extrabold leading-snug"
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "clamp(15px, 1.4vw, 17px)",
                    lineHeight: 1.15,
                    letterSpacing: "-0.3px",
                    fontWeight: 800,
                  }}
                >
                  {item.q}
                </span>
                <span
                  className="shrink-0 font-mono text-[18px] transition-transform duration-200"
                  style={{
                    color: "var(--text-muted)",
                    transform: openIndex === i ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{
                  gridTemplateRows: openIndex === i ? "1fr" : "0fr",
                }}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className="pb-5 pl-5 pr-12 font-sans text-[15px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

