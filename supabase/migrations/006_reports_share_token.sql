-- Public share links: opaque token only (no domain/user in URL path for privacy-by-obscurity).
alter table public.reports add column if not exists share_token text;

create unique index if not exists reports_share_token_key
  on public.reports (share_token)
  where share_token is not null;

comment on column public.reports.share_token is 'UUID for public /share/{token} read-only report access.';
