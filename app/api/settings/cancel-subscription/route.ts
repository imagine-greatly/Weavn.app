import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getOrRepairStripeCustomer } from "@/lib/stripeCustomer";

export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!stripeKey || !supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Settings services are not configured." }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const stripe = new Stripe(stripeKey);
    const supabase = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, stripe_customer_id")
      .eq("id", user.id)
      .single();
    const storedId = profile?.stripe_customer_id as string | null | undefined;
    if (!storedId) return NextResponse.json({ error: "No active customer." }, { status: 400 });

    const { customerId, recreated } = await getOrRepairStripeCustomer({
      supabase,
      stripe,
      userId: user.id,
      email: user.email,
    });

    // A recreated customer (old id was invalid) has no subscriptions to cancel.
    if (recreated) {
      console.warn(
        `[settings/cancel-subscription] Stored Stripe customer for user ${user.id} was invalid and recreated; nothing to cancel.`
      );
      return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
    }

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });
    const sub =
      subs.data.find((s) => s.status === "active" || s.status === "trialing") ??
      subs.data.find((s) => s.status !== "canceled") ??
      null;
    if (!sub) return NextResponse.json({ error: "No active subscription found." }, { status: 400 });

    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });

    // Keep plan as pro until Stripe confirms end-of-period downgrade.
    await supabase.from("profiles").update({ plan: "pro" }).eq("id", user.id);

    return NextResponse.json({
      subscription_id: updated.id,
      current_period_end:
        (updated as unknown as { current_period_end?: number }).current_period_end ?? null,
      cancel_at_period_end: updated.cancel_at_period_end,
    });
  } catch (err) {
    console.error("[settings/cancel-subscription] Cancellation failed:", err);
    return NextResponse.json(
      { error: "We couldn't update your subscription. Please try again or contact support." },
      { status: 500 }
    );
  }
}
