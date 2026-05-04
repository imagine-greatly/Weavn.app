"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ProductDepthMistTransition,
  ProductDiagnosticArcTransition,
  ProductFunnelTransition,
  ProductSignalGridTransition,
} from "@/components/PageTransitions";
import { ScrollReveal } from "@/components/ScrollReveal";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";

/**
 * Product page — conversion intelligence platform overview (technical brief).
 * DESIGN_SYSTEM.md: typography, glow, atmosphere. Reuses landing animations.
 */

export default function ProductPage() {
  const [url, setUrl] = useState("");

  return (
    <div className="min-h-screen">
      <ProductHero />
      <ProductDepthMistTransition />
      <ProductProblem />
      <ProductSignalGridTransition />
      <ProductDifference />
      <ProductDiagnosticArcTransition />
      <ProductSixCategories />
      <ProductFunnelTransition />
      <LandingFinalCTA url={url} onUrlChange={setUrl} />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function ProductHero() {
  return (
    <section
      className="relative flex min-h-[85svh] flex-col items-center justify-center overflow-hidden px-6 pt-[120px] pb-20"
      style={{ zIndex: 1 }}
    >
      {/* Atmosphere: radial bloom (hero scan bar is homepage-only in LandingHero) */}
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
          THE PRODUCT
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
            The Conversion Intelligence
            <br />
            Platform<span style={{ color: "var(--cyan)" }}>.</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="card">
          <p
            className="font-sans mt-6 text-[18px] leading-relaxed"
            style={{ color: "var(--text-secondary)", fontWeight: 400 }}
          >
            WebDoc runs a diagnostic scan on your site, flags structural and behavioral patterns that suppress conversions, and ranks each finding by revenue impact with written resolutions.
          </p>
          <Link
            href="/report/example"
            className="font-button mt-10 inline-flex items-center gap-2 rounded border px-6 py-4 text-sm transition-[border-color,box-shadow,background-color] duration-150"
            style={{
              borderColor: "rgba(0,200,255,0.4)",
              color: "var(--cyan)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,200,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.7)";
              e.currentTarget.style.boxShadow = "var(--cyan-glow-active)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            VIEW SAMPLE DIAGNOSTIC REPORT →
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── The Problem ──────────────────────────────────────────────────────────
const STAT_CARDS = [
  {
    number: "8s",
    color: "var(--cyan)",
    label: "Mean window before exit intent peaks",
    sub: "First-viewport orientation determines continuation",
  },
  {
    number: "73%",
    color: "var(--orange)",
    label: "Of sites show above-fold messaging failure",
    sub: "Value proposition does not register in first viewport",
  },
  {
    number: "2.3x",
    color: "var(--green)",
    label: "Conversion delta with outcome-led hero copy",
    sub: "Versus feature-led baseline (CXL Institute)",
  },
];

function ProductProblem() {
  return (
    <section
      className="relative w-full overflow-hidden py-[120px] px-6"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal variant="headline">
          <h2
            className="max-w-[1100px] font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(36px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-1.5px",
              fontWeight: 800,
            }}
          >
            Conversion architecture often misaligns
            <br />
            with visitor intent.
          </h2>
        </ScrollReveal>
        <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <div
              className="font-sans text-[16px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              <ScrollReveal variant="card" index={0}>
                <p className="mb-4">
                  Visitors scan the first viewport for orientation signals. When headline, CTA density, and trust markers do not match the visitor&apos;s decision frame, the session terminates within seconds.
                </p>
              </ScrollReveal>
              <ScrollReveal variant="card" index={1}>
                <p className="mb-4">
                  The gap is diagnostic: stated offer versus the outcome and risk language the visitor requires before advancing.
                </p>
              </ScrollReveal>
              <ScrollReveal variant="card" index={2}>
                <p>
                  WebDoc maps that gap with 47 checks across six revenue dimensions, cites evidence from your pages, and outputs resolutions ranked by revenue impact.
                </p>
              </ScrollReveal>
            </div>
          </div>
          <div className="flex flex-col gap-4">
          {STAT_CARDS.map((card, i) => (
            <ScrollReveal key={card.number} variant="card" index={i}>
              <div
                className="rounded-lg border p-6 transition-[border-color,box-shadow,transform] duration-200"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  borderLeft: `3px solid ${card.color}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
                  e.currentTarget.style.boxShadow = "var(--cyan-glow-soft)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.borderLeft = `3px solid ${card.color}`;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span
                  className="font-score block text-[42px] leading-none"
                  style={{ color: card.color }}
                >
                  {card.number}
                </span>
                <p
                  className="font-mono mt-2 text-[12px] leading-snug"
                  style={{ color: "var(--text-primary)" }}
                >
                  {card.label}
                </p>
                <p
                  className="font-mono mt-1 text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {card.sub}
                </p>
              </div>
            </ScrollReveal>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── The Difference ───────────────────────────────────────────────────────
const TYPICAL_ITEMS = [
  "Scores keywords and backlinks",
  "Flags missing meta tags",
  "Returns a technical index only",
  "Lists surface-level defects",
  "Omits conversion suppression drivers",
];

const WEBDOC_ITEMS = [
  "Scores persuasion and conversion architecture signals",
  "States why the visitor exits with quoted evidence",
  "Flags messaging and trust-density failures",
  "Delivers copy-level resolutions per finding",
  "Generates hero diagnostic rewrites on Pro",
];

const RESULT_ITEMS = [
  "First-viewport comprehension inside eight seconds",
  "Longer qualified sessions",
  "Higher primary CTA engagement",
  "Measured conversion movement",
  "Lower paid-traffic waste",
];

function ProductDifference() {
  return (
    <section className="relative w-full overflow-hidden py-[120px] px-6">
      <div className="mx-auto max-w-[min(1100px,calc(100vw-48px))] text-center">
        <p
          className="font-ui-label"
          style={{ color: "var(--text-muted)" }}
        >
          WHY WEBDOC.AI IS DIFFERENT
        </p>
        <ScrollReveal variant="headline">
          <h2
            className="mx-auto mt-3 max-w-[1000px] text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(36px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-1.5px",
              fontWeight: 800,
            }}
          >
            Other stacks score technical health.
            <br />
            WebDoc scores conversion suppression<span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <ScrollReveal variant="card" index={0}>
            <div className="rounded-lg border p-6 text-left" style={{ borderColor: "var(--border-default)" }}>
              <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                TYPICAL SEO STACKS
              </p>
              <ul className="mt-4 space-y-2">
                {TYPICAL_ITEMS.map((item) => (
                  <li key={item} className="font-mono text-[13px]" style={{ color: "var(--red)" }}>
                    ✕ {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="card" index={1}>
            <div
              className="rounded-lg border p-6 text-left"
              style={{
                background: "rgba(0,200,255,0.03)",
                border: "1px solid rgba(0,200,255,0.2)",
              }}
            >
              <p className="font-mono text-[11px]" style={{ color: "var(--cyan)" }}>
                WEBDOC.AI
              </p>
              <ul className="mt-4 space-y-2">
                {WEBDOC_ITEMS.map((item) => (
                  <li key={item} className="font-mono text-[13px]" style={{ color: "var(--green)" }}>
                    ✓ {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="card" index={2}>
            <div className="rounded-lg border p-6 text-left" style={{ borderColor: "var(--border-default)" }}>
              <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                POST-DIAGNOSTIC OUTCOME
              </p>
              <ul className="mt-4 space-y-2">
                {RESULT_ITEMS.map((item) => (
                  <li key={item} className="font-mono text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

// ─── Six Categories ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    num: "01",
    name: "PSYCHOLOGY",
    description:
      "Decision heuristics in the conversion path. WebDoc scores loss framing, social proof density, authority markers, urgency language, and risk reversal placement against stated outcomes.",
  },
  {
    num: "02",
    name: "MESSAGING",
    description:
      "Semantic clarity of the offer. WebDoc evaluates whether headlines and body copy state outcomes and specificity or remain feature-only in the first viewport.",
  },
  {
    num: "03",
    name: "CONVERSION",
    description:
      "Primary action architecture. WebDoc measures CTA visibility, above-fold placement, commit-step count, offer framing, and risk reversal density on the path to conversion.",
  },
  {
    num: "04",
    name: "SEO",
    description:
      "Search intent alignment. WebDoc checks whether titles, headings, and body content match how prospects query for the solution, not keyword density alone.",
  },
  {
    num: "05",
    name: "UX",
    description:
      "Task completion architecture. WebDoc maps navigation depth, viewport behavior, load latency, and on-page cognitive density where visitors abandon before the primary CTA.",
  },
  {
    num: "06",
    name: "TRUST",
    description:
      "Credibility surface area in early scroll. WebDoc scores social proof density, authority signals, risk reversal visibility, and first-session trust markers.",
  },
];

function ProductSixCategories() {
  return (
    <section className="relative w-full overflow-hidden py-[120px] px-6">
      <div className="mx-auto max-w-[min(1100px,calc(100vw-48px))] text-center">
        <ScrollReveal variant="headline">
          <h2
            className="mx-auto max-w-[920px] text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(36px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-1.5px",
              fontWeight: 800,
            }}
          >
            Six revenue dimensions<span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>
        <p
          className="mx-auto mt-4 max-w-[560px] font-sans text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          WebDoc runs forty-seven checks across six revenue dimensions. Each finding ties to visitor behavior and revenue impact.
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, i) => (
            <ScrollReveal key={cat.name} variant="card" index={i}>
              <div
                className="rounded-lg border p-8 text-left transition-all duration-200"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
                  e.currentTarget.style.boxShadow = "var(--cyan-glow-soft)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span
                  className="font-score block text-[48px] leading-none"
                  style={{ color: "rgba(0,200,255,0.15)" }}
                >
                  {cat.num}
                </span>
                <p
                  className="font-mono mt-2 text-[12px]"
                  style={{ color: "var(--cyan)", letterSpacing: "3px" }}
                >
                  {cat.name}
                </p>
                <p
                  className="mt-3 font-sans text-[14px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {cat.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

