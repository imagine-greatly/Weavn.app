import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resilience for stale / cross-account / cross-mode `profiles.stripe_customer_id`.
 *
 * The stored id can become invalid under the current STRIPE_SECRET_KEY (e.g. the
 * id was created in a different Stripe account or in test mode while the key is
 * live). When that happens Stripe answers customer-scoped calls with a 404
 * `resource_missing` ("No such customer: cus_..."). Left unhandled that bubbles
 * up as a raw 500 and leaks the id to the client. This module centralises the
 * self-heal: validate the stored id and, only when Stripe itself says it does
 * not exist, transparently recreate it.
 *
 * The customer-creation shape (email + { supabase_user_id } metadata) mirrors
 * app/api/stripe/checkout/route.ts exactly so every surface converges on one
 * customer.
 */

/**
 * Thrown ONLY when creating a brand-new Stripe customer fails. Validating or
 * repairing a stored id never throws this — a missing/deleted customer is
 * transparently recreated. Treat this as a hard billing outage, not a
 * stale-id condition.
 */
export class StripeCustomerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "StripeCustomerError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * True when a Stripe error means the referenced customer does not exist under
 * the current key (wrong account/mode, or the customer was deleted): a 404
 * `resource_missing`. This is the ONLY condition under which a stored id is
 * treated as stale and replaced — it cannot occur for a currently-valid
 * customer, so repair is safe against production data.
 */
export function isMissingStripeCustomerError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; statusCode?: number };
  return e.code === "resource_missing" || e.statusCode === 404;
}

export type StripeCustomerResult = {
  /** A Stripe customer id guaranteed valid under the current STRIPE_SECRET_KEY. */
  customerId: string;
  /**
   * True when a previously-stored id was found invalid and replaced with a new
   * customer. A recreated customer has NO subscription or payment history, so
   * read/mutate flows (subscription, cancel) should treat the user as having no
   * active subscription instead of querying Stripe for one.
   */
  recreated: boolean;
  /** The valid (existing) or newly-created Stripe customer object. */
  customer: Stripe.Customer;
};

type Params = {
  supabase: SupabaseClient;
  stripe: Stripe;
  userId: string;
  email: string | null | undefined;
};

async function createAndPersist(params: Params): Promise<Stripe.Customer> {
  const { supabase, stripe, userId, email } = params;
  let customer: Stripe.Customer;
  try {
    // Same logic/metadata as the checkout customer-creation path.
    customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { supabase_user_id: userId },
    });
  } catch (err) {
    throw new StripeCustomerError("Failed to create Stripe customer", { cause: err });
  }
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  return customer;
}

/**
 * Resolve a Stripe customer id for a user that is guaranteed valid under the
 * current key, self-healing a stale/invalid stored id.
 *
 * - Stored id valid  → returned unchanged (`recreated: false`).
 * - Stored id missing under the current key (resource_missing / deleted) → the
 *   stored id is cleared, a new customer is created + persisted, and returned
 *   with `recreated: true`.
 * - No id stored at all → a new customer is created + persisted (`recreated:
 *   false` — there was nothing to repair).
 *
 * Only throws {@link StripeCustomerError} if customer creation itself fails.
 */
export async function getOrRepairStripeCustomer(params: Params): Promise<StripeCustomerResult> {
  const { supabase, stripe, userId } = params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  const storedId =
    (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;

  if (storedId) {
    try {
      const customer = await stripe.customers.retrieve(storedId);
      if (!("deleted" in customer && customer.deleted)) {
        return { customerId: storedId, recreated: false, customer: customer as Stripe.Customer };
      }
      console.warn(
        `[stripeCustomer] Stored customer ${storedId} for user ${userId} is deleted; recreating.`
      );
    } catch (err) {
      if (!isMissingStripeCustomerError(err)) throw err;
      console.warn(
        `[stripeCustomer] Stored customer ${storedId} for user ${userId} not found under the current Stripe key (resource_missing); recreating.`
      );
    }
    // Clear the stale id first so a failure mid-recreate can't leave a bad id in place.
    await supabase.from("profiles").update({ stripe_customer_id: null }).eq("id", userId);
    const recreatedCustomer = await createAndPersist(params);
    return { customerId: recreatedCustomer.id, recreated: true, customer: recreatedCustomer };
  }

  const customer = await createAndPersist(params);
  return { customerId: customer.id, recreated: false, customer };
}
