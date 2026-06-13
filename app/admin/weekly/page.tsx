import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const MONO = '"JetBrains Mono", "Space Mono", ui-monospace, monospace';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function weekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon ...
  const daysSinceMon = (day + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMon, 0, 0, 0, 0);
  return { start: monday.toISOString(), end: now.toISOString(), now, monday };
}

function bar(count: number, total: number, width = 10): string {
  if (total === 0) return "░".repeat(width);
  const filled = Math.round((count / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ReportRow = {
  domain: string;
  health_score: number | null;
  source: string | null;
  analysis: {
    leaks?: Array<{ title?: string }>;
    api_findings?: Array<{ title?: string }>;
    findings?: Array<{ title?: string }>;
    conversionKillers?: Array<{ title?: string }>;
  } | null;
  created_at: string;
};

export default async function AdminWeeklyPage() {
  // Auth guard — email-based check, no full admin system needed
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (user?.email !== process.env.ADMIN_EMAIL) redirect("/auth");

  const supabase = getSupabase();
  const { start, end, now, monday } = weekRange();

  const { data: rows } = await supabase
    .from("reports")
    .select("domain, health_score, source, analysis, created_at")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });

  const reports = (rows ?? []) as ReportRow[];
  const total = reports.length;

  // Volume by source
  const bySource: Record<string, number> = { apollo: 0, product_hunt: 0, other: 0 };
  for (const r of reports) {
    const s = (r.source ?? "").toLowerCase();
    if (s === "apollo") bySource.apollo++;
    else if (s === "product_hunt") bySource.product_hunt++;
    else bySource.other++;
  }

  // Day-by-day breakdown (Mon=0 … Sun=6)
  const dayStats: Array<{ scans: number; total_score: number }> = Array.from({ length: 7 }, () => ({
    scans: 0,
    total_score: 0,
  }));
  for (const r of reports) {
    const d = new Date(r.created_at);
    const dayIndex = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
    dayStats[dayIndex].scans++;
    if (typeof r.health_score === "number") dayStats[dayIndex].total_score += r.health_score;
  }

  // Scores
  const scored = reports.filter((r) => typeof r.health_score === "number");
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, r) => s + (r.health_score ?? 0), 0) / scored.length)
      : null;

  const dist = { critical: 0, poor: 0, fair: 0, good: 0 };
  for (const r of scored) {
    const s = r.health_score ?? 0;
    if (s < 40) dist.critical++;
    else if (s < 60) dist.poor++;
    else if (s < 75) dist.fair++;
    else dist.good++;
  }

  // Outliers
  const sortedByScore = [...scored].sort((a, b) => (a.health_score ?? 0) - (b.health_score ?? 0));
  const lowest = sortedByScore.slice(0, 3);
  const highest = sortedByScore.slice(-3).reverse();

  // Top findings
  const findingCounts: Record<string, number> = {};
  for (const r of reports) {
    const findings: Array<{ title?: string }> =
      r.analysis?.leaks ??
      r.analysis?.api_findings ??
      r.analysis?.findings ??
      r.analysis?.conversionKillers ??
      [];
    for (const f of findings) {
      if (f.title) findingCounts[f.title] = (findingCounts[f.title] ?? 0) + 1;
    }
  }
  const topFindings = Object.entries(findingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Plain-text copy for Claude
  const plainText = [
    `WEAVN — WEEKLY DIGEST — week of ${formatDate(monday)}`,
    "",
    "VOLUME",
    `Total scans this week: ${total}`,
    `  Apollo: ${bySource.apollo}`,
    `  Product Hunt: ${bySource.product_hunt}`,
    `  Manual/Other: ${bySource.other}`,
    "",
    "DAY BY DAY",
    ...DAY_NAMES.map((name, i) => {
      const { scans, total_score } = dayStats[i];
      const avg = scans > 0 ? Math.round(total_score / scans) : null;
      return `  ${name}: ${scans} scans  avg score: ${avg !== null ? avg : "—"}`;
    }),
    "",
    "SCORES",
    avgScore !== null ? `Average score: ${avgScore}/100` : "Average score: n/a",
    `  < 40  Critical: ${dist.critical} sites`,
    `  40-60 Poor:     ${dist.poor} sites`,
    `  60-75 Fair:     ${dist.fair} sites`,
    `  75+   Good:     ${dist.good} sites`,
    "",
    "LOWEST SCORES",
    ...lowest.map((r) => `  ${r.domain} — ${r.health_score}/100`),
    "",
    "HIGHEST SCORES",
    ...highest.map((r) => `  ${r.domain} — ${r.health_score}/100`),
    "",
    "TOP 5 FINDINGS",
    ...topFindings.map(([title, count], i) => `  ${i + 1}. ${title} (${count}×)`),
  ].join("\n");

  const sectionStyle: React.CSSProperties = { marginBottom: 32 };
  const labelStyle: React.CSSProperties = {
    color: "var(--cyan, #00C8FF)",
    fontSize: 11,
    letterSpacing: "2px",
    marginBottom: 8,
    display: "block",
  };
  const divider = <div style={{ color: "rgba(0,200,255,0.15)", marginBottom: 32, fontSize: 13 }}>{"─".repeat(60)}</div>;

  // Week date range label
  const weekLabel = `${formatShortDate(monday)} – ${formatShortDate(now)}`;

  return (
    <div
      style={{
        background: "#050810",
        minHeight: "100vh",
        padding: "40px 48px",
        fontFamily: MONO,
        color: "#8899AA",
        fontSize: 13,
        lineHeight: 1.8,
      }}
    >
      {/* Header */}
      <div style={sectionStyle}>
        <div style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 700, letterSpacing: "3px", marginBottom: 4 }}>
          WEAVN — WEEKLY DIGEST
        </div>
        <div style={{ color: "var(--cyan, #00C8FF)", fontSize: 12 }}>
          Week of {formatDate(monday)} <span style={{ color: "#8899AA" }}>({weekLabel})</span>
        </div>
      </div>

      {divider}

      {/* Volume */}
      <div style={sectionStyle}>
        <span style={labelStyle}>VOLUME</span>
        <div style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          {total} <span style={{ color: "#8899AA", fontSize: 13, fontWeight: 400 }}>scans this week</span>
        </div>
        <div>Apollo:           {bySource.apollo}</div>
        <div>Product Hunt:     {bySource.product_hunt}</div>
        <div>Manual / Other:   {bySource.other}</div>
      </div>

      {divider}

      {/* Day-by-day breakdown */}
      <div style={sectionStyle}>
        <span style={labelStyle}>DAY BY DAY</span>
        {DAY_NAMES.map((name, i) => {
          const { scans, total_score } = dayStats[i];
          const avg = scans > 0 ? Math.round(total_score / scans) : null;
          const dayDate = new Date(monday.getTime() + i * 86_400_000);
          const isToday = dayDate.toDateString() === now.toDateString();
          return (
            <div key={name} style={{ marginBottom: 2, color: isToday ? "#FFFFFF" : "#8899AA" }}>
              <span style={{ display: "inline-block", width: 36 }}>{name}</span>
              <span style={{ color: isToday ? "var(--cyan, #00C8FF)" : "#8899AA", marginRight: 8 }}>
                {formatShortDate(dayDate)}
              </span>
              <span style={{ color: "#FFFFFF", display: "inline-block", width: 20 }}>{scans}</span>
              <span> scans  avg score: </span>
              <span style={{ color: isToday ? "var(--cyan, #00C8FF)" : "#8899AA" }}>
                {avg !== null ? avg : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {divider}

      {/* Scores */}
      <div style={sectionStyle}>
        <span style={labelStyle}>SCORES</span>
        {avgScore !== null ? (
          <div style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            {avgScore}<span style={{ color: "#8899AA", fontSize: 13, fontWeight: 400 }}>/100 avg</span>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>No scored reports yet</div>
        )}
        {[
          { label: "< 40   Critical", count: dist.critical },
          { label: "40-60  Poor    ", count: dist.poor },
          { label: "60-75  Fair    ", count: dist.fair },
          { label: "75+    Good    ", count: dist.good },
        ].map(({ label, count }) => (
          <div key={label} style={{ marginBottom: 4 }}>
            <span style={{ color: "#8899AA" }}>{label}: </span>
            <span style={{ color: "#FFFFFF" }}>{String(count).padStart(3)} </span>
            <span style={{ color: "var(--cyan, #00C8FF)", letterSpacing: "-1px" }}>{bar(count, scored.length)}</span>
          </div>
        ))}
      </div>

      {divider}

      {/* Outliers */}
      <div style={sectionStyle}>
        <span style={labelStyle}>OUTLIERS</span>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#FF4444", marginBottom: 6, fontSize: 11, letterSpacing: "1px" }}>LOWEST</div>
          {lowest.length === 0 && <div>—</div>}
          {lowest.map((r) => (
            <div key={r.domain}>
              <span style={{ color: "#FFFFFF" }}>{r.domain}</span>
              <span style={{ color: "#8899AA" }}> — {r.health_score}/100</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ color: "#00E676", marginBottom: 6, fontSize: 11, letterSpacing: "1px" }}>HIGHEST</div>
          {highest.length === 0 && <div>—</div>}
          {highest.map((r) => (
            <div key={r.domain}>
              <span style={{ color: "#FFFFFF" }}>{r.domain}</span>
              <span style={{ color: "#8899AA" }}> — {r.health_score}/100</span>
            </div>
          ))}
        </div>
      </div>

      {divider}

      {/* Top findings */}
      <div style={sectionStyle}>
        <span style={labelStyle}>TOP FINDINGS THIS WEEK</span>
        {topFindings.length === 0 && <div>No findings data yet</div>}
        {topFindings.map(([title, count], i) => (
          <div key={title} style={{ marginBottom: 6 }}>
            <span style={{ color: "var(--cyan, #00C8FF)" }}>{i + 1}. </span>
            <span style={{ color: "#FFFFFF" }}>{title}</span>
            <span style={{ color: "#8899AA" }}> ({count}×)</span>
          </div>
        ))}
      </div>

      {divider}

      {/* Claude copy textarea */}
      <div style={sectionStyle}>
        <span style={labelStyle}>── COPY THIS INTO CLAUDE FOR CONTENT ──</span>
        <textarea
          readOnly
          defaultValue={plainText}
          style={{
            width: "100%",
            minHeight: 360,
            background: "#0A0D1A",
            border: "1px solid rgba(0,200,255,0.2)",
            borderRadius: 4,
            color: "#8899AA",
            fontFamily: MONO,
            fontSize: 12,
            lineHeight: 1.7,
            padding: "16px",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}
