"use client";

import type { ReportPayload, Leak } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

export default function NextActionCard({
  activeLatest,
  effectiveDomain: _effectiveDomain,
}: {
  activeLatest: StoredReportRow | undefined;
  effectiveDomain: string;
}) {
  const leaks = getDashboardMoneyLeaks(activeLatest?.analysis);

  const sorted = [...leaks]
    .filter((l) => l.severity !== "passing")
    .sort((a, b) => {
      const sevScore = (l: Leak) => (l.severity === "critical" ? 0 : 1);
      if (sevScore(a) !== sevScore(b)) return sevScore(a) - sevScore(b);
      const effortScore = (l: Leak) => {
        const e = String(l.effortToFix ?? "").toLowerCase();
        if (e.includes("low")) return 0;
        if (e.includes("med")) return 1;
        return 2;
      };
      return effortScore(a) - effortScore(b);
    });

  const next = sorted[0];

  if (!next || !activeLatest) {
    return (
      <div
        style={{
          background: "rgba(7,12,20,0.97)",
          border: "1px solid rgba(0,200,255,0.1)",
          borderRadius: 12,
          padding: 20,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 10,
            color: "var(--text-muted)",
          }}
        >
          Run a scan to get your next action
        </span>
      </div>
    );
  }

  const issueSeverityColor = next.severity === "critical" ? "var(--red)" : "var(--orange)";

  const issueSeverityBg = next.severity === "critical" ? "rgba(255,45,45,0.06)" : "rgba(255,149,0,0.06)";

  const issueBorder = next.severity === "critical" ? "rgba(255,45,45,0.2)" : "rgba(255,149,0,0.2)";

  const reportId = activeLatest.id;
  const findingId = encodeURIComponent(String(next.id ?? next.title));

  return (
    <div
      style={{
        background: "rgba(7,12,20,0.97)",
        border: `1px solid ${issueBorder}`,
        borderTop: `3px solid ${issueSeverityColor}`,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        boxShadow:
          next.severity === "critical"
            ? "0 0 40px rgba(255,45,45,0.08), inset 0 1px 0 rgba(255,45,45,0.1)"
            : "0 0 40px rgba(255,149,0,0.06), inset 0 1px 0 rgba(255,149,0,0.08)",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${issueBorder}`,
          background: issueSeverityBg,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: issueSeverityColor,
            boxShadow: `0 0 8px ${issueSeverityColor}`,
            animation: next.severity === "critical" ? "livePulse 2s infinite" : "none",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 9,
            color: issueSeverityColor,
            letterSpacing: "2px",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          FIX THIS NEXT
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 8,
            color: "var(--text-muted)",
            border: "1px solid var(--border-default)",
            borderRadius: 3,
            padding: "2px 6px",
          }}
        >
          {next.effortToFix ?? "LOW EFFORT"} · {next.timeToFix ?? "< 1hr"}
        </span>
      </div>

      <div style={{ padding: "16px 18px" }}>
        <div
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            marginBottom: 10,
            letterSpacing: "-0.2px",
          }}
        >
          {next.title}
        </div>

        <div
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 300,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          {next.whyItMatters}
        </div>

        <div
          style={{
            background: "rgba(0,200,255,0.03)",
            border: "1px solid rgba(0,200,255,0.08)",
            borderLeft: "2px solid rgba(0,200,255,0.3)",
            borderRadius: "0 6px 6px 0",
            padding: "10px 12px",
            marginBottom: 14,
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          → {next.howToFixIt}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 8,
                color: "var(--text-muted)",
                letterSpacing: "1px",
              }}
            >
              REVENUE IMPACT
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: i < Math.round((next.revenueImpact ?? 0) / 2) ? "var(--cyan)" : "var(--border-default)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <a
          href={`/issue/${encodeURIComponent(reportId)}/${findingId}`}
          style={{
            display: "block",
            width: "100%",
            padding: "11px 16px",
            background: issueSeverityColor === "var(--red)" ? "rgba(255,45,45,0.1)" : "rgba(255,149,0,0.1)",
            border: `1px solid ${issueBorder}`,
            borderRadius: 8,
            textAlign: "center",
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "2px",
            color: issueSeverityColor,
            textDecoration: "none",
            textTransform: "uppercase",
            transition: "background 150ms ease, box-shadow 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              issueSeverityColor === "var(--red)" ? "rgba(255,45,45,0.18)" : "rgba(255,149,0,0.18)";
            e.currentTarget.style.boxShadow =
              next.severity === "critical" ? "0 0 20px rgba(255,45,45,0.25)" : "0 0 20px rgba(255,149,0,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              issueSeverityColor === "var(--red)" ? "rgba(255,45,45,0.1)" : "rgba(255,149,0,0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          VIEW FULL ISSUE BREAKDOWN →
        </a>
      </div>
    </div>
  );
}
