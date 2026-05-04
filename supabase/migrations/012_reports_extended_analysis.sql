-- Per-finding extended diagnostic brief (JSONB map keyed by finding id / leakKey).
-- Populated at scan completion; issue detail page reads without on-load generation.

alter table public.reports
  add column if not exists extended_analysis jsonb;

comment on column public.reports.extended_analysis is
  'Map of finding key (leak id or title) to FindingBriefExpansion JSON; generated after scan.';
