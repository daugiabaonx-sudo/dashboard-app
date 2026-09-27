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
    // Kanban column headers. Each kanban card also renders a <select>
    // with status options like "Backlog"/"To do", so the text-only
    // locator would resolve to N elements (strict-mode violation).
    // Scope to the column CardTitle <h3>s to assert the column headers
    // specifically.
    for (const label of ["Backlog", "To do", "In progress", "In review", "Done"]) {
      await expect(
        page.getByRole("heading", { name: label, level: 3 }),
      ).toBeVisible();
    }
  });

  test("URL state preserves view when switching back to list", async ({ page }) => {
    await page.goto("/tasks?view=board");
    await page.goto("/tasks?view=list");
    await expect(page).toHaveURL(/view=list/);
    await expect(page.locator("text=Design billing summary").first()).toBeVisible();
  });
});


