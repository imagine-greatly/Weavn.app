"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

function Divider() {
  return <div style={{ height: 1, background: "#1A2035", margin: "24px 0" }} />;
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px]" style={{ color: "#00C8FF", letterSpacing: "0.1em" }}>
      {children}
    </p>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px]" style={{ color: "#8899AA", letterSpacing: "0.1em" }}>
      {children}
    </p>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[15px] mt-2" style={{ color: "#E8E8E8", lineHeight: 1.75 }}>
      {children}
    </p>
  );
}

const TIERS = [
  {
    label: "Immediate",
    sub: "Executable today. No developer required.",
    color: "#00C8FF",
    body: "Move your primary CTA to within the first screen height on mobile. In most CMS platforms this is a drag-and-drop change in the hero section editor.",
    time: "Est. time: 30–60 minutes",
    titleColor: "#00C8FF" as const,
  },
  {
    label: "Proper",
    sub: "Correct long-term implementation.",
    color: "#8899AA",
    body: "Restructure hero section to lead with primary CTA above the fold on all viewports. Test at 320px, 375px, and 414px. CTA visible without scroll.",
    time: "Est. time: 2–4 hours",
    titleColor: "white" as const,
  },
  {
    label: "Advanced",
    sub: "What high-converting sites implement.",
    color: "#1A2035",
    body: "Implement sticky CTA that follows the user on scroll. A/B test above-fold copy variants. High-converting sites show CTA within 400px of page top.",
    time: "Est. time: 1–2 weeks",
    titleColor: "#8899AA" as const,
  },
];

export default function LandingFullFinding() {
  return (
    <section className="px-6" style={{ background: "#050810", paddingTop: 120, paddingBottom: 60 }}>
      {/* Header */}
      <div className="mx-auto max-w-[600px] text-center mb-12">
        <ScrollReveal variant="headline">
          <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "3px" }}>
            DIAGNOSTIC FINDING DEPTH
          </p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.06}>
          <h2
            className="mt-3 font-sans font-bold"
            style={{ fontSize: 52, lineHeight: 1.1, color: "var(--text-primary)", letterSpacing: "-1.5px" }}
          >
            Every finding.
            <br />
            Full clinical depth.
          </h2>
        </ScrollReveal>
        <ScrollReveal variant="sub" delay={0.12}>
          <p
            className="mx-auto mt-3 font-mono text-[14px]"
            style={{ color: "#8899AA", lineHeight: 1.7, maxWidth: 480 }}
          >
            Not a checklist. A specialist&apos;s diagnostic report — with evidence, behavioral analysis, revenue modeling, and exact resolutions.
          </p>
        </ScrollReveal>
      </div>

      {/* Finding panel */}
      <ScrollReveal variant="demo">
        <div
          className="mx-auto"
          style={{
            maxWidth: 860,
            background: "#0A0F1E",
            border: "1px solid #1A2035",
            borderLeft: "3px solid #FF2D2D",
            borderRadius: 4,
            padding: 40,
          }}
        >
          {/* Section 1: Header */}
          <div className="flex flex-wrap gap-2">
            <span
              className="font-mono text-[10px]"
              style={{
                background: "#FF2D2D",
                color: "white",
                padding: "4px 10px",
                borderRadius: 2,
              }}
            >
              CRITICAL
            </span>
            <span
              className="font-mono text-[10px]"
              style={{
                border: "1px solid #1A2035",
                color: "#8899AA",
                padding: "4px 10px",
                borderRadius: 2,
              }}
            >
              cta-architecture
            </span>
          </div>
          <p className="font-mono text-[11px] mt-3" style={{ color: "#8899AA" }}>
            Finding 01 — 8 Identified
          </p>
          <h3 className="font-sans text-[22px] font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            Primary CTA absent above the fold on mobile viewports
          </h3>
          <p className="font-mono text-[14px] mt-2" style={{ color: "#FF2D2D" }}>
            Revenue Suppression: Critical
          </p>

          <Divider />

          {/* Section 2: Diagnostic Summary */}
          <SectionLabel>DIAGNOSTIC SUMMARY</SectionLabel>
          <BodyText>
            Primary call-to-action first appears at 1,240px on mobile viewports — below the fold on 94% of devices. Visitors have no conversion path within the initial viewport. This is your highest-priority resolution.
          </BodyText>

          <Divider />

          {/* Section 3: Evidence */}
          <SectionLabel>EVIDENCE</SectionLabel>
          <div
            className="mt-3"
            style={{
              background: "#080D18",
              borderLeft: "3px solid #00C8FF",
              padding: 16,
              borderRadius: "0 4px 4px 0",
            }}
          >
            <p className="font-mono text-[13px] italic" style={{ color: "#8899AA", lineHeight: 1.6 }}>
              CTA button detected at Y:1240px. Mobile viewport height: 667px (iPhone SE), 844px (iPhone 14). CTA not visible on initial load across all tested mobile viewports.
            </p>
            <p className="font-mono text-[11px] mt-2" style={{ color: "#8899AA" }}>
              Observed at: Hero section — mobile viewport, primary conversion path
            </p>
          </div>

          <Divider />

          {/* Section 4: Diagnostic Analysis */}
          <SectionLabel>DIAGNOSTIC ANALYSIS</SectionLabel>
          <div className="mt-4">
            <MicroLabel>BEHAVIORAL MECHANISM</MicroLabel>
            <BodyText>
              Visitors arriving on mobile complete a rapid orientation scan within the first viewport. When no action surface is present, the brain registers the page as information-only and deprioritizes engagement. The decision to convert — or not — is made before the CTA renders.
            </BodyText>
          </div>
          <div className="mt-6">
            <MicroLabel>REVENUE CONSEQUENCE</MicroLabel>
            <BodyText>
              Mobile visitors account for 60–70% of web traffic across most business categories. A missing above-fold CTA represents a structural conversion failure affecting the majority of your traffic — not an edge case.
            </BodyText>
          </div>

          <Divider />

          {/* Section 5: Revenue Impact */}
          <SectionLabel>REVENUE IMPACT ANALYSIS</SectionLabel>
          <p className="font-logo text-[18px] mt-3" style={{ color: "#FF2D2D" }}>
            CRITICAL SUPPRESSION
          </p>
          <BodyText>
            Assuming 5,000 monthly mobile visitors with a 2% baseline conversion rate, positioning the CTA above the fold could recover an estimated 60–120 additional conversions per month.
          </BodyText>
          <p className="font-mono text-[12px] mt-3" style={{ color: "#8899AA" }}>
            Every month this finding remains unresolved, qualified visitors exit before reaching any conversion surface.
          </p>

          <Divider />

          {/* Section 6: Resolution Protocol */}
          <SectionLabel>RESOLUTION PROTOCOL</SectionLabel>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            {TIERS.map((tier) => (
              <div
                key={tier.label}
                style={{
                  flex: 1,
                  background: "#080D18",
                  border: "1px solid #1A2035",
                  borderLeft: `3px solid ${tier.color}`,
                  padding: 20,
                  borderRadius: "0 4px 4px 0",
                }}
              >
                <p className="font-sans text-[15px] font-semibold" style={{ color: tier.titleColor }}>
                  {tier.label}
                </p>
                <p className="font-mono text-[11px] mt-1" style={{ color: "#8899AA" }}>
                  {tier.sub}
                </p>
                <p className="font-mono text-[13px] mt-3" style={{ color: "#8899AA", lineHeight: 1.6 }}>
                  {tier.body}
                </p>
                <p className="font-mono text-[11px] mt-3" style={{ color: "#8899AA", opacity: 0.7 }}>
                  {tier.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Below panel CTA */}
      <ScrollReveal variant="headline" delay={0.1}>
        <div className="mx-auto mt-4 text-center" style={{ maxWidth: 860, marginBottom: 0 }}>
          <p className="font-mono text-[13px]" style={{ color: "#8899AA" }}>
            See every finding on your site.
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-block mt-2 font-mono text-[12px] uppercase transition-[background,border-color] duration-150"
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
            Run Diagnostic →
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
