import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { planFromPriceId } from '@/lib/pricing';

export const config = { api: { bodyParser: false } };

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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        const surface = session.metadata?.surface ?? 'dashboard';
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

        if (!userId || !plan) break;

        if (surface === 'api') {
          // API track: the plan lives on api_keys, keyed by user_id.
          const update: Record<string, unknown> = { plan };
          if (customerId) update.stripe_customer_id = customerId;
          await supabase.from('api_keys').update(update).eq('user_id', userId);
          console.log(`[webhook] User ${userId} API plan → ${plan}`);
        } else {
          // Dashboard track (default): the plan lives on profiles, keyed by id.
          const update: Record<string, unknown> = { plan };
          if (customerId) update.stripe_customer_id = customerId;
          await supabase.from('profiles').update(update).eq('id', userId);
          console.log(`[webhook] User ${userId} upgraded to ${plan}`);
        }
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
          `[webhook] subscription ${subscription.status} → ${newPlan} for customer ${customerId} (${apiRow ? 'api' : 'dashboard'})`
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

        console.log(`[webhook] subscription deleted → free for customer ${customerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile?.id) {
          await supabase
            .from('profiles')
            .update({ plan: 'free' })
            .eq('id', profile.id);

          console.log(
            `[webhook] Payment failed for customer ${customerId}, downgraded to free`
          );
        }
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
