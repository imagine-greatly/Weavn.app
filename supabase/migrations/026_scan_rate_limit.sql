-- Per-account fixed-window rate limiting for scan paths (dashboard + API).
-- Bounds scripted abuse independent of the monthly scan cap.

create table if not exists public.scan_rate_limits (
  account_key  text primary key,
  window_start timestamptz not null default now(),
  count        integer     not null default 0
);

-- Atomically bump the counter for account_key within a sliding fixed window and
-- return whether the request is allowed (count after bump <= p_max). The whole
-- read-modify-write happens in one statement so concurrent scans can't race past
-- the limit. Window resets once the current window is older than p_window_seconds.
create or replace function public.bump_scan_rate(
  p_key text,
  p_window_seconds integer,
  p_max integer
) returns boolean
language plpgsql
as $$
declare
  v_now   timestamptz := now();
  v_count integer;
begin
  insert into public.scan_rate_limits (account_key, window_start, count)
    values (p_key, v_now, 1)
  on conflict (account_key) do update
    set
      count = case
        when public.scan_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then 1
        else public.scan_rate_limits.count + 1
      end,
      window_start = case
        when public.scan_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
        else public.scan_rate_limits.window_start
      end
  returning public.scan_rate_limits.count into v_count;

  return v_count <= p_max;
end;
$$;
