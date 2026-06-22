"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportPayload } from "@/lib/reportSchema";
import { estimatePercentile, ordinal, scoreToVerdict, scoreBand, opportunityFraming, COVERAGE_TOLERANCE } from "@/lib/verdict";
import VerdictRing from "@/components/ui/VerdictRing";
import { stripMarkdownForDisplay } from "@/lib/stripMarkdownForDisplay";
import {
  type BrandingConfig,
  type SectionId,
  type ThemeTokens,
  getTemplate,
  resolveTheme,
} from "@/lib/branding";

/**
 * Scan report — ONE single-column document, shared by the in-app report and the
 * agency white-label render (do not fork). Agencies pass a `branding` prop that
 * themes the WRAPPER only: cover, chrome accent, light/dark tokens, footer, and
 * which optional sections appear. The INSTRUMENT (score ring, conversion-health
 * strip, findings, voice, section order) is fixed by the component + the selected
 * template and is physically un-editable here.
 *
 * Strict token separation: the brand accent (t.accent) drives CHROME only; the
 * diagnostic VERDICT colors (t.verdict red/amber/green) are semantic + fixed and
 * never read from the accent. DATA FIDELITY: renders only fields the engine
 * returns (normalizing legacy + v1 shapes), omitting absent sections.
 */

// Score-band thresholds live in lib/verdict (scoreBand: red <50 · amber 50–69 · green 70+).

const MONO = "'IBM Plex Mono', monospace";
const BODY = "'IBM Plex Sans', sans-serif";
const DISP = "'Space Grotesk', sans-serif";

// Maps the canonical band to this report's THEME verdict color (dark vs light/PDF).
function bandColor(score: number, t: ThemeTokens): string {
  const b = scoreBand(score);
  return b === "green" ? t.verdict.green : b === "amber" ? t.verdict.amber : t.verdict.red;
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

// Severity is VERDICT/neutral-colored — never the brand accent.
function severityMeta(sev: ViewFinding["severity"], t: ThemeTokens): { color: string; label: string } {
  switch (sev) {
    case "critical": return { color: t.verdict.red, label: "Critical" };
    case "high": return { color: t.verdict.amber, label: "High" };
    case "medium": return { color: t.inkSecondary, label: "Medium" };
    default: return { color: t.inkMuted, label: "Low" };
  }
}

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
      score = dims[d.key];
    } else if (rows && d.ciLabel) {
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
    return {
      title: clean(f.revenueTitle || f.title || ""),
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

// The report hero ring is the canonical VerdictRing at 166px (see the score section),
// fed this report's theme-aware verdict color so the light/PDF variant is preserved.

function SectionLabel({ children, t }: { children: React.ReactNode; t: ThemeTokens }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: t.inkMuted, marginBottom: 18 }}>
      {children}
    </div>
  );
}

export type ReportLayoutProps = {
  domain: string;
  payload?: ReportPayload;
  scanDate?: string | null;
  /** Agency white-label config. When present the wrapper (cover/accent/theme/footer/toggles) themes; the body stays locked. */
  branding?: BrandingConfig | null;
  fillContainer?: boolean;
  // Accepted for caller compatibility — no longer drive the layout.
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

const JUMP: { id: SectionId; label: string }[] = [
  { id: "score", label: "Score" },
  { id: "health", label: "Health" },
  { id: "brief", label: "Brief" },
  { id: "findings", label: "Findings" },
  { id: "rewrites", label: "Rewrites" },
  { id: "blueprint", label: "Blueprint" },
];

export default function ReportLayout({ domain, payload, scanDate, branding, fillContainer = false }: ReportLayoutProps) {
  const p = (payload ?? {}) as RawPayload;
  const t = useMemo(() => resolveTheme(branding), [branding]);
  const template = getTemplate(branding?.templateId);

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
    const opportunity = opportunityFraming(score);
    const stLc = siteType ? String(siteType).toLowerCase() : "";
    const pageTypeNote =
      stLc === "content"
        ? "This reads as a content / informational page — for the sharpest conversion read, point Weavn at your signup or landing page."
        : stLc === "unknown"
          ? "This reads as a non-conversion or informational page — for the sharpest conversion read, point Weavn at your signup or landing page."
          : null;
    return { score, verdict, dimensions, findings, rewrites, blueprint, brief, siteLabel, percentile, critical, high, opportunity, pageTypeNote };
  }, [p]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Data presence (omit absent) × agency inclusion (optional sections only).
  const dataPresent: Record<SectionId, boolean> = {
    score: true,
    health: view.dimensions.length > 0,
    brief: Boolean(view.brief),
    findings: view.findings.length > 0,
    rewrites: view.rewrites.length > 0,
    blueprint: Boolean(view.blueprint),
  };
  const included = (id: SectionId): boolean => {
    if (!branding) return true;
    if (id === "rewrites") return branding.includedSections.rewrites;
    if (id === "blueprint") return branding.includedSections.blueprint;
    return true;
  };
  const liveSections = template.sections.filter((s) => dataPresent[s.id] && included(s.id));

  const scrollTo = (id: string) => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const dateLabel = scanDate
    ? new Date(scanDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  const findingsCountLine =
    `${view.findings.length} ${view.findings.length === 1 ? "finding" : "findings"}` +
    (view.critical ? ` · ${view.critical} critical` : "") +
    (view.high ? ` · ${view.high} high` : "");

  const ringColor = bandColor(view.score, t);

  // ── Section renderers — keyed by id so the template list drives composition ────
  const sections: Record<SectionId, () => React.ReactNode> = {
    score: () => (
      <section
        key="score" id="score" ref={(el) => { sectionRefs.current.score = el; }}
        className="report-doc-anchor"
        style={{ position: "relative", textAlign: "center", padding: "20px 0 44px", overflow: "hidden" }}
      >
        <div aria-hidden style={{ position: "absolute", left: "50%", top: "44%", transform: "translate(-50%, -50%)", width: 620, height: 360, background: `radial-gradient(ellipse at center, ${t.accentSoft} 0%, transparent 72%)`, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: t.accent, margin: "0 0 14px" }}>
            Conversion Intelligence
          </p>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: t.inkPrimary, margin: "0 0 4px", letterSpacing: "-0.4px", wordBreak: "break-word" }}>{domain}</h1>
          {dateLabel ? (
            <p style={{ fontFamily: MONO, fontSize: 11, color: t.inkMuted, margin: "0 0 30px", letterSpacing: "0.06em" }}>Scanned {dateLabel}</p>
          ) : <div style={{ height: 30 }} />}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <VerdictRing score={view.score} size={166} stroke={3.5} fontSize={52} color={ringColor} track={t.track} />
          </div>
          {/* The ring number IS the % of conversion best-practices captured — name it, never grade it. */}
          <p style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: t.inkMuted, margin: "14px 0 0" }}>
            % Conversion best-practice coverage
          </p>
          <div style={{ marginTop: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: ringColor, border: `0.5px solid ${ringColor}66`, padding: "5px 12px" }}>
              {view.opportunity.label}
            </span>
          </div>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: t.inkPrimary, margin: "18px auto 0", maxWidth: 460, letterSpacing: "-0.2px", lineHeight: 1.4 }}>
            {view.opportunity.blurb}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 12, color: t.inkSecondary, margin: "12px 0 0", letterSpacing: "0.04em" }}>
            {view.score}% ±{COVERAGE_TOLERANCE} captured · {view.percentile} percentile{view.siteLabel ? ` in ${view.siteLabel}` : ""}
          </p>
          {view.pageTypeNote ? (
            <p style={{ fontFamily: MONO, fontSize: 11, fontStyle: "italic", color: t.inkMuted, margin: "10px auto 0", maxWidth: 480, letterSpacing: "0.02em", lineHeight: 1.5 }}>
              {view.pageTypeNote}
            </p>
          ) : null}
          {view.findings.length > 0 ? (
            <p style={{ fontFamily: MONO, fontSize: 12, color: t.inkMuted, margin: "12px 0 0", letterSpacing: "0.04em" }}>{findingsCountLine}</p>
          ) : null}
        </div>
      </section>
    ),
    health: () => (
      <section key="health" id="health" ref={(el) => { sectionRefs.current.health = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
        <SectionLabel t={t}>Conversion Health</SectionLabel>
        <div className="report-health-strip">
          {view.dimensions.map((d) => {
            const c = bandColor(d.score, t);
            return (
              <div key={d.label} style={{ background: t.surface, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, minHeight: 104 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.35, color: t.inkSecondary, letterSpacing: "0.03em", minHeight: 26 }}>{d.label}</div>
                <div style={{ position: "relative", width: "100%", height: 2, background: t.track, marginTop: "auto" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.max(0, Math.min(100, d.score))}%`, background: c }} />
                </div>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: c }}>{d.score}</div>
              </div>
            );
          })}
        </div>
        <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: t.inkMuted, margin: "12px 0 0" }}>
          27 categories · 308 checks
        </p>
      </section>
    ),
    brief: () => (
      <section key="brief" id="brief" ref={(el) => { sectionRefs.current.brief = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
        <SectionLabel t={t}>Diagnostic Brief</SectionLabel>
        <div style={{ borderLeft: `2px solid ${t.accent}`, paddingLeft: 20 }}>
          <p style={{ fontFamily: BODY, fontSize: 16, lineHeight: 1.7, color: t.inkPrimary, margin: 0 }}>{view.brief}</p>
        </div>
      </section>
    ),
    findings: () => (
      <section key="findings" id="findings" ref={(el) => { sectionRefs.current.findings = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
        <SectionLabel t={t}>Ranked Findings</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {view.findings.map((f, i) => {
            const meta = severityMeta(f.severity, t);
            const liftPositive = isPositiveLift(f.impactEstimate);
            return (
              <div key={`${f.title}-${i}`} style={{ position: "relative", borderLeft: `2px solid ${meta.color}`, background: `color-mix(in srgb, ${meta.color} 5%, transparent)`, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: t.inkMuted }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: meta.color, border: `0.5px solid ${meta.color}66`, padding: "3px 8px" }}>{meta.label}</span>
                  {f.dimension ? (
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: t.inkMuted, border: `0.5px solid ${t.border}`, padding: "3px 8px" }}>{f.dimension}</span>
                  ) : null}
                  {f.impactEstimate ? (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: liftPositive ? t.verdict.green : t.inkMuted, marginLeft: "auto" }}>{f.impactEstimate}</span>
                  ) : null}
                </div>
                <h3 style={{ fontFamily: DISP, fontWeight: 600, fontSize: 16, color: t.inkPrimary, margin: "0 0 8px", letterSpacing: "-0.2px" }}>{f.title}</h3>
                {f.evidence ? <p style={{ fontFamily: BODY, fontSize: 14, lineHeight: 1.65, color: t.inkSecondary, margin: 0 }}>{f.evidence}</p> : null}
                {f.impactLine ? <p style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.6, color: t.inkMuted, margin: "8px 0 0" }}>{f.impactLine}</p> : null}
              </div>
            );
          })}
        </div>
      </section>
    ),
    rewrites: () => (
      <section key="rewrites" id="rewrites" ref={(el) => { sectionRefs.current.rewrites = el; }} className="report-doc-anchor" style={{ marginBottom: 52 }}>
        <SectionLabel t={t}>Rewrites</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {view.rewrites.map((r) => (
            <div key={r.label}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: t.inkMuted, marginBottom: 8 }}>{r.label}</div>
              <div className="report-rewrite-grid" style={{ border: `0.5px solid ${t.border}` }}>
                <div style={{ background: t.surface, padding: "14px 16px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: t.inkMuted, marginBottom: 6 }}>Current</div>
                  <p style={{ fontFamily: BODY, fontSize: 14, lineHeight: 1.6, color: t.inkSecondary, margin: 0 }}>{r.current || "—"}</p>
                </div>
                <div style={{ background: t.surface, padding: "14px 16px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: t.accent, marginBottom: 6 }}>Rewritten</div>
                  <p style={{ fontFamily: BODY, fontSize: 14, lineHeight: 1.6, color: t.inkPrimary, margin: 0 }}>{r.rewritten}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    blueprint: () => {
      const bp = view.blueprint!;
      return (
        <section key="blueprint" id="blueprint" ref={(el) => { sectionRefs.current.blueprint = el; }} className="report-doc-anchor">
          <SectionLabel t={t}>Growth Blueprint</SectionLabel>
          <div className="report-blueprint-grid">
            {([
              { title: "Week 1", items: bp.week1 },
              { title: "Weeks 2–4", items: bp.weeks24 },
              { title: "Month 2+", items: bp.month2 },
            ] as const).filter((c) => c.items.length > 0).map((col) => (
              <div key={col.title} style={{ border: `0.5px solid ${t.border}`, background: t.surface, padding: "18px 18px 20px" }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: t.accent, marginBottom: 14 }}>{col.title}</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {col.items.map((it, i) => (
                    <li key={i} style={{ fontFamily: BODY, fontSize: 13.5, lineHeight: 1.55, color: t.inkSecondary, display: "flex", gap: 9 }}>
                      <span style={{ color: t.accent, flexShrink: 0 }}>·</span>{it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      );
    },
  };

  const preparedFor = domain;

  return (
    <div
      style={{
        width: "100%",
        background: t.bg,
        color: t.inkPrimary,
        // On the /reports render (!fillContainer) the route has no navbar but the
        // root layout still pads 64px — pull up and repaint it in the theme bg so a
        // light white-label report has no dark band above the cover.
        ...(fillContainer ? { height: "100%", overflowY: "auto" } : { minHeight: "100vh", marginTop: "-64px", paddingTop: "64px" }),
      }}
    >
      <style>{`
        .report-doc-anchor { scroll-margin-top: 64px; }
        .report-health-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
          gap: 1px;
          background: ${t.border};
          border: 0.5px solid ${t.border};
        }
        .report-rewrite-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${t.border}; }
        @media (max-width: 640px) { .report-rewrite-grid { grid-template-columns: 1fr; } }
        .report-blueprint-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 760px) { .report-blueprint-grid { grid-template-columns: 1fr; } }
        @media print {
          .report-jumpnav { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Thin sticky in-page jump nav (anchors, not a rail) + print/PDF action */}
      <nav
        className="report-jumpnav"
        style={{
          position: "sticky", top: 0, zIndex: 20,
          display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap",
          padding: "10px 24px", background: t.mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(5,8,16,0.9)",
          backdropFilter: "blur(10px)", borderBottom: `0.5px solid ${t.border}`,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: t.inkMuted, marginRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
          {domain}
        </span>
        {JUMP.filter((j) => liveSections.some((s) => s.id === j.id)).map((j) => (
          <button key={j.id} type="button" onClick={() => scrollTo(j.id)} style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.inkSecondary, background: "transparent", border: "none", padding: "5px 9px", cursor: "pointer" }}>
            {j.label}
          </button>
        ))}
        <button type="button" onClick={() => window.print()} style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.accent, background: "transparent", border: `0.5px solid ${t.accent}55`, padding: "5px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>
          PDF ↓
        </button>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "44px 24px 64px" }}>

        {/* ── COVER — agency-owned, white-label only (heavy accent) ──────────── */}
        {branding ? (
          <section style={{ position: "relative", marginBottom: 48, padding: "30px 28px 26px", border: `0.5px solid ${t.border}`, background: t.surface, overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: t.accent }} />
            <div aria-hidden style={{ position: "absolute", right: -40, top: -40, width: 240, height: 200, background: `radial-gradient(ellipse at center, ${t.accentSoft} 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt={branding.agencyName || "Agency"} style={{ height: 48, width: "auto", maxWidth: 260, objectFit: "contain", display: "block", marginBottom: 18 }} crossOrigin="anonymous" />
              ) : branding.agencyName ? (
                <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 22, color: t.accent, marginBottom: 14 }}>{branding.agencyName}</div>
              ) : null}
              <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: t.accent, margin: "0 0 8px" }}>
                Conversion audit · prepared for {preparedFor}
              </p>
              {branding.agencyName && branding.logoUrl ? (
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.inkSecondary, margin: "0 0 2px" }}>{branding.agencyName}</p>
              ) : null}
              {branding.coverNote ? (
                <p style={{ fontFamily: BODY, fontSize: 15, lineHeight: 1.7, color: t.inkPrimary, margin: "12px 0 0", maxWidth: 620 }}>{branding.coverNote}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── BODY — locked instrument, template-ordered sections ───────────── */}
        {liveSections.map((s) => sections[s.id]())}

        {/* ── FOOTER — agency-owned, white-label only ───────────────────────── */}
        {branding ? (
          <footer style={{ marginTop: 56, paddingTop: 18, borderTop: `0.5px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em", color: t.inkSecondary }}>
              {[branding.footerText || branding.agencyName, "Confidential"].filter(Boolean).join(" · ")}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: t.inkMuted }}>
              308 checks · verified findings
            </span>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
