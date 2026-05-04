"use client";

import { useMemo, useState } from "react";
import type { ReportPayload, Leak } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

export type PriorityIssue = {
  resolutionKey: string;
  domain: string;
  reportId: string;
  findingId: string;
  /** Display title — revenueTitle when set */
  title: string;
  severity: Leak["severity"];
  rubricSeverity?: Leak["rubricSeverity"];
  revenueEffort?: Leak["revenueEffort"];
  revenueImpact: number;
  domainLabel: string;
};

function latestPerDomain(reports: StoredReportRow[]): StoredReportRow[] {
  const byDom = new Map<string, StoredReportRow[]>();
  for (const r of reports) {
    const k = (r.domain ?? "").trim().toLowerCase();
    if (!byDom.has(k)) byDom.set(k, []);
    byDom.get(k)!.push(r);
  }
  const out: StoredReportRow[] = [];
  for (const [, rows] of byDom) {
    const latest = rows.reduce((a, b) =>
      new Date(a.created_at).getTime() >= new Date(b.created_at).getTime() ? a : b
    );
    out.push(latest);
  }
  return out;
}

/** Implementation queue: curated exit triggers / money leaks (latest scan per domain), max 8 each. */
export function collectPriorityIssues({
  reports,
  resolvedKeys,
  activeDomain,
  includeResolved = false,
}: {
  reports: StoredReportRow[];
  resolvedKeys: Set<string>;
  /** Optional domain filter (normalized match) */
  activeDomain?: string;
  includeResolved?: boolean;
}): PriorityIssue[] {
  let rows = reports;
  if (activeDomain) {
    const want = activeDomain.trim().toLowerCase().replace(/^www\./, "");
    rows = reports.filter(
      (r) => r.domain.trim().toLowerCase().replace(/^www\./, "") === want
    );
  }

  const latestRows = latestPerDomain(rows);
  const all: PriorityIssue[] = [];

  for (const r of latestRows) {
    const leaks = getDashboardMoneyLeaks(r.analysis);
    for (const leak of leaks) {
      const findingId = String(leak.id ?? leak.title);
      const resolutionKey = `${r.id}:${findingId}`;
      if (!includeResolved && resolvedKeys.has(resolutionKey)) continue;
      const titleStr =
        (leak.revenueTitle?.trim() || leak.title || "").trim() || findingId;
      all.push({
        resolutionKey,
        domain: r.domain,
        reportId: r.id,
        findingId,
        title: titleStr,
        severity: leak.severity,
        rubricSeverity: leak.rubricSeverity,
        revenueEffort: leak.revenueEffort,
        revenueImpact: leak.revenueImpact ?? 0,
        domainLabel: r.domain,
      });
    }
  }

  all.sort((a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0));
  return all;
}

function isCriticalDisplay(issue: PriorityIssue): boolean {
  return (
    issue.severity === "critical" || issue.rubricSeverity === "Critical"
  );
}

function isHighImpactDisplay(issue: PriorityIssue): boolean {
  if (isCriticalDisplay(issue)) return false;
  return (
    issue.severity === "warning" ||
    issue.rubricSeverity === "High" ||
    issue.rubricSeverity === "Medium"
  );
}

function effortLabel(eff: Leak["revenueEffort"] | undefined): string {
  if (eff === "Today") return "TODAY";
  if (eff === "This Week") return "THIS WEEK";
  if (eff === "This Month") return "THIS MONTH";
  return "—";
}

function effortStyle(eff: Leak["revenueEffort"] | undefined): {
  border: string;
  color: string;
} {
  if (eff === "Today") {
    return {
      border: "1px solid rgba(0,230,118,0.3)",
      color: "rgba(0,230,118,0.7)",
    };
  }
  if (eff === "This Week") {
    return {
      border: "1px solid rgba(0,200,255,0.25)",
      color: "rgba(0,200,255,0.6)",
    };
  }
  if (eff === "This Month") {
    return {
      border: "1px solid rgba(255,107,0,0.25)",
      color: "rgba(255,107,0,0.6)",
    };
  }
  return {
    border: "1px solid rgba(0,200,255,0.2)",
    color: "rgba(240,244,255,0.35)",
  };
}

export type PrioritySeverityFilter = "ALL" | "CRITICAL" | "HIGH" | "THIS_WEEK";

export type PriorityEffortFilter = "ALL" | "TODAY" | "THIS_WEEK_EFFORT" | "THIS_MONTH";

export function PriorityTabs() {
  return null;
}

const MAX_QUEUE = 8;

export default function PriorityList({
  reports,
  resolvedKeys,
  onToggleResolved,
  activeDomain,
  filterVariant = "severity",
  hideFilters = false,
  compact = false,
  showFullQueue = false,
}: {
  reports: StoredReportRow[];
  resolvedKeys: Set<string>;
  onToggleResolved: (resolutionKey: string) => Promise<void>;
  activeDomain?: string;
  /** severity: ALL | CRITICAL | HIGH IMPACT | THIS WEEK. effort: ALL | TODAY | THIS WEEK | THIS MONTH */
  filterVariant?: "severity" | "effort";
  hideFilters?: boolean;
  compact?: boolean;
  /** When true, list every money-leak issue (no 8-item cap). */
  showFullQueue?: boolean;
}) {
  const [severityFilter, setSeverityFilter] =
    useState<PrioritySeverityFilter>("ALL");
  const [effortFilter, setEffortFilter] =
    useState<PriorityEffortFilter>("ALL");

  const allIssues = useMemo(
    () =>
      collectPriorityIssues({
        reports,
        resolvedKeys,
        activeDomain: activeDomain || undefined,
        includeResolved: true,
      }),
    [reports, resolvedKeys, activeDomain]
  );

  const filtered = useMemo(() => {
    let list = allIssues;
    if (filterVariant === "effort") {
      if (effortFilter === "TODAY") {
        list = list.filter((i) => i.revenueEffort === "Today");
      } else if (effortFilter === "THIS_WEEK_EFFORT") {
        list = list.filter((i) => i.revenueEffort === "This Week");
      } else if (effortFilter === "THIS_MONTH") {
        list = list.filter((i) => i.revenueEffort === "This Month");
      }
      const capEff = showFullQueue ? list.length : MAX_QUEUE;
      return list.slice(0, capEff);
    }
    if (severityFilter === "CRITICAL") {
      list = list.filter(isCriticalDisplay);
    } else if (severityFilter === "HIGH") {
      list = list.filter(isHighImpactDisplay);
    } else if (severityFilter === "THIS_WEEK") {
      list = list.filter((i) => i.revenueEffort === "This Week");
    }
    const cap = showFullQueue ? list.length : MAX_QUEUE;
    return list.slice(0, cap);
  }, [
    allIssues,
    severityFilter,
    effortFilter,
    filterVariant,
    showFullQueue,
  ]);

  const globalEmpty = allIssues.length === 0;

  const latestRow = useMemo(() => {
    const rows = activeDomain
      ? reports.filter(
          (r) =>
            r.domain.trim().toLowerCase().replace(/^www\./, "") ===
            activeDomain.trim().toLowerCase().replace(/^www\./, "")
        )
      : reports;
    return [...rows].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [reports, activeDomain]);

  const hasReportButNoMoneyLeaks =
    !!latestRow && getDashboardMoneyLeaks(latestRow.analysis).length === 0;

  return (
    <div style={{ marginTop: 0 }}>
      {!globalEmpty && !hideFilters && filterVariant === "severity" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 14,
          }}
        >
          {(
            [
              { key: "ALL" as const, label: "ALL" },
              { key: "CRITICAL" as const, label: "CRITICAL" },
              { key: "HIGH" as const, label: "HIGH IMPACT" },
              { key: "THIS_WEEK" as const, label: "THIS WEEK" },
            ] as const
          ).map(({ key, label }) => {
            const active = severityFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSeverityFilter(key)}
                style={{
                  padding: "5px 10px",
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  border: active
                    ? "1px solid rgba(0,200,255,0.35)"
                    : "1px solid rgba(0,200,255,0.08)",
                  borderRadius: 2,
                  background: active
                    ? "rgba(0,200,255,0.06)"
                    : "rgba(240,244,255,0.02)",
                  color: active ? "rgba(0,200,255,0.9)" : "rgba(240,244,255,0.4)",
                  transition: "border-color 150ms ease, color 150ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {!globalEmpty && !hideFilters && filterVariant === "effort" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 14,
          }}
        >
          {(
            [
              { key: "ALL" as const, label: "ALL" },
              { key: "TODAY" as const, label: "TODAY" },
              { key: "THIS_WEEK_EFFORT" as const, label: "THIS WEEK" },
              { key: "THIS_MONTH" as const, label: "THIS MONTH" },
            ] as const
          ).map(({ key, label }) => {
            const active = effortFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEffortFilter(key)}
                style={{
                  padding: "5px 10px",
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  border: active
                    ? "1px solid rgba(0,200,255,0.35)"
                    : "1px solid rgba(0,200,255,0.08)",
                  borderRadius: 2,
                  background: active
                    ? "rgba(0,200,255,0.06)"
                    : "rgba(240,244,255,0.02)",
                  color: active ? "rgba(0,200,255,0.9)" : "rgba(240,244,255,0.4)",
                  transition: "border-color 150ms ease, color 150ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {globalEmpty ? (
        <div
          style={{
            padding: "28px 20px",
            textAlign: "center",
            border: "1px solid rgba(0,200,255,0.08)",
            borderRadius: 2,
            background: "rgba(240,244,255,0.02)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 10,
              color: "rgba(240,244,255,0.55)",
              letterSpacing: "0.08em",
              lineHeight: 1.5,
            }}
          >
            {hasReportButNoMoneyLeaks
              ? "Your top fixes appear here after your first scan."
              : "Run a scan to see what's driving visitors away."}
          </div>
        </div>
      ) : (
        filtered.map((issue) => {
          const critical = isCriticalDisplay(issue);
          const badgeLabel = critical ? "CRITICAL" : "HIGH";
          const badgeColor = critical ? "#FF2D2D" : "#FF6B00";
          const badgeBorder = critical
            ? "rgba(255,45,45,0.35)"
            : "rgba(255,107,0,0.35)";
          const isResolved = resolvedKeys.has(issue.resolutionKey);
          const ef = effortStyle(issue.revenueEffort);

          const pad = compact ? "8px 10px" : "12px 14px";
          const gap = compact ? 8 : 12;
          const titleSize = compact ? 10 : 11;
          return (
            <div
              key={issue.resolutionKey}
              style={{
                marginBottom: compact ? 6 : 8,
                border: "1px solid rgba(0,200,255,0.08)",
                borderRadius: 2,
                background: "rgba(240,244,255,0.02)",
                borderLeft: `3px solid ${critical ? "#FF2D2D" : "#FF6B00"}`,
                padding: pad,
                display: "flex",
                alignItems: "center",
                gap,
                flexWrap: "wrap",
              }}
            >
              <input
                type="checkbox"
                checked={isResolved}
                onChange={() => void onToggleResolved(issue.resolutionKey)}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: "rgba(0,200,255,0.8)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                aria-label={isResolved ? "Mark unresolved" : "Mark resolved"}
              />

              <span
                className="font-mono"
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  padding: "3px 8px",
                  border: `1px solid ${badgeBorder}`,
                  color: badgeColor,
                  background: "transparent",
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  flexShrink: 0,
                }}
              >
                {badgeLabel}
              </span>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {compact ? (
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: badgeColor,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${critical ? "rgba(255,45,45,0.45)" : "rgba(255,107,0,0.35)"}`,
                    }}
                  />
                ) : null}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: titleSize,
                    color: isResolved ? "rgba(240,244,255,0.35)" : "#F0F4FF",
                    fontWeight: 600,
                    textDecoration: isResolved ? "line-through" : "none",
                    lineHeight: 1.35,
                  }}
                >
                  {issue.title}
                </div>
              </div>

              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  padding: "3px 8px",
                  border: ef.border,
                  color: ef.color,
                  background: "transparent",
                  flexShrink: 0,
                }}
              >
                {effortLabel(issue.revenueEffort)}
              </span>

              <a
                href={`/issue/${encodeURIComponent(issue.reportId)}/${encodeURIComponent(issue.findingId)}`}
                style={{
                  flexShrink: 0,
                  color: "rgba(0,200,255,0.85)",
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textDecoration: "none",
                  padding: "4px 8px",
                  border: "1px solid rgba(0,200,255,0.2)",
                  borderRadius: 2,
                  background: "transparent",
                }}
              >
                VIEW DIAGNOSTIC →
              </a>
            </div>
          );
        })
      )}
    </div>
  );
}
