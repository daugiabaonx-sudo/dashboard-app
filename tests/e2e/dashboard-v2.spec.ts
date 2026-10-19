// tests/e2e/dashboard-v2.spec.ts
// E2E spec for the V2 Indigo Care dashboard surface (components/v2/*).
// Verifies desktop / tablet / mobile × light / dark rendering, zero
// horizontal overflow, zero console/page errors, zero background
// /api/session polling from removed RealtimeSubscriptions, and /tasks
// multi-view switching.

import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = "ux-screenshots/dashboard-v2";

const VIEWPORTS = [
  { id: "desktop-1440", width: 1440, height: 900 },
  { id: "tablet-1024", width: 1024, height: 768 },
  { id: "mobile-390", width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  for (const theme of ["light", "dark"] as const) {
    test(`${vp.id} ${theme} — v2 dashboard renders without overflow, console errors, or background session polling`, async ({
      page,
    }) => {
      const errors: string[] = [];
      const sessionCalls: string[] = [];
      page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(`console.error: ${msg.text()}`);
        }
      });
      page.on("request", (req) => {
        if (req.url().includes("/api/session")) {
          sessionCalls.push(req.url());
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("sunext-theme", t);
        } catch {
          // storage may be unavailable in some contexts
        }
      }, theme);

      await page.goto("/");

      // V2 engine sets data-theme on <html> from localStorage["sunext-theme"]
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      // Hero heading & 6 KPI cards in #v-overview
      await expect(page.locator("#heroH")).toBeVisible();
      await expect(page.locator("#kpis .kpi")).toHaveCount(6);

      // 4 overview section headings populated by v2-overview.ts
      await expect(page.locator("#h-proj")).toContainText("Tiến độ theo dự án");
      await expect(page.locator("#h-health")).toContainText("Sức khỏe tiến độ");
      await expect(page.locator("#h-att")).toContainText("Công việc cần chú ý");
      await expect(page.locator("#h-blk")).toContainText("Blocker & Decision");
      await expect(page.locator("#blkCount")).toContainText("đang mở");
      await expect(page.locator("#bHead")).toContainText("Vấn đề");

      await page.waitForTimeout(300);

      const overflowResult = await page.evaluate(() => {
        const html = document.documentElement;
        const viewportWidth = html.getBoundingClientRect().width;
        const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
        const culprits = all
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .filter((el) => el.scrollWidth > viewportWidth)
          .slice(0, 10)
          .map((el) => {
            const cls = (
              el.className && typeof el.className === "string"
                ? el.className
                : ""
            )
              .toString()
              .slice(0, 80);
            const rect = el.getBoundingClientRect();
            return {
              tag: el.tagName.toLowerCase(),
              class: cls,
              scroll: el.scrollWidth,
              client: el.clientWidth,
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          });
        return {
          viewportWidth,
          culprits,
        };
      });

      const maxRight = Math.max(
        0,
        ...overflowResult.culprits.map((c) => c.right),
      );
      expect(
        maxRight,
        `element extends past viewport (right=${maxRight}, viewport=${overflowResult.viewportWidth})`,
      ).toBeLessThanOrEqual(overflowResult.viewportWidth + 1);

      expect(sessionCalls, "RootLayout should not poll /api/session").toEqual([]);
      expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${vp.id}-${theme}.png`,
        fullPage: true,
      });
    });
  }
}

test.describe("v2 /tasks — multi-view workspace", () => {
  test("loads #v-tasks and switches between table, kanban, list, gantt, and cards views", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto("/tasks");
    await expect(page.locator("#v-tasks")).toHaveClass(/on/);
    await expect(page.locator("#secPjContainer h1")).toContainText("Dự án");
    await expect(page.locator("#tvBody")).toBeVisible();

    const pjStrip = page.locator("#pjStrip");
    await expect(pjStrip).toContainText("Tất cả dự án");
    await expect(pjStrip).not.toContainText("To do list");
    await expect(pjStrip).not.toContainText("General Tasks");
    await expect(pjStrip).not.toContainText("Test 1");
    if ((await pjStrip.locator(".pj-pill").count()) > 1) {
      await expect(pjStrip).toContainText("Sunext Manage Task");
      await expect(pjStrip).toContainText("DEV Manage Task");
      await expect(pjStrip).toContainText("Marketing Manage Task");
    }

    for (const mode of ["kanban", "list", "gantt", "cards", "table"] as const) {
      const btn = page.locator(`#tvType button[data-vt="${mode}"]`);
      await btn.click();
      await expect(btn).toHaveClass(/on/);
    }

    // Theme toggle flips data-theme on <html>
    const html = page.locator("html");
    const initialTheme = (await html.getAttribute("data-theme")) ?? "light";
    await page.locator("#themeBtn").click();
    await expect(html).toHaveAttribute(
      "data-theme",
      initialTheme === "dark" ? "light" : "dark",
    );

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });
});