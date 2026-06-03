alter table public.reports
  add column if not exists content_fingerprint text,
  add column if not exists previous_score integer,
  add column if not exists score_delta integer;
