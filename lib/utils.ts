import { COLOR_TOKENS, RUBRIC_SEVERITY_ORDER, SEVERITY_ORDER } from "@/lib/constants";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((v) => (v ?? "").trim()).filter((v) => v.length > 0))
  );
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function toLowerSafe(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function groupBy<T, K extends PropertyKey>(
  items: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function safeSlice(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
}

export function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function scoreToColor(score: number): string {
  if (score < 50) return COLOR_TOKENS.RED;
  if (score < 70) return COLOR_TOKENS.ORANGE;
  return COLOR_TOKENS.GREEN;
}

export function sortBySeverity(
  a: { severity: "critical" | "warning" | "passing" },
  b: { severity: "critical" | "warning" | "passing" }
): number {
  return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
}

export function sortByRubricSeverity(
  a: { severity: "Critical" | "High" | "Medium" | "Low" },
  b: { severity: "Critical" | "High" | "Medium" | "Low" }
): number {
  return RUBRIC_SEVERITY_ORDER[a.severity] - RUBRIC_SEVERITY_ORDER[b.severity];
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
