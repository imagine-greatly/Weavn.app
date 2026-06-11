import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

    const stripe = new Stripe(key);

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
    const requestedPlan = 'pro';

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan === requestedPlan) {
      return NextResponse.json(
        { error: `Already subscribed to ${requestedPlan}`, code: 'CHECKOUT_ALREADY_SUBSCRIBED' },
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

    const priceId = process.env.STRIPE_PRO_PRICE_ID!;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?cancelled=true`,
      metadata: { supabase_user_id: user.id, plan: requestedPlan },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: requestedPlan },
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
