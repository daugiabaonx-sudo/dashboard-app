import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on("console", (m) => console.log(`  [c:${m.type()}] ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => console.log(`  [err] ${e.message}`));

await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const isHydrated = await page.evaluate(() => {
  const form = document.querySelector("form");
  if (!form) return { error: "no form" };
  const reactKey = Object.keys(form).find(k => k.startsWith("__reactProps$"));
  if (!reactKey) return { error: "no react props on form" };
  const props = form[reactKey];
  return {
    hasOnSubmit: typeof props.onSubmit === "function",
    inputEmailValue: document.querySelector('input[name="email"]')?.value || null,
  };
});
console.log("hydration probe:", JSON.stringify(isHydrated));

await browser.close();
