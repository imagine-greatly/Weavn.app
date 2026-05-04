import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ plan: "free", first_name: null });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only: session refresh cookies not written from this route */
        },
      },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, first_name")
      .eq("id", user.id)
      .single();

    console.log("[API/PROFILE] user.id:", user.id);
    console.log("[API/PROFILE] profile:", profile);
    console.log("[API/PROFILE] profileError:", profileError);

    const row = profile as { plan?: string; first_name?: string | null; is_pro?: boolean } | null;
    return NextResponse.json({
      plan: row?.plan ?? "free",
      first_name: row?.first_name ?? null,
      is_pro: row?.is_pro === true,
    });
  } catch {
    return NextResponse.json({ plan: "free", first_name: null });
  }
}
