import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const f = document.querySelector("form");
  if (!f) return false;
  const k = Object.keys(f).find(k => k.startsWith("__reactProps$"));
  return k && typeof f[k].onSubmit === "function";
}, { timeout: 15_000 });

await page.getByLabel(/^email$/i).fill("nobody@example.com");
await page.getByLabel(/^password$/i).fill("definitely-not-the-password");
await page.getByRole("button", { name: /^sign in$/i }).click();

// Wait briefly for the toast to render, then check visibility
await page.waitForTimeout(1500);

const found = await page.getByText(/invalid credentials/i).count();
console.log("getByText count:", found);

const visible = await page.getByText(/invalid credentials/i).first().isVisible().catch(() => "err");
console.log("isVisible():", visible);

const visibleState = await page.evaluate(() => {
  const toast = document.querySelector("[data-sonner-toast]");
  if (!toast) return { exists: false };
  const rect = toast.getBoundingClientRect();
  const style = window.getComputedStyle(toast);
  return {
    exists: true,
    text: toast.textContent,
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    rect: { w: rect.width, h: rect.height, top: rect.top, left: rect.left },
  };
});
console.log("toast state:", JSON.stringify(visibleState, null, 2));

await browser.close();
