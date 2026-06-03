-- Stripe customer ID on profiles for metered billing.
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists scan_count integer not null default 0;

create index if not exists idx_profiles_stripe_customer
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
