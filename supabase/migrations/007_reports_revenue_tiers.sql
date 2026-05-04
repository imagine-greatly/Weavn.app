-- Revenue diagnostic tiers + overview fields (optional denormalized columns).
-- Full payload remains in `analysis` jsonb; these mirror hot fields for queries/UI.
-- Safe to re-run.

alter table public.reports add column if not exists money_leaks jsonb;
alter table public.reports add column if not exists quick_wins jsonb;
alter table public.reports add column if not exists growth_roadmap jsonb;
alter table public.reports add column if not exists biggest_opportunity text;
alter table public.reports add column if not exists estimated_impact text;

comment on column public.reports.money_leaks is 'Top revenue-impact findings (max 8), mirrors analysis.moneyLeaks.';
comment on column public.reports.quick_wins is 'Effort Today findings (max 3), mirrors analysis.quickWins.';
comment on column public.reports.growth_roadmap is 'Remaining findings (max 20), mirrors analysis.growthRoadmap.';
