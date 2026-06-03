import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import ReportLayout from "@/components/ReportLayout";
import { mapAnalyzeToReport } from "@/lib/mapAnalyzeToReport";
import { mergeStoredReportBody } from "@/lib/mergeStoredReport";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) return notFound();

  const supabase = getServiceClient();
  const { data: row } = await supabase
    .from("reports")
    .select("id, domain, analysis, overview_copy")
    .eq("share_token", token)
    .single();

  if (!row) return notFound();

  const merged = mergeStoredReportBody(row.analysis, undefined, row.overview_copy);
  if (!merged) return notFound();

  const payload = mapAnalyzeToReport(merged);

  return (
    // marginTop: -4rem cancels the root layout's pt-16 (which exists for the fixed navbar)
    <div style={{ marginTop: "-4rem", background: "#050810" }}>
      {/* Report fills the full viewport height */}
      <div style={{ height: "100svh", display: "flex", flexDirection: "column" }}>
        <ReportLayout
          domain={row.domain ?? ""}
          payload={payload}
          sharedView
          readOnlyLeftPanel
          isPro
          fillContainer
        />
      </div>

      {/* "Powered by" footer — visible on scroll */}
      <footer
        style={{
          padding: "14px 24px",
          textAlign: "center",
          background: "#050810",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            color: "rgba(240,244,255,0.25)",
            letterSpacing: "0.1em",
          }}
        >
          Powered by{" "}
          <a
            href="https://webdocai.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(0,200,255,0.5)", textDecoration: "none" }}
          >
            webdoc.ai
          </a>
        </span>
      </footer>
    </div>
  );
}
