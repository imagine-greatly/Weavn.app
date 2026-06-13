import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { generateApiKey } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth/reset-password", requestUrl.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=oauth_failed", requestUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/auth", requestUrl.origin));
  }

  // Collect session cookies written during exchange so we can attach them to the final redirect
  const cookiesToWrite: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookiesToWrite.push({ name, value, options: options as Record<string, unknown> });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth?error=oauth_failed", requestUrl.origin));
  }

  // Fire-and-forget: provision API key for new users via OAuth or email confirmation.
  // Checks for an existing active key first so returning users are never duplicated.
  const { data: { user } } = await supabase.auth.getUser();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (user?.id && supabaseUrl && serviceKey) {
    const service = createClient(supabaseUrl, serviceKey);
    service
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .then(({ data: existing }) => {
        if (!existing?.length) {
          const apiKey = generateApiKey();
          return service.from("api_keys").insert({
            user_id: user.id,
            key_hash: apiKey.hash,
            key_prefix: apiKey.prefix,
            name: "Default",
            plan: "payg",
            active: true,
          });
        }
      }, () => {});
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // After successful session exchange, check for a pending scan URL stored in a cookie
  const pendingUrlCookie = request.cookies.get("pendingUrl");
  let destination: string;
  if (pendingUrlCookie?.value) {
    const raw = decodeURIComponent(pendingUrlCookie.value);
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    destination = `/dashboard?url=${encodeURIComponent(normalized)}`;
  } else {
    destination = "/app";
  }

  const response = NextResponse.redirect(new URL(destination, requestUrl.origin));

  // Apply session cookies to the redirect response
  for (const { name, value, options } of cookiesToWrite) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }

  // Clear the pending URL cookie
  if (pendingUrlCookie?.value) {
    response.cookies.set("pendingUrl", "", { path: "/", maxAge: 0 });
  }

  return response;
}
