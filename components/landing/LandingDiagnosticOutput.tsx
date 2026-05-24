"use client";

import { useRouter } from "next/navigation";

const SM = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const SG = "var(--font-space-grotesk), sans-serif";
const ORB = "var(--font-orbitron), sans-serif";
const INTER = "Inter, ui-sans-serif, system-ui, sans-serif";

type Severity = "critical" | "high";

function getSeverityTokens(severity: Severity) {
  if (severity === "critical") {
    return {
      borderLeft: "3px solid #FF2D2D",
      badgeBg: "rgba(255,45,45,0.12)",
      badgeColor: "#FF2D2D",
      badgeBorder: "1px solid rgba(255,45,45,0.35)",
      badgeLabel: "CRITICAL",
      suppressionLabel: "Revenue suppression: Critical",
      suppressionColor: "#FF2D2D",
    };
  }
  return {
    borderLeft: "3px solid #FFB300",
    badgeBg: "rgba(255,179,0,0.1)",
    badgeColor: "#FFB300",
    badgeBorder: "1px solid rgba(255,179,0,0.35)",
    badgeLabel: "HIGH SUPPRESSION",
    suppressionLabel: "Revenue suppression: High",
    suppressionColor: "#FFB300",
  };
}

function DiagnosticFindingCard({
  num,
  severity,
  tagLabel,
  title,
  evidence,
  impact,
}: {
  num: string;
  severity: Severity;
  tagLabel: string;
  title: string;
  evidence: string;
  impact: string;
}) {
  const sev = getSeverityTokens(severity);

  return (
    <div
      style={{
        background: "#0D1321",
        border: "1px solid #1A2035",
        borderLeft: sev.borderLeft,
        padding: "12px 14px 10px 14px",
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      {/* header meta row */}
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: SM, fontSize: 10, color: "#8899AA", letterSpacing: "0.08em" }}>
            {num}
          </span>
          <span
            style={{
              fontFamily: SM,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              padding: "3px 8px",
              textTransform: "uppercase",
              background: sev.badgeBg,
              color: sev.badgeColor,
              border: sev.badgeBorder,
            }}
          >
            {sev.badgeLabel}
          </span>
          <span
            style={{
              fontFamily: SM,
              fontSize: 9,
              letterSpacing: "0.06em",
              color: "#8899AA",
              border: "1px solid #1A2035",
              padding: "3px 8px",
              textTransform: "lowercase",
            }}
          >
            {tagLabel}
          </span>
        </div>
        <span style={{ fontFamily: SM, fontSize: 9, color: sev.suppressionColor, whiteSpace: "nowrap" }}>
          {sev.suppressionLabel}
        </span>
      </div>

      {/* title */}
      <h3
        style={{
          fontFamily: SG,
          fontWeight: 600,
          fontSize: 18,
          color: "#FFFFFF",
          margin: "0 0 6px 0",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>

      {/* evidence — monospace italic, single-line truncated */}
      <p
        style={{
          fontFamily: SM,
          fontSize: 12,
          fontStyle: "italic",
          color: "#8899AA",
          lineHeight: 1.45,
          margin: "0 0 6px 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {evidence}
      </p>

      {/* impact — Inter, 2-line clamp */}
      <p
        style={{
          fontFamily: INTER,
          fontSize: 13,
          color: "rgba(240,244,255,0.88)",
          lineHeight: 1.4,
          margin: "0 0 8px 0",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {impact}
      </p>

      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontFamily: SM,
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "#00C8FF",
            cursor: "default",
            pointerEvents: "none",
          }}
        >
          VIEW FULL DIAGNOSTIC →
        </span>
      </div>
    </div>
  );
}

function GhostCard({ borderColor }: { borderColor: string }) {
  return (
    <div
      style={{
        background: "#0D1321",
        border: "1px solid #1A2035",
        borderLeft: `3px solid ${borderColor}`,
        padding: "12px 14px 10px 14px",
        marginBottom: 10,
        filter: "blur(5px)",
        opacity: 0.35,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ background: "#1A2035", height: 12, width: 24 }} />
        <div style={{ background: "#1A2035", height: 12, width: 60 }} />
        <div style={{ background: "#1A2035", height: 12, width: 48 }} />
      </div>
      <div style={{ background: "#1A2035", height: 12, width: "60%", marginBottom: 8 }} />
      <div style={{ background: "#1A2035", height: 12, width: "80%", marginBottom: 8 }} />
      <div style={{ background: "#1A2035", height: 12, width: "40%" }} />
    </div>
  );
}

export default function LandingDiagnosticOutput() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @keyframes ldo-dot-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .ldo-dot { animation: ldo-dot-pulse 2s ease-in-out infinite; }
      `}</style>
      <section id="live-preview" className="ldo-section-root" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 940, margin: "0 auto" }}>

          {/* Element 1 — Domain / score header */}
          <div
            className="ldo-header-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className="ldo-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#00C8FF",
                  boxShadow: "0 0 8px rgba(0,200,255,0.6)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: SM,
                  fontWeight: 700,
                  fontSize: 11,
                  color: "rgba(240,244,255,0.45)",
                  letterSpacing: "0.14em",
                }}
              >
                CONVERSION INTELLIGENCE
              </span>
              <span style={{ fontFamily: SM, fontSize: 10, color: "#8899AA", margin: "0 2px" }}>·</span>
              <span
                style={{
                  fontFamily: SM,
                  fontSize: 10,
                  color: "rgba(240,244,255,0.9)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                client-ecommerce.com
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontFamily: ORB,
                    fontWeight: 700,
                    fontSize: 28,
                    color: "#FF2D2D",
                    lineHeight: 1,
                  }}
                >
                  38
                </span>
                <span style={{ fontFamily: SM, fontSize: 12, color: "#8899AA" }}>/100</span>
              </div>
              <span
                style={{
                  fontFamily: SM,
                  fontSize: 9,
                  color: "#FF2D2D",
                  letterSpacing: "0.12em",
                  marginTop: 2,
                }}
              >
                CRITICAL RISK
              </span>
            </div>
          </div>

          {/* Element 2 — Diagnostic Brief */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontFamily: SM,
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#8899AA",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              DIAGNOSTIC BRIEF
            </div>
            <div style={{ borderLeft: "2px solid #1A2035", paddingLeft: 20, marginTop: 12 }}>
              <p
                style={{
                  fontFamily: INTER,
                  fontSize: 16,
                  fontWeight: 400,
                  color: "#FFFFFF",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                client-ecommerce.com presents a critical conversion architecture failure scoring 38/100. The landing page communicates no clear value proposition above the fold — visitors see a brand name and lifestyle imagery with no product category, benefit statement, or primary action. Trust infrastructure is absent: no reviews, no guarantees, no credibility signals visible without scrolling. The site is losing an estimated 60–70% of first-time visitors before they reach any product.
              </p>
            </div>
          </div>

          {/* Element 3 — Finding Cards */}
          <DiagnosticFindingCard
            num="01"
            severity="critical"
            tagLabel="messaging"
            title="No Value Proposition Above the Fold"
            evidence="Hero section displays brand name 'Luxe' and tagline 'Crafted for life' with no product category, target customer, or benefit statement visible without scrolling"
            impact="Visitors arrive, see a premium design, and leave without understanding what you sell, why it's different, or what to do next — estimated 65–75% first-visit exit rate."
          />
          <DiagnosticFindingCard
            num="02"
            severity="critical"
            tagLabel="trust"
            title="Complete Absence of Social Proof"
            evidence="No customer reviews, testimonials, star ratings, or trust badges visible on the landing page or product pages. Competitors show 4.8★ ratings and 2,400+ reviews above the fold."
            impact="High-consideration purchases require social validation before commitment. Without proof, first-time visitors have no basis for trust and no reason to proceed."
          />
          <DiagnosticFindingCard
            num="03"
            severity="high"
            tagLabel="conversion"
            title="No Primary Call-to-Action in Hero"
            evidence="The hero section contains no button, no link, and no directional cue. Visitors who are ready to act have no path forward from the first screen."
            impact="Visitors with purchase intent have nowhere to go from the first screen. Estimated 30–40% conversion rate loss from visitors ready to engage but given no action."
          />

          {/* Element 4 — Blurred remainder + CTA overlay */}
          <div style={{ position: "relative", marginTop: 4 }}>
            <GhostCard borderColor="#FF2D2D" />
            <GhostCard borderColor="#FFB300" />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(5,8,16,0.85) 60%)",
                paddingTop: 40,
              }}
            >
              <span style={{ fontFamily: SM, fontSize: 12, color: "#8899AA" }}>
                + 9 more findings identified
              </span>
              <span
                style={{
                  fontFamily: SG,
                  fontSize: 16,
                  color: "#FFFFFF",
                  marginTop: 8,
                }}
              >
                Scan your site to see yours.
              </span>
              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  marginTop: 16,
                  background: "transparent",
                  border: "1px solid #00C8FF",
                  color: "#00C8FF",
                  fontFamily: SM,
                  fontSize: 12,
                  textTransform: "uppercase",
                  padding: "10px 28px",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                }}
              >
                RUN FREE SCAN →
              </button>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
