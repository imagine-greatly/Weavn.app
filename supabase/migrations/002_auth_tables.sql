-- Auth foundation for weavn.app
-- Adds: profiles, user-scoped reports, resolved_findings.

-- Profiles: one row per auth user
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- Reports: user_id for per-user dashboards
alter table public.reports
  add column if not exists user_id uuid;

-- Resolved findings: per-user resolution keys
create table if not exists public.resolved_findings (
  user_id uuid not null references auth.users(id) on delete cascade,
  resolution_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, resolution_key)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.resolved_findings enable row level security;

-- Profiles policies
create policy if not exists "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Allow user to update own profile (plan changes later)
create policy if not exists "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Reports policies
create policy if not exists "reports_select_own"
  on public.reports
  for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "reports_insert_own"
  on public.reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Resolved findings policies
create policy if not exists "resolved_select_own"
  on public.resolved_findings
  for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "resolved_upsert_own"
  on public.resolved_findings
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Indexes for performance
create index if not exists idx_reports_user_id_created
  on public.reports (user_id, created_at desc);

create index if not exists idx_resolved_user_key
  on public.resolved_findings (user_id, resolution_key);

