"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

const DIMENSIONS = [
  {
    name: "Conversion Architecture",
    count: 35,
    checks: [
      "Hero CTA absent above the fold",
      "CTA button has low visual contrast",
      "No CTA after testimonials section",
      "No guest checkout option visible or implied",
      "Shipping cost not revealed until late in checkout",
    ],
  },
  {
    name: "Trust & Credibility",
    count: 28,
    checks: [
      "No money-back guarantee mentioned",
      "No named or attributed testimonials",
      "Claims made without evidence",
      "Trust badges absent near CTA",
      "No reviews or testimonials anywhere on page",
    ],
  },
  {
    name: "Message Clarity",
    count: 28,
    checks: [
      "Headline is benefit-absent",
      "Value proposition not clear within 5 seconds",
      "Features listed without corresponding benefits",
      "Copy is brand-centric rather than customer-centric",
      "No differentiation from competitors stated",
    ],
  },
  {
    name: "Psychology & Persuasion",
    count: 22,
    checks: [
      "Pain points not amplified before solution",
      "No unique mechanism stated",
      "Page has no logical narrative arc",
      "No authority markers present",
      "No loss aversion framing used",
    ],
  },
  {
    name: "Traffic Readiness",
    count: 20,
    checks: [
      "Page title missing or generic",
      "Meta description missing or auto-generated",
      "H1 absent or multiple H1s present",
      "No structured data signals detected",
      "No dedicated reviews or testimonials page",
    ],
  },
  {
    name: "Technical Foundation",
    count: 33,
    checks: [
      "Hero content not visible above fold on mobile",
      "Page weight suggests slow load time",
      "No clear path from landing page to purchase",
      "CTA not visible above fold on mobile",
      "Text contrast ratio insufficient",
    ],
  },
  {
    name: "Vertical & Universal Signals",
    count: 34,
    checks: [
      "SaaS-specific free trial and onboarding path",
      "Ecommerce product page conversion elements",
      "Agency and service credentialing standards",
      "Universal trust signals across all site types",
      "Conversion path expansion and re-engagement",
    ],
  },
  {
    name: "Narrative Flow",
    count: 10,
    checks: [
      "Subheadline restates headline with no progression",
      "Social proof appears before offer is explained",
      "No problem framing between headline and features",
      "CTA destination mismatches the hero promise",
      "Page sections don't build logically toward CTA",
    ],
  },
];

type Dimension = (typeof DIMENSIONS)[0];

export default function LandingDiagnosticChecks() {
  return (
    <section
      className="relative w-full overflow-hidden px-6 py-[120px]"
      style={{ background: "#050810" }}
    >

      <div className="relative mx-auto max-w-[min(1200px,calc(100vw-48px))]">
        <div className="mb-14 text-center">
          <p
            className="font-mono text-[11px] uppercase tracking-[3px]"
            style={{ color: "var(--text-muted)" }}
          >
            DIAGNOSTIC ENGINE
          </p>
          <ScrollReveal variant="headline">
            <h2
              className="mx-auto mt-3 font-sans font-extrabold"
              style={{
                color: "var(--text-primary)",
                fontSize: "clamp(36px, 4vw, 56px)",
                lineHeight: 0.95,
                letterSpacing: "-1.8px",
                fontWeight: 800,
              }}
            >
              264 diagnostic checks
              <span style={{ color: "var(--cyan)" }}>.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="card">
            <p
              className="mx-auto mt-5 max-w-[540px] font-sans text-[17px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Every scan runs all 264 checks across 27 categories. No sampling, no shortcuts.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.slice(0, 6).map((dim, i) => (
            <div key={dim.name}>
              <ScrollReveal variant="card" index={i}>
                <DimensionCard dimension={dim} />
              </ScrollReveal>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          {DIMENSIONS.slice(6).map((dim, i) => (
            <div key={dim.name}>
              <ScrollReveal variant="card" index={6 + i}>
                <DimensionCard dimension={dim} />
              </ScrollReveal>
            </div>
          ))}
        </div>

        <ScrollReveal variant="card">
          <div className="mt-12 text-center">
            <Link
              href="/dashboard"
              className="font-mono text-[12px] uppercase tracking-[2px] transition-colors duration-200 hover:text-white"
              style={{ color: "var(--cyan)" }}
            >
              SEE ALL 264 CHECKS →
            </Link>
          </div>
        </ScrollReveal>

        <div className="mt-16 max-w-[680px]">
          <p
            className="font-mono text-[11px] uppercase tracking-[3px] mb-4"
            style={{ color: "var(--cyan)" }}
          >
            FIRST IMPRESSION DIAGNOSTIC
          </p>
          <p
            className="font-sans text-[17px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Every scan begins where your visitors do. Weavn analyzes your
            above-fold experience first — hero messaging, primary CTA
            placement, and trust architecture — because that&apos;s where
            conversion decisions are made. Critical structural failures
            anywhere on the page are always surfaced. But the first three
            seconds are the verdict.
          </p>
        </div>
      </div>
    </section>
  );
}

function DimensionCard({ dimension }: { dimension: Dimension }) {
  return (
    <div
      className="relative overflow-hidden rounded-sm border p-6 transition-[border-color,box-shadow] duration-200"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
        e.currentTarget.style.boxShadow = "0 0 32px rgba(0,200,255,0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-px w-16"
        style={{
          background: "linear-gradient(90deg, rgba(0,200,255,0.4), transparent)",
        }}
      />

      <span
        className="font-mono text-[10px] uppercase tracking-[2.5px]"
        style={{ color: "var(--cyan)" }}
      >
        {dimension.count} CHECKS
      </span>

      <h3
        className="mt-2 font-sans font-extrabold"
        style={{
          color: "var(--text-primary)",
          fontSize: "clamp(15px, 1.4vw, 18px)",
          lineHeight: 1.15,
          letterSpacing: "-0.4px",
          fontWeight: 800,
        }}
      >
        {dimension.name}
      </h3>

      <ul className="mt-4 space-y-2">
        {dimension.checks.map((check) => (
          <li
            key={check}
            className="flex items-start gap-2 font-mono text-[11px] leading-snug"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="mt-0.5 shrink-0" style={{ color: "rgba(0,200,255,0.35)" }}>
              ›
            </span>
            {check}
          </li>
        ))}
      </ul>
    </div>
  );
}
