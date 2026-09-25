import { expect, test } from "@playwright/test";

test.describe("Navigation & cross-page", () => {
  test("sidebar nav highlights active route", async ({ page, isMobile }) => {
    await page.goto("/");

    // On mobile, open the nav drawer first
    if (isMobile) {
      await page.getByRole("button", { name: /open navigation/i }).click();
      await page.waitForSelector("nav[aria-label='Primary']:visible", { state: "visible" });
    }

    const primaryNav = page.locator("nav[aria-label='Primary']:visible");
    const dashLink = primaryNav.getByRole("link", { name: /dashboard/i });
    await expect(dashLink).toHaveAttribute("aria-current", "page");

    await primaryNav.getByRole("link", { name: /projects/i }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/portfolio/i);
  });

  test("project list → detail navigation works", async ({ page }) => {
    await page.goto("/projects");
    // Featured project is the first link with this name
    const firstCard = page.getByRole("link", { name: /customer portal v2/i }).first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/projects\/p1$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/customer portal v2/i);
  });

  test("team list → member detail navigation works", async ({ page }) => {
    await page.goto("/team");
    const memberLink = page.getByRole("link", { name: /minh anh/i }).first();
    await memberLink.click();
    await expect(page).toHaveURL(/\/team\/u1$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/minh anh/i);
  });
});



