"use client";

import {
  useEffect,
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

/** Until ReportLayout declares `isPro`, widen props here only. */
const ReportLayoutWithPro = ReportLayout as ComponentType<
  ComponentProps<typeof ReportLayout> & { isPro: boolean }
>;

const STORAGE_KEY_PREFIX = "webdoc_report_";

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

export default function ReportDomainPage() {
  const params = useParams();
  const domain = typeof params.domain === "string" ? decodeURIComponent(params.domain) : "";
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [storedReportId, setStoredReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

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

    const fromStorage = loadReportFromStorage(domain);
    if (fromStorage) {
      setReport(fromStorage);
      setStoredReportId(null);
      setLoading(false);
      return;
    }

    if (!authChecked) return;

    let cancelled = false;
    (async () => {
      try {
        if (user) {
          const supabase = getSupabaseBrowserClient();
          const { data } = await supabase
            .from("reports")
            .select("id, analysis, overview_copy")
            .eq("domain", domain.toLowerCase().trim())
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (cancelled) return;
          const reportRow = data as {
            id?: string;
            analysis?: unknown;
            payload?: unknown;
            overview_copy?: unknown;
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

    return () => {
      cancelled = true;
    };
  }, [domain, authChecked, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (data.user) {
        setUser({ id: data.user.id });

        let isProUser = false;
        try {
          const res = await fetch("/api/profile", { method: "GET", credentials: "include" });
          if (res.ok) {
            const profileJson = (await res.json()) as {
              plan?: string;
              is_pro?: boolean;
            };
            const p = String(profileJson.plan ?? "").trim();
            isProUser =
              profileJson.is_pro === true || p === "pro" || p === "Pro";
          }
        } catch {
          isProUser = false;
        }
        if (cancelled) return;
        setIsPro(isProUser);

        console.log("[report] user isPro:", isProUser);
      } else {
        setUser(null);
        setIsPro(false);
      }
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6"
        style={{ background: "var(--bg-base)" }}
      >
        <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>
          Loading report...
        </span>
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
