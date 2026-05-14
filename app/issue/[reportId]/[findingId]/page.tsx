"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { ReportPayload, Leak } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";
import type { FindingBriefExpansion } from "@/lib/prompts";
import { parseFindingBriefFromStoredValue } from "@/lib/expandFindingBrief";

type ReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
  extended_analysis?: unknown;
  finding_briefs?: unknown;
};

type ChatMessage = { role: "user" | "assistant"; content: string };
const STORAGE_KEY_PREFIX = "webdoc_report_";
const STORAGE_META_KEY_PREFIX = "webdoc_report_meta_";

const FALLBACK_ADVISOR_CHIPS = [
  "What is the fastest resolution?",
  "How does this affect my revenue?",
  "Which finding should I resolve first?",
] as const;

function advisorChipsFromExpansion(
  expansion: FindingBriefExpansion | null | undefined
): string[] {
  const fb = [...FALLBACK_ADVISOR_CHIPS];
  const raw = expansion?.advisorChips;
  if (!Array.isArray(raw) || raw.length === 0) return fb;
  const cleaned = raw
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean);
  if (cleaned.length === 0) return fb;
  const out = cleaned.slice(0, 3);
  let i = 0;
  while (out.length < 3 && i < fb.length) {
    const next = fb[i++];
    if (!out.includes(next)) out.push(next);
  }
  while (out.length < 3) out.push(fb[out.length % fb.length]);
  return out;
}

const BRIEF_GEN_STATUS_MESSAGES = [
  "RETRIEVING DIAGNOSTIC DATA...",
  "ANALYZING SUPPRESSION PATTERNS...",
  "MODELING REVENUE IMPACT...",
  "COMPILING CLINICAL BRIEF...",
] as const;

function BriefClinicalGenerationOverlay({
  finding,
  report,
  router,
  priorityN,
  priorityY,
}: {
  finding: Leak;
  report: ReportRow;
  router: ReturnType<typeof useRouter>;
  priorityN: number;
  priorityY: number;
}) {
  const [statusIdx, setStatusIdx] = useState(0);
  const sevLabel = severityDisplayLabel(finding);
  const isCriticalDisplay =
    finding.severity === "critical" || finding.rubricSeverity === "Critical";
  const sevColor = isCriticalDisplay
    ? "var(--red)"
    : finding.severity === "warning" || sevLabel === "HIGH IMPACT"
      ? "var(--orange)"
      : "var(--green)";
  const sevBg = isCriticalDisplay
    ? "rgba(255,45,45,0.06)"
    : finding.severity === "warning" || sevLabel === "HIGH IMPACT"
      ? "rgba(255,149,0,0.06)"
      : "rgba(0,255,135,0.06)";

  useEffect(() => {
    const id = window.setInterval(() => {
      setStatusIdx((i) => (i + 1) % BRIEF_GEN_STATUS_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "#050810",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "2px",
            color: "var(--text-muted)",
            marginBottom: 36,
          }}
        >
          ← BACK TO DASHBOARD
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 9,
              color: "var(--text-muted)",
              border: "1px solid var(--border-default)",
              borderRadius: 3,
              padding: "2px 8px",
              letterSpacing: "1px",
            }}
          >
            {(finding.category ?? "").trim() || finding.id || "FINDING"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: "1.5px",
              color: sevColor,
              background: sevBg,
              border: `1px solid ${sevColor}40`,
              borderRadius: 3,
              padding: "2px 8px",
            }}
          >
            {sevLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "rgba(0,200,255,0.95)",
              border: "1px solid rgba(0,200,255,0.25)",
              borderRadius: 4,
              padding: "4px 10px",
              background: "rgba(0,200,255,0.06)",
            }}
          >
            {formatFindingOrdinal(priorityN, priorityY)}
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--text-primary)",
            lineHeight: 1.2,
            margin: "0 0 28px 0",
            letterSpacing: "-0.5px",
          }}
        >
          {finding.title}
        </h1>

        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-space-mono), ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "rgba(0,200,255,0.42)",
            textTransform: "uppercase",
          }}
        >
          {BRIEF_GEN_STATUS_MESSAGES[statusIdx]}
        </p>

        <div
          style={{
            marginTop: 20,
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 10,
            color: "var(--text-muted)",
            letterSpacing: "1px",
          }}
        >
          {report.domain}
        </div>
      </div>
    </div>
  );
}

/** Raw scan line with pulse while expanding; fade-in when API returns expanded copy. */
function FindingExpandedText({
  text,
  expandLoading,
  hasExpanded,
  style,
}: {
  text: string;
  expandLoading: boolean;
  hasExpanded: boolean;
  style?: CSSProperties;
}) {
  const pulse = expandLoading && !hasExpanded;
  const className = pulse
    ? "animate-pulse"
    : hasExpanded
      ? "issue-finding-text-reveal"
      : "";
  return (
    <span
      key={hasExpanded ? "expanded" : expandLoading ? "loading" : "raw"}
      className={className}
      style={{ display: "block", whiteSpace: "pre-wrap", ...style }}
    >
      {text}
    </span>
  );
}

function firstParagraphOrigin(text: string | null | undefined): string {
  if (text == null || !String(text).trim()) return "—";
  const t = String(text).trim();
  const blocks = t
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length > 0) return blocks[0];
  return t;
}

function firstSentence(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  const t = text.trim();
  const match = t.match(/^[^.!?]+[.!?]+/);
  if (match) return match[0].trim();
  if (t.length <= 150) return t;
  const truncated = t.slice(0, 150);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 100 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
}

function SectionDivider() {
  return (
    <div
      role="separator"
      aria-hidden
      style={{
        width: "100%",
        height: 1,
        background: "#1A2035",
        marginTop: 48,
        marginBottom: 48,
      }}
    />
  );
}

function scoreColor(score: number): string {
  if (score < 50) return "var(--red)";
  if (score < 70) return "var(--orange)";
  if (score < 85) return "var(--cyan)";
  return "var(--green)";
}

function leakKey(l: Leak): string {
  return String(l.id ?? l.title);
}

/** Merge curated money leaks + legacy `leaks` so issue URLs resolve regardless of which array held the row. */
function leaksForIssueLookup(analysis: ReportPayload | undefined): Leak[] {
  if (!analysis) return [];
  const money = getDashboardMoneyLeaks(analysis);
  const legacy = Array.isArray(analysis.leaks) ? analysis.leaks : [];
  const seen = new Set<string>();
  const out: Leak[] = [];
  for (const l of money) {
    const k = leakKey(l);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  for (const l of legacy) {
    const k = leakKey(l);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out;
}

function slugNorm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+|_+$/g, "");
}

function slugNormHyphen(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/^-+|-+$/g, "");
}

/** Map URL segment (often slug) to a leak; UUID / id / title slug matches supported. */
function findLeakForUrlSegment(leaks: Leak[], rawParam: string): Leak | null {
  const decoded = (() => {
    const t = rawParam.trim();
    if (!t) return "";
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  })().trim();
  if (!decoded) return null;
  const exact = leaks.find((l) => leakKey(l) === decoded);
  if (exact) return exact;
  const ci = leaks.find((l) => leakKey(l).toLowerCase() === decoded.toLowerCase());
  if (ci) return ci;
  const wantSlug = slugNorm(decoded);
  if (wantSlug) {
    const byKeySlug = leaks.find((l) => slugNorm(leakKey(l)) === wantSlug);
    if (byKeySlug) return byKeySlug;
    const byTitleSlug = leaks.find((l) => slugNorm(String(l.title ?? "")) === wantSlug);
    if (byTitleSlug) return byTitleSlug;
  }
  const wantHyphen = slugNormHyphen(decoded);
  if (wantHyphen) {
    const byKeyHyphen = leaks.find(
      (l) => slugNormHyphen(leakKey(l)) === wantHyphen
    );
    if (byKeyHyphen) return byKeyHyphen;
    const byTitleHyphen = leaks.find(
      (l) => slugNormHyphen(String(l.title ?? "")) === wantHyphen
    );
    if (byTitleHyphen) return byTitleHyphen;
  }
  return null;
}

function severityDisplayLabel(l: Leak): string {
  if (l.severity === "critical" || l.rubricSeverity === "Critical") {
    return "CRITICAL";
  }
  if (l.rubricSeverity === "High") return "HIGH IMPACT";
  if (l.rubricSeverity === "Medium") return "MEDIUM";
  if (l.rubricSeverity === "Low") return "LOW";
  if (l.severity === "warning") return "HIGH IMPACT";
  return l.severity === "passing" ? "PASSING" : "FINDING";
}

function revenueSuppressionBand(l: Leak): string {
  if (l.severity === "critical" || l.rubricSeverity === "Critical") return "Critical";
  if (l.rubricSeverity === "High" || l.severity === "warning") return "High";
  if (l.rubricSeverity === "Medium") return "Medium";
  if (l.rubricSeverity === "Low") return "Low";
  return "Medium";
}

function revenueSuppressionLine(l: Leak): string {
  return `Revenue Suppression: ${revenueSuppressionBand(l)}`;
}

function impactSuppressionHeadline(
  brief: FindingBriefExpansion | null,
  finding: Leak,
): string {
  const fromAi = brief?.revenueImpact?.impactRatingDisplay?.trim();
  if (fromAi) return fromAi;
  const band = revenueSuppressionBand(finding);
  if (band === "Critical") return "CRITICAL SUPPRESSION";
  if (band === "High") return "HIGH SUPPRESSION";
  if (band === "Medium") return "MEDIUM SUPPRESSION";
  return "LOW SUPPRESSION";
}

function formatFindingOrdinal(n: number, total: number): string {
  const nn = String(Math.max(1, n)).padStart(2, "0");
  return `Finding ${nn} — ${total} Identified`;
}

function isPlaceholderContent(text: string | null | undefined): boolean {
  const t = String(text ?? "").trim();
  return t.length === 0 || t === "—";
}

function skeletonWidthForKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i) * 13) % 1000;
  const pct = 60 + (h % 21);
  return `${pct}%`;
}

function SectionSkeleton({ widthPct }: { widthPct: string }) {
  return (
    <div
      aria-hidden
      style={{
        height: 16,
        width: widthPct,
        maxWidth: "80%",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 2,
        animation: "issueContentPulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function IssueInitialSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "#050810", padding: "32px 40px" }}>
      <style>{`
        @keyframes issueInitialSkelPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          aria-hidden
          style={{
            background: "#1A2035",
            height: 32,
            width: "60%",
            borderRadius: 4,
            animation: "issueInitialSkelPulse 1.5s ease-in-out infinite",
          }}
        />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden
            style={{
              background: "#0A0F1E",
              height: 120,
              borderRadius: 4,
              border: "1px solid #1A2035",
              animation: "issueInitialSkelPulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function reportFromLocalStorageForFinding(reportId: string, findingId: string): {
  report: ReportRow;
  finding: Leak | null;
  leaks: Leak[];
} | null {
  if (typeof window === "undefined" || !findingId) return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const domain = key.slice(STORAGE_KEY_PREFIX.length).trim();
      if (!domain) continue;
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${domain}`);
      if (!stored) continue;
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      const analysis = (parsed.analysis ?? parsed) as ReportPayload;
      let extendedAnalysis: unknown = parsed.extended_analysis ?? null;
      let findingBriefs: unknown = parsed.finding_briefs ?? null;
      if (!extendedAnalysis || !findingBriefs) {
        try {
          const metaRaw = localStorage.getItem(`${STORAGE_META_KEY_PREFIX}${domain}`);
          if (metaRaw) {
            const meta = JSON.parse(metaRaw) as Record<string, unknown>;
            if (!extendedAnalysis && meta.extended_analysis) extendedAnalysis = meta.extended_analysis;
            if (!findingBriefs && meta.finding_briefs) findingBriefs = meta.finding_briefs;
          }
        } catch { /* ignore */ }
      }
      const row: ReportRow = {
        id: String(parsed.id ?? ""),
        domain,
        created_at: String(parsed.created_at ?? ""),
        analysis,
        extended_analysis: extendedAnalysis,
        finding_briefs: findingBriefs,
      };
      if (row.id !== reportId) continue;
      const leaks = leaksForIssueLookup(row.analysis);
      const found = findLeakForUrlSegment(leaks, findingId);
      if (found) return { report: row, finding: found, leaks };
    }
  } catch {
    return null;
  }
  return null;
}


export default function IssuePage() {
  const router = useRouter();
  const params = useParams();
  const reportId = (() => {
    const r = params.reportId;
    const s = Array.isArray(r) ? r[0] : r;
    return typeof s === "string" ? s.trim() : "";
  })();
  const findingId = (() => {
    const r = params.findingId;
    const s = Array.isArray(r) ? r[0] : r;
    if (typeof s !== "string") return "";
    const t = s.trim();
    if (!t) return "";
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  })();

  const [report, setReport] = useState<ReportRow | null>(null);
  const [finding, setFinding] = useState<Leak | null>(null);
  const [scanLeaks, setScanLeaks] = useState<Leak[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState<FindingBriefExpansion | null>(
    null
  );
  const [expandLoading, setExpandLoading] = useState(false);
  const [advisorChips, setAdvisorChips] = useState<string[]>(() => [
    ...FALLBACK_ADVISOR_CHIPS,
  ]);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [resolvedLocal, setResolvedLocal] = useState(false);
  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;

    (async () => {
      console.log('[FINDING] Starting load, checking localStorage...');
      setLoading(true);
      setBriefExpanded(null);
      setExpandLoading(false);
      setMessages([]);
      setInput("");
      setAdvisorChips([...FALLBACK_ADVISOR_CHIPS]);
      setResolvedLocal(false);

      const cached = reportFromLocalStorageForFinding(reportId, findingId);
      if (cached) {
        console.log('[FINDING] Cache hit:', Object.keys(cached));
        const row = cached.report;
        const found = cached.finding;
        const leaks = cached.leaks;
        setReport(row);
        setScanLeaks(leaks);
        setFinding(found);

        const ext = row.extended_analysis;
        const extKey = found ? leakKey(found) : "";
        const keyVariants = [
          extKey,
          findingId,
          decodeURIComponent(findingId),
          found?.id,
          found?.title,
          String(found?.id ?? ""),
          String(found?.title ?? ""),
        ].filter((k): k is string => typeof k === "string" && k.trim().length > 0);
        const storedEntry =
          ext && typeof ext === "object" && !Array.isArray(ext)
            ? keyVariants.reduce<unknown>(
                (acc, k) => acc ?? (ext as Record<string, unknown>)[k],
                undefined,
              )
            : undefined;
        const fromCachedExtended = parseFindingBriefFromStoredValue(storedEntry);
        if (fromCachedExtended) {
          setBriefExpanded(fromCachedExtended);
          setAdvisorChips(advisorChipsFromExpansion(fromCachedExtended));
          const open =
            typeof fromCachedExtended.advisorOpening === "string"
              ? fromCachedExtended.advisorOpening.trim()
              : "";
          setMessages([
            {
              role: "assistant",
              content:
                open ||
                "Review the diagnostic brief above, then ask where you want to start implementation.",
            },
          ]);
        }
        setExpandLoading(false);
        setLoading(false);
        if (fromCachedExtended) {
          console.log('[FINDING] Brief found in cache, skipping API call');
          return;
        }

        if (found) {
          const briefKeyVariants = [...new Set([
            `webdoc_brief_${reportId}_${findingId}`,
            extKey ? `webdoc_brief_${reportId}_${extKey}` : "",
          ].filter(Boolean))];
          for (const bk of briefKeyVariants) {
            try {
              const cachedRaw = localStorage.getItem(bk);
              if (cachedRaw) {
                const cachedBrief = JSON.parse(cachedRaw) as FindingBriefExpansion;
                if (typeof cachedBrief?.diagnosticSummary === "string") {
                  setBriefExpanded(cachedBrief);
                  setAdvisorChips(advisorChipsFromExpansion(cachedBrief));
                  const open = typeof cachedBrief.advisorOpening === "string" ? cachedBrief.advisorOpening.trim() : "";
                  setMessages([{
                    role: "assistant",
                    content: open || "Review the diagnostic brief above, then ask where you want to start implementation.",
                  }]);
                  return;
                }
              }
            } catch { /* continue */ }
          }
        }
      }

      console.log('[FINDING] Cache miss, fetching from Supabase...');
      const supabase = getSupabaseBrowserClient();

      const sessionPromise = supabase.auth.getSession();
      const reportPromise = (async () => {
        let data: ReportRow | null = null;
        let reportError: { message?: string; code?: string } | null = null;

        try {
          const result = await supabase
            .from("reports")
            .select("id, domain, created_at, analysis, extended_analysis, finding_briefs")
            .eq("id", reportId)
            .maybeSingle();
          const err = result.error as { message?: string; code?: string } | null;
          const errMsg = String(err?.message ?? "");
          const extendedColumnMissing =
            err &&
            (/extended_analysis/i.test(errMsg) ||
              /finding_briefs/i.test(errMsg) ||
              /column.*does not exist/i.test(errMsg) ||
              err.code === "PGRST204");
          if (extendedColumnMissing) {
            const fb = await supabase
              .from("reports")
              .select("id, domain, created_at, analysis")
              .eq("id", reportId)
              .maybeSingle();
            data = fb.data
              ? ({
                  ...fb.data,
                  extended_analysis: null,
                  finding_briefs: null,
                } as ReportRow)
              : null;
            reportError = fb.error as { message?: string; code?: string } | null;
          } else {
            data = result.data as ReportRow | null;
            reportError = err;
          }
        } catch {
          const fb = await supabase
            .from("reports")
            .select("id, domain, created_at, analysis")
            .eq("id", reportId)
            .maybeSingle();
          data = fb.data
            ? ({
                ...fb.data,
                extended_analysis: null,
                finding_briefs: null,
              } as ReportRow)
            : null;
          reportError = fb.error as { message?: string; code?: string } | null;
        }
        return { data, reportError };
      })();

      const [{ data: sessionData }, { data, reportError }] = await Promise.all([
        sessionPromise,
        reportPromise,
      ]);
      const session = sessionData.session;

      if (!session) {
        setLoading(false);
        router.push("/auth");
        return;
      }

      if (cancelled) return;

      if (reportError || !data) {
        console.error("[issue page] report fetch failed", {
          reportId,
          findingId,
          error: reportError?.message ?? reportError ?? null,
          data,
        });
        setReport(null);
        setFinding(null);
        setScanLeaks([]);
        setLoading(false);
        return;
      }

      const row = data as ReportRow;
      setReport(row);
      const leaks = leaksForIssueLookup(row.analysis);
      setScanLeaks(leaks);
      const found = findLeakForUrlSegment(leaks, findingId);
      setFinding(found);
      if (!found && findingId) {
        console.warn("[issue page] finding not matched in report", {
          reportId,
          findingId,
          leakKeys: leaks.map((l) => leakKey(l)),
        });
      }

      if (!found) {
        setBriefExpanded(null);
        setExpandLoading(false);
        setLoading(false);
        return;
      }

      const ext = row.extended_analysis;
      const extKey = leakKey(found);
      const keyVariants = [
        extKey,
        findingId,
        decodeURIComponent(findingId),
        found.id,
        found.title,
        String(found.id ?? ""),
        String(found.title ?? ""),
      ].filter((k): k is string => typeof k === "string" && k.trim().length > 0);
      const storedEntry =
        ext && typeof ext === "object" && !Array.isArray(ext)
          ? keyVariants.reduce<unknown>(
              (acc, k) => acc ?? (ext as Record<string, unknown>)[k],
              undefined,
            )
          : undefined;
      const fromDb = parseFindingBriefFromStoredValue(storedEntry);

      if (fromDb) {
        setBriefExpanded(fromDb);
        setAdvisorChips(advisorChipsFromExpansion(fromDb));
        const open =
          typeof fromDb.advisorOpening === "string"
            ? fromDb.advisorOpening.trim()
            : "";
        setMessages([
          {
            role: "assistant",
            content:
              open ||
              "Review the diagnostic brief above, then ask where you want to start implementation.",
          },
        ]);
        setExpandLoading(false);
        setLoading(false);
        return;
      }

      const fbMap = row.finding_briefs;
      const fbStored =
        fbMap && typeof fbMap === "object" && !Array.isArray(fbMap)
          ? keyVariants.reduce<unknown>(
              (acc, k) => acc ?? (fbMap as Record<string, unknown>)[k],
              undefined,
            )
          : undefined;
      const fromFindingBriefs = parseFindingBriefFromStoredValue(fbStored);

      if (fromFindingBriefs) {
        setBriefExpanded(fromFindingBriefs);
        setAdvisorChips(advisorChipsFromExpansion(fromFindingBriefs));
        const open =
          typeof fromFindingBriefs.advisorOpening === "string"
            ? fromFindingBriefs.advisorOpening.trim()
            : "";
        setMessages([
          {
            role: "assistant",
            content:
              open ||
              "Review the diagnostic brief above, then ask where you want to start implementation.",
          },
        ]);
        setExpandLoading(false);
        setLoading(false);
        return;
      }

      try {
        const cachedBriefRaw = localStorage.getItem(`webdoc_brief_${reportId}_${findingId}`);
        if (cachedBriefRaw) {
          const cachedBrief = JSON.parse(cachedBriefRaw) as FindingBriefExpansion;
          setBriefExpanded(cachedBrief);
          setAdvisorChips(advisorChipsFromExpansion(cachedBrief));
          const open =
            typeof cachedBrief.advisorOpening === "string"
              ? cachedBrief.advisorOpening.trim()
              : "";
          setMessages([
            {
              role: "assistant",
              content:
                open ||
                "Review the diagnostic brief above, then ask where you want to start implementation.",
            },
          ]);
          setExpandLoading(false);
          setLoading(false);
          return;
        }
      } catch {
        // ignore local brief cache failures
      }

      console.log('[FINDING] Brief not cached, calling expand-finding API...');
      setBriefExpanded(null);
      setExpandLoading(true);
      setMessages([]);
      setAdvisorChips([...FALLBACK_ADVISOR_CHIPS]);

      const cat = (found.category ?? "").trim();
      const relatedForApi = leaks
        .filter(
          (l) =>
            leakKey(l) !== leakKey(found) &&
            cat &&
            (l.category ?? "").trim() === cat
        )
        .slice(0, 3)
        .map((l) => ({
          findingId: leakKey(l),
          title: l.title,
          category: (l.category ?? "").trim(),
        }));

      const findingPayload = {
        title: found.title,
        severity: severityDisplayLabel(found),
        category: found.category ?? "",
        whatWeFound: found.whatWeFound ?? "",
        whyItMatters: found.whyItMatters ?? "",
        howToFixIt: found.howToFixIt ?? "",
        exampleFix: found.exampleFix ?? "",
        psychologyPrinciple: found.psychologyPrinciple ?? "",
        revenueImpact: found.revenueImpact,
        page_location: found.page_location,
      };

      const expandRequestBody = {
        report_id: reportId,
        finding_id: extKey,
        domain: row.domain,
        overallScore:
          row.analysis?.healthScore ??
          row.analysis?.growthScore ??
          0,
        finding: findingPayload,
        relatedFindings: relatedForApi,
      };

      setLoading(false);

      try {
        const res = await fetch("/api/expand-finding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(expandRequestBody),
        });
        const rawJson: unknown = await res.json();
        if (cancelled) return;

        const payloadRaw = rawJson as FindingBriefExpansion & {
          error?: string;
          cached?: boolean;
        };
        if (
          !res.ok ||
          payloadRaw.error ||
          typeof payloadRaw.diagnosticSummary !== "string"
        ) {
          setBriefExpanded(null);
          setMessages([
            {
              role: "assistant",
              content:
                "Diagnostic expansion is temporarily unavailable. Ask a specific question about this finding and I will still work from the raw scan data.",
            },
          ]);
        } else {
          const { cached: _cachedFlag, error: _errField, ...briefPayload } =
            payloadRaw as FindingBriefExpansion & {
              cached?: boolean;
              error?: string;
            };
          setBriefExpanded(briefPayload);
          setAdvisorChips(advisorChipsFromExpansion(briefPayload));
          const open =
            typeof briefPayload.advisorOpening === "string"
              ? briefPayload.advisorOpening.trim()
              : "";
          setMessages([
            {
              role: "assistant",
              content:
                open ||
                "Review the diagnostic brief above, then ask where you want to start implementation.",
            },
          ]);

          void (async () => {
            try {
              const sb = getSupabaseBrowserClient();
              const { data: current, error: readErr } = await sb
                .from("reports")
                .select("extended_analysis")
                .eq("id", reportId)
                .maybeSingle();
              if (readErr) {
                console.warn(
                  "[issue page] failed to cache extended analysis",
                  readErr,
                );
                return;
              }
              const existing =
                (current?.extended_analysis as Record<string, unknown> | null) ??
                {};
              const extKeyInner = leakKey(found);
              const updated = {
                ...existing,
                [extKeyInner]: briefPayload,
              };
              const { error: upErr } = await sb
                .from("reports")
                .update({ extended_analysis: updated })
                .eq("id", reportId);
              if (upErr) {
                console.warn(
                  "[issue page] failed to cache extended analysis",
                  upErr,
                );
              }
            } catch (err) {
              console.warn(
                "[issue page] failed to cache extended analysis",
                err,
              );
            }
          })();
        }
      } catch {
        if (!cancelled) {
          setBriefExpanded(null);
          setMessages([
            {
              role: "assistant",
              content:
                "Diagnostic expansion failed to load. Ask a specific question and I will respond from the captured finding fields.",
            },
          ]);
        }
      } finally {
        if (!cancelled) setExpandLoading(false);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reportId, findingId]);

  async function send(text: string) {
    if (!text.trim() || streaming || !finding || !report) return;

    const supabase = getSupabaseBrowserClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? "";
    if (!userId) {
      router.push("/auth");
      return;
    }

    const priorHistory = messages.slice(-6);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId,
          activeDomain: report.domain,
          issueContext: {
            title: finding.title,
            severity: finding.severity,
            whatWeFound: finding.whatWeFound,
            whyItMatters: finding.whyItMatters,
            howToFixIt: finding.howToFixIt,
            exampleFix: finding.exampleFix,
            psychologyPrinciple: finding.psychologyPrinciple,
            revenueImpact: finding.revenueImpact,
            timeToFix: finding.timeToFix,
          },
          conversationHistory: priorHistory,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return next;
          });
        }
      }
    } catch {
      console.warn("Advisor error");
    } finally {
      setStreaming(false);
    }
  }

  async function markResolved() {
    if (!report || !finding || resolveBusy || resolvedLocal) return;
    const supabase = getSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      router.push("/auth");
      return;
    }
    setResolveBusy(true);
    const resolutionKey = `${report.id}:${leakKey(finding)}`;
    const { error } = await supabase.from("resolved_findings").insert({
      user_id: uid,
      resolution_key: resolutionKey,
    });
    if (!error || String(error?.message ?? "").includes("duplicate")) {
      setResolvedLocal(true);
    }
    setResolveBusy(false);
  }

  const sevLabel = finding ? severityDisplayLabel(finding) : "";
  const isCriticalDisplay =
    finding?.severity === "critical" || finding?.rubricSeverity === "Critical";

  const sevColor = isCriticalDisplay
    ? "var(--red)"
    : finding?.severity === "warning" || sevLabel === "HIGH IMPACT"
      ? "var(--orange)"
      : "var(--green)";

  const sevBg = isCriticalDisplay
    ? "rgba(255,45,45,0.06)"
    : finding?.severity === "warning" || sevLabel === "HIGH IMPACT"
      ? "rgba(255,149,0,0.06)"
      : "rgba(0,255,135,0.06)";

  const sortedByPriority = [...scanLeaks].sort(
    (a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0)
  );
  const priorityIndex = finding
    ? sortedByPriority.findIndex((l) => leakKey(l) === leakKey(finding))
    : -1;
  const priorityN = priorityIndex >= 0 ? priorityIndex + 1 : 1;
  const priorityY = scanLeaks.length;
  const scanOrderIndex = finding
    ? scanLeaks.findIndex((l) => leakKey(l) === leakKey(finding))
    : -1;
  const priorityContextLine =
    priorityIndex >= 0 && priorityY > 0
      ? `Finding ${priorityN} of ${priorityY} — Ranked #${priorityN} by revenue suppression impact`
      : priorityY > 0
        ? `Finding ${scanOrderIndex >= 0 ? scanOrderIndex + 1 : 1} of ${priorityY}`
        : "";

  const relatedFindings = (() => {
    if (!finding || scanLeaks.length < 2) return [];
    const cat = (finding.category ?? "").trim();
    const others = scanLeaks.filter(
      (l) =>
        leakKey(l) !== leakKey(finding) &&
        cat &&
        (l.category ?? "").trim() === cat
    );
    return others.slice(0, 3);
  })();

  if (loading) {
    return <IssueInitialSkeleton />;
  }

  if (!finding) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: "var(--bg-base)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: 20,
            color: "var(--text-primary)",
          }}
        >
          Finding not found
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            padding: "10px 20px",
            color: "var(--cyan)",
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "2px",
            cursor: "pointer",
          }}
        >
          ← BACK TO DASHBOARD
        </button>
      </div>
    );
  }

  const hasBrief = Boolean(briefExpanded);
  const diagnosticSummaryBody =
    briefExpanded?.diagnosticSummary?.trim() ||
    (typeof finding.whyItMatters === "string" ? finding.whyItMatters.trim() : "") ||
    (finding.whatWeFound ?? "").trim() ||
    "—";
  const evidenceQuote = finding.whatWeFound ?? "";
  const originAnalysisDisplay = firstParagraphOrigin(briefExpanded?.originAnalysis);
  const originFullText = String(briefExpanded?.originAnalysis ?? "").trim();

  const benchmarkStatementRaw = String(
    briefExpanded?.benchmark?.statement ?? "",
  ).trim();

  const revenueModelingRaw = String(
    briefExpanded?.revenueImpact?.modeling ?? "",
  ).trim();
  const revenueNarrativeRaw = String(
    briefExpanded?.revenueImpact?.narrative ?? "",
  ).trim();
  const costOfInactionLine =
    briefExpanded?.revenueImpact?.costOfInaction?.trim() ||
    "Every month this finding remains unresolved, suppression compounds with visitor data establishing negative recall patterns.";

  const behavioralMechanismRaw = String(
    briefExpanded?.diagnosisAnalysis?.behavioralMechanism ?? "",
  ).trim();
  const conversionConsequenceRaw = String(
    briefExpanded?.diagnosisAnalysis?.conversionConsequence ?? "",
  ).trim();
  const scopeOfImpactRaw = String(
    briefExpanded?.diagnosisAnalysis?.scopeOfImpact ?? "",
  ).trim();
  const interactionEffectRaw = String(
    briefExpanded?.diagnosisAnalysis?.interactionEffect ?? "",
  ).trim();

  const originAnalysisFull =
    originFullText ||
    (isPlaceholderContent(originAnalysisDisplay) ? "—" : originAnalysisDisplay);
  const compoundingRiskRaw = String(briefExpanded?.compoundingRisk ?? "").trim();

  const resolutionProjectedImpact = (tier: "immediate" | "proper" | "advanced") => {
    const raw = (
      briefExpanded?.resolution?.[tier] as { projectedImpact?: string } | undefined
    )?.projectedImpact;
    const s = typeof raw === "string" ? raw.trim() : "";
    return s || undefined;
  };

  const resolutionTiers = [
    {
      key: "immediate" as const,
      title: "Immediate",
      sub: "Executable today. No developer required.",
      body: briefExpanded?.resolution?.immediate?.steps,
      time:
        briefExpanded?.resolution?.immediate?.timeEstimate ||
        "Est. time: 30-60 minutes",
      projectedImpact: resolutionProjectedImpact("immediate"),
      accent: "#00C8FF",
      titleColor: "#00C8FF",
      cardBorder: "#1A2035",
    },
    {
      key: "proper" as const,
      title: "Proper",
      sub: "Correct long-term implementation.",
      body: briefExpanded?.resolution?.proper?.steps,
      time:
        briefExpanded?.resolution?.proper?.timeEstimate ||
        "Est. time: 2-4 hours",
      projectedImpact: resolutionProjectedImpact("proper"),
      accent: "#8899AA",
      titleColor: "#FFFFFF",
      cardBorder: "#1A2035",
    },
    {
      key: "advanced" as const,
      title: "Advanced",
      sub: "What high-converting sites implement at scale.",
      body: briefExpanded?.resolution?.advanced?.steps,
      time:
        briefExpanded?.resolution?.advanced?.timeEstimate ||
        "Est. time: 1-2 weeks",
      projectedImpact: resolutionProjectedImpact("advanced"),
      accent: "#1A2035",
      titleColor: "#8899AA",
      cardBorder: "#2A3048",
    },
  ] as const;

  const bodyCopy: CSSProperties = {
    fontFamily: "var(--font-space-grotesk), sans-serif",
    fontSize: 15,
    fontWeight: 400,
    color: "#E0E6FF",
    lineHeight: 1.75,
  };

  const monoSectionLabel: CSSProperties = {
    fontFamily: "var(--font-space-mono), ui-monospace, monospace",
    fontSize: 10,
    color: "#00C8FF",
    letterSpacing: "0.15em",
    marginBottom: 12,
    textTransform: "uppercase",
    fontWeight: 400,
  };

  const prevFinding = priorityIndex > 0 ? sortedByPriority[priorityIndex - 1] ?? null : null;
  const nextFinding =
    priorityIndex >= 0 && priorityIndex < sortedByPriority.length - 1
      ? sortedByPriority[priorityIndex + 1] ?? null
      : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050810",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes issueContentPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @media (max-width: 768px) {
          .issue-top-header {
            padding: 12px 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .issue-top-back {
            order: 1;
            width: 100%;
            text-align: left !important;
            min-height: 44px;
            display: flex;
            align-items: center;
          }
          .issue-top-nav {
            order: 2;
            width: 100% !important;
            min-width: 0 !important;
            justify-content: space-between !important;
            display: flex !important;
            align-items: center !important;
          }
          .issue-top-nav .issue-top-severity {
            display: none !important;
          }
          .issue-top-nav button {
            min-height: 44px;
          }
          .issue-top-domain {
            order: 3;
            width: 100%;
            text-align: center !important;
          }
          .issue-main-content {
            padding: 20px 16px 40px !important;
          }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          width: 500,
          height: 400,
          left: "4%",
          top: "20%",
          borderRadius: "50%",
          background: "rgba(0,150,255,0.04)",
          filter: "blur(80px)",
          animation: "heroNeuralDrift 16s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      />

      <div
        style={{
          position: "fixed",
          top: "4rem",
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent)",
          pointerEvents: "none",
          zIndex: 1,
        }}
        aria-hidden
      />

      {[
        { top: "4rem", left: 0, borderTop: "1px solid rgba(0,200,255,0.2)", borderLeft: "1px solid rgba(0,200,255,0.2)" },
        { top: "4rem", right: 0, borderTop: "1px solid rgba(0,200,255,0.2)", borderRight: "1px solid rgba(0,200,255,0.2)" },
        { bottom: 0, left: 0, borderBottom: "1px solid rgba(0,200,255,0.2)", borderLeft: "1px solid rgba(0,200,255,0.2)" },
        { bottom: 0, right: 0, borderBottom: "1px solid rgba(0,200,255,0.2)", borderRight: "1px solid rgba(0,200,255,0.2)" },
      ].map((s, i) => (
        <div
          key={i}
          style={{ position: "fixed", width: 24, height: 24, pointerEvents: "none", zIndex: 100, ...s }}
          aria-hidden
        />
      ))}

      <div
        style={{
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          className="issue-top-header"
          style={{
            background: "#080D18",
            borderBottom: "1px solid #0D1626",
            padding: "16px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div className="issue-top-back" style={{ flex: "1 1 0", minWidth: 200 }}>
            {report ? (
              <Link
                href={`/report/${encodeURIComponent(report.domain)}`}
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  color: "#8899AA",
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                }}
              >
                ← BACK TO REPORT
              </Link>
            ) : null}
          </div>
          <div
            className="issue-top-domain"
            style={{
              flex: "1 1 auto",
              textAlign: "center",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 10,
              color: "#8899AA",
              letterSpacing: "0.02em",
            }}
          >
            {report ? `${report.domain} · Finding ${priorityN} of ${priorityY}` : `Finding ${priorityN} of ${priorityY}`}
          </div>
          <div
            className="issue-top-nav"
            style={{
              flex: "1 1 0",
              minWidth: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 10,
              color: "#8899AA",
            }}
          >
            <span
              className="issue-top-severity"
              style={{
                display: "inline-block",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#FFFFFF",
                background: sevColor,
                borderRadius: 2,
                padding: "2px 8px",
                textTransform: "uppercase",
              }}
            >
              {sevLabel}
            </span>
            {prevFinding ? (
              <button
                type="button"
                onClick={() => {
                  if (report) router.push(`/issue/${encodeURIComponent(report.id)}/${encodeURIComponent(leakKey(prevFinding))}`);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8899AA",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ← PREV
              </button>
            ) : null}
            {nextFinding ? (
              <button
                type="button"
                onClick={() => {
                  if (report) router.push(`/issue/${encodeURIComponent(report.id)}/${encodeURIComponent(leakKey(nextFinding))}`);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8899AA",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                NEXT →
              </button>
            ) : null}
          </div>
        </div>

        <main
          className="issue-main-content"
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "32px 40px 80px",
            boxSizing: "border-box",
          }}
        >

        {/* FINDING HEADER */}
        <div
          style={{
            background: "rgba(7,12,20,0.97)",
            border: "1px solid var(--border-default)",
            borderLeft: `4px solid ${sevColor}`,
            borderRadius: "0 16px 16px 0",
            overflow: "hidden",
            boxShadow:
              finding.severity === "critical"
                ? "inset 4px 0 20px rgba(255,45,45,0.1)"
                : finding.severity === "warning"
                  ? "inset 4px 0 20px rgba(255,149,0,0.08)"
                  : "inset 4px 0 20px rgba(0,255,135,0.06)",
            marginBottom: 40,
          }}
        >
          <div style={{ padding: "28px 32px 32px", background: "rgba(13,16,32,0.9)" }}>
            <h1
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontWeight: 700,
                fontSize: 28,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                margin: "0 0 16px 0",
                letterSpacing: "-0.5px",
              }}
            >
              {finding.title}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: "1.5px",
                  color: sevColor,
                  background: sevBg,
                  border: `1px solid ${sevColor}40`,
                  borderRadius: 3,
                  padding: "2px 8px",
                }}
              >
                {sevLabel}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 3,
                  padding: "2px 8px",
                  letterSpacing: "1px",
                }}
              >
                {(finding.category ?? "").trim() || finding.id || "FINDING"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "rgba(0,200,255,0.95)",
                  border: "1px solid rgba(0,200,255,0.25)",
                  borderRadius: 4,
                  padding: "4px 10px",
                  background: "rgba(0,200,255,0.06)",
                }}
              >
                {formatFindingOrdinal(priorityN, priorityY)}
              </span>
            </div>

            {priorityContextLine ? (
              <p
                style={{
                  margin: "6px 0 12px 0",
                  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                  fontSize: 11,
                  color: "#8899AA",
                  letterSpacing: "0.06em",
                  lineHeight: 1.45,
                }}
              >
                {priorityContextLine}
              </p>
            ) : null}

            <span
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: 15,
                fontWeight: 500,
                color: sevColor,
                lineHeight: 1.55,
                maxWidth: 720,
                display: "block",
              }}
            >
              {revenueSuppressionLine(finding)}
            </span>

            <div style={{ marginTop: 16 }}>
              <a
                href="#issue-resolution-protocol"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("issue-resolution-protocol")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                  fontSize: 11,
                  color: "#00C8FF",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                SKIP TO RESOLUTION
              </a>
            </div>
          </div>
        </div>

        {/* AI ADVISOR */}
        <div
          style={{
            position: "relative",
            background: "rgba(5,8,16,0.98)",
            border: "1px solid rgba(0,200,255,0.2)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            minHeight: 520,
            overflow: "hidden",
            boxShadow: "var(--cyan-glow-active)",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.6), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
            aria-hidden
          />

          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid rgba(0,200,255,0.1)",
              background: "rgba(7,12,20,0.98)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  animation: "livePulse 2s infinite",
                  boxShadow: "0 0 8px rgba(0,200,255,0.6)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "3px",
                  color: "var(--cyan)",
                }}
              >
                AI ADVISOR
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "var(--text-muted)",
                }}
              >
                · on this issue
              </span>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 320,
              overflowY: "auto",
              padding: "20px 24px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(0,200,255,0.15) transparent",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {messages.length === 0 ? (
              <div
                className="animate-pulse"
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 300,
                  color: "var(--text-muted)",
                  lineHeight: 1.65,
                  padding: "12px 16px",
                }}
              >
                Preparing personalized advice…
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 8,
                    letterSpacing: "1.5px",
                    color: m.role === "user" ? "rgba(0,200,255,0.5)" : "rgba(255,255,255,0.2)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  {m.role === "user" ? "YOU" : "ADVISOR"}
                </div>
                <div
                  style={{
                    maxWidth: "min(920px, 100%)",
                    width: m.role === "assistant" ? "100%" : undefined,
                    padding: "12px 16px",
                    borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
                    background: m.role === "user" ? "rgba(0,200,255,0.1)" : "rgba(17,20,40,0.8)",
                    border: m.role === "user" ? "1px solid rgba(0,200,255,0.2)" : "1px solid var(--border-default)",
                    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                    fontSize: 15,
                    fontWeight: 400,
                    color: m.role === "user" ? "var(--cyan)" : "#FFFFFF",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content}
                  {streaming && i === messages.length - 1 && m.role === "assistant" && (
                    <span style={{ animation: "blink 1s step-start infinite", marginLeft: 2 }}>▍</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {messages.length === 1 && messages[0]?.role === "assistant" && !streaming && (
            <div style={{ padding: "0 24px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {advisorChips.map((c, chipIdx) => (
                <button
                  key={`${chipIdx}-${c}`}
                  type="button"
                  onClick={() => void send(c)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "var(--text-muted)",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
                    e.currentTarget.style.color = "var(--cyan)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              padding: "16px 24px 24px",
              borderTop: "1px solid rgba(0,200,255,0.08)",
              background: "rgba(5,8,16,0.6)",
              flexShrink: 0,
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the diagnostic advisor..."
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                minHeight: 88,
                maxHeight: 200,
                resize: "vertical",
                background: "rgba(17,20,40,0.8)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                padding: "12px 16px",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: 14,
                color: "var(--text-primary)",
                outline: "none",
                lineHeight: 1.5,
                marginBottom: 12,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.35)";
                e.currentTarget.style.boxShadow = "0 0 40px rgba(0,180,255,0.06)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={streaming || !input.trim()}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 8,
                background: input.trim() && !streaming ? "var(--cyan)" : "var(--bg-elevated)",
                border: "none",
                cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
                color: input.trim() && !streaming ? "#050810" : "var(--text-muted)",
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 11,
                letterSpacing: "2px",
                fontWeight: 700,
                transition: "all 150ms ease",
              }}
            >
              SEND
            </button>
          </div>
        </div>

        {/* EVIDENCE */}
        <SectionDivider />
        <div>
          <div style={monoSectionLabel}>EVIDENCE</div>
          <blockquote
            style={{
              margin: 0,
              padding: "18px 22px 18px 24px",
              borderLeft: "3px solid #00C8FF",
              background: "rgba(0,200,255,0.06)",
              borderRadius: "0 10px 10px 0",
              boxShadow: "0 0 40px rgba(0,180,255,0.04)",
              fontStyle: "italic",
            }}
          >
            <FindingExpandedText
              text={evidenceQuote || "—"}
              expandLoading={expandLoading}
              hasExpanded={hasBrief}
              style={{
                fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                fontSize: 13,
                color: "#8899AA",
                lineHeight: 1.6,
              }}
            />
          </blockquote>
          <div
            style={{
              marginTop: 12,
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 10,
              color: "#8899AA",
              letterSpacing: "0.04em",
            }}
          >
            Observed at:{" "}
            {briefExpanded?.observedAt?.trim() || (finding.page_location?.trim() ?? "—")}
          </div>
        </div>

        {/* DIAGNOSTIC ANALYSIS — combined prose */}
        <SectionDivider />
        <div>
          <div style={monoSectionLabel}>DIAGNOSTIC ANALYSIS</div>
          {!hasBrief && expandLoading ? (
            <div
              style={{
                background: "#0A0F1E",
                border: "1px solid #1A2035",
                borderLeft: "3px solid rgba(0,200,255,0.3)",
                borderRadius: 4,
                padding: "20px 24px",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                  color: "#00C8FF",
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  marginBottom: 8,
                }}
              >
                ● GENERATING DEEP ANALYSIS
              </div>
              <div
                style={{
                  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                  color: "#8899AA",
                  fontSize: 11,
                }}
              >
                Expanding diagnostic intelligence...
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {!isPlaceholderContent(diagnosticSummaryBody) && (
                <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>{diagnosticSummaryBody}</p>
              )}
              {!isPlaceholderContent(behavioralMechanismRaw) && (
                <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>{behavioralMechanismRaw}</p>
              )}
              {!isPlaceholderContent(conversionConsequenceRaw) && (
                <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>{conversionConsequenceRaw}</p>
              )}
              {!isPlaceholderContent(scopeOfImpactRaw) && (
                <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>{scopeOfImpactRaw}</p>
              )}
              {!isPlaceholderContent(interactionEffectRaw) && (
                <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>{interactionEffectRaw}</p>
              )}
              {!isPlaceholderContent(originAnalysisFull) && (
                <p style={{ margin: 0, maxWidth: 820, ...bodyCopy, whiteSpace: "pre-wrap" }}>
                  {originAnalysisFull}
                </p>
              )}
              {!isPlaceholderContent(compoundingRiskRaw) && (
                <p style={{ margin: 0, maxWidth: 820, ...bodyCopy, whiteSpace: "pre-wrap" }}>
                  {compoundingRiskRaw}
                </p>
              )}
            </div>
          )}
        </div>

        {/* REVENUE IMPACT */}
        <SectionDivider />
        <div>
          <div style={monoSectionLabel}>REVENUE IMPACT</div>
          <div
            style={{
              fontFamily: "var(--font-orbitron), ui-sans-serif, sans-serif",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: sevColor,
              marginBottom: 16,
            }}
          >
            {impactSuppressionHeadline(briefExpanded, finding)}
          </div>

          {expandLoading && !hasBrief ? (
            <SectionSkeleton widthPct="68%" />
          ) : (
            <>
              {!isPlaceholderContent(revenueModelingRaw) && (
                <p style={{ margin: "0 0 16px 0", maxWidth: 820, ...bodyCopy }}>{revenueModelingRaw}</p>
              )}
              {revenueNarrativeRaw ? (
                <p style={{ margin: "0 0 16px 0", ...bodyCopy }}>{revenueNarrativeRaw}</p>
              ) : null}
            </>
          )}

          <p
            style={{
              margin: "0 0 24px 0",
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 12,
              color: "rgba(136,153,170,0.72)",
              lineHeight: 1.5,
              maxWidth: 820,
            }}
          >
            {costOfInactionLine}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
            {[
              {
                label: "This site:",
                desc: briefExpanded?.benchmark?.thisSiteLabel || "Current experience vs. category norm",
                w: "32%",
                c: sevColor,
              },
              {
                label: "High-converting benchmark:",
                desc: briefExpanded?.benchmark?.benchmarkLabel || "Category-leading clarity pattern",
                w: "82%",
                c: "#00E676",
              },
            ].map((row) => (
              <div key={row.label}>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 10,
                    color: "#8899AA",
                    marginBottom: 6,
                  }}
                >
                  {row.label}{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{row.desc}</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: row.w,
                      height: "100%",
                      borderRadius: 4,
                      background: row.c,
                      boxShadow: `0 0 12px ${row.c}55`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESOLUTION PROTOCOL */}
        <SectionDivider />
        <div id="issue-resolution-protocol">
          <div style={monoSectionLabel}>RESOLUTION PROTOCOL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
            {resolutionTiers.map((tier) => (
              <div
                key={tier.key}
                style={{
                  position: "relative",
                  background: "#0A0F1E",
                  border: `1px solid ${tier.cardBorder}`,
                  borderRadius: 8,
                  padding: "20px 22px 20px 26px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: tier.accent,
                    opacity: tier.key === "advanced" ? 1 : 0.9,
                  }}
                  aria-hidden
                />
                <div
                  style={{
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: tier.titleColor,
                    marginBottom: 4,
                  }}
                >
                  {tier.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 10,
                    color: "#8899AA",
                    marginBottom: 12,
                  }}
                >
                  {tier.sub}
                </div>
                <p style={{ margin: "0 0 12px 0", ...bodyCopy, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {tier.body || "—"}
                </p>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  {tier.time}
                </div>
                {tier.projectedImpact ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 10,
                      color: "#00C8FF",
                      letterSpacing: "0.04em",
                      opacity: 0.8,
                    }}
                  >
                    ↑ {tier.projectedImpact}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={resolveBusy || resolvedLocal}
            onClick={() => void markResolved()}
            onMouseEnter={(e) => {
              if (resolveBusy || resolvedLocal) return;
              e.currentTarget.style.background = "rgba(0,230,118,0.062)";
            }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            style={{
              width: "100%",
              maxWidth: 820,
              height: 48,
              borderRadius: 6,
              border: "1px solid #00E676",
              background: "transparent",
              color: "#00E676",
              fontFamily: "var(--font-space-mono), ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: resolvedLocal ? "none" : "uppercase",
              fontWeight: 400,
              cursor: resolveBusy || resolvedLocal ? "default" : "pointer",
            }}
          >
            {resolvedLocal ? "Finding marked as resolved" : "Mark finding as resolved"}
          </button>
        </div>

        {/* RELATED FINDINGS */}
        {relatedFindings.length > 0 ? (
          <>
            <SectionDivider />
            <div style={{ paddingBottom: 48 }}>
              <div style={monoSectionLabel}>RELATED DIAGNOSTIC FINDINGS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {relatedFindings.map((l) => {
                  const kid = leakKey(l);
                  const inter =
                    briefExpanded?.relatedFindingInteractions?.find(
                      (x) => x.findingId === kid,
                    )?.interaction ?? "";
                  return (
                    <Link
                      key={kid}
                      href={`/issue/${encodeURIComponent(reportId)}/${encodeURIComponent(kid)}`}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        borderRadius: 8,
                        border: "1px solid var(--border-default)",
                        background: "rgba(7,12,20,0.6)",
                        textDecoration: "none",
                        transition: "border-color 150ms ease, box-shadow 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0,200,255,0.35)";
                        e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,200,255,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-default)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 8,
                          color: "var(--text-muted)",
                          letterSpacing: "1px",
                          marginBottom: 4,
                        }}
                      >
                        {l.category}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-space-grotesk), sans-serif",
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--cyan)",
                          lineHeight: 1.35,
                        }}
                      >
                        {l.title}
                      </div>
                      {inter ? (
                        <div
                          style={{
                            marginTop: 10,
                            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                            fontSize: 13,
                            color: "rgba(136,153,170,0.85)",
                            lineHeight: 1.5,
                          }}
                        >
                          Interaction: {inter}
                        </div>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
        </main>
      </div>
    </div>
  );
}
