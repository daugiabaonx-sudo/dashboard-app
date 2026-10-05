// tests/e2e/realtime-cross-tab.spec.ts
// End-to-end proof that Realtime v3 broadcasts postgres_changes events
// through the Caddy gateway to multiple browser contexts.
//
// The chain under test:
//   Tab A: select status dropdown on a kanban card
//     → useSetTaskStatus mutation
//     → PATCH /api/tasks/:id/status
//     → server writes to Postgres (real Supabase)
//     → wal2json decodes the WAL change into a logical replication message
//     → Realtime v3 publishes to its channels
//     → Tab B's subscriptions.tsx postgres_changes listener fires
//     → qc.invalidateQueries({ queryKey: ["tasks"] })
//     → useTasks refetches /api/tasks
//     → Tab B's kanban re-renders with the new column counts
//
// In mock mode this chain is faked end-to-end by lib/supabase/mock.ts.
// The point of this spec is to prove the REAL chain works across browser
// contexts, which is what catches regressions in the gateway, the WAL
// replication, or the Realtime v3 subscription wiring.
//
// Run with:  npx playwright test --project=realmode
//
// Like auth-realmode.spec.ts, this spec hard-fails if MOCK_SUPABASE=1 —
// the suite would otherwise silently exercise the mock-mode shortcut.
//
// Resetting the seed task: prior runs of this spec mutate the target task
// permanently (the API has no rollback). Without a reset, the second run
// would see a task already in `in_progress` — Tab A's selectOption would
// flip it to its current value, the API would either no-op or short-
// circuit without a WAL write, and Tab B would correctly stay at the same
// count. We hard-reset the task to `todo` in beforeAll so the chain under
// test always fires.

import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { realSignInAs, TEST_USERS } from "./_helpers/auth";

// In real mode, the seed task UUIDs are real Postgres UUIDs (not "t2").
// 00000000-0000-0000-0000-0000000000b2 is seeded as `todo` (i=1, project=p2).
const TODO_TASK_ID = "00000000-0000-0000-0000-0000000000b2";
const INITIAL_STATUS = "todo";
const TARGET_STATUS = "in_progress";

test.describe("Realtime v3 cross-tab invalidation", () => {
  test.beforeAll(() => {
    if (process.env.MOCK_SUPABASE === "1") {
      // Mock mode has no real Supabase, no WAL, and no Realtime v3 — the
      // chain under test simply doesn't exist. Skip rather than throw so
      // mock-mode runs (the default in CI e2e) don't fail on this guard.
      test.skip(true, "realtime-cross-tab.spec.ts requires real Supabase (--project=realmode)");
    }
    // Direct psql via docker so we don't depend on the API or the
    // service-role key being present in the realmode env. The compose
    // db-sync pipeline names the container `sunext-db`; CI uses the same
    // compose. Supabase's `supabase_admin` role has BYPASSRLS so the
    // update succeeds even with the public.tasks RLS policies that
    // gate on workspace membership.
    execSync(
      `docker exec sunext-db psql -U supabase_admin -d postgres -c ` +
        `"UPDATE public.tasks SET status='${INITIAL_STATUS}', ` +
        `updated_at=now() WHERE id='${TODO_TASK_ID}'"`,
      { stdio: "pipe" },
    );
  });

  test("status change in tab A propagates to tab B without reload", async ({
    browser,
  }) => {
    const { email, password } = TEST_USERS.owner;

    // Two fully-isolated browser contexts → two cookie jars → two
    // independent Supabase Realtime WS connections. The point of the test
    // is that tab B observes the change via the gateway without any
    // shared browser-side cache.
    //
    // We pass `storageState: undefined` explicitly so the project-level
    // setup-realmode cookies don't leak into these isolated browsers —
    // both contexts need to sign in independently so we can prove the
    // realtime pipeline delivers WAL changes to a fresh session.
    const ctxA = await browser.newContext({ storageState: undefined });
    const ctxB = await browser.newContext({ storageState: undefined });
    try {
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      // Instrument Tab B's WebSocket traffic. If the realtime pipeline
      // is wired correctly, every WS frame that contains "postgres_changes"
      // should appear here — including the broadcast triggered by Tab A's
      // PATCH below. The frame count is attached to the test's error
      // context for debugging cross-tab flakes.
      const tabBFrames: string[] = [];
      pageB.on("websocket", (ws) => {
        ws.on("framereceived", (f) => {
          const txt = f.payload?.toString() ?? "";
          if (txt.includes("postgres_changes")) {
            tabBFrames.push(txt.slice(0, 200));
          }
        });
      });

      // Both contexts sign in as the same user. Realtime's notifications
      // channel is filtered by user_id, so we need both sessions to share
      // a user id for the tasks channel (workspace-scoped, no filter).
      //
      // Sign-ins are serialized (not Promise.all) so we don't fire two
      // /auth/v1/token POSTs at once — GoTrue's per-IP rate limiter would
      // reject the second one with a 429 and leave the second context
      // stuck on /login.
      await realSignInAs(pageA, email, password);
      await realSignInAs(pageB, email, password);

      // Both pages open the kanban board. We wait for the kanban to
      // actually render the seed task before reading counts, so the
      // first invalidation poll doesn't race the initial fetch.
      await Promise.all([
        pageA.goto("/tasks?view=board"),
        pageB.goto("/tasks?view=board"),
      ]);

      const targetCard = pageB.locator(`[data-task-id="${TODO_TASK_ID}"]`);
      await expect(targetCard).toBeVisible({ timeout: 15_000 });

      // Give the WS subscriptions a chance to complete the Caddy upgrade
      // + Phoenix channel join before we trigger the mutation. Without
      // this settle, the PATCH broadcast can land before Tab B's
      // subscription is fully registered with the Realtime v3 channel
      // process, and Tab B's listener never receives the event.
      // The debug script (`.claude/realtime-cross-tab-debug.mjs`)
      // confirmed the pipeline works end-to-end once this settle is in
      // place; without it the test races the subscribe handshake.
      await pageB.waitForTimeout(2_000);

      async function columnCount(
        page: typeof pageA,
        label: string,
      ): Promise<number> {
        const heading = page.getByRole("heading", { name: label, level: 3 });
        await expect(heading).toBeVisible();
        const badge = heading
          .locator("..")
          .locator("span.tabular-nums")
          .first();
        const text = (await badge.textContent()) ?? "";
        return Number.parseInt(text.trim(), 10);
      }

      const todoBeforeB = await columnCount(pageB, "To do");
      const targetBeforeB = await columnCount(pageB, "In progress");

      // Sanity: targetCard should be in the "To do" column visually. We
      // don't rely on this for the assertion (column counts are the
      // source of truth) but a missing card would surface here.
      await expect(targetCard).toBeVisible();

      // Tab A flips the task status. The select option value matches the
      // TaskStatus enum (snake_case strings); the dropdown is labelled by
      // task title. TARGET_STATUS is the column the count assertion
      // expects to rise — keep both in sync.
      const selectA = pageA.locator(
        `[data-task-id="${TODO_TASK_ID}"]`,
      ).getByLabel(/^status$/i);
      await selectA.selectOption(TARGET_STATUS);

      // Tab B must see both columns move without ever being told to
      // reload. Realtime v3 → debounced invalidator → refetch → re-render.
      // Generous timeout because the WS round-trip + WAL decode + refetch
      // chain is longer than the in-process mock broadcast.
      await expect
        .poll(
          async () => columnCount(pageB, "In progress"),
          {
            timeout: 15_000,
            message:
              `Tab B: In progress count should rise after tab A's move. ` +
              `WS frames received on Tab B (postgres_changes): ${tabBFrames.length}. ` +
              `First frame: ${tabBFrames[0] ?? "<none>"}.`,
          },
        )
        .toBe(targetBeforeB + 1);
      await expect
        .poll(
          async () => columnCount(pageB, "To do"),
          {
            timeout: 15_000,
            message: "Tab B: To do count should fall after tab A's move",
          },
        )
        .toBe(todoBeforeB - 1);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
