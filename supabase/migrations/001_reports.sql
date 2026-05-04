-- Reports table: keyed by domain + timestamp (created_at).
-- Run this in Supabase SQL editor or via Supabase CLI.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_reports_domain_created
  on public.reports (domain, created_at desc);

-- Optional: enable RLS and allow service role full access (default).
-- alter table public.reports enable row level security;
