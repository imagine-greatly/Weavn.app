"use client";

import type { ReportPayload } from "@/lib/reportSchema";

function scoreColor(score: number): string {
  if (score < 50) return "var(--red)";
  if (score < 70) return "var(--orange)";
  if (score < 85) return "var(--cyan)";
  return "var(--green)";
}

const DIAGNOSTIC_CATEGORY_ROWS: { id: keyof ReportPayload["categoryScores"]; label: string }[] = [
  { id: "psychology", label: "REVENUE IMPACT" },
  { id: "messaging", label: "MSG" },
  { id: "conversion", label: "CONV" },
  { id: "trust", label: "TRUST" },
  { id: "seo", label: "SEO" },
  { id: "ux", label: "UX" },
];

export default function DiagnosticSummaryCard({
  reportsLength,
  categoryScores,
  findingsCount,
  criticalCount,
  pagesCount,
}: {
  reportsLength: number;
  categoryScores: Partial<ReportPayload["categoryScores"]>;
  findingsCount: number;
  criticalCount: number;
  pagesCount: number;
}) {
  return (
    <div
      style={{
        background: "rgba(7,12,20,0.97)",
        border: "1px solid rgba(0,200,255,0.1)",
        borderRadius: 12,
        padding: 24,
        position: "relative",
        overflow: "hidden",
        boxShadow: "inset 0 1px 0 rgba(0,200,255,0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent)",
          pointerEvents: "none",
        }}
        aria-hidden
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 3,
            height: 16,
            background: "var(--cyan)",
            opacity: 0.7,
            borderRadius: 1,
            flexShrink: 0,
            boxShadow: "0 0 8px rgba(0,200,255,0.4)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 10,
            color: "var(--text-muted)",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          DIAGNOSTIC SUMMARY
        </span>
      </div>

      {reportsLength > 0 ? (
        <>
          {DIAGNOSTIC_CATEGORY_ROWS.map((row, idx) => {
            const raw = categoryScores[row.id];
            const score = typeof raw === "number" && !Number.isNaN(raw) ? Math.min(100, Math.max(0, raw)) : 0;
            const sc = scoreColor(score);
            const barGlow =
              score >= 70
                ? "0 0 8px rgba(0,200,255,0.4)"
                : score >= 50
                  ? "0 0 6px rgba(255,149,0,0.3)"
                  : "0 0 6px rgba(255,45,45,0.3)";
            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: idx === DIAGNOSTIC_CATEGORY_ROWS.length - 1 ? 0 : 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "var(--text-muted)",
                    width: 80,
                    flexShrink: 0,
                    letterSpacing: "0.06em",
                  }}
                >
                  {row.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 999,
                    background: "var(--border-default)",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${score}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: sc,
                      transition: "width 800ms ease",
                      boxShadow: barGlow,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontWeight: 700,
                    fontSize: 10,
                    color: sc,
                    width: 24,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {score}
                </span>
              </div>
            );
          })}

          <div
            style={{
              height: 1,
              background: "var(--border-default)",
              margin: "16px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "var(--text-primary)",
                }}
              >
                {findingsCount}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  color: "var(--text-muted)",
                  marginTop: 3,
                  letterSpacing: "0.08em",
                }}
              >
                FINDINGS
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontWeight: 700,
                  fontSize: 22,
                  color: criticalCount > 0 ? "var(--red)" : "var(--green)",
                }}
              >
                {criticalCount}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  color: "var(--text-muted)",
                  marginTop: 3,
                  letterSpacing: "0.08em",
                }}
              >
                CRITICAL
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "var(--cyan)",
                }}
              >
                {pagesCount}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  color: "var(--text-muted)",
                  marginTop: 3,
                  letterSpacing: "0.08em",
                }}
              >
                PAGES
              </div>
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 10,
            color: "var(--text-muted)",
            textAlign: "center",
            padding: 16,
          }}
        >
          Run your first scan to see your report
        </div>
      )}
    </div>
  );
}
