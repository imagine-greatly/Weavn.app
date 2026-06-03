-- Link API scans back to the api_keys table for /v1/scans queries.
-- Nullable so existing reports (dashboard scans) are unaffected.
alter table public.reports
  add column if not exists api_key_id uuid references api_keys(id) on delete set null;

create index if not exists idx_reports_api_key_id
  on public.reports (api_key_id, created_at desc)
  where api_key_id is not null;
