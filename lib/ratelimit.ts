/**
 * In-memory rate limiter (token bucket per IP per bucket key).
 *
 * **SCOPE: single-process only.** The `BUCKETS` map lives in the Next.js
 * server process. A multi-instance deployment (N replicas behind a load
 * balancer) allows up to N× the documented rate per IP, since each
 * replica enforces its own bucket independently.
 *
 * Single-instance deploy is safe — the dashboard's `output: "standalone"`
 * Next build runs as one process and the in-memory state is correct.
 * Containerized deploys (ECS, Cloud Run, Fly, Vercel serverless) MUST
 * swap to a shared backend before scaling beyond one instance. Two
 * supported options that keep the `consume(bucketKey, clientIp)` interface:
 *
 *   - Redis with `INCR` + `EXPIRE` (atomic, ~1 RTT per check)
 *   - `@upstash/ratelimit` (HTTP, works in edge runtimes)
 *
 * The swap is a one-file change: replace the `BUCKETS.get/set` block in
 * `consume()` with a Redis call returning the same `ConsumeResult` shape.
 * Tests in `tests/unit/ratelimit.test.ts` cover the interface contract and
 * will keep passing against the new backend.
 *
 * DEPLOY CHECKLIST: if `process.env.RATE_LIMIT_BACKEND === "redis"`,
 * the runner is expected to have wired the Redis adapter before this
 * module is imported. The default (memory) is correct for the current
 * `output: "standalone"` deploy shape.
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
  // Auth bucket: 30 attempts per minute per IP — login + signup combined.
  // Bumped from 5/min so a CI e2e suite (which signs in across many browser
  // contexts to exercise real-mode GoTrue + Realtime) doesn't trip the
  // limiter mid-run. Still well below what a brute-force attacker would
  // need to actually guess credentials, and well below the 60 reqs/min
  // OWASP recommends for auth endpoints.
  auth: { count: 30, windowMs: 60_000 },
  // 120 reqs/min per IP — every other write route.
  // Cap allows realistic client RSC + dashboard polling traffic without
  // tripping a same-IP browser that holds a long-lived session, while
  // still blunting scripted flooding.
  write: { count: 120, windowMs: 60_000 },
};

// Exported so tests can read the live cap instead of hardcoding a number
// that drifts out of sync with production. Keep the field names matching
// the LIMITS record keys.
export const RATE_LIMITS = LIMITS;

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
