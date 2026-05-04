"use client";

import { useEffect, useRef, useState } from "react";
import { displayScoreColor, displayScoreRgb } from "@/lib/displayScoreColor";

/**
 * Report left panel — mission control: site identity, score ring, issue counts, categories, tabs.
 * DESIGN_SYSTEM.md: glow tiers, typography, colors.
 */

const RING_RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // 2π·80 ≈ 502.65
const ARC_DURATION_MS = 1400;
const EASING = "cubic-bezier(0.34, 1.1, 0.64, 1)";
const TICK_COUNT = 24;
const TICK_RADIUS_OUTER = 96;
const TICK_RADIUS_SHORT_INNER = 92;
const TICK_RADIUS_LONG_INNER = 88;
const CENTER = 100;

function tickPoints(i: number) {
  const deg = (i * 360) / TICK_COUNT;
  const rad = (deg * Math.PI) / 180;
  const isLong = i % 6 === 0;
  const rInner = isLong ? TICK_RADIUS_LONG_INNER : TICK_RADIUS_SHORT_INNER;
  const x1 = CENTER + rInner * Math.sin(rad);
  const y1 = CENTER - rInner * Math.cos(rad);
  const x2 = CENTER + TICK_RADIUS_OUTER * Math.sin(rad);
  const y2 = CENTER - TICK_RADIUS_OUTER * Math.cos(rad);
  return { x1, y1, x2, y2, isLong };
}

// Cubic-bezier(0.34, 1.1, 0.64, 1) — overshoot for score ring sync with arc
function cubicBezierY(x: number, x1 = 0.34, y1 = 1.1, x2 = 0.64, y2 = 1): number {
  const samples: { x: number; y: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const u = 1 - t;
    const xVal = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
    const yVal = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
    samples.push({ x: xVal, y: yVal });
  }
  if (x <= 0) return 0;
  if (x >= 1) return samples[100].y;
  for (let i = 0; i < 100; i++) {
    if (samples[i].x <= x && x <= samples[i + 1].x) {
      const d = samples[i + 1].x - samples[i].x;
      const t = d === 0 ? 0 : (x - samples[i].x) / d;
      return samples[i].y + t * (samples[i + 1].y - samples[i].y);
    }
  }
  return samples[100].y;
}

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

/** Ring number, arc, and badge — same bands as dashboard (no cyan on score). */
function getConversionScoreBand(score: number): {
  color: string;
  label: string;
  rgb: string;
} {
  const n = Number(score);
  const s = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  const color = displayScoreColor(s);
  const rgb = displayScoreRgb(s);
  if (s <= 39) return { color, label: "CRITICAL RISK", rgb };
  if (s <= 59) return { color, label: "AT RISK", rgb };
  if (s <= 79) return { color, label: "SUBOPTIMAL", rgb };
  return { color, label: "OPTIMIZED", rgb };
}

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
  const [displayScore, setDisplayScore] = useState(score);
  const [arcOffset, setArcOffset] = useState(CIRCUMFERENCE);
  const [flashActive, setFlashActive] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const prevScore = useRef(0);

  const band = getConversionScoreBand(score);
  const ringStrokeColor = band.color;
  const targetOffset = CIRCUMFERENCE * (1 - score / 100);

  // Arc sweep + count-up when score is available; re-run when score changes
  useEffect(() => {
    if (hasAnimated.current && prevScore.current === score) return;

    if (score === 0) {
      hasAnimated.current = true;
      prevScore.current = 0;
      setArcOffset(CIRCUMFERENCE);
      setDisplayScore(0);
      return;
    }

    hasAnimated.current = true;
    prevScore.current = score;

    setArcOffset(targetOffset);

    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / ARC_DURATION_MS, 1);
      const progress = cubicBezierY(t);
      const value = Math.round(score * Math.min(progress, 1.08));
      setDisplayScore(value);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplayScore(score);
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 800);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [score, targetOffset]);

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
      `}</style>

      {/* Section 1 — site identity + score ring (fixed) */}
      <div className="shrink-0" style={{ padding: "16px 24px 0 24px" }}>
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

        <div style={{ textAlign: "center", paddingBottom: 24 }}>
          <div
            style={{
              position: "relative",
              padding: "16px 20px 12px 20px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: `radial-gradient(ellipse, rgba(${band.rgb},0.08) 0%, transparent 70%)`,
                pointerEvents: "none",
                zIndex: 0,
              }}
              aria-hidden
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                className="flex items-center justify-center gap-2"
                style={{ marginBottom: 8 }}
              >
                <div
                  style={{
                    width: 24,
                    height: 1,
                    background: `rgba(${band.rgb},0.45)`,
                    boxShadow: `0 0 6px rgba(${band.rgb},0.35)`,
                  }}
                />
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    letterSpacing: "0.12em",
                  }}
                >
                  ● CONVERSION SCORE
                </span>
                <div
                  style={{
                    width: 24,
                    height: 1,
                    background: `rgba(${band.rgb},0.45)`,
                    boxShadow: `0 0 6px rgba(${band.rgb},0.35)`,
                  }}
                />
              </div>

              <div
                ref={ringRef}
                className={`relative inline-flex items-center justify-center ${flashActive ? "intensity-flash-once" : ""}`}
                style={{
                  width: 180,
                  height: 180,
                  boxShadow: flashActive
                    ? undefined
                    : `0 0 40px rgba(${band.rgb},0.12)`,
                  borderRadius: "50%",
                }}
              >
                <svg
                  width={180}
                  height={180}
                  viewBox="0 0 200 200"
                  className="-rotate-90"
                >
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={106}
                    fill="none"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                  />
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={98}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  />
                  {Array.from({ length: TICK_COUNT }, (_, i) => {
                    const { x1, y1, x2, y2, isLong } = tickPoints(i);
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={
                          isLong
                            ? "rgba(255,255,255,0.14)"
                            : "rgba(255,255,255,0.08)"
                        }
                        strokeWidth={1}
                      />
                    );
                  })}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={10}
                  />
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RING_RADIUS}
                    fill="none"
                    stroke={ringStrokeColor}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={arcOffset}
                    style={{
                      transition: `stroke-dashoffset ${ARC_DURATION_MS}ms ${EASING}`,
                    }}
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
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "clamp(48px, 8vw, 72px)",
                        fontWeight: 900,
                        lineHeight: 1,
                        color: band.color,
                        letterSpacing: "-2px",
                        fontFamily: "var(--font-orbitron), sans-serif",
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 80,
                        textAlign: "center",
                        textShadow: `0 0 20px ${band.color}, 0 0 40px rgba(${band.rgb},0.45)`,
                      }}
                    >
                      {displayScore > 0
                        ? displayScore
                        : score > 0
                          ? score
                          : "—"}
                    </div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginTop: 4,
                        letterSpacing: "0.08em",
                      }}
                    >
                      / 100
                    </div>
                  </div>
                </div>
              </div>

              <span
                className="font-mono inline-block"
                style={{
                  marginTop: 10,
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  color: band.color,
                }}
              >
                {band.label}
              </span>
              {typeof scoreDelta === "number" && scoreDelta !== 0 ? (
                <div
                  className="font-mono"
                  style={{
                    marginTop: 10,
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    color:
                      scoreDelta > 0
                        ? "var(--color-positive-muted)"
                        : "rgba(255,45,45,0.8)",
                  }}
                >
                  {scoreDelta > 0
                    ? `↑ +${scoreDelta} since last scan`
                    : `↓ ${Math.abs(scoreDelta)} since last scan`}
                </div>
              ) : null}
              {previousScanAt ? (
                <div
                  className="font-mono"
                  style={{
                    marginTop:
                      typeof scoreDelta === "number" && scoreDelta !== 0 ? 6 : 10,
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    color: "rgba(240,244,255,0.3)",
                  }}
                >
                  Last scanned: {formatRelativeScanDate(previousScanAt)}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {dimensionBars.length > 0 ? (
        <div
          className="shrink-0"
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
        className="shrink-0 border-t"
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
            className="font-mono flex w-full items-center justify-center gap-2 border transition-all duration-150"
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
