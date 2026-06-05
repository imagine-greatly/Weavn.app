import { NextResponse } from "next/server";

export function apiError(
  code: string,
  message: string,
  status: number,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json({ error: { code, message, status } }, { status, headers });
}
