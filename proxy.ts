// proxy.ts
// Session refresh + route protection. Next.js 16 renamed `middleware.ts`
// to `proxy.ts`; runtime defaults to Node.js so @supabase/ssr works.
//
// Unauthenticated requests to non-public paths redirect to /login.
// Public paths: /login, /signup, /api/auth/*, plus Next.js internals.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMockMode, supabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/api/auth",
  "/_next",
  "/favicon",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMockMode) {
    // Mock mode: skip real Supabase cookie refresh. Auto-login as the
    // default fixture owner when no session cookie exists — keeps the
    // dev experience dependency-free and the existing Playwright suite
    // (which doesn't yet perform a per-test login) green during the
    // Phase E cutover. /login and /signup still render for explicit auth.
    if (!sessionCookiePresent(request)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname;
      const res = NextResponse.next({ request });
      res.cookies.set("mock-sunext-auth", "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }
    if (pathname === "/login" || pathname === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const authed = Boolean(data.user);

  if (!authed && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authed && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

function sessionCookiePresent(request: NextRequest): boolean {
  return Boolean(request.cookies.get("mock-sunext-auth"));
}

export const config = {
  matcher: [
    // Run on all paths except Next internals, static, and the favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
