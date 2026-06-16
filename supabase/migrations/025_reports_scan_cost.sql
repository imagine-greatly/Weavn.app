-- Real model cost (USD) of producing a dashboard scan report.
-- Dashboard scans have no api_usage row (that table is api-key scoped), so the
-- real cost — primary analysis call + the findings-briefs call — is persisted
-- here for pricing/margin analysis. Infra (Browserless units) is excluded.
alter table public.reports
  add column if not exists scan_cost_usd numeric default 0;
