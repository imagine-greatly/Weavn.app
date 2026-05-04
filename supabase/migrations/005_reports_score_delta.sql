-- Rescan comparison: delta vs previous scan (same domain + user).
alter table public.reports add column if not exists score_delta integer;
alter table public.reports add column if not exists previous_score integer;
alter table public.reports add column if not exists growth_score integer;

comment on column public.reports.score_delta is 'newScore - previous_score when rescanning a domain.';
comment on column public.reports.previous_score is 'growth/health score from the prior report row.';
comment on column public.reports.growth_score is 'Denormalized growth score (mirrors analysis growthScore).';
