"use client";

import Link from "next/link";
import ConversionScoreGauge from "@/components/ConversionScoreGauge";
import { ReportFindingPreview } from "@/components/ReportRightPanel";
import type { FindingData } from "@/components/FindingCard";

const REPORT_MONO = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const INTER_STACK = "Inter, ui-sans-serif, system-ui, sans-serif";

const DEMO_FINDINGS: FindingData[] = [
  {
    id: "no-value-prop",
    categoryId: "messaging",
    categoryName: "messaging",
    severity: "critical",
    rubricSeverity: "Critical",
    title: "No Value Proposition Above the Fold",
    whatWeFound:
      "Hero section displays brand name 'Luxe' and tagline 'Crafted for life' with no product category, target customer, or benefit statement",
    whyItMatters:
      "Visitors arrive, see a premium design, and leave without understanding what you sell, why it's different, or what to do next — estimated 65–75% first-visit exit rate.",
    howToFixIt:
      "Replace the tagline with a value proposition headline that names the product category, primary benefit, and target customer.",
    exampleFix: "Instead of 'Crafted for life', try 'Premium handcrafted leather goods — built to last, delivered in 3 days'",
    psychologyPrinciple: "Cognitive Load Reduction",
    revenueImpact: 9.5,
    effortToFix: "low",
    timeToFix: "2–4 hours",
    revenueEffort: "Today",
  },
  {
    id: "no-social-proof",
    categoryId: "trust",
    categoryName: "trust",
    severity: "critical",
    rubricSeverity: "Critical",
    title: "Complete Absence of Social Proof",
    whatWeFound:
      "No customer reviews, testimonials, star ratings, or trust badges visible on the landing page or product pages.",
    whyItMatters:
      "High-consideration purchases require social validation before commitment. Without proof, first-time visitors have no basis for trust and no reason to proceed.",
    howToFixIt:
      "Add a reviews widget above the fold. Yotpo, Okendo, or a Google Reviews embed all integrate in under a day.",
    exampleFix:
      "5-star rating widget showing '4,200+ verified customers' placed directly beneath the hero CTA",
    psychologyPrinciple: "Social Proof",
    revenueImpact: 9,
    effortToFix: "low",
    timeToFix: "1–2 days",
    revenueEffort: "Today",
  },
  {
    id: "cta-below-fold",
    categoryId: "conversion",
    categoryName: "conversion",
    severity: "warning",
    rubricSeverity: "High",
    title: "Primary CTA Below the Fold on Mobile",
    whatWeFound:
      "Hero section ends at the lifestyle image. The first actionable button appears 1,400px down the page on a 390px viewport.",
    whyItMatters:
      "Mobile visitors who don't scroll never encounter a conversion path — estimated 40–55% of traffic arrives on mobile.",
    howToFixIt:
      "Reposition the primary CTA button into the hero section so it appears within the first 400px on all mobile viewports.",
    exampleFix: "Place 'Shop Now' button inside the hero block, directly below the headline",
    psychologyPrinciple: "Above-Fold Anchoring",
    revenueImpact: 7.5,
    effortToFix: "low",
    timeToFix: "1–2 hours",
    revenueEffort: "Today",
  },
];

function GhostCard({
  num,
  severity,
  category,
  title,
}: {
  num: string;
  severity: "critical" | "high";
  category: string;
  title: string;
}) {
  const leftColor = severity === "critical" ? "#FF2D2D" : "#FFB300";
  const badgeBg = severity === "critical" ? "rgba(255,45,45,0.12)" : "rgba(255,179,0,0.1)";
  const badgeColor = severity === "critical" ? "#FF2D2D" : "#FFB300";
  const badgeBorder =
    severity === "critical" ? "rgba(255,45,45,0.35)" : "rgba(255,179,0,0.35)";
  const suppLabel = severity === "critical" ? "Revenue suppression: Critical" : "Revenue suppression: High";

  return (
    <div
      aria-hidden
      style={{
        background: "#0D1321",
        border: "1px solid #1A2035",
        borderLeft: `3px solid ${leftColor}`,
        padding: "12px 14px 10px 14px",
        marginBottom: 10,
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: REPORT_MONO, fontSize: 10, color: "#8899AA", letterSpacing: "0.08em" }}>
            {num}
          </span>
          <span
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              padding: "3px 8px",
              textTransform: "uppercase",
              background: badgeBg,
              color: badgeColor,
              border: `1px solid ${badgeBorder}`,
            }}
          >
            {severity === "critical" ? "CRITICAL" : "HIGH SUPPRESSION"}
          </span>
          <span
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 9,
              letterSpacing: "0.06em",
              color: "#8899AA",
              border: "1px solid #1A2035",
              padding: "3px 8px",
              textTransform: "lowercase",
            }}
          >
            {category}
          </span>
        </div>
        <span style={{ fontFamily: REPORT_MONO, fontSize: 9, color: badgeColor, whiteSpace: "nowrap" }}>
          {suppLabel}
        </span>
      </div>
      <h3
        style={{
          margin: "0 0 6px 0",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.3,
          color: "#FFFFFF",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          height: 12,
          background: "#1A2035",
          borderRadius: 2,
          width: "80%",
          marginBottom: 8,
        }}
      />
      <div
        style={{
          height: 12,
          background: "#1A2035",
          borderRadius: 2,
          width: "55%",
        }}
      />
    </div>
  );
}

export default function LandingDiagnosticOutput() {
  return (
    <section style={{ padding: "100px 24px 0" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
            gap: 16,
          }}
        >
          {/* Left: report identity */}
          <div style={{ paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  boxShadow: "0 0 8px rgba(0,200,255,0.6)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: REPORT_MONO,
                  fontWeight: 700,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                CONVERSION INTELLIGENCE
              </span>
            </div>
            <span
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 10,
                color: "rgba(136,153,170,0.5)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                paddingLeft: 14,
              }}
            >
              · CLIENT-ECOMMERCE.COM
            </span>
          </div>

          {/* Right: score ring */}
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            {/* Container clips the 180×180 gauge to the scaled visual size */}
            <div
              style={{
                position: "relative",
                width: 120,
                height: 120,
                overflow: "visible",
                display: "inline-block",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: "scale(0.667)",
                  transformOrigin: "top left",
                }}
              >
                <ConversionScoreGauge
                  score={38}
                  showDelta={false}
                  showLastScanned={false}
                />
              </div>
            </div>
            <div
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 9,
                color: "#FF2D2D",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: 6,
              }}
            >
              CRITICAL RISK
            </div>
          </div>
        </div>

        {/* Diagnostic Brief */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "#8899AA",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            DIAGNOSTIC BRIEF
          </div>
          <div style={{ borderLeft: "2px solid #1A2035", paddingLeft: 20 }}>
            <p
              style={{
                fontFamily: INTER_STACK,
                fontSize: 16,
                fontWeight: 400,
                color: "#FFFFFF",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              client-ecommerce.com presents a critical conversion architecture failure scoring
              38/100. The landing page communicates no clear value proposition above the fold —
              visitors see a brand name and lifestyle imagery with no product category, benefit
              statement, or primary action. Trust infrastructure is absent: no reviews, no
              guarantees, no credibility signals visible without scrolling. The site is losing an
              estimated 60–70% of first-time visitors before they reach any product.
            </p>
          </div>
        </div>

        {/* 3 live finding cards */}
        <div>
          {DEMO_FINDINGS.map((finding, i) => (
            <ReportFindingPreview
              key={finding.id}
              finding={finding}
              index={i + 1}
              issueReportId={null}
            />
          ))}
        </div>

        {/* Ghost cards + CTA overlay */}
        <div style={{ position: "relative" }}>
          <div style={{ filter: "blur(3.5px)", pointerEvents: "none" }}>
            <GhostCard
              num="04"
              severity="critical"
              category="trust"
              title="No Return Policy or Guarantee Visible"
            />
            <GhostCard
              num="05"
              severity="high"
              category="ux"
              title="Product Images Non-Zoomable on Mobile"
            />
          </div>

          {/* Gradient + CTA */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(5,8,16,0) 0%, rgba(5,8,16,0.75) 35%, rgba(5,8,16,0.97) 65%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingBottom: 28,
              gap: 12,
            }}
          >
            <Link
              href="/auth?mode=signup"
              className="inline-block font-mono text-[12px] uppercase transition-[background,border-color] duration-150"
              style={{
                color: "#00C8FF",
                background: "transparent",
                border: "1px solid rgba(0,200,255,0.4)",
                padding: "10px 24px",
                borderRadius: 4,
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
              RUN FREE SCAN →
            </Link>
            <p
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 9,
                color: "rgba(136,153,170,0.65)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              +18 MORE FINDINGS · UNLOCK FULL REPORT
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
