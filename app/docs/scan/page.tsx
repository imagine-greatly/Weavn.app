"use client";
import DocsLayout from "@/app/docs/_components/DocsLayout";

const SM = "'Space Mono', monospace";
const SG = "'Space Grotesk', sans-serif";
const CYAN = "#00C8FF";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(240,244,255,0.4)";
const TEXT = "#F0F4FF";

function Table({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginBottom: 40 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SM, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
            {cols.map(c => <th key={c} style={{ textAlign: "left", padding: "12px 20px", color: MUTED, fontWeight: 400 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "12px 20px", color: j === 0 ? CYAN : "var(--text-secondary)", verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScanDocsPage() {
  return (
    <DocsLayout activeId="scan">
      <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 12 }}>API REFERENCE</p>
      <h1 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, letterSpacing: "-1.2px", marginBottom: 8 }}>POST /v1/scan</h1>
      <p style={{ fontFamily: SG, fontSize: 16, color: MUTED, marginBottom: 40 }}>Run a full conversion audit on any URL. Returns structured findings, copy rewrites, and growth blueprint.</p>

      <div style={{ border: `1px solid ${BORDER}`, borderLeft: `3px solid ${CYAN}`, borderRadius: 4, padding: "16px 24px", marginBottom: 40, fontFamily: SM, fontSize: 13, color: MUTED }}>
        <span style={{ color: CYAN }}>POST</span> https://api.weavn.app/v1/scan
      </div>

      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Request parameters</h2>
      <Table
        cols={["Parameter", "Type", "Required", "Description"]}
        rows={[
          ["url", "string", "yes", "The URL to audit. Must include https://"],
          ["pages", "number", "no", "Max pages to scan (default 1, max 5)"],
        ]}
      />

      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Response fields</h2>
      <Table
        cols={["Field", "Type", "Description"]}
        rows={[
          ["id", "string (UUID)", "Unique scan identifier. Use with GET /v1/scans/:id"],
          ["url", "string", "The URL that was scanned"],
          ["score", "number (0-100)", "Composite conversion health score"],
          ["verdict", "string", "Excellent / Good / Needs Work / Critical"],
          ["scanned_at", "ISO 8601", "Timestamp when scan completed"],
          ["pages_scanned", "number", "Number of pages analyzed"],
          ["dimensions", "object", "Per-dimension scores (0-100 each)"],
          ["dimensions.conversion_architecture", "number", "Conversion flow and CTA structure"],
          ["dimensions.trust_signals", "number", "Social proof and credibility markers"],
          ["dimensions.message_clarity", "number", "Headline and value proposition clarity"],
          ["dimensions.traffic_readiness", "number", "SEO and discoverability signals"],
          ["dimensions.technical_foundation", "number", "Page speed and technical hygiene"],
          ["summary", "string", "Executive diagnostic paragraph"],
          ["findings", "array", "Ranked conversion suppressions (max 20)"],
          ["findings[].id", "string", "finding_001, finding_002, etc."],
          ["findings[].title", "string", "Business-framed finding headline"],
          ["findings[].severity", "string", "critical / warning / passing"],
          ["findings[].dimension", "string", "Which revenue dimension this belongs to"],
          ["findings[].impact", "string", "Estimated conversion suppression range"],
          ["findings[].explanation", "string", "What was found on the page"],
          ["findings[].recommendation", "string", "Exact resolution to apply"],
          ["findings[].rewritten_copy", "string?", "AI-written copy replacement (if applicable)"],
          ["findings[].confidence", "string", "high / medium / low"],
          ["copy_rewrites.headline", "string?", "AI-rewritten hero headline"],
          ["copy_rewrites.subheadline", "string?", "AI-rewritten subheadline"],
          ["copy_rewrites.cta", "string?", "AI-rewritten CTA button text"],
          ["growth_blueprint", "array", "Prioritized action plan"],
          ["growth_blueprint[].priority", "number", "Order of execution (1 = first)"],
          ["growth_blueprint[].action", "string", "Specific action to take"],
          ["growth_blueprint[].effort", "string", "High / Medium / Low"],
          ["growth_blueprint[].impact", "string", "Projected conversion lift range"],
          ["growth_blueprint[].timeframe", "string", "Week 1 / Weeks 2-4 / Month 2"],
          ["metadata.word_count", "number", "Visible word count on scanned pages"],
          ["metadata.cta_count", "number", "Number of CTAs detected"],
          ["metadata.tech_stack", "string[]", "Detected structured data types"],
        ]}
      />

      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Finding severity levels</h2>
      <Table
        cols={["Severity", "Description"]}
        rows={[
          ["critical", "Actively suppressing conversions. Fix immediately."],
          ["warning", "Measurable revenue suppression. Fix after critical items."],
          ["passing", "No meaningful suppression detected in this check."],
        ]}
      />

      <h2 style={{ fontFamily: SG, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Error codes</h2>
      <Table
        cols={["Status", "Error", "Meaning"]}
        rows={[
          ["400", "url is required", "Missing or empty url field"],
          ["401", "Invalid API key", "Bearer token missing, invalid, or inactive"],
          ["403", "Scan limit reached", "Plan limit exceeded"],
          ["422", "Could not extract content from this URL", "Site blocked scraping or returned no content"],
          ["500", "Scan failed", "Analysis or save error — message field gives detail"],
        ]}
      />
    </DocsLayout>
  );
}
