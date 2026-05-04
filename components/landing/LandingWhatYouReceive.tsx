"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useCountUp } from "@/hooks/useCountUp";

function CardBracket({ hovered }: { hovered: boolean }) {
  const line = hovered ? "rgba(0,200,255,0.6)" : "rgba(0,200,255,0.25)";
  return (
    <div
      className="pointer-events-none absolute right-4 top-4 h-3 w-3 origin-top-right transition-all duration-200"
      style={{ transform: hovered ? "scale(1.1)" : "scale(1)" }}
      aria-hidden
    >
      <div className="absolute right-0 top-0" style={{ width: 12, height: 1, background: line }} />
      <div className="absolute right-0 top-0" style={{ width: 1, height: 12, background: line }} />
    </div>
  );
}

function ScoreRingCard({ hovered }: { hovered: boolean }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const targetPct = 0.74;
  const targetOffset = c * (1 - targetPct);
  const { display } = useCountUp(0, 74, { active: hovered, durationMs: 800, decimals: 0 });
  const [ringOffset, setRingOffset] = useState(targetOffset);

  useLayoutEffect(() => {
    if (!hovered) {
      setRingOffset(targetOffset);
      return;
    }
    setRingOffset(c);
    const id = requestAnimationFrame(() => setRingOffset(targetOffset));
    return () => cancelAnimationFrame(id);
  }, [hovered, c, targetOffset]);

  return (
    <div className="relative mx-auto mb-5 h-16 w-16 shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border-default)" strokeWidth="3" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--green)"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={ringOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 800ms ease-out" }}
        />
      </svg>
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-logo text-xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {hovered ? display : "74"}
      </span>
    </div>
  );
}

function MiniFindingVisual({ hovered }: { hovered: boolean }) {
  return (
    <div
      className="mx-auto mb-5 h-16 w-full max-w-[200px] rounded border border-l-[3px] p-2"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "var(--border-default)",
        borderLeftColor: "var(--red)",
      }}
    >
      <span
        className="inline-block rounded border px-1.5 py-0.5 font-mono text-[8px] transition-shadow duration-300"
        style={{
          color: "var(--red)",
          borderColor: "rgba(255,45,45,0.3)",
          background: "rgba(255,45,45,0.08)",
          animation: hovered ? "criticalBadgePulse 2s ease infinite" : "none",
        }}
      >
        CRITICAL
      </span>
      <div className="mt-2 h-2 w-full rounded" style={{ background: "var(--border-default)", opacity: 0.5 }} />
      <div className="mt-1 h-2 w-[85%] rounded" style={{ background: "var(--border-default)", opacity: 0.35 }} />
    </div>
  );
}

function ThreeTierVisual() {
  return (
    <div className="mx-auto mb-5 w-full" style={{ height: 64 }}>
      <div style={{ borderLeft: "2px solid #00C8FF", background: "#080D18", padding: "6px 12px", marginBottom: 4 }}>
        <span className="font-mono text-[9px]" style={{ color: "#00C8FF" }}>IMMEDIATE</span>
      </div>
      <div style={{ borderLeft: "2px solid #8899AA", background: "#080D18", padding: "6px 12px", marginBottom: 4 }}>
        <span className="font-mono text-[9px]" style={{ color: "#8899AA" }}>PROPER</span>
      </div>
      <div style={{ borderLeft: "2px solid #1A2035", background: "#080D18", padding: "6px 12px" }}>
        <span className="font-mono text-[9px]" style={{ color: "#8899AA", opacity: 0.6 }}>ADVANCED</span>
      </div>
    </div>
  );
}

function AdvisorMiniVisual() {
  return (
    <div
      className="mx-auto mb-5 w-full"
      style={{
        background: "#080D18",
        border: "1px solid rgba(0,200,255,0.15)",
        padding: "10px 12px",
        height: 64,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="live-pulse h-2 w-2 shrink-0 rounded-full"
          style={{ background: "var(--cyan)", boxShadow: "0 0 8px rgba(0,200,255,0.9)" }}
        />
        <span className="font-mono text-[9px]" style={{ color: "#00C8FF" }}>AI ADVISOR</span>
      </div>
      <p className="font-sans text-[11px] truncate" style={{ color: "#8899AA" }}>
        Primary CTA absent above fold on mobile. Reposition to within 600px of page top.
      </p>
    </div>
  );
}

function GrowthBlueprintVisual() {
  return (
    <div className="mx-auto mb-5 w-full flex gap-2" style={{ height: 64 }}>
      <div className="flex-1">
        <span className="font-mono text-[9px]" style={{ color: "#00C8FF" }}>WEEK 1</span>
        <div style={{ height: 3, background: "#1A2035", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "100%", background: "#00C8FF", borderRadius: 2 }} />
        </div>
        <div style={{ height: 4, background: "#1A2035", borderRadius: 1, marginTop: 4 }} />
        <div style={{ height: 4, background: "#1A2035", borderRadius: 1, marginTop: 4 }} />
      </div>
      <div className="flex-1">
        <span className="font-mono text-[9px]" style={{ color: "#8899AA" }}>WEEKS 2–4</span>
        <div style={{ height: 3, background: "#1A2035", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "60%", background: "#FFB300", borderRadius: 2 }} />
        </div>
        <div style={{ height: 4, background: "#1A2035", borderRadius: 1, marginTop: 4 }} />
      </div>
      <div className="flex-1">
        <span className="font-mono text-[9px]" style={{ color: "#8899AA" }}>MONTH 2+</span>
        <div style={{ height: 3, background: "#1A2035", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "30%", background: "#8899AA", borderRadius: 2 }} />
        </div>
        <div style={{ height: 4, background: "#1A2035", borderRadius: 1, marginTop: 4 }} />
      </div>
    </div>
  );
}

function SparklineVisual() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.15 });
  const [len, setLen] = useState(0);
  const [hovered, setHovered] = useState(false);

  useLayoutEffect(() => {
    const p = pathRef.current;
    if (p) setLen(p.getTotalLength());
  }, []);

  const d = "M0 26 L20 22 L40 18 L60 10 L80 6";

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto mb-5 flex h-8 w-20 items-end justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width="80" height="32" viewBox="0 0 80 32" aria-hidden>
        <defs>
          <linearGradient id="recvSparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,200,255,0.12)" />
            <stop offset="100%" stopColor="rgba(0,200,255,0.02)" />
          </linearGradient>
        </defs>
        <path d={`${d} L80 32 L0 32 Z`} fill="url(#recvSparkFill)" />
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="var(--cyan)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len || 1}
          strokeDashoffset={inView ? 0 : len}
          style={{
            transition: "stroke-dashoffset 1.2s ease-out",
          }}
        />
        {hovered && len > 0 && (
          <circle r="3" fill="var(--cyan)">
            <animateMotion dur="1.4s" repeatCount="indefinite" path={d} />
          </circle>
        )}
      </svg>
    </div>
  );
}

const CARDS = [
  {
    id: "score",
    visual: (h: boolean) => <ScoreRingCard hovered={h} />,
    title: "WebDoc Score",
    body: "A single 0–100 index of conversion architecture health. Scored across six weighted revenue dimensions. Rescan after resolutions to measure movement.",
    tag: "0–100 DIAGNOSTIC SCORE",
    hoverShadow: "var(--cyan-glow-soft), 0 20px 40px rgba(0,0,0,0.4), 0 0 60px rgba(0,200,255,0.15)",
  },
  {
    id: "leaks",
    visual: (h: boolean) => <MiniFindingVisual hovered={h} />,
    title: "Up to 14 Diagnostic Findings",
    body: "Each finding contains evidence from your actual site, behavioral mechanism analysis, revenue impact modeling, origin analysis, benchmark comparison, and compounding risk assessment.",
    tag: "RANKED BY REVENUE IMPACT",
    hoverShadow: "var(--cyan-glow-soft), 0 20px 40px rgba(0,0,0,0.4), 0 0 50px rgba(255,45,45,0.1)",
  },
  {
    id: "tiers",
    visual: () => <ThreeTierVisual />,
    title: "Three-Tier Resolution Protocol",
    body: "Every finding includes an Immediate resolution executable today, a Proper long-term implementation, and an Advanced approach used by high-converting sites at scale.",
    tag: "IMMEDIATE · PROPER · ADVANCED",
    hoverShadow: "var(--cyan-glow-soft), 0 20px 40px rgba(0,0,0,0.4), 0 0 60px rgba(0,200,255,0.15)",
  },
  {
    id: "advisor",
    visual: () => <AdvisorMiniVisual />,
    title: "AI Resolution Advisor",
    body: "Conversational diagnostic access per finding. Ask about implementation, your specific platform, or how findings interact. Full scan context retained.",
    tag: "AI-POWERED",
    hoverShadow: "var(--cyan-glow-soft), 0 20px 40px rgba(0,0,0,0.4), 0 0 60px rgba(0,200,255,0.15)",
  },
  {
    id: "blueprint",
    visual: () => <GrowthBlueprintVisual />,
    title: "Growth Blueprint",
    body: "Every diagnostic generates a prioritized resolution roadmap — what to resolve this week, what to address this month, and what high-converting sites implement at scale.",
    tag: "WEEK 1 · WEEKS 2–4 · MONTH 2+",
    hoverShadow: "var(--cyan-glow-soft), 0 20px 40px rgba(0,0,0,0.4), 0 0 60px rgba(255,179,0,0.1)",
  },
  {
    id: "track",
    visual: () => <SparklineVisual />,
    title: "Track Score Trajectory",
    body: "Every scan persists in your dashboard. Rescan after resolutions and measure WebDoc Score movement over time. Pro includes unlimited rescans and full AI advisor access on every report.",
    tag: "UNLIMITED RESCANS ON PRO",
    hoverShadow: "var(--cyan-glow-soft), 0 20px 40px rgba(0,0,0,0.4), 0 0 55px rgba(0,255,135,0.1)",
  },
];

export default function LandingWhatYouReceive() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="relative overflow-hidden px-6 py-[120px]" style={{ background: "#050810" }}>
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-0 h-[400px] w-[800px] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse, rgba(0,200,255,0.039) 0%, transparent 68%)",
          filter: "blur(64px)",
        }}
        aria-hidden
      />
      <div className="relative z-[1] mx-auto max-w-[960px] text-center">
        <ScrollReveal variant="headline">
          <p className="font-mono text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "3px" }}>
            DIAGNOSTIC DELIVERABLES
          </p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.06}>
          <h2 className="mt-3 font-sans text-[52px] font-bold leading-tight" style={{ color: "var(--text-primary)", letterSpacing: "-1.5px" }}>
            Diagnostic findings across your site.
            <br />
            Resolutions ranked by revenue impact.
          </h2>
        </ScrollReveal>
      </div>

      <div className="relative z-[1] mx-auto mt-14 grid max-w-[960px] grid-cols-1 gap-5 md:grid-cols-2">
        {CARDS.map((card, i) => {
          const h = hoveredCard === card.id;
          return (
            <ScrollReveal key={card.id} variant="card" index={i}>
              <div
                className="landing-card-electric group/recv relative rounded-[10px] border p-8"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-default)",
                }}
                onMouseEnter={(e) => {
                  setHoveredCard(card.id);
                  e.currentTarget.style.boxShadow = card.hoverShadow;
                }}
                onMouseLeave={(e) => {
                  setHoveredCard(null);
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <CardBracket hovered={h} />
                {card.visual(h)}
                <h3 className="font-sans text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {card.title}
                </h3>
                <p className="mt-3 font-sans text-[14px] font-normal leading-[1.7]" style={{ color: "var(--text-secondary)" }}>
                  {card.body}
                </p>
                <span
                  className="mt-4 inline-block rounded border px-2.5 py-1 font-mono text-[10px]"
                  style={{
                    color: "var(--cyan)",
                    background: "rgba(0,200,255,0.08)",
                    borderColor: "rgba(0,200,255,0.15)",
                  }}
                >
                  {card.tag}
                </span>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
