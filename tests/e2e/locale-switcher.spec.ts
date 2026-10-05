// tests/e2e/locale-switcher.spec.ts
// E2E coverage for the v2 LocaleSwitcher + NEXT_LOCALE cookie. Mock mode
// (the proxy auto-signs you in, so no auth setup). Captures pageerror +
// console.error on every test to keep hydration regressions visible.
//
// Locator strategy: the switcher button has both `aria-label="Language"`
// (i18n'd) and a stable `data-testid="locale-switcher"`. We use the
// testid + the visible language code ("EN"/"VI") to keep locators
// locale-agnostic. The dropdown items expose `English` / `Vietnamese`
// labels in their current locale — we match the untranslated word that
// the active code emits in the trigger.
//
// Asserts only on i18n'd surfaces (sidebar nav, top-bar filters,
// "All tasks" page title). Raw key leaks and the daysFromNow formatting
// were resolved by the Mục 7 cleanup; the dedicated i18n-cleanup.spec.ts
// spec asserts those surfaces directly.

import { expect, test } from "@playwright/test";
import { setLocaleCookie } from "./_helpers/locale";

const ENGLISH_FILTERS = ["This week", "All teams", "All projects"];
const VIETNAMESE_FILTERS = ["Tuần này", "Tất cả team", "Tất cả dự án"];

const switcher = (page: import("@playwright/test").Page) =>
  page.getByTestId("locale-switcher");

async function captureErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      // Background 429s on prefetch/RSC requests are a known artefact of
      // the in-memory write rate-limit (120/min per IP) when the e2e
      // suite fires many parallel prefetches. The destination request
      // still succeeds (browser auto-retries), so the user-visible
      // behaviour is unaffected. Filter them out so flaky timing doesn't
      // fail an otherwise-green test.
      const text = msg.text();
      if (/429 \(Too Many Requests\)/.test(text)) return;
      errors.push(`console.error: ${text}`);
    }
  });
  return errors;
}

test.describe("v2 locale switcher", () => {
  test("default state — switcher reads EN after hydration", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");

    const btn = switcher(page);
    await expect(btn).toBeVisible();
    await expect(btn).toContainText("EN");

    // Sidebar should render the English nav items.
    for (const label of ["Overview", "Tasks", "Projects"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${label}$`) })).toBeVisible();
    }

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("dropdown opens with both locales; active item shows a checkmark", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");

    const btn = switcher(page);
    await btn.click();

    const enItem = page
      .getByRole("menuitem")
      .filter({ hasText: /^EN/ });
    const viItem = page
      .getByRole("menuitem")
      .filter({ hasText: /^VI/ });
    await expect(enItem).toBeVisible();
    await expect(viItem).toBeVisible();

    // The active item renders a check icon (lucide-react Check); the
    // inactive item renders a placeholder span of the same width so the
    // menu doesn't shift. Count svg check icons inside each item: the
    // active one has one, the inactive has none.
    const enCheckCount = await enItem.locator("svg.lucide-check").count();
    const viCheckCount = await viItem.locator("svg.lucide-check").count();
    expect(enCheckCount).toBe(1);
    expect(viCheckCount).toBe(0);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("EN → VI flips server-rendered strings, sets cookie, keeps URL", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");
    const urlBefore = page.url();

    await expect(switcher(page)).toContainText("EN");

    for (const label of ENGLISH_FILTERS) {
      await expect(page.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeVisible();
    }

    await switcher(page).click();
    await page
      .getByRole("menuitem")
      .filter({ hasText: /^VI/ })
      .click();

    // LocaleSwitcher calls event.preventDefault() in onSelect so the menu
    // stays open after the click — close it explicitly so the next
    // assertion isn't racing the dropdown's focus trap.
    await page.keyboard.press("Escape");

    await expect(switcher(page)).toContainText("VI");

    for (const label of VIETNAMESE_FILTERS) {
      await expect(page.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeVisible();
    }

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("vi");

    expect(page.url()).toBe(urlBefore);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("VI → EN round-trip", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/");

    await expect(switcher(page)).toContainText("VI");
    for (const label of VIETNAMESE_FILTERS) {
      await expect(page.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeVisible();
    }

    await switcher(page).click();
    await page
      .getByRole("menuitem")
      .filter({ hasText: /^EN/ })
      .click();
    await page.keyboard.press("Escape");

    await expect(switcher(page)).toContainText("EN");
    for (const label of ENGLISH_FILTERS) {
      await expect(page.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeVisible();
    }

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("en");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("deep-link with NEXT_LOCALE=vi cookie renders Vietnamese on first paint", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/");

    await expect(switcher(page)).toContainText("VI");
    for (const label of VIETNAMESE_FILTERS) {
      await expect(page.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeVisible();
    }

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("malformed cookie value falls back to EN", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.context().addCookies([
      {
        name: "NEXT_LOCALE",
        value: "fr",
        domain: "127.0.0.1",
        path: "/",
        sameSite: "Lax",
      },
    ]);
    await page.goto("/");

    await expect(switcher(page)).toContainText("EN");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("locale survives navigation to /tasks", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/");

    await expect(switcher(page)).toContainText("VI");

    await page.getByRole("link", { name: /^Công việc$/ }).click();
    await expect(page).toHaveURL(/\/tasks/);

    // The level=1 page heading is wrapped in <ShutterText>, so the
    // accessible name has spaces between every character. Assert on the
    // level=3 table card title instead, which renders the plain text.
    await expect(
      page.getByRole("heading", { level: 3, name: /^Tất cả công việc$/ }),
    ).toBeVisible();

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("vi");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("switcher button has aria-label, menu exposes two menuitems", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");

    const btn = switcher(page);
    await expect(btn).toHaveAttribute("aria-label", "Language");

    await btn.click();
    await expect(page.getByRole("menuitem")).toHaveCount(2);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });
});
