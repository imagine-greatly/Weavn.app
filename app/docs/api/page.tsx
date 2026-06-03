"use client";
import DocsLayout from "@/app/docs/_components/DocsLayout";

const SM = "'Space Mono', monospace";
const SG = "'Space Grotesk', sans-serif";

const STEPS = [
  {
    n: 1,
    title: "Sign up at webdocai.com/signup",
    body: "Create a free account. No credit card required to start.",
  },
  {
    n: 2,
    title: "Copy your API key from the developer portal",
    body: "Navigate to /developer/keys. Your full key is shown once. Copy it immediately — only the hash is stored.",
  },
  {
    n: 3,
    title: "Make your first request",
    body: "Send a POST request to /api/v1/scan with your URL in the body.",
    code: `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yoursite.com"}'`,
  },
  {
    n: 4,
    title: "Parse the response",
    body: "The response includes score, verdict, dimension scores, findings, and copy rewrites.",
    code: `const { score, findings, copy_rewrites } = data
console.log(score)                    // 54
console.log(findings[0].title)        // "Hero headline does not communicate outcome"
console.log(copy_rewrites.headline)   // "Get a ranked conversion audit in 90 seconds"`,
  },
  {
    n: 5,
    title: "Integrate into your workflow",
    body: "Use webhooks for async delivery. See the Code Examples page for complete integration patterns.",
  },
];

export default function ApiDocsPage() {
  return (
    <DocsLayout activeId="getting-started">
      <p style={{ fontFamily: SM, fontSize: 11, color: "var(--cyan)", letterSpacing: "0.2em", marginBottom: 12 }}>GETTING STARTED</p>
      <h1 style={{ fontFamily: SG, fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-1.5px", lineHeight: 1.02, marginBottom: 24 }}>
        Quick start
      </h1>
      <p style={{ fontFamily: SG, fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 56, maxWidth: 640 }}>
        From zero to your first conversion audit in under five minutes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {STEPS.map(step => (
          <div key={step.n} style={{ display: "flex", gap: 24 }}>
            <div style={{ flexShrink: 0, width: 36, height: 36, border: "1px solid rgba(0,200,255,0.4)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SM, fontSize: 13, color: "var(--cyan)" }}>
              {step.n}
            </div>
            <div style={{ flex: 1, paddingTop: 6 }}>
              <p style={{ fontFamily: SG, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{step.title}</p>
              <p style={{ fontFamily: SG, fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: step.code ? 16 : 0 }}>{step.body}</p>
              {step.code && (
                <pre style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "3px solid var(--cyan)", borderRadius: 4, padding: "16px 20px", fontFamily: SM, fontSize: 13, color: "var(--text-primary)", overflowX: "auto", margin: 0, lineHeight: 1.7 }}>
                  {step.code}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </DocsLayout>
  );
}
