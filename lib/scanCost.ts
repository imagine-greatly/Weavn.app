export function calculateScanCost(params: { pageCount: number; cached: boolean }): number {
  if (params.cached) return 0;
  const pages = Math.min(params.pageCount, 10);
  return Math.round((0.15 + (pages - 1) * 0.05) * 100) / 100;
}
