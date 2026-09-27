// tests/e2e/_helpers/auth.ts
// Shared auth helpers for Playwright specs.
//
// Mock-mode UX: the proxy auto-signs requests in as `minhanh@sunext.io` when
// no cookie is present, but specs that exercise the login flow itself need
// to drive the form explicitly. These helpers post directly to
// /api/auth/sign-in so each test starts from a deterministic auth state.

import { expect, type Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
}

export const TEST_USERS = {
  owner: {
    email: "minhanh@sunext.io",
    password: "test-password-123",
  },
} as const satisfies Record<string, TestUser>;

export interface SignInOptions {
  /**
   * Path to navigate to after a successful sign-in.
   * Defaults to "/" (the dashboard root).
   */
  redirectTo?: string;
}

/**
 * Sign in via the public login form. Submits `email` + `password`, waits
 * for the success toast and the resulting redirect, and returns once the
 * landing page's <main> landmark is visible.
 */
export async function signInAs(
  page: Page,
  email: string,
  password: string,
  options: SignInOptions = {},
): Promise<void> {
  const redirectTo = options.redirectTo ?? "/";
  await page.goto("/login");

  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Mock-mode form posts and router.push(next). Wait for the URL to leave
  // /login — uses auto-retry so soft client-side navigations work too.
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 10_000 });

  if (redirectTo !== "/") {
    await page.goto(redirectTo);
  }

  // Dashboard pages render <main> as their content landmark.
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
}
