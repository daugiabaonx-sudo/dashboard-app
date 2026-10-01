// tests/e2e/auth.spec.ts
// Exercises the login form, error path, and header sign-out button.
//
// The suite is intentionally self-contained — it uses the explicit
// /login form rather than relying on the proxy's mock-mode auto-login.
// This lets the auth flow itself be covered, instead of just assumed.
//
// In real mode the realmode project pre-loads the owner's session
// cookies via the setup project. These tests need a *logged-out* browser
// context, so they explicitly clear cookies before each test. Mock mode
// has no such cookies, so the clear is a no-op there.

import { expect, test } from "@playwright/test";
import { TEST_USERS, signInAs } from "./_helpers/auth";

test.describe("Auth flow", () => {
  test.beforeEach(async ({ context }) => {
    // Drop any inherited session cookies so the form is actually rendered
    // (the realmode setup project auto-signs in by default). Each test
    // gets its own context, but the storage state is loaded into it —
    // we need to undo that so the form shows.
    await context.clearCookies();
  });

  test("renders the login form on /login", async ({ page }) => {
    await page.goto("/login");

    // Eyebrow text identifies the product surface.
    await expect(page.getByText("SUNEXT Operations")).toBeVisible();

    // Form is interactive and pre-populated labels are reachable by name.
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^sign in$/i }),
    ).toBeVisible();
  });

  test("valid credentials redirect to the dashboard", async ({ page }) => {
    const { email, password } = TEST_USERS.owner;

    await signInAs(page, email, password);

    // Landed on the dashboard root with the main landmark visible.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("invalid credentials surface a destructive toast", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/^email$/i).fill("nobody@example.com");
    await page
      .getByLabel(/^password$/i)
      .fill("definitely-not-the-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // Sign-in failed → sonner error toast. We assert by visible text —
    // the toast has its own short auto-dismiss window, so we wait for it
    // eagerly rather than assuming it stays around for assertion.
    //
    // The toast text varies by mode: mock returns "Invalid credentials",
    // real GoTrue returns "Invalid login credentials". Both share the two
    // anchors "invalid" and "credentials" — assert via `.*` between them.
    await expect(
      page.getByText(/invalid.*credentials/i),
    ).toBeVisible({ timeout: 10_000 });

    // Still on /login — no redirect on error.
    await expect(page).toHaveURL(/\/login$/);
  });

  test("header sign-out button returns to /login", async ({ page }) => {
    // Sign in first — in real mode there's no proxy auto-login, so going
    // straight to "/" lands on /login and the Header is never mounted.
    // The beforeEach already cleared cookies, so we go through the login
    // form (not the inherited session).
    await signInAs(page, TEST_USERS.owner.email, TEST_USERS.owner.password);

    // Land on a dashboard page so the Header (which contains the sign-out
    // button) is actually mounted.
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();

    // On narrow viewports the user-name block hides but the avatar/sign-out
    // button remains in the header.
    await page
      .locator("header")
      .getByRole("button", { name: /sign out/i })
      .click();

    // The header uses router.push + router.refresh — that may be a soft
    // client-side navigation, so wait on the URL directly rather than
    // pinning to a navigation event.
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    await expect(
      page.getByText("SUNEXT Operations"),
    ).toBeVisible({ timeout: 10_000 });
  });
});
