// tests/e2e/auth.setup.ts
// Playwright setup project for realmode: signs in once as the seed owner
// and persists the cookie state via `storageState`. All realmode tests
// reuse this storage state so they don't need to navigate via the login
// form on every run.
//
// Why this exists: most e2e specs (calendar, dashboard, tasks, etc.) were
// authored against the mock-mode proxy auto-login — they `goto("/")` and
// expect the dashboard to render directly. Real mode has no such shortcut
// (no `mock-sunext-auth` cookie to fake). Re-running the login form for
// every test would also burn through the auth rate-limit bucket faster
// than 30/min/IP allows.
//
// We run this as a setup project so its cookies are loaded into every
// dependent project's browser before the first test, and we only do the
// sign-in once per `npx playwright test` invocation.
//
// This spec hard-fails if MOCK_SUPABASE=1 — it must only run against
// real Supabase.

import { expect, test as setup } from "@playwright/test";
import { realSignInAs, TEST_USERS } from "./_helpers/auth";

const STORAGE_STATE_PATH = "test-results/.auth-realmode/state.json";

setup.describe("Realmode auth bootstrap", () => {
  setup.beforeAll(() => {
    if (process.env.MOCK_SUPABASE === "1") {
      throw new Error(
        "auth.setup.ts must run with MOCK_SUPABASE != 1. " +
          "The realmode setup project is for real Supabase only.",
      );
    }
  });

  setup("sign in as owner and persist cookies", async ({ page }) => {
    const { email, password } = TEST_USERS.owner;
    await realSignInAs(page, email, password);
    // Landed on the dashboard — proves the cookie chain works end to
    // end. We persist the storage state so downstream specs (which load
    // STORAGE_STATE_PATH via `playwright.config.ts`) skip the login form.
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    await page.context().storageState({ path: STORAGE_STATE_PATH });
  });
});