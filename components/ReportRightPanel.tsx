"use client";

import {
  useRef,
  useState,
  useMemo,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import type { FindingSeverity } from "@/components/FindingCard";
import type { FindingData } from "@/components/FindingCard";
import type { HeroRewriteData } from "@/components/HeroRewriteModule";
import type { GrowthStrategyData } from "@/components/GrowthStrategyModule";
import { MOCK_FINDINGS } from "@/lib/reportData";
import type {
  ConversionTransformation,
  DiagnosticOverviewCopy,
  GrowthBlueprint,
} from "@/lib/reportSchema";
import UpgradeButton from "@/components/UpgradeButton";
import { stripMarkdownForDisplay } from "@/lib/stripMarkdownForDisplay";
import { UPSELL_FALLBACK_LOCKED_TITLES } from "@/lib/dashboardUpsell";

export type SeverityFilter = "all" | "critical" | "warnings" | "passing";

export type ExecutiveSummaryPanel = {
  verdict: string;
  diagnosis: string;
  priorityAction: string;
  estimatedImpact: string;
  weekOneActions: string[];
};

export type DiagnosticStatsPanel = {
  totalChecked: number;
  totalFailed: number;
  totalPassed?: number;
  criticalCount: number;
};

type ReportRightPanelProps = {
  severityFilter: SeverityFilter;
  sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  sharedView?: boolean;
  domain?: string;
  /** Public share link token (UUID) for copying `/share/{token}`. */
  shareToken?: string;
  /** When provided (e.g. from API), use these instead of MOCK_FINDINGS */
  findings?: FindingData[];
  /** Revenue findings — top 8 diagnostic findings (full cards). */
  moneyLeaks?: FindingData[];
  quickWins?: FindingData[];
  growthRoadmap?: FindingData[];
  /** Filters growth roadmap by category tab (from left panel). */
  activeCategoryId?: string | null;
  /** When provided (e.g. from API), pass to HeroRewriteModule */
  heroRewriteData?: HeroRewriteData;
  /** When provided, render the new growth strategy module above hero rewrite */
  growthStrategyData?: GrowthStrategyData;
  executiveSummary?: ExecutiveSummaryPanel;
  /** Dynamic overview from rubric pipeline second Claude call */
  overviewCopy?: DiagnosticOverviewCopy | null;
  diagnosticStats?: DiagnosticStatsPanel;
  /** Additional findings not shown in primary list (rubric curation) */
  hiddenFindingsCount?: number;
  isPro?: boolean;
  /**
   * `undefined` = use legacy `thirtyDayPlan` text (no payload).
   * `null` = payload present but no findings to build a plan — hide 30-day block.
   * non-empty array = dynamic week lines from findings.
   */
  computedThirtyDayPlanLines?: string[] | null;
  intelligenceBrief?: string;
  siteIntelligence?: string;
  growthBlueprint?: GrowthBlueprint;
  conversionTransformation?: ConversionTransformation;
  issueReportId?: string | null;
  narrativeFlow?: { verdict: 'strong' | 'weak' | 'broken'; summary: string } | null;
};

const STAGGER_MS = 50;

const REPORT_MONO = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const INTER_STACK = "Inter, ui-sans-serif, system-ui, sans-serif";

function splitFirstNSentences(text: string, n: number): { head: string; tail: string } {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return { head: "", tail: "" };
  const parts = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (parts.length <= n) return { head: t, tail: "" };
  return { head: parts.slice(0, n).join(" "), tail: parts.slice(n).join(" ") };
}

function scrollToFindingsPaywall() {
  if (typeof document === "undefined") return;
  document.getElementById("findings-paywall-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function LockIconSmall({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6V11z"
        stroke="#8899AA"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Clean locked card — title visible, body replaced with access gate (free plan). */
export function LockedFindingCard({ finding, index: _index }: { finding: FindingData; index: number }) {
  const leftColor =
    finding.severity === "critical" || finding.rubricSeverity === "Critical"
      ? "#FF4444"
      : finding.rubricSeverity === "High"
        ? "#FF8C00"
        : finding.rubricSeverity === "Medium" || finding.severity === "warning"
          ? "#F5A623"
          : "#4A9EFF";
  const cat =
    (finding as { category?: string }).category?.trim() ||
    finding.categoryName?.trim() ||
    "—";
  const badgeLabel =
    finding.severity === "critical" || finding.rubricSeverity === "Critical"
      ? "CRITICAL"
      : finding.rubricSeverity === "High"
        ? "HIGH"
        : finding.rubricSeverity === "Medium" || finding.severity === "warning"
          ? "MEDIUM"
          : severityBadgeLabel(finding);
  const badgeSolid =
    finding.severity === "critical" || finding.rubricSeverity === "Critical"
      ? { background: "#FF4444", color: "#FFFFFF", border: "1px solid #FF4444" }
      : finding.rubricSeverity === "High"
        ? { background: "#FF8C00", color: "#050810", border: "1px solid #FF8C00" }
        : finding.rubricSeverity === "Medium" || finding.severity === "warning"
          ? { background: "#F5A623", color: "#050810", border: "1px solid #F5A623" }
          : { background: "rgba(74,158,255,0.12)", color: "#4A9EFF", border: "1px solid rgba(74,158,255,0.3)" };

  return (
    <div
      className="report-finding-card"
      style={{
        background: "#0A0F1E",
        border: "1px solid #1A2035",
        borderLeft: `3px solid ${leftColor}`,
        borderRadius: 0,
        padding: "16px 20px",
        margin: "8px 0",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: REPORT_MONO,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.1em",
            padding: "3px 8px",
            textTransform: "uppercase",
            borderRadius: 0,
            ...badgeSolid,
          }}
        >
          {badgeLabel}
        </span>
        <span
          style={{
            fontFamily: REPORT_MONO,
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "#8899AA",
            border: "1px solid #1A2035",
            padding: "3px 8px",
            borderRadius: 0,
            textTransform: "lowercase",
          }}
        >
          {cat}
        </span>
      </div>
      <h3
        className="report-finding-card-title"
        style={{
          margin: "10px 0 0 0",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 600,
          fontSize: 13,
          lineHeight: 1.35,
          color: "#FFFFFF",
        }}
      >
        {stripMarkdownForDisplay(finding.revenueTitle?.trim() || finding.title || "Finding")}
      </h3>
      <div
        style={{
          marginTop: 12,
          background: "#080D18",
          border: "1px solid #1A2035",
          borderRadius: 0,
          padding: "12px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LockIconSmall size={12} />
          <span
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 11,
              color: "#8899AA",
              lineHeight: 1.5,
            }}
          >
            Pro access required
          </span>
        </div>
      </div>
    </div>
  );
}

/** Paywall banner inserted between finding 2 and finding 3. */
export function FindingsPaywallBanner({ lockedCount }: { lockedCount: number }) {
  return (
    <div
      className="report-finding-card"
      id="findings-paywall-banner"
      role="region"
      aria-label="Pro diagnostic access for additional findings"
      style={{
        background: "#0A0E18",
        border: "1px solid rgba(0,196,140,0.12)",
        borderLeft: "3px solid #00C48C",
        borderRadius: 0,
        padding: "20px 24px",
        margin: "8px 0",
      }}
    >
      <div
        style={{
          fontFamily: REPORT_MONO,
          fontSize: 10,
          color: "#00C48C",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        DIAGNOSTIC ACCESS REQUIRED
      </div>
      <h3
        className="report-finding-card-title"
        style={{
          margin: "8px 0 0 0",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 600,
          fontSize: 20,
          color: "#FFFFFF",
          lineHeight: 1.3,
        }}
      >
        {lockedCount} findings are suppressing your conversions.
      </h3>
      <p
        style={{
          margin: "8px 0 0 0",
          fontFamily: REPORT_MONO,
          fontSize: 13,
          color: "#8899AA",
          lineHeight: 1.7,
        }}
      >
        Upgrade to Pro to access all diagnostic findings, revenue impact analysis, exact resolutions, and AI advisor access — ranked by revenue impact.
      </p>
      <div style={{ marginTop: 16, width: "100%" }}>
        <UpgradeButton label="Upgrade to Pro Diagnostic" style={{ width: "100%" }} />
      </div>
      <p
        style={{
          margin: "8px 0 0 0",
          textAlign: "center",
          fontFamily: REPORT_MONO,
          fontSize: 11,
          color: "#8899AA",
        }}
      >
        Free plan includes 2 diagnostic findings per scan.
      </p>
    </div>
  );
}

function filterFindingsBySeverity(
  severity: FindingSeverity,
  filter: SeverityFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "critical") return severity === "critical";
  if (filter === "warnings") return severity === "warning";
  if (filter === "passing") return severity === "passing";
  return true;
}

function severityBadgeLabel(f: FindingData): string {
  if (f.severity === "critical" || f.rubricSeverity === "Critical") return "CRITICAL";
  if (f.rubricSeverity === "High" || f.severity === "warning") return "HIGH SUPPRESSION";
  if (f.rubricSeverity === "Medium") return "MEDIUM SUPPRESSION";
  if (f.rubricSeverity === "Low") return "LOW SUPPRESSION";
  if (f.severity === "passing") return "PASSING";
  return "SUPPRESSION";
}

function revenueSuppressionLine(f: FindingData): string {
  if (f.severity === "critical" || f.rubricSeverity === "Critical") return "Revenue suppression: Critical";
  if (f.rubricSeverity === "High" || f.severity === "warning") return "Revenue suppression: High";
  if (f.rubricSeverity === "Medium") return "Revenue suppression: Medium";
  if (f.rubricSeverity === "Low") return "Revenue suppression: Low";
  return "Revenue suppression: Medium";
}

function revenueSuppressionColor(f: FindingData): string {
  if (f.severity === "critical" || f.rubricSeverity === "Critical") return "#FF2D2D";
  if (f.rubricSeverity === "High" || f.severity === "warning") return "#FFB300";
  if (f.rubricSeverity === "Medium") return "#FFD600";
  if (f.rubricSeverity === "Low") return "#8899AA";
  return "#8899AA";
}

function evidencePreviewLine(f: FindingData): string {
  const ev = (f as { evidence?: string }).evidence;
  const raw = stripMarkdownForDisplay(String(ev ?? f.whatWeFound ?? "").trim());
  return raw.replace(/\s+/g, " ");
}

function impactPreviewLine(f: FindingData): string {
  const imp = f.impactStatement?.trim();
  const biz = f.businessCost?.trim();
  const why =
    typeof f.whyItMatters === "string"
      ? f.whyItMatters.trim()
      : typeof f.whyItMatters === "object" && f.whyItMatters != null
        ? ""
        : "";
  const raw = stripMarkdownForDisplay((imp || biz || why || "").trim());
  return raw.replace(/\s+/g, " ");
}

export function ReportFindingPreview({
  finding,
  index,
  issueReportId,
}: {
  finding: FindingData;
  index: number;
  issueReportId: string | null;
}) {
  const n = String(index).padStart(2, "0");
  const cat =
    (finding as { category?: string }).category?.trim() ||
    finding.categoryName?.trim() ||
    "—";
  const leftColor =
    finding.severity === "critical" || finding.rubricSeverity === "Critical"
      ? "#FF4444"
      : finding.rubricSeverity === "High"
        ? "#FF8C00"
        : finding.rubricSeverity === "Medium" || finding.severity === "warning"
          ? "#F5A623"
          : finding.severity === "passing"
            ? "#4A9EFF"
            : "#8899AA";

  const badgeStyle =
    finding.severity === "critical" || finding.rubricSeverity === "Critical"
      ? {
          background: "rgba(255,68,68,0.12)",
          color: "#FF4444",
          border: "1px solid rgba(255,68,68,0.35)",
        }
      : finding.rubricSeverity === "High"
        ? {
            background: "rgba(255,140,0,0.1)",
            color: "#FF8C00",
            border: "1px solid rgba(255,140,0,0.35)",
          }
        : finding.rubricSeverity === "Medium" || finding.severity === "warning"
          ? {
              background: "rgba(245,166,35,0.08)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }
          : {
              background: "rgba(74,158,255,0.08)",
              color: "#4A9EFF",
              border: "1px solid rgba(74,158,255,0.25)",
            };

  const href =
    issueReportId && finding.id
      ? `/issue/${issueReportId}/${encodeURIComponent(finding.id)}`
      : null;

  return (
    <div
      className="report-finding-card"
      style={{
        position: "relative",
        background: "#0D1321",
        border: "1px solid #1A2035",
        borderLeft: `3px solid ${leftColor}`,
        padding: "12px 14px 10px 14px",
        marginBottom: 10,
        minHeight: 0,
        maxHeight: 168,
        overflow: "hidden",
      }}
    >
      <div className="flex flex-row flex-wrap items-center justify-between gap-2" style={{ marginBottom: 8 }}>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <span
            style={{ fontFamily: REPORT_MONO, fontSize: 10, color: "#8899AA", letterSpacing: "0.08em" }}
          >
            {n}
          </span>
          <span
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              padding: "3px 8px",
              textTransform: "uppercase",
              ...badgeStyle,
            }}
          >
            {severityBadgeLabel(finding)}
            {finding.sourcePage ? (
              <span style={{ fontWeight: 400, opacity: 0.65, marginLeft: 4 }}>
                · {finding.sourcePage}
              </span>
            ) : null}
          </span>
          <span
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 9,
              letterSpacing: "0.06em",
              color: "#8899AA",
              border: "1px solid #1A2035",
              padding: "3px 8px",
              textTransform: "lowercase",
            }}
          >
            {cat}
          </span>
        </div>
        <span
          style={{
            fontFamily: REPORT_MONO,
            fontSize: 9,
            color: revenueSuppressionColor(finding),
            whiteSpace: "nowrap",
          }}
        >
          {revenueSuppressionLine(finding)}
        </span>
      </div>
      <h3
        className="report-finding-card-title"
        style={{
          margin: "0 0 6px 0",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.3,
          color: "#FFFFFF",
        }}
      >
        {stripMarkdownForDisplay(finding.revenueTitle?.trim() || finding.title || "Finding")}
      </h3>
      <p
        style={{
          margin: "0 0 6px 0",
          fontFamily: REPORT_MONO,
          fontSize: 12,
          fontStyle: "italic",
          color: "#8899AA",
          lineHeight: 1.45,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={evidencePreviewLine(finding)}
      >
        {evidencePreviewLine(finding) || "—"}
      </p>
      <p
        style={{
          margin: "0 0 8px 0",
          fontFamily: INTER_STACK,
          fontSize: 13,
          color: "rgba(240,244,255,0.88)",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
        title={impactPreviewLine(finding)}
      >
        {impactPreviewLine(finding) || "—"}
      </p>
      <div style={{ textAlign: "right" }}>
        {href ? (
          <Link
            href={href}
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 10,
              letterSpacing: "0.06em",
              color: "#00C48C",
              textDecoration: "none",
            }}
          >
            VIEW FULL DIAGNOSTIC →
          </Link>
        ) : (
          <span style={{ fontFamily: REPORT_MONO, fontSize: 10, color: "rgba(136,153,170,0.45)" }}>
            Save report to open full diagnostic
          </span>
        )}
      </div>
    </div>
  );
}

function parseThirtyDayWeeks(plan: string): { label: string; content: string }[] | null {
  const text = (plan ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return null;

  const pattern = /(?:^|\n)\s*(Week\s*[1-4])\s*[:\-]?\s*/gi;
  const matches = [...text.matchAll(pattern)];
  if (matches.length === 0) return null;

  const segments: { label: string; content: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const start = (m.index ?? 0) + m[0].length;
    const next = matches[i + 1];
    const end = next?.index ?? text.length;
    const body = text.slice(start, end).trim();
    const label = m[1]!.replace(/\s+/g, " ").trim().toUpperCase();
    segments.push({ label, content: body });
  }
  return segments.length ? segments : null;
}

function splitPsychologistNote(note: string | undefined): [string, string] {
  const parts = (note ?? "")
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [parts[0] ?? "", parts[1] ?? ""];
}

function isNoneDetectedText(s: string): boolean {
  return s.trim().toLowerCase() === "none detected";
}

function formatTransformationOptimizedLine(raw: string): string {
  const t = stripMarkdownForDisplay(raw.trim());
  return t || "—";
}

function parseOptionsFromBody(t: string): string[] {
  if (!t) return [];
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const opts: string[] = [];
  const re = /^option\s*[abc]\s*:\s*(.+)$/i;
  for (const line of lines) {
    const m = line.match(re);
    if (m) opts.push(m[1]!.trim());
  }
  return opts;
}

function parseCopyOptionsList(primary: string, alts?: string[] | undefined): string[] {
  const p = stripMarkdownForDisplay(primary.trim());
  const parsed = parseOptionsFromBody(p);
  if (parsed.length > 0) return parsed;
  const extra = (alts ?? [])
    .map((x) => stripMarkdownForDisplay(String(x ?? "").trim()))
    .filter(Boolean);
  if (p && extra.length) return [p, ...extra];
  if (p) return [p];
  return extra;
}

function renderNarrativeWithLiftAccent(text: string): ReactNode {
  const rx = /(\d{1,2}\s*[–-]\s*\d{1,3}\s*%|\d{1,2}\s*%)/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={`${m.index}-${m[0]}`} style={{ color: "#00E676" }}>
        {m[0]}
      </span>
    );
    last = rx.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

function OptimizedCopyLines({
  lines,
  fontSize,
  fontWeight,
  isCta,
}: {
  lines: string[];
  fontSize: number;
  fontWeight: number;
  isCta: boolean;
}) {
  const cleaned = lines.map((l) => stripMarkdownForDisplay(l.trim())).filter(Boolean);
  if (!cleaned.length) {
    return isCta ? (
      <span
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize,
          color: "#FFFFFF",
        }}
      >
        —
      </span>
    ) : (
      <p
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize,
          color: "#FFFFFF",
          margin: 0,
        }}
      >
        —
      </p>
    );
  }
  return (
    <div style={{ marginBottom: isCta ? 0 : 16 }}>
      {cleaned.map((display, i) => (
        <div key={`${i}-${display.slice(0, 12)}`} style={{ marginBottom: i < cleaned.length - 1 ? 12 : 0 }}>
          {cleaned.length > 1 ? (
            <div
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 9,
                letterSpacing: "0.08em",
                color: "#8899AA",
                marginBottom: 4,
              }}
            >
              Option {String.fromCharCode(65 + i)}
            </div>
          ) : null}
          {isCta ? (
            <span
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 11,
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "6px 14px",
                display: "inline-block",
                borderRadius: 0,
              }}
            >
              {display}
            </span>
          ) : (
            <p
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize,
                fontWeight,
                color: "#FFFFFF",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {display}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function renderTransformationCurrentBlock(
  _kind: "Headline" | "Subheadline",
  raw: string,
  fontSize: 18 | 14
) {
  const t = stripMarkdownForDisplay(raw.trim());
  if (!t) {
    return (
      <div style={{ marginBottom: 16 }}>
        <p
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize,
            color: "rgba(255,255,255,0.35)",
            fontStyle: "italic",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          —
        </p>
      </div>
    );
  }
  if (isNoneDetectedText(t)) {
    return (
      <div style={{ marginBottom: 16 }}>
        <p
          style={{
            fontFamily:
              "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 10,
            color: "rgba(255,255,255,0.25)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {t}
        </p>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <p
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize,
          color:
            fontSize === 18
              ? "rgba(255,255,255,0.35)"
              : "rgba(255,255,255,0.35)",
          fontStyle: "italic",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {t}
      </p>
    </div>
  );
}

function renderTransformationCurrentCta(raw: string) {
  const t = stripMarkdownForDisplay(raw.trim());
  if (!t) {
    return (
      <p
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: 14,
          color: "rgba(255,255,255,0.35)",
          fontStyle: "italic",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        —
      </p>
    );
  }
  if (isNoneDetectedText(t)) {
    return (
      <p
        style={{
          fontFamily:
            "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
          fontSize: 10,
          color: "rgba(255,255,255,0.25)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {t}
      </p>
    );
  }
  return (
    <p
      style={{
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: 14,
        color: "rgba(255,255,255,0.35)",
        fontStyle: "italic",
        lineHeight: 1.5,
        margin: 0,
      }}
    >
      {t}
    </p>
  );
}

export default function ReportRightPanel({
  severityFilter,
  sectionRefs,
  scrollContainerRef,
  sharedView = false,
  domain = "",
  shareToken,
  findings: findingsProp,
  moneyLeaks: moneyLeaksProp,
  quickWins: _quickWinsProp = [],
  growthRoadmap: _growthRoadmapProp = [],
  activeCategoryId: _activeCategoryId = null,
  heroRewriteData,
  growthStrategyData,
  executiveSummary,
  overviewCopy,
  diagnosticStats: _diagnosticStats,
  hiddenFindingsCount: hiddenFindingsCountProp,
  isPro = false,
  computedThirtyDayPlanLines,
  intelligenceBrief,
  siteIntelligence: _siteIntelligence,
  growthBlueprint,
  conversionTransformation,
  issueReportId = null,
  narrativeFlow,
}: ReportRightPanelProps) {
  const findingsList = findingsProp ?? MOCK_FINDINGS;
  const moneyLeaksList =
    moneyLeaksProp && moneyLeaksProp.length > 0 ? moneyLeaksProp : findingsList;

  const [killerFilter, setKillerFilter] = useState<
    "all" | "critical" | "high" | "today" | "this-week"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const priorityFindings = useMemo(
    () =>
      moneyLeaksList.filter((f) =>
        filterFindingsBySeverity(f.severity, severityFilter)
      ),
    [moneyLeaksList, severityFilter]
  );

  const killerCategoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of moneyLeaksList) {
      const raw =
        (l as FindingData & { category?: string }).category?.trim() ||
        l.categoryName?.trim();
      if (!raw) continue;
      const k = raw.toLowerCase();
      if (!map.has(k)) map.set(k, raw);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [moneyLeaksList]);

  const filteredFindings = useMemo(() => {
    return priorityFindings
      .filter((f) => {
        if (killerFilter === "critical") {
          return (
            f.severity === "critical" || f.rubricSeverity === "Critical"
          );
        }
        if (killerFilter === "high") {
          return f.severity === "warning" || f.rubricSeverity === "High";
        }
        if (killerFilter === "today") {
          return (
            f.revenueEffort === "Today" ||
            (f as { effort?: string }).effort === "Today"
          );
        }
        if (killerFilter === "this-week") {
          return (
            f.revenueEffort === "This Week" ||
            (f as { effort?: string }).effort === "This Week"
          );
        }
        return true;
      })
      .filter((f) => {
        if (categoryFilter === "all") return true;
        const cat =
          (f as FindingData & { category?: string }).category ??
          f.categoryName ??
          "";
        return cat.toLowerCase() === categoryFilter.toLowerCase();
      });
  }, [priorityFindings, killerFilter, categoryFilter]);

  const findingsTotalCount = moneyLeaksList.length;
  const findingsFilterActive =
    killerFilter !== "all" ||
    categoryFilter !== "all" ||
    severityFilter !== "all";

  const moneyLeakOrdinal = useMemo(() => {
    const m = new Map<string, number>();
    moneyLeaksList.forEach((f, i) => m.set(f.id, i + 1));
    return m;
  }, [moneyLeaksList]);

  const showFindingsPaywall =
    !isPro && !sharedView && findingsTotalCount > 2;
  const lockedFindingsCount = Math.max(0, findingsTotalCount - 2);

  const transformationCopy = useMemo(() => {
    const hr = heroRewriteData;
    const ct = conversionTransformation;
    const headlinePrimary = ct?.rewrittenHeadline ?? hr?.suggested?.headline ?? "";
    const subPrimary = ct?.rewrittenSubheadline ?? hr?.suggested?.subheadline ?? "";
    const ctaPrimary = ct?.rewrittenCta ?? hr?.suggested?.cta ?? "";
    return {
      currentHeadline: ct?.currentHeadline ?? hr?.current?.headline ?? "",
      currentSubheadline: ct?.currentSubheadline ?? hr?.current?.subheadline ?? "",
      currentCta: ct?.currentCta ?? hr?.current?.cta ?? "",
      optHeadline: headlinePrimary,
      optSubheadline: subPrimary,
      optCta: ctaPrimary,
      optHeadlineLines: parseCopyOptionsList(
        headlinePrimary,
        ct?.rewrittenHeadlineAlternatives
      ),
      optSubLines: parseCopyOptionsList(subPrimary, ct?.rewrittenSubheadlineAlternatives),
      optCtaLines: parseCopyOptionsList(ctaPrimary, ct?.rewrittenCtaAlternatives),
    };
  }, [conversionTransformation, heroRewriteData]);

  const trustArchitectureText = useMemo(() => {
    if (conversionTransformation?.trustArchitecture?.trim()) {
      return conversionTransformation.trustArchitecture.trim();
    }
    const g = growthStrategyData?.trustOpportunity?.trim();
    if (g) return g;
    const [a] = splitPsychologistNote(heroRewriteData?.psychologistNote);
    return a;
  }, [conversionTransformation, growthStrategyData, heroRewriteData]);

  const pageFlowText = useMemo(() => {
    if (conversionTransformation?.pageFlowNote?.trim()) {
      return conversionTransformation.pageFlowNote.trim();
    }
    const g = growthStrategyData?.conversionOpportunity?.trim();
    if (g) return g;
    const [, b] = splitPsychologistNote(heroRewriteData?.psychologistNote);
    return b;
  }, [conversionTransformation, growthStrategyData, heroRewriteData]);

  const blueprintDerived = useMemo(() => {
    const gb = growthBlueprint;
    const lines = computedThirtyDayPlanLines ?? [];
    const gbW1 = gb?.weekOne?.filter((s) => s.trim()) ?? [];
    const weekOne =
      gbW1.length > 0
        ? gbW1
        : lines.length > 0
          ? lines.slice(0, 3)
          : (executiveSummary?.weekOneActions?.filter(Boolean) as string[]) ?? [];
    const gbW24 = gb?.weekTwoToFour?.filter((s) => s.trim()) ?? [];
    const weekTwoToFour =
      gbW24.length > 0 ? gbW24 : lines.length > 3 ? lines.slice(3, 6) : [];
    const segments = growthStrategyData?.thirtyDayPlan
      ? parseThirtyDayWeeks(growthStrategyData.thirtyDayPlan)
      : null;
    let month2 =
      gb?.monthTwo?.trim() ??
      [growthStrategyData?.biggestOpportunity, growthStrategyData?.trafficOpportunity]
        .filter(Boolean)
        .join(" ")
        .trim();
    if (!month2 && segments && segments.length > 2) {
      month2 = segments
        .slice(2)
        .map((s) => `${s.label}: ${s.content}`)
        .join("\n\n");
    }
    if (!month2 && growthStrategyData?.thirtyDayPlan?.trim()) {
      month2 = growthStrategyData.thirtyDayPlan.trim();
    }
    const projectedLift =
      gb?.projectedLift?.trim() ??
      overviewCopy?.estimatedImpact?.trim() ??
      executiveSummary?.estimatedImpact?.trim() ??
      "";
    const projectedLiftNarrative =
      typeof gb?.projectedLiftNarrative === "string" ? gb.projectedLiftNarrative.trim() : "";
    return { weekOne, weekTwoToFour, month2, projectedLift, projectedLiftNarrative };
  }, [
    growthBlueprint,
    computedThirtyDayPlanLines,
    executiveSummary,
    growthStrategyData,
    overviewCopy,
  ]);

  const showBriefSection =
    Boolean(intelligenceBrief?.trim()) || Boolean(overviewCopy?.verdict?.trim());
  const showTransformationSection = Boolean(
    transformationCopy.currentHeadline ||
      transformationCopy.optHeadlineLines.length > 0 ||
      trustArchitectureText ||
      pageFlowText
  );
  const showKillersSection = findingsList.length > 0;
  const hasBlueprintData =
    blueprintDerived.weekOne.length > 0 ||
    Boolean(
      blueprintDerived.weekTwoToFour.length > 0 ||
        blueprintDerived.month2?.trim() ||
        blueprintDerived.projectedLift?.trim() ||
        blueprintDerived.projectedLiftNarrative?.trim()
    );
  const showBlueprintSection =
    hasBlueprintData || (!sharedView && !isPro && findingsList.length > 0);

  const [linkCopied, setLinkCopied] = useState(false);
  const [linkCopiedFade, setLinkCopiedFade] = useState(false);

  useEffect(() => {
    if (!linkCopied) return;
    const fadeT = setTimeout(() => setLinkCopiedFade(true), 1700);
    const hideT = setTimeout(() => {
      setLinkCopied(false);
      setLinkCopiedFade(false);
    }, 2000);
    return () => {
      clearTimeout(fadeT);
      clearTimeout(hideT);
    };
  }, [linkCopied]);

  async function handleShareReport() {
    if (typeof window === "undefined") return;
    try {
      const shareUrl = shareToken
        ? window.location.origin + "/share/" + shareToken
        : window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopiedFade(false);
      setLinkCopied(true);
    } catch {
      /* ignore */
    }
  }

  const filterPillStyle = (active: boolean): CSSProperties => ({
    fontFamily:
      "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
    fontSize: 9,
    letterSpacing: "0.12em",
    padding: "6px 12px",
    borderRadius: 0,
    border: active
      ? "1px solid rgba(0,196,140,0.5)"
      : "1px solid rgba(255,255,255,0.15)",
    background: active ? "rgba(0,196,140,0.08)" : "transparent",
    color: active ? "#00C48C" : "rgba(255,255,255,0.5)",
    cursor: "pointer",
    textTransform: "uppercase",
  });

  const renderDiagnosticBriefBlock = (rawText: string) => {
    const stripped = stripMarkdownForDisplay(rawText.trim());
    const freePartial = !isPro && !sharedView;
    const { head, tail } = splitFirstNSentences(stripped, 2);
    const shell = (body: ReactNode) => (
      <div
        style={{
          borderLeft: "2px solid #1A2035",
          paddingLeft: 20,
          marginTop: 12,
        }}
      >
        {body}
      </div>
    );
    if (!freePartial || !tail) {
      return shell(
        <p
          style={{
            fontFamily: INTER_STACK,
            fontSize: 16,
            fontWeight: 400,
            color: "#FFFFFF",
            lineHeight: 1.65,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {stripped}
        </p>
      );
    }
    return shell(
      <>
        <p
          style={{
            fontFamily: INTER_STACK,
            fontSize: 16,
            fontWeight: 400,
            color: "#FFFFFF",
            lineHeight: 1.65,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {head}
        </p>
        <div style={{ position: "relative", marginTop: 10 }}>
          <p
            style={{
              fontFamily: INTER_STACK,
              fontSize: 16,
              fontWeight: 400,
              color: "#FFFFFF",
              lineHeight: 1.65,
              margin: 0,
              whiteSpace: "pre-wrap",
              filter: "blur(4px)",
              opacity: 0.6,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {tail}
          </p>
          <div
            style={{
              marginTop: 12,
              padding: "10px 16px",
              background: "rgba(8,13,24,0.9)",
              borderTop: "1px solid #1A2035",
            }}
          >
            <p style={{ margin: 0, fontFamily: REPORT_MONO, fontSize: 11, color: "#8899AA" }}>
              Full diagnostic brief requires Pro access.
            </p>
            <button
              type="button"
              onClick={scrollToFindingsPaywall}
              style={{
                marginTop: 4,
                padding: 0,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontFamily: REPORT_MONO,
                fontSize: 11,
                color: "#00C48C",
              }}
            >
              Upgrade to Pro →
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      ref={scrollContainerRef as React.RefObject<HTMLDivElement>}
      className="report-right-scroll flex flex-1 flex-col overflow-y-auto"
      style={{
        height: "100%",
        background: "rgba(5,8,16,0.85)",
        backdropFilter: "blur(12px)",
        minWidth: 0,
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .report-diagnostic-header {
            padding: 0 16px !important;
            min-height: 52px;
          }
          .report-content-shell {
            padding: 20px 16px 32px 16px !important;
          }
          .report-finding-card {
            padding: 16px !important;
          }
          .report-finding-card-title {
            font-size: 15px !important;
          }
          .report-header-action-btn {
            min-height: 44px !important;
          }
        }
        @media print {
          .report-layout-left-wrap,
          .report-diagnostic-header,
          .report-header-action-btn {
            display: none !important;
          }
          .report-right-scroll,
          .report-right-shell,
          .report-content-shell {
            overflow: visible !important;
            height: auto !important;
            background: #fff !important;
            color: #000 !important;
          }
          * {
            animation: none !important;
            transition: none !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      {/* Sticky header */}
      <header
        className="report-diagnostic-header sticky top-0 z-10 flex flex-row items-center justify-between"
        style={{
          height: 52,
          background: "rgba(5,8,16,0.95)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          padding: "0 36px",
        }}
      >
        <div className="flex flex-row items-center gap-2.5">
          <span
            style={{
              width: 5,
              height: 5,
              background: "#00C48C",
              flexShrink: 0,
              display: "inline-block",
            }}
            aria-hidden
          />
          <span
            className="font-mono"
            style={{
              fontWeight: 700,
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.14em",
            }}
          >
            CONVERSION INTELLIGENCE
          </span>
        </div>
        <div className="relative flex flex-row items-center gap-2">
          {!sharedView && isPro ? (
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(0,196,140,0.3)",
                borderRadius: 0,
              }}
            >
              <button
                type="button"
                className="report-header-action-btn"
                onClick={() => void handleShareReport()}
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontWeight: 600,
                  fontSize: 10,
                  letterSpacing: "2px",
                  padding: "6px 16px",
                  background: "transparent",
                  border: "none",
                  borderRight: "1px solid rgba(0,196,140,0.3)",
                  color: "#00C48C",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,196,140,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {linkCopied ? "LINK COPIED" : "SHARE REPORT"}
              </button>
              <button
                type="button"
                className="report-header-action-btn"
                onClick={() => {
                  window.print();
                }}
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontWeight: 600,
                  fontSize: 10,
                  letterSpacing: "2px",
                  padding: "6px 16px",
                  background: "transparent",
                  border: "none",
                  color: "#9398A8",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                EXPORT PDF
              </button>
            </div>
          ) : null}
          {linkCopied ? (
            <div
              className="font-mono pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded border px-3 py-1.5 transition-opacity duration-300"
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "rgba(0,196,140,0.95)",
                borderColor: "rgba(0,196,140,0.25)",
                background: "rgba(5,8,16,0.95)",
                opacity: linkCopiedFade ? 0 : 1,
                boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
              }}
              role="status"
            >
              Link copied!
            </div>
          ) : null}
        </div>
      </header>

      {/* Report sections — scroll targets for left NAVIGATE pills */}
      <div
        className="report-content-shell"
        style={{
          padding: "36px 36px 48px 36px",
          paddingBottom: showFindingsPaywall ? 120 : 48,
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {showBriefSection ? (
          <section
            ref={(el) => {
              sectionRefs.current.brief = el;
            }}
            style={{ marginBottom: 48 }}
          >
            <div
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#8899AA",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              DIAGNOSTIC BRIEF
            </div>
            {intelligenceBrief?.trim() ? (
              renderDiagnosticBriefBlock(intelligenceBrief)
            ) : overviewCopy?.verdict?.trim() ? (
              renderDiagnosticBriefBlock(overviewCopy.verdict)
            ) : null}
          </section>
        ) : null}

        {showTransformationSection ? (
          <section
            ref={(el) => {
              sectionRefs.current.transformation = el;
            }}
            style={{ marginBottom: 48 }}
          >
            <div
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#8899AA",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              CONVERSION TRANSFORMATION
            </div>
            <div style={{ position: "relative" }}>
              <div>
                <div>
                  <div
                    style={{
                      fontFamily: REPORT_MONO,
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      color: "#8899AA",
                      marginBottom: 20,
                      textTransform: "uppercase",
                    }}
                  >
                    CURRENT
                  </div>
                  <div
                    style={{
                      fontFamily: REPORT_MONO,
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      color: "#8899AA",
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    HEADLINE
                  </div>
                  {renderTransformationCurrentBlock(
                    "Headline",
                    transformationCopy.currentHeadline,
                    18
                  )}
                  <div
                    style={{
                      fontFamily: REPORT_MONO,
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      color: "#8899AA",
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    SUBHEADLINE
                  </div>
                  {renderTransformationCurrentBlock(
                    "Subheadline",
                    transformationCopy.currentSubheadline,
                    14
                  )}
                  <div
                    style={{
                      fontFamily: REPORT_MONO,
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      color: "#8899AA",
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    CTA
                  </div>
                  {renderTransformationCurrentCta(transformationCopy.currentCta)}
                </div>
              </div>
              {(trustArchitectureText || pageFlowText) && (
                <div style={{ marginTop: 28 }}>
                  {trustArchitectureText ? (
                    <div
                      style={{
                        background: "rgba(0,230,118,0.04)",
                        borderLeft: "2px solid #00E676",
                        padding: "14px 18px",
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 9,
                          letterSpacing: "0.14em",
                          color: "#00E676",
                          marginBottom: 8,
                        }}
                      >
                        TRUST ARCHITECTURE
                      </div>
                      <p
                        style={{
                          fontFamily:
                            "var(--font-space-grotesk), sans-serif",
                          fontSize: 14,
                          color: "rgba(240,244,255,0.92)",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {stripMarkdownForDisplay(trustArchitectureText)}
                      </p>
                    </div>
                  ) : null}
                  {pageFlowText ? (
                    <div
                      style={{
                        background: "rgba(111,155,198,0.04)",
                        borderLeft: "2px solid #6F9BC6",
                        padding: "14px 18px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 9,
                          letterSpacing: "0.14em",
                          color: "#6F9BC6",
                          marginBottom: 8,
                        }}
                      >
                        PAGE FLOW
                      </div>
                      <p
                        style={{
                          fontFamily:
                            "var(--font-space-grotesk), sans-serif",
                          fontSize: 14,
                          color: "rgba(240,244,255,0.92)",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {stripMarkdownForDisplay(pageFlowText)}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {narrativeFlow?.summary ? (
              <div style={{ marginTop: 28 }}>
                <div
                  style={{
                    fontFamily: REPORT_MONO,
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "#8899AA",
                    marginBottom: 10,
                    textTransform: "uppercase",
                  }}
                >
                  NARRATIVE FLOW
                </div>
                <div
                  style={{
                    background: narrativeFlow.verdict === 'strong'
                      ? "rgba(0,196,140,0.04)"
                      : narrativeFlow.verdict === 'broken'
                      ? "rgba(232,99,95,0.04)"
                      : "rgba(239,178,62,0.04)",
                    borderLeft: `2px solid ${
                      narrativeFlow.verdict === 'strong'
                        ? "#00C48C"
                        : narrativeFlow.verdict === 'broken'
                        ? "#E8635F"
                        : "#EFB23E"
                    }`,
                    padding: "14px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: narrativeFlow.verdict === 'strong'
                          ? "#00C48C"
                          : narrativeFlow.verdict === 'broken'
                          ? "#E8635F"
                          : "#EFB23E",
                      }}
                      aria-hidden
                    />
                    <span
                      style={{
                        fontFamily: REPORT_MONO,
                        fontSize: 9,
                        letterSpacing: "0.14em",
                        fontWeight: 600,
                        color: narrativeFlow.verdict === 'strong'
                          ? "#00C48C"
                          : narrativeFlow.verdict === 'broken'
                          ? "#E8635F"
                          : "#EFB23E",
                      }}
                    >
                      {narrativeFlow.verdict.toUpperCase()}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      fontSize: 14,
                      color: "rgba(240,244,255,0.92)",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {stripMarkdownForDisplay(narrativeFlow.summary)}
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {showKillersSection ? (
          <section
            ref={(el) => {
              sectionRefs.current.killers = el;
            }}
            style={{ marginBottom: 48 }}
          >
            <div className="flex flex-row flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex flex-row flex-wrap items-center gap-3">
                  <span
                    style={{
                      fontFamily: REPORT_MONO,
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      color: "#8899AA",
                      textTransform: "uppercase",
                    }}
                  >
                    FINDINGS
                  </span>
                  <span
                    style={{
                      fontFamily: REPORT_MONO,
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.6)",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 0,
                      padding: "4px 10px",
                    }}
                  >
                    {findingsTotalCount}
                  </span>
                </div>
                {findingsFilterActive ? (
                  <p
                    style={{
                      fontFamily: REPORT_MONO,
                      fontSize: 9,
                      color: "#8899AA",
                      letterSpacing: "0.08em",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Showing {filteredFindings.length} of {findingsTotalCount}
                  </p>
                ) : (
                  <p
                    style={{
                      fontFamily: INTER_STACK,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.35)",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Ranked by revenue impact
                  </p>
                )}
              </div>
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.12)",
                margin: "16px 0 24px 0",
              }}
            />
            {moneyLeaksList.length > 0 && (() => {
              const p1 = moneyLeaksList.filter(l => l.severity === "critical" || l.rubricSeverity === "Critical").length;
              const p2 = moneyLeaksList.filter(l => !( l.severity === "critical" || l.rubricSeverity === "Critical") && (l.rubricSeverity === "High" || l.severity === "warning")).length;
              const p3 = moneyLeaksList.length - p1 - p2;
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    marginBottom: 24,
                  }}
                >
                  {([
                    { n: p1, color: "#FF4444", label: "FIX THIS WEEK" },
                    { n: p2, color: "#FF8C00", label: "FIX THIS MONTH" },
                    { n: p3, color: "#8E8EA0", label: "WHEN YOU CAN" },
                  ] as const).map(({ n, color, label }) => (
                    <div
                      key={label}
                      style={{ background: "#0A0D1A", padding: "14px 16px", textAlign: "center" }}
                    >
                      <div style={{ fontFamily: REPORT_MONO, fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>
                        {n}
                      </div>
                      <div style={{ fontFamily: REPORT_MONO, fontSize: 8, color: "#3A3A52", letterSpacing: "0.1em", marginTop: 6, textTransform: "uppercase" }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              {(
                [
                  "all",
                  "critical",
                  "high",
                  "today",
                  "this-week",
                ] as const
              ).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setKillerFilter(f)}
                  style={filterPillStyle(killerFilter === f)}
                >
                  {f === "all"
                    ? `ALL (${moneyLeaksList.length})`
                    : f === "critical"
                      ? `CRITICAL (${moneyLeaksList.filter(
                          (l) =>
                            l.severity === "critical" ||
                            l.rubricSeverity === "Critical"
                        ).length})`
                      : f === "high"
                        ? `HIGH (${moneyLeaksList.filter(
                            (l) =>
                              l.severity === "warning" ||
                              l.rubricSeverity === "High"
                          ).length})`
                        : f === "today"
                          ? "TODAY"
                          : "THIS WEEK"}
                </button>
              ))}
            </div>
            {killerCategoryOptions.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  style={filterPillStyle(categoryFilter === "all")}
                >
                  ALL CATEGORIES
                </button>
                {killerCategoryOptions.map(([keyLower, display]) => (
                  <button
                    key={keyLower}
                    type="button"
                    onClick={() => setCategoryFilter(keyLower)}
                    style={filterPillStyle(categoryFilter === keyLower)}
                  >
                    {display}
                  </button>
                ))}
              </div>
            ) : null}
            {filteredFindings.length > 0 ? (
              (() => {
                const paywalled = !sharedView && !isPro;
                const unlockedFindings = paywalled
                  ? filteredFindings.filter((_, idx) => idx < 2)
                  : filteredFindings;
                const lockedFindingsInView = paywalled
                  ? filteredFindings.filter((_, idx) => idx >= 2)
                  : [];
                return (
                  <>
                    {unlockedFindings.map((finding, i) => {
                      const isP1 = finding.severity === "critical" || finding.rubricSeverity === "Critical";
                      const card = (
                        <CardReveal
                          key={`k-${finding.id}-u-${i}`}
                          delayMs={i * STAGGER_MS}
                        >
                          <ReportFindingPreview
                            finding={finding}
                            index={moneyLeakOrdinal.get(finding.id) ?? i + 1}
                            issueReportId={issueReportId ?? null}
                          />
                        </CardReveal>
                      );
                      if (!isP1) return card;
                      return (
                        <div
                          key={`p1-wrap-${finding.id}-${i}`}
                          style={{
                            background: "rgba(255, 68, 68, 0.04)",
                            border: "1px solid rgba(255, 68, 68, 0.12)",
                            marginBottom: 4,
                          }}
                        >
                          {card}
                        </div>
                      );
                    })}
                    {lockedFindingsInView.length > 0 ? (
                      <div
                        style={{
                          position: "relative",
                          marginTop: 8,
                          marginBottom: 8,
                        }}
                      >
                        {lockedFindingsInView.map((finding, i) => {
                          const filteredIndex = i + 2;
                          return (
                            <div
                              key={`k-${finding.id}-l-${filteredIndex}`}
                              style={{
                                position: "relative",
                                filter: "blur(5px)",
                                pointerEvents: "none",
                                userSelect: "none",
                                opacity: 0.7,
                              }}
                            >
                              <CardReveal delayMs={filteredIndex * STAGGER_MS}>
                                <ReportFindingPreview
                                  finding={finding}
                                  index={
                                    moneyLeakOrdinal.get(finding.id) ??
                                    filteredIndex + 1
                                  }
                                  issueReportId={issueReportId ?? null}
                                />
                              </CardReveal>
                            </div>
                          );
                        })}
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            zIndex: 10,
                            width: 340,
                            maxWidth: "min(340px, calc(100% - 24px))",
                            boxSizing: "border-box",
                            background: "rgba(10,14,24,0.95)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 0,
                            padding: "32px 40px",
                            textAlign: "center",
                            boxShadow: "0 0 60px rgba(0,0,0,0.6)",
                            pointerEvents: "auto",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: REPORT_MONO,
                              fontSize: 10,
                              color: "#00C48C",
                              letterSpacing: "2px",
                              textTransform: "uppercase",
                            }}
                          >
                            {lockedFindingsCount} FINDINGS LOCKED
                          </div>
                          <p
                            style={{
                              margin: "8px auto 0 auto",
                              fontFamily: "var(--font-space-grotesk), sans-serif",
                              fontSize: 15,
                              fontWeight: 500,
                              color: "#FFFFFF",
                              lineHeight: 1.45,
                              maxWidth: 280,
                            }}
                          >
                            Unlock all findings ranked by revenue suppression impact
                          </p>
                          <div style={{ marginTop: 16, width: "100%" }}>
                            <UpgradeButton
                              label="UPGRADE TO PRO DIAGNOSTIC"
                              style={{ width: "100%" }}
                            />
                          </div>
                          <p
                            style={{
                              margin: "8px 0 0 0",
                              fontFamily: REPORT_MONO,
                              fontSize: 10,
                              color: "rgba(136, 153, 170, 0.85)",
                              lineHeight: 1.5,
                            }}
                          >
                            Free plan includes 2 diagnostic findings per scan.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </>
                );
              })()
            ) : priorityFindings.length > 0 ? (
              <p
                style={{
                  fontFamily: REPORT_MONO,
                  fontSize: 12,
                  color: "rgba(240,244,255,0.45)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                No findings match the selected filters. Adjust filters to view additional diagnostic
                findings.
              </p>
            ) : findingsList.length > 0 && severityFilter !== "all" ? (
              <p
                style={{
                  fontFamily: REPORT_MONO,
                  fontSize: 12,
                  color: "rgba(240,244,255,0.45)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                No findings match the selected filters. Adjust filters to view additional diagnostic
                findings.
              </p>
            ) : null}
          </section>
        ) : null}

        {showBlueprintSection ? (
          <section
            ref={(el) => {
              sectionRefs.current.blueprint = el;
            }}
            style={{ marginBottom: 32 }}
          >
            <div
              style={{
                fontFamily: REPORT_MONO,
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#8899AA",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              GROWTH BLUEPRINT
            </div>
            {!isPro && !sharedView ? (
              <GrowthBlueprintFreeTier />
            ) : (
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  <BlueprintColumn variant="week1" items={blueprintDerived.weekOne} />
                  <BlueprintColumn variant="week24" items={blueprintDerived.weekTwoToFour} />
                  <BlueprintColumn variant="month2" paragraph={blueprintDerived.month2} />
                </div>
                {blueprintDerived.projectedLift || blueprintDerived.projectedLiftNarrative ? (
                  <div
                    style={{
                      marginTop: 20,
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid #00E676",
                      background: "#0A0F1E",
                      borderRadius: 0,
                      padding: "16px 20px 16px 17px",
                      borderLeft: "3px solid #00E676",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: REPORT_MONO,
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        color: "#00E676",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      PROJECTED CONVERSION LIFT
                    </div>
                    <p
                      style={{
                        fontFamily: INTER_STACK,
                        fontSize: 17,
                        fontWeight: 400,
                        color: "#FFFFFF",
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {blueprintDerived.projectedLiftNarrative?.trim()
                        ? renderNarrativeWithLiftAccent(
                            stripMarkdownForDisplay(blueprintDerived.projectedLiftNarrative.trim())
                          )
                        : blueprintDerived.projectedLift?.trim()
                          ? renderNarrativeWithLiftAccent(
                              `Resolving ranked diagnostic findings is projected to improve conversion rate by ${stripMarkdownForDisplay(blueprintDerived.projectedLift.trim())} based on category benchmarks.`
                            )
                          : null}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

      </div>
    </div>
  );
}

export type GrowthBlueprintLockedFinding = {
  title: string;
  severity: "critical" | "high";
};

function GrowthBlueprintLockedFindingRow({ item }: { item: GrowthBlueprintLockedFinding }) {
  const borderLeft = item.severity === "critical" ? "#FF2D2D" : "#FFB300";
  const badgeLabel = item.severity === "critical" ? "CRITICAL" : "HIGH";
  const badgeSolid =
    item.severity === "critical"
      ? { background: "#FF2D2D", color: "#FFFFFF", border: "1px solid #FF2D2D" }
      : {
          background: "rgba(255,179,0,0.12)",
          color: "#FFB300",
          border: "1px solid rgba(255,179,0,0.45)",
        };

  return (
    <div
      style={{
        background: "#080D18",
        border: "1px solid #1A2035",
        borderLeft: `2px solid ${borderLeft}`,
        padding: "12px 14px",
        borderRadius: 0,
        marginBottom: 8,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: REPORT_MONO,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.1em",
            padding: "3px 8px",
            textTransform: "uppercase",
            borderRadius: 0,
            ...badgeSolid,
          }}
        >
          {badgeLabel}
        </span>
        <span
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 600,
            fontSize: 13,
            lineHeight: 1.35,
            color: "#FFFFFF",
            flex: "1 1 140px",
            minWidth: 0,
          }}
        >
          {stripMarkdownForDisplay(item.title)}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
        }}
      >
        <LockIconSmall size={16} />
        <span style={{ fontFamily: REPORT_MONO, fontSize: 11, color: "#8899AA" }}>
          Pro access required
        </span>
      </div>
    </div>
  );
}

function padGrowthBlueprintItems(
  items: GrowthBlueprintLockedFinding[],
): GrowthBlueprintLockedFinding[] {
  const out = [...items];
  let i = 0;
  while (out.length < 6) {
    const t = UPSELL_FALLBACK_LOCKED_TITLES[i % UPSELL_FALLBACK_LOCKED_TITLES.length]!;
    out.push({ title: t, severity: i % 2 === 0 ? "critical" : "high" });
    i++;
  }
  return out.slice(0, 6);
}

export function GrowthBlueprintFreeTier({
  lockedFindings,
  showUpgradeNudge = false,
}: {
  lockedFindings?: GrowthBlueprintLockedFinding[];
  showUpgradeNudge?: boolean;
}) {
  const sm = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
  const headerWeek1 = (
    <div
      style={{
        fontFamily: sm,
        fontSize: 9,
        letterSpacing: "0.14em",
        color: "#00E676",
        fontWeight: 700,
        borderTop: "2px solid #00E676",
        paddingTop: 12,
        marginBottom: 12,
      }}
    >
      WEEK 1
    </div>
  );
  const headerW24 = (
    <div
      style={{
        fontFamily: sm,
        fontSize: 9,
        letterSpacing: "0.14em",
        color: "#6F9BC6",
        fontWeight: 700,
        borderTop: "2px solid #6F9BC6",
        paddingTop: 12,
        marginBottom: 12,
      }}
    >
      WEEKS 2–4
    </div>
  );
  const headerM2 = (
    <div
      style={{
        fontFamily: sm,
        fontSize: 9,
        letterSpacing: "0.14em",
        color: "rgba(255,255,255,0.4)",
        fontWeight: 700,
        borderTop: "1px solid rgba(255,255,255,0.1)",
        paddingTop: 12,
        marginBottom: 12,
      }}
    >
      MONTH 2+
    </div>
  );
  const bar = (w: string) => (
    <div
      style={{
        height: 4,
        borderRadius: 0,
        background: "rgba(255,255,255,0.06)",
        width: w,
        marginBottom: 12,
      }}
    >
      <div style={{ width: "42%", height: "100%", borderRadius: 0, background: "rgba(0,196,140,0.3)" }} />
    </div>
  );

  const padded = padGrowthBlueprintItems(lockedFindings ?? []);
  const col1 = padded.slice(0, 3);
  const col2 = padded.slice(3, 5);
  const col3 = padded.slice(5, 6);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 320 }}>
          {headerWeek1}
          {bar("100%")}
          {col1.map((item, idx) => (
            <GrowthBlueprintLockedFindingRow key={`w1-${idx}-${item.title.slice(0, 24)}`} item={item} />
          ))}
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 320 }}>
          {headerW24}
          {bar("100%")}
          {col2.map((item, idx) => (
            <GrowthBlueprintLockedFindingRow key={`w24-${idx}-${item.title.slice(0, 24)}`} item={item} />
          ))}
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 320 }}>
          {headerM2}
          {bar("100%")}
          {col3.map((item, idx) => (
            <GrowthBlueprintLockedFindingRow key={`m2-${idx}-${item.title.slice(0, 24)}`} item={item} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20, position: "relative", width: "100%" }}>
        <div
          style={{
            border: "1px solid #00E676",
            background: "#0A0F1E",
            padding: "16px 20px 16px 17px",
            borderLeft: "3px solid #00E676",
            filter: "blur(6px)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            style={{
              fontFamily: REPORT_MONO,
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "#00E676",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            PROJECTED CONVERSION LIFT
          </div>
          <p style={{ fontFamily: INTER_STACK, fontSize: 17, color: "#FFFFFF", margin: 0, lineHeight: 1.55 }}>
            Phased remediation across ranked findings is projected to lift conversion once revenue blockers are
            cleared.
          </p>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontFamily: REPORT_MONO, fontSize: 12, color: "#8899AA", lineHeight: 1.55 }}>
            Projected conversion lift requires Pro diagnostic access.
          </p>
        </div>
      </div>
      {showUpgradeNudge ? (
        <p style={{ margin: "16px 0 0 0", fontFamily: REPORT_MONO, fontSize: 11, color: "#8899AA" }}>
          Full resolution roadmap unlocks with Pro diagnostic access.{" "}
          <a href="/app/billing" style={{ color: "#6F9BC6", textDecoration: "none" }}>→ Upgrade</a>
        </p>
      ) : null}
    </div>
  );
}

function BlueprintColumn({
  variant,
  items,
  paragraph,
}: {
  variant: "week1" | "week24" | "month2";
  items?: string[];
  paragraph?: string;
}) {
  const sm =
    "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
  const sg = "var(--font-space-grotesk), sans-serif";
  const list = items?.filter((s) => s.trim()) ?? [];
  const bulletColor = "#6F9BC6";

  const header =
    variant === "week1" ? (
      <div
        style={{
          fontFamily: sm,
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "#00E676",
          fontWeight: 700,
          borderTop: "2px solid #00E676",
          paddingTop: 12,
          marginBottom: 12,
        }}
      >
        WEEK 1
      </div>
    ) : variant === "week24" ? (
      <div
        style={{
          fontFamily: sm,
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "#6F9BC6",
          fontWeight: 700,
          borderTop: "2px solid #6F9BC6",
          paddingTop: 12,
          marginBottom: 12,
        }}
      >
        WEEKS 2–4
      </div>
    ) : (
      <div
        style={{
          fontFamily: sm,
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.4)",
          fontWeight: 700,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 12,
          marginBottom: 12,
        }}
      >
        MONTH 2+
      </div>
    );

  const body =
    variant !== "month2" && list.length > 0 ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: sg,
                fontSize: 14,
                lineHeight: 1.6,
                color: bulletColor,
                flexShrink: 0,
              }}
              aria-hidden
            >
              →
            </span>
            <span
              style={{
                fontFamily: sg,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(240,244,255,0.9)",
              }}
            >
              {stripMarkdownForDisplay(line)}
            </span>
          </div>
        ))}
      </div>
    ) : variant === "month2" && paragraph?.trim() ? (
      <p
        style={{
          fontFamily: sg,
          fontSize: 14,
          lineHeight: 1.7,
          color: "rgba(240,244,255,0.65)",
          margin: 0,
        }}
      >
        {stripMarkdownForDisplay(paragraph.trim())}
      </p>
    ) : (
      <p
        style={{
          fontFamily: sg,
          fontSize: 14,
          color: "rgba(240,244,255,0.35)",
          margin: 0,
        }}
      >
        —
      </p>
    );

  return (
    <div
      style={{
        flex: "1 1 200px",
        minWidth: 0,
        maxWidth: 320,
      }}
    >
      {header}
      {body}
    </div>
  );
}

function FindingsPaywallLockBar({ lockedCount }: { lockedCount: number }) {
  return (
    <div
      role="region"
      aria-label="Locked conversion killers"
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 30,
        width: "100%",
        maxWidth: "100%",
        marginTop: 24,
        marginLeft: "auto",
        marginRight: "auto",
        background: "rgba(5,8,16,0.95)",
        border: "1px solid rgba(0,196,140,0.3)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
        borderRadius: 0,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 18,
      }}
    >
      <div
        style={{
          flex: "1 1 220px",
          textAlign: "center",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--text-primary)",
            marginBottom: 4,
            letterSpacing: "-0.01em",
          }}
        >
          {lockedCount} more conversion killers locked
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            lineHeight: 1.45,
          }}
        >
          Pro includes the full finding set, hero rewrite, growth strategy, and AI advisor.
        </div>
      </div>
      <div className="flex shrink-0 justify-center">
        <UpgradeButton label="UPGRADE TO FULL REPORT — $39/MO →" />
      </div>
    </div>
  );
}

function SectionLabelRow({
  label,
  marginBottom,
  subtitle,
}: {
  label: string;
  marginBottom: number;
  subtitle?: string;
}) {
  const mono =
    "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
  return (
    <div style={{ marginBottom }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: 14,
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 1,
            background: "rgba(255,255,255,0.08)",
            transform: "translateY(-50%)",
          }}
        />
        <span
          style={{
            position: "relative",
            display: "inline-block",
            maxWidth: "92%",
            background: "rgba(5,8,16,0.92)",
            paddingRight: 14,
            fontFamily: mono,
            fontSize: 10,
            fontWeight: 400,
            color: "#00C48C",
            letterSpacing: "0.2em",
            lineHeight: 1.4,
          }}
        >
          {label}
        </span>
      </div>
      {subtitle ? (
        <p
          style={{
            fontFamily: mono,
            fontSize: 9,
            color: "rgba(240,244,255,0.35)",
            margin: "8px 0 0 0",
            letterSpacing: "0.06em",
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function HeaderButton({
  variant = "export",
  label,
  onClick,
  disabled,
  title,
}: {
  variant?: "share" | "export" | "rescan";
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const base: CSSProperties = {
    fontFamily:
      "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: "0.08em",
    borderRadius: 0,
    padding: "6px 16px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
  };

  const shareIdle: CSSProperties = {
    ...base,
    background: "rgba(0,196,140,0.06)",
    border: "1px solid rgba(0,196,140,0.3)",
    color: disabled ? "rgba(240,244,255,0.25)" : "#00C48C",
  };

  const exportIdle: CSSProperties = {
    ...base,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    color: disabled ? "rgba(240,244,255,0.25)" : "rgba(255,255,255,0.5)",
  };

  const rescanIdle: CSSProperties = {
    ...base,
    background: "transparent",
    border: "1px solid #00C48C",
    color: "#00C48C",
  };

  const idleStyle = variant === "share" ? shareIdle : variant === "rescan" ? rescanIdle : exportIdle;

  return (
    <button
      type="button"
      className="report-header-action-btn"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={idleStyle}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === "share") {
          e.currentTarget.style.background = "rgba(0,196,140,0.12)";
          e.currentTarget.style.borderColor = "rgba(0,196,140,0.4)";
        } else if (variant === "rescan") {
          e.currentTarget.style.background = "rgba(0,196,140,0.08)";
        } else {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
          e.currentTarget.style.color = "rgba(255,255,255,0.65)";
        }
      }}
      onMouseLeave={(e) => {
        if (variant === "share") {
          e.currentTarget.style.background = shareIdle.background as string;
          e.currentTarget.style.borderColor = "rgba(0,196,140,0.3)";
          e.currentTarget.style.color = disabled
            ? "rgba(240,244,255,0.25)"
            : "#00C48C";
        } else if (variant === "rescan") {
          e.currentTarget.style.background = "transparent";
        } else {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          e.currentTarget.style.color = disabled
            ? "rgba(240,244,255,0.25)"
            : "rgba(255,255,255,0.5)";
        }
      }}
    >
      {label}
    </button>
  );
}

function CardReveal({
  children,
  delayMs,
}: {
  children: React.ReactNode;
  delayMs: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 40 }
      }
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: delayMs / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}
