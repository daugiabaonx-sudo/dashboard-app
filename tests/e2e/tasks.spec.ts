import { expect, test } from "@playwright/test";

test.describe("Tasks page", () => {
  test("renders list view by default", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/ship/i);
    // List view: at least one row of tasks should be visible
    await expect(page.locator("text=Design billing summary").first()).toBeVisible();
  });

  test("toggles to board view via URL state", async ({ page }) => {
    await page.goto("/tasks?view=board");
    // Kanban column headers
    await expect(page.getByText(/^Backlog$/)).toBeVisible();
    await expect(page.getByText(/^To do$/)).toBeVisible();
    await expect(page.getByText(/^In progress$/)).toBeVisible();
    await expect(page.getByText(/^In review$/)).toBeVisible();
    await expect(page.getByText(/^Done$/)).toBeVisible();
  });

  test("URL state preserves view when switching back to list", async ({ page }) => {
    await page.goto("/tasks?view=board");
    await page.goto("/tasks?view=list");
    await expect(page).toHaveURL(/view=list/);
    await expect(page.locator("text=Design billing summary").first()).toBeVisible();
  });
});


