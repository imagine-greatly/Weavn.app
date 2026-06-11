"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportPayload, Leak, DimensionScoreRow } from "@/lib/reportSchema";
import {
  buildBiggestRevenueLeakCopy,
  buildDimensionSummaryLine,
} from "@/lib/revenueDimensions";
import { displayPagePath, DASHBOARD_MONEY_LEAKS_CAP } from "@/lib/dashboardMoneyLeaks";
import { ScrollReveal } from "@/components/ScrollReveal";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

/** Match dashboard score ring / chart dot thresholds */
function scoreBandColor(score: number): string {
  if (score >= 70) return "#00E676";
  if (score >= 50) return "#FFB800";
  if (score >= 30) return "#FF6B00";
  return "#FF2D2D";
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - t);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 14) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks <= 4) return `${diffWeeks} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function largeScoreDropFilter(score: number): string {
  if (score >= 70) return "drop-shadow(0 0 26px rgba(0,230,118,0.45))";
  if (score >= 50) return "drop-shadow(0 0 24px rgba(255,184,0,0.45))";
  if (score >= 30) return "drop-shadow(0 0 24px rgba(255,107,0,0.45))";
  return "drop-shadow(0 0 28px rgba(255,45,45,0.5))";
}

const DIM_FILL: Record<DimensionScoreRow["status"], string> = {
  critical: "#FF2D2D",
  weak: "#FF6B00",
  fair: "#FFB800",
  strong: "#00E676",
};

export default function SiteHealthPanel({
  effectiveDomain,
  activeDomainReports,
  activeLatest,
  activePrevScore,
  activeScore,
  dimensionScores,
  issueCriticalCount,
  issueHighImpactCount,
  issueNoIssueCount,
  moneyLeaks,
  moneyLeakCriticalCount,
  moneyLeakHighImpactCount,
  totalMoneyLeaks,
  activeTopLeak,
  rescanLoading,
  onRescan,
  dashNarrow,
}: {
  effectiveDomain: string;
  activeDomainReports: StoredReportRow[];
  activeLatest: StoredReportRow | undefined;
  activePrevScore: number | null;
  activeScore: number;
  dimensionScores: DimensionScoreRow[] | undefined;
  issueCriticalCount: number;
  issueHighImpactCount: number;
  issueNoIssueCount: number;
  moneyLeaks: Leak[];
  moneyLeakCriticalCount: number;
  moneyLeakHighImpactCount: number;
  totalMoneyLeaks: number;
  activeTopLeak: Leak | undefined;
  rescanLoading: Record<string, boolean>;
  onRescan: (domain: string) => void;
  dashNarrow: boolean;
}) {
  const scActive = scoreBandColor(activeScore);
  const trendNode =
    activePrevScore == null ? (
      <span style={{ fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-muted)" }}>First scan</span>
    ) : activeScore > activePrevScore ? (
      <span style={{ color: "#00E676", fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace", fontSize: 10 }}>
        ↑ +{activeScore - activePrevScore} pts
      </span>
    ) : activeScore < activePrevScore ? (
      <span style={{ color: "var(--red)", fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace", fontSize: 10 }}>
        ↓ -{activePrevScore - activeScore} pts
      </span>
    ) : (
      <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace", fontSize: 10 }}>→ Stable</span>
    );
  const panelLeftBorder = "rgba(0,200,255,0.12)";
  const siteTypeLabel = (
    (activeLatest?.analysis as ReportPayload & { siteType?: ReportPayload["site_type"] })?.siteType ??
    activeLatest?.analysis?.site_type ??
    "general"
  ).toUpperCase();
  const topLeakColor = activeTopLeak
    ? activeTopLeak.severity === "critical"
      ? "var(--red)"
      : activeTopLeak.severity === "warning"
        ? "var(--orange)"
        : "var(--color-positive)"
    : "var(--text-muted)";
  const dimensionSummaryLine =
    dimensionScores && dimensionScores.length > 0
      ? buildDimensionSummaryLine(dimensionScores)
      : null;
  const biggestLeakCopy =
    dimensionScores && dimensionScores.length > 0
      ? buildBiggestRevenueLeakCopy(dimensionScores, moneyLeaks)
      : null;
  const topThreeLeaks = [...moneyLeaks].slice(0, 3);
  const ringRadius = 52;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc * (1 - (activeLatest ? activeScore / 100 : 0));

  const containerShadow =
    "0 0 0 1px rgba(0,200,255,0.04), 0 0 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,200,255,0.08)";

  const narrowColDivider = dashNarrow ? "none" : "1px solid var(--border-default)";
  const narrowColBottom = dashNarrow ? "1px solid var(--border-default)" : "none";

  const [barsReady, setBarsReady] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1400;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      if (t < 1) requestAnimationFrame(tick);
      else {
        setTimeout(() => setBarsReady(true), 100);
      }
    };

    requestAnimationFrame(tick);
  }, [activeScore]);

  return (
    <ScrollReveal variant="card" index={0}>
      <div
        style={{
          background: "rgba(240,244,255,0.02)",
          border: "1px solid rgba(0,200,255,0.08)",
          borderLeft: `3px solid ${panelLeftBorder}`,
          borderRadius: 4,
          marginBottom: 28,
          overflow: "hidden",
          position: "relative",
          boxShadow: containerShadow,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.6) 50%, transparent 100%)",
            boxShadow: "0 0 20px rgba(0,200,255,0.4)",
            pointerEvents: "none",
          }}
          aria-hidden
        />

        {/* ROW 1 — header */}
        <div
          style={{
            padding: "18px 28px",
            borderBottom: "1px solid var(--border-default)",
            background: "rgba(13,16,32,0.9)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                overflow: "hidden",
                flexShrink: 0,
                background: "var(--bg-card)",
              }}
            >
              <img
                src={`https://${effectiveDomain}/favicon.ico`}
                alt=""
                width={22}
                height={22}
                style={{ width: 22, height: 22, objectFit: "cover" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: "var(--text-primary)",
                letterSpacing: "-0.5px",
              }}
            >
              {effectiveDomain}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "var(--text-muted)",
                border: "1px solid var(--border-default)",
                borderRadius: 3,
                padding: "2px 8px",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {siteTypeLabel}
            </span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "rgba(0,200,255,0.85)",
                animation: "livePulse 2s ease-in-out infinite",
                boxShadow: "0 0 6px rgba(0,200,255,0.45)",
                flexShrink: 0,
              }}
              aria-hidden
            />
          </div>
          <div
            className="site-health-header-actions"
            style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}
          >
            <a
              href={`/report/${encodeURIComponent(effectiveDomain)}`}
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontWeight: 700,
                fontSize: 10,
                color: "var(--cyan)",
                letterSpacing: "2px",
                textDecoration: "none",
                border: "1px solid rgba(0,200,255,0.25)",
                borderRadius: 6,
                padding: "8px 16px",
                transition: "background 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,200,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.5)";
                e.currentTarget.style.boxShadow = "var(--cyan-glow-soft)";
                e.currentTarget.style.transition = "background 150ms ease, border-color 150ms ease, box-shadow 150ms ease";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.25)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transition = "background 300ms ease, border-color 300ms ease, box-shadow 300ms ease";
              }}
            >
              VIEW FULL REPORT →
            </a>
            <button
              type="button"
              onClick={() => {
                const path = `/dashboard?url=${encodeURIComponent(`https://${effectiveDomain}`)}&rescan=true`;
                console.log("[scan-nav] window.location.href", path);
                window.location.href = path;
              }}
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border-default)",
                borderRadius: 6,
                padding: "7px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 10,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                transition: "all 150ms ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
                e.currentTarget.style.color = "var(--cyan)";
                e.currentTarget.style.background = "rgba(0,200,255,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              RESCAN ↻
            </button>
          </div>
        </div>

        {/* ROW 2 — diagnostic grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: dashNarrow ? "1fr" : "180px 1fr 200px",
            gap: 0,
          }}
        >
          {/* COLUMN A — score */}
          <div
            style={{
              padding: "36px 24px",
              borderRight: narrowColDivider,
              borderBottom: narrowColBottom,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              background: "rgba(5,8,16,0.3)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "0.2em",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              REVENUE SCORE
            </div>
            <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 8px" }}>
              <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden>
                <circle
                  cx={60}
                  cy={60}
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={6}
                />
                <circle
                  cx={60}
                  cy={60}
                  r={ringRadius}
                  fill="none"
                  stroke={scActive}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 1s ease, stroke 0.4s ease" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    fontWeight: 900,
                    fontSize: 36,
                    lineHeight: 1,
                    color: scActive,
                    filter: activeLatest ? largeScoreDropFilter(activeScore) : "none",
                  }}
                >
                  {activeLatest ? String(activeScore) : "—"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "rgba(240,244,255,0.35)",
                    marginTop: 2,
                  }}
                >
                  /100
                </span>
              </div>
            </div>
            <div style={{ marginBottom: 6 }}>{trendNode}</div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "rgba(240,244,255,0.45)",
              }}
            >
              Last scanned {activeLatest ? formatRelativeTime(activeLatest.created_at) : "—"}
            </div>

            <div
              style={{
                width: "100%",
                maxWidth: 200,
                marginTop: 20,
                borderTop: "1px solid rgba(0,200,255,0.1)",
                paddingTop: 14,
              }}
            >
              {(
                [
                  { label: "CRITICAL", value: moneyLeakCriticalCount, color: "#FF2D2D" },
                  { label: "HIGH IMPACT", value: moneyLeakHighImpactCount, color: "#FF6B00" },
                  { label: "TOTAL ISSUES", value: totalMoneyLeaks, color: "rgba(0,200,255,0.85)" },
                ] as const
              ).map((row, i, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(0,200,255,0.08)" : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      color: "rgba(240,244,255,0.55)",
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-orbitron)",
                      fontWeight: 700,
                      fontSize: 14,
                      color: row.color,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                width: "100%",
                maxWidth: 200,
                marginTop: 14,
                borderTop: "1px solid rgba(0,200,255,0.08)",
                paddingTop: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  letterSpacing: "0.15em",
                  color: "rgba(240,244,255,0.3)",
                  textTransform: "uppercase",
                }}
              >
                LAST DIAGNOSTIC
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "rgba(240,244,255,0.45)",
                  marginTop: 4,
                }}
              >
                {activeLatest
                  ? new Date(activeLatest.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </div>
          </div>

          {/* COLUMN B — categories */}
          <div
            style={{
              padding: "28px 28px",
              borderRight: narrowColDivider,
              borderBottom: narrowColBottom,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "rgba(0,200,255,0.85)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 14,
              }}
            >
              ● REVENUE HEALTH
            </span>
            {!dimensionScores || dimensionScores.length === 0 ? (
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "rgba(240,244,255,0.45)",
                  lineHeight: 1.5,
                }}
              >
                Run a new scan to see dimension scores (stored with your report).
              </div>
            ) : (
              dimensionScores.map((dim, idx) => {
                const fill = DIM_FILL[dim.status];
                return (
                  <div
                    key={dim.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: idx === dimensionScores.length - 1 ? 0 : 10,
                    }}
                  >
                    <div
                      style={{
                        width: 140,
                        flexShrink: 0,
                        fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                        fontSize: 9,
                        color: "#F0F4FF",
                        lineHeight: 1.25,
                      }}
                    >
                      {dim.label}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: barsReady ? `${dim.score}%` : "0%",
                            height: "100%",
                            borderRadius: 2,
                            background: fill,
                            transition: barsReady ? "width 0.8s ease-out" : "none",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        width: 32,
                        flexShrink: 0,
                        textAlign: "right",
                        fontFamily: "var(--font-orbitron)",
                        fontWeight: 700,
                        fontSize: 11,
                        color: fill,
                      }}
                    >
                      {dim.score}
                    </div>
                  </div>
                );
              })
            )}
            {dimensionSummaryLine ? (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  color: "rgba(240,244,255,0.3)",
                  lineHeight: 1.45,
                }}
              >
                {dimensionSummaryLine}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid rgba(0,200,255,0.08)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "rgba(0,200,255,0.85)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 12,
                }}
              >
                ● TOP DIAGNOSTIC FINDINGS
              </span>
              {topThreeLeaks.length === 0 ? (
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "rgba(240,244,255,0.35)",
                  }}
                >
                  Rescan to refresh your revenue diagnostic
                </div>
              ) : (
                topThreeLeaks.map((leak, i) => {
                  const title =
                    (leak.revenueTitle?.trim() || leak.title || "").trim() || String(leak.id);
                  const truncated =
                    title.length > 45 ? `${title.slice(0, 45)}…` : title;
                  const eff =
                    leak.revenueEffort === "Today"
                      ? "RESOLVE TODAY"
                      : leak.revenueEffort === "This Week"
                        ? "RESOLVE THIS WEEK"
                        : leak.revenueEffort === "This Month"
                          ? "RESOLVE THIS MONTH"
                          : "—";
                  return (
                    <div
                      key={`${leak.id}-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom:
                          i < topThreeLeaks.length - 1
                            ? "1px solid rgba(0,200,255,0.08)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 10,
                          color: "#F0F4FF",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {truncated}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 8,
                          letterSpacing: "0.1em",
                          color: "rgba(240,244,255,0.35)",
                          flexShrink: 0,
                        }}
                      >
                        {eff}
                      </span>
                    </div>
                  );
                })
              )}
              {totalMoneyLeaks > 0 ? (
                <a
                  href={`/report/${encodeURIComponent(effectiveDomain)}`}
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    color: "rgba(0,200,255,0.85)",
                    textDecoration: "none",
                  }}
                >
                  View all findings →
                </a>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 18,
                padding: "12px 14px",
                background: "rgba(240,244,255,0.02)",
                border: "1px solid rgba(0,200,255,0.08)",
                borderLeft: "3px solid #FF2D2D",
                borderRadius: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  color: "rgba(255,45,45,0.85)",
                  letterSpacing: "0.15em",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                HIGHEST IMPACT FINDING
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 11,
                  color: "rgba(240,244,255,0.72)",
                  lineHeight: 1.5,
                }}
              >
                {!dimensionScores || dimensionScores.length === 0 ? (
                  <span style={{ color: "rgba(240,244,255,0.45)" }}>
                    Run a new scan to see your revenue breakdown
                  </span>
                ) : biggestLeakCopy ? (
                  biggestLeakCopy
                ) : (
                  <span style={{ color: "rgba(240,244,255,0.35)" }}>
                    No failing checks in the weakest dimension.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN C — rubric severity + pages */}
          <div style={{ padding: "28px 20px" }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "rgba(0,200,255,0.85)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 16,
              }}
            >
              ● ISSUE SEVERITY
            </span>
            {(
              [
                {
                  dot: "var(--red)",
                  label: "CRITICAL",
                  n: issueCriticalCount,
                  rgba: "rgba(255,45,45,0.5)",
                },
                {
                  dot: "var(--orange)",
                  label: "HIGH IMPACT",
                  n: issueHighImpactCount,
                  rgba: "rgba(255,149,0,0.5)",
                },
                {
                  dot: "var(--green)",
                  label: "NO ISSUE DETECTED",
                  n: issueNoIssueCount,
                  rgba: "rgba(0,255,135,0.5)",
                },
              ] as const
            ).map((row, idx, arr) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: idx === arr.length - 1 ? 0 : 14,
                  paddingBottom: idx === arr.length - 1 ? 0 : 14,
                  borderBottom: idx === arr.length - 1 ? "none" : "1px solid var(--border-default)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: row.dot,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${row.rgba}`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 9,
                      color: "var(--text-muted)",
                      letterSpacing: "1px",
                    }}
                  >
                    {row.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    fontWeight: 700,
                    fontSize: 28,
                    color: row.dot,
                  }}
                >
                  {row.n}
                </span>
              </div>
            ))}
            {activeTopLeak ? (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "rgba(0,200,255,0.55)",
                    letterSpacing: "0.12em",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  HIGHEST IMPACT
                </div>
                <div
                  style={{
                    background: "rgba(240,244,255,0.02)",
                    border: "1px solid rgba(0,200,255,0.08)",
                    borderLeft: `3px solid ${topLeakColor}`,
                    borderRadius: 0,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 8,
                      color: topLeakColor,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {activeTopLeak.severity}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontWeight: 500,
                      fontSize: 11,
                      color: "rgba(240,244,255,0.72)",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {activeTopLeak.revenueTitle?.trim() || activeTopLeak.title}
                  </div>
                </div>
              </div>
            ) : null}
            {activeLatest?.analysis?.pagesAnalyzed && activeLatest.analysis.pagesAnalyzed.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "rgba(0,200,255,0.55)",
                    letterSpacing: "0.2em",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  ● PAGES SCANNED
                </div>
                {activeLatest.analysis.pagesAnalyzed.slice(0, 4).map((page, i) => {
                  const displayPath = displayPagePath(page);
                  const pageLeaks = moneyLeaks.filter((l) => {
                    const loc = (l.page_location ?? "").trim();
                    if (loc && (loc.includes(displayPath) || displayPath.includes(loc)))
                      return true;
                    const ext = l as Leak & { pageUrl?: string; url?: string };
                    const url = ext.pageUrl ?? ext.url ?? "";
                    return (
                      url.includes(page) ||
                      url.includes(displayPath) ||
                      (i === 0 && !loc && !url)
                    );
                  });

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 0",
                        borderBottom:
                          i < Math.min(3, activeLatest.analysis.pagesAnalyzed!.length - 1)
                            ? "1px solid rgba(0,200,255,0.08)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 9,
                          color: "rgba(240,244,255,0.45)",
                          letterSpacing: "0.04em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "60%",
                        }}
                      >
                        {displayPath}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 8,
                          color:
                            pageLeaks.length > 0
                              ? "rgba(255,149,0,0.85)"
                              : "rgba(0,230,118,0.65)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {pageLeaks.length > 0 ? `${pageLeaks.length} issues` : "clean"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {activeDomainReports.length > 0 && (
          <div
            style={{
              padding: "20px 28px 24px 28px",
              borderTop: "1px solid var(--border-default)",
              background: "rgba(5,8,16,0.4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 12,
                    background: "var(--cyan)",
                    opacity: 0.6,
                    borderRadius: 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "var(--text-muted)",
                    letterSpacing: "2px",
                  }}
                >
                  SCORE HISTORY
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "var(--text-muted)",
                }}
              >
                {activeDomainReports.length} scan
                {activeDomainReports.length !== 1 ? "s" : ""}
              </span>
            </div>

            {(() => {
              const sorted = [...activeDomainReports].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );

              const scores = sorted.map((r) => r.analysis?.healthScore ?? 0);
              const dates = sorted.map((r) => r.created_at);

              const W = 600;
              const H = 100;
              const padL = 32;
              const padR = 16;
              const padT = 12;
              const padB = 24;

              const minS = Math.max(0, Math.min(...scores) - 10);
              const maxS = Math.min(100, Math.max(...scores) + 10);
              const range = Math.max(1, maxS - minS);

              const toX = (i: number) => padL + (i / Math.max(1, scores.length - 1)) * (W - padL - padR);

              const toY = (s: number) => padT + (1 - (s - minS) / range) * (H - padT - padB);

              const points = scores.map((s, i) => ({
                x: toX(i),
                y: toY(s),
                score: s,
                date: dates[i],
              }));

              const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

              const areaD =
                points.length > 0
                  ? `M ${points[0].x} ${H - padB} ` + pathD.replace("M", "L") + ` L ${points[points.length - 1].x} ${H - padB} Z`
                  : "";

              const gridLines = [25, 50, 75, 100];

              return (
                <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                  {gridLines.map((g) => {
                    if (g < minS || g > maxS) return null;
                    const gy = toY(g);
                    return (
                      <g key={g}>
                        <line
                          x1={padL}
                          y1={gy}
                          x2={W - padR}
                          y2={gy}
                          stroke="rgba(255,255,255,0.04)"
                          strokeWidth={1}
                        />
                        <text
                          x={padL - 4}
                          y={gy + 4}
                          textAnchor="end"
                          fill="rgba(255,255,255,0.2)"
                          fontSize={8}
                          fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                        >
                          {g}
                        </text>
                      </g>
                    );
                  })}

                  {points.length > 1 && <path d={areaD} fill="rgba(0,200,255,0.04)" />}

                  {points.length > 1 && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="var(--cyan)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}

                  {points.length > 1 &&
                    points.map((p, i) => {
                      const col = scoreBandColor(p.score);
                      const isLast = i === points.length - 1;
                      return (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={isLast ? 7 : 5} fill={col} opacity={0.15} />
                          <circle cx={p.x} cy={p.y} r={isLast ? 4 : 3} fill={col} opacity={isLast ? 1 : 0.8} />
                          {isLast && (
                            <text
                              x={p.x}
                              y={p.y - 10}
                              textAnchor="middle"
                              fill={col}
                              fontSize={9}
                              fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                              fontWeight="bold"
                            >
                              {p.score}
                            </text>
                          )}
                          <text
                            x={p.x}
                            y={H - 4}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.25)"
                            fontSize={7}
                            fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                          >
                            {new Date(p.date ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </text>
                        </g>
                      );
                    })}

                  {points.length === 1 && points[0] && (
                    <g>
                      <line
                        x1={padL}
                        y1={points[0].y}
                        x2={W - padR}
                        y2={points[0].y}
                        stroke="rgba(0,200,255,0.2)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={points[0].x}
                        cy={points[0].y}
                        r={5}
                        fill={scoreBandColor(points[0].score)}
                      />
                      <text
                        x={points[0].x}
                        y={points[0].y - 10}
                        textAnchor="middle"
                        fill={scoreBandColor(points[0].score)}
                        fontSize={9}
                        fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                        fontWeight="bold"
                      >
                        {points[0].score}
                      </text>
                      <text
                        x={points[0].x}
                        y={H - 4}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.25)"
                        fontSize={7}
                        fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                      >
                        {new Date(points[0].date ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </text>
                    </g>
                  )}
                </svg>
              );
            })()}
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}
