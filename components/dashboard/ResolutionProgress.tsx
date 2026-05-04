"use client";

import type { ReportPayload } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

export default function ResolutionProgress({
  activeDomainReports,
  resolvedKeys,
}: {
  activeDomainReports: StoredReportRow[];
  resolvedKeys: Set<string>;
}) {
  if (activeDomainReports.length === 0) return null;

  const latest = [...activeDomainReports].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  if (!latest) return null;

  const moneyLeaks = getDashboardMoneyLeaks(latest.analysis);
  const totalIssues = moneyLeaks.length;

  if (totalIssues === 0) return null;

  let resolvedForLatest = 0;
  for (const leak of moneyLeaks) {
    const findingId = String(leak.id ?? leak.title);
    const key = `${latest.id}:${findingId}`;
    if (resolvedKeys.has(key)) resolvedForLatest += 1;
  }

  const pct =
    totalIssues > 0 ? Math.round((resolvedForLatest / totalIssues) * 100) : 0;
  const remaining = totalIssues - resolvedForLatest;

  const estimatedGain = Math.round(resolvedForLatest * 2.5);
  const currentScore = latest.analysis?.healthScore ?? 0;
  const projectedScore = Math.min(100, currentScore + estimatedGain);

  const barColor = pct >= 75 ? "var(--green)" : pct >= 40 ? "var(--cyan)" : "var(--orange)";
  const barGlow =
    pct >= 75
      ? "0 0 10px rgba(0,255,135,0.45)"
      : pct >= 40
        ? "0 0 10px rgba(0,200,255,0.45)"
        : "0 0 10px rgba(255,149,0,0.45)";

  return (
    <div
      style={{
        background: "rgba(240,244,255,0.02)",
        border: "1px solid rgba(0,200,255,0.08)",
        borderRadius: 4,
        padding: "18px 22px",
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "rgba(0,200,255,0.85)",
              textTransform: "uppercase",
            }}
          >
            ● RESOLUTION PROGRESS
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-orbitron)",
            fontWeight: 900,
            fontSize: 22,
            color: barColor,
            lineHeight: 1,
          }}
        >
          {pct}%
        </span>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "rgba(255,255,255,0.06)",
          marginBottom: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            background: barColor,
            boxShadow: barGlow,
            transition: "width 1000ms cubic-bezier(0.4,0,0.2,1)",
            position: "relative",
          }}
        >
          {pct > 0 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                animation: "shimmerDivider 2s infinite",
              }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 20 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-orbitron)",
                fontWeight: 700,
                fontSize: 18,
                color: "#00E676",
                lineHeight: 1,
              }}
            >
              {resolvedForLatest}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 8,
                color: "var(--text-muted)",
                letterSpacing: "1px",
                marginTop: 3,
              }}
            >
              RESOLVED
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-orbitron)",
                fontWeight: 700,
                fontSize: 18,
                color: remaining > 0 ? "var(--orange)" : "#00E676",
                lineHeight: 1,
              }}
            >
              {remaining}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 8,
                color: "var(--text-muted)",
                letterSpacing: "1px",
                marginTop: 3,
              }}
            >
              REMAINING
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-orbitron)",
                fontWeight: 700,
                fontSize: 18,
                color: "rgba(0,200,255,0.85)",
                lineHeight: 1,
              }}
            >
              {totalIssues}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 8,
                color: "var(--text-muted)",
                letterSpacing: "1px",
                marginTop: 3,
              }}
            >
              TOTAL ISSUES
            </div>
          </div>
        </div>

        {resolvedForLatest > 0 && (
          <div
            style={{
              background: "rgba(240,244,255,0.02)",
              border: "1px solid rgba(0,200,255,0.08)",
              borderRadius: 4,
              padding: "8px 14px",
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 8,
                color: "var(--text-muted)",
                letterSpacing: "1.5px",
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              ESTIMATED SCORE IMPACT
            </div>
            <div
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: 13,
                color: "var(--cyan)",
                fontWeight: 500,
              }}
            >
              {currentScore} → {projectedScore}
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "var(--green)",
                  marginLeft: 6,
                }}
              >
                +{estimatedGain} pts
              </span>
            </div>
          </div>
        )}
      </div>

      {pct > 0 && pct < 100 && (
        <div
          style={{
            marginTop: 12,
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 9,
            color: "rgba(240,244,255,0.35)",
          }}
        >
          {remaining} issue{remaining !== 1 ? "s" : ""} left on {latest.domain}
        </div>
      )}
      {pct === 100 && (
        <div
          style={{
            marginTop: 12,
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 9,
            color: "rgba(0,230,118,0.75)",
          }}
        >
          All revenue issues checked off — rescan for a fresh diagnostic
        </div>
      )}
    </div>
  );
}
