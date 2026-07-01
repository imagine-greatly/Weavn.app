"use client";
import DocsLayout from "@/app/docs/_components/DocsLayout";
import { CodeBlock } from "@/components/ui/CodeBlock";

// Canonical monochrome tokens (cyan/Space Mono purged, zero radius). Method colors are
// the one rationed signal (POST green, GET blue, DELETE red — from lib/verdict bands).
const MONO = "'IBM Plex Mono', monospace";
const DISP = "'Space Grotesk', sans-serif";
const BODY = "'IBM Plex Sans', sans-serif";
const BORDER = "rgba(255,255,255,0.08)";
const CODE = "#6F9BC6";     // restrained blue — event/header names
const POST = "#00C48C";
const GET = "#6F9BC6";
const DELETE = "#E8635F";
const T1 = "#E6E9EE";
const T2 = "#9398A8";
const T3 = "#6E7587";

const METHOD_COLOR: Record<string, string> = { POST, GET, DELETE };

export default function WebhooksDocsPage() {
  return (
    <DocsLayout activeId="webhooks">
      <p style={{ fontFamily: MONO, fontSize: 11, color: T3, letterSpacing: "0.2em", marginBottom: 12 }}>API REFERENCE</p>
      <h1 style={{ fontFamily: DISP, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: T1, letterSpacing: "-1.2px", marginBottom: 24 }}>Webhooks</h1>
      <p style={{ fontFamily: BODY, fontSize: 16, color: T2, lineHeight: 1.8, marginBottom: 48 }}>
        Receive a POST request to your server when a scan completes. Each delivery is signed with HMAC-SHA256 so you can verify it came from weavn.app.
      </p>

      {/* Events */}
      <h2 style={{ fontFamily: DISP, fontSize: 20, fontWeight: 700, color: T1, marginBottom: 16 }}>Events</h2>
      <div style={{ border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: 40 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
              {["Event", "When it fires"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: T3, fontWeight: 400 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "12px 20px", color: CODE }}>scan.completed</td><td style={{ padding: "12px 20px", color: T2 }}>Scan finished and report saved successfully</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 20px", color: CODE }}>scan.failed</td><td style={{ padding: "12px 20px", color: T2 }}>Scan encountered an unrecoverable error</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payload */}
      <h2 style={{ fontFamily: DISP, fontSize: 20, fontWeight: 700, color: T1, marginBottom: 16 }}>Payload</h2>
      <div style={{ marginBottom: 32 }}>
        <CodeBlock language="json" code={`{
  "event": "scan.completed",
  "scan_id": "sc_3f9a2c7e8b1d4f60",
  "url": "https://example.com",
  "score": 54,
  "data": {
    "domain": "example.com",
    "verdict": "Needs Work"
  }
}`} />
      </div>

      {/* Headers */}
      <h2 style={{ fontFamily: DISP, fontSize: 20, fontWeight: 700, color: T1, marginBottom: 16 }}>Request headers</h2>
      <div style={{ border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: 40 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
              {["Header", "Value"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 20px", color: T3, fontWeight: 400 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "12px 20px", color: CODE }}>Content-Type</td><td style={{ padding: "12px 20px", color: T2 }}>application/json</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "12px 20px", color: CODE }}>X-Weavn-Event</td><td style={{ padding: "12px 20px", color: T2 }}>The event type (e.g., scan.completed)</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 20px", color: CODE }}>X-Weavn-Signature</td><td style={{ padding: "12px 20px", color: T2 }}>HMAC-SHA256 hex of the request body using your webhook secret</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature verification */}
      <h2 style={{ fontFamily: DISP, fontSize: 20, fontWeight: 700, color: T1, marginBottom: 16 }}>Verifying signatures</h2>
      <div style={{ marginBottom: 32 }}>
        <CodeBlock language="json" code={`import { createHmac } from "crypto"

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("hex")
  return expected === signature
}

// In your route handler:
const body = await request.text()
const sig = request.headers.get("x-weavn-signature") ?? ""
if (!verifyWebhook(body, sig, process.env.WEBHOOK_SECRET!)) {
  return new Response("Unauthorized", { status: 401 })
}
const payload = JSON.parse(body)`} />
      </div>

      {/* Endpoint management */}
      <h2 style={{ fontFamily: DISP, fontSize: 20, fontWeight: 700, color: T1, marginBottom: 16 }}>Managing webhook endpoints</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
        {[
          { method: "POST", desc: "Register a new webhook endpoint. Returns the secret once." },
          { method: "GET", desc: "List all registered webhooks. Secret is never returned in list." },
          { method: "DELETE", desc: "Remove a webhook by ID." },
        ].map(ep => (
          <div key={ep.method} style={{ border: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", gap: 20, alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: METHOD_COLOR[ep.method], minWidth: 56 }}>{ep.method}</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: T2, minWidth: 140 }}>/api/v1/webhooks</span>
            <span style={{ fontFamily: BODY, fontSize: 14, color: T2 }}>{ep.desc}</span>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: BODY, fontSize: 14, color: T2 }}>
        The webhook secret is returned <strong style={{ color: T1 }}>once</strong> when you register the endpoint.
        Store it securely — it cannot be retrieved later. Delete and re-register to rotate a lost secret.
      </p>
    </DocsLayout>
  );
}
