-- Server-side cache for on-demand finding brief expansions (expand-finding API).

alter table public.reports
  add column if not exists finding_briefs jsonb;

comment on column public.reports.finding_briefs is
  'Map of finding_id (leak key) to FindingBriefExpansion JSON; populated by expand-finding API.';

-- Allow authenticated users to update their own report rows (extended_analysis / finding_briefs).
drop policy if exists "reports_update_own" on public.reports;

create policy "reports_update_own"
  on public.reports
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Fallback store when reports.finding_briefs column is unavailable in older DBs.
create table if not exists public.finding_briefs (
  report_id uuid not null references public.reports (id) on delete cascade,
  finding_id text not null,
  brief jsonb not null,
  created_at timestamptz not null default now(),
  primary key (report_id, finding_id)
);

create index if not exists idx_finding_briefs_report
  on public.finding_briefs (report_id);

alter table public.finding_briefs enable row level security;

drop policy if exists "finding_briefs_select_own" on public.finding_briefs;
create policy "finding_briefs_select_own"
  on public.finding_briefs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = finding_briefs.report_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "finding_briefs_insert_own" on public.finding_briefs;
create policy "finding_briefs_insert_own"
  on public.finding_briefs
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.reports r
      where r.id = finding_briefs.report_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "finding_briefs_update_own" on public.finding_briefs;
create policy "finding_briefs_update_own"
  on public.finding_briefs
  for update
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = finding_briefs.report_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.reports r
      where r.id = finding_briefs.report_id and r.user_id = auth.uid()
    )
  );
