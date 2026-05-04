"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { DimensionScoreRow, Leak, ReportPayload } from "@/lib/reportSchema";
import { ScrollReveal } from "@/components/ScrollReveal";
import SiteTabs from "@/components/dashboard/SiteTabs";
import ScoreHistoryChart from "@/components/dashboard/ScoreHistoryChart";
import DashboardRevenueHealth from "@/components/dashboard/DashboardRevenueHealth";
import DashboardCommandPanel from "@/components/dashboard/DashboardCommandPanel";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";
import AdvisorChat from "@/components/dashboard/AdvisorChat";
import ScanUrlBar from "@/components/ScanUrlBar";
import PageLoadSkeleton from "@/components/PageLoadSkeleton";
import { RUBRIC_TOTAL_CHECKS } from "@/lib/displayScoreColor";
import { getBlockedMessage, isBlockedDomain } from "@/lib/scanGuard";
import { convertLeaksToFindingData } from "@/lib/convertLeakToFindingData";
import {
  ReportFindingPreview,
  GrowthBlueprintFreeTier,
  type GrowthBlueprintLockedFinding,
} from "@/components/ReportRightPanel";

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

function isLeakCriticalDisplay(leak: Leak): boolean {
  return leak.severity === "critical" || leak.rubricSeverity === "Critical";
}

function effortLabelDash(eff: Leak["revenueEffort"] | undefined): string {
  if (eff === "Today") return "TODAY";
  if (eff === "This Week") return "THIS WEEK";
  if (eff === "This Month") return "THIS MONTH";
  return "—";
}

function distinctDomains(reports: StoredReportRow[]): string[] {
  return Array.from(new Set(reports.map((r) => r.domain))).filter(Boolean);
}

/** Match stored report domain to selected tab (handles case / www / trim mismatches). */
function splitFirstNSentences(text: string, n: number): { head: string; tail: string } {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return { head: "", tail: "" };
  const parts = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (parts.length <= n) return { head: t, tail: "" };
  return { head: parts.slice(0, n).join(" "), tail: parts.slice(n).join(" ") };
}

function scrollToDashboardPaywall() {
  if (typeof document === "undefined") return;
  document.getElementById("findings-paywall-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

const DASH_STRIPE_CTA: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "1px solid #00C8FF",
  color: "#00C8FF",
  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
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

function domainKeysMatch(stored: string, selected: string): boolean {
  if (stored === selected) return true;
  const norm = (s: string) =>
    s.trim().toLowerCase().replace(/^www\./i, "");
  return norm(stored) === norm(selected);
}

/**
 * Reports for the selected site tab. Prefer the exact `domain` string shown on the tab
 * (same as SiteTabs) so the latest scan is not replaced by a different stored variant
 * (e.g. www vs non-www) that sorts newer but has empty or partial analysis.
 */
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
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            top: 14,
            left: 14,
            borderTop: "2px solid rgba(0,200,255,0.35)",
            borderLeft: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            top: 14,
            right: 14,
            borderTop: "2px solid rgba(0,200,255,0.35)",
            borderRight: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            bottom: 14,
            left: 14,
            borderBottom: "2px solid rgba(0,200,255,0.35)",
            borderLeft: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            bottom: 14,
            right: 14,
            borderBottom: "2px solid rgba(0,200,255,0.35)",
            borderRight: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <h2
          id="dashboard-enterprise-block-title"
          className="font-sans font-extrabold"
          style={{
            color: "#FFFFFF",
            fontSize: 22,
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
            margin: "0 0 16px 0",
            paddingRight: 8,
          }}
        >
          {copy.headline}
        </h2>
        <div
          style={{
            fontFamily: "var(--font-space-mono), ui-monospace, monospace",
            fontSize: 12,
            color: "#8899AA",
            lineHeight: 1.65,
            whiteSpace: "pre-line",
            marginBottom: 28,
          }}
        >
          {copy.body}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            onClick={onPrimary}
            className="font-mono text-[12px] font-bold uppercase tracking-wide"
            style={{
              flex: "1 1 200px",
              padding: "12px 20px",
              background: "#00C8FF",
              color: "#050810",
              border: "1px solid #00C8FF",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            {copy.ctaPrimary}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="font-mono text-[11px] font-semibold uppercase tracking-wide"
            style={{
              flex: "1 1 180px",
              padding: "12px 16px",
              background: "transparent",
              color: "rgba(0,200,255,0.85)",
              border: "1px solid rgba(0,200,255,0.35)",
              cursor: "pointer",
              borderRadius: 2,
            }}
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
  const [enterpriseBlockHighlight, setEnterpriseBlockHighlight] = useState<"empty" | "modal" | null>(
    null
  );
  const [priorityHoverKey, setPriorityHoverKey] = useState<string | null>(null);
  const [priorityFindingsExpanded, setPriorityFindingsExpanded] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);

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

      // Step 1: Get auth user
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const user = data?.user;
      if (!user) {
        window.location.href = "/auth";
        return;
      }
      setAuthUserId(user.id);
      setEmail(user.email ?? null);

      // Step 2: Get plan (server API bypasses RLS) in parallel with reports and new-user flag
      const [profileRes, reportsResult, profileFlagsResult] = await Promise.all([
        fetch("/api/profile", {
          method: "GET",
          credentials: "include",
        }),
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
        ? ((await profileRes.json()) as {
            plan?: string;
            first_name?: string | null;
            is_pro?: boolean;
          })
        : null;
      console.log("[PROFILE] response status:", profileRes.status);
      console.log("[PROFILE] profileData:", profileData);
      console.log("[PROFILE] plan value:", profileData?.plan);
      const profile = profileData;

      // Step 3: Set plan (profiles.plan + optional is_pro, matches report page)
      const urlUpgraded = window.location.search.includes("upgraded=true");
      const rawPlan = String(profile?.plan ?? "free").trim();
      const proFromRow =
        profile?.is_pro === true ||
        rawPlan === "pro" ||
        rawPlan === "Pro" ||
        rawPlan.toLowerCase() === "pro";
      setPlan(urlUpgraded ? "pro" : proFromRow ? "pro" : rawPlan || "free");
      // Step 4: Set reports
      const fetchedReports = normalizeStoredReportRows(reportsResult.data ?? []);
      setReports(fetchedReports);

      // Step 5: Show new-user overlay if they have no scans and haven't dismissed it
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
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const domains = useMemo(() => distinctDomains(reports), [reports]);

  const isProPlan =
    String(plan).trim() === "Pro" || String(plan).trim().toLowerCase() === "pro";
  const restrictionsActive = reportsReady && !loading && plan !== "loading" && !isProPlan;
  // TODO: Pull site limits from a central plan config (Stripe/billing) instead of hardcoding.
  const PRO_PLAN_MAX_SITES = 5;
  const proSiteLimitReached =
    isProPlan && domains.length >= PRO_PLAN_MAX_SITES;
  const proSiteLimitTooltip =
    "5-site limit reached — remove a site to add another";

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
      try {
        new URL(normalized);
      } catch {
        return;
      }
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
      try {
        new URL(normalized);
      } catch {
        return;
      }
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

  const effectiveDomain = activeDomain || domains[0] || "";

  const activeDomainReports = effectiveDomain
    ? reportsMatchingSelectedDomain(reports, effectiveDomain)
    : [];

  const reportsForEffectiveDomain = effectiveDomain
    ? activeDomainReports
    : reports;

  const activeLatest = activeDomainReports[0];
  const activePrevious = activeDomainReports[1] ?? null;

  useEffect(() => {
    setPriorityFindingsExpanded(false);
  }, [activeLatest?.id]);
  const activeScore = activeLatest?.analysis?.healthScore ?? 0;
  const activePrevScore = activePrevious?.analysis?.healthScore ?? null;
  const activeMoneyLeaks = useMemo(
    () => getDashboardMoneyLeaks(activeLatest?.analysis),
    [activeLatest]
  );
  const activeLeakCriticalCount = activeMoneyLeaks.filter(
    (l) => l.severity === "critical" || l.rubricSeverity === "Critical"
  ).length;
  const activeLeakHighImpactCount = activeMoneyLeaks.filter((l) => {
    if (l.severity === "critical" || l.rubricSeverity === "Critical") return false;
    return l.severity === "warning" || l.rubricSeverity === "High";
  }).length;
  const activeMoneyLeaksTotal = activeMoneyLeaks.length;
  const activeTopLeak = [...activeMoneyLeaks].sort(
    (a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0)
  )[0];

  const rubricMeta = activeLatest?.analysis?.metadata?.rubric;
  const allFailedForDashboard = activeLatest?.analysis?.allFailedLeaks ?? [];
  const issueCriticalCount =
    rubricMeta?.criticalCount ??
    allFailedForDashboard.filter((l) => l.rubricSeverity === "Critical").length;
  const issueHighImpactCount =
    rubricMeta?.highCount ?? allFailedForDashboard.filter((l) => l.rubricSeverity === "High").length;
  const priorityFindingsShown = activeMoneyLeaks.length;
  const totalFindingsDetected =
    typeof activeLatest?.analysis?.totalFailed === "number"
      ? activeLatest.analysis.totalFailed
      : Array.isArray(activeLatest?.analysis?.allFailedLeaks)
        ? activeLatest.analysis.allFailedLeaks!.length
        : null;
  /**
   * TODO: Remove placeholder when every scan persists totalFailed (or full allFailedLeaks).
   */
  const PLACEHOLDER_LOCKED_MORE_FINDINGS = 15;
  const lockedMoreFindingsCount =
    totalFindingsDetected != null
      ? Math.max(0, totalFindingsDetected - priorityFindingsShown)
      : PLACEHOLDER_LOCKED_MORE_FINDINGS;
  const activeDimensionScores = useMemo(() => {
    const fromAnalysis = activeLatest?.analysis?.dimensionScores;
    const fromCol = activeLatest?.dimension_scores;
    if (Array.isArray(fromAnalysis) && fromAnalysis.length > 0) return fromAnalysis;
    if (Array.isArray(fromCol) && fromCol.length > 0) return fromCol as DimensionScoreRow[];
    if (fromCol && !Array.isArray(fromCol) && typeof fromCol === "object") {
      const raw = fromCol as unknown as Record<string, unknown>;
      const normalized: DimensionScoreRow[] = [
        {
          id: "capture",
          label: "Conversion Architecture",
          description: "",
          score: Number(raw.conversion_architecture ?? raw.architecture ?? 0) || 0,
          failCount: 0,
          totalCount: 1,
          status: "critical",
        },
        {
          id: "trust",
          label: "Trust Signals",
          description: "",
          score: Number(raw.trust_signals ?? raw.trust ?? 0) || 0,
          failCount: 0,
          totalCount: 1,
          status: "critical",
        },
        {
          id: "position",
          label: "Message Clarity",
          description: "",
          score: Number(raw.message_clarity ?? raw.clarity ?? 0) || 0,
          failCount: 0,
          totalCount: 1,
          status: "critical",
        },
        {
          id: "visibility",
          label: "Traffic Readiness",
          description: "",
          score: Number(raw.traffic_readiness ?? raw.traffic ?? 0) || 0,
          failCount: 0,
          totalCount: 1,
          status: "critical",
        },
        {
          id: "infrastructure",
          label: "Technical Foundation",
          description: "",
          score: Number(raw.technical_foundation ?? raw.foundation ?? 0) || 0,
          failCount: 0,
          totalCount: 1,
          status: "critical",
        },
      ];
      return normalized.map<DimensionScoreRow>((row) => {
        const s = Math.max(0, Math.min(100, Math.round(Number(row.score) || 0)));
        return {
          ...row,
          score: s,
          status: s >= 75 ? "strong" : s >= 50 ? "fair" : s >= 30 ? "weak" : "critical",
        };
      });
    }
    return undefined;
  }, [activeLatest]);

  const sortedPriorityLeaks = useMemo(
    () =>
      [...activeMoneyLeaks].sort(
        (a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0)
      ),
    [activeMoneyLeaks]
  );

  const growthBlueprintLockedFindings = useMemo((): GrowthBlueprintLockedFinding[] => {
    return sortedPriorityLeaks.slice(0, 6).map((leak) => {
      const title = (leak.revenueTitle?.trim() || leak.title || "").trim() || "Finding";
      const severity: GrowthBlueprintLockedFinding["severity"] =
        leak.severity === "critical" || leak.rubricSeverity === "Critical"
          ? "critical"
          : "high";
      return { title, severity };
    });
  }, [sortedPriorityLeaks]);

  const visiblePriorityLeaks = useMemo(
    () =>
      priorityFindingsExpanded
        ? sortedPriorityLeaks
        : sortedPriorityLeaks.slice(0, 3),
    [priorityFindingsExpanded, sortedPriorityLeaks]
  );

  const dashboardFindingRows = useMemo(
    () => convertLeaksToFindingData(activeMoneyLeaks),
    [activeMoneyLeaks]
  );

  const diagnosticVerdictText = useMemo(() => {
    const a = activeLatest?.analysis;
    if (!a) return "";
    const ib =
      typeof a.intelligenceBrief === "string" ? a.intelligenceBrief.trim() : "";
    if (ib) return ib;
    const v = a.overviewCopy?.verdict?.trim();
    return v ?? "";
  }, [activeLatest]);

  async function handleNewUserScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = newUserScanUrl.trim();
    if (!raw) return;
    setNewUserSubmitting(true);
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    // Mark has_run_first_scan in profiles so overlay never shows again
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
    setDeletingDomain(domain);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("user_id", authUserId)
        .eq("domain", domain);
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[DASHBOARD] Delete failed:", error);
        return;
      }
      const updatedReports = reports.filter((r) => !domainKeysMatch(r.domain, domain));
      setReports(updatedReports);
      setActiveDomain(distinctDomains(updatedReports)[0] ?? "");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[DASHBOARD] Delete failed:", err);
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server error");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    }
  };

  if (loading || plan === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050810",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: "10px",
            color: "rgba(0,200,255,0.5)",
            letterSpacing: "0.2em",
          }}
        >
          LOADING CONVERSION INTELLIGENCE...
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageLoadSkeleton bars={5} maxWidth={480} />;
  }

  const reportsLoading = Boolean(authUserId) && !reportsReady;

  if (reportsLoading) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: "var(--bg-base)",
          paddingTop: 80,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.55,
            backgroundImage: `
              linear-gradient(rgba(0,180,255,0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,180,255,0.035) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)",
          }}
        />
        <ScrollReveal variant="headline">
          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: 1000,
              margin: "0 auto",
              padding: "72px 24px 96px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                className="dashboard-reports-skeleton-bar"
                style={{ width: "100%", animationDelay: "0s" }}
              />
              <div
                className="dashboard-reports-skeleton-bar"
                style={{ width: "88%", animationDelay: "0.15s" }}
              />
              <div
                className="dashboard-reports-skeleton-bar"
                style={{ width: "72%", animationDelay: "0.3s" }}
              />
            </div>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  return (
    <div
      className="dashboard-page-root"
      style={{
        background: "var(--bg-base)",
        minHeight: "100svh",
        paddingTop: 0,
        marginTop: 0,
        position: "relative",
      }}
    >
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
          width: 400,
          height: 500,
          right: "6%",
          bottom: "10%",
          borderRadius: "50%",
          background: "rgba(0,100,200,0.018)",
          filter: "blur(100px)",
          animation: "heroNeuralDrift 22s ease-in-out infinite reverse",
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
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.08) 15%, rgba(0,200,255,0.3) 40%, rgba(0,200,255,0.4) 50%, rgba(0,200,255,0.3) 60%, rgba(0,200,255,0.08) 85%, transparent 100%)",
          boxShadow: "0 0 8px rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 1,
        }}
        aria-hidden
      />

      <div
        className="dashboard-root-shell"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 32px 48px 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <SiteTabs
          domains={domains}
          reports={reports}
          effectiveDomain={effectiveDomain}
          onSelect={setActiveDomain}
          onDelete={(domain) => void handleDeleteSite(domain)}
          onScanNew={() => setShowScanInput(true)}
          addSiteDisabled={proSiteLimitReached}
          addSiteDisabledReason={proSiteLimitTooltip}
          deletingDomain={deletingDomain}
        />

        <DashboardCommandPanel
          domain={effectiveDomain || "—"}
          hasReport={Boolean(activeLatest)}
          score={activeScore}
          prevDelta={
            activePrevious == null ? (
              <span style={{ color: "#8899AA", fontSize: 8, letterSpacing: "0.15em" }}>BASELINE</span>
            ) : activePrevScore == null ? (
              <span style={{ color: "rgba(240,244,255,0.35)", fontSize: 10 }}>—</span>
            ) : activeScore > activePrevScore ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ color: "#00E676", fontSize: 8, letterSpacing: "0.15em" }}>IMPROVING</span>
                <span style={{ color: "#00E676", fontSize: 10 }}>↑ +{activeScore - activePrevScore} pts</span>
              </div>
            ) : activeScore < activePrevScore ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ color: "#FF2D2D", fontSize: 8, letterSpacing: "0.15em" }}>DECLINED</span>
                <span style={{ color: "#FF2D2D", fontSize: 10 }}>↓ -{activePrevScore - activeScore} pts</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ color: "#8899AA", fontSize: 8, letterSpacing: "0.15em" }}>UNCHANGED</span>
                <span style={{ color: "#8899AA", fontSize: 10 }}>No change</span>
              </div>
            )
          }
          isProUser={isProPlan}
          criticalCount={activeLeakCriticalCount}
          highCount={activeLeakHighImpactCount}
          lockedMoreFindingsCount={lockedMoreFindingsCount}
          priorityFindingsShown={priorityFindingsShown}
          checksTotal={RUBRIC_TOTAL_CHECKS}
          moneyLeakTotal={activeMoneyLeaksTotal}
          lastScannedLabel={
            activeLatest ? formatRelativeScanTime(activeLatest.created_at) : "—"
          }
          pageCount={activeLatest?.analysis?.pagesAnalyzed?.length ?? 0}
          onScanNew={() => {
            if (effectiveDomain) void handleRescan(effectiveDomain);
          }}
          reportHref={
            effectiveDomain
              ? `/report/${encodeURIComponent(effectiveDomain)}`
              : "#"
          }
        />
        {reports.length === 0 ? (
          <div
            style={{
              margin: "0 24px 8px",
              padding: "24px 28px",
              border: "1px solid rgba(0,200,255,0.12)",
              borderRadius: 4,
              background: "rgba(0,200,255,0.03)",
              boxShadow: "0 0 40px rgba(0,180,255,0.06)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "rgba(0,200,255,0.85)",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              ● YOUR DASHBOARD
            </div>
            <p
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 11,
                color: "rgba(240,244,255,0.55)",
                lineHeight: 1.6,
                margin: "0 0 20px 0",
                maxWidth: 560,
              }}
            >
              No saved conversion intelligence reports yet. Completed scans show up here with your
              conversion score, top exit triggers, and history. Enter a URL to run one, or use{" "}
              <span style={{ color: "rgba(240,244,255,0.8)" }}>+ SCAN NEW</span> in the panel
              above.
            </p>
            <div
              style={{
                maxWidth: 560,
                borderRadius: 4,
                boxShadow:
                  enterpriseBlockHighlight === "empty"
                    ? "0 0 0 2px rgba(0,200,255,0.45)"
                    : undefined,
              }}
            >
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            paddingTop: 24,
            boxSizing: "border-box",
          }}
        >
            {/* Intelligence brief */}
            <div style={{ marginBottom: 28 }}>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "rgba(0,200,255,0.85)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 12,
                }}
              >
                ● INTELLIGENCE BRIEF
              </span>
              <div
                style={{
                  borderLeft: "2px solid rgba(0,200,255,0.35)",
                  paddingLeft: 16,
                  marginTop: 12,
                }}
              >
                {diagnosticVerdictText ? (
                  restrictionsActive ? (
                    (() => {
                      const { head, tail } = splitFirstNSentences(diagnosticVerdictText, 2);
                      return (
                        <>
                          <p
                            style={{
                              fontFamily: "var(--font-space-grotesk), sans-serif",
                              fontSize: 14,
                              color: "rgba(240,244,255,0.85)",
                              lineHeight: 1.55,
                              margin: 0,
                            }}
                          >
                            {head}
                          </p>
                          {tail ? (
                            <div style={{ position: "relative", marginTop: 10 }}>
                              <p
                                style={{
                                  fontFamily: "var(--font-space-grotesk), sans-serif",
                                  fontSize: 14,
                                  color: "rgba(240,244,255,0.85)",
                                  lineHeight: 1.55,
                                  margin: 0,
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
                                <p
                                  style={{
                                    margin: 0,
                                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                                    fontSize: 11,
                                    color: "#8899AA",
                                  }}
                                >
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
                    <>
                      <p
                        style={{
                          fontFamily: "var(--font-space-grotesk), sans-serif",
                          fontSize: 14,
                          color: "rgba(240,244,255,0.85)",
                          lineHeight: 1.55,
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {diagnosticVerdictText}
                      </p>
                      <a
                        href={
                          effectiveDomain
                            ? `/report/${encodeURIComponent(effectiveDomain)}`
                            : "#"
                        }
                        style={{
                          display: "inline-block",
                          marginTop: 12,
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 9,
                          color: "rgba(0,200,255,0.5)",
                        }}
                      >
                        Read full diagnosis →
                      </a>
                    </>
                  )
                ) : (
                  <p
                    style={{
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.3)",
                      margin: 0,
                      lineHeight: 1.55,
                    }}
                  >
                    Run your first scan — we&apos;ll tell you exactly what your site is doing to
                    visitors.
                  </p>
                )}
              </div>
            </div>

            {/* Top exit triggers */}
            <div style={{ marginBottom: 28 }}>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "rgba(0,200,255,0.85)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                ● PRIORITY FINDINGS
              </span>
              <p
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 8,
                  color: "rgba(240,244,255,0.4)",
                  margin: "0 0 8px 0",
                  letterSpacing: "0.06em",
                }}
              >
                Ranked by impact — fix these first
              </p>
              {activeLatest && sortedPriorityLeaks.length > 0 ? (
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 8,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(240,244,255,0.38)",
                    margin: "0 0 14px 0",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0 14px",
                    rowGap: 4,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#FF2D2D",
                        flexShrink: 0,
                      }}
                    />
                    Critical
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#FF6B00",
                        flexShrink: 0,
                      }}
                    />
                    High Impact
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#00E676",
                        flexShrink: 0,
                      }}
                    />
                    Quick Win
                  </span>
                </div>
              ) : null}
              {activeLatest && sortedPriorityLeaks.length > 0 && restrictionsActive ? (
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
                      <div
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 10,
                          color: "#00C8FF",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        DIAGNOSTIC ACCESS REQUIRED
                      </div>
                      <h3
                        style={{
                          margin: "8px 0 0 0",
                          fontFamily: "var(--font-space-grotesk), sans-serif",
                          fontWeight: 700,
                          fontSize: 22,
                          color: "#FFFFFF",
                          lineHeight: 1.2,
                        }}
                      >
                        {(totalFindingsDetected ?? activeMoneyLeaksTotal)} findings are suppressing your conversions.
                      </h3>
                      <p
                        style={{
                          margin: "8px 0 0 0",
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 13,
                          color: "#8899AA",
                          lineHeight: 1.7,
                        }}
                      >
                        Upgrade to Pro to access all diagnostic findings, revenue impact analysis, exact resolutions, and AI advisor access — ranked by revenue impact.
                      </p>
                      <button
                        type="button"
                        onClick={() => router.push("/pricing")}
                        style={{
                          display: "block",
                          width: "100%",
                          marginTop: 16,
                          height: 44,
                          background: "transparent",
                          border: "1px solid #00C8FF",
                          color: "#00C8FF",
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          borderRadius: 2,
                        }}
                      >
                        UPGRADE TO PRO DIAGNOSTIC
                      </button>
                      <p
                        style={{
                          margin: "8px 0 0 0",
                          textAlign: "center",
                          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                          fontSize: 11,
                          color: "#8899AA",
                        }}
                      >
                        Free plan includes 2 diagnostic findings per scan.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : activeLatest && visiblePriorityLeaks.length > 0 ? (
                visiblePriorityLeaks.map((leak) => {
                  const critical = isLeakCriticalDisplay(leak);
                  const fid = String(leak.id ?? leak.title);
                  const resKey = `${activeLatest.id}:${fid}`;
                  const title =
                    (leak.revenueTitle?.trim() || leak.title || "").trim() || fid;
                  const subRaw = String(leak.whyItMatters ?? leak.whatWeFound ?? "").trim();
                  const issuePath = `/issue/${encodeURIComponent(activeLatest.id)}/${encodeURIComponent(fid)}`;
                  const hovered = priorityHoverKey === resKey;
                  return (
                    <div
                      key={resKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        router.push(issuePath);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(issuePath);
                        }
                      }}
                      onMouseEnter={() => setPriorityHoverKey(resKey)}
                      onMouseLeave={() => setPriorityHoverKey(null)}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px 16px",
                        boxSizing: "border-box",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        borderLeft: hovered
                          ? "2px solid rgba(0,200,255,0.3)"
                          : "2px solid transparent",
                        background: hovered ? "rgba(0,200,255,0.04)" : "transparent",
                        cursor: "pointer",
                        transition: "background 150ms ease, border-color 150ms ease",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: critical ? "#FF2D2D" : "#FF6B00",
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                        aria-hidden
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-space-grotesk), sans-serif",
                            fontSize: 14,
                            color: "#FFFFFF",
                            lineHeight: 1.35,
                          }}
                        >
                          {title}
                        </div>
                        {subRaw ? (
                          <div
                            style={{
                              fontFamily: "var(--font-space-grotesk), sans-serif",
                              fontSize: 13,
                              color: "rgba(255,255,255,0.45)",
                              lineHeight: 1.45,
                              marginTop: 4,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {subRaw}
                          </div>
                        ) : null}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                            fontSize: 9,
                            letterSpacing: "0.06em",
                            color: "rgba(240,244,255,0.5)",
                          }}
                        >
                          {effortLabelDash(leak.revenueEffort)}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                            fontSize: 10,
                            color: hovered ? "rgba(0,200,255,0.85)" : "rgba(0,200,255,0.25)",
                            marginLeft: "auto",
                            transition: "color 150ms ease",
                          }}
                          aria-hidden
                        >
                          →
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : null}
              {activeLatest && sortedPriorityLeaks.length === 0 ? (
                <p
                  style={{
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.3)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Your top exit triggers appear after your first scan.
                </p>
              ) : null}
              {!activeLatest && reports.length === 0 ? (
                <p
                  style={{
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.3)",
                    margin: 0,
                  }}
                >
                  Priority findings from your scans will list here.
                </p>
              ) : null}
              {activeLatest && activeMoneyLeaksTotal > 3 && !restrictionsActive ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setPriorityFindingsExpanded((e) => !e)}
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      color: "rgba(0,200,255,0.5)",
                      textDecoration: "none",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {priorityFindingsExpanded
                      ? "Show less ↑"
                      : `Show ${activeMoneyLeaksTotal - 3} more ↓`}
                  </button>
                </div>
              ) : null}
            </div>

            <DashboardRevenueHealth dimensionScores={activeDimensionScores} />

            {activeLatest ? (
              <div style={{ marginBottom: 28 }}>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "rgba(0,200,255,0.85)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 12,
                  }}
                >
                  ● GROWTH BLUEPRINT
                </span>
                {restrictionsActive ? (
                  <GrowthBlueprintFreeTier lockedFindings={growthBlueprintLockedFindings} showUpgradeNudge />
                ) : (() => {
                    const _sm = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
                    const _sg = "var(--font-space-grotesk), sans-serif";
                    const week1 = dashboardFindingRows.filter(
                      (f) => f.severity === "critical" || f.rubricSeverity === "Critical"
                    );
                    const week24 = dashboardFindingRows.filter(
                      (f) =>
                        (f.severity === "warning" || f.rubricSeverity === "High") &&
                        f.severity !== "critical" &&
                        f.rubricSeverity !== "Critical"
                    );
                    const month2 = dashboardFindingRows.filter(
                      (f) =>
                        f.severity !== "critical" &&
                        f.rubricSeverity !== "Critical" &&
                        f.severity !== "warning" &&
                        f.rubricSeverity !== "High"
                    );
                    const bpBorderColor = (f: (typeof dashboardFindingRows)[0]) =>
                      f.severity === "critical" || f.rubricSeverity === "Critical"
                        ? "#FF2D2D"
                        : f.severity === "warning" || f.rubricSeverity === "High"
                          ? "#FF6B00"
                          : "#FFB800";
                    const bpBadgeLabel = (f: (typeof dashboardFindingRows)[0]) =>
                      f.severity === "critical" || f.rubricSeverity === "Critical"
                        ? "CRITICAL"
                        : f.severity === "warning" || f.rubricSeverity === "High"
                          ? "HIGH"
                          : "MEDIUM";
                    const renderBpCard = (f: (typeof dashboardFindingRows)[0]) => {
                      const col = bpBorderColor(f);
                      const badge = bpBadgeLabel(f);
                      const title = (f.revenueTitle?.trim() || f.title || "").trim() || "Finding";
                      const resolution = String(f.howToFixIt ?? "").trim();
                      return (
                        <div key={f.id} style={{ background: "#0A0F1E", borderLeft: `3px solid ${col}`, padding: 16, marginBottom: 8 }}>
                          <span style={{ fontFamily: _sm, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", padding: "3px 8px", textTransform: "uppercase" as const, borderRadius: 2, border: `1px solid ${col}`, color: col, display: "inline-block", marginBottom: 8 }}>
                            {badge}
                          </span>
                          <div style={{ fontFamily: _sg, fontWeight: 700, fontSize: 15, color: "#FFFFFF", lineHeight: 1.35, marginBottom: resolution ? 8 : 0 }}>
                            {title}
                          </div>
                          {resolution ? <p style={{ fontFamily: _sg, fontSize: 13, color: "rgba(240,244,255,0.65)", lineHeight: 1.55, margin: 0 }}>{resolution}</p> : null}
                        </div>
                      );
                    };
                    const renderBpCol = (label: string, items: typeof week1) => (
                      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                        <div style={{ fontFamily: _sm, fontSize: 11, color: "#00C8FF", letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                          {label}
                        </div>
                        <div style={{ width: 40, height: 1, background: "#00C8FF", marginBottom: 14 }} />
                        {items.length === 0
                          ? <p style={{ fontFamily: _sg, fontSize: 13, color: "rgba(240,244,255,0.35)", margin: 0 }}>—</p>
                          : items.map(renderBpCard)}
                      </div>
                    );
                    return (
                      <div style={{ display: "flex", flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 16, alignItems: "flex-start" as const }}>
                        {renderBpCol("WEEK 1", week1)}
                        {renderBpCol("WEEKS 2–4", week24)}
                        {renderBpCol("MONTH 2+", month2)}
                      </div>
                    );
                  })()}
              </div>
            ) : null}

            {/* Score history */}
            <div>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 9,
                  color: "rgba(0,200,255,0.85)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 12,
                }}
              >
                ● SCORE HISTORY
              </span>
              <div
                style={{
                  position: "relative",
                  border: "1px solid rgba(0,200,255,0.08)",
                  borderRadius: 4,
                  background: "rgba(240,244,255,0.02)",
                  padding: "16px 18px 12px",
                }}
              >
                <ScoreHistoryChart
                  activeDomainReports={activeDomainReports}
                  currentScore={activeScore}
                  axisCaption={`Fix the top 3 above to reach ${Math.min(100, activeScore + 15)}+`}
                />
              </div>
              {restrictionsActive ? (
                <p
                  style={{
                    margin: "10px 0 0 0",
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 11,
                    color: "#8899AA",
                  }}
                >
                  Rescan to track score improvement —{" "}
                  <a
                    href="/pricing"
                    style={{
                      color: "#00C8FF",
                      textDecoration: "none",
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 11,
                    }}
                  >
                    requires Pro diagnostic access →
                  </a>
                </p>
              ) : null}
            </div>

            <AdvisorChat
              reports={reportsForEffectiveDomain}
              userId={authUserId}
              resetSignal={advisorResetSignal}
              activeDomain={activeLatest?.domain ?? effectiveDomain}
              planLocked={restrictionsActive}
              onUpgrade={() => void handleUpgrade()}
            />
        </div>

      </div>

      {showNewUserOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50000,
            background: "rgba(5,8,16,0.96)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <style>{`
            .first-scan-overlay-input::placeholder {
              color: #8899AA;
              opacity: 1;
            }
          `}</style>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,200,255,0.04) 0%, transparent 70%)",
            }}
          />
          {/* Viewport corner brackets — match scan-style framing */}
          <span
            aria-hidden
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: 20,
              height: 20,
              borderTop: "2px solid rgba(0,200,255,0.2)",
              borderLeft: "2px solid rgba(0,200,255,0.2)",
              pointerEvents: "none",
              zIndex: 50001,
            }}
          />
          <span
            aria-hidden
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 20,
              height: 20,
              borderTop: "2px solid rgba(0,200,255,0.2)",
              borderRight: "2px solid rgba(0,200,255,0.2)",
              pointerEvents: "none",
              zIndex: 50001,
            }}
          />
          <span
            aria-hidden
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: 20,
              height: 20,
              borderBottom: "2px solid rgba(0,200,255,0.2)",
              borderLeft: "2px solid rgba(0,200,255,0.2)",
              pointerEvents: "none",
              zIndex: 50001,
            }}
          />
          <span
            aria-hidden
            style={{
              position: "fixed",
              bottom: 0,
              right: 0,
              width: 20,
              height: 20,
              borderBottom: "2px solid rgba(0,200,255,0.2)",
              borderRight: "2px solid rgba(0,200,255,0.2)",
              pointerEvents: "none",
              zIndex: 50001,
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 50002,
              minHeight: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 11,
                  color: "#00C8FF",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  marginBottom: 20,
                }}
              >
                CONVERSION INTELLIGENCE
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontWeight: 800,
                  fontSize: 48,
                  color: "#FFFFFF",
                  margin: 0,
                  lineHeight: 1.05,
                  letterSpacing: "-1.5px",
                  marginBottom: 16,
                }}
              >
                Run your first diagnostic.
              </h2>
              <p
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  fontSize: 16,
                  color: "#8899AA",
                  lineHeight: 1.7,
                  maxWidth: 440,
                  margin: "0 0 36px 0",
                }}
              >
                Enter your website URL. WebDoc performs surgical diagnostic analysis and identifies every flaw
                suppressing your conversions.
              </p>
              <form
                onSubmit={(e) => void handleNewUserScanSubmit(e)}
                style={{ width: "100%", maxWidth: 520, margin: 0 }}
              >
                <div
                  ref={firstScanFieldRef}
                  onFocus={() => setFirstScanFieldFocused(true)}
                  onBlur={(e) => {
                    const next = e.relatedTarget as Node | null;
                    if (!firstScanFieldRef.current || !next || !firstScanFieldRef.current.contains(next)) {
                      setFirstScanFieldFocused(false);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 56,
                    boxSizing: "border-box",
                    background: "rgba(10,13,26,0.95)",
                    border: `1px solid ${firstScanFieldFocused ? "rgba(0,200,255,0.4)" : "#1A2035"}`,
                    borderRadius: 6,
                    padding: "0 6px 0 0",
                    boxShadow: firstScanFieldFocused ? "0 0 0 1px rgba(0,200,255,0.15)" : "none",
                    transition: "border-color 150ms ease, box-shadow 150ms ease",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 13,
                      color: "#00C8FF",
                      opacity: 0.5,
                      paddingLeft: 18,
                      flexShrink: 0,
                      userSelect: "none",
                    }}
                    aria-hidden
                  >
                    &gt;_
                  </span>
                  <input
                    autoFocus
                    className="first-scan-overlay-input"
                    type="text"
                    value={newUserScanUrl}
                    onChange={(e) => setNewUserScanUrl(e.target.value)}
                    placeholder="yourwebsite.com"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#FFFFFF",
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 14,
                      padding: "0 14px",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={newUserSubmitting}
                    onMouseEnter={() => setFirstScanCtaHover(true)}
                    onMouseLeave={() => setFirstScanCtaHover(false)}
                    style={{
                      flexShrink: 0,
                      height: 44,
                      margin: "6px 6px 6px 0",
                      padding: "0 20px",
                      border: "none",
                      borderRadius: 4,
                      cursor: newUserSubmitting ? "not-allowed" : "pointer",
                      background: firstScanCtaHover && !newUserSubmitting ? "#33D6FF" : "#00C8FF",
                      color: "#050810",
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 13,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase" as const,
                      opacity: newUserSubmitting ? 0.85 : 1,
                      transition: "background 150ms ease, opacity 150ms ease",
                    }}
                  >
                    {newUserSubmitting ? "INITIATING..." : "RUN DIAGNOSTIC →"}
                  </button>
                </div>
                <p
                  style={{
                    margin: "14px 0 0 0",
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                    fontSize: 11,
                    color: "#8899AA",
                    textAlign: "center",
                  }}
                >
                  Guest diagnostic available · No account required · 90 second scan
                </p>
              </form>
            </div>
          </div>
        </div>
      )}

      <EnterpriseBlockModal
        open={enterpriseBlockOpen}
        onClose={() => {
          setEnterpriseBlockOpen(false);
          setEnterpriseBlockHighlight(null);
        }}
        onPrimary={() => {
          setEnterpriseBlockOpen(false);
          setEnterpriseBlockHighlight(null);
          setEmptyScanUrl("");
          setNewScanUrl("");
        }}
        onSecondary={() => {
          setEnterpriseBlockOpen(false);
          setEnterpriseBlockHighlight(null);
          window.open("mailto:devon@webdocai.com", "_blank", "noopener,noreferrer");
        }}
      />

      {showScanInput && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5,8,16,0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowScanInput(false);
          }}
        >
          <div
            style={{
              background: "#050810",
              border: "1px solid rgba(0,200,255,0.2)",
              padding: 32,
              width: "100%",
              maxWidth: 520,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 10,
                color: "rgba(0,200,255,0.6)",
                letterSpacing: "0.25em",
              }}
            >
              ● NEW CONVERSION INTELLIGENCE REPORT
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 13,
                color: "#F0F4FF",
              }}
            >
              Enter the website URL to diagnose
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newScanUrl.trim()) return;
                const url = newScanUrl.trim().startsWith("http")
                  ? newScanUrl.trim()
                  : `https://${newScanUrl.trim()}`;
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
                  const url = newScanUrl.trim().startsWith("http")
                    ? newScanUrl.trim()
                    : `https://${newScanUrl.trim()}`;
                  try {
                    new URL(url);
                  } catch {
                    return;
                  }
                  if (isBlockedDomain(url)) {
                    setEnterpriseBlockHighlight("modal");
                    setEnterpriseBlockOpen(true);
                  }
                }}
                placeholder="https://yourwebsite.com"
                style={{
                  flex: 1,
                  background: "rgba(0,200,255,0.04)",
                  border: "1px solid rgba(0,200,255,0.2)",
                  color: "#F0F4FF",
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 12,
                  padding: "10px 14px",
                  outline: "none",
                  boxShadow:
                    enterpriseBlockHighlight === "modal"
                      ? "0 0 0 2px rgba(0,200,255,0.45)"
                      : undefined,
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#00C8FF",
                  color: "#050810",
                  border: "none",
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  padding: "10px 20px",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                RUN CONVERSION INTELLIGENCE →
              </button>
            </form>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowScanInput(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setShowScanInput(false);
              }}
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 9,
                color: "rgba(240,244,255,0.3)",
                cursor: "pointer",
                letterSpacing: "0.1em",
                textAlign: "center",
              }}
            >
              ESC TO CANCEL
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          top: "4rem",
          left: 0,
          width: 24,
          height: 24,
          borderTop: "1px solid rgba(0,200,255,0.2)",
          borderLeft: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 100,
        }}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: "4rem",
          right: 0,
          width: 24,
          height: 24,
          borderTop: "1px solid rgba(0,200,255,0.2)",
          borderRight: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 100,
        }}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: 24,
          height: 24,
          borderBottom: "1px solid rgba(0,200,255,0.2)",
          borderLeft: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 100,
        }}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: 24,
          height: 24,
          borderBottom: "1px solid rgba(0,200,255,0.2)",
          borderRight: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 100,
        }}
        aria-hidden
      />
    </div>
  );
}
