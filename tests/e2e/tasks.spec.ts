import { expect, test } from "@playwright/test";

test.describe("Tasks page", () => {
  test("renders list view by default", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/all tasks/i);
    // List view: at least one row of tasks should be visible
    await expect(page.locator("text=Design billing summary").first()).toBeVisible();
  });

  test("view=board URL state still renders the list (board view is v2-removed)", async ({ page }) => {
    await page.goto("/tasks?view=board");
    // The v2 surface renders the AnimatedTable regardless of `view`. The
    // `view` query is accepted for back-compat but the board layout is
    // gone, so the page still exposes the same <h1>.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/all tasks/i);
    await expect(page.locator("text=Design billing summary").first()).toBeVisible();
  });

  test("URL preserves the view query when navigating back to list", async ({ page }) => {
    await page.goto("/tasks?view=board");
    await page.goto("/tasks?view=list");
    await expect(page).toHaveURL(/view=list/);
    await expect(page.locator("text=Design billing summary").first()).toBeVisible();
  });
});


