import { expect, test } from "@playwright/test";

test.describe("Theme & a11y basics", () => {
  test("default theme is light and toggling flips to dark", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialTheme = await html.getAttribute("class");
    expect(initialTheme ?? "").not.toMatch(/dark/);

    // Scope to header so mobile overlay doesn't intercept
    const toggle = page.locator("header").getByRole("button", { name: /toggle theme/i });
    await toggle.click();
    await expect(html).toHaveClass(/dark/);

    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("header search has accessible label", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: /search/i });
    await expect(search).toBeVisible();
  });

  test("notifications button exposes unread count", async ({ page }) => {
    await page.goto("/");
    const bell = page
      .locator("header")
      .getByRole("button", { name: /notifications, \d+ unread/i });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByText(/Mark all read/i)).toBeVisible();
  });

  test("no console errors on dashboard load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("all routes return HTTP 200 and render main landmark", async ({ page }) => {
    const routes = [
      "/",
      "/projects",
      "/projects/p1",
      "/tasks",
      "/tasks?view=board",
      "/team",
      "/team/u1",
      "/calendar",
      "/reports",
      "/settings",
    ];
    for (const route of routes) {
      const res = await page.goto(route);
      expect(res?.status(), `Route ${route} should return 200`).toBe(200);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

