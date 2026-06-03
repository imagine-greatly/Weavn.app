"use client";

import Link from "next/link";
import { useState } from "react";

const SM = "'Space Mono', 'Courier New', monospace";
const SG = "'Space Grotesk', sans-serif";
const CYAN = "#00C8FF";
const BG = "#050810";
const CARD = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(240,244,255,0.4)";
const TEXT = "#F0F4FF";

const CURL_HERO = `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yoursite.com"}'`;

const RESPONSE_PREVIEW = `{
  "id": "c4f1a2b3-d5e6-...",
  "score": 54,
  "verdict": "Needs Work",
  "dimensions": {
    "conversion_architecture": 48,
    "trust_signals": 62,
    "message_clarity": 41,
    "traffic_readiness": 58,
    "technical_foundation": 71
  },
  "findings": [ ... 12 findings ],
  "copy_rewrites": { ... },
  "growth_blueprint": [ ... ]
}`;

const RESPONSE_FULL = `{
  "id": "c4f1a2b3-d5e6-7890-abcd-ef1234567890",
  "url": "https://yoursite.com",
  "score": 54,
  "verdict": "Needs Work",
  "scanned_at": "2026-06-02T12:00:00Z",
  "pages_scanned": 2,
  "dimensions": {
    "conversion_architecture": 48,
    "trust_signals": 62,
    "message_clarity": 41,
    "traffic_readiness": 58,
    "technical_foundation": 71
  },
  "summary": "Hero headline communicates no outcome. Primary CTA below fold on mobile. Trust signals present but mispositioned relative to commitment step.",
  "findings": [
    {
      "id": "finding_001",
      "title": "Hero headline does not communicate outcome",
      "severity": "critical",
      "dimension": "Message Clarity",
      "impact": "15-25% conversion suppression",
      "explanation": "Current headline 'Welcome to our platform' signals no job-to-be-done.",
      "recommendation": "Replace with outcome-led headline naming the visitor result.",
      "rewritten_copy": "Get a ranked conversion audit in 90 seconds.",
      "confidence": "high"
    }
  ],
  "copy_rewrites": {
    "headline": "Get a ranked conversion audit in 90 seconds",
    "subheadline": "Paste your URL. 210 checks. Structured JSON back.",
    "cta": "Run Free Diagnostic"
  },
  "growth_blueprint": [
    {
      "priority": 1,
      "action": "Rewrite hero headline to outcome-led copy",
      "effort": "High",
      "impact": "15-25%",
      "timeframe": "Week 1"
    }
  ],
  "metadata": {
    "word_count": 847,
    "cta_count": 3,
    "tech_stack": ["WebPage", "Organization"]
  }
}`;

const USE_CASES = [
  {
    title: "Cold email enrichment",
    desc: "Score a prospect's site, pull top finding, personalize outreach at scale.",
    snippet: 'const { score, findings } = await scan(domain)\n// → "Your hero has no CTA above fold"',
  },
  {
    title: "CRM integration",
    desc: "Attach conversion scores to every contact record automatically.",
    snippet: 'crm.update(contactId, {\n  webdoc_score: data.score\n})',
  },
  {
    title: "Website builders",
    desc: "Surface conversion issues inline as users build their pages.",
    snippet: 'const audit = await scan(previewUrl)\nshowWarnings(audit.findings)',
  },
  {
    title: "AI agents",
    desc: "Add website scanning as a tool call. Claude, GPT, any agent.",
    snippet: '// Claude tool_use block\n{ name: "scan_website",\n  input: { url } }',
  },
  {
    title: "Shopify apps",
    desc: "Audit merchant stores and surface revenue opportunities automatically.",
    snippet: 'const report = await scan(shopDomain)\n// 210 checks in 90s',
  },
  {
    title: "Website monitoring",
    desc: "Re-scan on deploy, alert when conversion score drops.",
    snippet: 'if (report.score < prev.score - 5) {\n  notify("Score dropped")\n}',
  },
];

export default function HomePage() {
  const [expandedResponse, setExpandedResponse] = useState(false);

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px 100px", textAlign: "center" }}>
        <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.22em", marginBottom: 20 }}>
          WEBSITE INTELLIGENCE API
        </p>
        <h1 style={{ fontFamily: SG, fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, color: TEXT, lineHeight: 1.02, letterSpacing: "-2px", marginBottom: 24 }}>
          Website Intelligence API
        </h1>
        <p style={{ fontFamily: SG, fontSize: "clamp(16px, 2vw, 21px)", color: MUTED, maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.6 }}>
          Send a URL. Get a complete conversion audit in 90 seconds.
          Structured JSON. Ready to integrate into anything.
        </p>

        {/* Hero code block */}
        <div style={{ maxWidth: 680, margin: "0 auto 48px", textAlign: "left" }}>
          <pre style={{
            background: "rgba(0,0,0,0.6)",
            border: `1px solid ${BORDER}`,
            borderLeft: `3px solid ${CYAN}`,
            borderRadius: 4,
            padding: "24px 28px",
            fontFamily: SM,
            fontSize: 13,
            color: TEXT,
            overflowX: "auto",
            margin: 0,
            lineHeight: 1.7,
          }}>
            {CURL_HERO}
          </pre>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signup"
            style={{
              background: CYAN,
              color: BG,
              borderRadius: 4,
              padding: "16px 40px",
              fontFamily: SM,
              fontSize: 13,
              letterSpacing: "0.15em",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            GET API KEY →
          </Link>
          <Link
            href="/docs"
            style={{
              background: "transparent",
              color: CYAN,
              border: `1px solid rgba(0,200,255,0.4)`,
              borderRadius: 4,
              padding: "16px 40px",
              fontFamily: SM,
              fontSize: 13,
              letterSpacing: "0.15em",
              textDecoration: "none",
            }}
          >
            VIEW DOCS
          </Link>
        </div>
      </section>

      {/* ── 2. THREE LANES ──────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[
            {
              label: "DEVELOPERS",
              body: "Integrate conversion intelligence into your product. REST API, clean JSON, webhooks.",
              cta: "View docs →",
              href: "/docs",
            },
            {
              label: "AGENCIES",
              body: "White-label audit reports for prospects and clients. No code required.",
              cta: "Open dashboard →",
              href: "/dashboard",
            },
            {
              label: "AI AGENTS",
              body: "Add website scanning as a tool call to any agent or automation workflow.",
              cta: "View docs →",
              href: "/docs",
            },
          ].map((lane, i) => (
            <div
              key={lane.label}
              style={{
                padding: "48px 40px",
                borderRight: i < 2 ? `1px solid ${BORDER}` : "none",
              }}
            >
              <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 20 }}>{lane.label}</p>
              <p style={{ fontFamily: SG, fontSize: 16, color: MUTED, lineHeight: 1.7, marginBottom: 24 }}>{lane.body}</p>
              <Link href={lane.href} style={{ fontFamily: SM, fontSize: 12, color: CYAN, textDecoration: "none", letterSpacing: "0.1em" }}>
                {lane.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. LIVE RESPONSE PREVIEW ────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 24px" }}>
        <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 16 }}>RESPONSE SHAPE</p>
        <h2 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, marginBottom: 48, letterSpacing: "-1px" }}>
          See exactly what you get back
        </h2>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: "rgba(0,0,0,0.4)" }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.15em", margin: 0 }}>POST /v1/scan → 200 OK</p>
            <button
              onClick={() => setExpandedResponse(!expandedResponse)}
              style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "4px 12px", fontFamily: SM, fontSize: 11, color: MUTED, cursor: "pointer" }}
            >
              {expandedResponse ? "COLLAPSE ▲" : "EXPAND FULL RESPONSE ▼"}
            </button>
          </div>
          <pre style={{ padding: "24px 28px", fontFamily: SM, fontSize: 13, color: TEXT, margin: 0, overflowX: "auto", lineHeight: 1.7 }}>
            {expandedResponse ? RESPONSE_FULL : RESPONSE_PREVIEW}
          </pre>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Link
            href="/playground"
            style={{ background: CYAN, color: BG, borderRadius: 4, padding: "12px 28px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", textDecoration: "none" }}
          >
            TRY IT LIVE →
          </Link>
        </div>
      </section>

      {/* ── 4. USE CASES ────────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${BORDER}`, padding: "100px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 16 }}>USE CASES</p>
          <h2 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, marginBottom: 56, letterSpacing: "-1px" }}>
            Plug in anywhere
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {USE_CASES.map(uc => (
              <div key={uc.title} style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, background: CARD }}>
                <p style={{ fontFamily: SG, fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{uc.title}</p>
                <p style={{ fontFamily: SG, fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>{uc.desc}</p>
                <pre style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "12px 16px", fontFamily: SM, fontSize: 11, color: "#79c0ff", margin: 0, overflowX: "auto", lineHeight: 1.6 }}>
                  {uc.snippet}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PRICING ──────────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${BORDER}`, padding: "100px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 16 }}>PRICING</p>
          <h2 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, marginBottom: 56, letterSpacing: "-1px" }}>
            Start free. Scale as you grow.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 800 }}>

            {/* API tier */}
            <div style={{ border: `1px solid rgba(0,200,255,0.3)`, borderRadius: 4, padding: 40, background: CARD }}>
              <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.18em", marginBottom: 16 }}>API</p>
              <p style={{ fontFamily: SG, fontSize: 14, color: MUTED, marginBottom: 8 }}>Pay per scan</p>
              <p style={{ fontFamily: SM, fontSize: 40, color: TEXT, marginBottom: 4 }}>$0.05</p>
              <p style={{ fontFamily: SM, fontSize: 13, color: MUTED, marginBottom: 8 }}>per scan</p>
              <p style={{ fontFamily: SG, fontSize: 14, color: "#22c55e", marginBottom: 32 }}>Free to start · No monthly minimum</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
                {["REST API access", "Structured JSON response", "Webhooks", "210 checks per scan", "Pay only for what you use"].map(f => (
                  <li key={f} style={{ fontFamily: SM, fontSize: 13, color: MUTED, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: CYAN }}>—</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                style={{ display: "block", textAlign: "center", background: CYAN, color: BG, borderRadius: 4, padding: "14px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", textDecoration: "none" }}
              >
                GET API KEY →
              </Link>
            </div>

            {/* Dashboard tier */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 40, background: CARD }}>
              <p style={{ fontFamily: SM, fontSize: 11, color: MUTED, letterSpacing: "0.18em", marginBottom: 16 }}>DASHBOARD</p>
              <p style={{ fontFamily: SG, fontSize: 14, color: MUTED, marginBottom: 8 }}>Agencies</p>
              <p style={{ fontFamily: SM, fontSize: 40, color: TEXT, marginBottom: 4 }}>$99</p>
              <p style={{ fontFamily: SM, fontSize: 13, color: MUTED, marginBottom: 8 }}>/month</p>
              <p style={{ fontFamily: SG, fontSize: 14, color: MUTED, marginBottom: 32 }}>50 scans included</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
                {["Full dashboard UI", "White-label reports", "PDF export", "50 scans/month", "Priority support"].map(f => (
                  <li key={f} style={{ fontFamily: SM, fontSize: 13, color: MUTED, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: MUTED }}>—</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                style={{ display: "block", textAlign: "center", background: "transparent", color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "14px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", textDecoration: "none" }}
              >
                START FREE TRIAL →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. DOCS PREVIEW ─────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${BORDER}`, padding: "100px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 16 }}>API REFERENCE</p>
          <h2 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, marginBottom: 40, letterSpacing: "-1px" }}>
            Clean, documented endpoints
          </h2>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: CARD, padding: "8px 0", marginBottom: 32 }}>
            {[
              { method: "POST", path: "/v1/scan", desc: "Run a full conversion audit on any URL" },
              { method: "GET", path: "/v1/scans", desc: "List all scans for your API key" },
              { method: "GET", path: "/v1/scans/:id", desc: "Retrieve a single scan by ID" },
              { method: "POST", path: "/v1/webhooks", desc: "Register a webhook endpoint" },
              { method: "GET", path: "/v1/webhooks", desc: "List registered webhooks" },
              { method: "DELETE", path: "/v1/webhooks", desc: "Remove a webhook" },
            ].map((ep, i) => (
              <div
                key={ep.path + ep.method}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "14px 28px",
                  borderBottom: i < 5 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <span style={{
                  fontFamily: SM,
                  fontSize: 11,
                  color: ep.method === "POST" ? CYAN : ep.method === "DELETE" ? "#ef4444" : "#22c55e",
                  minWidth: 50,
                }}>
                  {ep.method}
                </span>
                <span style={{ fontFamily: SM, fontSize: 13, color: TEXT, minWidth: 180 }}>{ep.path}</span>
                <span style={{ fontFamily: SG, fontSize: 14, color: MUTED }}>{ep.desc}</span>
              </div>
            ))}
          </div>
          <Link
            href="/docs"
            style={{ background: "transparent", color: CYAN, border: `1px solid rgba(0,200,255,0.4)`, borderRadius: 4, padding: "14px 32px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", textDecoration: "none", display: "inline-block" }}
          >
            VIEW FULL DOCUMENTATION →
          </Link>
        </div>
      </section>

    </div>
  );
}
