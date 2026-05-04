"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PricingBarsTransition,
  PricingDottedBridgeTransition,
  PricingHaloTransition,
  PricingTickerTransition,
} from "@/components/PageTransitions";
import { ScrollReveal } from "@/components/ScrollReveal";
import UpgradeButton from "@/components/UpgradeButton";

/**
 * Pricing page — diagnostic access tiers and terms.
 * DESIGN_SYSTEM.md: typography, glow, colors.
 */

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <PricingHero />
      <PricingTickerTransition />
      <PricingCards />
      <PricingBarsTransition />
      <ValueJustification />
      <PricingDottedBridgeTransition />
      <PricingFAQ />
      <PricingHaloTransition />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function PricingHero() {
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
            background: "radial-gradient(ellipse, rgba(0,200,255,0.05) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative z-[2] flex w-full max-w-[min(960px,calc(100vw-48px))] flex-col items-center text-center">
        <p
          className="font-mono text-[11px] uppercase"
          style={{ color: "var(--text-muted)", letterSpacing: "3px" }}
        >
          PRICING
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
            One scan is free.
            <br />
            Everything after that is worth it<span style={{ color: "var(--cyan)" }}>.</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="card">
          <p
            className="mt-6 font-sans text-[18px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Run your first diagnostic. See exactly what is suppressing conversions. Cancel anytime. No contracts.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── Pricing cards ───────────────────────────────────────────────────────
const FREE_FEATURES = [
  { text: "One complimentary diagnostic scan", check: true },
  { text: "WebDoc Score and three diagnostic findings per scan", check: true },
  { text: "Complete finding set (Pro)", check: false },
  { text: "Hero diagnostic rewrite (Pro)", check: false },
  { text: "Resolution summary block (Pro)", check: false },
  { text: "Dashboard and scan history (Pro)", check: false },
  { text: "AI Resolution Advisor (Pro)", check: false },
  { text: "Up to five active site diagnostics (Pro)", check: false },
];

const PRO_FEATURES = [
  "Up to five active site diagnostics",
  "Full finding set with quoted evidence",
  "Hero diagnostic rewrite aligned to findings",
  "Written resolutions per finding, not generic tips",
  "Principle citation on every finding",
  "Priority revenue impact ranking",
  "Unlimited rescans per tracked domain and WebDoc Score tracking",
  "Full scan history",
  "Shareable public diagnostic report links",
  "Up to five pages per scan — same depth as Free",
  "Priority support",
];

function PricingCards() {
  return (
    <section className="relative w-full py-[100px] px-6">
      <div className="mx-auto grid min-w-0 max-w-[800px] gap-6 md:grid-cols-2">
        {/* FREE card */}
        <ScrollReveal variant="slide-left" className="min-w-0">
          <div
            className="flex h-full min-w-0 flex-col rounded border p-10"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
            }}
          >
            <p className="font-mono text-[11px] uppercase" style={{ color: "var(--text-muted)" }}>
              FREE
            </p>
            <p
              className="font-logo mt-2 text-[56px] leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              $0
            </p>
            <p className="mt-1 font-sans text-[14px]" style={{ color: "var(--text-muted)" }}>
              Three diagnostic findings per scan. Single-site diagnostic. No card on first run.
            </p>
            <div className="my-6 h-px w-full" style={{ background: "var(--border-default)" }} />
            <ul className="flex-1 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-2 font-sans text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  {f.check ? (
                    <span style={{ color: "var(--green)" }}>✓</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>✗</span>
                  )}
                  {f.text}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="font-button mt-8 flex w-full items-center justify-center rounded border py-4 text-sm transition-[border-color,box-shadow,background-color] duration-150"
              style={{
                borderColor: "rgba(0,200,255,0.4)",
                color: "var(--cyan)",
                background: "transparent",
                minHeight: 44,
                borderRadius: 3,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.7)";
                e.currentTarget.style.boxShadow = "var(--cyan-glow-active)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              BEGIN FREE DIAGNOSTIC
            </Link>
          </div>
        </ScrollReveal>

        {/* PRO card */}
        <ScrollReveal variant="slide-right" className="min-w-0 overflow-visible">
          <div
            className="relative flex h-full min-w-0 flex-col overflow-visible rounded border p-10"
            style={{
              background: "var(--bg-card)",
              border: "1px solid rgba(0,200,255,0.3)",
              boxShadow: "var(--cyan-glow-soft)",
              borderRadius: 4,
            }}
          >
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 font-mono text-[10px] uppercase"
              style={{ background: "var(--cyan)", color: "#050810" }}
            >
              FULL DIAGNOSTIC
            </div>
            <p className="font-mono text-[11px] uppercase" style={{ color: "var(--cyan)" }}>
              PRO
            </p>
            <p
              className="font-logo mt-2 text-[56px] leading-none"
              style={{ color: "var(--cyan)" }}
            >
              $50
            </p>
            <p className="mt-1 font-sans text-[14px]" style={{ color: "var(--text-muted)" }}>
              per month · cancel anytime
            </p>
            <p className="mt-2 font-sans text-[13px]" style={{ color: "var(--text-muted)" }}>
              Full diagnostic access. Up to five active site scans. Complete finding set with revenue impact ranking and exact resolutions.
            </p>
            <div className="my-6 h-px w-full" style={{ background: "var(--border-default)" }} />
            <ul className="flex-1 space-y-3">
              {PRO_FEATURES.map((text) => (
                <li key={text} className="flex items-start gap-2 font-sans text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--green)" }}>✓</span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-8 w-full min-w-0 overflow-visible">
              <UpgradeButton
                variant="primary"
                label="UPGRADE TO PRO DIAGNOSTIC — $50/MO →"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  paddingTop: 14,
                  paddingBottom: 14,
                  paddingLeft: 28,
                  paddingRight: 28,
                  fontSize: 13,
                  overflow: "visible",
                }}
              />
            </div>
            <p className="mt-3 text-center font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
              Cancel anytime. Access continues through the paid period end.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── Value justification (3 scenario cards) ────────────────────────────────
const SCENARIOS = [
  {
    label: "SCENARIO A",
    headline: "1,000 visitors/month at 1.2% conversion",
    lines: [
      "1,000 visitors × 1.2% = 12 customers",
      "Average order $100 = $1,200/month",
      "↓",
      "Resolving hero + CTA = 2.8% conversion",
      "1,000 × 2.8% = 28 customers",
      "$2,800/month — $1,600 more",
    ],
    result: "+$1,600/MONTH",
  },
  {
    label: "SCENARIO B",
    headline: "500 trial signups/month at 2% trial-to-paid",
    lines: [
      "500 signups × 2% = 10 paying customers",
      "Avg $80/month = $800/month",
      "↓",
      "Stronger messaging = 3.5% conversion",
      "500 × 3.5% = 17.5 customers",
      "$1,400/month — $600 more",
    ],
    result: "+$600/MONTH",
  },
  {
    label: "SCENARIO C",
    headline: "800 visitors/month, 0.5% contact rate",
    lines: [
      "800 × 0.5% = 4 leads",
      "Avg job $500 = $2,000/month",
      "↓",
      "Trust + CTA resolutions = 1.2% conversion",
      "800 × 1.2% = 9.6 leads",
      "$4,800/month — $2,800 more",
    ],
    result: "+$2,800/MONTH",
  },
];

function ValueJustification() {
  return (
    <section
      className="relative w-full overflow-hidden py-[100px] px-6"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="mx-auto max-w-[min(1100px,calc(100vw-48px))]">
        <ScrollReveal variant="headline">
          <h2
            className="mx-auto max-w-[min(52rem,calc(100vw-48px))] text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(32px, 3.6vw, 48px)",
              lineHeight: 0.98,
              letterSpacing: "-1.2px",
              fontWeight: 800,
            }}
          >
            Revenue suppression in three traffic models<span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {SCENARIOS.map((s, i) => (
            <ScrollReveal key={s.label} variant="card" index={i}>
              <div
                className="rounded border p-6"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 4,
                }}
              >
                <p className="font-mono text-[11px] uppercase" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
                <h3
                  className="mt-2 max-w-[min(22rem,100%)] font-sans font-extrabold"
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "clamp(17px, 1.6vw, 20px)",
                    lineHeight: 0.98,
                    letterSpacing: "-0.5px",
                    fontWeight: 800,
                  }}
                >
                  {s.headline}
                </h3>
                <div className="mt-4 space-y-1.5 font-sans text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {s.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <div
                  className="mt-4 inline-block rounded-full px-3 py-1.5 font-mono text-[10px] uppercase"
                  style={{
                    color: "var(--green)",
                    background: "rgba(0,255,135,0.08)",
                    border: "1px solid rgba(0,255,135,0.2)",
                  }}
                >
                  {s.result}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <p
          className="mx-auto mt-12 max-w-[480px] text-center font-sans text-[16px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Pro is $50 per month. Full finding set, history, and ranked resolutions included.
        </p>
      </div>
    </section>
  );
}

// ─── Pricing FAQ ──────────────────────────────────────────────────────────
const PRICING_FAQ = [
  {
    q: "Cancellation",
    a: "Cancel from account settings at any time. Paid access continues through the end of the current billing period.",
  },
  {
    q: "One scan definition",
    a: "One scan is one complete domain diagnostic: multi-page crawl, forty-seven evaluated signals, diagnostic report output. Each rescan of the same domain is a new scan. Pro includes the full finding set, history, and up to five concurrently tracked domains.",
  },
  {
    q: "Refund guarantee",
    a: "If your first Pro scan returns fewer than five diagnostic findings with written resolutions, contact support within seven days for a full refund under the published guarantee.",
  },
  {
    q: "Annual billing",
    a: "Annual plans are not live yet. Billing is monthly until announced otherwise.",
  },
  {
    q: "Agency and multi-site",
    a: "Dedicated agency tiers are planned. Contact sales for current multi-site options.",
  },
];

function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative w-full overflow-hidden py-[100px] px-6">
      <div className="mx-auto max-w-[min(840px,calc(100vw-48px))]">
        <p className="font-ui-label text-center" style={{ color: "var(--text-muted)" }}>
          PRICING FAQ
        </p>
        <ScrollReveal variant="headline">
          <h2
            className="mx-auto mt-3 max-w-[min(40rem,calc(100vw-48px))] text-center font-sans font-extrabold"
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(32px, 3.4vw, 44px)",
              lineHeight: 0.98,
              letterSpacing: "-1.2px",
              fontWeight: 800,
            }}
          >
            Billing and access<span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>

        <div className="mt-12 space-y-0">
          {PRICING_FAQ.map((item, i) => (
            <div
              key={i}
              className="border-b"
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
                style={{ gridTemplateRows: openIndex === i ? "1fr" : "0fr" }}
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

