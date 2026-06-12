"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";

const STATUS_MESSAGES = [
  "Analyzing above-fold conversion architecture...",
  "Detecting CTA placement across viewport breakpoints...",
  "Scoring headline persuasion architecture...",
  "Evaluating trust signal density...",
  "Identifying conversion suppression patterns...",
];

const SECTION_LABELS = [
  { label: "NAV", top: "8%" },
  { label: "HERO", top: "22%" },
  { label: "SOCIAL PROOF", top: "38%" },
  { label: "FEATURES", top: "54%" },
  { label: "TESTIMONIALS", top: "68%" },
  { label: "CTA", top: "82%" },
  { label: "FOOTER", top: "92%" },
];

const GHOST_BLOCKS = [
  { top: "10%", left: "20%", width: "55%", height: 10 },
  { top: "14%", left: "30%", width: "38%", height: 8 },
  { top: "25%", left: "15%", width: "65%", height: 14 },
  { top: "30%", left: "25%", width: "45%", height: 8 },
  { top: "35%", left: "32%", width: "32%", height: 10 },
  { top: "41%", left: "12%", width: "30%", height: 8 },
  { top: "44%", left: "48%", width: "38%", height: 8 },
  { top: "57%", left: "18%", width: "25%", height: 12 },
  { top: "61%", left: "50%", width: "28%", height: 12 },
  { top: "65%", left: "22%", width: "52%", height: 8 },
  { top: "70%", left: "15%", width: "40%", height: 10 },
  { top: "74%", left: "58%", width: "22%", height: 8 },
  { top: "85%", left: "28%", width: "42%", height: 12 },
  { top: "89%", left: "35%", width: "28%", height: 8 },
];

function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const size = 16;
  const color = "rgba(0,200,255,0.3)";
  const styles: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    pointerEvents: "none",
    ...(pos === "tl" ? { top: 0, left: 0 } : {}),
    ...(pos === "tr" ? { top: 0, right: 0 } : {}),
    ...(pos === "bl" ? { bottom: 0, left: 0 } : {}),
    ...(pos === "br" ? { bottom: 0, right: 0 } : {}),
  };
  return (
    <div style={styles} aria-hidden>
      {pos === "tl" && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, width: size, height: 2, background: color }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: size, background: color }} />
        </>
      )}
      {pos === "tr" && (
        <>
          <div style={{ position: "absolute", top: 0, right: 0, width: size, height: 2, background: color }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 2, height: size, background: color }} />
        </>
      )}
      {pos === "bl" && (
        <>
          <div style={{ position: "absolute", bottom: 0, left: 0, width: size, height: 2, background: color }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 2, height: size, background: color }} />
        </>
      )}
      {pos === "br" && (
        <>
          <div style={{ position: "absolute", bottom: 0, right: 0, width: size, height: 2, background: color }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 2, height: size, background: color }} />
        </>
      )}
    </div>
  );
}

function ScanPanel() {
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const currentYRef = useRef(0.5);
  const targetYRef = useRef(0.5);
  const lastRegionRef = useRef(-1);
  const [barTop, setBarTop] = useState(50);
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    // Cycle status messages every 2.5s
    const t = window.setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let lastTargetChange = performance.now();
    let minInterval = 800;
    let maxInterval = 2200;
    let nextInterval = minInterval + Math.random() * (maxInterval - minInterval);

    function pickNewTarget(current: number): number {
      let candidate: number;
      let attempts = 0;
      do {
        candidate = 0.05 + Math.random() * 0.9;
        attempts++;
      } while (Math.abs(candidate - current) < 0.2 && attempts < 20);
      return candidate;
    }

    function tick(now: number) {
      if (now - lastTargetChange > nextInterval) {
        targetYRef.current = pickNewTarget(currentYRef.current);
        lastTargetChange = now;
        nextInterval = minInterval + Math.random() * (maxInterval - minInterval);
      }
      currentYRef.current += (targetYRef.current - currentYRef.current) * 0.07;
      setBarTop(currentYRef.current * 100);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="relative"
      style={{
        border: "1px solid #1A2035",
        borderRadius: 4,
        background: "#050810",
        height: 320,
        overflow: "hidden",
        maxWidth: 1040,
        margin: "0 auto",
      }}
    >
      <CornerBracket pos="tl" />
      <CornerBracket pos="tr" />
      <CornerBracket pos="bl" />
      <CornerBracket pos="br" />

      {/* Top bar */}
      <div
        style={{
          height: 44,
          background: "#0A0F1E",
          borderBottom: "1px solid #1A2035",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#FF5F57" }} />
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#FEBC2E" }} />
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#28C840" }} />
          <span className="font-mono text-[12px] ml-2" style={{ color: "#8899AA" }}>yourwebsite.com</span>
        </div>
        <span className="font-mono text-[11px]" style={{ color: "#00C8FF", letterSpacing: "2px" }}>
          REVENUE DIAGNOSTIC IN PROGRESS
        </span>
        <span className="font-mono text-[11px]" style={{ color: "#FF2D2D" }}>
          ABORT DIAGNOSTIC
        </span>
      </div>

      {/* Main area */}
      <div
        ref={mainAreaRef}
        style={{
          position: "absolute",
          top: 44,
          bottom: 44,
          left: 0,
          right: 0,
          overflow: "hidden",
        }}
      >
        {/* Ghost content blocks */}
        {GHOST_BLOCKS.map((b, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              top: b.top,
              left: b.left,
              width: b.width,
              height: b.height,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 2,
            }}
          />
        ))}

        {/* Section labels */}
        {SECTION_LABELS.map((s) => (
          <span
            key={s.label}
            className="font-mono text-[9px]"
            style={{
              position: "absolute",
              top: s.top,
              left: 16,
              color: "#00C8FF",
              opacity: 0.35,
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            {s.label}
          </span>
        ))}

        {/* Scan bar */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 1,
            top: `${barTop}%`,
            background: "rgba(0,200,255,0.9)",
            boxShadow: "0 0 4px 2px rgba(0,200,255,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Traveling pulse */}
          <div
            style={{
              position: "absolute",
              top: 0,
              width: 120,
              height: 1,
              background: "linear-gradient(to right, transparent 0%, rgba(0,200,255,0.6) 20%, #FFFFFF 50%, rgba(0,200,255,0.6) 80%, transparent 100%)",
              animation: "scanPulseTravel 1.5s linear infinite",
            }}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 44,
          background: "#0A0F1E",
          borderTop: "1px solid #1A2035",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        {/* Status message */}
        <div style={{ flex: 1 }}>
          <span className="font-mono text-[11px]" style={{ color: "#8899AA" }}>
            {STATUS_MESSAGES[statusIdx]}
          </span>
        </div>
        {/* Center: check count */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <p className="font-mono text-[10px]" style={{ color: "#8899AA" }}>REVENUE CHECKS</p>
          <p className="font-mono text-[18px]" style={{ color: "#00C8FF" }}>264 / 264</p>
        </div>
        {/* Right: elapsed */}
        <div style={{ flex: 1, textAlign: "right" }}>
          <p className="font-mono text-[10px]" style={{ color: "#8899AA" }}>ELAPSED</p>
          <p className="font-mono text-[18px]" style={{ color: "#00C8FF" }}>29.4s</p>
        </div>
      </div>

      <style>{`
        @keyframes scanPulseTravel {
          0% { left: 0%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

export default function LandingScanPreview() {
  return (
    <section className="px-6" style={{ background: "#070C14", marginTop: 0, paddingTop: 40, paddingBottom: 80 }}>
      {/* Header */}
      <div className="mx-auto max-w-[600px] text-center mb-12">
        <ScrollReveal variant="headline">
          <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "3px" }}>
            DIAGNOSTIC SCAN ENGINE
          </p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.06}>
          <h2
            className="mt-3 font-sans font-bold"
            style={{ fontSize: 48, lineHeight: 1.1, color: "var(--text-primary)", letterSpacing: "-1.5px" }}
          >
            60 seconds. 264 checks.
            <br />
            Surgical precision.
          </h2>
        </ScrollReveal>
        <ScrollReveal variant="sub" delay={0.12}>
          <p
            className="mx-auto mt-3 font-mono text-[14px]"
            style={{ color: "#8899AA", lineHeight: 1.7, maxWidth: 440 }}
          >
            Weavn performs a full diagnostic pass — identifying every structural and behavioral flaw suppressing conversions across your site.
          </p>
        </ScrollReveal>
      </div>

      {/* Scan panel */}
      <ScrollReveal variant="demo">
        <ScanPanel />
      </ScrollReveal>

      {/* Stats row */}
      <ScrollReveal variant="headline" delay={0.1}>
        <div
          className="mx-auto mt-8 flex flex-wrap justify-center"
          style={{ gap: 48, maxWidth: 600 }}
        >
          {[
            { num: "264", label: "DIAGNOSTIC CHECKS" },
            { num: "60s", label: "AVERAGE SCAN TIME" },
            { num: "14", label: "AVG FINDINGS PER SCAN" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-logo text-[36px]" style={{ color: "#00C8FF" }}>{s.num}</p>
              <p className="font-mono text-[10px] mt-1" style={{ color: "#8899AA" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
