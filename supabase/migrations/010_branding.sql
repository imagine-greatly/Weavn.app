-- 010_branding.sql — agency white-label branding model.
-- Adds: profiles.branding (BrandingConfig JSON) + a public 'branding' storage
-- bucket for agency logos. Re-run safe.

-- Per-agency branding config (BrandingConfig in lib/branding.ts). Null until the
-- agency saves one. Only consumed when profiles.plan = 'agency' (gated at render).
alter table public.profiles
  add column if not exists branding jsonb;

-- ── Storage: agency logo bucket (public-read so the CDN URL loads in web + PDF) ──
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Public read (logos must load for the agency's clients + the PDF render context).
drop policy if exists "branding_public_read" on storage.objects;
create policy "branding_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'branding');

-- Authenticated users may write only within their own {user_id}/ folder.
drop policy if exists "branding_owner_write" on storage.objects;
create policy "branding_owner_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding_owner_update" on storage.objects;
create policy "branding_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding_owner_delete" on storage.objects;
create policy "branding_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
