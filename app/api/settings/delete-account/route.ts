import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { isMissingStripeCustomerError } from "@/lib/stripeCustomer";

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

    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const typedEmail = (body.email ?? "").trim().toLowerCase();
    if (!typedEmail) return NextResponse.json({ error: "Email confirmation is required." }, { status: 400 });

    const stripe = new Stripe(stripeKey);
    const supabase = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userEmail = (user.email ?? "").trim().toLowerCase();
    if (!userEmail || typedEmail !== userEmail) {
      return NextResponse.json({ error: "Confirmation email does not match your account." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id as string | null | undefined;
    if (customerId) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 10,
        });
        for (const sub of subs.data) {
          if (sub.status !== "canceled") {
            await stripe.subscriptions.cancel(sub.id);
          }
        }
      } catch (err) {
        // A stale/invalid stored id (wrong Stripe account/mode) has no
        // subscriptions to cancel under the current key. Don't block deletion on
        // it — and deliberately do NOT recreate a customer for an account that is
        // being deleted (that would orphan an empty customer). Log and continue.
        if (!isMissingStripeCustomerError(err)) throw err;
        console.warn(
          `[settings/delete-account] Stored Stripe customer ${customerId} for user ${user.id} not found (resource_missing); skipping subscription cancellation.`
        );
      }
    }

    await supabase.from("resolved_findings").delete().eq("user_id", user.id);
    await supabase.from("reports").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings/delete-account] Account deletion failed:", err);
    return NextResponse.json(
      { error: "We couldn't delete your account. Please try again or contact support." },
      { status: 500 }
    );
  }
}
