import { NextRequest, NextResponse } from "next/server";
import { getReportPayloadByShareToken } from "@/lib/supabase";

/**
 * Public read-only report by opaque share token. No auth; response excludes user/account fields.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const row = await getReportPayloadByShareToken(token);
    if (!row) {
      return NextResponse.json(
        { error: "Report not found.", code: "SHARE_NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      domain: row.domain,
      payload: row.payload,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load shared report.";
    console.error("[share]", err);
    return NextResponse.json(
      { error: message, code: "SHARE_LOOKUP_FAILED" },
      { status: 500 }
    );
  }
}
