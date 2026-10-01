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

// Match the EXACT test assertion
const re = /invalid credentials/i;
const txt = "Invalid login credentials";
console.log("node regex test:", re.test(txt));
console.log("Playwright regex match:", await page.getByText(re).count());
console.log("Playwright string match:", await page.getByText("Invalid login credentials").count());
console.log("Playwright string case-insensitive:", await page.getByText("Invalid login credentials", { exact: false }).count());

await browser.close();
