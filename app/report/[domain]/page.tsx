"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import { useParams } from "next/navigation";
import ReportLayout from "@/components/ReportLayout";
import UpgradeButton from "@/components/UpgradeButton";
import type { ReportPayload } from "@/lib/reportSchema";
import { mapAnalyzeToReport } from "@/lib/mapAnalyzeToReport";
import { mergeStoredReportBody } from "@/lib/mergeStoredReport";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";

/** Until ReportLayout declares `isPro`, widen props here only. */
const ReportLayoutWithPro = ReportLayout as ComponentType<
  ComponentProps<typeof ReportLayout> & { isPro: boolean }
>;

const STORAGE_KEY_PREFIX = "webdoc_report_";
const STORAGE_META_KEY_PREFIX = "webdoc_report_meta_";
const PLAN_CACHE_KEY = "webdoc_plan";
const PLAN_CACHE_TS_KEY = "webdoc_plan_ts";
const PLAN_CACHE_TTL = 300_000; // 5 minutes

function loadReportIdFromStorage(domain: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const metaRaw = localStorage.getItem(`${STORAGE_META_KEY_PREFIX}${domain}`);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw) as Record<string, unknown>;
      if (typeof meta.id === "string" && meta.id) return meta.id;
    }
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${domain}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    return typeof data.id === "string" && data.id ? data.id : null;
  } catch {
    return null;
  }
}

function loadReportFromStorage(domain: string): ReportPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${STORAGE_KEY_PREFIX}${domain}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const mapped = mapAnalyzeToReport(data as Parameters<typeof mapAnalyzeToReport>[0]);
    if (typeof data.shareToken === "string" && data.shareToken) {
      mapped.shareToken = data.shareToken;
    }
    return mapped;
  } catch {
    return null;
  }
}

function getCachedPlan(): string | null {
  try {
    const plan = localStorage.getItem(PLAN_CACHE_KEY);
    const ts = localStorage.getItem(PLAN_CACHE_TS_KEY);
    if (plan && ts && Date.now() - parseInt(ts, 10) < PLAN_CACHE_TTL) return plan;
  } catch { /* ignore */ }
  return null;
}

function cachePlan(plan: string): void {
  try {
    localStorage.setItem(PLAN_CACHE_KEY, plan);
    localStorage.setItem(PLAN_CACHE_TS_KEY, Date.now().toString());
  } catch { /* ignore */ }
}

function computeIsPro(plan: string | null, is_pro?: boolean): boolean {
  if (is_pro === true) return true;
  const p = String(plan ?? "").trim();
  return p === "pro" || p === "Pro";
}

function ReportSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <style>{`
        @keyframes skelPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .skel-bar { background: #1A2035; border-radius: 2px; animation: skelPulse 1.6s ease-in-out infinite; }
      `}</style>

      {/* Score gauge placeholder */}
      <div style={{ display: "flex", gap: 24, marginBottom: 40, alignItems: "flex-start" }}>
        <div className="skel-bar" style={{ width: 100, height: 100, borderRadius: 50 }} />
        <div style={{ flex: 1 }}>
          <div className="skel-bar" style={{ height: 14, width: "40%", marginBottom: 12 }} />
          <div className="skel-bar" style={{ height: 14, width: "60%", marginBottom: 12 }} />
          <div className="skel-bar" style={{ height: 14, width: "35%" }} />
        </div>
      </div>

      {/* Intelligence brief placeholder */}
      <div style={{ background: "#0A0F1E", border: "1px solid #1A2035", borderRadius: 4, padding: "20px 24px", marginBottom: 28 }}>
        <div className="skel-bar" style={{ height: 14, width: "25%", marginBottom: 16 }} />
        <div className="skel-bar" style={{ height: 14, width: "100%", marginBottom: 10 }} />
        <div className="skel-bar" style={{ height: 14, width: "90%", marginBottom: 10 }} />
        <div className="skel-bar" style={{ height: 14, width: "75%" }} />
      </div>

      {/* Finding card placeholders */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: "#0A0F1E",
            border: "1px solid #1A2035",
            borderLeft: "3px solid #1A2035",
            borderRadius: 4,
            padding: "20px 24px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div className="skel-bar" style={{ height: 12, width: 24 }} />
            <div className="skel-bar" style={{ height: 12, width: 64 }} />
            <div className="skel-bar" style={{ height: 12, width: 56 }} />
          </div>
          <div className="skel-bar" style={{ height: 14, width: "55%", marginBottom: 12 }} />
          <div className="skel-bar" style={{ height: 14, width: "80%", marginBottom: 8 }} />
          <div className="skel-bar" style={{ height: 14, width: "65%" }} />
        </div>
      ))}
    </div>
  );
}

export default function ReportDomainPage() {
  const params = useParams();
  const domain = typeof params.domain === "string" ? decodeURIComponent(params.domain) : "";
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [storedReportId, setStoredReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isPro, setIsPro] = useState(false);
  const router = useRouter();

  // Upgrade param — sync, no network
  useEffect(() => {
    if (window.location.search.includes("upgraded=true")) {
      setIsPro(true);
    }
  }, []);

  useEffect(() => {
    if (!domain) {
      setLoading(false);
      setError("Missing domain.");
      return;
    }

    let cancelled = false;

    // Sync localStorage check — resolves instantly, no network needed
    const fromStorage = loadReportFromStorage(domain);
    if (fromStorage) {
      setReport(fromStorage);
      setStoredReportId(loadReportIdFromStorage(domain));
      setLoading(false);
      // Auth + profile run in background to hydrate banners after report renders
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        const cachedPlan = getCachedPlan();
        if (cachedPlan !== null) setIsPro(computeIsPro(cachedPlan));

        // Both start immediately, run in parallel
        const authPromise = supabase.auth.getUser();
        const profilePromise = cachedPlan !== null
          ? Promise.resolve(null)
          : fetch("/api/profile", { method: "GET", credentials: "include" })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null);

        profilePromise.then(profileJson => {
          if (cancelled || !profileJson) return;
          const p = String(profileJson.plan ?? "").trim();
          setIsPro(computeIsPro(p, profileJson.is_pro));
          cachePlan(p || (profileJson.is_pro ? "pro" : "free"));
        }).catch(() => {});

        const { data: authData } = await authPromise;
        if (cancelled) return;
        if (authData.user) setUser({ id: authData.user.id });
      })();
      return () => { cancelled = true; };
    }

    // No localStorage — fetch report and auth in parallel
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const cachedPlan = getCachedPlan();

        // Apply cached plan immediately — zero network cost
        if (cachedPlan !== null) setIsPro(computeIsPro(cachedPlan));

        // /api/profile fires here and runs in background.
        // It NEVER blocks the report fetch — it resolves independently.
        const profilePromise = cachedPlan !== null
          ? Promise.resolve(null)
          : fetch("/api/profile", { method: "GET", credentials: "include" })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null);

        profilePromise.then(profileJson => {
          if (cancelled || !profileJson) return;
          const p = String(profileJson.plan ?? "").trim();
          setIsPro(computeIsPro(p, profileJson.is_pro));
          cachePlan(p || (profileJson.is_pro ? "pro" : "free"));
          console.log("[report] user isPro:", computeIsPro(p, profileJson.is_pro));
        }).catch(() => {});

        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;
        const sessionUserId = sessionData.session?.user?.id ?? null;

        const [authResult, reportResult] = await Promise.all([
          supabase.auth.getUser(),
          sessionUserId
            ? supabase
                .from("reports")
                .select("id, analysis, overview_copy, extended_analysis, finding_briefs")
                .eq("domain", domain.toLowerCase().trim())
                .eq("user_id", sessionUserId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single()
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const userData = authResult.data.user;
        if (userData) {
          setUser({ id: userData.id });
        } else {
          setUser(null);
        }

        if (userData) {
          const reportRow = (reportResult && "data" in reportResult
            ? reportResult.data
            : null) as {
            id?: string;
            analysis?: unknown;
            payload?: unknown;
            overview_copy?: unknown;
            extended_analysis?: unknown;
            finding_briefs?: unknown;
          } | null;
          setStoredReportId(
            typeof reportRow?.id === "string" && reportRow.id ? reportRow.id : null
          );
          const merged = mergeStoredReportBody(
            reportRow?.analysis,
            undefined,
            reportRow?.overview_copy
          );
          if (!merged) throw new Error("No report found.");
          setReport(mapAnalyzeToReport(merged));
          try {
            localStorage.setItem(`${STORAGE_META_KEY_PREFIX}${domain}`, JSON.stringify({
              id: reportRow?.id ?? "",
              extended_analysis: reportRow?.extended_analysis ?? null,
              finding_briefs: reportRow?.finding_briefs ?? null,
              cachedAt: Date.now(),
            }));
          } catch { /* ignore */ }
        } else {
          const res = await fetch(`/api/report/${encodeURIComponent(domain)}`);
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Report not found.");
          }
          const data = await res.json();
          if (cancelled) return;
          const payload = data.payload != null ? data.payload : data;
          setStoredReportId(typeof data.id === "string" && data.id ? data.id : null);
          setReport(mapAnalyzeToReport(payload));
        }
      } catch {
        if (!cancelled) {
          setStoredReportId(null);
          setError("Report not found. Scan this site to generate a report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [domain]);

  // Background prefetch: warm DB cache for top 10 findings so issue pages load instantly
  const prefetchedFindings = useRef<Map<string, unknown>>(new Map());
  useEffect(() => {
    if (!storedReportId || !report) return;
    const leaks = getDashboardMoneyLeaks(report);
    if (!leaks.length) return;

    const sorted = [...leaks].sort((a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0));
    const ac = new AbortController();
    const timers: ReturnType<typeof setTimeout>[] = [];

    sorted.slice(0, 5).forEach((finding) => {
      const fid = String(finding.id ?? "").trim() || String(finding.title ?? "").trim();
      if (fid) router.prefetch(`/issue/${encodeURIComponent(storedReportId)}/${encodeURIComponent(fid)}`);
    });

    const ordered = [...sorted].sort((a, b) => {
      const aC = (a.severity === "critical" || a.rubricSeverity === "Critical") ? 0 : 1;
      const bC = (b.severity === "critical" || b.rubricSeverity === "Critical") ? 0 : 1;
      return aC - bC;
    });

    const overallScore = report.healthScore ?? 0;
    ordered.forEach((finding, i) => {
      const fid = String(finding.id ?? "").trim() || String(finding.title ?? "").trim();
      if (!fid) return;
      const t = setTimeout(() => {
        if (ac.signal.aborted || prefetchedFindings.current.has(fid)) return;
        console.log('[REPORT] Prefetching brief for finding:', fid);
        try {
          if (localStorage.getItem(`webdoc_brief_${fid}`)) {
            prefetchedFindings.current.set(fid, true);
            return;
          }
        } catch { /* ignore */ }
        void fetch("/api/expand-finding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            report_id: storedReportId,
            finding_id: fid,
            domain,
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
            if (!ac.signal.aborted && data) {
              prefetchedFindings.current.set(fid, data);
              console.log('[REPORT] Brief cached for finding:', fid);
              try {
                localStorage.setItem(`webdoc_brief_${fid}`, JSON.stringify(data));
              } catch {
                // ignore local brief cache failures
              }
            }
          })
          .catch(() => { /* ignore prefetch failures */ });
      }, 800 + i * 300);
      timers.push(t);
    });

    return () => {
      ac.abort();
      timers.forEach(clearTimeout);
    };
  }, [storedReportId, report, domain, router]);

  if (loading) {
    return (
      <div style={{ background: "var(--bg-base)", minHeight: "calc(100svh - 4rem)" }}>
        <ReportSkeleton />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6"
        style={{
          background: "var(--bg-base)",
          borderTop: "1px solid rgba(0,200,255,0.08)",
        }}
      >
        <div
          className="max-w-md text-center"
          style={{
            border: "1px solid rgba(0,200,255,0.18)",
            borderRadius: 12,
            padding: "28px 32px",
            background: "rgba(5,8,16,0.75)",
            boxShadow: "0 0 60px rgba(0,0,0,0.4), inset 0 0 40px rgba(0,200,255,0.03)",
          }}
        >
          <h1
            className="font-mono"
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              fontSize: 16,
              letterSpacing: "0.12em",
              color: "rgba(0,200,255,0.95)",
              margin: 0,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            Report Not Found
          </h1>
          <p
            className="font-mono text-sm"
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              color: "rgba(240,244,255,0.45)",
              lineHeight: 1.5,
              margin: 0,
              marginBottom: 20,
            }}
          >
            {error ??
              "We could not load a report for this domain. Run a scan to generate one."}
          </p>
          <a
            href="/"
            className="font-mono inline-block"
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "rgba(0,200,255,0.95)",
              textDecoration: "none",
              borderBottom: "1px solid rgba(0,200,255,0.35)",
              paddingBottom: 2,
            }}
          >
            Run New Scan →
          </a>
        </div>
      </div>
    );
  }

  const showSaveBanner = Boolean(report && !user);
  const handleRescan = () => {
    const target = domain.trim();
    if (!target) return;
    const scanUrl = `https://${target}`;
    const path = `/scan?url=${encodeURIComponent(scanUrl)}&rescan=true`;
    console.log("[scan-nav] router.push", path);
    router.push(path);
  };

  return (
    <div>
      {showSaveBanner && (
        <div
          className="report-banner-stack"
          style={{
            position: "sticky",
            top: 64,
            zIndex: 50,
            background: "rgba(0,200,255,0.06)",
            borderBottom: "1px solid rgba(0,200,255,0.2)",
            padding: "14px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div className="font-body" style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 500, color: "var(--text-primary)", fontSize: 15 }}>
              Save this report and track your score over time
            </div>
            <div className="font-mono" style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
              Free account · No credit card · Takes about 90 seconds
            </div>
          </div>

          <div className="report-banner-actions" style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                if (!report) return;
                try {
                  localStorage.setItem("pending_report", JSON.stringify({ domain, payload: report }));
                } catch {
                  // ignore
                }
                router.push("/auth?tab=create");
              }}
              style={{
                background: "var(--cyan)",
                color: "#050810",
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontWeight: 700,
                fontSize: 12,
                padding: "10px 20px",
                borderRadius: 4,
                cursor: "pointer",
                border: "none",
                height: 40,
                whiteSpace: "nowrap",
              }}
            >
              CREATE FREE ACCOUNT →
            </button>
            <button
              type="button"
              onClick={() => router.push("/auth?tab=signin")}
              style={{
                marginLeft: 12,
                background: "transparent",
                color: "var(--text-muted)",
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 11,
                cursor: "pointer",
                border: "none",
                padding: "10px 8px",
                whiteSpace: "nowrap",
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {user && !isPro && (
        <div
          className="report-banner-stack"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,200,255,0.06) 0%, rgba(0,200,255,0.02) 100%)",
            borderBottom: "1px solid rgba(0,200,255,0.15)",
            padding: "14px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontWeight: 600,
                color: "var(--text-primary)",
                fontSize: 14,
                marginBottom: 2,
              }}
            >
              You&apos;re viewing a free report
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                color: "var(--text-muted)",
                fontSize: 11,
              }}
            >
              Upgrade to Pro for the full finding set, unlimited scans, and the AI
              advisor
            </div>
          </div>
          <div className="report-banner-actions w-full md:w-auto">
            <UpgradeButton label="UPGRADE TO PRO — $50/mo →" className="w-full md:w-auto" />
          </div>
        </div>
      )}

      <ReportLayoutWithPro
        domain={domain}
        payload={report}
        isPro={isPro}
        onRescan={handleRescan}
        shareToken={report.shareToken ?? null}
        issueReportId={storedReportId}
      />
    </div>
  );
}
