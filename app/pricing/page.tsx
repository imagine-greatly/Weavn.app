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

const JM = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";

const DIVIDER = <div style={{ height: 1, background: "rgba(0,200,255,0.15)", width: "100%" }} />;

export default function PricingPage() {
  return (
    <>
      <style>{`
        @keyframes pricing-scan-beam {
          0% { left: -60%; }
          100% { left: 110%; }
        }
      `}</style>
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,200,255,0.02) 0px, rgba(0,200,255,0.02) 1px, transparent 1px, transparent 2px)",
        }}
      >
        <PricingHero />
        {DIVIDER}
        <PricingTickerTransition />
        {DIVIDER}
        <PricingCards />
        {DIVIDER}
        <PricingBarsTransition />
        {DIVIDER}
        <ValueJustification />
        {DIVIDER}
        <PricingDottedBridgeTransition />
        {DIVIDER}
        <PricingFAQ />
        <PricingHaloTransition />
      </div>
    </>
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
          style={{ color: "#00C8FF", letterSpacing: "4px" }}
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

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            width: "100%",
            height: 1,
            marginTop: 24,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "-60%",
              width: "60%",
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent)",
              animation: "pricing-scan-beam 4s linear infinite",
            }}
          />
        </div>

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

const AGENCY_FEATURES = [
  { text: "Up to 10 active site diagnostics", comingSoon: false },
  { text: "All findings — full finding set with quoted evidence", comingSoon: false },
  { text: "Deep analysis engine — enhanced diagnostic depth", comingSoon: false },
  { text: "Priority scanning", comingSoon: false },
  { text: "API access", comingSoon: true },
  { text: "White label reports", comingSoon: true },
];

function FeatureItem({ text, available = true }: { text: string; available?: boolean }) {
  return (
    <li
      style={{
        borderLeft: available
          ? "2px solid rgba(0,200,255,0.5)"
          : "2px solid rgba(255,255,255,0.1)",
        paddingLeft: 8,
        fontFamily: JM,
        fontSize: 11,
        letterSpacing: "1px",
        color: available ? "var(--text-secondary)" : "var(--text-muted)",
        opacity: available ? 1 : 0.45,
        lineHeight: 1.55,
      }}
    >
      {text}
    </li>
  );
}

function AgencyFeatureItem({ text, comingSoon }: { text: string; comingSoon: boolean }) {
  return (
    <li
      style={{
        borderLeft: "2px solid rgba(0,200,255,0.5)",
        paddingLeft: 8,
        fontFamily: JM,
        fontSize: 11,
        letterSpacing: "1px",
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        display: "flex",
        alignItems: "baseline",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      {text}
      {comingSoon ? (
        <span
          style={{
            fontFamily: JM,
            fontSize: 9,
            color: "var(--text-muted)",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          coming soon
        </span>
      ) : null}
    </li>
  );
}

function PricingCards() {
  return (
    <section className="relative w-full py-[100px] px-6">
      <div className="mx-auto grid min-w-0 max-w-[1200px] gap-6 md:grid-cols-3">
        {/* FREE card */}
        <ScrollReveal variant="slide-left" className="min-w-0">
          <div
            className="flex h-full min-w-0 flex-col p-10"
            style={{
              background: "rgba(0,200,255,0.02)",
              border: "1px solid rgba(0,200,255,0.15)",
              borderRadius: 2,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(0,200,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.15)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <p
              style={{
                fontFamily: JM,
                fontSize: 10,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "rgba(0,200,255,0.6)",
              }}
            >
              FREE DIAGNOSTIC
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 56,
                lineHeight: 1,
                fontWeight: 700,
                color: "rgba(0,200,255,0.45)",
                marginTop: 8,
              }}
            >
              0
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 11,
                letterSpacing: "0.5px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
                marginTop: 8,
              }}
            >
              Three diagnostic findings per scan. Single-site diagnostic. No card on first run.
            </p>
            <div className="my-6 h-px w-full" style={{ background: "rgba(0,200,255,0.1)" }} />
            <ul className="flex-1 space-y-3">
              {FREE_FEATURES.map((f) => (
                <FeatureItem key={f.text} text={f.text} available={f.check} />
              ))}
            </ul>
            <Link
              href="/"
              className="mt-8 flex w-full items-center justify-center border py-4"
              style={{
                borderColor: "rgba(0,200,255,0.4)",
                color: "#00C8FF",
                background: "transparent",
                minHeight: 44,
                borderRadius: 2,
                letterSpacing: "2px",
                fontFamily: JM,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#00C8FF";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0,200,255,0.25)";
                e.currentTarget.style.background = "rgba(0,200,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = "transparent";
              }}
            >
              BEGIN FREE DIAGNOSTIC
            </Link>
          </div>
        </ScrollReveal>

        {/* PRO card */}
        <ScrollReveal variant="slide-right" className="min-w-0 overflow-visible">
          <div
            className="relative flex h-full min-w-0 flex-col overflow-visible p-10"
            style={{
              background: "rgba(0,200,255,0.02)",
              border: "1px solid rgba(0,200,255,0.3)",
              boxShadow: "var(--cyan-glow-soft)",
              borderRadius: 2,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(0,200,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
              e.currentTarget.style.boxShadow = "var(--cyan-glow-soft)";
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translate(-50%, -50%)",
                background: "var(--cyan)",
                color: "#050810",
                fontFamily: JM,
                fontSize: 10,
                letterSpacing: "2px",
                textTransform: "uppercase",
                padding: "2px 12px",
                borderRadius: 2,
                whiteSpace: "nowrap",
              }}
            >
              FULL DIAGNOSTIC
            </div>
            <p
              style={{
                fontFamily: JM,
                fontSize: 10,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "rgba(0,200,255,0.6)",
              }}
            >
              PRO DIAGNOSTIC
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 56,
                lineHeight: 1,
                fontWeight: 700,
                color: "#00C8FF",
                marginTop: 8,
              }}
            >
              50
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 11,
                letterSpacing: "1px",
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              /mo · cancel anytime
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 11,
                letterSpacing: "0.5px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
                marginTop: 8,
              }}
            >
              Full diagnostic access. Up to five active site scans. Complete finding set with revenue impact ranking and exact resolutions.
            </p>
            <div className="my-6 h-px w-full" style={{ background: "rgba(0,200,255,0.1)" }} />
            <ul className="flex-1 space-y-3">
              {PRO_FEATURES.map((text) => (
                <FeatureItem key={text} text={text} available={true} />
              ))}
            </ul>
            <div className="mt-8 w-full min-w-0 overflow-visible">
              <a
                href="/api/stripe/checkout"
                onClick={(e) => {
                  e.preventDefault();
                  fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "pro" }),
                  })
                    .then((r) => r.json())
                    .then((d: { url?: string }) => { if (d.url) window.location.href = d.url; })
                    .catch(() => { window.location.href = "/auth?tab=signin"; });
                }}
                className="flex w-full items-center justify-center"
                style={{
                  background: "#00C8FF",
                  color: "#050810",
                  fontFamily: JM,
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  minHeight: 44,
                  borderRadius: 2,
                  border: "none",
                  letterSpacing: "2px",
                  textDecoration: "none",
                  boxSizing: "border-box",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(0,200,255,0.6)"; e.currentTarget.style.filter = "brightness(1.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.filter = "none"; }}
              >
                UPGRADE TO PRO — $50/MO →
              </a>
            </div>
            <p
              className="mt-3 text-center"
              style={{ fontFamily: JM, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.5px" }}
            >
              Cancel anytime. Access continues through the paid period end.
            </p>
          </div>
        </ScrollReveal>

        {/* AGENCY card */}
        <ScrollReveal variant="slide-right" className="min-w-0 overflow-visible">
          <div
            className="relative flex h-full min-w-0 flex-col overflow-visible p-10"
            style={{
              background: "rgba(0,200,255,0.02)",
              border: "1px solid rgba(0,230,118,0.2)",
              boxShadow: "0 0 40px rgba(0,230,118,0.04)",
              borderRadius: 2,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(0,200,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,230,118,0.2)";
              e.currentTarget.style.boxShadow = "0 0 40px rgba(0,230,118,0.04)";
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translate(-50%, -50%)",
                background: "var(--green)",
                color: "#050810",
                fontFamily: JM,
                fontSize: 10,
                letterSpacing: "2px",
                textTransform: "uppercase",
                padding: "2px 12px",
                borderRadius: 2,
                whiteSpace: "nowrap",
              }}
            >
              AGENCY
            </div>
            <p
              style={{
                fontFamily: JM,
                fontSize: 10,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "rgba(0,200,255,0.6)",
              }}
            >
              AGENCY DIAGNOSTIC
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 56,
                lineHeight: 1,
                fontWeight: 700,
                color: "var(--green)",
                marginTop: 8,
              }}
            >
              150
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 11,
                letterSpacing: "1px",
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              /mo · cancel anytime
            </p>
            <p
              style={{
                fontFamily: JM,
                fontSize: 11,
                letterSpacing: "0.5px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
                marginTop: 8,
              }}
            >
              Built for agencies managing multiple client sites. Enhanced diagnostic depth across up to 10 active sites.
            </p>
            <div className="my-6 h-px w-full" style={{ background: "rgba(0,200,255,0.1)" }} />
            <ul className="flex-1 space-y-3">
              {AGENCY_FEATURES.map((f) => (
                <AgencyFeatureItem key={f.text} text={f.text} comingSoon={f.comingSoon} />
              ))}
            </ul>
            <div className="mt-8 w-full min-w-0 overflow-visible">
              <a
                href="/api/stripe/checkout?plan=agency"
                onClick={(e) => {
                  e.preventDefault();
                  fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "agency" }),
                  })
                    .then((r) => r.json())
                    .then((d: { url?: string }) => { if (d.url) window.location.href = d.url; })
                    .catch(() => { window.location.href = "/auth?tab=signin"; });
                }}
                className="flex w-full items-center justify-center"
                style={{
                  background: "var(--green)",
                  color: "#050810",
                  fontFamily: JM,
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  minHeight: 44,
                  borderRadius: 2,
                  border: "none",
                  letterSpacing: "2px",
                  textDecoration: "none",
                  boxSizing: "border-box",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(0,255,136,0.6)"; e.currentTarget.style.filter = "brightness(1.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.filter = "none"; }}
              >
                UPGRADE TO AGENCY — $150/MO →
              </a>
            </div>
            <p
              className="mt-3 text-center"
              style={{ fontFamily: JM, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.5px" }}
            >
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
      "→",
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
      "→",
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
      "→",
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
        <div className="text-center">
          <p
            style={{
              fontFamily: JM,
              fontSize: 9,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(0,200,255,0.4)",
              marginBottom: 12,
            }}
          >
            REVENUE ANALYSIS
          </p>
          <ScrollReveal variant="headline">
            <h2
              className="mx-auto max-w-[min(52rem,calc(100vw-48px))] font-sans font-extrabold"
              style={{
                color: "var(--text-primary)",
                fontSize: "clamp(32px, 3.6vw, 48px)",
                lineHeight: 0.98,
                letterSpacing: "-1.2px",
                fontWeight: 800,
              }}
            >
              <span style={{ color: "#00C8FF" }}>●</span>{" "}
              Revenue suppression in three traffic models<span style={{ color: "var(--cyan)" }}>.</span>
            </h2>
          </ScrollReveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {SCENARIOS.map((s, i) => (
            <ScrollReveal key={s.label} variant="card" index={i}>
              <div
                style={{
                  background: "rgba(0,200,255,0.03)",
                  border: "1px solid var(--border-default)",
                  borderTop: "1px solid rgba(0,200,255,0.4)",
                  borderRadius: 2,
                  padding: 24,
                }}
              >
                <p
                  style={{
                    fontFamily: JM,
                    fontSize: 9,
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "#00C8FF",
                  }}
                >
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
                <div className="mt-4 space-y-1.5">
                  {s.lines.map((line) => (
                    <p
                      key={line}
                      style={{
                        fontFamily: JM,
                        fontSize: line === "→" ? 18 : 11,
                        letterSpacing: "0.5px",
                        lineHeight: 1.6,
                        color: line === "→" ? "#00C8FF" : "var(--text-secondary)",
                        fontWeight: line === "→" ? 700 : 400,
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    display: "inline-block",
                    color: "var(--green)",
                    background: "rgba(0,255,135,0.08)",
                    border: "1px solid rgba(0,255,135,0.2)",
                    fontFamily: JM,
                    fontSize: 10,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    padding: "4px 12px",
                    borderRadius: 2,
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
    a: "The Agency plan is available at $150/month. It supports up to 10 active site diagnostics with enhanced diagnostic depth. API access and white label reports are coming soon.",
  },
];

function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative w-full overflow-hidden py-[100px] px-6">
      <div className="mx-auto max-w-[min(840px,calc(100vw-48px))]">
        <div className="text-center">
          <p
            style={{
              fontFamily: JM,
              fontSize: 9,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(0,200,255,0.4)",
              marginBottom: 12,
            }}
          >
            DOCUMENTATION
          </p>
          <ScrollReveal variant="headline">
            <h2
              className="mx-auto mt-3 max-w-[min(40rem,calc(100vw-48px))] font-sans font-extrabold"
              style={{
                color: "var(--text-primary)",
                fontSize: "clamp(32px, 3.4vw, 44px)",
                lineHeight: 0.98,
                letterSpacing: "-1.2px",
                fontWeight: 800,
              }}
            >
              <span style={{ color: "#00C8FF" }}>●</span>{" "}
              Billing and access<span style={{ color: "var(--cyan)" }}>.</span>
            </h2>
          </ScrollReveal>
        </div>

        <div className="mt-12 space-y-0">
          {PRICING_FAQ.map((item, i) => (
            <div
              key={i}
              className="border-b"
              style={{ borderColor: "rgba(0,200,255,0.1)" }}
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
                    className="pb-5 pl-5 pr-12"
                    style={{
                      fontFamily: JM,
                      fontSize: 13,
                      letterSpacing: "0.5px",
                      lineHeight: 1.7,
                      color: "var(--text-secondary)",
                    }}
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
