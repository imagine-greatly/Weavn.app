"use client";

import type { ReportPayload } from "@/lib/reportSchema";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

const CHART_CYAN = "#00C8FF";

export function scoreBandColor(score: number): string {
  if (score >= 70) return "#00E676";
  if (score >= 50) return "#FFB800";
  if (score >= 30) return "#FF6B00";
  return "#FF2D2D";
}

export default function ScoreHistoryChart({
  activeDomainReports,
  currentScore = 0,
  axisCaption,
}: {
  activeDomainReports: StoredReportRow[];
  /** Used for dashed “Next target” line at min(100, currentScore + 15) */
  currentScore?: number;
  /** Left-aligned note directly under the x-axis (date) labels */
  axisCaption?: string;
}) {
  if (activeDomainReports.length === 0) return null;

  const sorted = [...activeDomainReports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const scores = sorted.map((r) => r.analysis?.healthScore ?? 0);
  const dates = sorted.map((r) => r.created_at);

  const W = 600;
  const H = 174;
  const padL = 40;
  const padR = 20;
  const padT = 28;
  const padB = 36;
  const dateLabelY = H - 20;
  const captionY = H - 7;

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

  const refLines = [25, 50, 75];
  const maxScoreVal = Math.max(...scores);
  const peakIdx = scores.indexOf(maxScoreVal);
  const targetScore = Math.min(100, currentScore + 15);
  const targetInView = targetScore >= minS && targetScore <= maxS;
  const targetY = toY(targetScore);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {refLines.map((g) => {
        if (g < minS || g > maxS) return null;
        const gy = toY(g);
        return (
          <g key={g}>
            <line
              x1={padL}
              y1={gy}
              x2={W - padR}
              y2={gy}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={gy + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.28)"
              fontSize={8}
              fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
            >
              {g}
            </text>
          </g>
        );
      })}

      {targetInView && (
        <g>
          <line
            x1={padL}
            y1={targetY}
            x2={W - padR}
            y2={targetY}
            stroke="rgba(0,200,255,0.35)"
            strokeWidth={1}
            strokeDasharray="5 5"
          />
          <text
            x={W - padR}
            y={targetY - 4}
            textAnchor="end"
            fill="rgba(0,200,255,0.5)"
            fontSize={8}
            fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
          >
            Next target {targetScore}
          </text>
        </g>
      )}

      {points.length > 1 && <path d={areaD} fill="rgba(0,200,255,0.06)" />}

      {points.length > 1 && (
        <path
          d={pathD}
          fill="none"
          stroke={CHART_CYAN}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.length >= 1 &&
        points.map((p, i) => {
          const isLast = i === points.length - 1;
          const isFirst = i === 0;
          const isPeak = i === peakIdx && scores.length > 1;
          const dotFill = CHART_CYAN;
          const haloFill = CHART_CYAN;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={isLast ? 7 : 5} fill={haloFill} opacity={0.12} />
              <circle
                cx={p.x}
                cy={p.y}
                r={isLast ? 4 : 3}
                fill={dotFill}
                opacity={isLast ? 1 : 0.9}
              />
              {isLast && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fill={dotFill}
                  fontSize={9}
                  fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                  fontWeight="bold"
                >
                  {p.score}
                </text>
              )}
              {isFirst && (
                <text
                  x={p.x}
                  y={p.y - (peakIdx === 0 && scores.length > 1 ? 20 : 14)}
                  textAnchor="middle"
                  fill="rgba(240,244,255,0.4)"
                  fontSize={7}
                  fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                >
                  {peakIdx === 0 && scores.length > 1 ? "First scan · Peak" : "First scan"}
                </text>
              )}
              {isPeak && peakIdx !== 0 && (
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  fill="rgba(0,200,255,0.75)"
                  fontSize={7}
                  fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                >
                  Peak
                </text>
              )}
              {(points.length <= 2 || i === 0 || i === points.length - 1) && (
                <text
                  x={p.x}
                  y={dateLabelY}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  fontSize={7}
                  fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
                >
                  {new Date(p.date ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </text>
              )}
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
          <circle cx={points[0].x} cy={points[0].y} r={5} fill={CHART_CYAN} />
          <text
            x={points[0].x}
            y={points[0].y - 18}
            textAnchor="middle"
            fill="rgba(240,244,255,0.4)"
            fontSize={7}
            fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
          >
            First scan
          </text>
          <text
            x={points[0].x}
            y={points[0].y - 6}
            textAnchor="middle"
            fill={CHART_CYAN}
            fontSize={9}
            fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
            fontWeight="bold"
          >
            {points[0].score}
          </text>
          <text
            x={points[0].x}
            y={dateLabelY}
            textAnchor="middle"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
          >
            {new Date(points[0].date ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        </g>
      )}
      {axisCaption ? (
        <text
          x={padL}
          y={captionY}
          textAnchor="start"
          fill="rgba(240,244,255,0.35)"
          fontSize={8}
          fontFamily="var(--font-jetbrains-mono), var(--font-space-mono), monospace"
          letterSpacing="0.06em"
        >
          {axisCaption}
        </text>
      ) : null}
    </svg>
  );
}
