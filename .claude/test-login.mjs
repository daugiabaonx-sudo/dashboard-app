import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on("response", (r) => {
  if (r.url().includes("/api/auth/")) console.log(`  [resp] ${r.status()} ${r.url()}`);
});
page.on("pageerror", (e) => console.log(`  [err] ${e.message}`));

await page.goto("http://127.0.0.1:3000/login");
console.log("loaded /login");
await page.locator('input[name="email"]').fill("minhanh@sunext.io");
await page.locator('input[name="password"]').fill("test-password-123");
console.log("filled form");
await page.locator('button[type="submit"]').click();
console.log("clicked submit");
await page.waitForTimeout(5000);
console.log("current URL:", page.url());
await browser.close();
