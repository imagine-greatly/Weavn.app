"use client";

import type { ReportPayload } from "@/lib/reportSchema";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

export default function ExecutiveSummaryCard({
  activeLatest,
  effectiveDomain,
}: {
  activeLatest: StoredReportRow | undefined;
  effectiveDomain: string;
}) {
  const exec = activeLatest?.analysis?.executiveSummary;

  if (!exec?.verdict && !exec?.diagnosis) return null;

  return (
    <div
      style={{
        background: "rgba(7,12,20,0.97)",
        border: "1px solid rgba(0,200,255,0.12)",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 28,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.5), transparent)",
          boxShadow: "0 0 20px rgba(0,200,255,0.3)",
          pointerEvents: "none",
        }}
        aria-hidden
      />

      <div
        style={{
          padding: "16px 28px",
          borderBottom: "1px solid var(--border-default)",
          background: "rgba(13,16,32,0.8)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--cyan)",
            boxShadow: "0 0 8px rgba(0,200,255,0.6)",
            animation: "livePulse 2s infinite",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "3px",
            color: "var(--cyan)",
            fontWeight: 700,
          }}
        >
          DIAGNOSTIC OVERVIEW
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 9,
            color: "var(--text-muted)",
            marginLeft: 4,
          }}
        >
          · read this first
        </span>
      </div>

      {exec.verdict && (
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid var(--border-default)",
            background: "rgba(255,45,45,0.02)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "2px",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            VERDICT
          </div>
          <p
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 600,
              fontSize: 17,
              color: "var(--text-primary)",
              lineHeight: 1.4,
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            {exec.verdict}
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {exec.diagnosis && (
          <div
            style={{
              padding: "18px 28px",
              borderRight: "1px solid var(--border-default)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "2px",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              DIAGNOSIS
            </div>
            <p
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontWeight: 300,
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {exec.diagnosis}
            </p>
          </div>
        )}

        {exec.priorityAction && (
          <div style={{ padding: "18px 28px" }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "var(--cyan)",
                letterSpacing: "2px",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              FIX THIS FIRST
            </div>
            <p
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: "var(--text-primary)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {exec.priorityAction}
            </p>
          </div>
        )}
      </div>

      {exec.weekOneActions && exec.weekOneActions.length > 0 && (
        <div style={{ padding: "18px 28px" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "2px",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            THIS WEEK — START HERE
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {exec.weekOneActions.slice(0, 3).map((action, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 14px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(0,200,255,0.08)",
                    border: "1px solid rgba(0,200,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "var(--cyan)",
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontWeight: 300,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {exec.estimatedImpact && (
        <div
          style={{
            padding: "14px 28px",
            borderTop: "1px solid var(--border-default)",
            background: "rgba(0,200,255,0.02)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "2px",
              flexShrink: 0,
              textTransform: "uppercase",
            }}
          >
            ESTIMATED IMPACT
          </span>
          <span
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 300,
              fontSize: 12,
              color: "var(--text-secondary)",
              flex: 1,
            }}
          >
            {exec.estimatedImpact}
          </span>
        </div>
      )}
    </div>
  );
}
