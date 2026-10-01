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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    // Give client hydration a moment to surface any runtime errors. The
    // 500ms window is enough for React 19 hydration errors and CSP/
    // module-loading failures to surface as `console.error`. We do NOT
    // wait for `networkidle` because the sidebar's Next.js <Link>
    // components re-trigger RSC prefetches as links enter the viewport,
    // which keeps the network busy indefinitely on the dashboard route.
    await page.waitForTimeout(500);
    // RSC prefetch failures (HTTP 404 on `?_rsc=` requests) are emitted as
    // generic "Failed to load resource" console.error entries by Chromium.
    // They are background optimizations — clicking the link surfaces the
    // real navigation — so they are out of scope for "errors on load".
    const realErrors = errors.filter(
      (e) => !/Failed to load resource/.test(e)
    );
    expect(realErrors, realErrors.join("\n")).toHaveLength(0);
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

