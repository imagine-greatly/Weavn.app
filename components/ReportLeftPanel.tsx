"use client";

import { displayScoreColor } from "@/lib/displayScoreColor";
import ConversionScoreGauge from "@/components/ConversionScoreGauge";

/**
 * Report left panel — mission control: site identity, score ring, issue counts, categories, tabs.
 * DESIGN_SYSTEM.md: glow tiers, typography, colors.
 */


export type CategoryScore = { id: string; name: string; score: number };

export type ReportNavSectionId = "brief" | "transformation" | "killers" | "blueprint";

function formatRelativeScanDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const absSec = Math.abs(diffSec);
  if (absSec < 45) return rtf.format(-Math.round(diffSec), "second");
  const absMin = Math.floor(absSec / 60);
  if (absMin < 60) return rtf.format(-Math.round(diffSec / 60), "minute");
  const absH = Math.floor(absSec / 3600);
  if (absH < 24) return rtf.format(-Math.round(diffSec / 3600), "hour");
  const absD = Math.floor(absSec / 86400);
  if (absD < 7) return rtf.format(-Math.round(diffSec / 86400), "day");
  const absW = Math.floor(absD / 7);
  if (absW < 5) return rtf.format(-absW, "week");
  const absMo = Math.floor(absD / 30);
  if (absMo < 12) return rtf.format(-absMo, "month");
  return rtf.format(-Math.floor(absD / 365), "year");
}

export type ReportLeftPanelProps = {
  domain: string;
  onRescan?: () => void;
  score: number;
  /** Set when this scan follows a prior report for the same domain (logged-in). */
  scoreDelta?: number;
  previousScanAt?: string;
  criticalCount: number;
  /** High-severity rubric failures (from payload). */
  highCount: number;
  /** Count of money-leak tier findings (max 8). */
  moneyLeaksCount: number;
  warningCount: number;
  passingCount: number;
  /** Per-category counts derived from findings */
  categoryFindingCounts: Record<
    string,
    {
      critical: number;
      warning: number;
      passing: number;
    }
  >;
  /** Legacy — unused in CI layout; kept for call-site compatibility. */
  categories?: CategoryScore[];
  activeCategoryId?: string | null;
  onCategoryClick?: (id: string) => void;
  severityFilter?: "all" | "critical" | "warnings" | "passing";
  onSeverityFilter?: (filter: "all" | "critical" | "warnings" | "passing") => void;
  siteType?: string;
  /** Public shared report: hide rescan + live indicator. */
  readOnlyLeftPanel?: boolean;
  /** Conversion Intelligence: five dimension bars (labels + 0–100 scores). */
  dimensionBars: { label: string; score: number }[];
  exitTriggersCount: number;
  activeNavSection: ReportNavSectionId;
  onNavSectionChange: (id: ReportNavSectionId) => void;
};

const NAV_PILLS: { id: ReportNavSectionId; label: string }[] = [
  { id: "brief", label: "BRIEF" },
  { id: "transformation", label: "TRANSFORMATION" },
  { id: "killers", label: "FINDINGS" },
  { id: "blueprint", label: "BLUEPRINT" },
];

export default function ReportLeftPanel({
  domain,
  onRescan,
  score,
  scoreDelta,
  previousScanAt,
  criticalCount: _criticalCount,
  highCount: _highCount,
  moneyLeaksCount: _moneyLeaksCount,
  warningCount: _warningCount,
  passingCount: _passingCount,
  categoryFindingCounts: _categoryFindingCounts,
  categories: _categories,
  activeCategoryId: _activeCategoryId,
  onCategoryClick: _onCategoryClick,
  severityFilter: _severityFilter,
  onSeverityFilter: _onSeverityFilter,
  siteType,
  readOnlyLeftPanel = false,
  dimensionBars,
  exitTriggersCount,
  activeNavSection,
  onNavSectionChange,
}: ReportLeftPanelProps) {
  return (
    <aside
      className="report-left-aside flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-r"
      style={{
        background: "#050810",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "4px 0 60px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.4) 50%, transparent 100%)",
          flexShrink: 0,
        }}
        aria-hidden
      />
      <style>{`
        .category-scroll::-webkit-scrollbar { display: none; }
        .category-scroll { scrollbar-width: none; }
        @media (max-width: 768px) {
          .report-left-aside {
            width: 100% !important;
            height: auto !important;
          }
          .report-left-top {
            padding: 20px 16px 0 16px !important;
          }
          .report-left-dimensions {
            padding: 0 16px !important;
          }
          .report-left-score-wrap {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .report-left-score-wrap > div {
            transform: scale(0.67);
            transform-origin: top center;
          }
          .report-left-bottom {
            padding: 14px 16px 18px !important;
          }
          .report-left-bottom .report-left-rescan-btn {
            min-height: 44px !important;
          }
        }
      `}</style>

      {/* Section 1 — site identity + score ring (fixed) */}
      <div className="report-left-top shrink-0" style={{ padding: "16px 24px 0 24px" }}>
        <div
          className="flex items-center gap-2.5"
          style={{ marginBottom: 20 }}
        >
          <div
            className="shrink-0 overflow-hidden"
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            <img
              src={`https://${domain}/favicon.ico`}
              alt=""
              width={20}
              height={20}
              style={{ width: 20, height: 20, objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <span
            className="font-mono text-[10px] uppercase"
            style={{ color: "var(--text-primary)", letterSpacing: "0.14em" }}
          >
            {domain}
          </span>
          {!readOnlyLeftPanel ? (
            <div
              className="ml-auto flex items-center gap-1.5"
              style={{ flexShrink: 0 }}
            >
              <span
                className="live-pulse shrink-0 rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "#00C8FF",
                }}
                aria-hidden
              />
              <span
                className="font-mono"
                style={{ fontSize: 10, color: "#00C8FF" }}
              >
                LIVE
              </span>
            </div>
          ) : (
            <div className="ml-auto" style={{ flexShrink: 0 }} aria-hidden />
          )}
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--border-default)",
            marginBottom: 28,
          }}
        />

        <div className="report-left-score-wrap">
          <ConversionScoreGauge
            score={score}
            scoreDelta={scoreDelta}
            previousScanAt={
              previousScanAt ? formatRelativeScanDate(previousScanAt) : undefined
            }
          />
        </div>
      </div>

      {dimensionBars.length > 0 ? (
        <div
          className="report-left-dimensions shrink-0"
          style={{
            padding: "0 24px",
            marginBottom: 20,
          }}
        >
          <div className="rounded-lg border border-white/5" style={{ padding: "10px 12px 8px" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 8,
              color: "#00C8FF",
              letterSpacing: "0.2em",
              marginBottom: 12,
            }}
          >
            ● CONVERSION HEALTH
          </div>
          {dimensionBars.map((bar, i) => {
            const sc = Math.max(0, Math.min(100, Math.round(bar.score)));
            const barColor = displayScoreColor(sc);
            return (
              <div key={`${bar.label}-${i}`} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 8,
                      color: "rgba(255,255,255,0.45)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {bar.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-orbitron), sans-serif",
                      fontSize: 9,
                      fontWeight: 700,
                      color: barColor,
                    }}
                  >
                    {sc}
                  </span>
                </div>
                <div
                  style={{
                    height: 2,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${sc}%`,
                      height: "100%",
                      borderRadius: 1,
                      background: barColor,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : null}

      <div
        className="category-scroll min-h-0 flex-1 overflow-y-auto"
        style={{ padding: "12px 20px 0" }}
      />

      <div
        className="report-left-bottom shrink-0 border-t"
        style={{
          background: "#050810",
          borderColor: "rgba(255,255,255,0.08)",
          padding: "14px 20px 18px",
        }}
      >
        <div
          style={{
            padding: "0 24px",
            marginBottom: 16,
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 9,
            color: "#00C8FF",
            letterSpacing: "0.12em",
          }}
        >
          ● {exitTriggersCount} IMPACT FINDINGS IDENTIFIED
        </div>
        <p
          className="font-mono"
          style={{
            color: "rgba(240,244,255,0.45)",
            fontSize: 10,
            letterSpacing: "0.14em",
            margin: "0 0 10px 0",
          }}
        >
          NAVIGATE
        </p>
        <nav className="flex flex-row flex-wrap gap-1.5">
          {NAV_PILLS.map(({ id, label }) => {
            const isActive = activeNavSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavSectionChange(id)}
                className="font-mono transition-[color,background-color,border-color] ease-out"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: `1px solid ${
                    isActive ? "rgba(0,200,255,0.45)" : "rgba(255,255,255,0.12)"
                  }`,
                  cursor: "pointer",
                  background: isActive ? "rgba(0,200,255,0.1)" : "transparent",
                  color: isActive ? "#00C8FF" : "rgba(240,244,255,0.45)",
                  transitionDuration: "150ms",
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.08)",
            margin: "14px 0 12px",
          }}
        />
        {!readOnlyLeftPanel && onRescan ? (
          <button
            type="button"
            onClick={onRescan}
            className="report-left-rescan-btn font-mono flex w-full items-center justify-center gap-2 border transition-all duration-150"
            style={{
              height: 36,
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "#00C8FF",
              borderColor: "rgba(0,200,255,0.35)",
              background: "rgba(0,200,255,0.06)",
              borderRadius: 4,
            }}
            aria-label="Rescan domain"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            RESCAN
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="font-mono"
          style={{
            marginTop: 8,
            display: "block",
            width: "100%",
            textAlign: "center",
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          PRINT
        </button>
      </div>
    </aside>
  );
}
