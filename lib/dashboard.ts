/**
 * Dashboard surface (steel-blue /app) — shared pure helpers + types.
 *
 * One dashboard, two zoom levels:
 *   - 1 site  → SITE COCKPIT (founder view)
 *   - >1 site → PORTFOLIO COCKPIT (agency view) → drills into the SAME site cockpit
 *
 * Everything here binds to the real `reports` table. The cockpit shows score,
 * delta, counts, and the TOP 3 findings only — it NEVER renders the full findings
 * array (that's the /reports/[token] artifact's job). See resolveViewMode for the
 * single plan-tier seam.
 */

// ── Raw row shape selected from `reports` (guaranteed columns only) ─────────────
export interface ReportRow {
  domain: string;
  health_score: number | null;
  created_at: string;
  share_token: string | null;
  status: string | null;
  /** Full stored ReportPayload. Findings + critical count are derived from this. */
  analysis: Record<string, unknown> | null;
}

// ── Derived shapes ─────────────────────────────────────────────────────────────
export interface CockpitFinding {
  id: string;
  /** 1-based rank within the curated top tier (already impact-ordered). */
  priority: number;
  title: string;
  severity: "critical" | "warning" | "passing" | string;
  /** Estimated lift / business cost copy, when the finding carries it. */
  estLift: string | null;
}

export interface SiteSummary {
  domain: string;
  score: number;
  shareToken: string | null;
  lastScannedAt: string;
  /** Score change vs the previous scan of this same domain. null = first scan. */
  delta: number | null;
  previousScore: number | null;
  criticalCount: number;
  /** All scores for this domain, ascending by date — drives the trend line. */
  history: { score: number; date: string }[];
  /** Curated top-tier findings (impact-ordered). The cockpit renders only the first 3. */
  findings: CockpitFinding[];
  needsAttention: boolean;
}

export type ViewMode = "site" | "portfolio";

export interface ViewModeOptions {
  /** Plan tier, e.g. "agency". NOT WIRED YET — reserved for the seam below. */
  planTier?: string | null;
}

/**
 * THE plan-tier seam. Today the cockpit zoom level is driven purely by how many
 * sites the user has. Plan entitlements are not wired yet.
 *
 * TODO(plan-tiers): when plans land, branch on opts.planTier here so every caller
 * flips at once — e.g. an "agency" tier should force "portfolio" even with a
 * single client site. Keep this the ONLY place that decision is made.
 */
export function resolveViewMode(siteCount: number, _opts?: ViewModeOptions): ViewMode {
  return siteCount > 1 ? "portfolio" : "site";
}

// ── Findings extraction (top tier, impact-ordered) ─────────────────────────────
function pickFindingArray(analysis: Record<string, unknown> | null): unknown[] {
  if (!analysis) return [];
  const tiers = ["moneyLeaks", "primaryFindings", "priorityFindings", "leaks"] as const;
  for (const key of tiers) {
    const arr = analysis[key];
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  return [];
}

export function topFindings(analysis: Record<string, unknown> | null, n: number): CockpitFinding[] {
  return pickFindingArray(analysis)
    .slice(0, n)
    .map((raw, i) => {
      const l = (raw ?? {}) as Record<string, unknown>;
      const title = String(l.revenueTitle || l.title || l.rubricCheckTitle || "Finding").trim();
      const estRaw = l.impactStatement ?? l.businessCost;
      const estLift = typeof estRaw === "string" && estRaw.trim() ? estRaw.trim() : null;
      return {
        id: String(l.id ?? `finding-${i}`),
        priority: i + 1,
        title,
        severity: String(l.severity ?? "warning"),
        estLift,
      };
    });
}

function deriveCriticalCount(analysis: Record<string, unknown> | null, findings: CockpitFinding[]): number {
  const stored = analysis?.criticalCount;
  if (typeof stored === "number") return stored;
  // Fallback for API-path reports that don't denormalize the count: scan the curated tier.
  return pickFindingArray(analysis).filter(
    (l) => String((l as Record<string, unknown>)?.severity ?? "").toLowerCase() === "critical"
  ).length || findings.filter((f) => f.severity.toLowerCase() === "critical").length;
}

// ── Needs-attention rule (agency portfolio flag) ───────────────────────────────
// score < 70, OR score dropped since the previous scan, OR a critical finding present.
export function siteNeedsAttention(s: {
  score: number;
  delta: number | null;
  criticalCount: number;
}): boolean {
  return s.score < 70 || (s.delta != null && s.delta < 0) || s.criticalCount > 0;
}

// ── Rollup: many scans → one SiteSummary per domain ────────────────────────────
export function rollUpSites(rows: ReportRow[]): SiteSummary[] {
  const byDomain = new Map<string, ReportRow[]>();
  for (const r of rows) {
    if (!r.domain) continue;
    const list = byDomain.get(r.domain) ?? [];
    list.push(r);
    byDomain.set(r.domain, list);
  }

  const sites: SiteSummary[] = [];
  for (const [domain, list] of byDomain) {
    // Input is created_at desc, so list[0] is the latest scan, list[1] the prior one.
    const latest = list[0];
    const prev = list[1];
    const score = latest.health_score ?? 0;
    const previousScore = prev ? prev.health_score ?? 0 : null;
    const delta = previousScore == null ? null : score - previousScore;
    const history = [...list]
      .reverse()
      .map((r) => ({ score: r.health_score ?? 0, date: r.created_at }));
    const findings = topFindings(latest.analysis, 3);
    const criticalCount = deriveCriticalCount(latest.analysis, findings);

    const site: SiteSummary = {
      domain,
      score,
      shareToken: latest.share_token,
      lastScannedAt: latest.created_at,
      delta,
      previousScore,
      criticalCount,
      history,
      findings,
      needsAttention: false,
    };
    site.needsAttention = siteNeedsAttention(site);
    sites.push(site);
  }

  // Surface sites that need attention first; otherwise most-recently-scanned.
  sites.sort((a, b) => {
    if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
    return new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime();
  });
  return sites;
}

// ── Verdict band (5-band) — mirrors the v1 API contract (app/api/v1/scan) ───────
export function scoreToVerdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Poor";
}

/**
 * Verdict chip color on the steel surface: green = good, steel = neutral, amber/red = poor.
 * Green starts at 70 to match ScoreRing's pass/fail threshold (scoreBand) — so the chip
 * never reads green beside a red ring. The verdict *label* still uses the 5-band above.
 */
export function verdictColor(score: number): string {
  if (score >= 70) return "#00C48C"; // success-positive (matches the ring's green cutoff)
  if (score >= 50) return "#6F9BC6"; // steel (neutral)
  if (score >= 35) return "#EFB23E"; // amber (verdict)
  return "#E8635F"; // red (verdict)
}

/**
 * Percentile estimate vs. a static industry baseline (p10/p50/p90 ≈ 32/55/80).
 * Deterministic function of the real score — labeled as an estimate in the UI.
 * Mirrors the piecewise shape of lib/benchmarks.ts calculatePercentile without
 * touching it or requiring the service-role benchmark tables on the client.
 * TODO(wiring): swap for the per-site industry_benchmarks percentile when exposed.
 */
export function estimatePercentile(score: number): number {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const p10 = 32;
  const p50 = 55;
  const p90 = 80;
  if (s <= p10) return Math.max(1, Math.round((s / p10) * 10));
  if (s <= p50) return Math.round(10 + ((s - p10) / (p50 - p10)) * 40);
  if (s <= p90) return Math.round(50 + ((s - p50) / (p90 - p50)) * 40);
  return Math.min(99, Math.round(90 + ((s - p90) / (100 - p90)) * 10));
}

export function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

// ── Formatting + URLs ──────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Public, shareable report URL (the /share view carries the "run your own scan" banner). */
export function buildShareUrl(shareToken: string, origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "https://weavn.app");
  return `${base}/share/${shareToken}`;
}
