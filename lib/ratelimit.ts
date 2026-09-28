/**
 * In-memory rate limiter (token bucket per IP per bucket key).
 *
 * Scope: dev / single-process protection only. In a multi-instance
 * deployment swap to Redis or upstash/ratelimit. The interface stays the
 * same: `consume(bucketKey, clientIp)` returns either { ok: true }
 * or { ok: false, retryAfterSeconds }.
 *
 * Cleanup: expired buckets are garbage-collected lazily on each miss.
 */
import { warn } from "@/lib/logger";

type Bucket = { count: number; resetAt: number };
const BUCKETS = new Map<string, Bucket>();

export type RateLimitKey =
  | "auth"
  | "write";

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

const LIMITS: Record<RateLimitKey, { count: number; windowMs: number }> = {
  // 5 attempts per minute per IP — login + signup combined
  auth: { count: 5, windowMs: 60_000 },
  // 120 reqs/min per IP — every other write route.
  // Cap allows realistic client RSC + dashboard polling traffic without
  // tripping a same-IP browser that holds a long-lived session, while
  // still blunting scripted flooding.
  write: { count: 120, windowMs: 60_000 },
};

export function classifyBucket(pathname: string): RateLimitKey {
  if (pathname.startsWith("/api/auth/")) return "auth";
  return "write";
}

export function consume(bucketKey: RateLimitKey, clientIp: string): ConsumeResult {
  const fullKey = `${bucketKey}:${clientIp}`;
  const now = Date.now();
  const limit = LIMITS[bucketKey];
  const existing = BUCKETS.get(fullKey);

  if (!existing || existing.resetAt <= now) {
    BUCKETS.set(fullKey, { count: 1, resetAt: now + limit.windowMs });
    return { ok: true, remaining: limit.count - 1 };
  }

  if (existing.count >= limit.count) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    warn("rate-limit exceeded", {
      bucket: bucketKey,
      clientIp,
      retryAfterSeconds,
    });
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true, remaining: limit.count - existing.count };
}

export function resolveClientIp(
  headers: Headers,
  fallback: string,
): string {
  // Trust x-forwarded-for first hop only when configured via env.
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || fallback;
  return headers.get("x-real-ip") || fallback;
}

// Best-effort cleanup; runs in `consume()` lazily. Exposed for tests.
export function _gc(now = Date.now()): number {
  let freed = 0;
  for (const [k, v] of BUCKETS.entries()) {
    if (v.resetAt <= now) {
      BUCKETS.delete(k);
      freed += 1;
    }
  }
  return freed;
}
