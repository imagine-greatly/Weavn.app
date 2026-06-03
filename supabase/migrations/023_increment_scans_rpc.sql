create or replace function increment_scans_used(key_id uuid)
returns void
language sql
security definer
as $$
  update api_keys
  set scans_used = scans_used + 1,
      last_used_at = now()
  where id = key_id;
$$;
