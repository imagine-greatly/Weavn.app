"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

function TerminalIcon({ isHovered }: { isHovered: boolean }) {
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    if (!isHovered) {
      setSuffix("");
      return;
    }
    const seq = ["x", "xl", "x", ""];
    let step = 0;
    const id = window.setInterval(() => {
      setSuffix(seq[step % seq.length] ?? "");
      step += 1;
    }, 500);
    return () => window.clearInterval(id);
  }, [isHovered]);

  return (
    <div
      className="mb-4 flex h-5 w-[40px] items-center overflow-hidden rounded border px-1 font-mono text-[8px]"
      style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--cyan)" }}
    >
      <span className="opacity-70">&gt;_</span>
      <span className="ml-0.5 truncate text-[7px]" style={{ color: "var(--text-muted)" }}>
        url{suffix}
      </span>
      <span
        className="ml-0.5 inline-block h-2 w-px align-middle"
        style={{ background: "var(--cyan)", animation: "terminalBlink 1s step-end infinite" }}
      />
    </div>
  );
}

function BrainIcon() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" className="mb-4" aria-hidden>
      <line x1="11" y1="14" x2="19" y2="9" stroke="rgba(0,200,255,0.35)" strokeWidth="1" />
      <line x1="19" y1="9" x2="29" y2="15" stroke="rgba(0,200,255,0.35)" strokeWidth="1" />
      <line x1="11" y1="14" x2="29" y2="15" stroke="rgba(0,200,255,0.35)" strokeWidth="1" />
      <circle cx="11" cy="14" r="5" fill="none" stroke="rgba(0,200,255,0.4)" strokeWidth="1.5" />
      <circle cx="19" cy="9" r="4" fill="none" stroke="rgba(0,200,255,0.35)" strokeWidth="1.5" />
      <circle cx="29" cy="15" r="5" fill="none" stroke="rgba(0,200,255,0.4)" strokeWidth="1.5" />
      <circle r="1.5" fill="var(--cyan)">
        <animateMotion dur="1s" repeatCount="indefinite" path="M11,14 L19,9" />
      </circle>
      <circle r="1.5" fill="var(--cyan)" opacity={0.9}>
        <animateMotion dur="1s" repeatCount="indefinite" begin="1s" path="M19,9 L29,15" />
      </circle>
      <circle r="1.5" fill="var(--cyan)" opacity={0.85}>
        <animateMotion dur="1s" repeatCount="indefinite" begin="2s" path="M11,14 L29,15" />
      </circle>
    </svg>
  );
}

function RingIcon() {
  const r = 13;
  const c = 2 * Math.PI * r;
  const scores = [42, 67, 74, 81];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % scores.length), 2000);
    return () => window.clearInterval(t);
  }, [scores.length]);

  return (
    <div className="relative mb-4 h-8 w-8 shrink-0" aria-hidden>
      <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="var(--border-default)" strokeWidth="2" />
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke="var(--green)"
          strokeWidth="2"
          strokeDasharray={c}
          strokeLinecap="round"
          style={{
            animation: "howWorksRingOsc 3s ease-in-out infinite alternate",
          }}
        />
      </svg>
      <span
        key={scores[idx]}
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-logo text-[9px] font-bold transition-opacity duration-500"
        style={{ color: "var(--text-primary)" }}
      >
        {scores[idx]}
      </span>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Submit your URL",
    body: "Enter your website URL. WebDoc ingests your homepage and up to two additional subpages (Pro) — extracting headlines, CTAs, trust signals, conversion architecture, and structural markers across every revenue dimension.",
    tag: "MULTI-PAGE INGESTION",
  },
  {
    n: "02",
    title: "200 diagnostic checks execute",
    body: "The diagnostic engine scores messaging clarity, CTA architecture, trust signal density, authority signals, psychological triggers, and technical conversion patterns against your site class. 200 checks. 60 seconds. No shortcuts.",
    tag: "200 DIAGNOSTIC CHECKS",
  },
  {
    n: "03",
    title: "Ranked findings. Exact resolutions.",
    body: "You receive a full diagnostic report: WebDoc Score, every finding with evidence and revenue impact, three-tier resolution protocol, benchmark comparisons, origin analysis, and a Growth Blueprint — ranked by revenue impact.",
    tag: "RANKED BY REVENUE IMPACT",
  },
];

export default function LandingHowItWorks() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <section className="relative overflow-hidden px-6 py-[120px]" style={{ background: "var(--bg-surface)" }}>
      <div className="mx-auto max-w-[1000px] text-center">
        <ScrollReveal variant="headline">
          <p className="font-mono text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "3px" }}>
            DIAGNOSTIC SEQUENCE
          </p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.06}>
          <h2 className="landing-how-heading mt-3 font-sans text-[52px] font-bold leading-tight" style={{ color: "var(--text-primary)", letterSpacing: "-1.5px" }}>
            From URL to ranked diagnostic output
            <br />
            — full coverage, no shortcuts.
          </h2>
        </ScrollReveal>
      </div>

      <div className="relative mx-auto mt-16 max-w-[1100px]">
        <div
          className="pointer-events-none absolute left-0 right-0 top-1/2 z-0 hidden h-[2px] -translate-y-1/2 md:block"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.1) 18%, rgba(0,200,255,0.35) 50%, rgba(0,200,255,0.1) 82%, transparent 100%)",
            animation: "landingHowConnectGlow 4.5s ease-in-out infinite",
          }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-stretch md:flex-row md:items-stretch md:justify-center">
        {STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <ScrollReveal variant={i % 2 === 0 ? "slide-left" : "slide-right"} className="min-w-0 flex-1">
              <div
                className="landing-card-electric relative h-full rounded-[10px] border p-8"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-default)",
                }}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <span
                  className="pointer-events-none absolute right-4 top-4 font-logo text-[80px] font-bold leading-none select-none"
                  style={{ color: "rgba(0,200,255,0.06)" }}
                >
                  {s.n}
                </span>
                {i === 0 && <TerminalIcon isHovered={hoveredStep === 0} />}
                {i === 1 && <BrainIcon />}
                {i === 2 && <RingIcon />}
                <h3 className="font-sans text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {s.title}
                </h3>
                <p className="mt-3 font-sans text-[15px] font-normal leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {s.body}
                </p>
                <p className="mt-4 font-mono text-[10px]" style={{ color: "var(--cyan)" }}>
                  {s.tag}
                </p>
              </div>
            </ScrollReveal>
            {i < STEPS.length - 1 && (
              <div
                className="landing-how-step-arrow relative z-10 flex shrink-0 items-center justify-center self-center px-2 py-3 font-mono text-2xl md:py-0"
                style={{
                  color: "rgba(0,200,255,0.6)",
                  textShadow: "0 0 20px rgba(0,200,255,0.8)",
                }}
                aria-hidden
              >
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </div>
            )}
          </Fragment>
        ))}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-[1100px] pt-4">
        <p
          className="font-sans text-[15px] font-normal leading-[1.8]"
          style={{ color: "var(--text-secondary)", maxWidth: 720 }}
        >
          Every check applies documented persuasion mechanics, loss aversion, cognitive load limits, and 40+ conversion
          architecture patterns benchmarked against high-performing sites.
        </p>
        <div className="mt-8 text-left">
          <Link
            href="/how-it-works"
            className="inline-flex items-center font-sans text-[15px] font-medium transition-[transform,text-decoration-color] duration-150"
            style={{ color: "var(--cyan)", fontWeight: 500 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
              e.currentTarget.style.transform = "translateX(3px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            Read full methodology →
          </Link>
        </div>
      </div>
    </section>
  );
}
