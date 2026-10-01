// Probe whether client.realtime.setAuth is being called and inspect
// the WS frames the browser actually sends for the realtime channel.
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

const wsSent = [];
const wsReceived = [];
page.on("websocket", (ws) => {
  console.log(`  [ws-open] ${ws.url()}`);
  ws.on("framesent", (f) => {
    const txt = f.payload?.toString() ?? "";
    // Show only phx_join payloads to avoid materializing tokens
    if (txt.includes("phx_join")) wsSent.push(txt.slice(0, 250));
  });
  ws.on("framereceived", (f) => {
    const txt = f.payload?.toString() ?? "";
    if (txt.includes("phx_reply") && txt.includes("postgres_changes")) {
      wsReceived.push(txt.slice(0, 200));
    }
  });
});

await page.goto(`${URL}/login`, { waitUntil: "networkidle" });
await page.locator('input[name="email"]').fill("minhanh@sunext.io");
await page.locator('input[name="password"]').fill("test-password-123");
await Promise.all([
  page.waitForResponse(
    (r) => r.url().includes("/api/auth/sign-in") && r.request().method() === "POST",
    { timeout: 15_000 },
  ),
  page.locator('button[type="submit"]').click(),
]);
await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 10_000 });
await page.goto(`${URL}/tasks?view=board`);
await page.waitForTimeout(4000);

console.log("\nphx_join frames sent:");
for (const f of wsSent) console.log(" >", f.slice(0, 200));
console.log("\nphx_reply received:");
for (const f of wsReceived) console.log(" >", f.slice(0, 200));

const rows = psql(`
  SELECT id::text || '|' || claims_role || '|' ||
         (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(claims) AS k)
  FROM realtime.subscription ORDER BY id DESC LIMIT 5
`);
console.log("\nrealtime.subscription rows:");
for (const r of rows.split("\n")) console.log(" >", r);

await browser.close();