"use client";

import { useState } from "react";

export default function Sparkline({
  scores,
}: {
  scores: { created_at: string; score: number }[];
}) {
  const w = 280;
  const h = 48;
  const pad = 6;
  if (scores.length === 0) return null;

  const min = Math.min(...scores.map((s) => s.score));
  const max = Math.max(...scores.map((s) => s.score));
  const range = Math.max(1, max - min);

  const points = scores.map((s, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, scores.length - 1);
    const y = pad + (1 - (s.score - min) / range) * (h - pad * 2);
    return { x, y, score: s.score, date: s.created_at };
  });

  const poly = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const area = `M ${points[0]!.x} ${h - pad} L ${poly} L ${points[points.length - 1]!.x} ${h - pad} Z`;

  const [hover, setHover] = useState<number | null>(null);
  const hoverPoint = hover != null ? points[hover] : null;

  const single = scores.length === 1;

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        {single ? (
          <>
            <line
              x1={pad}
              y1={points[0]!.y}
              x2={w - pad}
              y2={points[0]!.y}
              stroke="var(--cyan)"
              strokeWidth="2"
              strokeDasharray="6 6"
              opacity={0.75}
            />
            <circle cx={points[0]!.x} cy={points[0]!.y} r={4} fill="var(--cyan)" opacity={0.9} />
          </>
        ) : (
          <>
            <path d={area} fill="rgba(0,200,255,0.05)" />
            <polyline points={poly} fill="none" stroke="var(--cyan)" strokeWidth="2" />
            {points.map((p, i) => (
              <circle
                key={p.date}
                cx={p.x}
                cy={p.y}
                r={4}
                fill="var(--cyan)"
                opacity={0.95}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </>
        )}
      </svg>
      {hoverPoint && (
        <div
          style={{
            position: "absolute",
            left: `${(hoverPoint.x / w) * 100}%`,
            top: Math.max(0, hoverPoint.y - 12),
            transform: "translate(-50%, -100%)",
            background: "rgba(10,13,26,0.95)",
            border: "1px solid rgba(0,200,255,0.2)",
            borderRadius: 6,
            padding: "6px 8px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: 10 }}>
            {new Date(hoverPoint.date).toLocaleDateString()}
          </span>
          <div className="font-score" style={{ color: "var(--cyan)", fontSize: 12 }}>
            {hoverPoint.score}
          </div>
        </div>
      )}
    </div>
  );
}
