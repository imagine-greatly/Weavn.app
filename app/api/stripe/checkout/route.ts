import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  DASHBOARD_PLANS,
  API_PLANS,
  dashboardPriceId,
  resolvePriceId,
  isCheckoutableDashboardTier,
  type BillingInterval,
  type ApiTier,
  type DashboardTier,
} from '@/lib/pricing';

type Surface = 'dashboard' | 'api';

// API tiers a user can self-serve checkout into (excludes contact-only enterprise).
const CHECKOUTABLE_API_TIERS: ApiTier[] = (Object.values(API_PLANS))
  .filter((p) => p.cta.kind === 'checkout')
  .map((p) => p.id);

function isCheckoutableApiTier(value: unknown): value is ApiTier {
  return typeof value === 'string' && (CHECKOUTABLE_API_TIERS as string[]).includes(value);
}

// Line items for an API-track checkout: flat base fee (if any) + the graduated
// metered scan price. Playground has only a metered price.
function apiLineItems(
  tier: ApiTier,
  interval: BillingInterval
): Stripe.Checkout.SessionCreateParams.LineItem[] | null {
  const plan = API_PLANS[tier];
  if (!plan.price) return null;
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const baseSlot = interval === 'year' ? plan.price.baseAnnual : plan.price.baseMonthly;
  const baseId = resolvePriceId(baseSlot);
  if (baseId) items.push({ price: baseId, quantity: 1 });
  const meteredId = resolvePriceId(plan.price.metered);
  if (!meteredId) return null; // metered price is required for the API track
  items.push({ price: meteredId }); // metered price: no quantity
  return items;
}

export async function POST(req: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.error('[checkout] STRIPE_SECRET_KEY missing');
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(key, {
      // @ts-expect-error Stripe apiVersion literal lags the SDK's pinned union; pinned to match the rest of the codebase
      apiVersion: '2024-06-20',
    });

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'CHECKOUT_UNAUTHORIZED' },
        { status: 401 }
      );
    }

    let requestBody: Record<string, unknown> = {};
    try { requestBody = await req.json(); } catch { /* no body */ }

    // Tier selected from the catalog (no hardcoded single price). Default to
    // 'pro' so the legacy "Upgrade to Pro" button keeps working without a body.
    const requestedPlan = (requestBody.plan as string | undefined) ?? 'pro';
    const interval: BillingInterval = requestBody.interval === 'year' ? 'year' : 'month';
    const surface: Surface = requestBody.surface === 'api' ? 'api' : 'dashboard';

    // Validate the plan against the catalog for the chosen surface, and resolve
    // the line items. Unknown / non-self-serve tiers are rejected with 400.
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    if (surface === 'api') {
      if (!isCheckoutableApiTier(requestedPlan)) {
        return NextResponse.json(
          { error: `API plan "${requestedPlan}" is not available for self-serve checkout`, code: 'CHECKOUT_PLAN_INVALID' },
          { status: 400 }
        );
      }
      const items = apiLineItems(requestedPlan, interval);
      if (!items) {
        console.error(`[checkout] No Stripe price configured for api/${requestedPlan}/${interval}`);
        return NextResponse.json(
          { error: 'Plan not configured', code: 'CHECKOUT_PRICE_NOT_CONFIGURED' },
          { status: 500 }
        );
      }
      lineItems = items;
    } else {
      if (!isCheckoutableDashboardTier(requestedPlan)) {
        // free has no checkout; enterprise routes to contact/booking, not Stripe.
        return NextResponse.json(
          { error: `Plan "${requestedPlan}" is not available for self-serve checkout`, code: 'CHECKOUT_PLAN_INVALID' },
          { status: 400 }
        );
      }
      const priceId = dashboardPriceId(requestedPlan, interval);
      if (!priceId) {
        console.error(`[checkout] No Stripe price configured for ${requestedPlan}/${interval}`);
        return NextResponse.json(
          { error: 'Plan not configured', code: 'CHECKOUT_PRICE_NOT_CONFIGURED' },
          { status: 500 }
        );
      }
      lineItems = [{ price: priceId, quantity: 1 }];
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('id', user.id)
      .single();

    // Already-subscribed guard applies to the dashboard track only (the API
    // track's plan lives on api_keys, not profiles).
    if (surface === 'dashboard' && profile?.plan === requestedPlan) {
      return NextResponse.json(
        { error: `Already subscribed to ${DASHBOARD_PLANS[requestedPlan as DashboardTier].name}`, code: 'CHECKOUT_ALREADY_SUBSCRIBED' },
        { status: 400 }
      );
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const metadata = { user_id: user.id, plan: requestedPlan, surface };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?cancelled=true`,
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error('[checkout] Error:', err);
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        code: 'CHECKOUT_SESSION_FAILED',
      },
      { status: 500 }
    );
  }
}
