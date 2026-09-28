/**
 * CSRF protection helpers — server-only.
 *
 * Strategy: double-submit cookie.
 *   - On every middleware pass, if the request is same-origin and lacks
 *     the readable cookie, mint a fresh token, set both the httpOnly and
 *     the readable cookie pair.
 *   - On state-changing requests (POST/PATCH/DELETE/PUT), require the
 *     client to send `x-sunext-csrf: <readable-cookie-value>`. The
 *     middleware compares header vs httpOnly cookie; mismatch = 403.
 *
 * Mock mode: still mints tokens. The check is skipped on `/api/auth/*`
 * to keep the Playwright auth flow simple.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  CSRF_COOKIE_HTTP_ONLY,
  CSRF_COOKIE_READABLE,
  SAFE_METHODS,
} from "@/lib/csrf-constants";

export {
  CSRF_HEADER,
  CSRF_COOKIE_HTTP_ONLY,
  CSRF_COOKIE_READABLE,
} from "@/lib/csrf-constants";

export function shouldEnforce(method: string, pathname: string): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  if (pathname.startsWith("/api/auth/")) return false;
  return true;
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyCsrfToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function readCsrfPair(cookies: { get(name: string): { value: string } | undefined }) {
  const httpOnly = cookies.get(CSRF_COOKIE_HTTP_ONLY)?.value;
  const readable = cookies.get(CSRF_COOKIE_READABLE)?.value;
  return { httpOnly, readable };
}
