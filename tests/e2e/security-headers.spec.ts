// tests/e2e/security-headers.spec.ts
// Smoke check that the production headers defined in `next.config.ts`
// are actually emitted by the running server. Catches regressions
// where someone removes the `headers()` block or disables a CSP directive.
//
// Run against `npm run start` (port 5050 in CI). The Mock Supabase flag
// doesn't matter for these checks — we just need a real response.

import { expect, test } from "@playwright/test";

const PROTECTED_ROUTES = [
  "/",
  "/login",
  "/projects",
];

test.describe("Security headers", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`emits expected headers on ${route}`, async ({ request, baseURL }) => {
      const res = await request.get(`${baseURL}${route}`);
      expect(res.status(), `${route} should be reachable`).toBeLessThan(500);

      const headers = res.headers();
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["permissions-policy"]).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
      expect(headers["x-dns-prefetch-control"]).toBe("off");

      const csp = headers["content-security-policy"];
      expect(csp, "CSP must be present").toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      // No X-Powered-By leakage.
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  }
});
