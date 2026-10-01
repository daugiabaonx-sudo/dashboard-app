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

// Try several locator strategies
console.log("css [data-title]:", await page.locator("[data-title]").count());
console.log("css [data-sonner-toast]:", await page.locator("[data-sonner-toast]").count());
console.log("text=Invalid login credentials:", await page.getByText("Invalid login credentials", { exact: true }).count());
console.log("text=/Invalid login credentials/:", await page.getByText("Invalid login credentials").count());
console.log("text=/invalid credentials/i:", await page.getByText(/invalid credentials/i).count());
console.log("role=alert:", await page.getByRole("alert").count());

// Try locating by its parent region
const regionCount = await page.getByRole("region", { name: /Notifications/ }).count();
console.log("region count:", regionCount);

if (regionCount > 0) {
  const region = page.getByRole("region", { name: /Notifications/ });
  console.log("region text:", (await region.textContent()).slice(0, 100));
}

await browser.close();
