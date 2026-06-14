"use client";

import { useEffect, useMemo, useState } from "react";

export type GrowthStrategyData = {
  biggestOpportunity: string;
  trafficOpportunity: string;
  conversionOpportunity: string;
  trustOpportunity: string;
  quickWins: string[];
  thirtyDayPlan: string;
};

function parseWeeks(plan: string): string[] {
  const text = (plan ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return ["", "", "", ""];

  // Expected format (best-effort):
  // Week 1: ...
  // Week 2: ...
  // ...
  const parts: { week: number; body: string }[] = [];
  const re = /(?:^|\n)\s*Week\s*(\d+)\s*[:\-]\s*/gi;
  const indices: { start: number; week: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    indices.push({ start: m.index, week: Number(m[1]) });
  }
  if (indices.length === 0) return [text, "", "", ""];

  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i]!;
    const next = indices[i + 1];
    const block = text.slice(cur.start, next?.start ?? text.length).trim();
    const body = block.replace(/^\s*Week\s*\d+\s*[:\-]\s*/i, "").trim();
    parts.push({ week: cur.week, body });
  }

  const out = ["", "", "", ""];
  for (const p of parts) {
    if (p.week >= 1 && p.week <= 4) out[p.week - 1] = p.body;
  }
  return out;
}

export default function GrowthStrategyModule({
  data,
  domain,
}: {
  data: GrowthStrategyData;
  domain: string;
}) {
  const quickWins = useMemo(() => data.quickWins.slice(0, 5), [data.quickWins]);
  const localStorageKey = `weavn_growth_quickwins_${domain}`;

  const [checked, setChecked] = useState<boolean[]>(() => Array.from({ length: 5 }, () => false));
  const [openPlan, setOpenPlan] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(localStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const next = Array.from({ length: 5 }, (_, i) => Boolean(parsed[i]));
      setChecked(next);
    } catch {
      // ignore
    }
  }, [localStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(checked));
    } catch {
      // ignore
    }
  }, [checked, localStorageKey]);

  const weeks = useMemo(() => parseWeeks(data.thirtyDayPlan), [data.thirtyDayPlan]);

  return (
    <div
      className="w-full"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(0,200,255,0.15)",
        borderRadius: 8,
        padding: 28,
        marginBottom: 24,
      }}
    >
      <div
        className="font-mono"
        style={{
          color: "var(--cyan)",
          fontSize: 12,
          letterSpacing: 0.2,
          marginBottom: 18,
        }}
      >
        RESOLUTION STRATEGY
      </div>

      {/* Big opportunity */}
      <div
        style={{
          width: "100%",
          background: "rgba(0,200,255,0.04)",
          borderLeft: "3px solid var(--cyan)",
          borderRadius: 6,
          padding: "14px 16px",
          marginBottom: 18,
        }}
      >
        <div
          className="font-mono"
          style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 8 }}
        >
          PRIORITY RESOLUTION
        </div>
        <div className="font-body" style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
          {data.biggestOpportunity}
        </div>
      </div>

      {/* 3-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <SmallOpportunity label="TRAFFIC" body={data.trafficOpportunity} />
        <SmallOpportunity label="CONVERSION" body={data.conversionOpportunity} />
        <SmallOpportunity label="TRUST" body={data.trustOpportunity} />
      </div>

      {/* Quick wins */}
      <div style={{ marginBottom: 16 }}>
        <div className="font-mono" style={{ color: "var(--cyan)", fontSize: 11, marginBottom: 10 }}>
          QUICK WINS — UNDER 30 MINUTES
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const label = quickWins[i] ?? `Quick win ${i + 1}`;
            const isChecked = Boolean(checked[i]);
            return (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    setChecked((prev) => {
                      const next = [...prev];
                      next[i] = !next[i]!;
                      return next;
                    });
                  }}
                  style={{ accentColor: "var(--cyan)" }}
                />
                <span
                  className="font-body"
                  style={{
                    fontSize: 14,
                    textDecoration: isChecked ? "line-through" : "none",
                    opacity: isChecked ? 0.65 : 1,
                  }}
                >
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 30-day plan */}
      <div>
        <button
          type="button"
          onClick={() => setOpenPlan((v) => !v)}
          className="font-mono"
          style={{
            width: "100%",
            textAlign: "left",
            color: "var(--cyan)",
            fontSize: 11,
            background: "transparent",
            border: "1px solid rgba(0,200,255,0.12)",
            borderRadius: 8,
            padding: "10px 12px",
            cursor: "pointer",
            marginBottom: openPlan ? 14 : 0,
          }}
          aria-expanded={openPlan}
        >
          30-DAY PLAN {openPlan ? "▲" : "▼"}
        </button>

        {openPlan && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div className="font-mono" style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 8 }}>
                  WEEK {i + 1}
                </div>
                <div className="font-body" style={{ color: "var(--text-primary)", fontSize: 14, whiteSpace: "pre-wrap" }}>
                  {weeks[i] || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SmallOpportunity({ label, body }: { label: string; body: string }) {
  return (
    <div
      style={{
        background: "rgba(0,200,255,0.02)",
        border: "1px solid rgba(0,200,255,0.10)",
        borderRadius: 8,
        padding: "14px 14px",
      }}
    >
      <div className="font-mono" style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 8 }}>
        {label}
      </div>
      <div className="font-body" style={{ color: "var(--text-secondary)", fontSize: 14, whiteSpace: "pre-wrap" }}>
        {body}
      </div>
    </div>
  );
}

