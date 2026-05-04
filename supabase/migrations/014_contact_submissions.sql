-- Contact form submissions (app/api/contact, app/contact)
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('issue', 'feedback', 'story')),
  data jsonb not null default '{}'::jsonb,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);

alter table public.contact_submissions enable row level security;
