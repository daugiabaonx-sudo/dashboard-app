// proxy.ts
// Single middleware entrypoint for Next 16. Three responsibilities:
//   1. Session refresh + route protection (mock auto-login / Supabase SSR)
//   2. CSRF token minting on first hit + verification on state-changing API calls
//   3. Token-bucket rate limit per IP per route group
//
// Unauthenticated requests to non-public paths redirect to /login.
// Public paths: /login, /signup, /api/auth/* (CSRF-skipped too), plus Next internals.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMockMode, supabaseEnv } from "@/lib/supabase/env";
import {
  CSRF_HEADER,
  CSRF_COOKIE_HTTP_ONLY,
  CSRF_COOKIE_READABLE,
  generateCsrfToken,
  readCsrfPair,
  shouldEnforce,
  verifyCsrfToken,
} from "@/lib/csrf";
import {
  classifyBucket,
  consume,
  resolveClientIp,
} from "@/lib/ratelimit";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/api/auth",
  "/_next",
  "/favicon",
];

const CSRF_COOKIE_MAX_AGE = 60 * 60 * 12;

function isPublic(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

function ensureCsrfCookies(request: NextRequest, response: NextResponse): void {
  const pair = readCsrfPair(request.cookies);
  if (pair.httpOnly && pair.readable) return;
  const token = generateCsrfToken();
  response.cookies.set(CSRF_COOKIE_HTTP_ONLY, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CSRF_COOKIE_MAX_AGE,
  });
  response.cookies.set(CSRF_COOKIE_READABLE, token, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CSRF_COOKIE_MAX_AGE,
  });
}

function applyApiGuards(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  if (!pathname.startsWith("/api/")) return null;

  const clientIp = resolveClientIp(request.headers, "unknown");
  const bucket = classifyBucket(pathname);
  const rl = consume(bucket, clientIp);
  if (!rl.ok) {
    const res = NextResponse.json(
      { error: "Too many requests", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(rl.retryAfterSeconds));
    return res;
  }

  if (!shouldEnforce(method, pathname)) return null;

  const { httpOnly, readable } = readCsrfPair(request.cookies);
  const headerValue = request.headers.get(CSRF_HEADER);
  if (!verifyCsrfToken(headerValue, httpOnly) || !readable || readable !== httpOnly) {
    const res = NextResponse.json(
      { error: "CSRF token missing or invalid" },
      { status: 403 },
    );
    res.headers.set("X-CSRF-Required", "1");
    return res;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMockMode) {
    if (!sessionCookiePresent(request)) {
      const res = NextResponse.next({ request });
      res.cookies.set("mock-sunext-auth", "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      ensureCsrfCookies(request, res);
      const apiBlock = applyApiGuards(request);
      if (apiBlock) return apiBlock;
      return res;
    }
    if (pathname === "/login" || pathname === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    const passThrough = NextResponse.next({ request });
    ensureCsrfCookies(request, passThrough);
    const apiBlock = applyApiGuards(request);
    if (apiBlock) return apiBlock;
    return passThrough;
  }

  const blocked = applyApiGuards(request);
  if (blocked) return blocked;

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

  ensureCsrfCookies(request, response);
  return response;
}

function sessionCookiePresent(request: NextRequest): boolean {
  return Boolean(request.cookies.get("mock-sunext-auth"));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
