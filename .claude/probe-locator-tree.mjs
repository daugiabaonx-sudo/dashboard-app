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

// Check the accessibility tree — does it include the alert/toast?
const a11yRoot = await page.evaluate(() => {
  function walk(el, depth=0) {
    if (depth > 12) return null;
    const a = {
      tag: el.tagName,
      role: el.getAttribute("role"),
      ariaLabel: el.getAttribute("aria-label"),
      text: el.children.length === 0 ? el.textContent.slice(0, 80) : null,
    };
    const cs = [];
    for (const c of el.children) cs.push(walk(c, depth+1));
    a.children = cs.filter(Boolean);
    return a;
  }
  return walk(document.querySelector("section[aria-label*='Notifications']") || document.body);
});
console.log(JSON.stringify(a11yRoot, null, 2).slice(0, 2000));

await browser.close();
