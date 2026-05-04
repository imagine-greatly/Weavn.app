-- Settings page notification preferences.
alter table public.profiles
  add column if not exists notification_scan_complete boolean not null default true,
  add column if not exists notification_product_updates boolean not null default true;
