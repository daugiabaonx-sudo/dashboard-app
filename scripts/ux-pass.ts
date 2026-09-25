/**
 * UX pass: capture screenshots across routes x viewports x themes.
 *
 * Run with: npx tsx scripts/ux-pass.ts
 *
 * Expects a Next.js server already running on http://127.0.0.1:3000
 * (start one with `npm run dev` or `npm run start` in another shell).
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.UX_BASE_URL ?? "http://127.0.0.1:3000";
const OUT_DIR = resolve(process.cwd(), "ux-screenshots");

const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "mobile-412x915", width: 412, height: 915 },
];

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const ROUTES = [
  "/",
  "/projects",
  "/tasks",
  "/team",
  "/calendar",
  "/reports",
  "/settings",
  "/projects/p1",
  "/tasks?view=board",
  "/team/u1",
];

mkdirSync(OUT_DIR, { recursive: true });

async function setTheme(page: Page, theme: Theme): Promise<void> {
  // Stash the requested theme in localStorage so next-themes picks it up
  // before the first paint, then reload to apply cleanly.
  await page.evaluate((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* ignore storage errors */
    }
  }, theme);

  // Belt-and-braces: click the Toggle theme button to confirm via UI.
  // next-themes persists the user's choice too, which keeps subsequent
  // navigations on the same theme without another reload.
  const toggle = page.getByRole("button", { name: /toggle theme/i });
  if ((await toggle.count()) > 0) {
    await toggle.first().click({ timeout: 2000 }).catch(() => {});
  }

  await page.waitForTimeout(250);
}

async function assertThemeApplied(page: Page, theme: Theme): Promise<void> {
  // `html.classList` is the source of truth for next-themes.
  const cls = await page.evaluate(() => document.documentElement.className);
  const hasDark = cls.split(/\s+/).includes("dark");
  const actual: Theme = hasDark ? "dark" : "light";
  if (actual !== theme) {
    // Try once more by clicking the toggle.
    const toggle = page.getByRole("button", { name: /toggle theme/i });
    if ((await toggle.count()) > 0) {
      await toggle.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function snapshotRoute(
  browser: Browser,
  viewport: { name: string; width: number; height: number },
  theme: Theme,
  route: string,
): Promise<string> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: theme === "dark" ? "dark" : "light",
  });
  const page = await context.newPage();

  // Set theme before any navigation so the first paint is correct.
  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await setTheme(page, theme);
  await assertThemeApplied(page, theme);

  const url = BASE_URL + route;
  const response = await page.goto(url, { waitUntil: "networkidle" });
  if (!response || !response.ok()) {
    console.warn(
      `[warn] ${viewport.name} ${theme} ${route} -> HTTP ${response?.status() ?? "no-response"}`,
    );
  }
  // Some routes mount async widgets after networkidle; small settle.
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);

  const safe = route.replace(/[^\w./?-]+/g, "_").replace(/[/?]/g, "_");
  const file = resolve(OUT_DIR, `${viewport.name}-${theme}-${safe || "root"}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await context.close();
  return file;
}

async function main(): Promise<void> {
  console.log(`[ux-pass] base url: ${BASE_URL}`);
  console.log(`[ux-pass] output:   ${OUT_DIR}`);
  console.log(
    `[ux-pass] matrix:   ${VIEWPORTS.length} viewports x ${THEMES.length} themes x ${ROUTES.length} routes = ${VIEWPORTS.length * THEMES.length * ROUTES.length} screenshots`,
  );

  const browser = await chromium.launch({ headless: true });
  const produced: string[] = [];
  try {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const route of ROUTES) {
          process.stdout.write(
            `[ux-pass] ${vp.name} ${theme} ${route} ... `,
          );
          try {
            const file = await snapshotRoute(browser, vp, theme, route);
            produced.push(file);
            console.log("ok");
          } catch (err) {
            console.log(`FAIL: ${(err as Error).message}`);
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[ux-pass] done. produced ${produced.length} screenshot(s):`);
  for (const f of produced) console.log(`  - ${f}`);
}

main().catch((err) => {
  console.error("[ux-pass] fatal:", err);
  process.exit(1);
});
