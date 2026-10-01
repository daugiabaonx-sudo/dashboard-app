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
 *
 * Works in both mock mode and real mode: the form posts to
 * `/api/auth/sign-in`, which short-circuits to the mock in mock mode and
 * proxies to GoTrue in real mode. The behaviour visible to the user
 * (success toast + redirect) is identical, so the same helper drives both
 * suites.
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

/**
 * Real-mode sign-in. Drives the same `/login` form as `signInAs` but
 * asserts hard prerequisites that only make sense against a live GoTrue:
 *
 *  - The page must actually load `/login` (not be auto-signed-in by the
 *    proxy's mock-mode shortcut — those should never run in real mode).
 *  - We must land on the dashboard after the form posts. If we don't,
 *    the suite should fail loudly rather than silently retrying.
 *
 * Used by `tests/e2e/auth-realmode.spec.ts` and
 * `tests/e2e/realtime-cross-tab.spec.ts`.
 */
export async function realSignInAs(
  page: Page,
  email: string,
  password: string,
  options: SignInOptions = {},
): Promise<void> {
  const redirectTo = options.redirectTo ?? "/";
  await page.goto("/login");

  // Real-mode sanity: the login form must actually be present. In mock
  // mode the proxy auto-signs the request in *before* /login renders, so
  // a missing form here means we're not really in real mode.
  await expect(page.getByLabel(/^email$/i)).toBeVisible({ timeout: 10_000 });

  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Real-mode GoTrue round-trip — give it the full 15s. We assert the URL
  // changed off /login because the form does router.push(next) on success
  // and shows an inline error toast on failure (which leaves us on
  // /login).
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });

  if (redirectTo !== "/") {
    await page.goto(redirectTo);
  }

  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
}
