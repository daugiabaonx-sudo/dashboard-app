// tests/integration/_helpers/call-route.ts
// Invoke a Next.js App-Router route handler directly with a constructed
// Request, then normalise the response so tests can assert on plain
// values instead of poking at NextResponse internals.
//
// Skips the proxy.ts middleware (CSRF, rate-limit, session-refresh,
// redirect-to-login) — those are E2E concerns covered by Playwright.
// The integration suite only verifies: validation, auth gating via
// requireUser() / getSession(), the db call made by the handler, and
// the JSON response shape.

import { NextResponse, type NextRequest } from "next/server";

export interface RouteResponse {
  status: number;
  json: unknown;
  headers: Headers;
  cookies: Array<{ name: string; value: string }>;
  /** True when requireUser() triggered a redirect (treat as 401 in tests). */
  redirected: boolean;
  /** Set when redirected === true. */
  location: string | null;
}

export interface CallRouteOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Mocked route params for [id] routes. */
  params?: Record<string, string>;
}

export type RouteHandlerFn = (
  request: Request | NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

const DEFAULT_URL = "http://localhost:3000/api/_test";

export async function callRoute(
  handler: RouteHandlerFn,
  opts: CallRouteOptions = {},
): Promise<RouteResponse> {
  const method = (opts.method ?? "GET").toUpperCase();
  const url = opts.url ?? DEFAULT_URL;
  const headers = new Headers(opts.headers);

  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) {
    if (typeof opts.body === "string") {
      init.body = opts.body;
    } else {
      init.body = JSON.stringify(opts.body);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }
  }

  const request = new Request(url, init);
  // Some App Router handlers use NextRequest for `request.nextUrl.searchParams`.
  // Our global Request doesn't carry nextUrl, so attach a getter that returns
  // a URL built from the request URL — covers both with- and without-query.
  (request as Request & { nextUrl: URL }).nextUrl = new URL(url);
  const context = {
    params: Promise.resolve(opts.params ?? {}),
  };

  let response: Response;
  try {
    response = await handler(request, context);
  } catch (e) {
    // requireUser() calls redirect("/login") when the session is null,
    // which throws a NEXT_REDIRECT error in production. Surface it as a
    // clean 401-equivalent signal so tests don't fail with a stack trace.
    if (isRedirectError(e)) {
      const target = readRedirectTarget(e);
      return {
        status: 401,
        json: null,
        headers: new Headers(),
        cookies: [],
        redirected: true,
        location: target,
      };
    }
    throw e;
  }

  return normaliseResponse(response);
}

function isRedirectError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function readRedirectTarget(e: unknown): string | null {
  const digest = (e as { digest?: string }).digest;
  if (!digest) return null;
  // digest format: "NEXT_REDIRECT;replace;<url>;<status>"
  const parts = digest.split(";");
  return parts[2] ?? null;
}

async function normaliseResponse(response: Response): Promise<RouteResponse> {
  const status = response.status;
  const headers = new Headers(response.headers);

  // Collect Set-Cookie entries from both Headers (which collapses them)
  // and the NextResponse.cookies API (the route handlers in this project
  // use res.cookies.set() / res.cookies.delete()).
  const cookies: Array<{ name: string; value: string }> = [];
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    for (const piece of splitSetCookie(setCookie)) {
      const first = piece.split(";")[0] ?? "";
      const eq = first.indexOf("=");
      if (eq > 0) {
        cookies.push({
          name: first.slice(0, eq).trim(),
          value: first.slice(eq + 1).trim(),
        });
      }
    }
  }
  if ("cookies" in response && typeof (response as { cookies?: { getAll?: () => Array<{ name: string; value: string }> } }).cookies?.getAll === "function") {
    for (const c of (response as { cookies: { getAll: () => Array<{ name: string; value: string }> } }).cookies.getAll()) {
      if (!cookies.some((x) => x.name === c.name)) cookies.push(c);
    }
  }

  const text = await response.text();
  let json: unknown = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return {
    status,
    json,
    headers,
    cookies,
    redirected: response.redirected || status in { 301: 1, 302: 1, 303: 1, 307: 1, 308: 1 },
    location: headers.get("location"),
  };
}

function splitSetCookie(raw: string): string[] {
  // Headers.get("set-cookie") returns the joined string with ", " between
  // entries — but Expires=Wed, 01 Jan 2025 00:00:00 GMT also contains a
  // comma. Use a permissive split that requires a comma followed by a
  // token char to keep Expires values intact.
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "," && depth === 0 && /[A-Za-z0-9_-]/.test(raw[i + 1] ?? "")) {
      out.push(buf);
      buf = "";
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    buf += ch;
  }
  if (buf.length > 0) out.push(buf);
  return out;
}
