import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _gc,
  classifyBucket,
  consume,
  RATE_LIMITS,
  resolveClientIp,
} from "@/lib/ratelimit";

describe("ratelimit helpers", () => {
  describe("classifyBucket", () => {
    it("groups all /api/auth/* under the auth bucket regardless of method", () => {
      expect(classifyBucket("/api/auth/sign-in", "GET")).toBe("auth");
      expect(classifyBucket("/api/auth/sign-up", "POST")).toBe("auth");
      expect(classifyBucket("/api/auth/refresh", "POST")).toBe("auth");
    });

    it("routes safe methods (GET/HEAD/OPTIONS) to the read bucket", () => {
      // Reads (no body) shouldn't share the write bucket — a single dashboard
      // page load fires several GETs (useProjects, useNotifications, etc.) and
      // a 77-spec CI suite that all originates from 127.0.0.1 will trip a
      // 120/min write cap with no actual writes happening.
      expect(classifyBucket("/api/projects", "GET")).toBe("read");
      expect(classifyBucket("/api/tasks/123", "GET")).toBe("read");
      expect(classifyBucket("/api/notifications", "GET")).toBe("read");
      expect(classifyBucket("/api/projects", "HEAD")).toBe("read");
      expect(classifyBucket("/api/projects", "OPTIONS")).toBe("read");
    });

    it("routes state-changing methods to the write bucket", () => {
      expect(classifyBucket("/api/projects", "POST")).toBe("write");
      expect(classifyBucket("/api/tasks/123", "PATCH")).toBe("write");
      expect(classifyBucket("/api/tasks/123/status", "PUT")).toBe("write");
      expect(classifyBucket("/api/tasks/123", "DELETE")).toBe("write");
    });
  });

  describe("consume", () => {
    beforeEach(() => {
      _gc(Date.now() + 10_000_000);
    });

    it("first request from an IP is allowed with remaining capacity", () => {
      const result = consume("write", "1.2.3.4");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it("blocks after the per-window cap is reached", () => {
      // Read the cap from the module so the test stays in sync if prod
      // raises/lowers the limit. Hardcoding the count (e.g. `const limit
      // = 5`) caused the test to silently pass against stale production
      // values and to miss a recent 5→30 bump.
      const limit = RATE_LIMITS.auth.count;
      for (let i = 0; i < limit; i++) {
        const r = consume("auth", "9.9.9.9");
        expect(r.ok).toBe(true);
      }
      const blocked = consume("auth", "9.9.9.9");
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("isolates buckets per IP", () => {
      for (let i = 0; i < 10; i++) {
        consume("auth", "10.0.0.1");
      }
      const freshIp = consume("auth", "10.0.0.2");
      expect(freshIp.ok).toBe(true);
    });

    it("isolates by bucket key", () => {
      for (let i = 0; i < 10; i++) {
        consume("auth", "10.0.0.3");
      }
      const freshBucket = consume("write", "10.0.0.3");
      expect(freshBucket.ok).toBe(true);
    });
  });

  describe("resolveClientIp", () => {
    it("prefers x-forwarded-for first hop", () => {
      const headers = new Headers({
        "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2",
        "x-real-ip": "10.0.0.99",
      });
      expect(resolveClientIp(headers, "fallback")).toBe("203.0.113.5");
    });

    it("falls back to x-real-ip when no xff", () => {
      const headers = new Headers({ "x-real-ip": "203.0.113.6" });
      expect(resolveClientIp(headers, "fallback")).toBe("203.0.113.6");
    });

    it("falls back to the provided default", () => {
      const headers = new Headers();
      expect(resolveClientIp(headers, "fallback")).toBe("fallback");
    });

    it("handles malformed xff safely", () => {
      const headers = new Headers({ "x-forwarded-for": "" });
      expect(resolveClientIp(headers, "fallback")).toBe("fallback");
    });
  });

  describe("_gc", () => {
    it("removes expired buckets and reports freed count", () => {
      // build up an expired bucket via consume + manual time-skew check
      consume("write", "203.0.113.7");
      const future = Date.now() + 120_000;
      const freed = _gc(future);
      expect(freed).toBeGreaterThanOrEqual(1);
    });

    it("keeps fresh buckets untouched", () => {
      consume("write", "203.0.113.8");
      const freed = _gc(Date.now() + 100); // barely after ingestion
      expect(freed).toBe(0);
    });
  });

  afterEach(() => {
    // sweep any lingering state between tests
    _gc(Date.now() + 10_000_000);
  });
});
