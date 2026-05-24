"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

const WEEK1_ITEMS = [
  {
    severity: "CRITICAL",
    severityColor: "#FF2D2D",
    borderColor: "#FF2D2D",
    text: "Primary CTA absent above fold on mobile viewports",
  },
  {
    severity: "CRITICAL",
    severityColor: "#FF2D2D",
    borderColor: "#FF2D2D",
    text: "Hero headline fails first-viewport orientation",
  },
];

const WEEKS24_ITEMS = [
  {
    severity: "HIGH",
    severityColor: "#FFB300",
    borderColor: "#FFB300",
    text: "Trust signal density below conversion threshold",
  },
  {
    severity: "HIGH",
    severityColor: "#FFB300",
    borderColor: "#FFB300",
    text: "Social proof absent from above-fold section",
  },
];

const MONTH2_ITEMS = [
  {
    severity: "MEDIUM",
    severityColor: "#8899AA",
    borderColor: "#8899AA",
    text: "Advanced CTA architecture and conversion personalization",
  },
];

function FindingItem({
  severity,
  severityColor,
  borderColor,
  text,
}: {
  severity: string;
  severityColor: string;
  borderColor: string;
  text: string;
}) {
  return (
    <div
      style={{
        background: "#080D18",
        border: "1px solid #1A2035",
        borderLeft: `2px solid ${borderColor}`,
        padding: "12px 14px",
        borderRadius: "0 4px 4px 0",
      }}
    >
      <p className="font-mono text-[9px]" style={{ color: severityColor }}>
        {severity}
      </p>
      <p className="font-mono text-[12px] mt-1" style={{ color: "white" }}>
        {text}
      </p>
    </div>
  );
}

function ActionItem({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#080D18",
        border: "1px solid #1A2035",
        padding: "12px 14px",
        borderRadius: 4,
      }}
    >
      <p className="font-mono text-[11px] italic" style={{ color: "#8899AA" }}>
        {text}
      </p>
    </div>
  );
}

export default function LandingGrowthBlueprint() {
  return (
    <section className="px-6" style={{ background: "#050810", paddingTop: 120, paddingBottom: 120 }}>
      {/* Header */}
      <div className="mx-auto max-w-[600px] text-center mb-12">
        <ScrollReveal variant="headline">
          <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "3px" }}>
            GROWTH BLUEPRINT
          </p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.06}>
          <h2
            className="mt-3 font-sans font-bold"
            style={{ fontSize: 52, lineHeight: 1.1, color: "var(--text-primary)", letterSpacing: "-1.5px" }}
          >
            Not just findings.
            <br />
            A prioritized resolution roadmap.
          </h2>
        </ScrollReveal>
        <ScrollReveal variant="sub" delay={0.12}>
          <p
            className="mx-auto mt-3 font-mono text-[14px]"
            style={{ color: "#8899AA", lineHeight: 1.7, maxWidth: 520 }}
          >
            Every WebDoc diagnostic generates a sequenced execution plan — what to resolve this week, what to address this month, and what high-converting sites implement at scale. Sequenced by revenue impact.
          </p>
        </ScrollReveal>
      </div>

      {/* Blueprint panel */}
      <ScrollReveal variant="demo">
        <div
          className="mx-auto"
          style={{
            maxWidth: 860,
            background: "#0A0F1E",
            border: "1px solid #1A2035",
            borderRadius: 4,
            padding: 40,
          }}
        >
          {/* Three columns */}
          <div className="flex flex-col gap-8 md:flex-row md:gap-6">
            {/* Column 1: Week 1 */}
            <div style={{ flex: 1 }}>
              <p className="font-mono text-[11px]" style={{ color: "#00C8FF" }}>WEEK 1</p>
              <div style={{ height: 3, background: "#1A2035", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", background: "#00C8FF", borderRadius: 2 }} />
              </div>
              <div className="flex flex-col gap-2 mt-4">
                {WEEK1_ITEMS.map((item, i) => (
                  <FindingItem key={i} {...item} />
                ))}
                <ActionItem text="Rescan and measure improvement" />
              </div>
            </div>

            {/* Column 2: Weeks 2-4 */}
            <div style={{ flex: 1 }}>
              <p className="font-mono text-[11px]" style={{ color: "#8899AA" }}>WEEKS 2–4</p>
              <div style={{ height: 3, background: "#1A2035", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "60%", background: "#FFB300", borderRadius: 2 }} />
              </div>
              <div className="flex flex-col gap-2 mt-4">
                {WEEKS24_ITEMS.map((item, i) => (
                  <FindingItem key={i} {...item} />
                ))}
              </div>
            </div>

            {/* Column 3: Month 2+ */}
            <div style={{ flex: 1 }}>
              <p className="font-mono text-[11px]" style={{ color: "#8899AA" }}>MONTH 2+</p>
              <div style={{ height: 3, background: "#1A2035", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "30%", background: "#8899AA", borderRadius: 2 }} />
              </div>
              <div className="flex flex-col gap-2 mt-4">
                {MONTH2_ITEMS.map((item, i) => (
                  <FindingItem key={i} {...item} />
                ))}
              </div>
            </div>
          </div>

          {/* Projected lift banner */}
          <div
            style={{
              marginTop: 24,
              background: "#080D18",
              border: "1px solid rgba(0,230,118,0.12)",
              borderLeft: "3px solid #00E676",
              padding: "16px 20px",
              borderRadius: "0 4px 4px 0",
            }}
          >
            <p className="font-mono text-[10px]" style={{ color: "#00E676", letterSpacing: "0.1em" }}>
              PROJECTED CONVERSION LIFT
            </p>
            <p className="font-sans text-[15px] mt-2" style={{ color: "white" }}>
              Resolving Week 1 findings is projected to improve conversion rate by 15–35% based on category benchmarks.
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* Below panel CTA */}
      <ScrollReveal variant="headline" delay={0.1}>
        <div className="mx-auto mt-6 text-center" style={{ maxWidth: 860 }}>
          <p className="font-mono text-[12px]" style={{ color: "#8899AA" }}>
            Generated automatically from every WebDoc diagnostic.
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-block mt-4 font-mono text-[12px] uppercase transition-[background,border-color] duration-150"
            style={{
              color: "#00C8FF",
              background: "transparent",
              border: "1px solid rgba(0,200,255,0.4)",
              padding: "10px 24px",
              borderRadius: 4,
              letterSpacing: "0.05em",
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
            Run Your Diagnostic →
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
