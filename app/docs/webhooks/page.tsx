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

export default function WebhooksDocsPage() {
  return (
    <DocsLayout activeId="webhooks">
      <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 12 }}>API REFERENCE</p>
      <h1 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, letterSpacing: "-1.2px", marginBottom: 24 }}>Webhooks</h1>
      <p style={{ fontFamily: SG, fontSize: 16, color: MUTED, lineHeight: 1.8, marginBottom: 48 }}>
        Receive a POST request to your server when a scan completes. Each delivery is signed with HMAC-SHA256 so you can verify it came from webdoc.ai.
      </p>

      {/* Events */}
      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Events</h2>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginBottom: 40 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SM, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
              {["Event", "When it fires"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: MUTED, fontWeight: 400 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <td style={{ padding: "12px 20px", color: CYAN }}>scan.completed</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>Scan finished and report saved successfully</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 20px", color: CYAN }}>scan.failed</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>Scan encountered an unrecoverable error</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payload */}
      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Payload</h2>
      <CodeBlock code={`{
  "event": "scan.completed",
  "scan_id": "c4f1a2b3-...",
  "url": "https://example.com",
  "score": 54,
  "data": {
    "domain": "example.com",
    "verdict": "Needs Work"
  }
}`} />

      {/* Headers */}
      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Request headers</h2>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginBottom: 40 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SM, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
              {["Header", "Value"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: MUTED, fontWeight: 400 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <td style={{ padding: "12px 20px", color: CYAN }}>Content-Type</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>application/json</td>
            </tr>
            <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <td style={{ padding: "12px 20px", color: CYAN }}>X-WebDoc-Event</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>The event type (e.g., scan.completed)</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 20px", color: CYAN }}>X-WebDoc-Signature</td><td style={{ padding: "12px 20px", color: "var(--text-secondary)" }}>HMAC-SHA256 hex of the request body using your webhook secret</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature verification */}
      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Verifying signatures</h2>
      <CodeBlock code={`import { createHmac } from "crypto"

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("hex")
  return expected === signature
}

// In your route handler:
const body = await request.text()
const sig = request.headers.get("x-webdoc-signature") ?? ""
if (!verifyWebhook(body, sig, process.env.WEBHOOK_SECRET!)) {
  return new Response("Unauthorized", { status: 401 })
}
const payload = JSON.parse(body)`} />

      {/* Endpoint management */}
      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Managing webhook endpoints</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
        {[
          { method: "POST", desc: "Register a new webhook endpoint. Returns the secret once." },
          { method: "GET", desc: "List all registered webhooks. Secret is never returned in list." },
          { method: "DELETE", desc: "Remove a webhook by ID." },
        ].map(ep => (
          <div key={ep.method} style={{ border: `1px solid ${BORDER}`, borderLeft: `3px solid ${CYAN}`, borderRadius: 4, padding: "14px 20px", display: "flex", gap: 20, alignItems: "center" }}>
            <span style={{ fontFamily: SM, fontSize: 12, color: ep.method === "DELETE" ? "#ef4444" : ep.method === "GET" ? "#22c55e" : CYAN, minWidth: 56 }}>{ep.method}</span>
            <span style={{ fontFamily: SM, fontSize: 13, color: MUTED, minWidth: 140 }}>/api/v1/webhooks</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "var(--text-secondary)" }}>{ep.desc}</span>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: SG, fontSize: 14, color: MUTED }}>
        The webhook secret is returned <strong style={{ color: TEXT }}>once</strong> when you register the endpoint.
        Store it securely — it cannot be retrieved later. Delete and re-register to rotate a lost secret.
      </p>
    </DocsLayout>
  );
}
