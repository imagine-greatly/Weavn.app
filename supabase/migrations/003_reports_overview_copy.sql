-- Denormalized diagnostic overview (second Claude pass) for analytics / direct SQL access.
-- App still embeds overviewCopy inside analysis JSON; this column mirrors it when present.

alter table public.reports
  add column if not exists overview_copy jsonb;

comment on column public.reports.overview_copy is
  'Diagnostic overview copy (verdict, diagnosis, heroHeadlineNote, biggestOpportunity, estimatedImpact).';
