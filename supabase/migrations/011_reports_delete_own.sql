-- Allow authenticated users to delete their own report rows (dashboard "remove site").
drop policy if exists "reports_delete_own" on public.reports;

create policy "reports_delete_own"
  on public.reports
  for delete
  to authenticated
  using (user_id = auth.uid());
