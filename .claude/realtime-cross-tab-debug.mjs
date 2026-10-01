// .claude/realtime-cross-tab-debug.mjs
// Reproduces the EXACT scenario from realtime-cross-tab.spec.ts but with full
// instrumentation: tracks Tab A's PATCH request/response + Tab B's WS frames
// + DB state.
//
//   Tab A: selectOption -> csrfFetch -> /api/tasks/{id}/status
//   Tab B: WS subscription to postgres_changes on tasks
//   DB: realtime.subscription rows + pg_replication_slot LSN
//
// Run:
//   cd dashboard-app
//   MOCK_SUPABASE=0 npx tsx .claude/realtime-cross-tab-debug.mjs
// (uses tsx only for ESM import.meta; the file itself is ESM JS)

import { chromium } from "playwright";
import { execSync } from "child_process";

const URL = "http://127.0.0.1:3000";
const EMAIL = "minhanh@sunext.io";
const PASSWORD = "test-password-123";
const TODO_TASK_ID = "00000000-0000-0000-0000-0000000000b2";

const psql = (sql) =>
  execSync(
    `docker exec sunext-db psql -U supabase_admin -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
  )
    .toString()
    .trim();

const browser = await chromium.launch();
const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();

// --- instrumentation -----------------------------------------------------
const tabAPatch = [];
pageA.on("request", (req) => {
  if (req.url().includes("/api/tasks/")) {
    tabAPatch.push({
      method: req.method(),
      url: req.url(),
      body: req.postData() ?? null,
    });
  }
});
pageA.on("response", async (res) => {
  if (res.url().includes("/api/tasks/")) {
    tabAPatch.push({
      resp: res.status(),
      url: res.url(),
    });
  }
});

const tabBFrames = [];
pageB.on("websocket", (ws) => {
  console.log(`  [B ws] opened ${ws.url()}`);
  ws.on("framereceived", (f) => {
    const txt = f.payload?.toString() ?? "";
    if (txt.includes("postgres_changes")) tabBFrames.push(txt.slice(0, 300));
  });
  ws.on("close", () => console.log(`  [B ws] closed`));
});

const tabAFrames = [];
pageA.on("websocket", (ws) => {
  console.log(`  [A ws] opened ${ws.url()}`);
  ws.on("framereceived", (f) => {
    const txt = f.payload?.toString() ?? "";
    if (txt.includes("postgres_changes")) tabAFrames.push(txt.slice(0, 300));
  });
  ws.on("close", () => console.log(`  [A ws] closed`));
});

console.log("[1] sign-in A");
await pageA.goto(`${URL}/login`, { waitUntil: "domcontentloaded" });
await pageA.locator('input[name="email"]').fill(EMAIL);
await pageA.locator('input[name="password"]').fill(PASSWORD);
await Promise.all([
  pageA.waitForURL((u) => !u.toString().includes("/login"), { timeout: 15_000 }),
  pageA.locator('button[type="submit"]').click(),
]);

console.log("[2] sign-in B");
await pageB.goto(`${URL}/login`, { waitUntil: "domcontentloaded" });
await pageB.locator('input[name="email"]').fill(EMAIL);
await pageB.locator('input[name="password"]').fill(PASSWORD);
await Promise.all([
  pageB.waitForURL((u) => !u.toString().includes("/login"), { timeout: 15_000 }),
  pageB.locator('button[type="submit"]').click(),
]);

console.log("[3] both navigate to /tasks?view=board");
await Promise.all([
  pageA.goto(`${URL}/tasks?view=board`, { waitUntil: "domcontentloaded" }),
  pageB.goto(`${URL}/tasks?view=board`, { waitUntil: "domcontentloaded" }),
]);

// wait for kanban to render target card on B
const targetB = pageB.locator(`[data-task-id="${TODO_TASK_ID}"]`);
await targetB.waitFor({ state: "visible", timeout: 15_000 });

// settle so WS subs are confirmed + tab B's REALTIME payload handler is live
console.log("[4] wait 3s for WS subs to settle");
await pageB.waitForTimeout(3000);

console.log("[5] snapshot DB before UPDATE");
const subsBefore = psql("select count(*) from realtime.subscription");
const taskBefore = psql(
  `select status from public.tasks where id='${TODO_TASK_ID}'`,
);
const lsnBefore = psql(
  "select confirmed_flush_lsn from pg_replication_slots where slot_name like 'supabase_realtime_replication_slot%'",
);
console.log(`    subs=${subsBefore}  task.status=${taskBefore}  slot_lsn=${lsnBefore}`);

console.log("[6] Tab A: selectOption('in_progress')");
const selectA = pageA
  .locator(`[data-task-id="${TODO_TASK_ID}"]`)
  .getByLabel(/^status$/i);
await selectA.selectOption("in_progress");

console.log("[7] wait 8s for WS frames + invalidator chain");
await pageB.waitForTimeout(8000);

console.log("[8] snapshot DB after");
const subsAfter = psql("select count(*) from realtime.subscription");
const taskAfter = psql(
  `select status from public.tasks where id='${TODO_TASK_ID}'`,
);
const lsnAfter = psql(
  "select confirmed_flush_lsn from pg_replication_slots where slot_name like 'supabase_realtime_replication_slot%'",
);
console.log(`    subs=${subsAfter}  task.status=${taskAfter}  slot_lsn=${lsnAfter}`);

console.log("---");
console.log("Tab A PATCH trail:");
for (const a of tabAPatch) console.log("  ", JSON.stringify(a));
console.log(`Tab A frames received: ${tabAFrames.length}`);
for (const f of tabAFrames.slice(0, 6)) console.log("  A<", f);
console.log(`Tab B frames received: ${tabBFrames.length}`);
for (const f of tabBFrames.slice(0, 6)) console.log("  B<", f);

await browser.close();