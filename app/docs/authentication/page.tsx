"use client";
import DocsLayout from "@/app/docs/_components/DocsLayout";

export default function AuthenticationPage() {
  return (
    <DocsLayout activeId="authentication">
      <section id="authentication" className="mb-16 scroll-mt-24">
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "var(--cyan)", letterSpacing: "0.2em", marginBottom: 12 }}>API REFERENCE</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-1.5px", lineHeight: 1.02, marginBottom: 24 }}>
          Authentication
        </h1>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 40, maxWidth: 680 }}>
          All API requests must include a valid API key as a Bearer token in the Authorization header. Keys are generated from your developer portal.
        </p>

        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Bearer token format</h2>
        <pre style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "3px solid var(--cyan)", borderRadius: 4, padding: "20px 24px", fontFamily: "'Space Mono', monospace", fontSize: 13, color: "var(--text-primary)", marginBottom: 32, overflowX: "auto", lineHeight: 1.7 }}>
          {`Authorization: Bearer wdoc_live_<32-hex-chars>`}
        </pre>

        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Where to find your key</h2>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 32 }}>
          Your API key is generated at <a href="/developer/keys" style={{ color: "var(--cyan)" }}>/developer/keys</a> after account creation.
          The full key is displayed <strong style={{ color: "var(--text-primary)" }}>exactly once</strong> — copy it immediately.
          Only the key hash is stored; the plaintext cannot be recovered. Use the Regenerate function in the developer portal to rotate a lost key.
        </p>

        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Key rotation</h2>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 8 }}>
          Send a <code style={{ fontFamily: "'Space Mono', monospace", color: "var(--cyan)", background: "rgba(0,200,255,0.08)", padding: "2px 6px", borderRadius: 3 }}>DELETE</code> request to <code style={{ fontFamily: "'Space Mono', monospace", color: "var(--cyan)", background: "rgba(0,200,255,0.08)", padding: "2px 6px", borderRadius: 3 }}>/api/developer/generate-key</code> (requires active session).
          The old key deactivates immediately and a new key is returned once.
        </p>

        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginTop: 40, marginBottom: 16 }}>Error responses</h2>
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                {["Status", "Code", "Meaning"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: "rgba(240,244,255,0.4)", fontWeight: 400 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-secondary)" }}>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "12px 20px", color: "#ef4444" }}>401</td>
                <td style={{ padding: "12px 20px" }}>Invalid API key</td>
                <td style={{ padding: "12px 20px" }}>Missing, malformed, or inactive Bearer token</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 20px", color: "#f59e0b" }}>403</td>
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
