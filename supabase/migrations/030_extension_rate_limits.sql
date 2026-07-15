-- 030: Chrome extension anonymous-scan rate limiting (A1 lead funnel).
--
-- SEPARATE from scan_rate_limits (per-account, migration 026) and playground_rate_limits
-- (marketing site, migration 018) so the extension budget never contends with either.
--
-- Two logical counters live in ONE table via a (scope, key) primary key:
--   scope='install'  key=<install UUID>       -> 3 scans / 24h  (user-facing budget)
--   scope='ip'       key=<sha256 IP hash>     -> 15 scans / 24h (anti token-farming ceiling)
--
-- Chosen over the suggested (install_id, ip_hash, scan_count, window_start) shape because a
-- single (scope,key) PK + one atomic RPC cleanly covers BOTH counters and avoids having to
-- aggregate a per-IP total across many install rows (which would be racy).

create table if not exists public.extension_rate_limits (
  scope        text        not null,          -- 'install' | 'ip'
  key          text        not null,          -- install UUID or SHA-256 IP hash (no raw IPs)
  window_start timestamptz not null default now(),
  scan_count   integer     not null default 0,
  primary key (scope, key)
);

-- Only the service role (bypasses RLS) and the SECURITY DEFINER RPC touch this table.
-- RLS enabled with NO policies = deny-all for anon/authenticated (nothing to leak anyway).
alter table public.extension_rate_limits enable row level security;

-- Atomically bump one (scope,key) counter within a fixed rolling window and return the
-- post-bump state. Mirrors bump_scan_rate (migration 026): the read-modify-write is a single
-- upsert so concurrent scans can't race past the limit. Returns richer fields than a bare
-- boolean so the endpoint can tell the extension exactly how many scans remain and when the
-- window resets ("3 free scans a day, come back tomorrow"). The window resets only once the
-- stored window_start is older than p_window_seconds, so reset_at stays stable within a day.
create or replace function public.bump_extension_rate(
  p_scope text,
  p_key text,
  p_window_seconds integer,
  p_max integer
) returns table(allowed boolean, scan_count integer, remaining integer, reset_at timestamptz)
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_start timestamptz;
  v_now   timestamptz := now();
begin
  insert into public.extension_rate_limits (scope, key, window_start, scan_count)
    values (p_scope, p_key, v_now, 1)
  on conflict (scope, key) do update
    set
      scan_count = case
        when public.extension_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then 1
        else public.extension_rate_limits.scan_count + 1
      end,
      window_start = case
        when public.extension_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
        else public.extension_rate_limits.window_start
      end
  returning public.extension_rate_limits.scan_count, public.extension_rate_limits.window_start
    into v_count, v_start;

  allowed    := v_count <= p_max;
  scan_count := v_count;
  remaining  := greatest(0, p_max - v_count);
  reset_at   := v_start + make_interval(secs => p_window_seconds);
  return next;
end;
$$;
