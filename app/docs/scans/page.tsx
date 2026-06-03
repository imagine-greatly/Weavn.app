"use client";
import DocsLayout from "@/app/docs/_components/DocsLayout";

const SM = "'Space Mono', monospace";
const SG = "'Space Grotesk', sans-serif";
const CYAN = "#00C8FF";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(240,244,255,0.4)";
const TEXT = "#F0F4FF";

function CodeBlock({ code }: { code: string }) {
  return (
    <pre style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${CYAN}`, borderRadius: 4, padding: "18px 22px", fontFamily: SM, fontSize: 13, color: TEXT, overflowX: "auto", margin: "0 0 32px", lineHeight: 1.7 }}>
      {code}
    </pre>
  );
}

export default function ScansDocsPage() {
  return (
    <DocsLayout activeId="scans">
      <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 12 }}>API REFERENCE</p>
      <h1 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, letterSpacing: "-1.2px", marginBottom: 40 }}>Scans</h1>

      {/* List */}
      <div style={{ border: `1px solid ${BORDER}`, borderLeft: `3px solid ${CYAN}`, borderRadius: 4, padding: "16px 24px", marginBottom: 32, fontFamily: SM, fontSize: 13, color: MUTED }}>
        <span style={{ color: "#22c55e" }}>GET</span> https://webdocai.com/api/v1/scans
      </div>
      <p style={{ fontFamily: SG, fontSize: 15, color: MUTED, lineHeight: 1.7, marginBottom: 24 }}>List all scans made with your API key. Supports pagination.</p>

      <h2 style={{ fontFamily: SG, fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Query parameters</h2>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SM, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
              {["Parameter", "Default", "Max", "Description"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: MUTED, fontWeight: 400 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <td style={{ padding: "12px 20px", color: CYAN }}>limit</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>20</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>100</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>Number of results to return</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 20px", color: CYAN }}>offset</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>0</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>—</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>Number of results to skip</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ fontFamily: SG, fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Response</h2>
      <CodeBlock code={`{
  "scans": [
    {
      "id": "c4f1a2b3-...",
      "url": "https://example.com",
      "score": 54,
      "verdict": "Needs Work",
      "scanned_at": "2026-06-02T12:00:00Z"
    }
  ],
  "total": 47,
  "limit": 20,
  "offset": 0
}`} />

      {/* Single */}
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 48, marginTop: 16 }}>
        <div style={{ border: `1px solid ${BORDER}`, borderLeft: `3px solid ${CYAN}`, borderRadius: 4, padding: "16px 24px", marginBottom: 32, fontFamily: SM, fontSize: 13, color: MUTED }}>
          <span style={{ color: "#22c55e" }}>GET</span> https://webdocai.com/api/v1/scans/:id
        </div>
        <p style={{ fontFamily: SG, fontSize: 15, color: MUTED, lineHeight: 1.7, marginBottom: 24 }}>
          Retrieve a single scan by ID. Returns the same shape as POST /v1/scan. Returns 404 if the scan does not exist or belongs to a different API key.
        </p>
        <h2 style={{ fontFamily: SG, fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Path parameters</h2>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SM, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
                {["Parameter", "Type", "Description"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: MUTED, fontWeight: 400 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "12px 20px", color: CYAN }}>id</td>
                <td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>UUID string</td>
                <td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>The scan ID returned by POST /v1/scan</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h2 style={{ fontFamily: SG, fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Error codes</h2>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SM, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
                {["Status", "Meaning"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: MUTED, fontWeight: 400 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <td style={{ padding: "12px 20px", color: "#ef4444" }}>401</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>Invalid API key</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 20px", color: "#f59e0b" }}>404</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>Scan not found or belongs to different key</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DocsLayout>
  );
}
