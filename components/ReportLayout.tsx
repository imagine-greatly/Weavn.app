"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportPayload } from "@/lib/reportSchema";
import { estimatePercentile, ordinal, scoreToVerdict } from "@/lib/dashboard";
import { stripMarkdownForDisplay } from "@/lib/stripMarkdownForDisplay";

/**
 * Scan report — a single cohesive vertical document (muted cold futurism).
 * Replaces the old two-panel rail + tabbed build. Read by scrolling, sections
 * stacked top → bottom. Accent flows from --surface-accent (steel by default).
 *
 * DATA FIDELITY: renders ONLY fields the engine actually returns. It normalizes
 * BOTH stored shapes — the dashboard pipeline (legacy: leaks /
 * conversionTransformation / growthBlueprint / dimensionScores) and the v1 API
 * (dimensions{7} / api_findings / copy_rewrites / growth_blueprint) — into one
 * view-model, and omits any section whose source field is absent. No fabrication.
 */

// ── Score-band thresholds (centralized + tunable) ───────────────────────────────
const BAND = { AMBER_AT: 50, GREEN_AT: 70 } as const;
const RED = "#E8635F";
const AMBER = "#EFB23E";
const GREEN = "#00C48C";
const INK_PRIMARY = "#E6E9EE";
const INK_SECONDARY = "#9398A8";
const INK_MUTED = "#6E7587";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "var(--surface-accent)";

const MONO = "'IBM Plex Mono', monospace";
const BODY = "'IBM Plex Sans', sans-serif";
const DISP = "'Space Grotesk', sans-serif";

function bandColor(score: number): string {
  if (score >= BAND.GREEN_AT) return GREEN;
  if (score >= BAND.AMBER_AT) return AMBER;
  return RED;
}

// ── Canonical 7 dimensions — stable order across every report ────────────────────
const DIMENSIONS: { key: string; label: string; ciLabel: string | null }[] = [
  { key: "conversion_architecture", label: "Conversion Architecture", ciLabel: "Conversion Architecture" },
  { key: "message_clarity", label: "Message Clarity", ciLabel: "Message Clarity" },
  { key: "objection_handling", label: "Objection Handling", ciLabel: null },
  { key: "offer_clarity", label: "Offer Clarity", ciLabel: null },
  { key: "trust_signals", label: "Trust Signals", ciLabel: "Trust Signals" },
  { key: "traffic_readiness", label: "Traffic Readiness", ciLabel: "Traffic Readiness" },
  { key: "technical_foundation", label: "Technical Foundation", ciLabel: "Technical Foundation" },
];

const SITE_TYPE_LABEL: Record<string, string> = {
  saas: "SaaS",
  ecommerce: "E-commerce",
  service: "Service",
  local: "Local",
  content: "Content",
};

// ── Permissive payload view (legacy ∪ v1 fields) ────────────────────────────────
type RawFinding = Record<string, unknown>;
interface RawPayload extends ReportPayload {
  score?: number;
  verdict?: string;
  dimensions?: Record<string, number>;
  api_findings?: RawFinding[];
  findings?: RawFinding[];
  summary?: string;
  copy_rewrites?: { headline?: string; subheadline?: string; cta?: string };
  growth_blueprint?: Array<{ priority?: number; action?: string; timeframe?: string }>;
}

interface ViewFinding {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  dimension: string;
  impactEstimate: string;
  evidence: string;
  impactLine: string;
  priority: number;
}

const SEVERITY_META: Record<ViewFinding["severity"], { color: string; label: string }> = {
  critical: { color: RED, label: "Critical" },
  high: { color: AMBER, label: "High" },
  medium: { color: ACCENT, label: "Medium" },
  low: { color: INK_MUTED, label: "Low" },
};

function clean(s: unknown): string {
  return stripMarkdownForDisplay(String(s ?? "").trim());
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstNonEmpty<T>(...arrs: (T[] | undefined)[]): T[] {
  for (const a of arrs) if (Array.isArray(a) && a.length > 0) return a;
  return [];
}

function normSeverity(sev: unknown, rubric: unknown): ViewFinding["severity"] {
  const r = String(rubric ?? "").toLowerCase();
  if (r === "critical") return "critical";
  if (r === "high") return "high";
  if (r === "medium") return "medium";
  if (r === "low") return "low";
  const s = String(sev ?? "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high" || s === "warning") return "high";
  if (s === "medium") return "medium";
  if (s === "low" || s === "passing") return "low";
  return "medium";
}

// A lift estimate is "positive" (green) when it reads as gain, not a loss.
function isPositiveLift(s: string): boolean {
  if (!s) return false;
  if (/loss|lose|drop|decline|down|leak/i.test(s)) return false;
  return /lift|increase|gain|uplift|\+|\d\s*%|\bpct\b|percent/i.test(s);
}

function extractScore(p: RawPayload): number {
  const raw =
    (typeof p.score === "number" ? p.score : null) ??
    (typeof p.conversionScore === "number" ? p.conversionScore : null) ??
    p.growthScore ??
    p.healthScore ??
    0;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function extractDimensions(p: RawPayload): { label: string; score: number }[] {
  const dims = p.dimensions;
  const rows = Array.isArray(p.dimensionScores) ? p.dimensionScores : null;
  const out: { label: string; score: number }[] = [];
  for (const d of DIMENSIONS) {
    let score = NaN;
    if (dims && typeof dims[d.key] === "number") {
      // v1 — the 7-key dimensions object, keyed by canonical snake_case name.
      score = dims[d.key];
    } else if (rows && d.ciLabel) {
      // legacy — match a dimensionScores row by the dimension's first token.
      const token = d.ciLabel.split(" ")[0].toLowerCase();
      const match = rows.find((r) =>
        String((r as { label?: string }).label ?? "").toLowerCase().includes(token)
      ) as { score?: number } | undefined;
      if (match && typeof match.score === "number") score = match.score;
    }
    if (Number.isFinite(score)) out.push({ label: d.label, score: Math.round(score) });
  }
  return out;
}

function extractFindings(p: RawPayload): ViewFinding[] {
  const src = firstNonEmpty<RawFinding>(
    p.moneyLeaks as unknown as RawFinding[] | undefined,
    p.api_findings,
    p.priorityFindings as unknown as RawFinding[] | undefined,
    p.primaryFindings as unknown as RawFinding[] | undefined,
    p.findings,
    p.leaks as unknown as RawFinding[] | undefined,
  );
  const mapped = src.map((raw, i): ViewFinding => {
    const f = raw as Record<string, unknown>;
    const title = clean(f.revenueTitle || f.title || "");
    return {
      title,
      severity: normSeverity(f.severity, f.rubricSeverity),
      dimension: titleCase(clean(f.dimension || f.category || "")),
      impactEstimate: clean(f.impact_estimate || f.impactStatement || ""),
      evidence: clean(f.explanation || f.evidence || f.whatWeFound || ""),
      impactLine: clean(f.businessCost || f.whyItMatters || ""),
      priority: typeof f.priority === "number" ? (f.priority as number) : i + 1,
    };
  }).filter((f) => f.title);
  return mapped.sort((a, b) => a.priority - b.priority);
}

function extractRewrites(p: RawPayload): { label: string; current: string; rewritten: string }[] {
  const ct = p.conversionTransformation;
  const hr = p.heroRewrite;
  const cr = p.copy_rewrites;
  const rows = [
    { label: "Headline", current: clean(ct?.currentHeadline ?? hr?.currentHeadline ?? ""), rewritten: clean(ct?.rewrittenHeadline ?? hr?.suggestedHeadline ?? cr?.headline ?? "") },
    { label: "Subheadline", current: clean(ct?.currentSubheadline ?? hr?.currentSubheadline ?? ""), rewritten: clean(ct?.rewrittenSubheadline ?? hr?.suggestedSubheadline ?? cr?.subheadline ?? "") },
    { label: "CTA", current: clean(ct?.currentCta ?? hr?.currentCta ?? ""), rewritten: clean(ct?.rewrittenCta ?? hr?.suggestedCta ?? cr?.cta ?? "") },
  ];
  return rows.filter((r) => r.rewritten && r.rewritten.toLowerCase() !== "none detected");
}

function extractBlueprint(p: RawPayload): { week1: string[]; weeks24: string[]; month2: string[] } | null {
  const gb = p.growthBlueprint;
  if (gb && ((gb.weekOne?.length ?? 0) > 0 || (gb.weekTwoToFour?.length ?? 0) > 0 || (typeof gb.monthTwo === "string" && gb.monthTwo.trim()))) {
    return {
      week1: (gb.weekOne ?? []).map(clean).filter(Boolean),
      weeks24: (gb.weekTwoToFour ?? []).map(clean).filter(Boolean),
      month2: typeof gb.monthTwo === "string" && gb.monthTwo.trim() ? [clean(gb.monthTwo)] : [],
    };
  }
  const gbp = p.growth_blueprint;
  if (Array.isArray(gbp) && gbp.length > 0) {
    const bucket = (tf: RegExp) =>
      gbp.filter((x) => tf.test(String(x.timeframe ?? "")))
        .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
        .map((x) => clean(x.action))
        .filter(Boolean);
    const r = { week1: bucket(/week\s*1/i), weeks24: bucket(/week.*2|2\s*-\s*4/i), month2: bucket(/month\s*2/i) };
    if (r.week1.length || r.weeks24.length || r.month2.length) return r;
  }
  return null;
}

// ── Hero ring — large, muted, verdict-banded; NO glow / bloom halo ───────────────
function HeroRing({ score }: { score: number }) {
  const px = 166;
  const stroke = 3.5;
  const center = px / 2;
  const radius = center - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const color = bandColor(score);
  const target = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  const [display, setDisplay] = useState(score);
  const arcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(score);
      if (arcRef.current) arcRef.current.style.strokeDasharray = `${target} ${circumference}`;
      return;
    }
    setDisplay(0);
    if (arcRef.current) arcRef.current.style.strokeDasharray = `0 ${circumference}`;
    const start = performance.now();
    const duration = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(score * e));
      if (arcRef.current) arcRef.current.style.strokeDasharray = `${target * e} ${circumference}`;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, target, circumference]);

  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} style={{ display: "block" }}>
      {/* faint track */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {/* verdict-banded arc — no filter, no glow */}
      <circle
        ref={arcRef}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${target} ${circumference}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center}
        dominantBaseline="central"
        textAnchor="middle"
        fill={color}
        fontFamily="'Space Grotesk', sans-serif"
        fontWeight={600}
        fontSize={52}
      >
        {display}
      </text>
    </svg>
  );
}

// ── Section header ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: INK_MUTED, marginBottom: 18 }}>
      {children}
    </div>
  );
}

export type ReportLayoutProps = {
  domain: string;
  payload?: ReportPayload;
  /** ISO timestamp of the scan (real value); omitted from the masthead if absent. */
  scanDate?: string | null;
  /** Retained for caller compatibility — the single-column document handles its own scroll. */
  fillContainer?: boolean;
  // The following are accepted but no longer drive the layout (kept so callers don't break).
  score?: number;
  sharedView?: boolean;
  isPro?: boolean;
  siteType?: string;
  onRescan?: () => void;
  readOnlyLeftPanel?: boolean;
  shareToken?: string | null;
  issueReportId?: string | null;
  whiteLabel?: boolean;
};

const JUMP = [
  { id: "score", label: "Score" },
  { id: "health", label: "Health" },
  { id: "brief", label: "Brief" },
  { id: "findings", label: "Findings" },
  { id: "rewrites", label: "Rewrites" },
  { id: "blueprint", label: "Blueprint" },
];

export default function ReportLayout({ domain, payload, scanDate, fillContainer = false }: ReportLayoutProps) {
  const p = (payload ?? {}) as RawPayload;

  const view = useMemo(() => {
    const score = extractScore(p);
    const verdict = (typeof p.verdict === "string" && p.verdict.trim()) ? p.verdict.trim() : scoreToVerdict(score);
    const dimensions = extractDimensions(p);
    const findings = extractFindings(p);
    const rewrites = extractRewrites(p);
    const blueprint = extractBlueprint(p);
    const brief = clean(p.summary || p.diagnosticBrief || p.intelligenceBrief || "");
    const siteType = (p as { siteType?: string }).siteType ?? p.site_type;
    const siteLabel = siteType ? (SITE_TYPE_LABEL[String(siteType).toLowerCase()] ?? titleCase(String(siteType))) : null;
    const percentile = ordinal(estimatePercentile(score));
    const critical = findings.filter((f) => f.severity === "critical").length;
    const high = findings.filter((f) => f.severity === "high").length;
    return { score, verdict, dimensions, findings, rewrites, blueprint, brief, siteLabel, percentile, critical, high };
  }, [p]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const present: Record<string, boolean> = {
    score: true,
    health: view.dimensions.length > 0,
    brief: Boolean(view.brief),
    findings: view.findings.length > 0,
    rewrites: view.rewrites.length > 0,
    blueprint: Boolean(view.blueprint),
  };

  const scrollTo = (id: string) => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const dateLabel = scanDate
    ? new Date(scanDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  const findingsCountLine =
    `${view.findings.length} ${view.findings.length === 1 ? "finding" : "findings"}` +
    (view.critical ? ` · ${view.critical} critical` : "") +
    (view.high ? ` · ${view.high} high` : "");

  return (
    <div
      style={{
        width: "100%",
        background: "#050810",
        ...(fillContainer ? { height: "100%", overflowY: "auto" } : {}),
      }}
    >
      <style>{`
        .report-doc-anchor { scroll-margin-top: 64px; }
        /* auto-fit collapses empty tracks, so present dimensions always fill the row:
           7 across on desktop, wrapping to 4+3 / 2-up on narrow widths. */
        .report-health-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
          gap: 1px;
          background: ${BORDER};
          border: 0.5px solid ${BORDER};
        }
        .report-rewrite-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${BORDER}; }
        @media (max-width: 640px) { .report-rewrite-grid { grid-template-columns: 1fr; } }
        .report-blueprint-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 760px) { .report-blueprint-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Thin sticky in-page jump nav (anchors, not a rail) */}
      <nav
        style={{
          position: "sticky", top: 0, zIndex: 20,
          display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap",
          padding: "10px 24px", background: "rgba(5,8,16,0.9)", backdropFilter: "blur(10px)",
          borderBottom: `0.5px solid ${BORDER}`,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: INK_MUTED, marginRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
          {domain}
        </span>
        {JUMP.filter((j) => present[j.id]).map((j) => (
          <button
            key={j.id}
            type="button"
            onClick={() => scrollTo(j.id)}
            style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: INK_SECONDARY, background: "transparent", border: "none", padding: "5px 9px", cursor: "pointer" }}
          >
            {j.label}
          </button>
        ))}
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "44px 24px 140px" }}>

        {/* ── 1. SCORE HERO ─────────────────────────────────────────────────── */}
        <section
          id="score"
          ref={(el) => { sectionRefs.current.score = el; }}
          className="report-doc-anchor"
          style={{ position: "relative", textAlign: "center", padding: "20px 0 44px", overflow: "hidden" }}
        >
          {/* faint surface bloom behind the hero (not the ring) */}
          <div
            aria-hidden
            style={{
              position: "absolute", left: "50%", top: "44%", transform: "translate(-50%, -50%)",
              width: 620, height: 360,
              background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--surface-accent) 11%, transparent) 0%, transparent 72%)",
              pointerEvents: "none", zIndex: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: ACCENT, margin: "0 0 14px" }}>
              Conversion Intelligence
            </p>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK_PRIMARY, margin: "0 0 4px", letterSpacing: "-0.4px", wordBreak: "break-word" }}>
              {domain}
            </h1>
            {dateLabel ? (
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK_MUTED, margin: "0 0 30px", letterSpacing: "0.06em" }}>
                Scanned {dateLabel}
              </p>
            ) : <div style={{ height: 30 }} />}

            <div style={{ display: "flex", justifyContent: "center" }}>
              <HeroRing score={view.score} />
            </div>

            {/* verdict tag */}
            <div style={{ marginTop: 22 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: bandColor(view.score), border: `0.5px solid ${bandColor(view.score)}66`, padding: "5px 12px" }}>
                {view.verdict}
              </span>
            </div>

            {/* percentile — prominent, second only to the ring (position, not score) */}
            <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK_PRIMARY, margin: "20px 0 0", letterSpacing: "-0.4px" }}>
              {view.percentile} percentile{view.siteLabel ? <span style={{ color: INK_SECONDARY }}> · {view.siteLabel}</span> : null}
            </p>

            {/* findings count */}
            {view.findings.length > 0 ? (
              <p style={{ fontFamily: MONO, fontSize: 12, color: INK_MUTED, margin: "12px 0 0", letterSpacing: "0.04em" }}>
                {findingsCountLine}
              </p>
            ) : null}
          </div>
        </section>

        {/* ── 2. CONVERSION HEALTH strip ────────────────────────────────────── */}
        {present.health ? (
          <section id="health" ref={(el) => { sectionRefs.current.health = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
            <SectionLabel>Conversion Health</SectionLabel>
            <div className="report-health-strip">
              {view.dimensions.map((d) => {
                const c = bandColor(d.score);
                return (
                  <div key={d.label} style={{ background: "#0A0E18", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, minHeight: 104 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.35, color: INK_SECONDARY, letterSpacing: "0.03em", minHeight: 26 }}>
                      {d.label}
                    </div>
                    <div style={{ position: "relative", width: "100%", height: 2, background: "rgba(255,255,255,0.07)", marginTop: "auto" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.max(0, Math.min(100, d.score))}%`, background: c }} />
                    </div>
                    <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: c }}>{d.score}</div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_MUTED, margin: "12px 0 0" }}>
              Conversion engine · 27 categories · 307 checks
            </p>
          </section>
        ) : null}

        {/* ── 3. DIAGNOSTIC BRIEF ───────────────────────────────────────────── */}
        {present.brief ? (
          <section id="brief" ref={(el) => { sectionRefs.current.brief = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
            <SectionLabel>Diagnostic Brief</SectionLabel>
            <div style={{ borderLeft: `2px solid ${ACCENT}`, paddingLeft: 20 }}>
              <p style={{ fontFamily: BODY, fontSize: 16, lineHeight: 1.7, color: INK_PRIMARY, margin: 0 }}>
                {view.brief}
              </p>
            </div>
          </section>
        ) : null}

        {/* ── 4. RANKED FINDINGS ────────────────────────────────────────────── */}
        {present.findings ? (
          <section id="findings" ref={(el) => { sectionRefs.current.findings = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
            <SectionLabel>Ranked Findings</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {view.findings.map((f, i) => {
                const meta = SEVERITY_META[f.severity];
                const liftPositive = isPositiveLift(f.impactEstimate);
                return (
                  <div
                    key={`${f.title}-${i}`}
                    style={{
                      position: "relative",
                      borderLeft: `2px solid ${meta.color}`,
                      background: `color-mix(in srgb, ${meta.color} 5%, transparent)`,
                      padding: "18px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: INK_MUTED }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: meta.color, border: `0.5px solid ${meta.color}66`, padding: "3px 8px" }}>
                        {meta.label}
                      </span>
                      {f.dimension ? (
                        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: INK_MUTED, border: `0.5px solid ${BORDER}`, padding: "3px 8px" }}>
                          {f.dimension}
                        </span>
                      ) : null}
                      {f.impactEstimate ? (
                        <span style={{ fontFamily: MONO, fontSize: 11, color: liftPositive ? GREEN : INK_MUTED, marginLeft: "auto" }}>
                          {f.impactEstimate}
                        </span>
                      ) : null}
                    </div>
                    <h3 style={{ fontFamily: DISP, fontWeight: 600, fontSize: 16, color: INK_PRIMARY, margin: "0 0 8px", letterSpacing: "-0.2px" }}>
                      {f.title}
                    </h3>
                    {f.evidence ? (
                      <p style={{ fontFamily: BODY, fontSize: 14, lineHeight: 1.65, color: INK_SECONDARY, margin: 0 }}>
                        {f.evidence}
                      </p>
                    ) : null}
                    {f.impactLine ? (
                      <p style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.6, color: INK_MUTED, margin: "8px 0 0" }}>
                        {f.impactLine}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ── 5. REWRITES ───────────────────────────────────────────────────── */}
        {present.rewrites ? (
          <section id="rewrites" ref={(el) => { sectionRefs.current.rewrites = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
            <SectionLabel>Rewrites</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {view.rewrites.map((r) => (
                <div key={r.label}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_MUTED, marginBottom: 8 }}>{r.label}</div>
                  <div className="report-rewrite-grid" style={{ border: `0.5px solid ${BORDER}` }}>
                    <div style={{ background: "#0A0E18", padding: "14px 16px" }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: INK_MUTED, marginBottom: 6 }}>Current</div>
                      <p style={{ fontFamily: BODY, fontSize: 14, lineHeight: 1.6, color: INK_SECONDARY, margin: 0 }}>{r.current || "—"}</p>
                    </div>
                    <div style={{ background: "#0A0E18", padding: "14px 16px" }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: ACCENT, marginBottom: 6 }}>Rewritten</div>
                      <p style={{ fontFamily: BODY, fontSize: 14, lineHeight: 1.6, color: INK_PRIMARY, margin: 0 }}>{r.rewritten}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── 6. GROWTH BLUEPRINT ───────────────────────────────────────────── */}
        {present.blueprint && view.blueprint ? (
          <section id="blueprint" ref={(el) => { sectionRefs.current.blueprint = el; }} className="report-doc-anchor">
            <SectionLabel>Growth Blueprint</SectionLabel>
            <div className="report-blueprint-grid">
              {([
                { title: "Week 1", items: view.blueprint.week1 },
                { title: "Weeks 2–4", items: view.blueprint.weeks24 },
                { title: "Month 2+", items: view.blueprint.month2 },
              ] as const).filter((c) => c.items.length > 0).map((col) => (
                <div key={col.title} style={{ border: `0.5px solid ${BORDER}`, background: "#0A0E18", padding: "18px 18px 20px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT, marginBottom: 14 }}>{col.title}</div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {col.items.map((it, i) => (
                      <li key={i} style={{ fontFamily: BODY, fontSize: 13.5, lineHeight: 1.55, color: INK_SECONDARY, display: "flex", gap: 9 }}>
                        <span style={{ color: ACCENT, flexShrink: 0 }}>·</span>{it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
