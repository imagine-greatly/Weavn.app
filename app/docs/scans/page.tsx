"use client";
import DocsLayout from "@/app/docs/_components/DocsLayout";
import { CodeBlock } from "@/components/ui/CodeBlock";

// Canonical monochrome tokens (cyan/Space Mono purged, zero radius). Code blocks use
// the shared CodeBlock (same restrained syntax tinting as the console Overview curl).
const MONO = "'IBM Plex Mono', monospace";
const DISP = "'Space Grotesk', sans-serif";
const BODY = "'IBM Plex Sans', sans-serif";
const BORDER = "rgba(255,255,255,0.08)";
const CODE = "#6F9BC6";     // restrained blue — param names + GET method
const SEV_RED = "#E8635F";
const SEV_AMBER = "#EFB23E";
const T1 = "#E6E9EE";
const T2 = "#9398A8";
const T3 = "#6E7587";

export default function ScansDocsPage() {
  return (
    <DocsLayout activeId="scans">
      <p style={{ fontFamily: MONO, fontSize: 11, color: T3, letterSpacing: "0.2em", marginBottom: 12 }}>API REFERENCE</p>
      <h1 style={{ fontFamily: DISP, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: T1, letterSpacing: "-1.2px", marginBottom: 40 }}>Scans</h1>

      {/* List */}
      <div style={{ border: `1px solid ${BORDER}`, padding: "16px 24px", marginBottom: 32, fontFamily: MONO, fontSize: 13, color: T2 }}>
        <span style={{ color: CODE }}>GET</span> https://api.weavn.app/v1/scans
      </div>
      <p style={{ fontFamily: BODY, fontSize: 15, color: T2, lineHeight: 1.7, marginBottom: 24 }}>List all scans made with your API key. Supports pagination.</p>

      <h2 style={{ fontFamily: DISP, fontSize: 18, fontWeight: 700, color: T1, marginBottom: 12 }}>Query parameters</h2>
      <div style={{ border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
              {["Parameter", "Default", "Max", "Description"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: T3, fontWeight: 400 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "12px 20px", color: CODE }}>limit</td><td style={{ padding: "12px 20px", color: T2 }}>20</td><td style={{ padding: "12px 20px", color: T2 }}>100</td><td style={{ padding: "12px 20px", color: T2 }}>Number of results to return</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 20px", color: CODE }}>offset</td><td style={{ padding: "12px 20px", color: T2 }}>0</td><td style={{ padding: "12px 20px", color: T2 }}>—</td><td style={{ padding: "12px 20px", color: T2 }}>Number of results to skip</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ fontFamily: DISP, fontSize: 18, fontWeight: 700, color: T1, marginBottom: 12 }}>Response</h2>
      <div style={{ marginBottom: 32 }}>
        <CodeBlock language="json" code={`{
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
      </div>

      {/* Single */}
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 48, marginTop: 16 }}>
        <div style={{ border: `1px solid ${BORDER}`, padding: "16px 24px", marginBottom: 32, fontFamily: MONO, fontSize: 13, color: T2 }}>
          <span style={{ color: CODE }}>GET</span> https://api.weavn.app/v1/scans/:id
        </div>
        <p style={{ fontFamily: BODY, fontSize: 15, color: T2, lineHeight: 1.7, marginBottom: 24 }}>
          Retrieve a single scan by ID. Returns the same shape as POST /v1/scan. Returns 404 if the scan does not exist or belongs to a different API key.
        </p>
        <h2 style={{ fontFamily: DISP, fontSize: 18, fontWeight: 700, color: T1, marginBottom: 12 }}>Path parameters</h2>
        <div style={{ border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
                {["Parameter", "Type", "Description"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: T3, fontWeight: 400 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "12px 20px", color: CODE }}>id</td>
                <td style={{ padding: "12px 20px", color: T2 }}>UUID string</td>
                <td style={{ padding: "12px 20px", color: T2 }}>The scan ID returned by POST /v1/scan</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h2 style={{ fontFamily: DISP, fontSize: 18, fontWeight: 700, color: T1, marginBottom: 12 }}>Error codes</h2>
        <div style={{ border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
                {["Status", "Meaning"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: T3, fontWeight: 400 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "12px 20px", color: SEV_RED }}>401</td><td style={{ padding: "12px 20px", color: T2 }}>Invalid API key</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 20px", color: SEV_AMBER }}>404</td><td style={{ padding: "12px 20px", color: T2 }}>Scan not found or belongs to different key</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DocsLayout>
  );
}
