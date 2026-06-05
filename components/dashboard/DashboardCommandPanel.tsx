"use client";

import { useEffect, useState, type ReactNode } from "react";
import { displayScoreColor, webDocScoreBandUpper } from "@/lib/displayScoreColor";

/** DESIGN_SYSTEM.md — score readout color bands (no cyan on score). */
export function commandPanelScoreColor(score: number): string {
  return displayScoreColor(score);
}

const RING_SIZE = 120;
const STROKE = 6;
const R = (RING_SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

const spaceMono = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";

/** Fixed height so Critical/High cards never stretch when More Findings shows a hint. */
const STAT_CARD_HEIGHT = 108;

type Props = {
  domain: string;
  hasReport: boolean;
  score: number;
  prevDelta: ReactNode;
  criticalCount: number;
  highCount: number;
  /** Additional findings beyond the priority queue (progressive disclosure). */
  lockedMoreFindingsCount: number;
  priorityFindingsShown: number;
  /** Total rubric checks (e.g. 264) for footer copy. */
  checksTotal: number;
  /** Kept for call-site compatibility; not shown in ZONE B after stat blocks. */
  moneyLeakTotal: number;
  /** When true, hide access-restriction copy on the More Findings card. */
  isProUser?: boolean;
  lastScannedLabel: string;
  pageCount: number;
  onScanNew: () => void;
  /** Optional; defaults to `onScanNew` when omitted. */
  onRescan?: () => void;
  reportHref: string;
};

export default function DashboardCommandPanel({
  domain,
  hasReport,
  score,
  prevDelta,
  criticalCount,
  highCount,
  lockedMoreFindingsCount,
  priorityFindingsShown,
  checksTotal,
  moneyLeakTotal: _moneyLeakTotal,
  isProUser = false,
  lastScannedLabel,
  pageCount,
  onScanNew,
  onRescan,
  reportHref,
}: Props) {
  const ringColor = hasReport ? commandPanelScoreColor(score) : "rgba(240,244,255,0.2)";
  const [ringProgress, setRingProgress] = useState(0);
  const [moreFindingsHover, setMoreFindingsHover] = useState(false);
  const [moreFindingsPinned, setMoreFindingsPinned] = useState(false);
  const runRescan = onRescan ?? onScanNew;
  const disclosureHint = isProUser
    ? ""
    : `Resolve your ${priorityFindingsShown} priority findings first. Once resolved, the next layer of optimizations surfaces.`;
  const showMoreFindingsHint = moreFindingsHover || moreFindingsPinned;

  useEffect(() => {
    if (!hasReport) {
      setRingProgress(0);
      return;
    }
    setRingProgress(0);
    const id = window.setTimeout(() => {
      setRingProgress(Math.min(1, score / 100));
    }, 50);
    return () => window.clearTimeout(id);
  }, [hasReport, score]);

  return (
    <div
      style={{
        background: "rgba(0,200,255,0.03)",
        borderBottom: "1px solid rgba(0,200,255,0.08)",
        padding: "14px 24px 18px",
        display: "flex",
        alignItems: "stretch",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      {/* ZONE A */}
      <div
        style={{
          width: 200,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: RING_SIZE,
            height: RING_SIZE,
          }}
        >
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={STROKE}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              strokeDasharray={`${ringProgress * C} ${C}`}
              style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
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
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-orbitron), sans-serif",
                fontWeight: 700,
                fontSize: 36,
                lineHeight: 1,
                color: ringColor,
              }}
            >
              {hasReport ? score : "—"}
            </div>
            <div
              style={{
                fontFamily: spaceMono,
                fontSize: 9,
                color: "rgba(240,244,255,0.3)",
                marginTop: 2,
              }}
            >
              /100
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: spaceMono,
                fontSize: 8,
                letterSpacing: "0.18em",
                color: "rgba(0,200,255,0.55)",
                textAlign: "center",
              }}
            >
              CONVERSION SCORE
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: spaceMono,
            fontSize: 8,
            letterSpacing: "0.15em",
            color: hasReport ? commandPanelScoreColor(score) : "rgba(240,244,255,0.35)",
            textAlign: "center",
          }}
        >
          {hasReport ? webDocScoreBandUpper(score) : "—"}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: spaceMono,
            fontSize: 10,
            textAlign: "center",
            minHeight: 16,
          }}
        >
          {prevDelta}
        </div>
      </div>

      {/* ZONE B */}
      <div
        style={{
          flex: 1,
          minWidth: 220,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "visible",
        }}
      >
        <div
          style={{
            fontFamily: spaceMono,
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "rgba(240,244,255,0.45)",
          }}
        >
          · {domain}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              justifyContent: "center",
              padding: "12px 16px",
              background: "rgba(255,45,45,0.06)",
              border: "1px solid rgba(255,45,45,0.15)",
              borderRadius: 4,
              minWidth: 100,
              height: STAT_CARD_HEIGHT,
              minHeight: STAT_CARD_HEIGHT,
              maxHeight: STAT_CARD_HEIGHT,
              boxSizing: "border-box",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-orbitron), sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#FF2D2D",
              }}
            >
              {criticalCount}
            </span>
            <span
              style={{
                fontFamily: spaceMono,
                fontSize: 8,
                letterSpacing: "0.15em",
                color: "#FF2D2D",
                opacity: 0.8,
              }}
            >
              CRITICAL
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              justifyContent: "center",
              padding: "12px 16px",
              background: "rgba(255,107,0,0.06)",
              border: "1px solid rgba(255,107,0,0.15)",
              borderRadius: 4,
              minWidth: 100,
              height: STAT_CARD_HEIGHT,
              minHeight: STAT_CARD_HEIGHT,
              maxHeight: STAT_CARD_HEIGHT,
              boxSizing: "border-box",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-orbitron), sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#FF6B00",
              }}
            >
              {highCount}
            </span>
            <span
              style={{
                fontFamily: spaceMono,
                fontSize: 8,
                letterSpacing: "0.15em",
                color: "#FF6B00",
                opacity: 0.8,
              }}
            >
              HIGH IMPACT
            </span>
          </div>
          <div
            style={{
              position: "relative",
              flexShrink: 0,
              minWidth: 100,
              height: STAT_CARD_HEIGHT,
              minHeight: STAT_CARD_HEIGHT,
              maxHeight: STAT_CARD_HEIGHT,
            }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-expanded={showMoreFindingsHint}
              aria-label={
                isProUser
                  ? "Additional diagnostic findings beyond the priority queue"
                  : "More findings; full access requires Pro diagnostic license"
              }
              onMouseEnter={() => setMoreFindingsHover(true)}
              onMouseLeave={() => setMoreFindingsHover(false)}
              onClick={() => setMoreFindingsPinned((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setMoreFindingsPinned((v) => !v);
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                justifyContent: "center",
                padding: "12px 16px",
                background: "rgba(0,200,255,0.04)",
                border: "1px solid rgba(0,200,255,0.12)",
                borderRadius: 4,
                minWidth: 100,
                height: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
                cursor: "pointer",
                opacity: 0.85,
                transition: "opacity 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-orbitron), sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(0,200,255,0.55)",
                }}
              >
                {lockedMoreFindingsCount}
              </span>
              <span
                style={{
                  fontFamily: spaceMono,
                  fontSize: 8,
                  letterSpacing: "0.15em",
                  color: "rgba(0,200,255,0.45)",
                }}
              >
                MORE FINDINGS
              </span>
              {!isProUser ? (
                <span
                  style={{
                    fontFamily: spaceMono,
                    fontSize: 11,
                    color: "#8899AA",
                    letterSpacing: "0.06em",
                    lineHeight: 1.35,
                  }}
                >
                  Full access requires Pro diagnostic license.
                </span>
              ) : null}
            </div>
            {showMoreFindingsHint && disclosureHint ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "100%",
                  marginTop: 8,
                  zIndex: 30,
                  maxWidth: 260,
                  padding: "10px 12px",
                  borderRadius: 4,
                  border: "1px solid rgba(0,200,255,0.15)",
                  background: "rgba(7,12,20,0.98)",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: spaceMono,
                    fontSize: 7,
                    color: "rgba(240,244,255,0.5)",
                    letterSpacing: "0.04em",
                    lineHeight: 1.5,
                  }}
                >
                  {disclosureHint}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            marginTop: 12,
            fontFamily: spaceMono,
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.06em",
          }}
        >
          <span>LAST SCANNED · {lastScannedLabel}</span>
          <span>PAGES ANALYZED · {pageCount}</span>
          <span>CHECKS RUN · {checksTotal}</span>
        </div>
      </div>

      {/* ZONE C */}
      <div
        style={{
          width: 200,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {isProUser ? (
          <button
            type="button"
            onClick={runRescan}
            style={{
              background: "transparent",
              border: "1px solid rgba(0,200,255,0.35)",
              borderRadius: 8,
              padding: "10px 16px",
              color: "var(--cyan)",
              fontFamily: spaceMono,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            ↺ RESCAN
          </button>
        ) : null}
        <a
          href={reportHref}
          style={{
            fontFamily: spaceMono,
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "rgba(0,200,255,0.55)",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          VIEW FULL REPORT →
        </a>
      </div>
    </div>
  );
}
