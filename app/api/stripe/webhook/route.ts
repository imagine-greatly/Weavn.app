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
        const userId = session.metadata?.supabase_user_id;

        if (!userId) break;

        // The tier was chosen from the catalog at checkout and stamped on the
        // session metadata; fall back to 'free' if somehow absent.
        const plan = session.metadata?.plan ?? 'free';

        await supabase
          .from('profiles')
          .update({
            plan,
            stripe_customer_id: session.customer as string,
          })
          .eq('id', userId);

        console.log(`[webhook] User ${userId} upgraded to ${plan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) break;

        await supabase
          .from('profiles')
          .update({ plan: 'free' })
          .eq('id', userId);

        console.log(`[webhook] User ${userId} downgraded to free`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) break;

        const isActive = subscription.status === 'active';
        const activePriceId = subscription.items.data[0]?.price.id;
        // Real catalog mapping (kills always-'pro'). Unknown price → leave as-is
        // by falling back to 'free' only when the subscription is inactive.
        const mapped = planFromPriceId(activePriceId);
        const activePlan = isActive ? (mapped ?? 'free') : 'free';

        await supabase
          .from('profiles')
          .update({ plan: activePlan })
          .eq('id', userId);

        console.log(
          `[webhook] User ${userId} subscription updated: ${subscription.status} → ${activePlan}`
        );
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
