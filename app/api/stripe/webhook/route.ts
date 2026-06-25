import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { planFromPriceId, DASHBOARD_PLANS, API_PLANS } from '@/lib/pricing';

// Node runtime: Stripe signature verification needs Node crypto, and we read the RAW
// request body below via req.text() (App Router gives the unparsed body — the old Pages
// Router `config.api.bodyParser=false` was a no-op here and has been removed).
export const runtime = 'nodejs';

/**
 * True when `plan` is a known tier for the surface — guards against ever writing a
 * malformed metadata value into profiles.plan / api_keys.plan.
 */
function isKnownTier(plan: unknown, surface: string): plan is string {
  if (typeof plan !== 'string') return false;
  return surface === 'api' ? plan in API_PLANS : plan in DASHBOARD_PLANS;
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-expect-error Stripe apiVersion literal union lags configured account version
    apiVersion: '2024-12-18.acacia',
  });
  let body: string;
  try {
    body = await req.text();
  } catch (err) {
    console.error('[webhook] Body read failed:', err);
    return NextResponse.json(
      { error: 'Failed to read webhook body', code: 'WEBHOOK_BODY_READ_FAILED' },
      { status: 500 }
    );
  }
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'No signature', code: 'WEBHOOK_NO_SIGNATURE' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json(
      {
        error: 'Webhook signature verification failed',
        code: 'WEBHOOK_SIGNATURE_INVALID',
      },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // IDEMPOTENT BY CONSTRUCTION: every branch below is a pure set-to-value update
  // (plan := <tier>), never an increment/append, keyed by a stable id/customer. Stripe may
  // deliver the same event more than once; re-processing simply re-asserts the same plan, so
  // state cannot be corrupted by a duplicate. event.id is logged for traceability.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const surface = session.metadata?.surface ?? 'dashboard';
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

        if (!userId) {
          console.warn(`[webhook] checkout.session.completed missing metadata.user_id — cannot map to a profile; skipping (event ${event.id})`);
          break;
        }

        // Resolve the purchased tier. metadata.plan IS the requested tier (it determined the
        // price at checkout creation); when absent, fall back to mapping the subscription's
        // active price id → tier. Validate against the catalog so a malformed metadata value
        // can never be written into the plan column.
        let plan = session.metadata?.plan;
        if (!isKnownTier(plan, surface) && session.subscription) {
          try {
            const subId =
              typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
            const sub = await stripe.subscriptions.retrieve(subId);
            const mapped = planFromPriceId(sub.items.data[0]?.price.id);
            if (mapped) plan = mapped;
          } catch (e) {
            console.error('[webhook] price-id fallback failed:', e);
          }
        }
        if (!isKnownTier(plan, surface)) {
          console.warn(`[webhook] checkout.session.completed: could not resolve a valid ${surface} plan for user ${userId} (metadata.plan=${session.metadata?.plan ?? 'none'}); skipping (event ${event.id})`);
          break;
        }

        // Dashboard track → profiles keyed by id (the PK). API track → api_keys keyed by
        // user_id. CRITICAL: profiles is keyed by `id`, NOT `user_id`.
        const update: Record<string, unknown> = { plan };
        if (customerId) update.stripe_customer_id = customerId;
        if (surface === 'api') {
          await supabase.from('api_keys').update(update).eq('user_id', userId);
        } else {
          await supabase.from('profiles').update(update).eq('id', userId);
        }
        console.log(`[webhook] ${surface} plan → ${plan} for user ${userId} (event ${event.id})`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        if (!customerId) break;

        // canceled / unpaid → revert to free; otherwise map the active price to a tier.
        const revert = subscription.status === 'canceled' || subscription.status === 'unpaid';
        const mapped = planFromPriceId(subscription.items.data[0]?.price.id);
        const newPlan = revert ? 'free' : mapped;
        // Unknown price on an active subscription → leave the plan untouched.
        if (!newPlan) break;

        // Surface is determined by which table currently holds this Stripe customer.
        const { data: apiRow } = await supabase
          .from('api_keys')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .limit(1)
          .maybeSingle();

        if (apiRow) {
          await supabase.from('api_keys').update({ plan: newPlan }).eq('stripe_customer_id', customerId);
        } else {
          await supabase.from('profiles').update({ plan: newPlan }).eq('stripe_customer_id', customerId);
        }

        console.log(
          `[webhook] subscription ${subscription.status} → ${newPlan} for customer ${customerId} (${apiRow ? 'api' : 'dashboard'}) (event ${event.id})`
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        if (!customerId) break;

        // Revert to free on both tracks for this customer.
        await supabase.from('profiles').update({ plan: 'free' }).eq('stripe_customer_id', customerId);
        await supabase.from('api_keys').update({ plan: 'free' }).eq('stripe_customer_id', customerId);

        console.log(`[webhook] subscription deleted → free for customer ${customerId} (event ${event.id})`);
        break;
      }

      case 'invoice.payment_failed': {
        // DUNNING — do NOT strip the paid plan on a single failed charge. Stripe retries on
        // its dunning schedule; only when retries are exhausted does the subscription move to
        // past_due → unpaid/canceled (customer.subscription.updated → revert) or get deleted
        // (customer.subscription.deleted → revert). Downgrading here would cut off a customer
        // whose card merely needs updating. Log for visibility; let the lifecycle events do
        // the actual downgrade so paid access ends exactly when the subscription does.
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
        console.warn(
          `[webhook] invoice.payment_failed for customer ${customerId} — dunning in progress, plan left unchanged (event ${event.id})`
        );
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed', code: 'WEBHOOK_HANDLER_FAILED' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
