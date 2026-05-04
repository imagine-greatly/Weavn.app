"use client";

import type { ReportPayload } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

function scoreTabColor(score: number): string {
  if (score >= 70) return "#00E676";
  if (score >= 50) return "#FFB800";
  if (score >= 30) return "#FF6B00";
  return "#FF2D2D";
}

export default function SiteTabs({
  domains,
  reports,
  effectiveDomain,
  onSelect,
  onDelete,
  onScanNew,
  addSiteDisabled = false,
  addSiteDisabledReason = "",
  deletingDomain = null,
}: {
  domains: string[];
  reports: StoredReportRow[];
  effectiveDomain: string;
  onSelect: (domain: string) => void;
  onDelete: (domain: string) => void;
  onScanNew: () => void;
  /** When true, + is muted and inert; use wrapper title for tooltip (native disabled title is unreliable). */
  addSiteDisabled?: boolean;
  addSiteDisabledReason?: string;
  deletingDomain?: string | null;
}) {
  return (
    <>
      <style>{`
        .site-tabs-row::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        className="site-tabs-row flex w-full max-w-full flex-nowrap overflow-x-auto"
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          gap: 0,
          marginBottom: 24,
          marginTop: 0,
          paddingTop: 0,
          minWidth: 0,
          scrollbarWidth: "none",
          background: "rgba(240,244,255,0.02)",
          border: "1px solid rgba(0,200,255,0.08)",
          borderRadius: 4,
          padding: 0,
          backdropFilter: "blur(12px)",
        }}
      >
      {domains.map((d) => {
        const dr = reports
          .filter((r) => r.domain === d)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestTab = dr[0];
        const score = latestTab?.analysis?.healthScore ?? 0;
        const money = getDashboardMoneyLeaks(latestTab?.analysis);
        const critTab = money.filter(
          (l) => l.severity === "critical" || l.rubricSeverity === "Critical"
        ).length;
        const active = d === effectiveDomain;
        const scoreCol = scoreTabColor(score);

        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className="box-border shrink-0"
            style={{
              boxSizing: "border-box",
              minWidth: 220,
              maxWidth: 320,
              padding: "10px 18px",
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 10,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              cursor: "pointer",
              border: "none",
              borderRight: "1px solid rgba(255,255,255,0.1)",
              borderBottom: active ? "2px solid #00C8FF" : "2px solid transparent",
              background: "transparent",
              borderRadius: 0,
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              opacity: active ? 1 : 0.5,
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              transition: "opacity 150ms ease, color 150ms ease, border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.opacity = "0.85";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.opacity = "0.5";
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
                flex: "1 1 0%",
                overflow: "hidden",
              }}
            >
              <img
                src={`https://${d}/favicon.ico`}
                alt=""
                width={14}
                height={14}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                }}
              >
                {d}
              </span>
            </span>
            <span
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontWeight: 900,
                  fontSize: 11,
                  color: scoreCol,
                  minWidth: "1.75em",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {score}
              </span>
              {critTab > 0 && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--red)",
                    boxShadow: "0 0 6px rgba(255,45,45,0.6)",
                    animation: "livePulse 2s infinite",
                    flexShrink: 0,
                  }}
                />
              )}

              {active && (
                <div
                  role="button"
                  tabIndex={deletingDomain === d ? -1 : 0}
                  title={deletingDomain === d ? "Deleting..." : "Delete site"}
                  aria-disabled={deletingDomain === d}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (deletingDomain === d) return;
                    if (
                      window.confirm(
                        `Delete all scans for ${d}?\n\nThis cannot be undone.`
                      )
                    ) {
                      onDelete(d);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (deletingDomain === d) return;
                    if (
                      window.confirm(
                        `Delete all scans for ${d}?\n\nThis cannot be undone.`
                      )
                    ) {
                      onDelete(d);
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: deletingDomain === d ? "not-allowed" : "pointer",
                    color: deletingDomain === d ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
                    fontSize: 10,
                    padding: "0 2px",
                    lineHeight: 1,
                    transition: "color 150ms ease",
                    flexShrink: 0,
                    opacity: deletingDomain === d ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (deletingDomain === d) return;
                    e.currentTarget.style.color = "var(--red)";
                  }}
                  onMouseLeave={(e) => {
                    if (deletingDomain === d) return;
                    e.currentTarget.style.color = "rgba(255,255,255,0.2)";
                  }}
                >
                  {deletingDomain === d ? "…" : "✕"}
                </div>
              )}
            </span>
          </button>
        );
      })}
      <span
        title={
          addSiteDisabled && addSiteDisabledReason
            ? addSiteDisabledReason
            : "Scan a new site"
        }
        style={{
          display: "inline-flex",
          alignSelf: "stretch",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          disabled={addSiteDisabled}
          title={addSiteDisabled ? addSiteDisabledReason : undefined}
          onClick={() => {
            if (addSiteDisabled) return;
            onScanNew();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: "100%",
            minHeight: 44,
            background: "transparent",
            border: "none",
            borderLeft: "1px solid rgba(0,200,255,0.08)",
            color: addSiteDisabled
              ? "rgba(0,200,255,0.18)"
              : "rgba(0,200,255,0.5)",
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 16,
            cursor: addSiteDisabled ? "not-allowed" : "pointer",
            flexShrink: 0,
            transition: "color 150ms ease, background 150ms ease, opacity 150ms ease",
            opacity: addSiteDisabled ? 0.45 : 1,
          }}
          onMouseEnter={(e) => {
            if (addSiteDisabled) return;
            e.currentTarget.style.color = "#00C8FF";
            e.currentTarget.style.background = "rgba(0,200,255,0.06)";
          }}
          onMouseLeave={(e) => {
            if (addSiteDisabled) return;
            e.currentTarget.style.color = "rgba(0,200,255,0.5)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          +
        </button>
      </span>
    </div>
    </>
  );
}
