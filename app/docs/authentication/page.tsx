"use client";
import DocsLayout from "@/app/docs/_components/DocsLayout";

// Canonical monochrome tokens. Purple (#9D8CFF) rationed to links; signal colors
// from lib/verdict band hex. IBM Plex Mono (code/labels), IBM Plex Sans (body),
// Space Grotesk (headings). No Space Mono, no cyan, no border-radius.
const MONO = "'IBM Plex Mono', monospace";
const DISP = "'Space Grotesk', sans-serif";
const BODY = "'IBM Plex Sans', sans-serif";
const BORDER = "rgba(255,255,255,0.08)";
const BG_S = "#0A0E18";
const ACCENT = "#9D8CFF";   // purple — links only
const CODE = "#6F9BC6";     // restrained blue — inline code tokens
const T1 = "#E6E9EE";
const T2 = "#9398A8";
const T3 = "#6E7587";
const SEV_RED = "#E8635F";
const SEV_AMBER = "#EFB23E";

const codeChip: React.CSSProperties = { fontFamily: MONO, color: CODE, background: "rgba(255,255,255,0.05)", padding: "2px 6px" };

export default function AuthenticationPage() {
  return (
    <DocsLayout activeId="authentication">
      <section id="authentication" className="mb-16 scroll-mt-24">
        <p style={{ fontFamily: MONO, fontSize: 11, color: T3, letterSpacing: "0.2em", marginBottom: 12 }}>API REFERENCE</p>
        <h1 style={{ fontFamily: DISP, fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: T1, letterSpacing: "-1.5px", lineHeight: 1.02, marginBottom: 24 }}>
          Authentication
        </h1>
        <p style={{ fontFamily: BODY, fontSize: 16, color: T2, lineHeight: 1.8, marginBottom: 40, maxWidth: 680 }}>
          All API requests must include a valid API key as a Bearer token in the Authorization header. Keys are generated from your developer portal.
        </p>

        <h2 style={{ fontFamily: DISP, fontSize: 22, fontWeight: 700, color: T1, marginBottom: 16 }}>Bearer token format</h2>
        <pre style={{ background: BG_S, border: `1px solid ${BORDER}`, padding: "20px 24px", fontFamily: MONO, fontSize: 13, color: T1, marginBottom: 32, overflowX: "auto", lineHeight: 1.7 }}>
          {`Authorization: Bearer weavn_live_<32-hex-chars>`}
        </pre>

        <h2 style={{ fontFamily: DISP, fontSize: 22, fontWeight: 700, color: T1, marginBottom: 16 }}>Where to find your key</h2>
        <p style={{ fontFamily: BODY, fontSize: 15, color: T2, lineHeight: 1.8, marginBottom: 32 }}>
          Your API key is generated at <a href="/console/keys" style={{ color: ACCENT, textDecoration: "none" }}>/console/keys</a> after account creation.
          The full key is displayed <strong style={{ color: T1 }}>exactly once</strong> — copy it immediately.
          Only the key hash is stored; the plaintext cannot be recovered. Use the Regenerate function in the developer portal to rotate a lost key.
        </p>

        <h2 style={{ fontFamily: DISP, fontSize: 22, fontWeight: 700, color: T1, marginBottom: 16 }}>Key rotation</h2>
        <p style={{ fontFamily: BODY, fontSize: 15, color: T2, lineHeight: 1.8, marginBottom: 8 }}>
          Send a <code style={codeChip}>DELETE</code> request to <code style={codeChip}>/api/developer/generate-key</code> (requires active session).
          The old key deactivates immediately and a new key is returned once.
        </p>

        <h2 style={{ fontFamily: DISP, fontSize: 22, fontWeight: 700, color: T1, marginTop: 40, marginBottom: 16 }}>Error responses</h2>
        <div style={{ border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
                {["Status", "Code", "Meaning"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: T3, fontWeight: 400 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody style={{ color: T2 }}>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "12px 20px", color: SEV_RED }}>401</td>
                <td style={{ padding: "12px 20px" }}>Invalid API key</td>
                <td style={{ padding: "12px 20px" }}>Missing, malformed, or inactive Bearer token</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 20px", color: SEV_AMBER }}>403</td>
                <td style={{ padding: "12px 20px" }}>Scan limit reached</td>
                <td style={{ padding: "12px 20px" }}>Plan limit exceeded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </DocsLayout>
  );
}
