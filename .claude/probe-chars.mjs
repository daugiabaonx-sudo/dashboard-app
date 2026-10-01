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
await page.waitForTimeout(1500);

const chars = await page.evaluate(() => {
  const el = document.querySelector("[data-title]");
  if (!el) return "no toast";
  const txt = el.textContent;
  return {
    text: txt,
    length: txt.length,
    codes: [...txt].map(c => c.charCodeAt(0)),
  };
});
console.log(JSON.stringify(chars, null, 2));

await browser.close();
