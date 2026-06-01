"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const MONO = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const GROTESK = "var(--font-space-grotesk), sans-serif";
const ORBITRON = "var(--font-orbitron), sans-serif";

const LABEL_H = 40;
const CIRCLE_D = 10;
const LINE_TOP = LABEL_H + CIRCLE_D / 2; // 45px — center of circles

// ── DATA BLOCKS ────────────────────────────────────────────────────────────

function EvidenceBlock() {
  return (
    <div style={{ background: "#070C18", border: "1px solid #1A2035", padding: 12 }}>
      <p style={{ fontFamily: MONO, fontStyle: "italic", fontSize: 11, color: "#8899AA", lineHeight: 1.6, margin: 0 }}>
        No button element exists within the first viewport on desktop or mobile.
      </p>
    </div>
  );
}

function MechanismBlock() {
  return (
    <div style={{ background: "#070C18", border: "1px solid #1A2035", padding: 12 }}>
      <p style={{ fontFamily: MONO, fontStyle: "italic", fontSize: 11, color: "#8899AA", lineHeight: 1.6, margin: 0 }}>
        Action Paralysis (Above-Fold Anchoring) — intent to act drops when no CTA exists at the orientation point.
      </p>
    </div>
  );
}

function RevenueBlock() {
  return (
    <div style={{ background: "#070C18", border: "1px solid #1A2035", padding: 12 }}>
      <p style={{ fontFamily: ORBITRON, fontSize: 11, color: "#FF2D2D", margin: "0 0 8px 0", letterSpacing: "0.06em" }}>
        CRITICAL SUPPRESSION
      </p>
      <div style={{ marginBottom: 6 }}>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 3 }}>
          <div style={{ width: "20%", height: "100%", background: "#FF2D2D", borderRadius: 3 }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "#FF2D2D" }}>~0% CTR</span>
      </div>
      <div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 3 }}>
          <div style={{ width: "80%", height: "100%", background: "#00E676", borderRadius: 3 }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "#00E676" }}>~4–6% CTR</span>
      </div>
    </div>
  );
}

function ResolutionBlock() {
  return (
    <div style={{ background: "#070C18", border: "1px solid #1A2035", padding: 12 }}>
      <p style={{ fontFamily: MONO, fontSize: 10, color: "#00C8FF", margin: "0 0 5px 0", lineHeight: 1.4 }}>Immediate · 30–60 min</p>
      <p style={{ fontFamily: MONO, fontSize: 10, color: "#8899AA", margin: "0 0 5px 0", lineHeight: 1.4 }}>Proper · 2–3 days</p>
      <p style={{ fontFamily: MONO, fontSize: 10, color: "#8899AA", margin: 0, lineHeight: 1.4 }}>Advanced · 1–2 weeks</p>
    </div>
  );
}

function AdvisorBlock() {
  return (
    <div style={{
      background: "#070C18",
      border: "1px solid rgba(0,200,255,0.15)",
      padding: 12,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
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
      <span style={{ fontFamily: MONO, fontSize: 10, color: "#00C8FF" }}>Active on this finding</span>
    </div>
  );
}

// ── NODES ──────────────────────────────────────────────────────────────────

const NODES = [
  { id: "evidence",   label: "EVIDENCE",       Block: EvidenceBlock,   isAdvisor: false },
  { id: "mechanism",  label: "MECHANISM",      Block: MechanismBlock,  isAdvisor: false },
  { id: "revenue",    label: "REVENUE IMPACT", Block: RevenueBlock,    isAdvisor: false },
  { id: "resolution", label: "RESOLUTION",     Block: ResolutionBlock, isAdvisor: false },
  { id: "advisor",    label: "AI ADVISOR",     Block: AdvisorBlock,    isAdvisor: true  },
];

// ── COMPONENT ──────────────────────────────────────────────────────────────

export default function LandingFindingDetail() {
  return (
    <section style={{ paddingTop: 120, paddingBottom: 120 }}>

      {/* Section label + descriptor */}
      <div style={{ padding: "0 40px 48px" }}>
        <p style={{
          fontFamily: MONO,
          fontSize: 10,
          color: "#00C8FF",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          margin: "0 0 8px 0",
        }}>
          FINDING DETAIL
        </p>
        <p style={{ fontFamily: MONO, fontSize: 13, color: "#8899AA", margin: 0, lineHeight: 1.6 }}>
          Every finding is constructed in five diagnostic layers.
        </p>
      </div>

      {/* Specimen header — centered */}
      <div style={{ textAlign: "center", padding: "0 24px", marginBottom: 60 }}>
        <p style={{
          fontFamily: MONO,
          fontSize: 11,
          color: "#8899AA",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          margin: "0 0 12px 0",
        }}>
          · SAAS-STARTUP.COM · FINDING 01 OF 14
        </p>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 14 }}>
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
        <h3 style={{
          fontFamily: GROTESK,
          fontWeight: 600,
          fontSize: 28,
          color: "#FFFFFF",
          lineHeight: 1.25,
          letterSpacing: "-0.3px",
          margin: "0 0 10px 0",
        }}>
          No hero CTA visible above the fold
        </h3>
        <p style={{ fontFamily: MONO, fontSize: 12, color: "#FF2D2D", margin: 0 }}>
          Revenue Suppression: Critical
        </p>
      </div>

      {/* ── DESKTOP PIPELINE ── */}
      <div
        className="hidden md:block"
        style={{ position: "relative", padding: "0 40px" }}
      >
        {/* Static base line — full width between node columns */}
        <div style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: LINE_TOP,
          height: 1,
          background: "#1A2035",
          zIndex: 0,
        }} />

        {/* Animated signal line — node 4 → node 5
            With 5 flex:1 columns inside padding:0 40px,
            node centers sit at 10/30/50/70/90% of the flex container.
            Node 3 center from outer left: calc(70% - 16px)
            Node 4 center from outer right: calc(10% + 32px) */}
        <motion.div
          style={{
            position: "absolute",
            left: "calc(70% - 16px)",
            right: "calc(10% + 32px)",
            top: LINE_TOP,
            height: 1,
            background: "linear-gradient(to right, transparent, #00C8FF)",
            zIndex: 1,
          }}
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Node columns */}
        <div style={{ display: "flex", position: "relative", zIndex: 2 }}>
          {NODES.map((node) => (
            <div
              key={node.id}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              {/* Label — fixed height, bottom-aligned so all circles share the same row */}
              <div style={{
                height: LABEL_H,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: 8,
              }}>
                <span style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: "#00C8FF",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}>
                  {node.label}
                </span>
              </div>

              {/* Circle node */}
              <div style={{
                width: CIRCLE_D,
                height: CIRCLE_D,
                borderRadius: "50%",
                background: "#00C8FF",
                flexShrink: 0,
                boxShadow: node.isAdvisor
                  ? "0 0 14px rgba(0,200,255,0.9), 0 0 28px rgba(0,200,255,0.5)"
                  : "0 0 8px rgba(0,200,255,0.5)",
              }} />

              {/* Data block */}
              <div style={{ marginTop: 12, width: "100%", maxWidth: 140, padding: "0 4px" }}>
                <node.Block />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBILE PIPELINE ── */}
      <div className="md:hidden" style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {NODES.map((node, i) => (
            <Fragment key={node.id}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                maxWidth: 320,
              }}>
                <span style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: "#00C8FF",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}>
                  {node.label}
                </span>
                <div style={{
                  width: CIRCLE_D,
                  height: CIRCLE_D,
                  borderRadius: "50%",
                  background: "#00C8FF",
                  boxShadow: node.isAdvisor
                    ? "0 0 14px rgba(0,200,255,0.9)"
                    : "0 0 8px rgba(0,200,255,0.5)",
                }} />
                <div style={{ marginTop: 12, width: "100%" }}>
                  <node.Block />
                </div>
              </div>

              {/* Vertical connector */}
              {i < NODES.length - 1 && (
                i === NODES.length - 2 ? (
                  <motion.div
                    style={{
                      width: 1,
                      height: 40,
                      margin: "12px 0",
                      background: "linear-gradient(to bottom, #1A2035, #00C8FF)",
                    }}
                    animate={{ opacity: [0.15, 1, 0.15] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                ) : (
                  <div style={{ width: 1, height: 40, background: "#1A2035", margin: "12px 0" }} />
                )
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── BELOW PIPELINE ── */}
      <div style={{ marginTop: 60, textAlign: "center", padding: "0 24px" }}>
        <p style={{
          fontFamily: GROTESK,
          fontSize: 15,
          color: "#CCDDEE",
          maxWidth: 600,
          margin: "0 auto",
          lineHeight: 1.7,
        }}>
          &ldquo;Most audits tell you what&rsquo;s wrong. webdocai tells you the mechanism,
          the cost, and the exact resolution — then puts a specialist on it.&rdquo;
        </p>
        <div style={{ marginTop: 32 }}>
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
      </div>

    </section>
  );
}
