-- 028_api_usage_instrumentation.sql
-- Richer request instrumentation for api_usage. ALL columns are additive, nullable,
-- and safe-defaulted so existing rows are undisturbed and no behavior changes:
--   - status_code: real HTTP class (200/400/401/402/429/500). NULL on legacy rows.
--   - endpoint: 'scan' | 'scan_batch'. Backfills 'scan' on existing rows (the default).
--   - error_code: machine reason for non-2xx rows (e.g. 'invalid_key','quota_exhausted',
--     'validation','rate_limited','scrape_failed','analyze_error','json_parse',
--     'save_failed','scan_failed'). NULL on success rows.
--   - key_prefix_attempted: PREFIX ONLY of the presented key on a 401 (never a full
--     key/secret). NULL on all other rows.
--
-- No NOT NULL changes, no FK changes, no RLS/policy changes. The existing
-- "Users view own usage" policy is unchanged; rows with api_key_id = NULL (logged on
-- 401, where the key is unknown) are correctly invisible to per-user SELECT and are
-- only readable via the service role.

alter table public.api_usage
  add column if not exists status_code integer,
  add column if not exists endpoint text default 'scan',
  add column if not exists error_code text,
  add column if not exists key_prefix_attempted text;
