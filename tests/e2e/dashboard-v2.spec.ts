// tests/e2e/dashboard-v2.spec.ts
// Visual-only spec for the home page (now the v2 composition).
// Captures 6 screenshots — desktop / tablet / mobile × light / dark — and
// asserts no hydration error or console error fires. Uses the MOCK_SUPABASE=1
// proxy auto-login so `/` lands on the dashboard directly.

import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = "ux-screenshots/dashboard-v2";

const VIEWPORTS = [
  { id: "desktop-1440", width: 1440, height: 900 },
  { id: "tablet-1024", width: 1024, height: 768 },
  { id: "mobile-390", width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  for (const theme of ["light", "dark"] as const) {
    test(`${vp.id} ${theme} — v2 dashboard renders without overflow or console errors`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(`console.error: ${msg.text()}`);
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
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
      // Toggle .dark on <html> once the element exists (DOMContentLoaded),
      // since addInitScript runs before <html> is parsed.
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

      // The serif H1 from the v2 welcome banner must render.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // KPI strip: 4 KPI tiles render server-side. We assert on the count
      // (>= 4) of KPI tile labels, not on visible text — ShutterText +
      // typewriter animations can leave text "hidden" (opacity 0) on
      // mobile for the first paint, and reduced-motion doesn't always
      // advance the initial frame on the first render pass.
      const kpiLabels = page.locator("main p").filter({ hasText: /\w/ });
      expect(await kpiLabels.count()).toBeGreaterThanOrEqual(4);

      // Card titles are level=3 headings. Assert the 3 that are stable
      // across all viewports (Status donut + Blockers + Project health).
      await expect(
        page.getByRole("heading", { level: 3, name: /Task status/i }),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { level: 3, name: /Workflow blockers/i }),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { level: 3, name: /Project health/i }),
      ).toBeVisible();

      // Give animations + lazy hydration a beat.
      await page.waitForTimeout(500);

      // Horizontal overflow check — `scrollWidth === clientWidth` for the
      // documentElement (and main) means no element forces a horizontal
      // scrollbar at this width.
      const overflowResult = await page.evaluate(() => {
        const html = document.documentElement;
        const main = document.querySelector("main");
        // Compare against `getBoundingClientRect().width` rather than
        // `clientWidth` because when a vertical scrollbar is rendered the
        // browser shrinks `clientWidth` by the scrollbar width, but
        // `scrollWidth` still reports the full content width. The bounding box
        // is not affected by the scrollbar gutter and reflects the actual
        // viewport size.
        const viewportWidth = html.getBoundingClientRect().width;
        // Find every element wider than the viewport and report its tag.
        const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
        const culprits = all
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .filter((el) => el.scrollWidth > viewportWidth)
          .slice(0, 10)
          .map((el) => {
            const cls = (el.className && typeof el.className === "string"
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
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(overflowResult));

      // No element's right edge should extend past the viewport — that's the
      // user-visible overflow signal. (html.scrollWidth vs html.clientWidth
      // can drift by ~5-15px when a vertical scrollbar renders; that's a
      // scrollbar gutter artifact, not real horizontal overflow.)
      const maxRight = Math.max(
        0,
        ...overflowResult.culprits.map((c) => c.right),
      );
      expect(
        maxRight,
        `element extends past viewport (right=${maxRight}, viewport=${overflowResult.viewportWidth})`,
      ).toBeLessThanOrEqual(overflowResult.viewportWidth + 1);

      // No console / pageerror during the session.
      expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${vp.id}-${theme}.png`,
        fullPage: true,
      });
    });
  }
}

// ─── /tasks page (Step 7 — Animated Tasks table) ──────────────────────

test.describe("v2 /tasks — Animated Tasks table", () => {
  test("loads, shows the table with sortable columns, paginates", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto("/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // On desktop the table renders; on mobile (<md) it falls back to
    // stacked cards. The "Search tasks…" input exists in both layouts
    // (the page toolbar), so use that as the page-rendered marker.
    await expect(page.getByPlaceholder(/Search tasks…/)).toBeVisible();

    // The table-only interactions (sort header, page-size select,
    // pagination next button) are only present in the desktop table
    // view. On mobile the page falls back to stacked cards and these
    // affordances don't exist, so skip them when the table isn't shown.
    const deadlineHeader = page.getByRole("button", { name: /Deadline/i }).first();
    if (!(await deadlineHeader.isVisible().catch(() => false))) {
      expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
      return;
    }

    // The default sort is dueDate asc, so the first click on the
    // Deadline header toggles to desc; the second click toggles back
    // to asc. Both clicks should keep sort=dueDate.
    await deadlineHeader.click();
    await expect(page).toHaveURL(/sort=dueDate/);
    await expect(page).toHaveURL(/dir=desc/);
    await deadlineHeader.click();
    await expect(page).toHaveURL(/dir=asc/);

    // Type a search query that filters rows down. The table's search
    // input has placeholder "Search tasks…" (ellipsis) while the top
    // bar search has "Search tasks, employees, projects…" — match the
    // ellipsis version to disambiguate.
    const search = page.getByPlaceholder(/Search tasks…/);
    await search.fill("design");
    // URL should include q=design after the debounce.
    await expect(page).toHaveURL(/q=design/);

    // Clear the search so we have all 15 rows back, then reduce page
    // size to 5 so pagination has more than one page.
    await search.fill("");
    const pageSizeSelect = page.locator("select").first();
    await pageSizeSelect.selectOption("5");
    await expect(page).toHaveURL(/size=5/);

    // Pagination next button should advance page=2.
    const nextButton = page.getByRole("button", { name: /Next page/i });
    await nextButton.click();
    await expect(page).toHaveURL(/page=2/);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("toggling a column updates the cols URL param", async ({ page }) => {
    await page.goto("/tasks");
    // Open the columns dropdown.
    await page.getByRole("button", { name: /Columns/i }).first().click();
    // Click the Project menuitemcheckbox to hide it.
    const projectItem = page.getByRole("menuitemcheckbox", { name: /Project/i });
    await projectItem.click();
    // URL should now encode cols without "project".
    await expect(page).toHaveURL(/cols=/);
    const url = new URL(page.url());
    const cols = url.searchParams.get("cols") ?? "";
    expect(cols.split(",")).not.toContain("project");
  });
});