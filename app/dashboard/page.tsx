"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { DimensionScoreRow, Leak, ReportPayload } from "@/lib/reportSchema";
import { ScrollReveal } from "@/components/ScrollReveal";
import ScoreHistoryChart from "@/components/dashboard/ScoreHistoryChart";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";
import AdvisorChat from "@/components/dashboard/AdvisorChat";
import ScanUrlBar from "@/components/ScanUrlBar";
import PageLoadSkeleton from "@/components/PageLoadSkeleton";
import { getBlockedMessage, isBlockedDomain } from "@/lib/scanGuard";
import { convertLeaksToFindingData } from "@/lib/convertLeakToFindingData";
import { ReportFindingPreview } from "@/components/ReportRightPanel";
import { displayScoreColor } from "@/lib/displayScoreColor";
import ConversionScoreGauge from "@/components/ConversionScoreGauge";

const SM = "var(--font-space-mono), var(--font-jetbrains-mono), monospace";
const SG = "var(--font-space-grotesk), sans-serif";
const ORB = "var(--font-orbitron), sans-serif";
const DASHBOARD_REPORTS_CACHE_PREFIX = "webdoc_dashboard_reports_";
const DASHBOARD_REPORTS_CACHE_TS_PREFIX = "webdoc_dashboard_reports_ts_";
const DASHBOARD_REPORTS_CACHE_TTL_MS = 300_000;

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
  dimension_scores?: DimensionScoreRow[] | null;
  health_score?: number | null;
  money_leaks?: unknown;
  quick_wins?: unknown;
  growth_roadmap?: unknown;
  verdict?: unknown;
  primary_findings?: unknown;
  biggest_opportunity?: string | null;
  estimated_impact?: string | null;
  critical_count?: number | null;
  high_count?: number | null;
  total_failed?: number | null;
  total_passed?: number | null;
  share_token?: string | null;
  score_delta?: number | null;
  previous_score?: number | null;
};

function formatRelativeScanTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - t);
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 48) return `${diffH}h ago`;
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 14) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks <= 4) return `${diffWeeks} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function distinctDomains(reports: StoredReportRow[]): string[] {
  return Array.from(new Set(reports.map((r) => r.domain))).filter(Boolean);
}

function splitFirstNSentences(text: string, n: number): { head: string; tail: string } {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return { head: "", tail: "" };
  const parts = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (parts.length <= n) return { head: t, tail: "" };
  return { head: parts.slice(0, n).join(" "), tail: parts.slice(n).join(" ") };
}

function domainKeysMatch(stored: string, selected: string): boolean {
  if (stored === selected) return true;
  const norm = (s: string) =>
    s.trim().toLowerCase().replace(/^www\./i, "");
  return norm(stored) === norm(selected);
}

function reportsMatchingSelectedDomain(
  allReports: StoredReportRow[],
  selectedDomain: string
): StoredReportRow[] {
  const sel = selectedDomain.trim();
  if (!sel) return [];
  const pool = allReports.filter((r) => domainKeysMatch(r.domain, sel));
  const hasDimensionData = (r: StoredReportRow): boolean =>
    Array.isArray(r.analysis?.dimensionScores) &&
    r.analysis.dimensionScores.some((d) => Number(d?.score ?? 0) > 0);
  return [...pool].sort((a, b) => {
    const aHas = hasDimensionData(a) ? 1 : 0;
    const bHas = hasDimensionData(b) ? 1 : 0;
    if (bHas !== aHas) return bHas - aHas;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function normalizeStoredReportRows(
  reportRows: unknown[] | null | undefined
): StoredReportRow[] {
  return (reportRows ?? []).map((rowUnknown) => {
    const row = rowUnknown as Record<string, unknown>;
    const analysis = (row.analysis ?? {}) as ReportPayload;
    const fromCol = row.dimension_scores;
    const mergedScores =
      Array.isArray(analysis.dimensionScores) && analysis.dimensionScores.length > 0
        ? analysis.dimensionScores
        : Array.isArray(fromCol)
          ? (fromCol as DimensionScoreRow[])
          : undefined;

    const colMoney = row.money_leaks;
    const colPrimary = row.primary_findings;
    const moneyFromAnalysis =
      Array.isArray(analysis.moneyLeaks) && analysis.moneyLeaks.length > 0
        ? analysis.moneyLeaks
        : undefined;
    const primaryFromAnalysis =
      Array.isArray(analysis.primaryFindings) && analysis.primaryFindings.length > 0
        ? analysis.primaryFindings
        : Array.isArray(analysis.priorityFindings) && analysis.priorityFindings.length > 0
          ? analysis.priorityFindings
          : undefined;
    const moneyMerged =
      moneyFromAnalysis ??
      (Array.isArray(colMoney) && colMoney.length > 0 ? (colMoney as Leak[]) : undefined);
    const primaryMerged =
      primaryFromAnalysis ??
      (Array.isArray(colPrimary) && colPrimary.length > 0
        ? (colPrimary as Leak[])
        : undefined);

    return {
      id: String(row.id),
      domain: String(row.domain ?? ""),
      created_at: String(row.created_at ?? ""),
      analysis: {
        ...analysis,
        dimensionScores: mergedScores,
        ...(moneyMerged ? { moneyLeaks: moneyMerged } : {}),
        ...(primaryMerged && !moneyMerged ? { primaryFindings: primaryMerged } : {}),
      },
      dimension_scores: mergedScores ?? null,
      money_leaks: colMoney,
      primary_findings: colPrimary,
      health_score: typeof row.health_score === "number" ? row.health_score : null,
      quick_wins: row.quick_wins ?? null,
      growth_roadmap: row.growth_roadmap ?? null,
      verdict: row.verdict ?? null,
      biggest_opportunity:
        row.biggest_opportunity != null ? String(row.biggest_opportunity) : null,
      estimated_impact:
        row.estimated_impact != null ? String(row.estimated_impact) : null,
      critical_count: typeof row.critical_count === "number" ? row.critical_count : null,
      high_count: typeof row.high_count === "number" ? row.high_count : null,
      total_failed: typeof row.total_failed === "number" ? row.total_failed : null,
      total_passed: typeof row.total_passed === "number" ? row.total_passed : null,
      share_token: row.share_token != null ? String(row.share_token) : null,
      score_delta: typeof row.score_delta === "number" ? row.score_delta : null,
      previous_score: typeof row.previous_score === "number" ? row.previous_score : null,
    };
  });
}

function normalizeScanUrlForGuard(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.startsWith("http") ? t : `https://${t}`;
}

function scoreColor(score: number): string {
  return displayScoreColor(score);
}

const DASH_STRIPE_CTA: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "1px solid #00C8FF",
  color: "#00C8FF",
  fontFamily: SM,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  minHeight: 44,
  padding: "0 32px",
  borderRadius: 2,
  cursor: "pointer",
  boxSizing: "border-box",
  textDecoration: "none",
};

const dashStripeCtaHoverHandlers = {
  onMouseEnter: (e: { currentTarget: HTMLButtonElement }) => {
    e.currentTarget.style.background = "rgba(0,200,255,0.08)";
  },
  onMouseLeave: (e: { currentTarget: HTMLButtonElement }) => {
    e.currentTarget.style.background = "transparent";
  },
} as const;

function EnterpriseBlockModal({
  open,
  onClose,
  onPrimary,
  onSecondary,
}: {
  open: boolean;
  onClose: () => void;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  if (!open) return null;
  const copy = getBlockedMessage();
  const BR = 18;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-enterprise-block-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200000,
        background: "rgba(5,8,16,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          background: "#0A0F1E",
          border: "1px solid #1A2035",
          borderRadius: 2,
          padding: "36px 32px 32px",
          boxSizing: "border-box",
        }}
      >
        <div aria-hidden style={{ position: "absolute", width: BR, height: BR, top: 14, left: 14, borderTop: "2px solid rgba(0,200,255,0.35)", borderLeft: "2px solid rgba(0,200,255,0.35)" }} />
        <div aria-hidden style={{ position: "absolute", width: BR, height: BR, top: 14, right: 14, borderTop: "2px solid rgba(0,200,255,0.35)", borderRight: "2px solid rgba(0,200,255,0.35)" }} />
        <div aria-hidden style={{ position: "absolute", width: BR, height: BR, bottom: 14, left: 14, borderBottom: "2px solid rgba(0,200,255,0.35)", borderLeft: "2px solid rgba(0,200,255,0.35)" }} />
        <div aria-hidden style={{ position: "absolute", width: BR, height: BR, bottom: 14, right: 14, borderBottom: "2px solid rgba(0,200,255,0.35)", borderRight: "2px solid rgba(0,200,255,0.35)" }} />
        <h2
          id="dashboard-enterprise-block-title"
          className="font-sans font-extrabold"
          style={{ color: "#FFFFFF", fontSize: 22, letterSpacing: "-0.5px", lineHeight: 1.15, margin: "0 0 16px 0", paddingRight: 8 }}
        >
          {copy.headline}
        </h2>
        <div style={{ fontFamily: SM, fontSize: 12, color: "#8899AA", lineHeight: 1.65, whiteSpace: "pre-line", marginBottom: 28 }}>
          {copy.body}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            onClick={onPrimary}
            className="font-mono text-[12px] font-bold uppercase tracking-wide"
            style={{ flex: "1 1 200px", padding: "12px 20px", background: "#00C8FF", color: "#050810", border: "1px solid #00C8FF", cursor: "pointer", borderRadius: 2 }}
          >
            {copy.ctaPrimary}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="font-mono text-[11px] font-semibold uppercase tracking-wide"
            style={{ flex: "1 1 180px", padding: "12px 16px", background: "transparent", color: "rgba(0,200,255,0.85)", border: "1px solid rgba(0,200,255,0.35)", cursor: "pointer", borderRadius: 2 }}
          >
            {copy.ctaSecondary}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>(
    typeof window !== "undefined" &&
      window.location.search.includes("upgraded=true")
      ? "pro"
      : "loading"
  );
  const [reportsReady, setReportsReady] = useState(false);

  const [reports, setReports] = useState<StoredReportRow[]>([]);
  const [advisorResetSignal, setAdvisorResetSignal] = useState(0);

  const [emptyScanUrl, setEmptyScanUrl] = useState("");
  const [activeDomain, setActiveDomain] = useState<string>("");
  const [showScanInput, setShowScanInput] = useState(false);
  const [newScanUrl, setNewScanUrl] = useState("");
  const [showNewUserOverlay, setShowNewUserOverlay] = useState(false);
  const [newUserScanUrl, setNewUserScanUrl] = useState("");
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);
  const [firstScanFieldFocused, setFirstScanFieldFocused] = useState(false);
  const [firstScanCtaHover, setFirstScanCtaHover] = useState(false);
  const firstScanFieldRef = useRef<HTMLDivElement>(null);
  const [enterpriseBlockOpen, setEnterpriseBlockOpen] = useState(false);
  const [enterpriseBlockHighlight, setEnterpriseBlockHighlight] = useState<"empty" | "modal" | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [deleteErrorDomain, setDeleteErrorDomain] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
      setPlan((prev) => prev === "loading" ? "free" : prev);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/auth";
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const user = data?.user;
      if (!user) {
        window.location.href = "/auth";
        return;
      }
      setAuthUserId(user.id);
      setEmail(user.email ?? null);
      setLoading(false);

      const cacheKey = `${DASHBOARD_REPORTS_CACHE_PREFIX}${user.id}`;
      const cacheTsKey = `${DASHBOARD_REPORTS_CACHE_TS_PREFIX}${user.id}`;
      try {
        const rawTs = localStorage.getItem(cacheTsKey);
        const valid =
          rawTs != null &&
          Number.isFinite(Number(rawTs)) &&
          Date.now() - Number(rawTs) < DASHBOARD_REPORTS_CACHE_TTL_MS;
        if (valid) {
          const rawCached = localStorage.getItem(cacheKey);
          if (rawCached) {
            const parsed = JSON.parse(rawCached) as unknown[] | null | undefined;
            const normalizedCached = normalizeStoredReportRows(parsed);
            if (normalizedCached.length > 0) {
              setReports(normalizedCached);
              setReportsReady(true);
            }
          }
        }
      } catch {
        // ignore cache read failures
      }

      const [profileRes, reportsResult, profileFlagsResult] = await Promise.all([
        fetch("/api/profile", { method: "GET", credentials: "include" }),
        supabase
          .from("reports")
          .select(
            "id, domain, created_at, analysis, dimension_scores, money_leaks, quick_wins, growth_roadmap, verdict, biggest_opportunity, estimated_impact, health_score, critical_count, high_count, total_failed, total_passed, share_token, score_delta, previous_score"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("has_run_first_scan")
          .eq("user_id", user.id)
          .single(),
      ]);
      if (cancelled) return;

      const profileData = profileRes.ok
        ? ((await profileRes.json()) as { plan?: string; first_name?: string | null; is_pro?: boolean })
        : null;
      console.log("[PROFILE] response status:", profileRes.status);
      console.log("[PROFILE] profileData:", profileData);
      console.log("[PROFILE] plan value:", profileData?.plan);
      const profile = profileData;

      const urlUpgraded = window.location.search.includes("upgraded=true");
      const rawPlan = String(profile?.plan ?? "free").trim();
      const proFromRow =
        profile?.is_pro === true ||
        rawPlan === "pro" ||
        rawPlan === "Pro" ||
        rawPlan.toLowerCase() === "pro";
      setPlan(urlUpgraded ? "pro" : proFromRow ? "pro" : rawPlan || "free");

      const fetchedReports = normalizeStoredReportRows(reportsResult.data ?? []);
      setReports(fetchedReports);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fetchedReports));
        localStorage.setItem(cacheTsKey, Date.now().toString());
      } catch {
        // ignore cache write failures
      }

      const hasRunFirstScan = Boolean((profileFlagsResult.data as { has_run_first_scan?: boolean } | null)?.has_run_first_scan);
      if (fetchedReports.length === 0 && !hasRunFirstScan) {
        let scanDest = "/scan";
        if (typeof document !== "undefined") {
          const cookieMatch = document.cookie.match(/(?:^|;\s*)pendingUrl=([^;]*)/);
          if (cookieMatch) {
            const raw = decodeURIComponent(cookieMatch[1]);
            document.cookie = "pendingUrl=;path=/;max-age=0";
            const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
            scanDest = `/scan?url=${encodeURIComponent(normalized)}`;
          } else if (typeof sessionStorage !== "undefined") {
            const raw = sessionStorage.getItem("pendingUrl");
            if (raw) {
              sessionStorage.removeItem("pendingUrl");
              const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
              scanDest = `/scan?url=${encodeURIComponent(normalized)}`;
            }
          }
        }
        window.location.replace(scanDest);
        return;
      }

      setReportsReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const domains = useMemo(() => distinctDomains(reports), [reports]);

  const isProPlan =
    String(plan).trim() === "Pro" || String(plan).trim().toLowerCase() === "pro";
  const restrictionsActive = reportsReady && !loading && plan !== "loading" && !isProPlan;

  useEffect(() => {
    if (domains.length > 0 && !activeDomain) {
      setActiveDomain(domains[0]);
    }
  }, [domains, activeDomain]);

  useEffect(() => {
    if (!showScanInput) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowScanInput(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showScanInput]);

  useEffect(() => {
    const isDashboardScanBarForm = (form: HTMLFormElement) =>
      form.classList.contains("hero-bar-focus-within") &&
      Boolean(form.closest(".dashboard-page-root"));

    const onSubmitCapture = (ev: Event) => {
      if (!(ev instanceof SubmitEvent)) return;
      const form = ev.target;
      if (!(form instanceof HTMLFormElement) || !isDashboardScanBarForm(form)) return;
      const inp =
        form.querySelector<HTMLInputElement>("input[type=\"text\"]") ??
        form.querySelector<HTMLInputElement>("input:not([type])");
      const raw = inp?.value ?? "";
      const normalized = normalizeScanUrlForGuard(raw);
      if (!normalized) return;
      try { new URL(normalized); } catch { return; }
      if (!isBlockedDomain(normalized)) return;
      ev.preventDefault();
      ev.stopPropagation();
      setEnterpriseBlockHighlight("empty");
      setEnterpriseBlockOpen(true);
    };

    const onFocusOutCapture = (ev: Event) => {
      if (!(ev instanceof FocusEvent)) return;
      const t = ev.target;
      if (!(t instanceof HTMLInputElement)) return;
      const form = t.closest("form");
      if (!(form instanceof HTMLFormElement) || !isDashboardScanBarForm(form)) return;
      const raw = t.value ?? "";
      if (!raw.trim()) return;
      const normalized = normalizeScanUrlForGuard(raw);
      try { new URL(normalized); } catch { return; }
      if (isBlockedDomain(normalized)) {
        setEnterpriseBlockHighlight("empty");
        setEnterpriseBlockOpen(true);
      }
    };

    document.addEventListener("submit", onSubmitCapture, true);
    document.addEventListener("focusout", onFocusOutCapture, true);
    return () => {
      document.removeEventListener("submit", onSubmitCapture, true);
      document.removeEventListener("focusout", onFocusOutCapture, true);
    };
  }, []);

  const prefetchedFindings = useRef<Map<string, unknown>>(new Map());

  const effectiveDomain = activeDomain || domains[0] || "";

  const activeDomainReports = effectiveDomain
    ? reportsMatchingSelectedDomain(reports, effectiveDomain)
    : [];

  const reportsForEffectiveDomain = effectiveDomain
    ? activeDomainReports
    : reports;

  const activeLatest = activeDomainReports[0];
  const activePrevious = activeDomainReports[1] ?? null;

  const activeScore = activeLatest?.analysis?.healthScore ?? 0;
  const activePrevScore = activePrevious?.analysis?.healthScore ?? null;

  const activeMoneyLeaks = useMemo(
    () => getDashboardMoneyLeaks(activeLatest?.analysis),
    [activeLatest]
  );

  const activeMoneyLeaksTotal = activeMoneyLeaks.length;

  const totalFindingsDetected =
    typeof activeLatest?.analysis?.totalFailed === "number"
      ? activeLatest.analysis.totalFailed
      : Array.isArray(activeLatest?.analysis?.allFailedLeaks)
        ? activeLatest.analysis.allFailedLeaks!.length
        : null;

  const activeDimensionScores = useMemo(() => {
    const fromAnalysis = activeLatest?.analysis?.dimensionScores;
    const fromCol = activeLatest?.dimension_scores;
    if (Array.isArray(fromAnalysis) && fromAnalysis.length > 0) return fromAnalysis;
    if (Array.isArray(fromCol) && fromCol.length > 0) return fromCol as DimensionScoreRow[];
    if (fromCol && !Array.isArray(fromCol) && typeof fromCol === "object") {
      const raw = fromCol as unknown as Record<string, unknown>;
      const normalized: DimensionScoreRow[] = [
        { id: "capture", label: "Conversion Architecture", description: "", score: Number(raw.conversion_architecture ?? raw.architecture ?? 0) || 0, failCount: 0, totalCount: 1, status: "critical" },
        { id: "trust", label: "Trust Signals", description: "", score: Number(raw.trust_signals ?? raw.trust ?? 0) || 0, failCount: 0, totalCount: 1, status: "critical" },
        { id: "position", label: "Message Clarity", description: "", score: Number(raw.message_clarity ?? raw.clarity ?? 0) || 0, failCount: 0, totalCount: 1, status: "critical" },
        { id: "visibility", label: "Traffic Readiness", description: "", score: Number(raw.traffic_readiness ?? raw.traffic ?? 0) || 0, failCount: 0, totalCount: 1, status: "critical" },
        { id: "infrastructure", label: "Technical Foundation", description: "", score: Number(raw.technical_foundation ?? raw.foundation ?? 0) || 0, failCount: 0, totalCount: 1, status: "critical" },
      ];
      return normalized.map<DimensionScoreRow>((row) => {
        const s = Math.max(0, Math.min(100, Math.round(Number(row.score) || 0)));
        return { ...row, score: s, status: s >= 75 ? "strong" : s >= 50 ? "fair" : s >= 30 ? "weak" : "critical" };
      });
    }
    return undefined;
  }, [activeLatest]);

  const sortedPriorityLeaks = useMemo(
    () => [...activeMoneyLeaks].sort((a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0)),
    [activeMoneyLeaks]
  );

  // Background prefetch: warm DB cache for top 10 findings so issue pages load instantly
  useEffect(() => {
    const reportId = activeLatest?.id;
    if (!reportId || !sortedPriorityLeaks.length) return;
    const ac = new AbortController();
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Route bundle prefetch for top 5 (JS chunk)
    sortedPriorityLeaks.slice(0, 5).forEach((finding) => {
      const fid = String(finding.id ?? "").trim() || String(finding.title ?? "").trim();
      if (fid) router.prefetch(`/issue/${encodeURIComponent(reportId)}/${encodeURIComponent(fid)}`);
    });

    // Critical-first ordering for data prefetch
    const ordered = [...sortedPriorityLeaks.slice(0, 10)].sort((a, b) => {
      const aC = (a.severity === "critical" || a.rubricSeverity === "Critical") ? 0 : 1;
      const bC = (b.severity === "critical" || b.rubricSeverity === "Critical") ? 0 : 1;
      return aC - bC;
    });

    const overallScore = activeScore;
    const reportDomain = activeLatest?.domain ?? "";
    ordered.forEach((finding, i) => {
      const fid = String(finding.id ?? "").trim() || String(finding.title ?? "").trim();
      if (!fid) return;
      const t = setTimeout(() => {
        if (ac.signal.aborted || prefetchedFindings.current.has(fid)) return;
        void fetch("/api/expand-finding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            report_id: reportId,
            finding_id: fid,
            domain: reportDomain,
            overallScore,
            finding: {
              title: finding.title,
              severity: String(finding.rubricSeverity ?? finding.severity ?? ""),
              category: finding.category ?? "",
              whatWeFound: finding.whatWeFound ?? "",
              whyItMatters: finding.whyItMatters ?? "",
              howToFixIt: finding.howToFixIt ?? "",
              exampleFix: finding.exampleFix ?? "",
              psychologyPrinciple: finding.psychologyPrinciple ?? "",
              revenueImpact: finding.revenueImpact,
              page_location: finding.page_location,
            },
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: unknown) => {
            if (!ac.signal.aborted && data) prefetchedFindings.current.set(fid, data);
          })
          .catch(() => { /* ignore prefetch failures */ });
      }, 800 + i * 300);
      timers.push(t);
    });

    return () => {
      ac.abort();
      timers.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLatest?.id]);

  const dashboardFindingRows = useMemo(
    () => convertLeaksToFindingData(activeMoneyLeaks),
    [activeMoneyLeaks]
  );

  const diagnosticVerdictText = useMemo(() => {
    const a = activeLatest?.analysis;
    if (!a) return "";
    const ib = typeof a.intelligenceBrief === "string" ? a.intelligenceBrief.trim() : "";
    if (ib) return ib;
    const v = a.overviewCopy?.verdict?.trim();
    return v ?? "";
  }, [activeLatest]);

  const domainScores = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of domains) {
      const dr = reportsMatchingSelectedDomain(reports, d);
      m[d] = dr[0]?.analysis?.healthScore ?? 0;
    }
    return m;
  }, [domains, reports]);

  const dashboardScoreDelta =
    activePrevious !== null && activePrevScore !== null
      ? activeScore - activePrevScore
      : undefined;

  async function handleNewUserScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = newUserScanUrl.trim();
    if (!raw) return;
    setNewUserSubmitting(true);
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    if (authUserId) {
      const supabase = getSupabaseBrowserClient();
      await supabase
        .from("profiles")
        .upsert({ user_id: authUserId, has_run_first_scan: true }, { onConflict: "user_id" });
    }
    setShowNewUserOverlay(false);
    router.push(`/scan?url=${encodeURIComponent(url)}`);
  }

  function handleRescan(domain: string) {
    const currentSiteUrl = String(domain ?? "").trim().startsWith("http")
      ? String(domain ?? "").trim()
      : `https://${String(domain ?? "").trim()}`;
    if (isBlockedDomain(currentSiteUrl)) {
      setEnterpriseBlockHighlight(null);
      setEnterpriseBlockOpen(true);
      return;
    }
    const path = `/scan?url=${encodeURIComponent(currentSiteUrl)}&rescan=true`;
    console.log("[scan-nav] router.push", path);
    router.push(path);
  }

  async function handleDeleteSite(domain: string) {
    if (!authUserId) return;
    const normalizedDomain = domain.toLowerCase().trim();
    setDeletingDomain(domain);
    setDeleteErrorDomain(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("user_id", authUserId)
        .eq("domain", normalizedDomain);
      if (error) {
        console.error("[DASHBOARD] Delete failed:", error);
        setDeleteErrorDomain(domain);
        return;
      }
      try {
        localStorage.removeItem(`${DASHBOARD_REPORTS_CACHE_PREFIX}${authUserId}`);
        localStorage.removeItem(`${DASHBOARD_REPORTS_CACHE_TS_PREFIX}${authUserId}`);
      } catch { /* ignore */ }
      // Force fresh fetch from Supabase so deleted items don't reappear from cache
      const { data: freshData } = await supabase
        .from("reports")
        .select(
          "id, domain, created_at, analysis, dimension_scores, money_leaks, quick_wins, growth_roadmap, verdict, biggest_opportunity, estimated_impact, health_score, critical_count, high_count, total_failed, total_passed, share_token, score_delta, previous_score"
        )
        .eq("user_id", authUserId)
        .order("created_at", { ascending: false });
      const updatedReports = normalizeStoredReportRows(freshData ?? []);
      setReports(updatedReports);
      setActiveDomain(distinctDomains(updatedReports)[0] ?? "");
    } catch (err) {
      console.error("[DASHBOARD] Delete failed:", err);
      setDeleteErrorDomain(domain);
    } finally {
      setDeletingDomain(null);
    }
  }

  const handleUpgrade = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/auth?mode=signup";
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) throw new Error("Server error");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Upgrade error:", err);
    }
  };

  if (loading) {
    return <PageLoadSkeleton bars={5} maxWidth={480} />;
  }

  const pagesAnalyzed =
    typeof activeLatest?.total_passed === "number" && typeof activeLatest?.total_failed === "number"
      ? activeLatest.total_passed + activeLatest.total_failed
      : null;

  const headerCriticalCount =
    typeof activeLatest?.critical_count === "number" ? activeLatest.critical_count : 0;
  const headerHighCount =
    typeof activeLatest?.high_count === "number" ? activeLatest.high_count : 0;
  const headerTotalFindings = totalFindingsDetected ?? activeMoneyLeaksTotal;

  return (
    <div
      className="dashboard-page-root"
      style={{
        minHeight: "100vh",
        background: "#050810",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .dashboard-score-header {
            padding: 16px 20px !important;
            gap: 12px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .dashboard-header-site {
            width: 100% !important;
            order: 1;
          }
          .dashboard-header-divider {
            display: none !important;
          }
          .dashboard-header-gauge {
            width: 100% !important;
            order: 2;
            align-items: center !important;
          }
          .dashboard-header-right {
            width: 100% !important;
            order: 3;
            gap: 12px !important;
          }
          .dashboard-header-stats {
            width: 100% !important;
            gap: 8px !important;
          }
          .dashboard-stat-pill {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            padding: 8px 10px !important;
          }
          .dashboard-stat-value {
            font-size: 15px !important;
          }
          .dashboard-stat-label {
            font-size: 8px !important;
          }
          .dashboard-header-actions {
            width: 100% !important;
            margin-left: 0 !important;
            display: flex !important;
            flex-direction: column-reverse !important;
            gap: 8px !important;
          }
          .dashboard-header-actions a,
          .dashboard-header-actions button {
            width: 100% !important;
            min-height: 44px !important;
            justify-content: center !important;
          }
          .dashboard-site-select {
            max-width: 100% !important;
            width: 100% !important;
          }
          .dashboard-main-content {
            padding: 20px 16px !important;
          }
          .dashboard-finding-skeleton {
            padding: 16px !important;
          }
        }
      `}</style>
      {/* Ambient blobs */}
      <div aria-hidden style={{ position: "fixed", width: 500, height: 400, left: "4%", top: "20%", borderRadius: "50%", background: "rgba(0,150,255,0.04)", filter: "blur(80px)", animation: "heroNeuralDrift 16s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", width: 400, height: 500, right: "6%", bottom: "10%", borderRadius: "50%", background: "rgba(0,100,200,0.018)", filter: "blur(100px)", animation: "heroNeuralDrift 22s ease-in-out infinite reverse", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", top: "4rem", left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.08) 15%, rgba(0,200,255,0.3) 40%, rgba(0,200,255,0.4) 50%, rgba(0,200,255,0.3) 60%, rgba(0,200,255,0.08) 85%, transparent 100%)", boxShadow: "0 0 8px rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 1 }} />

      {/* ── SCORE HEADER BAR ─────────────────────────────────────────────────── */}
      <div
        className="dashboard-score-header"
        style={{
          background: "rgba(5,8,16,0.95)",
          borderBottom: "1px solid rgba(0,200,255,0.08)",
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          position: "relative",
          zIndex: 2,
          flexWrap: "wrap",
        }}
      >
        {/* Left cluster — site selector */}
        <div className="dashboard-header-site" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flexShrink: 0 }}>
          <div style={{ fontFamily: SM, fontSize: 9, color: "rgba(0,200,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            ACTIVE DIAGNOSTIC
          </div>
          <div
            style={{
              background: "rgba(5,8,16,0.6)",
              border: "1px solid rgba(0,200,255,0.15)",
              borderRadius: 2,
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {domains.length > 1 ? (
              <select
                className="dashboard-site-select"
                value={effectiveDomain}
                onChange={(e) => setActiveDomain(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#FFFFFF",
                  fontFamily: SM,
                  fontSize: 13,
                  cursor: "pointer",
                  outline: "none",
                  maxWidth: 220,
                }}
              >
                {domains.map((d) => (
                  <option key={d} value={d} style={{ background: "#050810" }}>{d}</option>
                ))}
              </select>
            ) : (
              <div style={{ fontFamily: SM, fontSize: 13, color: "#FFFFFF" }}>
                {effectiveDomain || "—"}
              </div>
            )}
            {effectiveDomain ? (
              <button
                type="button"
                title="Delete all scans for this site"
                disabled={deletingDomain === effectiveDomain}
                onClick={() => void handleDeleteSite(effectiveDomain)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,45,45,0.25)",
                  color: "rgba(255,80,80,0.55)",
                  fontFamily: SM,
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  padding: "2px 7px",
                  borderRadius: 2,
                  cursor: deletingDomain === effectiveDomain ? "not-allowed" : "pointer",
                  flexShrink: 0,
                  opacity: deletingDomain === effectiveDomain ? 0.5 : 1,
                  transition: "border-color 150ms, color 150ms",
                }}
                onMouseEnter={(e) => {
                  if (deletingDomain !== effectiveDomain) {
                    e.currentTarget.style.borderColor = "rgba(255,45,45,0.6)";
                    e.currentTarget.style.color = "#FF4444";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,45,45,0.25)";
                  e.currentTarget.style.color = "rgba(255,80,80,0.55)";
                }}
              >
                {deletingDomain === effectiveDomain ? "..." : "×"}
              </button>
            ) : null}
          </div>
          <div style={{ fontFamily: SM, fontSize: 9, color: deleteErrorDomain === effectiveDomain ? "#FF4444" : "rgba(255,255,255,0.3)" }}>
            {deleteErrorDomain === effectiveDomain
              ? "DELETE FAILED · TRY AGAIN"
              : `LAST SCANNED · ${activeLatest ? formatRelativeScanTime(activeLatest.created_at) : "—"}`}
          </div>
          <button
            type="button"
            onClick={() => setShowScanInput(true)}
            style={{ alignSelf: "flex-start", background: "transparent", border: "1px solid #00C8FF", color: "#00C8FF", fontFamily: SM, fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 2, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,200,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            + SCAN NEW SITE
          </button>
        </div>

        {/* Divider */}
        <div className="dashboard-header-divider" style={{ width: 1, height: 60, background: "rgba(0,200,255,0.08)", flexShrink: 0 }} />

        {/* Center cluster — score gauge */}
        {activeLatest ? (
          <div className="dashboard-header-gauge" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0, height: 117 }}>
            <div style={{ width: 117, height: 117, overflow: "visible", transform: "scale(0.65)", transformOrigin: "top center", textAlign: "center" }}>
              <ConversionScoreGauge
                score={activeScore}
                scoreDelta={dashboardScoreDelta}
                previousScanAt={formatRelativeScanTime(activeLatest.created_at)}
              />
            </div>
          </div>
        ) : null}

        {/* Divider */}
        <div className="dashboard-header-divider" style={{ width: 1, height: 60, background: "rgba(0,200,255,0.08)", flexShrink: 0 }} />

        {/* Right cluster — stats + actions */}
        <div className="dashboard-header-right" style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
          <div className="dashboard-header-stats" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Stat pills */}
            <div className="dashboard-stat-pill" style={{ border: "1px solid rgba(255,45,45,0.3)", background: "rgba(255,45,45,0.08)", borderRadius: 4, padding: "8px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span className="dashboard-stat-value" style={{ fontFamily: ORB, fontWeight: 700, fontSize: 18, color: "#FF2D2D", lineHeight: 1 }}>{headerCriticalCount}</span>
              <span className="dashboard-stat-label" style={{ fontFamily: SM, fontSize: 9, color: "#FF2D2D", letterSpacing: "0.08em", textTransform: "uppercase" }}>CRITICAL</span>
            </div>
            <div className="dashboard-stat-pill" style={{ border: "1px solid rgba(255,107,0,0.3)", background: "rgba(255,107,0,0.08)", borderRadius: 4, padding: "8px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span className="dashboard-stat-value" style={{ fontFamily: ORB, fontWeight: 700, fontSize: 18, color: "#FF6B00", lineHeight: 1 }}>{headerHighCount}</span>
              <span className="dashboard-stat-label" style={{ fontFamily: SM, fontSize: 9, color: "#FF6B00", letterSpacing: "0.08em", textTransform: "uppercase" }}>HIGH IMPACT</span>
            </div>
            <div className="dashboard-stat-pill" style={{ border: "1px solid rgba(0,200,255,0.3)", background: "rgba(0,200,255,0.08)", borderRadius: 4, padding: "8px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span className="dashboard-stat-value" style={{ fontFamily: ORB, fontWeight: 700, fontSize: 18, color: "rgba(0,200,255,0.6)", lineHeight: 1 }}>{headerTotalFindings}</span>
              <span className="dashboard-stat-label" style={{ fontFamily: SM, fontSize: 9, color: "rgba(0,200,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase" }}>MORE FINDINGS</span>
            </div>

            {/* Action buttons */}
            <div className="dashboard-header-actions" style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {isProPlan && effectiveDomain ? (
                <button
                  type="button"
                  onClick={() => void handleRescan(effectiveDomain)}
                  style={{ background: "transparent", border: "1px solid rgba(0,200,255,0.2)", color: "rgba(0,200,255,0.6)", fontFamily: SM, fontSize: 9, padding: "8px 16px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.1em" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)"; e.currentTarget.style.color = "#00C8FF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,200,255,0.2)"; e.currentTarget.style.color = "rgba(0,200,255,0.6)"; }}
                >
                  ↻ RESCAN
                </button>
              ) : null}
              <a
                href={effectiveDomain ? `/report/${encodeURIComponent(effectiveDomain)}` : "#"}
                style={{ display: "inline-flex", alignItems: "center", background: "transparent", border: "1px solid #00C8FF", color: "#00C8FF", fontFamily: SM, fontSize: 11, padding: "8px 16px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.06em", textDecoration: "none" }}
              >
                VIEW FULL REPORT →
              </a>
            </div>
          </div>
          <div style={{ fontFamily: SM, fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
            PAGES ANALYZED · {pagesAnalyzed ?? "—"} · CHECKS RUN · 166
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main
        className="dashboard-main-content"
        style={{
          padding: "32px 40px",
          maxWidth: 860,
          margin: "0 auto",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Empty state */}
        {reportsReady && reports.length === 0 ? (
          <div
            style={{
              marginBottom: 32,
              padding: "24px 28px",
              border: "1px solid rgba(0,200,255,0.12)",
              borderRadius: 4,
              background: "rgba(0,200,255,0.03)",
              boxShadow: "0 0 40px rgba(0,180,255,0.06)",
            }}
          >
            <div style={{ fontFamily: SM, fontSize: 9, letterSpacing: "0.2em", color: "rgba(0,200,255,0.85)", textTransform: "uppercase", marginBottom: 10 }}>
              ● YOUR DASHBOARD
            </div>
            <p style={{ fontFamily: SM, fontSize: 11, color: "rgba(240,244,255,0.55)", lineHeight: 1.6, margin: "0 0 20px 0", maxWidth: 560 }}>
              No saved conversion intelligence reports yet. Completed scans show up here with your
              conversion score, top exit triggers, and history. Enter a URL to run one.
            </p>
            <div style={{ maxWidth: 560, borderRadius: 4, boxShadow: enterpriseBlockHighlight === "empty" ? "0 0 0 2px rgba(0,200,255,0.45)" : undefined }}>
              <ScanUrlBar
                value={emptyScanUrl}
                onChange={setEmptyScanUrl}
                buttonLabel="RUN CONVERSION INTELLIGENCE →"
                onSubmit={(normalized: string) => {
                  if (isBlockedDomain(normalized)) {
                    setEnterpriseBlockHighlight("empty");
                    setEnterpriseBlockOpen(true);
                    return;
                  }
                  const path = `/scan?url=${encodeURIComponent(normalized)}`;
                  console.log("[scan-nav] router.push", path);
                  router.push(path);
                }}
              />
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

          {/* 1. INTELLIGENCE BRIEF */}
          <div>
            <div style={{ fontFamily: SM, fontSize: 10, color: "#00C8FF", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
              ● INTELLIGENCE BRIEF
            </div>
            <div
              style={{
                background: "rgba(0,200,255,0.03)",
                borderLeft: "3px solid rgba(0,200,255,0.5)",
                padding: "20px 24px",
                borderRadius: "0 4px 4px 0",
              }}
            >
              {diagnosticVerdictText ? (
                restrictionsActive ? (
                  (() => {
                    const { head, tail } = splitFirstNSentences(diagnosticVerdictText, 2);
                    return (
                      <>
                        <p style={{ fontFamily: SG, fontSize: 15, color: "#E0E6FF", lineHeight: 1.75, margin: 0 }}>{head}</p>
                        {tail ? (
                          <div style={{ position: "relative", marginTop: 10 }}>
                            <p style={{ fontFamily: SG, fontSize: 15, color: "#E0E6FF", lineHeight: 1.75, margin: 0, filter: "blur(4px)", opacity: 0.6, pointerEvents: "none", userSelect: "none" }}>
                              {tail}
                            </p>
                            <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(8,13,24,0.9)", borderTop: "1px solid #1A2035" }}>
                              <p style={{ margin: 0, fontFamily: SM, fontSize: 11, color: "#8899AA" }}>
                                Full diagnostic brief requires Pro access.
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleUpgrade()}
                                style={{ ...DASH_STRIPE_CTA, marginTop: 12 }}
                                {...dashStripeCtaHoverHandlers}
                              >
                                Upgrade to Pro →
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    );
                  })()
                ) : (
                  <p style={{ fontFamily: SG, fontSize: 15, color: "#E0E6FF", lineHeight: 1.75, margin: 0 }}>
                    {diagnosticVerdictText}
                  </p>
                )
              ) : (
                <p style={{ fontFamily: SG, fontSize: 15, color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.75 }}>
                  Run your first scan — we&apos;ll tell you exactly what your site is doing to visitors.
                </p>
              )}
            </div>
          </div>

          {/* 2. PRIORITY FINDINGS */}
          <div>
            <div style={{ fontFamily: SM, fontSize: 10, color: "#00C8FF", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
              ● PRIORITY FINDINGS
            </div>
            <p style={{ fontFamily: SM, fontSize: 9, color: "#8899AA", margin: "0 0 16px 0", letterSpacing: "0.06em" }}>
              Ranked by impact — fix these first
            </p>

            {reportsReady ? (
              activeLatest && sortedPriorityLeaks.length > 0 ? (
                restrictionsActive ? (
                  <>
                    {dashboardFindingRows.slice(0, 2).map((row, i) => (
                      <ReportFindingPreview
                        key={row.id}
                        finding={row}
                        index={i + 1}
                        issueReportId={activeLatest.id}
                      />
                    ))}
                    {dashboardFindingRows.length > 2 ? (
                      <div
                        style={{
                          background: "#0A0F1E",
                          border: "1px solid #1A2035",
                          borderLeft: "3px solid #00C8FF",
                          padding: "24px 28px",
                          borderRadius: 4,
                          marginTop: 12,
                        }}
                      >
                        <div style={{ fontFamily: SM, fontSize: 10, color: "#00C8FF", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                          DIAGNOSTIC ACCESS REQUIRED
                        </div>
                        <h3 style={{ margin: "8px 0 0 0", fontFamily: SG, fontWeight: 700, fontSize: 22, color: "#FFFFFF", lineHeight: 1.2 }}>
                          {(totalFindingsDetected ?? activeMoneyLeaksTotal)} findings are suppressing your conversions.
                        </h3>
                        <p style={{ margin: "8px 0 0 0", fontFamily: SM, fontSize: 13, color: "#8899AA", lineHeight: 1.7 }}>
                          Upgrade to Pro to access all diagnostic findings, revenue impact analysis, exact resolutions, and AI advisor access — ranked by revenue impact.
                        </p>
                        <button
                          type="button"
                          onClick={() => router.push("/pricing")}
                          style={{ display: "block", width: "100%", marginTop: 16, height: 44, background: "transparent", border: "1px solid #00C8FF", color: "#00C8FF", fontFamily: SM, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: 2 }}
                        >
                          UPGRADE TO PRO DIAGNOSTIC
                        </button>
                        <p style={{ margin: "8px 0 0 0", textAlign: "center", fontFamily: SM, fontSize: 11, color: "#8899AA" }}>
                          Free plan includes 2 diagnostic findings per scan.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {dashboardFindingRows.slice(0, 3).map((row, i) => (
                      <ReportFindingPreview
                        key={row.id}
                        finding={row}
                        index={i + 1}
                        issueReportId={activeLatest.id}
                      />
                    ))}
                    {activeMoneyLeaksTotal > 0 ? (
                      <div style={{ marginTop: 12 }}>
                        <a
                          href={effectiveDomain ? `/report/${encodeURIComponent(effectiveDomain)}` : "#"}
                          style={{ fontFamily: SM, fontSize: 11, color: "#00C8FF", textDecoration: "none" }}
                        >
                          → View all {totalFindingsDetected ?? activeMoneyLeaksTotal} findings in full report
                        </a>
                      </div>
                    ) : null}
                  </>
                )
              ) : activeLatest && sortedPriorityLeaks.length === 0 ? (
                <p style={{ fontFamily: SG, fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.5 }}>
                  Your top exit triggers appear after your first scan.
                </p>
              ) : !activeLatest && reports.length === 0 ? (
                <p style={{ fontFamily: SG, fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0 }}>
                  Priority findings from your scans will list here.
                </p>
              ) : null
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    className="dashboard-finding-skeleton"
                    key={i}
                    style={{
                      background: "#0A0F1E",
                      border: "1px solid #1A2035",
                      borderLeft: "3px solid rgba(0,200,255,0.2)",
                      borderRadius: 4,
                      padding: "20px 24px",
                    }}
                  >
                    <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="dashboard-reports-skeleton-bar" style={{ width: "72%", animationDelay: `${i * 0.15}s` }} />
                      <div className="dashboard-reports-skeleton-bar" style={{ width: "92%", animationDelay: `${i * 0.15 + 0.05}s` }} />
                      <div className="dashboard-reports-skeleton-bar" style={{ width: "64%", animationDelay: `${i * 0.15 + 0.1}s` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. CONVERSION HEALTH */}
          {activeDimensionScores && activeDimensionScores.length > 0 ? (
            <div>
              <div style={{ fontFamily: SM, fontSize: 10, color: "#00C8FF", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
                ● CONVERSION HEALTH
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activeDimensionScores.map((dim) => {
                  const dColor = scoreColor(dim.score);
                  return (
                    <div key={dim.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontFamily: SG, color: "#E0E6FF", fontSize: 12 }}>{dim.label}</span>
                        <span style={{ fontFamily: SM, color: dColor, fontSize: 12, flexShrink: 0, marginLeft: 8 }}>{dim.score}</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 4, overflow: "hidden" }}>
                        <div style={{ width: `${dim.score}%`, height: "100%", background: dColor, borderRadius: 2 }} />
                      </div>
                      {dim.description ? (
                        <div style={{ fontFamily: SM, color: "#8899AA", fontSize: 9, fontStyle: "italic" }}>{dim.description}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* 4. AI ADVISOR */}
          <AdvisorChat
            reports={reportsForEffectiveDomain}
            userId={authUserId}
            resetSignal={advisorResetSignal}
            activeDomain={activeLatest?.domain ?? effectiveDomain}
            planLocked={restrictionsActive}
            onUpgrade={() => void handleUpgrade()}
          />

          {/* 5. SCORE HISTORY */}
          <div>
            <div style={{ fontFamily: SM, fontSize: 10, color: "#00C8FF", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
              ● SCORE HISTORY
            </div>
            <div style={{ position: "relative", border: "1px solid rgba(0,200,255,0.08)", borderRadius: 4, background: "rgba(240,244,255,0.02)", padding: "16px 18px 12px" }}>
              <ScoreHistoryChart
                activeDomainReports={activeDomainReports}
                currentScore={activeScore}
                axisCaption={`Fix the top 3 above to reach ${Math.min(100, activeScore + 15)}+`}
              />
            </div>
            {restrictionsActive ? (
              <p style={{ margin: "10px 0 0 0", fontFamily: SM, fontSize: 11, color: "#8899AA" }}>
                Rescan to track score improvement —{" "}
                <a href="/pricing" style={{ color: "#00C8FF", textDecoration: "none", fontFamily: SM, fontSize: 11 }}>
                  requires Pro diagnostic access →
                </a>
              </p>
            ) : null}
          </div>

        </div>
      </main>

      {/* ── NEW USER OVERLAY ─────────────────────────────────────────────────── */}
      {showNewUserOverlay && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50000, background: "rgba(5,8,16,0.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <style>{`.first-scan-overlay-input::placeholder { color: #8899AA; opacity: 1; }`}</style>
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,200,255,0.04) 0%, transparent 70%)" }} />
          <span aria-hidden style={{ position: "fixed", top: 0, left: 0, width: 20, height: 20, borderTop: "2px solid rgba(0,200,255,0.2)", borderLeft: "2px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 50001 }} />
          <span aria-hidden style={{ position: "fixed", top: 0, right: 0, width: 20, height: 20, borderTop: "2px solid rgba(0,200,255,0.2)", borderRight: "2px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 50001 }} />
          <span aria-hidden style={{ position: "fixed", bottom: 0, left: 0, width: 20, height: 20, borderBottom: "2px solid rgba(0,200,255,0.2)", borderLeft: "2px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 50001 }} />
          <span aria-hidden style={{ position: "fixed", bottom: 0, right: 0, width: 20, height: 20, borderBottom: "2px solid rgba(0,200,255,0.2)", borderRight: "2px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 50001 }} />
          <div style={{ position: "relative", zIndex: 50002, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <span style={{ fontFamily: SM, fontSize: 11, color: "#00C8FF", letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: 20 }}>
                CONVERSION INTELLIGENCE
              </span>
              <h2 style={{ fontFamily: SG, fontWeight: 800, fontSize: 48, color: "#FFFFFF", margin: 0, lineHeight: 1.05, letterSpacing: "-1.5px", marginBottom: 16 }}>
                Run your first diagnostic.
              </h2>
              <p style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: 16, color: "#8899AA", lineHeight: 1.7, maxWidth: 440, margin: "0 0 36px 0" }}>
                Enter your website URL. WebDoc performs surgical diagnostic analysis and identifies every flaw suppressing your conversions.
              </p>
              <form onSubmit={(e) => void handleNewUserScanSubmit(e)} style={{ width: "100%", maxWidth: 520, margin: 0 }}>
                <div
                  ref={firstScanFieldRef}
                  onFocus={() => setFirstScanFieldFocused(true)}
                  onBlur={(e) => {
                    const next = e.relatedTarget as Node | null;
                    if (!firstScanFieldRef.current || !next || !firstScanFieldRef.current.contains(next)) {
                      setFirstScanFieldFocused(false);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", height: 56, boxSizing: "border-box", background: "rgba(10,13,26,0.95)", border: `1px solid ${firstScanFieldFocused ? "rgba(0,200,255,0.4)" : "#1A2035"}`, borderRadius: 6, padding: "0 6px 0 0", boxShadow: firstScanFieldFocused ? "0 0 0 1px rgba(0,200,255,0.15)" : "none", transition: "border-color 150ms ease, box-shadow 150ms ease" }}
                >
                  <span style={{ fontFamily: SM, fontSize: 13, color: "#00C8FF", opacity: 0.5, paddingLeft: 18, flexShrink: 0, userSelect: "none" }} aria-hidden>&gt;_</span>
                  <input
                    autoFocus
                    className="first-scan-overlay-input"
                    type="text"
                    value={newUserScanUrl}
                    onChange={(e) => setNewUserScanUrl(e.target.value)}
                    placeholder="yourwebsite.com"
                    style={{ flex: 1, minWidth: 0, height: "100%", background: "transparent", border: "none", outline: "none", color: "#FFFFFF", fontFamily: SM, fontSize: 14, padding: "0 14px" }}
                  />
                  <button
                    type="submit"
                    disabled={newUserSubmitting}
                    onMouseEnter={() => setFirstScanCtaHover(true)}
                    onMouseLeave={() => setFirstScanCtaHover(false)}
                    style={{ flexShrink: 0, height: 44, margin: "6px 6px 6px 0", padding: "0 20px", border: "none", borderRadius: 4, cursor: newUserSubmitting ? "not-allowed" : "pointer", background: firstScanCtaHover && !newUserSubmitting ? "#33D6FF" : "#00C8FF", color: "#050810", fontFamily: SM, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" as const, opacity: newUserSubmitting ? 0.85 : 1, transition: "background 150ms ease, opacity 150ms ease" }}
                  >
                    {newUserSubmitting ? "INITIATING..." : "RUN DIAGNOSTIC →"}
                  </button>
                </div>
                <p style={{ margin: "14px 0 0 0", fontFamily: SM, fontSize: 11, color: "#8899AA", textAlign: "center" }}>
                  Guest diagnostic available · No account required · 90 second scan
                </p>
              </form>
            </div>
          </div>
        </div>
      )}

      <EnterpriseBlockModal
        open={enterpriseBlockOpen}
        onClose={() => { setEnterpriseBlockOpen(false); setEnterpriseBlockHighlight(null); }}
        onPrimary={() => { setEnterpriseBlockOpen(false); setEnterpriseBlockHighlight(null); setEmptyScanUrl(""); setNewScanUrl(""); }}
        onSecondary={() => { setEnterpriseBlockOpen(false); setEnterpriseBlockHighlight(null); window.open("mailto:devon@webdocai.com", "_blank", "noopener,noreferrer"); }}
      />

      {/* ── NEW SITE SCAN MODAL ───────────────────────────────────────────────── */}
      {showScanInput && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(5,8,16,0.85)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowScanInput(false); }}
        >
          <div
            style={{ background: "#050810", border: "1px solid rgba(0,200,255,0.2)", padding: 32, width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: SM, fontSize: 10, color: "rgba(0,200,255,0.6)", letterSpacing: "0.25em" }}>● NEW CONVERSION INTELLIGENCE REPORT</div>
            <div style={{ fontFamily: SM, fontSize: 13, color: "#F0F4FF" }}>Enter the website URL to diagnose</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newScanUrl.trim()) return;
                const url = newScanUrl.trim().startsWith("http") ? newScanUrl.trim() : `https://${newScanUrl.trim()}`;
                if (isBlockedDomain(url)) {
                  setEnterpriseBlockHighlight("modal");
                  setEnterpriseBlockOpen(true);
                  return;
                }
                setShowScanInput(false);
                setNewScanUrl("");
                const path = `/scan?url=${encodeURIComponent(url)}`;
                console.log("[scan-nav] router.push", path);
                router.push(path);
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                autoFocus
                value={newScanUrl}
                onChange={(e) => setNewScanUrl(e.target.value)}
                onBlur={() => {
                  if (!newScanUrl.trim()) return;
                  const url = newScanUrl.trim().startsWith("http") ? newScanUrl.trim() : `https://${newScanUrl.trim()}`;
                  try { new URL(url); } catch { return; }
                  if (isBlockedDomain(url)) { setEnterpriseBlockHighlight("modal"); setEnterpriseBlockOpen(true); }
                }}
                placeholder="https://yourwebsite.com"
                style={{ flex: 1, background: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.2)", color: "#F0F4FF", fontFamily: SM, fontSize: 12, padding: "10px 14px", outline: "none", boxShadow: enterpriseBlockHighlight === "modal" ? "0 0 0 2px rgba(0,200,255,0.45)" : undefined }}
              />
              <button
                type="submit"
                style={{ background: "transparent", color: "#00C8FF", border: "1px solid #00C8FF", fontFamily: SM, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", padding: "10px 20px", cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,200,255,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                RUN CONVERSION INTELLIGENCE →
              </button>
            </form>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowScanInput(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowScanInput(false); }}
              style={{ fontFamily: SM, fontSize: 9, color: "rgba(240,244,255,0.3)", cursor: "pointer", letterSpacing: "0.1em", textAlign: "center" }}
            >
              ESC TO CANCEL
            </div>
          </div>
        </div>
      )}

      {/* Corner brackets */}
      <div aria-hidden style={{ position: "fixed", top: "4rem", left: 0, width: 24, height: 24, borderTop: "1px solid rgba(0,200,255,0.2)", borderLeft: "1px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 100 }} />
      <div aria-hidden style={{ position: "fixed", top: "4rem", right: 0, width: 24, height: 24, borderTop: "1px solid rgba(0,200,255,0.2)", borderRight: "1px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 100 }} />
      <div aria-hidden style={{ position: "fixed", bottom: 0, left: 0, width: 24, height: 24, borderBottom: "1px solid rgba(0,200,255,0.2)", borderLeft: "1px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 100 }} />
      <div aria-hidden style={{ position: "fixed", bottom: 0, right: 0, width: 24, height: 24, borderBottom: "1px solid rgba(0,200,255,0.2)", borderRight: "1px solid rgba(0,200,255,0.2)", pointerEvents: "none", zIndex: 100 }} />
    </div>
  );
}
