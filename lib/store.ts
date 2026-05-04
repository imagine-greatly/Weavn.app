/**
 * In-memory report store for MVP.
 *
 * Works well for development and single-instance deployments.
 * For production on Vercel (serverless), replace this with:
 *   - Vercel KV (Redis):  https://vercel.com/docs/storage/vercel-kv
 *   - Upstash Redis
 *   - PlanetScale / Neon (Postgres)
 *
 * The interface is intentionally simple so you can swap the implementation
 * without touching the API routes.
 */

import type { AnalysisResult } from "./ai";

// Global store — survives across requests within the same server process
const store = new Map<string, AnalysisResult>();

export function saveReport(domain: string, result: AnalysisResult): void {
  store.set(domain.toLowerCase(), result);
}

export function getReport(domain: string): AnalysisResult | null {
  return store.get(domain.toLowerCase()) ?? null;
}
