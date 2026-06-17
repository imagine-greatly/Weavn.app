/**
 * POST /api/stripe/meter-webhook — Stripe webhook for metered billing events.
 * Verifies signature with STRIPE_METER_WEBHOOK_SECRET.
 * Handles billing.meter.error_report_triggered and customer.subscription.deleted.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_METER_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.error("[meter-webhook] Missing STRIPE_SECRET_KEY or STRIPE_METER_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });

  // Read raw body for signature verification
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret) as any;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[meter-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[meter-webhook] Received event: ${event.type}`);

  switch (event.type) {
    case "billing.meter.error_report_triggered": {
      const report = event.data.object as Record<string, unknown>;
      console.error("[meter-webhook] Meter error report triggered:", JSON.stringify(report));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null;

      if (customerId) {
        const supabase = getServiceClient();

        // Deactivate all API keys for this Stripe customer
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId);

        const userIds = (profiles ?? []).map((p: { id: string }) => p.id);

        if (userIds.length > 0) {
          const { error } = await supabase
            .from("api_keys")
            .update({ active: false })
            .in("user_id", userIds);

          if (error) {
            console.error("[meter-webhook] Failed to deactivate keys for customer:", customerId, error.message);
          } else {
            console.log(`[meter-webhook] Deactivated API keys for customer ${customerId} (${userIds.length} user(s))`);
          }
        }
      }
      break;
    }

    default:
      console.log(`[meter-webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
