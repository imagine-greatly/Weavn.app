import { NextRequest, NextResponse } from "next/server";
import { getLatestReport } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: rawDomain } = await params;
  const domain = decodeURIComponent(rawDomain).toLowerCase().trim();

  if (!domain) {
    return NextResponse.json(
      { error: "Missing domain.", code: "REPORT_DOMAIN_REQUIRED" },
      { status: 400 }
    );
  }

  try {
    const row = await getLatestReport(domain);
    if (!row) {
      return NextResponse.json(
        { error: "Report not found.", code: "REPORT_NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      id: row.id,
      domain: row.domain,
      created_at: row.created_at,
      payload: row.analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load report.";
    return NextResponse.json(
      { error: message, code: "REPORT_LOAD_FAILED" },
      { status: 500 }
    );
  }
}
