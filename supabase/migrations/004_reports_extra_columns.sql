-- Optional report columns (overview + curated findings + scan metadata).
-- Run in Supabase SQL Editor if migrations are not applied via CLI.
-- IF NOT EXISTS is safe on re-run.

alter table public.reports add column if not exists overview_copy jsonb;
alter table public.reports add column if not exists primary_findings jsonb;
alter table public.reports add column if not exists secondary_findings jsonb;
alter table public.reports add column if not exists opportunity_findings jsonb;
alter table public.reports add column if not exists hidden_count integer;
alter table public.reports add column if not exists rubric_completeness numeric;
alter table public.reports add column if not exists vision_used boolean default false;
alter table public.reports add column if not exists jina_used boolean default false;
alter table public.reports add column if not exists scraping_method text;

comment on column public.reports.overview_copy is
  'Diagnostic overview copy (mirrors analysis.overviewCopy when present).';
comment on column public.reports.primary_findings is 'Optional curated primary-tier findings jsonb.';
comment on column public.reports.secondary_findings is 'Optional curated secondary-tier findings jsonb.';
comment on column public.reports.opportunity_findings is 'Optional opportunity-tier findings jsonb.';
