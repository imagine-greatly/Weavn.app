-- Associate API-track subscriptions with their Stripe customer.
--
-- The billing webhook (app/api/stripe/webhook/route.ts) needs this so that
-- customer.subscription.* events can be mapped back to the api_keys row and the
-- checkout surface (api vs dashboard) can be determined by which table holds the
-- customer. profiles already has stripe_customer_id (migration 019); api_keys did not.
alter table public.api_keys
  add column if not exists stripe_customer_id text;

create index if not exists api_keys_stripe_customer_id_idx
  on public.api_keys (stripe_customer_id)
  where stripe_customer_id is not null;
