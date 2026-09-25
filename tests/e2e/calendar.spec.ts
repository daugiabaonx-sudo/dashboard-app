import { expect, test } from "@playwright/test";

test.describe("Calendar page", () => {
  test("renders month grid with weekday headers", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/month/i);

    // Weekday headers present
    for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      await expect(page.getByText(day, { exact: true }).first()).toBeVisible();
    }
  });

  test("view tab toggle is visible (Month/Week/Day)", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("button", { name: /^Month$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Week$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Day$/ })).toBeVisible();
  });
});
