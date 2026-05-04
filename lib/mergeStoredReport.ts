import type { ReportPayload } from "./reportSchema";

/** Merge stored JSON + optional `overview_copy` jsonb into one payload shape. */
export function mergeStoredReportBody(
  analysis: unknown,
  payload: unknown,
  overview_copy: unknown
): ReportPayload | null {
  const raw =
    analysis && typeof analysis === "object"
      ? { ...(analysis as object) }
      : payload && typeof payload === "object"
        ? { ...(payload as object) }
        : null;
  if (!raw) return null;
  if (overview_copy != null && typeof overview_copy === "object") {
    (raw as ReportPayload).overviewCopy = overview_copy as NonNullable<
      ReportPayload["overviewCopy"]
    >;
  }
  return raw as ReportPayload;
}
