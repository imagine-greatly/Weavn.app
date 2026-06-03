create table if not exists industry_benchmarks (
  id uuid primary key default gen_random_uuid(),
  site_type text not null unique,
  avg_score numeric not null,
  p10_score numeric not null,
  p50_score numeric not null,
  p90_score numeric not null,
  sample_size integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into industry_benchmarks
  (site_type, avg_score, p10_score, p50_score, p90_score, sample_size)
values
  ('saas',        61, 38, 62, 79, 100),
  ('ecommerce',   58, 35, 59, 76, 100),
  ('agency',      55, 32, 56, 74, 100),
  ('local',       49, 28, 50, 70, 100),
  ('marketplace', 63, 40, 64, 80, 100),
  ('unknown',     57, 34, 58, 75, 100)
on conflict (site_type) do nothing;
