// tests/e2e/dashboard-v2.spec.ts
// Visual-only spec for the v2 dashboard. Gated by NEXT_PUBLIC_DASHBOARD_V2=1
// (set when the spec is invoked). Captures 6 screenshots — desktop / tablet /
// mobile × light / dark — and asserts no hydration error or console error
// fires. Uses the MOCK_SUPABASE=1 proxy auto-login so `/` lands on the
// dashboard directly.

import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = "ux-screenshots/dashboard-v2";

test.beforeAll(() => {
  if (process.env.NEXT_PUBLIC_DASHBOARD_V2 !== "1") {
    throw new Error(
      "dashboard-v2.spec.ts requires NEXT_PUBLIC_DASHBOARD_V2=1. " +
        "Re-run with that env var set.",
    );
  }
});

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

      // KPI strip must be present.
      await expect(page.getByText(/Total tasks/i).first()).toBeVisible();

      // Featured tasks card title.
      await expect(page.getByText(/Featured tasks/i)).toBeVisible();

      // Status donut card title.
      await expect(page.getByText(/Task status/i)).toBeVisible();

      // Blockers card title.
      await expect(page.getByText(/Workflow blockers/i)).toBeVisible();

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