import { permanentRedirect } from "next/navigation";

/**
 * Legacy public share surface. It rendered a WEAVN-BRANDED copy of a report keyed by
 * the SAME reports.share_token as the white-label deliverable at /reports/[token] — a
 * white-label leak: an Agency/Enterprise owner's client could swap /reports/ → /share/
 * (or open a legacy /share/ link) and see the Weavn brand + "shared Weavn report"
 * banner on what is meant to be an unbranded, white-label deliverable.
 *
 * Fix: redirect to the canonical /reports/[token], which renders white-label for
 * Agency/Enterprise owners and the in-app view (with its own "Save this report" CTA)
 * for founders. Nothing live still generates /share/ links — buildShareUrl and the
 * only copy button (ReportRightPanel) are orphaned — so this closes the leak with no
 * loss of a reachable surface. /api/share + SharedReportPageBanner are now unused.
 */
export default async function SharedReportByTokenPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  permanentRedirect(`/reports/${encodeURIComponent(shareToken)}`);
}
