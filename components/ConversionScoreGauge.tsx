"use client";

import { useEffect, useRef, useState } from "react";
import { displayScoreColor, displayScoreRgb } from "@/lib/displayScoreColor";

const RING_RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
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

export default function ConversionScoreGauge({
  score,
  scoreDelta,
  previousScanAt,
  showDelta = true,
  showLastScanned = true,
}: {
  score: number;
  scoreDelta?: number;
  previousScanAt?: string;
  showDelta?: boolean;
  showLastScanned?: boolean;
}) {
  const [displayScore, setDisplayScore] = useState(score);
  const [arcOffset, setArcOffset] = useState(CIRCUMFERENCE);
  const [flashActive, setFlashActive] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const prevScore = useRef(0);

  const band = getConversionScoreBand(score);
  const ringStrokeColor = band.color;
  const targetOffset = CIRCUMFERENCE * (1 - score / 100);

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
    <div style={{ textAlign: "center", padding: 0, margin: 0 }}>
      <div
        style={{
          position: "relative",
          padding: 0,
          margin: 0,
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

          <div className="flex items-center justify-center gap-2" style={{ marginTop: 4, marginBottom: 2 }}>
            <div style={{ width: 24, height: 1, background: `rgba(${band.rgb},0.45)`, boxShadow: `0 0 6px rgba(${band.rgb},0.35)` }} />
            <span className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.12em" }}>● CONVERSION SCORE</span>
            <div style={{ width: 24, height: 1, background: `rgba(${band.rgb},0.45)`, boxShadow: `0 0 6px rgba(${band.rgb},0.35)` }} />
          </div>
          <span
            className="font-mono inline-block"
            style={{
              marginTop: 4,
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: "0.12em",
              color: band.color,
            }}
          >
            {band.label}
          </span>
          {showDelta && typeof scoreDelta === "number" && scoreDelta !== 0 ? (
            <div
              className="font-mono"
              style={{
                marginTop: 4,
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
          {showLastScanned && previousScanAt ? (
            <div
              className="font-mono"
              style={{
                marginTop:
                  showDelta && typeof scoreDelta === "number" && scoreDelta !== 0 ? 2 : 4,
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "rgba(240,244,255,0.3)",
              }}
            >
              Last scanned: {previousScanAt}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
