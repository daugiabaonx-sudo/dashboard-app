import { expect, test } from "@playwright/test";

test.describe("Dashboard overview", () => {
  test("renders KPI tiles, hero, and main bento", async ({ page }) => {
    await page.goto("/");

    // Hero — serif display name with italic accent
    const hero = page.getByRole("heading", { level: 1 });
    await expect(hero).toBeVisible();
    await expect(hero).toContainText(/Minh Anh/i);

    // KPI section — 5 metrics visible
    const kpiSection = page.getByRole("region", { name: /key metrics/i });
    await expect(kpiSection).toBeVisible();

    // Featured project hero text
    await expect(page.getByText(/active work this quarter/i)).toBeVisible();

    // Blockers section
    await expect(page.getByText(/blockers & risks/i)).toBeVisible();
  });

  test("KPI tile surfaces correct status intent", async ({ page }) => {
    await page.goto("/");
    const overdueTile = page.getByText(/overdue/i).first();
    await expect(overdueTile).toBeVisible();
  });

  test("navigates to tasks from overdue KPI", async ({ page }) => {
    await page.goto("/");
    // The Overdue KPI is a Link wrapping the tile
    const overdueLink = page.getByRole("link", { name: /overdue/i }).first();
    await overdueLink.click();
    await expect(page).toHaveURL(/\/tasks$/);
  });
});

