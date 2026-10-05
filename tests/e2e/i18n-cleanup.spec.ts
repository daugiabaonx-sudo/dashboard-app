// tests/e2e/i18n-cleanup.spec.ts
// E2E coverage for the Mục 7 i18n cleanup. Mock mode (the proxy auto-signs
// you in, so no auth setup). Captures pageerror + console.error on every
// test to keep hydration regressions visible.
//
// Covers the four surfaces closed out in this milestone:
//   1. KPI strip labels (server-side `localizeKpis`)
//   2. Featured tasks / blockers day-relative labels
//   3. AnimatedTable aria-label on /tasks ("Open task <title>" / "Mở task <title>")
//   4. Top-bar profile role label and theme toggle aria-label
//   5. Blockers severity prefix
// Plus a raw-i18n-key regression: no dotted key fragments should ever be
// rendered to the user when the page is fully translated.

import { expect, test, type Page } from "@playwright/test";
import { setLocaleCookie } from "./_helpers/locale";

async function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

// Forbidden key fragments. If any of these leak into the rendered DOM under
// <main>, an i18n key path is reaching the user.
const RAW_KEY_FRAGMENTS = [
  "kpiLabels.",
  "dashboard.kpi.",
  "table.openTask",
  "daysOverduePattern",
  "daysLeftPattern",
  "daysStuckPattern",
  "common.days",
  "dashboard.blockers.blockedBy:",
  "dashboard.status.",
];

// The dashboard layout nests two <main> tags: the outer one in
// app/(dashboard)/layout.tsx (sidebar wrapper) and the inner content one
// in app/(dashboard)/page.tsx. Scope to the content main everywhere.
const contentMain = (page: Page) => page.locator("main main");

async function assertNoRawI18nKeys(page: Page) {
  const main = contentMain(page);
  const text = (await main.innerText().catch(() => "")) ?? "";
  for (const frag of RAW_KEY_FRAGMENTS) {
    expect(
      text.includes(frag),
      `Expected no raw i18n key fragment "${frag}" in <main>, but found one.`,
    ).toBe(false);
  }
}

test.describe("v2 i18n cleanup", () => {
  test("KPI tiles translate EN → VI", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");
    // Sidebar nav (English) sanity check first.
    await expect(
      page.getByRole("link", { name: /^Overview$/ }),
    ).toBeVisible();

    // Switch to VI.
    await setLocaleCookie(page, "vi");
    await page.goto("/");

    const expected = [
      "Tổng công việc",
      "Hoàn thành",
      "Đang thực hiện",
      "Trễ hạn",
      "Bị chặn",
    ];
    for (const label of expected) {
      // Use .first() because the same text appears in the StatusDonut
      // legend (e.g. "Hoàn thành" / "In progress"). One visible match
      // is enough to prove the i18n wiring.
      await expect(
        contentMain(page).getByText(label, { exact: true }).first(),
      ).toBeVisible();
    }

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("KPI tiles translate VI → EN round-trip", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/");

    await expect(
      contentMain(page).getByText("Tổng công việc", { exact: true }),
    ).toBeVisible();

    await setLocaleCookie(page, "en");
    await page.goto("/");

    const expected = [
      "Total tasks",
      "Completed",
      "In progress",
      "Overdue",
      "Blocked",
    ];
    for (const label of expected) {
      // Some labels (e.g. "In progress") also appear in the StatusDonut
      // legend — .first() is enough to prove the i18n wiring.
      await expect(
        contentMain(page).getByText(label, { exact: true }).first(),
      ).toBeVisible();
    }

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("Featured tasks days-left label translates", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/");

    // Either "Còn N ngày" or "Trễ N ngày" or "Hôm nay" appears — the
    // Featured tasks card labels days relative to the due date. Match
    // the Vietnamese day-format strings.
    const main = contentMain(page);
    const allText = (await main.innerText()) ?? "";
    expect(
      /Còn \d+ ngày|Trễ \d+ ngày|Hôm nay/.test(allText),
      `Expected Vietnamese day-relative text in main, got: ${allText.slice(0, 300)}`,
    ).toBe(true);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("Blockers days-stuck label translates", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");

    const enText = (await contentMain(page).innerText()) ?? "";
    expect(
      /\d+d stuck/.test(enText),
      `Expected EN "Nd stuck" pattern, got: ${enText.slice(0, 300)}`,
    ).toBe(true);

    await setLocaleCookie(page, "vi");
    await page.goto("/");

    const viText = (await contentMain(page).innerText()) ?? "";
    expect(
      /\d+ ngày/.test(viText),
      `Expected VI "N ngày" pattern, got: ${viText.slice(0, 300)}`,
    ).toBe(true);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("AnimatedTable 'Open task' aria-label translates", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    const enRow = page.getByRole("button", { name: /^Open task /i }).first();
    await expect(enRow).toBeVisible();
    const enLabel = await enRow.getAttribute("aria-label");
    expect(enLabel).toMatch(/^Open task /);

    await setLocaleCookie(page, "vi");
    await page.goto("/tasks");

    const viRow = page.getByRole("button", { name: /^Mở task /i }).first();
    await expect(viRow).toBeVisible();
    const viLabel = await viRow.getAttribute("aria-label");
    expect(viLabel).toMatch(/^Mở task /);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("Profile role label translates", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");

    // Admin role is the mock-default user; the top bar role chip
    // shows "Admin" (EN).
    const enRole = page.locator("header").getByText("Admin", { exact: true });
    await expect(enRole).toBeVisible();

    await setLocaleCookie(page, "vi");
    await page.goto("/");

    const viRole = page
      .locator("header")
      .getByText("Quản trị viên", { exact: true });
    await expect(viRole).toBeVisible();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("Theme toggle aria-label translates", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/");

    // Theme toggle is the icon-only button in the top bar with the
    // localized "Toggle theme" / "Chuyển giao diện" label.
    const enToggle = page.locator('header button[aria-label="Toggle theme"]');
    await expect(enToggle).toBeVisible();

    await setLocaleCookie(page, "vi");
    await page.goto("/");

    const viToggle = page.locator(
      'header button[aria-label="Chuyển giao diện"]',
    );
    await expect(viToggle).toBeVisible();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("Blockers severity prefix translates (no more 'Bị chặn bởi:')", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/");

    const viText = (await contentMain(page).innerText()) ?? "";
    // The old wired label was `dashboard.blockers.blockedBy` which
    // produced "Bị chặn bởi:" as a severity prefix in VI. The new
    // dedicated `dashboard.blockers.severity` key produces "Mức độ:".
    expect(viText).toContain("Mức độ:");
    expect(viText).not.toMatch(/Bị chặn bởi:/);

    await setLocaleCookie(page, "en");
    await page.goto("/");

    const enText = (await contentMain(page).innerText()) ?? "";
    expect(enText).toContain("Severity:");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("No raw i18n key path leaks on the home page", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/");
    await assertNoRawI18nKeys(page);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("No raw i18n key path leaks on /tasks", async ({ page }) => {
    const errors = await captureErrors(page);
    await setLocaleCookie(page, "vi");
    await page.goto("/tasks");
    await assertNoRawI18nKeys(page);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });
});