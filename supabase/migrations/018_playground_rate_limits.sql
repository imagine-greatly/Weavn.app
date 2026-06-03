-- Rate limiting table for the public playground (1 scan per IP per hour).
-- ip_hash stores SHA-256 of the visitor IP — no raw IPs stored.
create table if not exists playground_rate_limits (
  ip_hash text primary key,
  last_scan_at timestamptz not null default now()
);
