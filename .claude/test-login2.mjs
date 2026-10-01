// Diagnose login form React state — does the form have onSubmit?
import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on("console", (m) => console.log(`  [browser:${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message}`));
page.on("response", (r) => {
  if (r.url().includes("/api/auth/")) console.log(`  [resp] ${r.status()} ${r.request().method()} ${r.url()}`);
});

await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle" });
console.log("loaded /login");

const isReactForm = await page.evaluate(() => {
  const form = document.querySelector("form");
  if (!form) return "no form";
  const keys = Object.keys(form).filter(k => k.startsWith("__reactProps$"));
  if (keys.length === 0) return "no react props";
  const props = form[keys[0]];
  return props && typeof props.onSubmit === "function" ? "has onSubmit" : "no onSubmit";
});
console.log("form React state:", isReactForm);

await browser.close();