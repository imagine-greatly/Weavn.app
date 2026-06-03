-- API Keys
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  name text not null default 'Default',
  plan text not null default 'payg',
  scans_used integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- API Usage Log
create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references api_keys(id) on delete cascade,
  url text not null,
  score integer,
  response_time_ms integer,
  status text not null default 'success',
  created_at timestamptz not null default now()
);

-- Webhooks
create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references api_keys(id) on delete cascade,
  url text not null,
  secret text not null default gen_random_uuid()::text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table api_keys enable row level security;
alter table api_usage enable row level security;
alter table webhooks enable row level security;

create policy "Users manage own api keys" on api_keys
  for all using (user_id = auth.uid());

create policy "Users view own usage" on api_usage
  for select using (
    api_key_id in (
      select id from api_keys where user_id = auth.uid()
    )
  );

create policy "Users manage own webhooks" on webhooks
  for all using (
    api_key_id in (
      select id from api_keys where user_id = auth.uid()
    )
  );
