// Probe: does browser.newContext() actually isolate cookies?
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx1 = await browser.newContext();
const page1 = await ctx1.newPage();
await page1.goto("http://127.0.0.1:3000/login");
console.log("ctx1 /login URL:", page1.url());

const ctx2 = await browser.newContext();
const page2 = await ctx2.newPage();
await page2.goto("http://127.0.0.1:3000/login");
console.log("ctx2 /login URL:", page2.url());

await browser.close();