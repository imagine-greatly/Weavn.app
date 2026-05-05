"use client";

import { useRouter } from "next/navigation";

const SM = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const SG = "var(--font-space-grotesk), sans-serif";
const ORB = "var(--font-orbitron), sans-serif";

function DiagnosticFindingCard({
  num,
  badgeLabel,
  badgeColor,
  tagLabel,
  title,
  evidence,
  impact,
  impactColor,
  borderColor,
}: {
  num: string;
  badgeLabel: string;
  badgeColor: string;
  tagLabel: string;
  title: string;
  evidence: string;
  impact: string;
  impactColor: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        background: "#0A0F1E",
        border: "1px solid #1A2035",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 4,
        padding: "20px 24px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: SM, fontSize: 11, color: "#8899AA" }}>{num}</span>
        <span
          style={{
            fontFamily: SM,
            fontSize: 9,
            background: badgeColor,
            color: "#FFFFFF",
            padding: "2px 8px",
            borderRadius: 2,
          }}
        >
          {badgeLabel}
        </span>
        <span
          style={{
            fontFamily: SM,
            fontSize: 10,
            color: "#8899AA",
            border: "1px solid #1A2035",
            padding: "2px 8px",
          }}
        >
          {tagLabel}
        </span>
      </div>
      <h3
        style={{
          fontFamily: SG,
          fontWeight: 700,
          fontSize: 16,
          color: "#FFFFFF",
          margin: "8px 0 0 0",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: SG,
          fontSize: 13,
          fontStyle: "italic",
          color: "#8899AA",
          lineHeight: 1.6,
          borderLeft: "2px solid rgba(0,200,255,0.3)",
          paddingLeft: 12,
          marginTop: 10,
          marginBottom: 0,
        }}
      >
        {evidence}
      </p>
      <p
        style={{
          fontFamily: SM,
          fontSize: 11,
          color: impactColor,
          marginTop: 10,
          marginBottom: 0,
          lineHeight: 1.5,
        }}
      >
        {impact}
      </p>
      <div style={{ textAlign: "right", marginTop: 10 }}>
        <span
          style={{
            fontFamily: SM,
            fontSize: 10,
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
        background: "#0A0F1E",
        border: "1px solid #1A2035",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 4,
        padding: "20px 24px",
        marginBottom: 12,
        filter: "blur(5px)",
        opacity: 0.35,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ background: "#1A2035", borderRadius: 2, height: 12, width: 24 }} />
        <div style={{ background: "#1A2035", borderRadius: 2, height: 12, width: 60 }} />
        <div style={{ background: "#1A2035", borderRadius: 2, height: 12, width: 48 }} />
      </div>
      <div style={{ background: "#1A2035", borderRadius: 2, height: 12, width: "60%", marginBottom: 10 }} />
      <div style={{ background: "#1A2035", borderRadius: 2, height: 12, width: "80%", marginBottom: 10 }} />
      <div style={{ background: "#1A2035", borderRadius: 2, height: 12, width: "40%" }} />
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
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 940, margin: "0 auto" }}>

          {/* Element 1 — Domain Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                className="ldo-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#00C8FF",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: SM,
                  fontSize: 12,
                  color: "#8899AA",
                  marginLeft: 8,
                }}
              >
                client-ecommerce.com
              </span>
              <span style={{ fontFamily: SM, fontSize: 12, color: "#8899AA", margin: "0 6px" }}>·</span>
              <span
                style={{
                  fontFamily: SM,
                  fontSize: 10,
                  color: "#00C8FF",
                  letterSpacing: "0.15em",
                }}
              >
                CONVERSION DIAGNOSTIC
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontFamily: ORB,
                    fontWeight: 700,
                    fontSize: 28,
                    color: "#FF4444",
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
                  color: "#FF4444",
                  letterSpacing: "0.12em",
                  marginTop: 2,
                }}
              >
                CRITICAL RISK
              </span>
            </div>
          </div>

          {/* Element 2 — Intelligence Brief */}
          <div
            style={{
              background: "rgba(0,200,255,0.03)",
              borderLeft: "2px solid rgba(0,200,255,0.4)",
              padding: "16px 20px",
              marginBottom: 28,
              borderRadius: "0 4px 4px 0",
            }}
          >
            <div
              style={{
                fontFamily: SM,
                fontSize: 10,
                color: "#00C8FF",
                letterSpacing: "0.15em",
                marginBottom: 10,
              }}
            >
              ● INTELLIGENCE BRIEF
            </div>
            <p
              style={{
                fontFamily: SG,
                fontSize: 14,
                color: "#E0E6FF",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              client-ecommerce.com presents a critical conversion architecture failure scoring 38/100. The homepage communicates no clear value proposition above the fold — visitors see a brand name and lifestyle imagery with no product category, benefit statement, or primary action. Trust infrastructure is absent: no reviews, no guarantees, no credibility signals visible without scrolling. The site is losing an estimated 60-70% of first-time visitors before they reach any product.
            </p>
          </div>

          {/* Element 3 — Three Finding Cards */}
          <DiagnosticFindingCard
            num="01"
            badgeLabel="CRITICAL"
            badgeColor="#FF4444"
            tagLabel="messaging"
            title="No Value Proposition Above the Fold"
            evidence="Hero section displays brand name 'Luxe' and tagline 'Crafted for life' with no product category, target customer, or benefit statement visible without scrolling"
            impact="Revenue Suppression: Critical — estimated 65-75% first-visit exit rate"
            impactColor="#FF4444"
            borderColor="#FF4444"
          />
          <DiagnosticFindingCard
            num="02"
            badgeLabel="CRITICAL"
            badgeColor="#FF4444"
            tagLabel="trust"
            title="Complete Absence of Social Proof"
            evidence="No customer reviews, testimonials, star ratings, or trust badges visible on the homepage or product pages. Competitors show 4.8★ ratings and 2,400+ reviews above the fold."
            impact="Revenue Suppression: Critical — high-consideration purchases require social validation before commitment"
            impactColor="#FF4444"
            borderColor="#FF4444"
          />
          <DiagnosticFindingCard
            num="03"
            badgeLabel="HIGH IMPACT"
            badgeColor="#FF8C00"
            tagLabel="conversion"
            title="No Primary Call-to-Action in Hero Section"
            evidence="The hero section contains no button, no link, and no directional cue. Visitors who are ready to act have no path forward from the first screen."
            impact="Revenue Suppression: High — 30-40% conversion rate loss from visitors ready to engage"
            impactColor="#FF8C00"
            borderColor="#FF8C00"
          />

          {/* Element 4 — Blurred Remainder */}
          <div style={{ position: "relative", marginTop: 4 }}>
            <GhostCard borderColor="#FF4444" />
            <GhostCard borderColor="#FF8C00" />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(to bottom, transparent 0%, rgba(5,8,16,0.85) 60%)",
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
                onClick={() => router.push("/?scan=1")}
                style={{
                  marginTop: 16,
                  background: "transparent",
                  border: "1px solid #00C8FF",
                  color: "#00C8FF",
                  fontFamily: SM,
                  fontSize: 12,
                  textTransform: "uppercase",
                  padding: "10px 28px",
                  borderRadius: 4,
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
