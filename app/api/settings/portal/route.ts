import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!stripeKey || !supabaseUrl || !serviceKey || !appUrl) {
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
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    const customerId = profile?.stripe_customer_id as string | null | undefined;
    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer found." }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
