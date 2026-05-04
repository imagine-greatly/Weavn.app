"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

const CATEGORIES: { label: string; value: number; fill: string }[] = [
  { label: "PSYCHOLOGY", value: 42, fill: "var(--red)" },
  { label: "MESSAGING", value: 58, fill: "var(--orange)" },
  { label: "CONVERSION", value: 28, fill: "var(--red)" },
  { label: "SEO", value: 71, fill: "var(--green)" },
  { label: "CONVERSION ARCHITECTURE", value: 52, fill: "var(--orange)" },
];

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function LandingLivePreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [score, setScore] = useState(0);
  const [barsOn, setBarsOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        const start = performance.now();
        const dur = 1000;
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1);
          setScore(Math.round(38 * easeOutCubic(t)));
          if (t < 1) requestAnimationFrame(tick);
          else {
            setScore(38);
            setFlash(true);
            setTimeout(() => setFlash(false), 600);
            setBarsOn(true);
          }
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="live-preview"
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-[120px]"
      style={{
        background: "#070C14",
      }}
    >
      <div className="mx-auto max-w-[1040px] text-center">
        <ScrollReveal variant="headline">
          <p className="font-mono text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "3px" }}>
            REAL DIAGNOSTIC OUTPUT
          </p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.06}>
          <h2
            className="mt-3 font-sans text-[52px] font-bold leading-tight"
            style={{ color: "var(--text-primary)", letterSpacing: "-1.5px" }}
          >
            Sample diagnostic output.
          </h2>
        </ScrollReveal>
        <ScrollReveal variant="sub">
          <p className="mx-auto mt-3 max-w-[520px] font-sans text-[17px] font-light" style={{ color: "var(--text-secondary)" }}>
            Authentic scan data from a live domain. Each finding includes evidence, suppression mechanism, diagnostic framework, and stated revenue impact.
          </p>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="demo">
        <div className="relative z-[1] mx-auto mt-14 max-w-[1040px]">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: 900,
              height: 600,
              background: "radial-gradient(ellipse, rgba(0,200,255,0.054) 0%, transparent 62%)",
              filter: "blur(40px)",
            }}
            aria-hidden
          />
          <div
            className="landing-card-electric relative z-[2] overflow-hidden rounded-[14px] border"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border-default)",
              boxShadow:
                "0 0 0 1px rgba(0,200,255,0.08), 0 40px 80px rgba(0,0,0,0.7), 0 0 120px rgba(0,200,255,0.04), inset 0 1px 0 rgba(0,200,255,0.1)",
            }}
          >
          <div
            className="flex h-11 items-center justify-between border-b px-4"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: "#FF5F57" }} />
                <span className="h-3 w-3 rounded-full" style={{ background: "#FEBC2E" }} />
                <span className="h-3 w-3 rounded-full" style={{ background: "#28C840" }} />
              </div>
              <span className="font-mono text-[12px]" style={{ color: "var(--text-muted)" }}>
                bdsmarinecontractors.com
              </span>
            </div>
            <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
              <span className="live-pulse mr-1 text-[8px]" style={{ color: "#00FF87" }}>
                ●
              </span>
              SCAN COMPLETE
            </span>
          </div>

          <div className="grid min-h-[480px] md:grid-cols-[260px_1fr]">
            <div
              className="border-b p-8 md:border-b-0 md:border-r"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
            >
              <p className="mb-5 font-mono text-[10px]" style={{ color: "var(--text-muted)", letterSpacing: "3px" }}>
                WEBDOC SCORE
              </p>
              <div
                className="font-logo text-[72px] font-bold leading-none transition-shadow duration-300"
                style={{
                  color: "var(--orange)",
                  textShadow: flash ? "0 0 40px rgba(255,149,0,0.3)" : "none",
                }}
              >
                {score}
              </div>
              <p className="mt-1 font-mono text-base" style={{ color: "var(--text-muted)" }}>
                / 100
              </p>
              <span
                className="mt-3 inline-block rounded border px-3 py-1 font-mono text-[10px]"
                style={{
                  color: "var(--orange)",
                  background: "rgba(255,149,0,0.08)",
                  borderColor: "rgba(255,149,0,0.2)",
                }}
              >
                CRITICAL
              </span>
              <div className="my-5 h-px w-full" style={{ background: "var(--border-default)" }} />
              <div className="flex flex-col gap-2.5">
                {CATEGORIES.map((c, i) => (
                  <div key={c.label} className="flex w-full items-center gap-2">
                    <span className="w-[88px] shrink-0 text-left font-mono text-[9px]" style={{ color: "var(--text-muted)", letterSpacing: "1px" }}>
                      {c.label}
                    </span>
                    <div className="h-[3px] flex-1 overflow-hidden rounded-sm" style={{ background: "var(--border-default)" }}>
                      <div
                        className="h-full rounded-sm transition-[width] ease-out"
                        style={{
                          width: barsOn ? `${c.value}%` : "0%",
                          background: c.fill,
                          transitionDuration: "700ms",
                          transitionDelay: barsOn ? `${i * 80}ms` : "0ms",
                        }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px]">
                <span style={{ color: "var(--red)" }}>■ 3 CRITICAL</span>
                <span style={{ color: "var(--orange)" }}>■ 7 HIGH</span>
                <span style={{ color: "var(--green)" }}>■ 4 LOW</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-hidden p-6">
              <div
                className="rounded-r-lg border border-l-[3px] p-5"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-default)",
                  borderLeftColor: "var(--red)",
                  borderRadius: "0 8px 8px 0",
                  boxShadow: "inset 3px 0 12px rgba(255,45,45,0.1), -1px 0 10px rgba(255,45,45,0.2)",
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded border px-2.5 py-0.5 font-mono text-[10px]"
                    style={{ color: "var(--red)", background: "rgba(255,45,45,0.08)", borderColor: "rgba(255,45,45,0.2)" }}
                  >
                    ⬤ CRITICAL
                  </span>
                  <span
                    className="rounded border px-2.5 py-0.5 font-mono text-[10px]"
                    style={{ color: "var(--text-muted)", borderColor: "var(--border-default)" }}
                  >
                    PSYCHOLOGY
                  </span>
                </div>
                <h3 className="mt-3 font-sans text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Hero headline fails eight-second orientation window
                </h3>
                <div className="mt-3 rounded-md p-3.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="font-mono text-[9px]" style={{ color: "var(--text-muted)", letterSpacing: "2px" }}>
                    EVIDENCE
                  </p>
                  <p className="mt-2 font-sans text-[13px] leading-[1.65]" style={{ color: "var(--text-secondary)" }}>
                    Your headline reads &quot;Dock &amp; Seawall Contractors.&quot; Copy encodes product category, not visitor outcome or loss the visitor is trying to prevent.
                  </p>
                </div>
                <div className="mt-3 rounded-md p-3.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="font-mono text-[9px]" style={{ color: "var(--text-muted)", letterSpacing: "2px" }}>
                    REVENUE IMPACT
                  </p>
                  <p className="mt-2 font-sans text-[13px] leading-[1.65]" style={{ color: "var(--text-secondary)" }}>
                    First-viewport copy fails orientation when it omits the visitor&apos;s problem frame. CXL Institute reports a 73% exit rate within eight seconds when the opening line lacks problem recognition. Loss aversion yields twice the response strength of an equivalent gain frame.
                  </p>
                </div>
                <div
                  className="relative mt-3 rounded-md border p-3.5"
                  style={{ background: "rgba(0,200,255,0.04)", borderColor: "rgba(0,200,255,0.12)" }}
                >
                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded border px-3 py-1 font-mono text-[10px]"
                    style={{ color: "var(--text-muted)", borderColor: "var(--border-default)", background: "transparent" }}
                  >
                    COPY
                  </button>
                  <p className="font-mono text-[10px]" style={{ color: "var(--cyan)", letterSpacing: "2px" }}>
                    DIAGNOSTIC FRAMEWORK
                  </p>
                  <p className="mt-2 max-w-[95%] font-sans text-[14px]" style={{ color: "var(--text-primary)" }}>
                    &quot;Protect your waterfront for generations. Expert dock &amp; seawall construction since 1982.&quot;
                  </p>
                </div>
              </div>

              <div
                className="rounded-r-lg border border-l-[3px] p-5"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-default)",
                  borderLeftColor: "var(--orange)",
                  borderRadius: "0 8px 8px 0",
                  boxShadow: "inset 3px 0 12px rgba(255,149,0,0.1), -1px 0 10px rgba(255,149,0,0.2)",
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded border px-2.5 py-0.5 font-mono text-[10px]"
                    style={{ color: "var(--orange)", background: "rgba(255,149,0,0.08)", borderColor: "rgba(255,149,0,0.2)" }}
                  >
                    ⬤ HIGH
                  </span>
                  <span
                    className="rounded border px-2.5 py-0.5 font-mono text-[10px]"
                    style={{ color: "var(--text-muted)", borderColor: "var(--border-default)" }}
                  >
                    CONVERSION
                  </span>
                </div>
                <h3 className="mt-3 font-sans text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Primary CTA absent above the fold
                </h3>
                <div className="mt-3 rounded-md p-3.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="font-mono text-[9px]" style={{ color: "var(--text-muted)", letterSpacing: "2px" }}>
                    EVIDENCE
                  </p>
                  <p className="mt-2 font-sans text-[13px] leading-[1.65]" style={{ color: "var(--text-secondary)" }}>
                    Primary CTA sits below the first viewport. Visitors terminate the session before the action surface renders.
                  </p>
                </div>
                <div
                  className="relative mt-3 rounded-md border p-3.5"
                  style={{ background: "rgba(0,200,255,0.04)", borderColor: "rgba(0,200,255,0.12)" }}
                >
                  <p className="font-mono text-[10px]" style={{ color: "var(--cyan)", letterSpacing: "2px" }}>
                    DIAGNOSTIC FRAMEWORK
                  </p>
                  <p className="mt-2 font-sans text-[14px]" style={{ color: "var(--text-primary)" }}>
                    Get a free dock assessment — book in 60 seconds →
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg">
                <div
                  className="border p-5"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--border-default)",
                    filter: "blur(6px) brightness(0.5)",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <p className="font-mono text-[10px]">⬤ HIGH · TRUST</p>
                  <p className="mt-2 font-sans text-sm">Withheld finding in preview mode.</p>
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  style={{ background: "rgba(5,8,16,0.65)" }}
                >
                  <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                    +12 ADDITIONAL FINDINGS IN FULL REPORT
                  </p>
                  <Link
                    href="/?scan=1"
                    className="font-button group/cta flex items-center text-xs transition-[background-color,border-color,box-shadow] duration-150"
                    style={{
                      color: "var(--cyan)",
                      background: "transparent",
                      border: "1px solid rgba(0,200,255,0.4)",
                      padding: "10px 20px",
                      borderRadius: 4,
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
                    RUN DIAGNOSTIC
                    <span className="ml-1 inline-block transition-transform duration-150 group-hover/cta:translate-x-[3px]">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
