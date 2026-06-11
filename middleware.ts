import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isProtectedPath(pathname: string): boolean {
  // Everything under /app/* is the authenticated product zone.
  if (pathname === "/app") return true;
  if (pathname.startsWith("/app/")) return true;
  if (pathname === "/analyze") return true;
  if (pathname.startsWith("/analyze/")) return true;
  if (pathname.startsWith("/report")) return true;
  return false;
}

function mergeCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Legacy scan route: the scan surface now lives at /dashboard (public marketing page).
  if (pathname === "/scan" || pathname.startsWith("/scan/")) {
    const target = new URL("/dashboard", request.url);
    target.search = request.nextUrl.search;
    const redirect = NextResponse.redirect(target);
    mergeCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (!user && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(new URL("/auth", request.url));
    mergeCookies(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/app",
    "/app/:path*",
    "/analyze",
    "/analyze/:path*",
    "/scan",
    "/scan/:path*",
    "/report/:path*",
  ],
};
