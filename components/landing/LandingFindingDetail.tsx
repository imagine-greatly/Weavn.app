"use client";

import Link from "next/link";

const MONO = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const GROTESK = "var(--font-space-grotesk), sans-serif";
const ORBITRON = "var(--font-orbitron), sans-serif";

const CHIPS = [
  "What's the fastest fix?",
  "How much is this costing me?",
  "Show me a CTA copy example",
] as const;

const BARS = [
  {
    label: "This site:",
    stat: "~0% hero CTR",
    w: "20%",
    color: "#FF2D2D",
    glow: "rgba(255,45,45,0.4)",
  },
  {
    label: "High-converting benchmark:",
    stat: "~4–6% hero CTR",
    w: "85%",
    color: "#00E676",
    glow: "#00E67655",
  },
] as const;

const TIERS = [
  { label: "Immediate", time: "30–60 min" },
  { label: "Proper",    time: "2–3 days"  },
  { label: "Advanced",  time: "1–2 weeks" },
] as const;

function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: MONO,
        fontSize: 9,
        color: "#00C8FF",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        margin: "0 0 14px 0",
      }}
    >
      {children}
    </p>
  );
}

export default function LandingFindingDetail() {
  return (
    <section style={{ padding: "120px 24px 0" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Section label */}
        <p
          className="font-mono text-[10px] uppercase"
          style={{ color: "#00C8FF", letterSpacing: "0.15em", margin: "0 0 8px 0" }}
        >
          FINDING DETAIL
        </p>
        <p
          className="font-mono text-[13px]"
          style={{ color: "#8899AA", lineHeight: 1.6, margin: "0 0 36px 0" }}
        >
          Every finding delivers evidence, revenue impact, and an exact resolution protocol.
        </p>

        {/* Open document — offset right */}
        <div className="ml-[8%]" style={{ maxWidth: 720 }}>

          {/* Anchor line */}
          <p
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "#8899AA",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 16px 0",
            }}
          >
            · SAAS-STARTUP.COM · FINDING 01 OF 14 · CRITICAL
          </p>

          {/* Badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                background: "#FF2D2D",
                color: "#FFFFFF",
                padding: "3px 8px",
                borderRadius: 2,
              }}
            >
              CRITICAL
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: "#8899AA",
                border: "1px solid #1A2035",
                padding: "3px 8px",
                borderRadius: 2,
              }}
            >
              cta-architecture
            </span>
          </div>

          {/* Title */}
          <h3
            style={{
              fontFamily: GROTESK,
              fontWeight: 700,
              fontSize: 38,
              color: "#FFFFFF",
              lineHeight: 1.15,
              letterSpacing: "-0.5px",
              margin: "0 0 12px 0",
            }}
          >
            No hero CTA visible above the fold
          </h3>

          {/* Revenue suppression */}
          <p
            style={{
              fontFamily: MONO,
              fontSize: 14,
              color: "#FF2D2D",
              margin: 0,
            }}
          >
            Revenue Suppression: Critical
          </p>

          {/* ── EVIDENCE ── */}
          <div style={{ marginTop: 48 }}>
            <BandLabel>EVIDENCE</BandLabel>
            <p
              style={{
                fontFamily: MONO,
                fontSize: 13,
                fontStyle: "italic",
                color: "#8899AA",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              &ldquo;Hero section contains headline and subtext only. No button element exists
              within the first viewport on desktop (1080px) or mobile (844px).&rdquo;
            </p>
          </div>

          {/* ── REVENUE IMPACT ── */}
          <div style={{ marginTop: 48 }}>
            <BandLabel>REVENUE IMPACT</BandLabel>
            <p
              style={{
                fontFamily: ORBITRON,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#FF2D2D",
                margin: "0 0 18px 0",
              }}
            >
              CRITICAL SUPPRESSION
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 540 }}>
              {BARS.map((row) => (
                <div key={row.label}>
                  <p style={{ fontFamily: MONO, fontSize: 9, color: "#8899AA", margin: "0 0 6px 0" }}>
                    {row.label}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 7,
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.05)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: row.w,
                          height: "100%",
                          borderRadius: 4,
                          background: row.color,
                          boxShadow: `0 0 10px ${row.glow}`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        color: row.color,
                        whiteSpace: "nowrap",
                        minWidth: 80,
                        opacity: 0.85,
                      }}
                    >
                      {row.stat}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RESOLUTION PROTOCOL ── */}
          <div style={{ marginTop: 48 }}>
            <BandLabel>RESOLUTION PROTOCOL</BandLabel>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {TIERS.map((tier) => (
                <div key={tier.label} style={{ border: "1px solid #1A2035", borderRadius: 6, padding: "10px 22px", textAlign: "center", minWidth: 110 }}>
                  <p style={{ fontFamily: GROTESK, fontSize: 13, fontWeight: 600, color: "#00C8FF", margin: "0 0 4px 0" }}>
                    {tier.label}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: 9, color: "#8899AA", margin: 0 }}>
                    {tier.time}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── AI ADVISOR ── */}
          <div style={{ marginTop: 48 }}>
            {/* Advisor label */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  boxShadow: "0 0 8px rgba(0,200,255,0.6)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11, letterSpacing: "3px", color: "var(--cyan)" }}>
                AI ADVISOR
              </span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#8899AA" }}>
                · on this issue
              </span>
            </div>

            {/* Message — open, no box */}
            <p
              style={{
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 400,
                color: "#FFFFFF",
                lineHeight: 1.7,
                margin: "0 0 16px 0",
              }}
            >
              This is your fastest revenue recovery. The CTA exists — it just needs to move
              800px up the page. No redesign required. Tell me your stack and I&apos;ll give
              you the exact element to move.
            </p>

            {/* Prompt chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CHIPS.map((chip) => (
                <span
                  key={chip}
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    color: "#8899AA",
                    border: "1px solid #1A2035",
                    borderRadius: 6,
                    padding: "5px 10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <Link
              href="/auth?mode=signup"
              className="inline-block font-mono text-[12px] uppercase transition-[background,border-color] duration-150"
              style={{
                color: "#00C8FF",
                background: "transparent",
                border: "1px solid rgba(0,200,255,0.4)",
                padding: "10px 28px",
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
              VIEW FULL DIAGNOSTIC →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
