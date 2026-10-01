import { expect, test } from "@playwright/test";

const DASHBOARD_SCREENSHOT_DIR = "ux-screenshots/dashboard-v2";

test.describe("Dashboard overview", () => {
  test("renders KPI strip, status donut, featured tasks, blockers", async ({ page }) => {
    await page.goto("/");

    // Hero — serif display name with italic accent
    const hero = page.getByRole("heading", { level: 1 });
    await expect(hero).toBeVisible();
    await expect(hero).toContainText(/Minh/i);

    // KPI strip — 5 tiles, each with a label + value
    await expect(page.getByText(/tổng công việc/i)).toBeVisible();
    await expect(page.getByText(/đã hoàn thành/i)).toBeVisible();
    await expect(page.getByText(/đang làm/i).first()).toBeVisible();

    // Status donut — anchored by the "Total" badge inside the chart
    await expect(page.getByText(/^total$/i)).toBeVisible();

    // Featured tasks section
    await expect(page.getByText(/công việc nổi bật/i)).toBeVisible();

    // Blockers section
    await expect(page.getByText(/đang bị chặn/i)).toBeVisible();
  });

  test("navigates to tasks from overdue KPI", async ({ page }) => {
    await page.goto("/");
    const overdueLink = page
      .getByRole("link", { name: /quá hạn/i })
      .first();
    await overdueLink.click();
    await expect(page).toHaveURL(/\/tasks$/);
  });
});

test.describe("Dashboard visual regression", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const theme of ["light", "dark"] as const) {
    test(`1440 light/dark — ${theme}`, async ({ page }) => {
      await page.emulateMedia({
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      await page.addInitScript((t) => {
        localStorage.setItem("theme", t);
        document.documentElement.classList.toggle("dark", t === "dark");
      }, theme);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${DASHBOARD_SCREENSHOT_DIR}/desktop-1440-${theme}.png`,
        fullPage: true,
      });
    });
  }

  for (const theme of ["light", "dark"] as const) {
    test(`mobile light/dark — ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      await page.addInitScript((t) => {
        localStorage.setItem("theme", t);
        document.documentElement.classList.toggle("dark", t === "dark");
      }, theme);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${DASHBOARD_SCREENSHOT_DIR}/mobile-390-${theme}.png`,
        fullPage: true,
      });
    });
  }
});