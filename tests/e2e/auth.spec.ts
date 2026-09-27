// tests/e2e/auth.spec.ts
// Exercises the login form, error path, and header sign-out button.
//
// The suite is intentionally self-contained — it uses the explicit
// /login form rather than relying on the proxy's mock-mode auto-login.
// This lets the auth flow itself be covered, instead of just assumed.

import { expect, test } from "@playwright/test";
import { TEST_USERS, signInAs } from "./_helpers/auth";

test.describe("Auth flow", () => {
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

    // Sign-in failed → sonner error toast. We assert by visible text — the
    // toast has its own short auto-dismiss window, so we wait for it
    // eagerly rather than assuming it stays around for assertion.
    await expect(
      page.getByText(/invalid credentials/i),
    ).toBeVisible({ timeout: 10_000 });

    // Still on /login — no redirect on error.
    await expect(page).toHaveURL(/\/login$/);
  });

  test("header sign-out button returns to /login", async ({ page }) => {
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
