import { expect, test } from "@playwright/test";

const DASHBOARD_SCREENSHOT_DIR = "ux-screenshots/dashboard-v2";

test.describe("Dashboard overview", () => {
  test("renders hero, KPI strip, status donut, featured tasks, blockers", async ({
    page,
  }) => {
    await page.goto("/");

    // Hero — serif display name with italic accent
    const hero = page.getByRole("heading", { level: 1 });
    await expect(hero).toBeVisible();

    // KPI strip — 5 tiles, each with a label + value
    await expect(page.getByText(/total tasks/i)).toBeVisible();
    await expect(page.getByText(/^completed$/i)).toBeVisible();
    await expect(page.getByText(/^in progress$/i).first()).toBeVisible();

    // Status donut — anchored by the "Tasks" badge inside the chart
    await expect(page.getByText(/^tasks$/i)).toBeVisible();

    // Featured tasks section
    await expect(page.getByText(/featured tasks/i)).toBeVisible();

    // Blockers section
    await expect(page.getByText(/workflow blockers/i)).toBeVisible();
  });

  test("sidebar exposes the 8 navigation entries", async ({ page }) => {
    await page.goto("/");

    // Sidebar nav links (desktop) — match by accessible name
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: /overview/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^tasks$/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /projects/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /employees/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /reports/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /calendar/i })).toBeVisible();
    await expect(
      nav.getByRole("link", { name: /notifications/i }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: /settings/i })).toBeVisible();
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
        try {
          localStorage.setItem("theme", t);
        } catch {
          // storage may be unavailable in some contexts
        }
      }, theme);
      await page.addInitScript(() => {
        const apply = () => {
          const theme = (() => {
            try {
              return localStorage.getItem("theme");
            } catch {
              return null;
            }
          })() ?? "light";
          document.documentElement.classList.toggle("dark", theme === "dark");
        };
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", apply, { once: true });
        } else {
          apply();
        }
      });
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
        try {
          localStorage.setItem("theme", t);
        } catch {
          // storage may be unavailable in some contexts
        }
      }, theme);
      await page.addInitScript(() => {
        const apply = () => {
          const theme = (() => {
            try {
              return localStorage.getItem("theme");
            } catch {
              return null;
            }
          })() ?? "light";
          document.documentElement.classList.toggle("dark", theme === "dark");
        };
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", apply, { once: true });
        } else {
          apply();
        }
      });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // KPI strip should reflow to 2 columns at this width
      const kpiSection = page.locator('section[aria-label*="tasks" i]').first();
      await expect(kpiSection).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${DASHBOARD_SCREENSHOT_DIR}/mobile-390-${theme}.png`,
        fullPage: true,
      });
    });
  }
});
