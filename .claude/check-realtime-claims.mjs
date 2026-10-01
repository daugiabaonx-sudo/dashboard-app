// check-realtime-claims.mjs
// Open a real page in headless Chromium to populate realtime.subscription,
// then dump the CLAIM KEYS (only the keys of claims jsonb, never values)
// so we can see which fields the realtime server stores.

import { chromium } from "playwright";
import { execSync } from "node:child_process";

const URL = "http://127.0.0.1:3000";

const psql = (sql) =>
  execSync(
    `docker exec sunext-db psql -U supabase_admin -d postgres -t -A -F'|' -c "${sql.replace(/"/g, '\\"')}"`,
  ).toString().trim();

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// JS-driven form submission — wait for the /api/auth/sign-in response.
await page.goto(`${URL}/login`);
await page.locator('input[name="email"]').fill("minhanh@sunext.io");
await page.locator('input[name="password"]').fill("test-password-123");
await Promise.all([
  page.waitForResponse(
    (r) => r.url().includes("/api/auth/sign-in") && r.request().method() === "POST",
    { timeout: 15_000 },
  ),
  page.locator('button[type="submit"]').click(),
]);
// After the JS response, the page does router.push(nextPath); wait for URL change.
await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 10_000 });

await page.goto(`${URL}/tasks?view=board`);
await page.waitForTimeout(3500);

const result = psql(`
  SELECT id::text || '|' || claims_role || '|' ||
         (SELECT string_agg(k, ',' ORDER BY k)
            FROM jsonb_object_keys(claims) AS k)
  FROM realtime.subscription
  ORDER BY id DESC
  LIMIT 5
`);
console.log("subscription_id | claims_role | claim_keys");
for (const line of result.split("\n")) console.log(" ", line);

await browser.close();