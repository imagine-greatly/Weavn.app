"use client";

import { useState } from "react";
import Link from "next/link";

const SM = "'Space Mono', 'Courier New', monospace";
const SG = "'Space Grotesk', sans-serif";
const CYAN = "#00C8FF";
const BG = "#050810";
const CARD = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(240,244,255,0.4)";
const TEXT = "#F0F4FF";

const EXAMPLE_RESPONSE = {
  id: "c4f1a2b3-...",
  url: "https://example.com",
  score: 54,
  verdict: "Needs Work",
  scanned_at: "2026-06-02T12:00:00Z",
  pages_scanned: 1,
  dimensions: {
    conversion_architecture: 48,
    trust_signals: 62,
    message_clarity: 41,
    traffic_readiness: 58,
    technical_foundation: 71,
  },
  summary: "The homepage lacks a clear value proposition above the fold. Primary CTA is buried below testimonials. Trust signals are present but poorly positioned relative to the commitment step.",
  findings: [
    { id: "finding_001", title: "Hero headline does not communicate outcome", severity: "critical", dimension: "Message Clarity", impact: "15-25% conversion suppression", explanation: "The current headline 'Welcome to our platform' communicates no outcome or audience.", recommendation: "Replace with outcome-led headline naming the visitor job-to-be-done.", confidence: "high" },
    { id: "finding_002", title: "Primary CTA below fold on mobile", severity: "critical", dimension: "Conversion Architecture", impact: "12-18% drop in mobile conversions", explanation: "The main CTA button is not visible without scrolling on 375px viewport.", recommendation: "Move CTA into the hero section above the fold.", confidence: "high" },
  ],
  copy_rewrites: { headline: "Get a ranked conversion audit in 90 seconds", subheadline: "Paste your URL. We scan 210 checks across 8 dimensions.", cta: "Run Free Diagnostic" },
  growth_blueprint: [{ priority: 1, action: "Rewrite hero headline to outcome-led copy", effort: "High", impact: "15-25%", timeframe: "Week 1" }],
  metadata: { word_count: 847, cta_count: 3, tech_stack: ["WebPage"] },
};

function syntaxColor(key: string, value: unknown): string {
  if (typeof value === "number") return "#79c0ff";
  if (typeof value === "boolean") return "#ff7b72";
  if (value === null) return "#8b949e";
  if (typeof value === "string") return "#a5d6ff";
  return TEXT;
}

function JsonLine({ indent, k, v, collapsed, onClick }: { indent: number; k?: string; v: unknown; collapsed?: boolean; onClick?: () => void }) {
  const pad = "  ".repeat(indent);
  const keyStr = k !== undefined ? <span style={{ color: "#8b949e" }}>"{k}": </span> : null;

  if (typeof v === "object" && v !== null) {
    const isArray = Array.isArray(v);
    const openBracket = isArray ? "[" : "{";
    const closeBracket = isArray ? "]" : "}";
    const preview = isArray ? `[${(v as unknown[]).length} items]` : `{...}`;

    return (
      <div>
        <span
          onClick={onClick}
          style={{ cursor: onClick ? "pointer" : "default", display: "block", whiteSpace: "pre" }}
        >
          {pad}{keyStr}{collapsed ? <span style={{ color: CYAN }}>{preview}</span> : openBracket}
        </span>
        {!collapsed && (
          <>
            {isArray
              ? (v as unknown[]).map((item, i) => (
                  <JsonLine key={i} indent={indent + 1} v={item} />
                ))
              : Object.entries(v as Record<string, unknown>).map(([ik, iv]) => (
                  <JsonLine key={ik} indent={indent + 1} k={ik} v={iv} />
                ))
            }
            <span style={{ display: "block", whiteSpace: "pre" }}>{pad}{closeBracket}</span>
          </>
        )}
      </div>
    );
  }

  const valStr = typeof v === "string" ? `"${v}"` : String(v);
  return (
    <span style={{ display: "block", whiteSpace: "pre" }}>
      {pad}{keyStr}<span style={{ color: syntaxColor(k ?? "", v) }}>{valStr}</span>
    </span>
  );
}

function JsonBlock({ data, collapsedKeys }: { data: Record<string, unknown>; collapsedKeys: Set<string> }) {
  return (
    <pre style={{ margin: 0, fontFamily: SM, fontSize: 12, lineHeight: 1.7, overflowX: "auto", color: TEXT }}>
      {"{"}
      {Object.entries(data).map(([k, v]) => (
        <JsonLine key={k} indent={1} k={k} v={v} collapsed={collapsedKeys.has(k)} />
      ))}
      {"}"}
    </pre>
  );
}

export default function PlaygroundPage() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set(["findings", "growth_blueprint"]));
  const [showExample, setShowExample] = useState(true);

  const score = (result?.score ?? null) as number | null;
  const verdict = (result?.verdict ?? null) as string | null;

  function scoreColor(s: number) {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return CYAN;
    if (s >= 40) return "#f59e0b";
    return "#ef4444";
  }

  async function handleScan() {
    if (!url.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);
    setShowExample(false);

    try {
      const res = await fetch("/api/playground/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setError(data.message ?? "Rate limit reached. Try again in 60 minutes.");
      } else if (!res.ok) {
        setError(data.error ?? "Scan failed. Please try again.");
      } else {
        setResult(data);
        setCollapsedKeys(new Set(["findings", "growth_blueprint"]));
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setScanning(false);
  }

  function toggleKey(k: string) {
    setCollapsedKeys(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const displayData = showExample ? EXAMPLE_RESPONSE as unknown as Record<string, unknown> : result;

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 12 }}>LIVE DEMO</p>
          <h1 style={{ fontFamily: SG, fontSize: 42, fontWeight: 700, color: TEXT, marginBottom: 12 }}>
            Try the API
          </h1>
          <p style={{ fontFamily: SG, fontSize: 17, color: MUTED, maxWidth: 480, margin: "0 auto" }}>
            Paste any URL to get a live conversion audit. No account required.
          </p>
        </div>

        {/* Two column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

          {/* LEFT — Input */}
          <div>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 32, background: CARD }}>
              <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.18em", marginBottom: 20 }}>SCAN URL</p>

              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.4)",
                  border: `1px solid ${scanning ? CYAN : BORDER}`,
                  borderRadius: 4,
                  padding: "14px 16px",
                  fontFamily: SM,
                  fontSize: 14,
                  color: TEXT,
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 16,
                  transition: "border-color 0.2s",
                }}
              />

              <button
                onClick={handleScan}
                disabled={scanning || !url.trim()}
                style={{
                  width: "100%",
                  background: scanning || !url.trim() ? "rgba(0,200,255,0.3)" : CYAN,
                  color: BG,
                  border: "none",
                  borderRadius: 4,
                  padding: "16px",
                  fontFamily: SM,
                  fontSize: 13,
                  letterSpacing: "0.15em",
                  cursor: scanning || !url.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {scanning ? "ANALYZING..." : "RUN SCAN →"}
              </button>

              {/* Beam animation while scanning */}
              {scanning && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ position: "relative", height: 2, background: "rgba(0,200,255,0.15)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: "40%",
                      background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`,
                      animation: "beam 1.5s linear infinite",
                    }} />
                  </div>
                  <p style={{ fontFamily: SM, fontSize: 12, color: CYAN, textAlign: "center", letterSpacing: "0.1em" }}>
                    RUNNING 210 CHECKS...
                  </p>
                  <style>{`@keyframes beam { 0% { transform: translateX(-150%) } 100% { transform: translateX(350%) } }`}</style>
                </div>
              )}

              {error && (
                <div style={{ marginTop: 20, border: "1px solid rgba(239,68,68,0.3)", borderLeft: "3px solid #ef4444", borderRadius: 4, padding: "12px 16px" }}>
                  <p style={{ fontFamily: SM, fontSize: 12, color: "#ef4444", margin: 0, lineHeight: 1.6 }}>{error}</p>
                  {error.includes("60 minutes") && (
                    <Link href="/signup" style={{ display: "inline-block", marginTop: 8, fontFamily: SM, fontSize: 11, color: CYAN, textDecoration: "none" }}>
                      Get your own API key →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Output */}
          <div>
            {/* Score display */}
            {score !== null && verdict !== null && (
              <div style={{ border: "1px solid rgba(0,200,255,0.2)", borderRadius: 4, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20, background: CARD }}>
                <div>
                  <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.15em", margin: 0, marginBottom: 4 }}>WEBDOC SCORE</p>
                  <p style={{ fontFamily: SM, fontSize: 48, fontWeight: 700, color: scoreColor(score), margin: 0, lineHeight: 1 }}>{score}</p>
                  <p style={{ fontFamily: SM, fontSize: 11, color: MUTED, margin: 0, marginTop: 4 }}>/100</p>
                </div>
                <div>
                  <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.15em", margin: 0, marginBottom: 4 }}>VERDICT</p>
                  <p style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: scoreColor(score), margin: 0 }}>{verdict}</p>
                </div>
              </div>
            )}

            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: "rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.15em", margin: 0 }}>
                  {showExample ? "EXAMPLE RESPONSE" : "API RESPONSE"}
                </p>
                {displayData && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {["findings", "growth_blueprint"].map(k => (
                      <button
                        key={k}
                        onClick={() => toggleKey(k)}
                        style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "3px 8px", fontFamily: SM, fontSize: 10, color: MUTED, cursor: "pointer" }}
                      >
                        {collapsedKeys.has(k) ? `▶ ${k}` : `▼ ${k}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: "20px 24px", maxHeight: 520, overflowY: "auto" }}>
                {displayData ? (
                  <JsonBlock data={displayData} collapsedKeys={collapsedKeys} />
                ) : (
                  <p style={{ fontFamily: SM, fontSize: 12, color: MUTED, margin: 0 }}>
                    Run a scan to see the response.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", marginTop: 72, padding: "48px 0", borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontFamily: SG, fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
            Integrate this into your product
          </p>
          <p style={{ fontFamily: SG, fontSize: 15, color: MUTED, marginBottom: 32 }}>
            Full API access, structured JSON, webhooks, 210 checks per scan.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link
              href="/signup"
              style={{ background: CYAN, color: BG, borderRadius: 4, padding: "14px 32px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", textDecoration: "none" }}
            >
              GET API KEY →
            </Link>
            <Link
              href="/docs"
              style={{ background: "transparent", color: CYAN, border: `1px solid rgba(0,200,255,0.4)`, borderRadius: 4, padding: "14px 32px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", textDecoration: "none" }}
            >
              VIEW DOCUMENTATION
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
