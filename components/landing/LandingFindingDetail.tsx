"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const MONO = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const GROTESK = "var(--font-space-grotesk), sans-serif";
const ORBITRON = "var(--font-orbitron), sans-serif";

const CHIPS = [
  "What's the fastest fix?",
  "How much is this costing me?",
  "Show me a CTA copy example",
] as const;

const TIERS = [
  { label: "Immediate", time: "30–60 min", desc: "Move CTA into hero. No developer needed." },
  { label: "Proper",    time: "2–3 days",  desc: "Restructure hero with Problem → Value → CTA sequence." },
  { label: "Advanced",  time: "1–2 weeks", desc: "Multivariate CTA test across hero configurations." },
] as const;

export default function LandingFindingDetail() {
  return (
    <section
      style={{
        paddingTop: 140,
        paddingBottom: 140,
        paddingLeft: "5%",
        paddingRight: "5%",
        maxWidth: "90vw",
      }}
    >

      {/* Section label */}
      <p style={{
        fontFamily: MONO,
        fontSize: 9,
        color: "#00C8FF",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        margin: "0 0 6px 0",
      }}>
        FINDING DETAIL
      </p>
      <p style={{ fontFamily: MONO, fontSize: 11, color: "#8899AA", margin: 0, lineHeight: 1.5 }}>
        The diagnostic depth behind every finding.
      </p>

      {/* Anchor line */}
      <p style={{
        fontFamily: MONO,
        fontSize: 10,
        color: "#8899AA",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        margin: "28px 0 0 0",
      }}>
        · SAAS-STARTUP.COM · FINDING 01 OF 14
      </p>

      {/* ── TWO COLUMNS ── */}
      <div
        className="flex flex-col md:flex-row"
        style={{ gap: 72, marginTop: 32, alignItems: "flex-start", width: "100%" }}
      >

        {/* ── LEFT COLUMN ── */}
        <div
          className="order-2 md:order-1"
          style={{
            flex: 1,
            borderLeft: "4px solid #FF2D2D",
            paddingLeft: 20,
            minWidth: 0,
          }}
        >
          {/* Badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              background: "#FF2D2D",
              color: "#fff",
              padding: "3px 8px",
              borderRadius: 2,
            }}>
              CRITICAL
            </span>
            <span style={{
              fontFamily: MONO,
              fontSize: 9,
              color: "#8899AA",
              border: "1px solid #1A2035",
              padding: "3px 8px",
              borderRadius: 2,
            }}>
              cta-architecture
            </span>
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: GROTESK,
            fontWeight: 700,
            fontSize: 26,
            color: "#FFFFFF",
            lineHeight: 1.3,
            letterSpacing: "-0.2px",
            margin: "12px 0 0 0",
          }}>
            No hero CTA visible above the fold
          </h3>

          {/* Revenue suppression line */}
          <p style={{ fontFamily: MONO, fontSize: 11, color: "#FF2D2D", margin: "8px 0 0 0" }}>
            Revenue Suppression: Critical
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: "#1A2035", marginTop: 20 }} />

          {/* Diagnostic analysis label */}
          <p style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "#00C8FF",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: "28px 0 0 0",
          }}>
            DIAGNOSTIC ANALYSIS
          </p>

          {/* Para 1 */}
          <p style={{ fontFamily: GROTESK, fontSize: 15, color: "#CCDDEE", lineHeight: 1.85, margin: "12px 0 0 0" }}>
            Visitors arriving on saas-startup.com complete an unconscious orientation scan
            within the first 2–4 seconds. During this window the brain is pattern-matching
            the page against known conversion contexts. When no action surface is present
            in the first viewport, the page is categorized as informational — and the
            visitor&apos;s intent to engage drops sharply before they ever reach the CTA.
          </p>

          {/* Para 2 */}
          <p style={{ fontFamily: GROTESK, fontSize: 15, color: "#CCDDEE", lineHeight: 1.85, margin: "20px 0 0 0" }}>
            This is not a visibility problem. The CTA exists on the page. It is a sequencing
            failure: the offer is being made after the decision window has already closed for
            a large share of traffic. Mobile visitors — who represent 61% of SaaS trial
            traffic on category benchmarks — face a scroll distance of more than twice their
            viewport height before reaching any conversion surface.
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: "#1A2035", marginTop: 24 }} />

          {/* AI Advisor */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
            <div style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
              <motion.div
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  border: "1px solid rgba(0,200,255,0.6)",
                }}
                animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "#00C8FF",
                boxShadow: "0 0 6px rgba(0,200,255,0.8)",
              }} />
            </div>
            <span style={{
              fontFamily: MONO,
              fontSize: 10,
              color: "#00C8FF",
              letterSpacing: "0.1em",
            }}>
              AI ADVISOR · on this issue
            </span>
          </div>

          {/* Advisor prose */}
          <p style={{
            fontFamily: GROTESK,
            fontWeight: 600,
            fontSize: 13,
            color: "#FFFFFF",
            lineHeight: 1.6,
            margin: "8px 0 0 0",
          }}>
            This is your fastest revenue recovery. The CTA exists — it just needs to move
            800px up the page. No redesign required. Tell me your stack and I&apos;ll give
            you the exact element to move.
          </p>

          {/* Prompt chips */}
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {CHIPS.map((chip) => (
              <span
                key={chip}
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "#8899AA",
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

        {/* ── RIGHT COLUMN ── */}
        <div
          className="order-1 md:order-2 md:sticky"
          style={{ flex: "0 0 420px", top: 80, textAlign: "center", minWidth: "420px" }}
        >

          {/* The number */}
          <p style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "#00C8FF",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: 0,
          }}>
            ESTIMATED EXIT RATE
          </p>

          <p
            className="text-[72px] md:text-[96px]"
            style={{
              fontFamily: ORBITRON,
              color: "#FF2D2D",
              lineHeight: 1,
              margin: "4px 0 0 0",
              textShadow: "0 0 40px rgba(255,45,45,0.4)",
            }}
          >
            68%
          </p>

          <p style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "#8899AA",
            lineHeight: 1.5,
            margin: "8px 0 0 0",
          }}>
            of visitors leave before reaching any CTA
          </p>

          {/* Red rule */}
          <div style={{ width: 40, height: 1, background: "#FF2D2D", margin: "16px auto 0" }} />

          {/* Revenue Impact Bars */}
          <p style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "#00C8FF",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: "16px 0 0 0",
          }}>
            REVENUE IMPACT
          </p>

          <div style={{ marginTop: 10, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#8899AA" }}>This site:</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#8899AA" }}>No hero CTA</span>
            </div>
            <div style={{ width: "100%", height: 6, background: "#1A2035", borderRadius: 2, marginTop: 6 }}>
              <div style={{ width: "20%", height: "100%", background: "#FF2D2D", borderRadius: 2 }} />
            </div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: "#8899AA", textAlign: "right", margin: "4px 0 0 0" }}>~0% hero CTR</p>
          </div>

          <div style={{ marginTop: 12, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#8899AA" }}>High-converting benchmark:</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#8899AA" }}>Primary + secondary hero CTA</span>
            </div>
            <div style={{ width: "100%", height: 6, background: "#1A2035", borderRadius: 2, marginTop: 6 }}>
              <div style={{ width: "80%", height: "100%", background: "#00FF88", borderRadius: 2 }} />
            </div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: "#8899AA", textAlign: "right", margin: "4px 0 0 0" }}>~4-6% hero CTR</p>
          </div>

          {/* Resolution protocol */}
          <p style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "#00C8FF",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: "32px 0 0 0",
          }}>
            RESOLUTION PROTOCOL
          </p>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
            {TIERS.map((tier) => (
              <div
                key={tier.label}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #1A2035",
                  borderRadius: 4,
                  background: "transparent",
                  marginTop: 8,
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "#00C8FF" }}>{tier.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: "#8899AA" }}>{tier.time}</span>
                </div>
                <p style={{ fontFamily: MONO, fontSize: 11, color: "#8899AA", margin: "6px 0 0 0", lineHeight: 1.5 }}>{tier.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ marginTop: 56, textAlign: "center" }}>
        <Link
          href="/auth?mode=signup"
          className="inline-block font-mono text-[11px] uppercase transition-[background,border-color] duration-150"
          style={{
            color: "#00C8FF",
            background: "transparent",
            border: "1px solid rgba(0,200,255,0.4)",
            padding: "10px 28px",
            borderRadius: 4,
            textDecoration: "none",
            letterSpacing: "0.1em",
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

    </section>
  );
}
