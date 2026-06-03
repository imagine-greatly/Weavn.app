alter table public.api_usage
  add column if not exists cost_usd numeric default 0,
  add column if not exists page_count integer default 1,
  add column if not exists cached boolean default false;
