"use client";

/**
 * Before/After transformation section — concrete outcome, not feature list.
 * DESIGN_SYSTEM.md: glow tiers, typography, colors.
 */

import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";

const SCORE_START = 38;
const SCORE_END = 72;
const COUNT_DURATION_MS = 1500;
const FLASH_DURATION_MS = 600;
const GREEN_BLOOM_MS = 800;

const RED_RGB = { r: 255, g: 45, b: 45 };
const GREEN_RGB = { r: 0, g: 230, b: 118 };

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function scoreProgress(score: number): number {
  return Math.max(0, Math.min(1, (score - SCORE_START) / (SCORE_END - SCORE_START)));
}

function mixScoreRgb(score: number): string {
  const t = scoreProgress(score);
  const r = Math.round(RED_RGB.r + (GREEN_RGB.r - RED_RGB.r) * t);
  const g = Math.round(RED_RGB.g + (GREEN_RGB.g - RED_RGB.g) * t);
  const b = Math.round(RED_RGB.b + (GREEN_RGB.b - RED_RGB.b) * t);
  return `rgb(${r},${g},${b})`;
}

function scoreGlowShadow(score: number, flash: boolean): string {
  const t = scoreProgress(score);
  const a = flash ? 0.55 + t * 0.15 : 0.28 + t * 0.22;
  const spread = flash ? 44 : 30;
  return `0 0 ${spread}px rgba(${Math.round(RED_RGB.r + (GREEN_RGB.r - RED_RGB.r) * t)},${Math.round(RED_RGB.g + (GREEN_RGB.g - RED_RGB.g) * t)},${Math.round(RED_RGB.b + (GREEN_RGB.b - RED_RGB.b) * t)},${a})`;
}

export default function BeforeAfterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimatedRef = useRef(false);
  const [score, setScore] = useState(SCORE_START);
  const [flashActive, setFlashActive] = useState(false);
  const [greenBloom, setGreenBloom] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let rafId: number;
    let flashTimeout: ReturnType<typeof setTimeout>;
    let greenBloomTimeout: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || hasAnimatedRef.current) return;
        hasAnimatedRef.current = true;

        const startTime = performance.now();

        const tick = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / COUNT_DURATION_MS, 1);
          const eased = easeOutQuart(t);
          const value = Math.round(SCORE_START + (SCORE_END - SCORE_START) * eased);
          setScore(value);

          if (t < 1) {
            rafId = requestAnimationFrame(tick);
          } else {
            setScore(SCORE_END);
            setFlashActive(true);
            setGreenBloom(true);
            flashTimeout = setTimeout(() => setFlashActive(false), FLASH_DURATION_MS);
            greenBloomTimeout = setTimeout(() => setGreenBloom(false), GREEN_BLOOM_MS);
          }
        };

        rafId = requestAnimationFrame(tick);
      },
      { threshold: 0.2, rootMargin: "0px" }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
      clearTimeout(flashTimeout);
      clearTimeout(greenBloomTimeout);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden px-6 py-[80px]"
      style={{
        backgroundColor: "#050810",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[400px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse, rgba(255,45,45,0.04) 0%, rgba(0,230,118,0.03) 45%, transparent 70%)",
          filter: "blur(50px)",
        }}
        aria-hidden
      />
      <div className="relative z-[1] mx-auto max-w-[840px]">
      {/* Header */}
      <div className="text-center">
        <ScrollReveal variant="headline">
          <p
            className="font-mono text-[11px] uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "3px" }}
          >
            BASELINE VS POST-RESOLUTION
          </p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.08}>
          <h2
            className="font-headline mt-3 text-[52px] leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            WebDoc Score after prioritized resolutions.
          </h2>
        </ScrollReveal>
      </div>

      {/* Comparison block */}
      <div
        className="relative mx-auto mt-14 flex max-w-[840px] overflow-hidden rounded-[10px]"
        style={{ gap: 0 }}
      >
        {/* LEFT — BEFORE */}
        <ScrollReveal variant="slide-left" className="min-w-0 flex-1">
        <div
          className="h-full rounded-l-[10px] p-9"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            filter: "brightness(0.9)",
          }}
        >
          <p
            className="font-ui-label"
            style={{ color: "var(--text-muted)" }}
          >
            BEFORE
          </p>
          <p
            className="mt-4 font-score text-[64px] leading-none tabular-nums"
            style={{ color: "var(--red)", textShadow: "0 0 30px rgba(255,45,45,0.5)" }}
          >
            38
          </p>
          <span
            className="mt-4 inline-block rounded-full px-3 py-1.5 font-mono text-[10px] uppercase"
            style={{
              color: "var(--red)",
              background: "rgba(255,45,45,0.08)",
              border: "1px solid rgba(255,45,45,0.15)",
              letterSpacing: "2px",
            }}
          >
            CRITICAL SUPPRESSION
          </span>

          <div
            className="mt-4 rounded border-l-2 py-2.5 px-3.5"
            style={{
              borderLeftColor: "rgba(255,45,45,0.4)",
              background: "rgba(255,45,45,0.03)",
            }}
          >
            <p className="font-ui-label" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
              HEADLINE
            </p>
            <p
              className="mt-0.5 font-body font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              We help businesses grow with software solutions
            </p>
          </div>
          <div
            className="mt-4 rounded border-l-2 py-2.5 px-3.5"
            style={{
              borderLeftColor: "rgba(255,45,45,0.4)",
              background: "rgba(255,45,45,0.03)",
            }}
          >
            <p className="font-ui-label" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
              CTA
            </p>
            <p className="mt-0.5 font-body text-left" style={{ color: "var(--text-secondary)" }}>
              Run diagnostic
            </p>
          </div>
          <div
            className="mt-4 rounded border-l-2 py-2.5 px-3.5"
            style={{
              borderLeftColor: "rgba(255,45,45,0.4)",
              background: "rgba(255,45,45,0.03)",
            }}
          >
            <p className="font-ui-label" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
              CONV. RATE
            </p>
            <p className="mt-0.5 font-data" style={{ color: "var(--red)" }}>
              1.2%
            </p>
          </div>
        </div>
        </ScrollReveal>

        {/* Energy crack — divider between BEFORE and AFTER */}
        <div
          className="shrink-0"
          style={{
            width: 1,
            background:
              "linear-gradient(180deg, rgba(255,45,45,0.6) 0%, rgba(0,230,118,0.6) 100%)",
            animation: "beforeAfterCrackPulse 2.8s ease-in-out infinite",
          }}
        />
        {/* Arrow overlay on crack */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 font-mono"
          style={{
            color: "rgba(240,244,255,0.55)",
            fontSize: 28,
            textShadow: "0 0 16px rgba(0,230,118,0.25)",
            animation: "landingBeforeAfterArrow 2s ease infinite",
          }}
        >
          →
        </div>

        {/* RIGHT — AFTER */}
        <ScrollReveal variant="slide-right" className="relative min-w-0 flex-1">
        <div
          className="relative h-full overflow-hidden rounded-r-[10px] p-9 transition-shadow duration-[600ms] ease-out"
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(0,230,118,0.22)",
            boxShadow: flashActive
              ? "0 0 56px rgba(0,230,118,0.18), 0 0 0 1px rgba(0,230,118,0.08)"
              : "0 0 40px rgba(0,230,118,0.06)",
          }}
        >
          {greenBloom && (
            <div
              className="pointer-events-none absolute inset-0 z-[5]"
              style={{
                background: "radial-gradient(ellipse at 50% 40%, rgba(0,230,118,0.06) 0%, transparent 65%)",
                animation: "landingAfterGreenBloom 800ms ease-out forwards",
              }}
              aria-hidden
            />
          )}
          <div className="relative z-[6]">
          <p
            className="font-mono text-[11px] font-medium uppercase"
            style={{ color: "#00E676", letterSpacing: "2.5px" }}
          >
            POST-RESOLUTION
          </p>
          <p
            className="mt-4 font-score text-[64px] leading-none tabular-nums transition-[text-shadow,color] duration-[600ms] ease-out"
            style={{
              color: mixScoreRgb(score),
              textShadow: scoreGlowShadow(score, flashActive),
            }}
          >
            {score}
          </p>
          <span
            className="mt-4 inline-block rounded-full px-3 py-1.5 font-mono text-[10px] uppercase"
            style={{
              color: "#00E676",
              background: "rgba(0,230,118,0.08)",
              border: "1px solid rgba(0,230,118,0.35)",
              letterSpacing: "2px",
            }}
          >
            OPTIMIZED BAND
          </span>

          <div
            className="mt-4 rounded border-l-2 py-2.5 px-3.5"
            style={{
              borderLeftColor: "rgba(0,230,118,0.45)",
              background: "rgba(0,230,118,0.04)",
            }}
          >
            <p className="font-ui-label" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
              HEADLINE
            </p>
            <p
              className="mt-0.5 font-body font-medium text-left"
              style={{ color: "var(--text-primary)" }}
            >
              Outcome-led promise inside the first viewport
            </p>
          </div>
          <div
            className="mt-4 rounded border-l-2 py-2.5 px-3.5"
            style={{
              borderLeftColor: "rgba(0,230,118,0.45)",
              background: "rgba(0,230,118,0.04)",
            }}
          >
            <p className="font-ui-label" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
              CTA
            </p>
            <p className="mt-0.5 font-body text-left" style={{ color: "var(--text-secondary)" }}>
              Schedule shoreline assessment →
            </p>
          </div>
          <div
            className="mt-4 rounded border-l-2 py-2.5 px-3.5"
            style={{
              borderLeftColor: "rgba(0,230,118,0.45)",
              background: "rgba(0,230,118,0.04)",
            }}
          >
            <p className="font-ui-label" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
              CONV. RATE
            </p>
            <p className="mt-0.5 font-data" style={{ color: "#00E676" }}>
              3.8%
            </p>
          </div>
          </div>
        </div>
        </ScrollReveal>
      </div>

      {/* Footnote — data footnote, not copy */}
      <p
        className="font-body mx-auto mt-8 max-w-[840px] text-left"
        style={{ color: "var(--text-muted)" }}
      >
        Composite illustration. Mean WebDoc Score delta across 200 archived scans.
      </p>
      </div>
    </section>
  );
}
