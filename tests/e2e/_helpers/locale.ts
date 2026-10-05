// tests/e2e/_helpers/locale.ts
// Programmatic locale cookie setter. The LocaleSwitcher writes the
// `NEXT_LOCALE` cookie via the client hook; specs that don't need to
// exercise the switcher itself (table deep-links, navigation survival)
// can use this helper to land in a known locale on first paint.

import type { Page } from "@playwright/test";

export type Locale = "en" | "vi";

export async function setLocaleCookie(
  page: Page,
  locale: Locale,
): Promise<void> {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: locale,
      domain: "127.0.0.1",
      path: "/",
      sameSite: "Lax",
    },
  ]);
}
