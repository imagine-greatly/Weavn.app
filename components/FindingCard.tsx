"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  RevenueEffortLabel,
  RubricModeLabel,
  RubricSeverityLabel,
} from "@/lib/reportSchema";
import { stripMarkdownForDisplay } from "@/lib/stripMarkdownForDisplay";

/**
 * Single finding card — severity-based left border, crack effect, AI fix box.
 * DESIGN_SYSTEM.md: glow, typography, electric principle.
 */

export type FindingSeverity = "critical" | "warning" | "passing";

export type FindingData = {
  id: string;
  categoryId: string;
  categoryName: string;
  severity: FindingSeverity;
  /** Blueprint gap vs on-page flaw; omit = treated as existing */
  type?: "existing" | "missing";
  page_location?: string;
  title: string;
  whatWeFound: string;
  whyItMatters: React.ReactNode;
  howToFixIt: string;
  /** Conversion lift estimate from rubric output; shown below HOW TO FIX when set */
  impactStatement?: string;
  exampleFix: string;
  psychologyPrinciple: string;
  revenueImpact: number;
  effortToFix: "low" | "medium" | "high";
  timeToFix: string;
  /** Original rubric labels when present */
  rubricSeverity?: RubricSeverityLabel;
  rubricMode?: RubricModeLabel;
  /** Business headline (finding title) */
  revenueTitle?: string;
  /** Technical check title — subtitle under revenue headline */
  rubricCheckTitle?: string;
  /** Explicit business cost copy (revenue impact narrative) */
  businessCost?: string;
  revenueEffort?: RevenueEffortLabel;
  /** Conversion killer: visitor exit trigger line (optional on legacy leaks). */
  exitTrigger?: string;
  /** Source page for multi-page scans — shown in severity badge row. */
  sourcePage?: string;
};

export type FindingCardVariant = "default" | "revenue" | "compact" | "killer";

const spaceMono = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";

type FindingCardProps = {
  finding: FindingData;
  variant?: FindingCardVariant;
  /** 1-based index for revenue tier cards ("FINDING 01") */
  findingIndex?: number;
  issueReportId?: string | null;
};

function severityStyles(severity: FindingSeverity) {
  switch (severity) {
    case "critical":
      return {
        borderLeftColor: "var(--red)",
        boxShadow:
          "inset 4px 0 20px rgba(255,45,45,0.12), 0 2px 40px rgba(0,0,0,0.3)",
        hoverShadow:
          "inset 4px 0 28px rgba(255,45,45,0.18), -2px 0 20px rgba(255,45,45,0.3), 0 8px 48px rgba(0,0,0,0.5)",
        pillBg: "rgba(255,45,45,0.08)",
        pillBorder: "rgba(255,45,45,0.2)",
        pillColor: "var(--red)",
      };
    case "warning":
      return {
        borderLeftColor: "var(--orange)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.2)",
        hoverShadow:
          "inset 3px 0 16px rgba(255,149,0,0.08), 0 8px 40px rgba(0,0,0,0.4)",
        pillBg: "rgba(255,149,0,0.08)",
        pillBorder: "rgba(255,149,0,0.2)",
        pillColor: "var(--orange)",
      };
    case "passing":
      return {
        borderLeftColor: "var(--green)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.15)",
        hoverShadow: "0 4px 24px rgba(0,0,0,0.25)",
        pillBg: "rgba(0,255,135,0.08)",
        pillBorder: "rgba(0,255,135,0.2)",
        pillColor: "var(--green)",
      };
  }
}

function parseExampleFixVariations(text: string): string[] {
  const raw = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [""];

  const lines = raw.split("\n");
  const numbered = /^\s*\d+\.\s+/;
  const options: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (numbered.test(line)) {
      if (current.length) options.push(current.join("\n").trim());
      current = [line.replace(numbered, "").trim()];
      continue;
    }
    if (current.length) current.push(line);
  }
  if (current.length) options.push(current.join("\n").trim());

  const cleaned = options.filter((o) => o.trim().length > 0);
  return cleaned.length >= 2 ? cleaned : [raw];
}

function effortLabel(effort: FindingData["effortToFix"]): string {
  if (effort === "low") return "LOW EFFORT";
  if (effort === "high") return "HIGH EFFORT";
  return "MEDIUM EFFORT";
}

function rubricSeverityPillStyle(sev: RubricSeverityLabel): {
  border: string;
  color: string;
} {
  switch (sev) {
    case "Critical":
      return { border: "rgba(255,45,45,0.45)", color: "#FF2D2D" };
    case "High":
      return { border: "rgba(255,107,0,0.4)", color: "#FF6B00" };
    case "Medium":
      return { border: "rgba(255,184,0,0.35)", color: "#FFB800" };
    case "Low":
    default:
      return { border: "rgba(0,200,255,0.35)", color: "rgba(0,200,255,0.55)" };
  }
}

function rubricLeftBorderColor(
  sev: RubricSeverityLabel | undefined,
  fallback: FindingSeverity
): string {
  if (sev === "Critical") return "#FF2D2D";
  if (sev === "High") return "#FF6B00";
  if (sev === "Medium") return "#FFB800";
  if (sev === "Low") return "rgba(0,200,255,0.4)";
  if (fallback === "critical") return "#FF2D2D";
  if (fallback === "warning") return "#FF6B00";
  return "rgba(0,200,255,0.4)";
}

function RubricModeBadge({ mode }: { mode: RubricModeLabel }) {
  const isGap = mode === "GAP";
  const label = isGap ? "GAP IDENTIFIED" : "ACTIVE ISSUE";
  return (
    <div
      className="font-mono flex items-center"
      style={{
        fontWeight: 700,
        fontSize: 8,
        padding: "3px 8px",
        letterSpacing: "0.15em",
        background: "transparent",
        border: isGap
          ? "1px dashed rgba(0,200,255,0.4)"
          : "1px solid rgba(255,149,0,0.35)",
        color: isGap ? "rgba(0,200,255,0.75)" : "rgba(255,149,0,0.85)",
        fontFamily: spaceMono,
      }}
    >
      {label}
    </div>
  );
}

function RubricSeverityBadge({ severity }: { severity: RubricSeverityLabel }) {
  const rs = rubricSeverityPillStyle(severity);
  return (
    <div
      className="font-mono flex items-center"
      style={{
        fontWeight: 700,
        fontSize: 8,
        padding: "3px 8px",
        letterSpacing: "0.15em",
        background: "transparent",
        border: `1px solid ${rs.border}`,
        color: rs.color,
        fontFamily: spaceMono,
      }}
    >
      {severity.toUpperCase()}
    </div>
  );
}

function RubricSeverityAndMode({
  severity,
  mode,
}: {
  severity: RubricSeverityLabel;
  mode?: RubricModeLabel;
}) {
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <RubricSeverityBadge severity={severity} />
      {mode ? <RubricModeBadge mode={mode} /> : null}
    </div>
  );
}

function whyMattersAccent(severity: FindingSeverity): string {
  if (severity === "critical") return "rgba(255,45,45,0.5)";
  if (severity === "warning") return "rgba(255,149,0,0.5)";
  return "var(--color-positive-muted)";
}

function whyMattersBg(severity: FindingSeverity): string {
  if (severity === "critical") return "rgba(255,45,45,0.02)";
  if (severity === "warning") return "rgba(255,149,0,0.02)";
  return "var(--color-positive-dim)";
}

function revenueEffortShort(eff: RevenueEffortLabel | undefined): string | null {
  if (eff === "Today") return "RESOLVE TODAY";
  if (eff === "This Week") return "RESOLVE THIS WEEK";
  if (eff === "This Month") return "RESOLVE THIS MONTH";
  return null;
}

function revenueEffortTagStyle(eff: RevenueEffortLabel | undefined): {
  border: string;
  color: string;
} {
  if (eff === "Today") {
    return { border: "1px solid rgba(0,230,118,0.3)", color: "rgba(0,230,118,0.7)" };
  }
  if (eff === "This Week") {
    return { border: "1px solid rgba(0,200,255,0.25)", color: "rgba(0,200,255,0.6)" };
  }
  if (eff === "This Month") {
    return { border: "1px solid rgba(255,107,0,0.25)", color: "rgba(255,107,0,0.6)" };
  }
  return { border: "1px solid rgba(0,200,255,0.25)", color: "rgba(0,200,255,0.6)" };
}

function QuickWinFindingCard({ finding }: { finding: FindingData }) {
  const rawTitle = finding.revenueTitle?.trim() || finding.title;
  const title = stripMarkdownForDisplay(rawTitle);
  const fix = stripMarkdownForDisplay(String(finding.howToFixIt ?? "").trim());
  const effortResolved: RevenueEffortLabel = finding.revenueEffort ?? "Today";
  const effortLabel = revenueEffortShort(effortResolved) ?? "RESOLVE TODAY";
  const effortCompactStyle = revenueEffortTagStyle(effortResolved);
  return (
    <article
      className="border"
      data-prefetch-id={finding.id}
      style={{
        borderRadius: 0,
        background: "rgba(240,244,255,0.02)",
        border: "1px solid rgba(0,200,255,0.1)",
        borderLeft: "2px solid rgba(0,230,118,0.3)",
        padding: "14px 18px",
        marginBottom: 12,
      }}
    >
      <div className="relative flex flex-wrap items-start justify-end gap-2">
        <span
          className="font-mono absolute right-0 top-0 shrink-0"
          style={{
            fontSize: 8,
            letterSpacing: "0.15em",
            color: effortCompactStyle.color,
            fontFamily: spaceMono,
          }}
        >
          {effortLabel}
        </span>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 48 }}>
          <h3
            className="font-mono font-bold"
            style={{
              fontSize: 12,
              color: "#F0F4FF",
              margin: 0,
              lineHeight: 1.35,
              fontFamily: spaceMono,
            }}
          >
            {title}
          </h3>
          {fix ? (
            <p
              className="font-mono"
              style={{
                fontSize: 10,
                color: "rgba(240,244,255,0.6)",
                margin: "6px 0 0 0",
                lineHeight: 1.6,
                fontFamily: spaceMono,
              }}
            >
              {fix}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function revenueEffortDotAndLabel(eff: RevenueEffortLabel | undefined): {
  dot: string;
  label: string;
} {
  if (eff === "Today") return { dot: "#00E676", label: "TODAY" };
  if (eff === "This Week") return { dot: "#FFB800", label: "THIS WEEK" };
  if (eff === "This Month") return { dot: "#FF6B00", label: "THIS MONTH" };
  return { dot: "rgba(240,244,255,0.35)", label: "—" };
}

function RevenueFindingCard({
  finding,
  findingIndex,
}: {
  finding: FindingData;
  findingIndex?: number;
}) {
  const headline = stripMarkdownForDisplay(
    (finding.revenueTitle?.trim() || finding.title || "").trim()
  );
  const evidence = stripMarkdownForDisplay(String(finding.whatWeFound ?? "").trim());
  const businessCostRaw =
    typeof finding.businessCost === "string" && finding.businessCost.trim()
      ? finding.businessCost
      : typeof finding.whyItMatters === "string"
        ? finding.whyItMatters
        : "";
  const businessCost = stripMarkdownForDisplay(businessCostRaw.trim());
  const fix = stripMarkdownForDisplay(String(finding.howToFixIt ?? "").trim());
  const isCritical =
    finding.rubricSeverity === "Critical" || finding.severity === "critical";
  const effortUi = revenueEffortDotAndLabel(finding.revenueEffort);
  const findingLabel =
    findingIndex != null
      ? `FINDING ${String(findingIndex).padStart(2, "0")}`
      : `FINDING`;

  return (
    <article
      className="finding-card-mobile relative"
      data-prefetch-id={finding.id}
      style={{
        borderRadius: 2,
        background: "rgba(240,244,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: isCritical ? "3px solid #FF2D2D" : "1px solid rgba(255,255,255,0.06)",
        marginBottom: 16,
        padding: "18px 20px 20px",
        paddingTop: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: spaceMono,
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "rgba(240,244,255,0.65)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: effortUi.dot,
            flexShrink: 0,
          }}
          aria-hidden
        />
        {effortUi.label}
      </div>

      <div style={{ paddingRight: 100 }}>
        <div
          style={{
            fontFamily: spaceMono,
            fontSize: 10,
            color: "#00C8FF",
            letterSpacing: "0.15em",
            marginBottom: 8,
          }}
        >
          {findingLabel}
        </div>
        <h3
          style={{
            fontFamily: "var(--font-orbitron), sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: "#FFFFFF",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {headline}
        </h3>
      </div>

      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.08)",
          margin: "14px 0 16px",
        }}
      />

      {evidence ? (
        <div
          style={{
            borderLeft: "2px solid #00C8FF",
            background: "rgba(0,200,255,0.04)",
            padding: "12px 14px",
            marginBottom: 14,
            borderRadius: 2,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: 13,
              fontStyle: "italic",
              color: "rgba(240,244,255,0.88)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {evidence}
          </p>
        </div>
      ) : null}

      {businessCost ? (
        <p
          style={{
            fontFamily: spaceMono,
            fontSize: 11,
            color: "#FF6B00",
            lineHeight: 1.55,
            margin: "0 0 14px 0",
          }}
        >
          $ IMPACT — {businessCost}
        </p>
      ) : null}

      <div
        style={{
          background: "rgba(0,230,118,0.06)",
          borderLeft: "2px solid #00E676",
          padding: "12px 14px",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            fontFamily: spaceMono,
            fontSize: 9,
            color: "#00E676",
            letterSpacing: "0.12em",
            marginBottom: 8,
          }}
        >
          IMPLEMENTATION
        </div>
        <p
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: 13,
            color: "#FFFFFF",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {fix || "—"}
        </p>
      </div>
    </article>
  );
}

function killerSeverityUi(finding: FindingData): {
  label: string;
  color: string;
  pillBorder: string;
  borderLeft: string;
} {
  const rs = finding.rubricSeverity;
  if (rs === "Critical" || finding.severity === "critical") {
    return {
      label: "CRITICAL",
      color: "#FF4444",
      pillBorder: "rgba(255,68,68,0.45)",
      borderLeft: "3px solid #FF4444",
    };
  }
  if (rs === "High" || finding.severity === "warning") {
    return {
      label: "HIGH IMPACT",
      color: "#FF8C00",
      pillBorder: "rgba(255,140,0,0.45)",
      borderLeft: "3px solid #FF8C00",
    };
  }
  return {
    label: "MEDIUM",
    color: "#FFD700",
    pillBorder: "rgba(255,215,0,0.45)",
    borderLeft: "3px solid #FFD700",
  };
}

const spaceGrotesk = "var(--font-space-grotesk), sans-serif";

/** Conversion killers section — exit framing per design system. */
export function ConversionKillerCard({
  finding,
  killerIndex,
  issueReportId,
}: {
  finding: FindingData;
  killerIndex: number;
  issueReportId?: string | null;
}) {
  const title = stripMarkdownForDisplay(
    (finding.revenueTitle?.trim() || finding.title || "").trim()
  );
  const exitText = stripMarkdownForDisplay(
    String(finding.exitTrigger ?? finding.whyItMatters ?? "").trim()
  );
  const evidence = stripMarkdownForDisplay(String(finding.whatWeFound ?? "").trim());
  const costText = stripMarkdownForDisplay(
    String(finding.businessCost ?? "").trim()
  );
  const impl = stripMarkdownForDisplay(
    String(finding.howToFixIt ?? finding.exampleFix ?? "").trim()
  );
  const sev = killerSeverityUi(finding);
  const effortUi = revenueEffortDotAndLabel(finding.revenueEffort);
  const killerLabel = `${String(killerIndex).padStart(2, "0")} —`;
  const categoryTag = (finding.categoryName ?? finding.categoryId ?? "").trim() || "—";
  const issueHref =
    issueReportId && finding.id
      ? `/issue/${issueReportId}/${encodeURIComponent(finding.id)}`
      : null;

  return (
    <article
      className="relative"
      data-prefetch-id={finding.id}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: sev.borderLeft,
        borderRadius: 3,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
          <span
            style={{
              fontFamily: spaceMono,
              fontSize: 10,
              color: "rgba(240,244,255,0.35)",
              letterSpacing: "0.12em",
            }}
          >
            {killerLabel}
          </span>
        </div>
        <span
          className="font-mono flex items-center"
          style={{
            fontWeight: 700,
            fontSize: 8,
            padding: "3px 8px",
            letterSpacing: "0.15em",
            background: "transparent",
            border: `1px solid ${sev.pillBorder}`,
            color: sev.color,
            fontFamily: spaceMono,
          }}
        >
          {sev.label}
        </span>
      </div>

      <div className="group flex items-start justify-between gap-3" style={{ padding: "16px 20px 0 20px" }}>
        {issueHref ? (
          <Link href={issueHref} style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0, cursor: "pointer" }}>
            <h3
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--text-primary)",
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {title}
            </h3>
          </Link>
        ) : (
          <h3
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              margin: 0,
              flex: 1,
              minWidth: 0,
            }}
          >
            {title}
          </h3>
        )}
        {issueHref ? (
          <span
            className="font-mono shrink-0 opacity-20 transition-opacity duration-150 group-hover:opacity-95"
            style={{ fontSize: 14, color: "#00C8FF", lineHeight: "24px" }}
            aria-hidden
          >
            →
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "14px 20px 16px 20px",
        }}
      >
        {exitText ? (
          <div>
            <span
              style={{
                fontFamily: spaceMono,
                fontSize: 9,
              color: "#00C8FF",
                letterSpacing: "0.15em",
              textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              IMPACT
            </span>
            <p
              style={{
                fontFamily: spaceGrotesk,
                fontSize: 14,
                color: "rgba(240,244,255,0.85)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {exitText}
            </p>
          </div>
        ) : null}
        {evidence ? (
          <div
            style={{
              borderLeft: "3px solid #00C8FF",
              background: "rgba(0,200,255,0.04)",
              padding: "10px 14px",
              borderRadius: "0 3px 3px 0",
            }}
          >
            <span
              style={{
                fontFamily: spaceMono,
                fontSize: 9,
                color: "rgba(0,200,255,0.7)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              EVIDENCE
            </span>
            <p
              style={{
                fontFamily: spaceGrotesk,
                fontSize: 13,
                fontStyle: "italic",
                color: "rgba(240,244,255,0.6)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {evidence}
            </p>
          </div>
        ) : null}
        {costText ? (
          <div>
            <span
              style={{
                fontFamily: spaceMono,
                fontSize: 9,
                color: "#00C8FF",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              WHY IT MATTERS
            </span>
            <p
              style={{
                fontFamily: spaceGrotesk,
                fontSize: 14,
                color: "rgba(240,244,255,0.75)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {costText}
            </p>
          </div>
        ) : null}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: 12,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontFamily: spaceMono,
              fontSize: 9,
              color: "#00C8FF",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 8,
            }}
          >
            HOW TO FIX IT
          </span>
          <p
            style={{
              fontFamily: spaceGrotesk,
              fontSize: 14,
              color: "rgba(240,244,255,0.9)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {impl || "—"}
          </p>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: spaceMono,
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: effortUi.dot,
              flexShrink: 0,
            }}
            aria-hidden
          />
          {effortUi.label}
        </div>
        <span
          style={{
            fontFamily: spaceMono,
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.08em",
          }}
        >
          {categoryTag}
        </span>
      </div>
    </article>
  );
}

export default function FindingCard({
  finding,
  variant = "default",
  findingIndex,
  issueReportId,
}: FindingCardProps) {
  if (variant === "compact") {
    return <QuickWinFindingCard finding={finding} />;
  }
  if (variant === "revenue") {
    return <RevenueFindingCard finding={finding} findingIndex={findingIndex} />;
  }
  if (variant === "killer") {
    return (
      <ConversionKillerCard
        finding={finding}
        killerIndex={findingIndex ?? 1}
        issueReportId={issueReportId}
      />
    );
  }
  const styles = severityStyles(finding.severity);
  const isMissing =
    finding.type === "missing" ||
    (finding.id ?? "").trim().toUpperCase().startsWith("MSN-");

  const fixOptions = parseExampleFixVariations(finding.exampleFix);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [copiedOptionIndex, setCopiedOptionIndex] = useState<number | null>(null);

  const copyFix = (value: string, index: number) => {
    void navigator.clipboard.writeText(value);
    setSelectedOptionIndex(index);
    setCopiedOptionIndex(index);
    setTimeout(() => setCopiedOptionIndex(null), 2000);
  };

  const principleRaw = finding.psychologyPrinciple ?? "";
  const parenIdx = principleRaw.indexOf("(");
  const principleName =
    parenIdx >= 0 ? principleRaw.slice(0, parenIdx).trim() : principleRaw;
  const principleCitation =
    parenIdx >= 0 ? principleRaw.slice(parenIdx).trim() : null;

  return (
    <article
      className="finding-card-mobile relative overflow-hidden border transition-[border-color] duration-150"
      data-prefetch-id={finding.id}
      style={{
        borderRadius: 10,
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        ...(isMissing
          ? {
              borderLeftWidth: 2,
              borderLeftStyle: "dashed",
              borderLeftColor: styles.borderLeftColor,
            }
          : {
              borderLeftWidth: 4,
              borderLeftStyle: "solid",
              borderLeftColor: styles.borderLeftColor,
            }),
        marginBottom: 16,
        boxShadow: styles.boxShadow,
        transition:
          "box-shadow 300ms ease, transform 300ms ease, border-color 300ms ease",
        transform: "translateY(0)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transitionDuration = "150ms";
        e.currentTarget.style.boxShadow = styles.hoverShadow;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transitionDuration = "300ms";
        e.currentTarget.style.boxShadow = styles.boxShadow;
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.transform = "translateY(0)";
        if (isMissing) {
          e.currentTarget.style.borderLeftWidth = "2px";
          e.currentTarget.style.borderLeftStyle = "dashed";
          e.currentTarget.style.borderLeftColor = styles.borderLeftColor;
        }
      }}
    >
      {/* CRITICAL only: diagonal hatch top-right + corner bracket top-left */}
      {finding.severity === "critical" && (
        <>
          <div
            className="pointer-events-none absolute right-0 top-0 h-[120px] w-[140px] rounded-bl-[8px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,45,45,0.06) 0px, rgba(255,45,45,0.06) 1px, transparent 1px, transparent 8px)",
              backgroundSize: "8px 8px",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-0 top-0 h-[12px] w-[12px]"
            style={{ top: -1, left: -1 }}
            aria-hidden
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 12,
                height: 1,
                background: "rgba(255,45,45,0.4)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 1,
                height: 12,
                background: "rgba(255,45,45,0.4)",
              }}
            />
          </div>
        </>
      )}

      {/* Zone 1 — Header bar */}
      <div
        className="flex flex-row items-center justify-between"
        style={{
          width: "100%",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-default)",
          padding: "14px 22px",
        }}
      >
        <div className="flex flex-row items-center gap-2.5">
          <span
            className="font-mono"
            style={{
              fontWeight: 700,
              fontSize: 11,
              background: "var(--bg-base)",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              padding: "4px 10px",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
            }}
          >
            {finding.id}
          </span>
          {isMissing ? (
            <div
              className="flex flex-row items-center gap-1"
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontWeight: 700,
                fontSize: 10,
                borderRadius: 4,
                padding: "4px 10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "transparent",
                border: `1px dashed ${styles.pillColor}`,
                color: styles.pillColor,
              }}
            >
              <span>MISSING</span>
              <span style={{ opacity: 0.75, fontWeight: 600 }}>
                · {finding.severity.toUpperCase()}
              </span>
            </div>
          ) : finding.rubricSeverity ? (
            <RubricSeverityAndMode
              severity={finding.rubricSeverity}
              mode={finding.rubricMode}
            />
          ) : (
            <div
              className="font-mono flex items-stretch"
              style={{
                fontWeight: 700,
                fontSize: 10,
                borderRadius: 4,
                padding: "4px 10px",
                letterSpacing: "0.1em",
                background: styles.pillBg,
                border: `1px solid ${styles.pillBorder}`,
                color: styles.pillColor,
              }}
            >
              {finding.severity === "critical" && (
                <div
                  style={{
                    width: 2,
                    alignSelf: "stretch",
                    minHeight: 14,
                    background: "var(--red)",
                    borderRadius: 1,
                    marginRight: 6,
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
              )}
              <span className="flex items-center">
                {finding.severity.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-row items-center gap-2">
          <div className="flex flex-row items-center">
            <span
              className="font-mono shrink-0"
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                marginRight: 6,
              }}
            >
              IMPACT
            </span>
            <div className="flex flex-row" style={{ gap: 3 }}>
              {Array.from({ length: 10 }, (_, i) => {
                const filled = Math.max(
                  0,
                  Math.min(10, Math.round(finding.revenueImpact))
                );
                const isFilled = i < filled;
                return (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: isFilled
                        ? "var(--cyan)"
                        : "var(--border-default)",
                    }}
                    aria-hidden
                  />
                );
              })}
            </div>
          </div>
          <span
            className="font-mono shrink-0"
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              background: "transparent",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              padding: "4px 10px",
              letterSpacing: "0.06em",
            }}
          >
            {finding.categoryName}
          </span>
        </div>
      </div>

      {/* Zone 2 — Title */}
      <div style={{ padding: "20px 22px 0 22px" }}>
        <h3
          className="font-body font-bold leading-[1.3]"
          style={{
            fontSize: 18,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {finding.title}
        </h3>
        <div
          className="flex flex-row items-center gap-2"
          style={{ marginTop: 12, marginBottom: 0 }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              padding: "4px 10px",
              color: "var(--text-muted)",
            }}
          >
            {effortLabel(finding.effortToFix)}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 14 }}>·</span>
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              padding: "4px 10px",
              color: "var(--text-muted)",
            }}
          >
            {finding.timeToFix}
          </span>
        </div>
        {isMissing && finding.page_location ? (
          <div style={{ marginTop: 10 }}>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
              }}
            >
              {finding.page_location}
            </span>
          </div>
        ) : null}
      </div>

      {/* Zone 3 — Diagnostic content */}
      <div
        style={{
          margin: "16px 22px",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--border-default)",
        }}
      >
        {/* Evidence */}
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <div
            className="flex flex-row items-center gap-2"
            style={{ marginBottom: 10 }}
          >
            <div
              style={{
                width: 2,
                height: 14,
                background: "rgba(0,200,255,0.6)",
                borderRadius: 1,
                flexShrink: 0,
              }}
              aria-hidden
            />
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              EVIDENCE
            </span>
          </div>
          <p
            className="font-body text-left font-normal"
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {isMissing ? (
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#00C8FF",
                  letterSpacing: "0.08em",
                  marginRight: 8,
                  verticalAlign: "middle",
                }}
              >
                ＋ ADD
              </span>
            ) : null}
            <span
              className="font-body font-light"
              style={{
                fontSize: 32,
                color: "rgba(0,200,255,0.3)",
                lineHeight: 0,
                display: "inline",
                marginRight: 4,
                verticalAlign: "-8px",
              }}
              aria-hidden
            >
              &quot;
            </span>
            {stripMarkdownForDisplay(String(finding.whatWeFound ?? ""))}
          </p>
        </div>

        {/* WHY IT MATTERS */}
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--border-default)",
            background: whyMattersBg(finding.severity),
          }}
        >
          <div
            className="flex flex-row items-center gap-2"
            style={{ marginBottom: 10 }}
          >
            <div
              style={{
                width: 2,
                height: 14,
                background: whyMattersAccent(finding.severity),
                borderRadius: 1,
                flexShrink: 0,
              }}
              aria-hidden
            />
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              WHY IT MATTERS
            </span>
          </div>
          <div
            className="font-body text-left font-normal"
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
            }}
          >
            {finding.whyItMatters}
          </div>
        </div>

        {/* IMPLEMENTATION */}
        <div style={{ padding: "16px 18px" }}>
          <div
            className="flex flex-row items-center gap-2"
            style={{ marginBottom: 10 }}
          >
            <div
              style={{
                width: 2,
                height: 14,
                background: "var(--color-positive-muted)",
                borderRadius: 1,
                flexShrink: 0,
              }}
              aria-hidden
            />
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              HOW TO FIX IT
            </span>
          </div>
          <div
            style={{
              background: "var(--color-positive-dim)",
              borderRadius: 6,
              padding: "12px 14px",
              border: "1px solid var(--color-positive-border)",
            }}
          >
            <p
              className="font-body text-left font-normal"
              style={{
                fontSize: 15,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 13,
                  color: "var(--cyan)",
                  display: "inline",
                }}
              >
                →{" "}
              </span>
              {finding.howToFixIt}
            </p>
          </div>
          {finding.impactStatement?.trim() ? (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid rgba(0,200,255,0.1)",
              }}
            >
              <div
                className="flex flex-row items-center gap-2"
                style={{ marginBottom: 8 }}
              >
                <div
                  style={{
                    width: 2,
                    height: 14,
                    background: "rgba(0,200,255,0.45)",
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  ESTIMATED IMPACT
                </span>
              </div>
              <p
                className="font-body text-left font-normal"
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {finding.impactStatement.trim()}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Zone 4 — Conversion mechanism */}
      <div
        className="flex flex-row items-center gap-3"
        style={{
          margin: "0 22px 16px 22px",
          background: "rgba(0,200,255,0.04)",
          border: "1px solid rgba(0,200,255,0.12)",
          borderRadius: 8,
          padding: "12px 16px",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            background: "rgba(0,200,255,0.35)",
            border: "1px solid rgba(0,200,255,0.45)",
            flexShrink: 0,
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div
            className="font-mono"
            style={{
              fontWeight: 700,
              fontSize: 12,
              color: "var(--cyan)",
              letterSpacing: "0.06em",
            }}
          >
            {principleName}
          </div>
          {principleCitation ? (
            <div
              className="font-mono"
              style={{
                fontWeight: 400,
                fontSize: 10,
                color: "var(--text-muted)",
                display: "block",
                marginTop: 2,
              }}
            >
              {principleCitation}
            </div>
          ) : null}
        </div>
        <span
          className="font-mono shrink-0"
          style={{
            fontSize: 9,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            opacity: 0.6,
          }}
        >
          CONVERSION MECHANISM
        </span>
      </div>

      {/* Zone 5 — Implementation options */}
      <div
        style={{
          margin: "0 22px 22px 22px",
          background: "var(--bg-base)",
          border: "1px solid rgba(0,200,255,0.15)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          className="flex flex-row items-center justify-between"
          style={{
            background: "rgba(0,200,255,0.06)",
            borderBottom: "1px solid rgba(0,200,255,0.12)",
            padding: "10px 16px",
          }}
        >
          <div className="flex flex-row items-center gap-2">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--cyan)",
                boxShadow: "0 0 6px rgba(0,200,255,0.6)",
                flexShrink: 0,
              }}
              aria-hidden
            />
            <span
              className="font-mono"
              style={{
                fontWeight: 700,
                fontSize: 10,
                color: "var(--cyan)",
                letterSpacing: "0.1em",
              }}
            >
              IMPLEMENTATION OPTIONS
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {fixOptions.length > 1
              ? `${fixOptions.length} FRAMEWORKS`
              : "APPLY TO YOUR BRAND"}
          </span>
        </div>

        <div style={{ padding: 12 }}>
          {fixOptions.map((opt, i) => {
            const isSelected = selectedOptionIndex === i;
            const isCopied = copiedOptionIndex === i;
            return (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOptionIndex(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedOptionIndex(i);
                }}
                style={{
                  background: isSelected
                    ? "rgba(0,200,255,0.03)"
                    : "var(--bg-elevated)",
                  border: `1px solid ${
                    isSelected
                      ? "rgba(0,200,255,0.4)"
                      : "var(--border-default)"
                  }`,
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: i < fixOptions.length - 1 ? 8 : 0,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 14,
                  cursor: "pointer",
                  transition: "border-color 150ms ease, background-color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isSelected
                    ? "rgba(0,200,255,0.4)"
                    : "var(--border-default)";
                }}
              >
                <div className="min-w-0 flex-1">
                  {fixOptions.length > 1 ? (
                    <span
                      className="font-mono block"
                      style={{
                        fontSize: 9,
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      FRAMEWORK {i + 1}
                    </span>
                  ) : null}
                  <div
                    className="font-body font-normal italic"
                    style={{
                      fontSize: 14,
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {opt}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyFix(opt, i);
                  }}
                  className="font-mono shrink-0"
                  style={{
                    fontWeight: 700,
                    fontSize: 10,
                    border: `1px solid ${
                      isCopied
                        ? "rgba(0,200,255,0.35)"
                        : "var(--border-default)"
                    }`,
                    borderRadius: 4,
                    padding: "6px 12px",
                    color: isCopied ? "rgba(0,200,255,0.9)" : "var(--text-muted)",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "color 300ms ease, border-color 300ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transitionDuration = "150ms";
                    if (!isCopied) {
                      e.currentTarget.style.color = "var(--cyan)";
                      e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transitionDuration = "300ms";
                    if (isCopied) {
                      e.currentTarget.style.color = "rgba(0,200,255,0.9)";
                      e.currentTarget.style.borderColor = "rgba(0,200,255,0.35)";
                    } else {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.borderColor = "var(--border-default)";
                    }
                  }}
                >
                  {isCopied ? "COPIED" : "COPY"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
