"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DimensionScoreRow } from "@/lib/reportSchema";
import { REVENUE_DIMENSIONS } from "@/lib/revenueDimensions";

const DIM_FILL: Record<DimensionScoreRow["status"], string> = {
  critical: "#FF2D2D",
  weak: "#FF6B00",
  fair: "#FFB800",
  strong: "#00E676",
};

/** Radar vertex order — matches bar dimensions (Architecture → Foundation). */
const RADAR_LABELS = [
  "Architecture",
  "Trust",
  "Clarity",
  "Traffic",
  "Foundation",
] as const;

const CI_DIMENSION_BAR_LABEL: Record<string, string> = {
  capture: "Conv. Architecture",
  trust: "Trust Signals",
  infrastructure: "Tech Foundation",
  position: "Message Clarity",
  visibility: "Traffic Ready",
};

const DIMENSION_NAME_TO_ID: Record<string, string> = {
  "Conversion Architecture": "capture",
  "Conv. Architecture": "capture",
  "Trust Signals": "trust",
  "Technical Foundation": "infrastructure",
  "Tech Foundation": "infrastructure",
  "Message Clarity": "position",
  "Traffic Readiness": "visibility",
  "Traffic Ready": "visibility",
};

function inferStatusFromScore(score: number): DimensionScoreRow["status"] {
  if (score < 30) return "critical";
  if (score < 50) return "weak";
  if (score < 70) return "fair";
  return "strong";
}

function normalizeBarRow(row: DimensionScoreRow, index: number): {
  key: string;
  barId: string;
  barLabel: string;
  score: number;
  status: DimensionScoreRow["status"];
} {
  const dimNameRaw = (row as unknown as { dimension?: string }).dimension;
  const dimName = typeof dimNameRaw === "string" ? dimNameRaw.trim() : "";
  const barId = dimName ? DIMENSION_NAME_TO_ID[dimName] ?? row.id : row.id;
  const barLabel =
    dimName ||
    CI_DIMENSION_BAR_LABEL[barId] ||
    row.label ||
    barId ||
    `dim-${index}`;
  const status = row.status ?? inferStatusFromScore(row.score);
  const key = `${barId}-${index}-${row.score}`;
  return { key, barId, barLabel, score: row.score, status };
}

function contextForDimensionId(id: string, score: number): string {
  switch (id) {
    case "capture":
      if (score < 30) return "Above-fold conversion signals critically weak";
      if (score < 60) return "Conversion path has significant gaps";
      return "Conversion fundamentals in place";
    case "trust":
      if (score < 30) return "Insufficient trust signals — visitors won't buy";
      if (score < 60) return "Trust signals present but incomplete";
      return "Trust foundation established";
    case "infrastructure":
      if (score < 30) return "Missing critical revenue capture mechanisms";
      if (score < 60) return "Basic infrastructure present, gaps remain";
      return "Revenue infrastructure solid";
    case "position":
      if (score < 30) return "No clear differentiation from competitors";
      if (score < 60) return "Positioning exists but not compelling";
      return "Market position clearly communicated";
    case "visibility":
      if (score < 30) return "Significant visibility and reach issues";
      if (score < 60) return "Visibility adequate, optimization needed";
      return "Good search and mobile performance";
    default:
      if (score < 30) return "Critical gaps in this area";
      if (score < 60) return "Room to strengthen before it drives revenue";
      return "Solid performance in this dimension";
  }
}

function normalizeDimensionRowId(id: string): string {
  return String(id ?? "")
    .replace(/^ci[-_]?/i, "")
    .toLowerCase();
}

const CANON_ID_TO_RADAR_SLOT: Record<string, number> = {
  capture: 0,
  trust: 1,
  position: 2,
  visibility: 3,
  infrastructure: 4,
};

const CI_DIMENSION_NAME_TO_SLOT: Record<string, number> = {
  "Conversion Architecture": 0,
  "Conv. Architecture": 0,
  "Trust Signals": 1,
  "Message Clarity": 2,
  "Traffic Readiness": 3,
  "Traffic Ready": 3,
  "Technical Foundation": 4,
  "Tech Foundation": 4,
};

function radarSlotForRow(row: DimensionScoreRow, index: number): number | undefined {
  const rowAny = row as unknown as {
    dimension?: string;
    dimension_name?: string;
    dimensionName?: string;
    label?: string;
  };
  const dimRaw = String(
    rowAny.dimension ?? rowAny.dimension_name ?? rowAny.dimensionName ?? rowAny.label ?? ""
  ).trim();
  const byName = CI_DIMENSION_NAME_TO_SLOT[dimRaw];
  if (byName !== undefined) return byName;

  const { barId } = normalizeBarRow(row, index);
  const fromBar = normalizeDimensionRowId(barId);
  if (fromBar in CANON_ID_TO_RADAR_SLOT) return CANON_ID_TO_RADAR_SLOT[fromBar];
  const fromRowId = normalizeDimensionRowId(row.id);
  if (fromRowId in CANON_ID_TO_RADAR_SLOT) return CANON_ID_TO_RADAR_SLOT[fromRowId];
  const hit = REVENUE_DIMENSIONS.find(
    (dim) =>
      fromBar === dim.id ||
      fromRowId === dim.id ||
      row.id === dim.id ||
      barId === dim.id
  );
  return hit ? CANON_ID_TO_RADAR_SLOT[hit.id] : undefined;
}

/**
 * Five scores (0–100) in radar order: Architecture, Trust, Clarity, Traffic, Foundation.
 * Same mapping as the bar list scores.
 */
function radarScoresFiveFromRows(rows: DimensionScoreRow[] | undefined): number[] {
  const out = [0, 0, 0, 0, 0];
  if (!rows?.length) return out;
  rows.forEach((row, idx) => {
    const slot = radarSlotForRow(row, idx);
    if (slot === undefined) return;
    const raw = row as unknown as {
      score?: unknown;
      value?: unknown;
      healthScore?: unknown;
      dimensionScore?: unknown;
    };
    const n = Number(
      raw.score ?? raw.value ?? raw.healthScore ?? raw.dimensionScore ?? 0
    );
    const s = Number.isFinite(n) ? n : 0;
    const clamped = Math.min(100, Math.max(0, s));
    if (clamped > out[slot]) out[slot] = clamped;
  });
  return out;
}

/** STEP 1 reference values — used only when forcing a visual smoke test (optional). */
const HARDCODED_RADAR_SCORES: number[] = [20, 15, 25, 30, 35];

/**
 * Pure SVG pentagon radar — no chart libraries.
 * Rings at 20/40/60/80/100; data as filled polygon; padding ≥ 40 for labels.
 */
function ConversionHealthRadarSvg({
  scoresFive,
  emptyMessage,
  useHardcodedData = false,
}: {
  scoresFive: number[];
  emptyMessage?: string;
  /** Set true to render STEP 1 hardcoded values (dev only). */
  useHardcodedData?: boolean;
}) {
  const values = useHardcodedData ? HARDCODED_RADAR_SCORES : scoresFive;

  const VB_W = 340;
  const VB_H = 340;
  const cx = VB_W / 2;
  const cy = VB_H / 2;
  /** Max radius so center ± (R + label) stays inside padded box. */
  const MAX_R = 88;
  const LABEL_R = MAX_R + 36;
  const N = 5;

  const angles = useMemo(
    () => Array.from({ length: N }, (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / N),
    []
  );

  const pt = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const ringPolygonPath = (scale01: number) => {
    const d = angles
      .map((a, i) => {
        const { x, y } = pt(a, MAX_R * scale01);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    return `${d} Z`;
  };

  const dataPolygonPath = () => {
    const d = angles
      .map((a, i) => {
        const raw = values[i] ?? 0;
        const t = Math.min(1, Math.max(0, raw / 100));
        const { x, y } = pt(a, MAX_R * t);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    return `${d} Z`;
  };

  const hasData = values.some((s) => s > 0);

  const ringScales = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 220, margin: "0 auto" }}>
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Conversion health by dimension"
      >
        {ringScales.map((s) => (
          <path
            key={s}
            d={ringPolygonPath(s)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}
        {angles.map((a, i) => {
          const outer = pt(a, MAX_R);
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}
        {hasData ? (
          <path
            d={dataPolygonPath()}
            fill="rgba(0,200,255,0.15)"
            stroke="#00C8FF"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {angles.map((a, i) => {
          const { x, y } = pt(a, LABEL_R);
          const left = x < cx - 12;
          const right = x > cx + 12;
          const textAnchor = left ? "end" : right ? "start" : "middle";
          const dx = left ? -4 : right ? 4 : 0;
          return (
            <text
              key={`lbl-${i}`}
              x={x + dx}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.6)"
              fontSize={11}
              fontFamily="var(--font-space-grotesk), sans-serif"
            >
              {RADAR_LABELS[i]}
            </text>
          );
        })}
      </svg>
      {!hasData && emptyMessage ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            padding: "0 24px",
            textAlign: "center",
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 9,
            color: "rgba(240,244,255,0.4)",
            lineHeight: 1.5,
          }}
        >
          {emptyMessage}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardRevenueHealth({
  dimensionScores,
}: {
  dimensionScores: DimensionScoreRow[] | undefined;
}) {
  const [barsReady, setBarsReady] = useState(false);
  const hasAnimated = useRef(false);

  const radarScoresFive = useMemo(
    () => radarScoresFiveFromRows(dimensionScores),
    [dimensionScores]
  );

  const hasRealScores = useMemo(() => {
    return (
      Array.isArray(dimensionScores) &&
      dimensionScores.length > 0 &&
      dimensionScores.some((d) => d.score > 0)
    );
  }, [dimensionScores]);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      if (t < 1) requestAnimationFrame(tick);
      else setTimeout(() => setBarsReady(true), 100);
    };
    requestAnimationFrame(tick);
  }, []);

  /** STEP 2: wire real rows; set to true only to verify STEP 1 rendering. */
  const USE_HARDCODED_RADAR = false;

  return (
    <div
      className="rounded-lg border border-white/5 bg-[rgba(240,244,255,0.02)]"
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 40,
        alignItems: "flex-start",
        padding: "24px 28px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
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
          CONVERSION HEALTH
        </span>

        {hasRealScores && dimensionScores
          ? dimensionScores.map((dim, idx) => {
              const { key, barId, barLabel, score, status } = normalizeBarRow(dim, idx);
              const fill = DIM_FILL[status];
              return (
                <div
                  key={key}
                  style={{
                    marginBottom: idx === dimensionScores.length - 1 ? 0 : 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                        fontSize: 9,
                        color: "#F0F4FF",
                        lineHeight: 1.25,
                      }}
                    >
                      {barLabel}
                    </div>
                    <div
                      style={{
                        flexShrink: 0,
                        textAlign: "right",
                        fontFamily: "var(--font-orbitron)",
                        fontWeight: 700,
                        fontSize: 11,
                        color: fill,
                      }}
                    >
                      {score}
                    </div>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: barsReady ? `${score}%` : "0%",
                        height: "100%",
                        borderRadius: 2,
                        background: fill,
                        transition: barsReady ? "width 0.8s ease-out" : "none",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 8,
                      color: "rgba(240,244,255,0.35)",
                      fontStyle: "italic",
                      lineHeight: 1.45,
                      marginTop: 6,
                    }}
                  >
                    {barLabel} at {score}/100:{" "}
                    {contextForDimensionId(barId, score)}
                  </div>
                </div>
              );
            })
          : null}
      </div>

      <div style={{ width: 220, flexShrink: 0 }}>
        <ConversionHealthRadarSvg
          scoresFive={radarScoresFive}
          emptyMessage={!hasRealScores ? "Rescan to populate" : undefined}
          useHardcodedData={USE_HARDCODED_RADAR}
        />
      </div>
    </div>
  );
}
