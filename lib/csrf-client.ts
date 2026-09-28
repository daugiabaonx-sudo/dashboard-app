/**
 * Browser-side CSRF helper — reads the readable cookie set by the
 * proxy and attaches it as the `x-sunext-csrf` header on state-changing
 * fetches. Pure client module; must not import server-only deps.
 */
import { CSRF_COOKIE_READABLE, CSRF_HEADER } from "@/lib/csrf-constants";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const segments = document.cookie ? document.cookie.split(";") : [];
  for (const raw of segments) {
    const trimmed = raw.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return undefined;
}

type Json = Record<string, unknown>;

export type CsrfFetchOptions = Omit<RequestInit, "headers" | "body"> & {
  body?: unknown;
  headers?: HeadersInit;
};

/**
 * Drop-in `fetch` replacement for write endpoints (POST/PATCH/PUT/DELETE).
 * Auth endpoints (`/api/auth/*`) are still safe — the proxy skips CSRF for
 * them — but passing the header is harmless.
 */
export function csrfFetch(input: string, init: CsrfFetchOptions = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const token = readCookie(CSRF_COOKIE_READABLE);
    if (token) headers.set(CSRF_HEADER, token);
  }
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, {
    ...init,
    headers,
    body,
  });
}

export async function csrfJson<T = Json>(input: string, init: CsrfFetchOptions = {}): Promise<T> {
  const res = await csrfFetch(input, init);
  return (await res.json().catch(() => ({}))) as T;
}
