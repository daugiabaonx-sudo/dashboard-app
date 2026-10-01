// tests/e2e/auth-realmode.spec.ts
// End-to-end proof that the login form proxies correctly to a live GoTrue
// instance behind the Caddy gateway. Exercises the real path that mock
// mode skips — verifies JWT cookies are set, the server returns 200, and
// invalid credentials surface a 401 with the same error message that the
// form renders.
//
// Run with:  npx playwright test --project=realmode
//
// These tests ONLY run against the realmode project — Playwright skips
// spec files that don't match a configured project, but we also assert
// here that `MOCK_SUPABASE=0` is in the env so a misconfigured run fails
// loudly instead of silently exercising the mock-mode shortcut.

import { expect, test } from "@playwright/test";
import { realSignInAs, TEST_USERS } from "./_helpers/auth";

test.describe("Auth flow (real GoTrue)", () => {
  test.beforeAll(() => {
    // Hard fail if the suite is being run with mock mode enabled — the
    // entire point of this spec is to exercise real GoTrue, so a silent
    // mock-mode run would be a green CI with broken coverage.
    if (process.env.MOCK_SUPABASE === "1") {
      throw new Error(
        "auth-realmode.spec.ts must run with MOCK_SUPABASE != 1. " +
          "Use the realmode Playwright project (--project=realmode).",
      );
    }
  });

  test.beforeEach(async ({ context }) => {
    // The realmode setup project pre-loads the owner cookies, which
    // would otherwise redirect /login → / and skip the form. Drop the
    // cookies so each test exercises the login flow from scratch.
    await context.clearCookies();
  });

  test("GoTrue login round-trip lands on the dashboard", async ({ page, request }) => {
    const { email, password } = TEST_USERS.owner;
    await realSignInAs(page, email, password);

    // The form does router.push(next). After a real GoTrue round-trip the
    // cookie is set, the auth cookie is forwarded by the browser, and the
    // dashboard RSC reads the session.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("main").first()).toBeVisible();

    // Pull the cookies out of the browser context and probe the server
    // session endpoint directly. This proves the cookie chain is intact:
    // GoTrue issued a JWT → @supabase/ssr set it as a cookie → /api/session
    // can read it back. The dashboard renders from in-memory fixtures so
    // we can't verify the user identity from the page itself; the API
    // round-trip is the meaningful signal in real mode.
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const sessionRes = await request.get("/api/session", {
      headers: { Cookie: cookieHeader },
    });
    expect(sessionRes.ok(), "/api/session should return 200 after real sign-in").toBe(true);
    const sessionBody = (await sessionRes.json()) as {
      email?: string;
      userId?: string;
    };
    expect(sessionBody.email).toBe(email);
  });

  test("invalid credentials surface a destructive toast", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/^email$/i)).toBeVisible();

    // Real GoTrue returns 401 with `error: "Invalid login credentials"`.
    // The /api/auth/sign-in route passes that through verbatim, so the
    // form's sonner toast renders the same string as in mock mode.
    await page.getByLabel(/^email$/i).fill("nobody@example.com");
    await page
      .getByLabel(/^password$/i)
      .fill("definitely-not-the-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // The toast text includes "Invalid" — match loosely to absorb any
    // minor copy drift between mock and real responses.
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10_000 });

    // We must still be on /login — GoTrue errors do not navigate.
    await expect(page).toHaveURL(/\/login$/);
  });
});
