// Synthetic fallback cost — used only when real token usage is unavailable
// (e.g. an error path that never reached the model). Real scans persist the
// computed model cost via realScanCostUsd() below.
export function calculateScanCost(params: { pageCount: number; cached: boolean }): number {
  if (params.cached) return 0;
  const pages = Math.min(params.pageCount, 10);
  return Math.round((0.15 + (pages - 1) * 0.05) * 100) / 100;
}

// Anthropic message.usage shape (only the fields that affect cost).
export interface AnthropicUsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

// Real Claude Sonnet 4.x rates, USD per million tokens.
const SONNET_RATE_INPUT = 3;
const SONNET_RATE_CACHE_WRITE = 3.75;
const SONNET_RATE_CACHE_READ = 0.3;
const SONNET_RATE_OUTPUT = 15;

// Real model cost for a single Sonnet call, computed from token usage.
// Mirrors the per-class rates used in lib/analyze.ts so every record site
// agrees on the figure. Infra (Browserless units) is intentionally excluded —
// it is not surfaced on the extraction object and has no defined unit→USD rate;
// est_units is logged per scan for later reconciliation.
export function realScanCostUsd(usage: AnthropicUsageLike | null | undefined): number {
  if (!usage) return 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const inputNoCache = (usage.input_tokens ?? 0) - cacheRead - cacheWrite;
  return (
    (inputNoCache / 1_000_000) * SONNET_RATE_INPUT +
    (cacheWrite / 1_000_000) * SONNET_RATE_CACHE_WRITE +
    (cacheRead / 1_000_000) * SONNET_RATE_CACHE_READ +
    ((usage.output_tokens ?? 0) / 1_000_000) * SONNET_RATE_OUTPUT
  );
}
