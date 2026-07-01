/**
 * Public scan-identifier helpers.
 *
 * The DB stores a bare UUID in reports.id (a Postgres uuid column). The public
 * API contract exposes that identifier as `scan_id` carrying an `sc_` prefix
 * (e.g. "sc_3f9a2c7e-8b1d-4f60-..."). Apply {@link toPublicScanId} at every
 * response boundary, and {@link toDbScanId} on every read — so BOTH a bare UUID
 * and an sc_-prefixed value resolve. That back-compat is load-bearing: report
 * links, share tokens, and poll URLs already in the wild use the bare UUID.
 */

export const SCAN_ID_PREFIX = "sc_";

/** Bare UUID (DB form) → public scan id ("sc_<uuid>"). Idempotent. */
export function toPublicScanId(id: string): string {
  if (!id) return id;
  return id.startsWith(SCAN_ID_PREFIX) ? id : SCAN_ID_PREFIX + id;
}

/** Public scan id ("sc_<uuid>") → bare UUID for DB lookup. Bare UUIDs pass through unchanged. */
export function toDbScanId(id: string): string {
  return id.startsWith(SCAN_ID_PREFIX) ? id.slice(SCAN_ID_PREFIX.length) : id;
}
