"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReportLayout from "@/components/ReportLayout";
import SharedReportPageBanner from "@/components/SharedReportPageBanner";
import type { ReportPayload } from "@/lib/reportSchema";
import { mapAnalyzeToReport } from "@/lib/mapAnalyzeToReport";

export default function SharedReportByTokenPage() {
  const params = useParams();
  const shareToken =
    typeof params.shareToken === "string" ? decodeURIComponent(params.shareToken) : "";
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setLoading(false);
      setError("Invalid link.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(shareToken)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Report not found.");
        }
        const d = typeof data.domain === "string" ? data.domain : "";
        const payload = data.payload != null ? data.payload : data;
        if (cancelled) return;
        setDomain(d);
        setReport(mapAnalyzeToReport(payload as Parameters<typeof mapAnalyzeToReport>[0]));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load shared report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <div
        className="flex min-h-[calc(100svh-4rem)] items-center justify-center"
        style={{ background: "var(--bg-base)" }}
      >
        <span
          className="font-mono text-sm"
          style={{ fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace", color: "var(--text-muted)" }}
        >
          Loading shared report...
        </span>
      </div>
    );
  }

  if (error || !report || !domain) {
    return (
      <div
        className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-4 px-6"
        style={{ background: "var(--bg-base)" }}
      >
        <p className="max-w-md text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          {error ?? "Report not found."}
        </p>
        <a href="/" className="font-mono text-xs" style={{ color: "var(--cyan)" }}>
          Run your own scan →
        </a>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-col"
      style={{
        height: "calc(100svh - 4rem)",
        minHeight: 0,
        background: "var(--bg-base)",
      }}
    >
      <SharedReportPageBanner domain={domain} />
      <div className="min-h-0 flex-1" style={{ display: "flex", flexDirection: "column" }}>
        <ReportLayout
          domain={domain}
          payload={report}
          sharedView
          fillContainer
          isPro
          readOnlyLeftPanel
        />
      </div>
    </div>
  );
}
