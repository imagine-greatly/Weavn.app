"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

/**
 * Live Demo Report section — second section on landing.
 * Refer to DESIGN_SYSTEM.md for glow levels, animations, colors, typography.
 */

const CATEGORIES = [
  { label: "REVENUE", value: 49, fill: "var(--red)", glow: "0 0 6px rgba(255,45,45,0.6)" },
  { label: "MESSAGING", value: 71, fill: "var(--orange)" },
  { label: "CONVERT", value: 58, fill: "var(--orange)" },
  { label: "SEO", value: 82, fill: "var(--green)" },
  { label: "UX", value: 66, fill: "var(--orange)" },
];

function CategoryBar({
  label,
  value,
  fillColor,
  glow,
  index,
  inView,
}: {
  label: string;
  value: number;
  fillColor: string;
  glow?: string;
  index: number;
  inView: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <span
        className="w-[72px] shrink-0 text-right font-mono text-[10px]"
        style={{ color: "var(--text-muted)", letterSpacing: "3px" }}
      >
        {label}
      </span>
      <div
        className="h-[3px] flex-1 overflow-hidden rounded-[2px]"
        style={{ background: "var(--border-default)" }}
      >
        <motion.div
          className="h-full rounded-[2px]"
          style={{
            background: fillColor,
            boxShadow: glow || "none",
          }}
          initial={{ width: 0 }}
          animate={{ width: inView ? `${value}%` : 0 }}
          transition={{ duration: 0.8, delay: index * 0.06, ease: "easeOut" }}
        />
      </div>
      <span
        className="font-data w-7 shrink-0 text-right text-[10px]"
        style={{ color: "var(--text-muted)" }}
      >
        {value}
      </span>
    </div>
  );
}

export default function LiveDemoReport() {
  const sectionRef = useRef<HTMLElement>(null);
  const barsInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      id="live-example"
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-[120px]"
      style={{ boxShadow: "0 -40px 80px rgba(0,0,0,0.4)" }}
    >
      <div className="mx-auto max-w-[1000px]">
        {/* Section header */}
        <div className="text-center">
          <p
            className="section-label"
          >
            EXAMPLE DIAGNOSTIC OUTPUT
          </p>
          <ScrollReveal variant="headline">
            <h2
              className="section-headline mt-3 text-[52px] leading-tight"
              style={{ maxWidth: 600, marginInline: "auto" }}
            >
              This is what your report looks like.
            </h2>
          </ScrollReveal>
        </div>

        {/* Demo window card */}
        <ScrollReveal variant="card">
        <div
          className="relative mt-14 overflow-hidden rounded-xl border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-default)",
            boxShadow: "inset 0 1px 0 rgba(0,200,255,0.12), 0 40px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Top rim light */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ boxShadow: "inset 0 1px 0 rgba(0,200,255,0.12)" }}
          />

          {/* Window chrome bar */}
          <div
            className="flex h-11 items-center justify-between border-b px-4"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-default)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF2D2D" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF9500" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
              <span className="w-3.5" />
              <span
                className="font-ui-label text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                yourwebsite.com
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-ui-label" style={{ color: "var(--text-muted)" }}>
              <span className="live-pulse text-[8px]" style={{ color: "#00FF87" }}>●</span>
              SCAN COMPLETE
            </div>
          </div>

          {/* Card body — two columns */}
          <div
            className="grid gap-0 md:grid-cols-[280px_1fr]"
          >
            {/* Left — Score panel */}
            <div
              className="flex flex-col items-center gap-2 border-b px-6 py-8 md:border-b-0 md:border-r"
              style={{ borderColor: "var(--border-default)" }}
            >
              <p
                className="font-ui-label"
                style={{ color: "var(--text-muted)", fontSize: "10px" }}
              >
                REVENUE SCORE
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-score text-[80px] leading-none"
                  style={{ color: "var(--orange)" }}
                >
                  62
                </span>
                <span
                  className="font-score text-base"
                  style={{ color: "var(--text-muted)" }}
                >
                  / 100
                </span>
              </div>
              <span
                className="font-ui-label"
                style={{
                  color: "var(--orange)",
                  background: "rgba(255,149,0,0.08)",
                  border: "1px solid rgba(255,149,0,0.2)",
                  padding: "4px 12px",
                  borderRadius: 3,
                  fontSize: "10px",
                }}
              >
                NEEDS ATTENTION
              </span>
              <div
                className="my-5 w-full"
                style={{ height: 1, background: "var(--border-default)" }}
              />
              <div className="flex w-full flex-col gap-2">
                {CATEGORIES.map((cat, i) => (
                  <CategoryBar
                    key={cat.label}
                    label={cat.label}
                    value={cat.value}
                    fillColor={cat.fill}
                    glow={cat.glow}
                    index={i}
                    inView={barsInView}
                  />
                ))}
              </div>
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                <span className="rounded border px-2 py-1 text-center font-mono text-[10px]" style={{ borderColor: "rgba(255,45,45,0.25)", color: "var(--red)", background: "rgba(255,45,45,0.08)" }}>
                  3 CRITICAL
                </span>
                <span className="rounded border px-2 py-1 text-center font-mono text-[10px]" style={{ borderColor: "rgba(255,149,0,0.25)", color: "var(--orange)", background: "rgba(255,149,0,0.08)" }}>
                  8 WARNING
                </span>
              </div>
            </div>

            {/* Right — Finding cards */}
            <div className="flex flex-col gap-2.5 p-6">
              {/* Card 1 — CRITICAL REVENUE IMPACT */}
              <div
                className="crack-critical rounded-r-lg border border-l-2 border-y border-r p-[18px] pl-5 transition-shadow duration-200"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-default)",
                  borderLeftColor: "var(--red)",
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-ui-label"
                    style={{
                      color: "var(--red)",
                      background: "rgba(255,45,45,0.08)",
                      border: "1px solid rgba(255,45,45,0.2)",
                      padding: "3px 10px",
                      borderRadius: 3,
                      fontSize: "10px",
                    }}
                  >
                    ⬤ CRITICAL
                  </span>
                  <span
                    className="font-ui-label"
                    style={{
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-default)",
                      padding: "3px 10px",
                      borderRadius: 3,
                      fontSize: "10px",
                    }}
                  >
                    REVENUE IMPACT
                  </span>
                </div>
                <h3
                  className="mt-2.5 font-finding-title"
                  style={{ color: "var(--text-primary)" }}
                >
                  Hero headline fails the 8-second test
                </h3>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--text-muted)", letterSpacing: "1.2px" }}>EVIDENCE</p>
                <p className="mt-1 font-sans text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Your headline reads &quot;We help businesses grow with software solutions&quot; - this is feature-description messaging. It talks about you, not the visitor&apos;s problem.
                </p>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--text-muted)", letterSpacing: "1.2px" }}>WHY IT MATTERS</p>
                <p className="mt-1 font-sans text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Visitors scan for pain recognition in the first line. When they don&apos;t see their problem reflected, 73% bounce within 8 seconds (CXL Institute). This is the single highest-impact issue on your site.
                </p>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--text-muted)", letterSpacing: "1.2px" }}>HOW TO FIX IT</p>
                <p className="mt-1 font-sans text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Lead with the outcome your best customer wants most. Speak to their pain before you mention your solution.
                </p>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--cyan)", letterSpacing: "1.2px" }}>COPY-READY FIX</p>
                <p className="mt-1 font-sans text-[13px]" style={{ color: "var(--text-primary)" }}>
                  Stop losing customers in the first sentence.
                </p>
              </div>

              {/* Card 2 — WARNING CONVERSION */}
              <div
                className="crack-warning rounded-r-lg border border-l-2 border-y border-r p-[18px] pl-5 transition-shadow duration-200"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-default)",
                  borderLeftColor: "var(--orange)",
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-ui-label"
                    style={{
                      color: "var(--orange)",
                      background: "rgba(255,149,0,0.08)",
                      border: "1px solid rgba(255,149,0,0.2)",
                      padding: "3px 10px",
                      borderRadius: 3,
                      fontSize: "10px",
                    }}
                  >
                    ⬤ WARNING
                  </span>
                  <span
                    className="font-ui-label"
                    style={{
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-default)",
                      padding: "3px 10px",
                      borderRadius: 3,
                      fontSize: "10px",
                    }}
                  >
                    CONVERSION
                  </span>
                </div>
                <h3
                  className="mt-2.5 font-finding-title"
                  style={{ color: "var(--text-primary)" }}
                >
                  CTA asks for commitment before earning trust
                </h3>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--text-muted)", letterSpacing: "1.2px" }}>EVIDENCE</p>
                <p className="mt-1 font-sans text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  &quot;Get Started&quot; appears before any social proof, benefits, or risk reversal. Visitors haven&apos;t been given a reason to act yet.
                </p>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--text-muted)", letterSpacing: "1.2px" }}>REVENUE IMPACT</p>
                <p className="mt-1 font-sans text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Cialdini&apos;s commitment principle: people only commit when they feel safe. A CTA before trust is built triggers resistance, not action. Conversion rates drop 40-60% when CTAs appear before proof.
                </p>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--text-muted)", letterSpacing: "1.2px" }}>RESOLUTION</p>
                <p className="mt-1 font-sans text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Move the primary CTA below at least one trust signal. Add &quot;No commitment required&quot; microcopy directly under the button.
                </p>
                <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--cyan)", letterSpacing: "1.2px" }}>COPY-READY FIX</p>
                <p className="mt-1 font-sans text-[13px]" style={{ color: "var(--text-primary)" }}>
                  See where you&apos;re losing people →
                  <br />
                  No credit card · Cancel anytime
                </p>
              </div>

              {/* Card 3 — Blurred + overlay */}
              <div className="relative overflow-hidden rounded-lg">
                <div
                  className="border border-l-2 p-[18px] pl-5"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--border-default)",
                    borderLeftColor: "var(--border-default)",
                    filter: "blur(5px) brightness(0.5)",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <div className="flex gap-2">
                    <span className="font-ui-label" style={{ fontSize: "10px" }}>⬤ IMPROVE</span>
                    <span className="font-ui-label" style={{ fontSize: "10px" }}>MESSAGING</span>
                  </div>
                  <h3 className="mt-2.5 font-finding-title">Placeholder finding</h3>
                  <p className="mt-2 font-body">Blurred content.</p>
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  style={{ background: "rgba(5,8,16,0.4)" }}
                >
                  <p
                    className="font-ui-label"
                    style={{ color: "var(--text-muted)" }}
                  >
                    +21 MORE FINDINGS
                  </p>
                  <Link
                    href="/"
                    className="font-button inline-flex items-center gap-1.5 rounded border px-5 py-3.5 text-xs transition-[border-color,box-shadow,background-color] duration-150 hover:duration-150"
                    style={{
                      background: "transparent",
                      borderColor: "rgba(0,200,255,0.4)",
                      color: "var(--cyan)",
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
                      e.currentTarget.style.transitionDuration = "300ms";
                    }}
                  >
                    UNLOCK FULL REPORT →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
