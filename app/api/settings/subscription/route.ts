import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getOrRepairStripeCustomer } from "@/lib/stripeCustomer";

type ProfileRow = {
  id: string;
  plan: string | null;
  stripe_customer_id: string | null;
  notification_scan_complete?: boolean | null;
  notification_product_updates?: boolean | null;
};

function formatCardExpiry(month: number | null | undefined, year: number | null | undefined): string {
  if (!month || !year) return "—";
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export async function GET(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!stripeKey || !supabaseUrl || !serviceKey || !appUrl) {
      return NextResponse.json(
        { error: "Settings services are not configured." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, plan, stripe_customer_id, notification_scan_complete, notification_product_updates")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const p = profile as ProfileRow;
    const out: Record<string, unknown> = {
      plan: (p.plan ?? "free").toLowerCase() === "pro" ? "pro" : "free",
      notification_scan_complete: p.notification_scan_complete ?? true,
      notification_product_updates: p.notification_product_updates ?? true,
      subscription: null,
      payment_method: null,
    };

    if ((out.plan as string) === "pro" && p.stripe_customer_id) {
      const { customerId, recreated, customer } = await getOrRepairStripeCustomer({
        supabase,
        stripe,
        userId: user.id,
        email: user.email,
      });

      // A freshly recreated customer (old id was invalid) has no subscription or
      // payment history — surface as "no subscription" instead of querying Stripe.
      if (recreated) {
        console.warn(
          `[settings/subscription] Stored Stripe customer for user ${user.id} was invalid and recreated; returning no active subscription.`
        );
        return NextResponse.json(out);
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 5,
        expand: ["data.default_payment_method", "data.items.data.price"],
      });
      const activeSub =
        subscriptions.data.find((s) => s.status === "active" || s.status === "trialing") ??
        subscriptions.data.find((s) => s.status !== "canceled") ??
        null;

      if (activeSub) {
        const item = activeSub.items.data[0];
        const amount = item?.price?.unit_amount ?? null;
        const currency = (item?.price?.currency ?? "usd").toUpperCase();
        const periodEnd = (activeSub as unknown as { current_period_end?: number }).current_period_end ?? null;
        out.subscription = {
          id: activeSub.id,
          status: activeSub.status,
          cancel_at_period_end: activeSub.cancel_at_period_end,
          current_period_end: periodEnd,
          amount,
          currency,
        };

        const defaultPm = activeSub.default_payment_method;
        if (defaultPm && typeof defaultPm !== "string" && defaultPm.type === "card") {
          out.payment_method = {
            brand: defaultPm.card?.brand ?? "Card",
            last4: defaultPm.card?.last4 ?? "----",
            exp: formatCardExpiry(defaultPm.card?.exp_month, defaultPm.card?.exp_year),
          };
        }
      }

      if (!out.payment_method && customer && !("deleted" in customer) && customer.invoice_settings.default_payment_method) {
        const pmId = customer.invoice_settings.default_payment_method as string;
        const pm = await stripe.paymentMethods.retrieve(pmId);
        if (pm.type === "card") {
          out.payment_method = {
            brand: pm.card?.brand ?? "Card",
            last4: pm.card?.last4 ?? "----",
            exp: formatCardExpiry(pm.card?.exp_month, pm.card?.exp_year),
          };
        }
      }
    }

    return NextResponse.json(out);
  } catch (err) {
    console.error("[settings/subscription] Failed to load subscription:", err);
    return NextResponse.json(
      { error: "We couldn't load your billing details. Please try again or contact support." },
      { status: 500 }
    );
  }
}
