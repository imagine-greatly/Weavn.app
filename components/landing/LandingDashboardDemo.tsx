"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";

const FEATURES = [
  {
    title: "WebDoc Score timeline",
    sub: "See exactly which resolutions moved the score — and by how much.",
  },
  {
    title: "Priority finding queue",
    sub: "Highest revenue impact surfaces first. Ranked, filtered, actionable.",
  },
  {
    title: "AI Resolution Advisor",
    sub: "Retains full scan context. Grounds every answer in your diagnostic findings.",
  },
];

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/** Sparkline path (Jan 14 → Feb 2 → Mar 19) — scores 38, 52, 61 in viewBox coords */
const SPARK_W = 320;
const SPARK_H = 100;
const PAD_X = 24;
const PAD_TOP = 22;
const PAD_BOT = 28;
const x0 = PAD_X;
const x1 = SPARK_W / 2;
const x2 = SPARK_W - PAD_X;
const yForScore = (s: number) =>
  PAD_TOP + ((61 - s) / (61 - 38)) * (SPARK_H - PAD_TOP - PAD_BOT);
const y0 = yForScore(38);
const y1 = yForScore(52);
const y2 = yForScore(61);
const LINE_PATH = `M ${x0} ${y0} L ${x1} ${y1} L ${x2} ${y2}`;
const AREA_PATH = `${LINE_PATH} L ${x2} ${SPARK_H} L ${x0} ${SPARK_H} Z`;

function ScoreTimelineMock() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [displayScore, setDisplayScore] = useState(38);
  const [drawLine, setDrawLine] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setInView(true);
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    setDrawLine(false);
    let cancelled = false;
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setDrawLine(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
    };
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1200;
    const from = 38;
    const to = 61;
    let raf = 0;
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / duration);
      const eased = easeOutQuart(u);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const scoreColor = displayScore < 60 ? "#FFB300" : "#00C8FF";

  return (
    <div ref={rootRef}>
      <div
        className="landing-card-electric"
        style={{
          background: "var(--bg-card, #0D1220)",
          border: "1px solid var(--border-default, #1A2035)",
          borderRadius: 10,
          padding: 24,
          marginBottom: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,200,255,0.04)",
        }}
      >
        <p className="font-mono text-left text-[14px]" style={{ color: "#FFFFFF" }}>
          client-store.com
        </p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-logo text-[32px] leading-none tabular-nums" style={{ color: scoreColor, transition: "color 0.35s ease" }}>
            {displayScore}
          </span>
          <span className="font-mono text-[14px]" style={{ color: "#8899AA" }}>
            / 100
          </span>
        </div>
        <p className="mt-2 font-mono text-[12px]" style={{ color: "#00E676" }}>
          ↑ +18 points this month
        </p>

        <div className="mt-5 w-full overflow-hidden">
          <svg
            width="100%"
            height={SPARK_H}
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <linearGradient id="landingDashSparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0,200,255,0.06)" />
                <stop offset="100%" stopColor="rgba(0,200,255,0)" />
              </linearGradient>
            </defs>
            <path d={AREA_PATH} fill="url(#landingDashSparkFill)" />
            <path
              d={LINE_PATH}
              fill="none"
              stroke="var(--cyan)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: drawLine ? 0 : 1,
                transition: "stroke-dashoffset 1.5s ease-out",
              }}
            />
            <circle cx={x0} cy={y0} r={5} fill="var(--cyan)" />
            <circle cx={x1} cy={y1} r={5} fill="var(--cyan)" />
            <circle cx={x2} cy={y2} r={8} fill="rgba(0,200,255,0.15)" className="live-pulse" />
            <circle cx={x2} cy={y2} r={5} fill="var(--cyan)" />
          </svg>
          <div
            className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px]"
            style={{ color: "#8899AA", letterSpacing: "0.04em" }}
          >
            <span>Jan 14</span>
            <span aria-hidden>·</span>
            <span>Feb 2</span>
            <span aria-hidden>·</span>
            <span>Mar 19</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiAdvisorMock() {
  const [phase, setPhase] = useState<"dots" | "msg">("dots");

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("msg"), 1200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="landing-card-electric rounded p-5"
      style={{ background: "#0A0F1E", border: "1px solid rgba(0,200,255,0.15)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="live-pulse h-2 w-2 shrink-0 rounded-full"
            style={{ background: "var(--cyan)", boxShadow: "0 0 12px rgba(0,200,255,0.9)" }}
          />
          <span className="font-mono text-[11px]" style={{ color: "var(--cyan)" }}>
            AI RESOLUTION ADVISOR
          </span>
        </div>
      </div>
      <div className="mt-3.5 rounded-br-lg rounded-tr-lg rounded-bl-lg p-3.5" style={{ background: "var(--bg-elevated)" }}>
        {phase === "dots" ? (
          <p className="font-mono text-[13px] leading-[1.6]" style={{ color: "var(--text-muted)" }}>
            <span className="inline-flex gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse" style={{ animationDelay: "150ms" }}>
                ●
              </span>
              <span className="animate-pulse" style={{ animationDelay: "300ms" }}>
                ●
              </span>
            </span>
          </p>
        ) : (
          <p
            className="animate-fade-up font-sans text-[13px] font-normal leading-[1.6]"
            style={{ color: "var(--text-secondary)" }}
          >
            WebDoc Score increased 23 points since the prior diagnostic. Hero copy remains feature-led. Rescan after
            repositioning the above-fold CTA to measure delta.
            <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse align-middle" style={{ background: "var(--cyan)" }} />
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Show me the resolution", "What moved the score?"].map((chip) => (
          <span
            key={chip}
            className="inline-block rounded-full border px-3 py-1 font-mono text-[10px]"
            style={{ color: "var(--text-muted)", background: "var(--bg-card)", borderColor: "var(--border-default)" }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingDashboardDemo() {
  return (
    <section className="px-6 py-[120px]" style={{ background: "#070C14" }}>
      <div className="mx-auto flex max-w-[1040px] flex-col gap-12 lg:flex-row lg:items-start lg:gap-[40px]">
        <div className="min-w-0 lg:w-[45%]">
          <ScrollReveal variant="headline">
            <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "3px" }}>
              DIAGNOSTIC DASHBOARD
            </p>
          </ScrollReveal>
          <ScrollReveal variant="headline" delay={0.06}>
            <h2
              className="landing-dashboard-heading mt-3 font-sans text-[44px] font-bold"
              style={{ color: "#FFFFFF", letterSpacing: "-1.5px", lineHeight: 1.1 }}
            >
              Your score goes up.
              <br />
              We prove it.
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="sub">
            <p
              className="mt-4 max-w-[420px] font-sans text-[15px] font-normal"
              style={{ color: "#8899AA", lineHeight: 1.7 }}
            >
              Every scan persists in your dashboard. Resolve a finding, rescan, watch the score move. The AI Resolution
              Advisor retains full context across every diagnostic.
            </p>
          </ScrollReveal>
          <ul className="mt-8 space-y-5">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} variant="list" index={i}>
                <li className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-mono text-sm" style={{ color: "var(--cyan)" }}>
                    ■
                  </span>
                  <div>
                    <p className="font-sans text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {f.title}
                    </p>
                    <p className="mt-1 font-sans text-[13px] font-light" style={{ color: "var(--text-secondary)" }}>
                      {f.sub}
                    </p>
                  </div>
                </li>
              </ScrollReveal>
            ))}
          </ul>
          <ScrollReveal variant="list" index={3}>
            <Link
              href="/auth?mode=signup"
              className="group/dbdemo mt-10 inline-flex items-center font-mono text-[12px] uppercase transition-[background-color,border-color] duration-150"
              style={{
                color: "#00C8FF",
                background: "transparent",
                border: "1px solid rgba(0,200,255,0.4)",
                padding: "10px 20px",
                borderRadius: 4,
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,200,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
              }}
            >
              Run Your First Diagnostic →
            </Link>
          </ScrollReveal>
        </div>

        <ScrollReveal variant="slide-right" className="min-w-0 flex-1 lg:w-[55%]">
          <div>
            <ScoreTimelineMock />
            <AiAdvisorMock />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
