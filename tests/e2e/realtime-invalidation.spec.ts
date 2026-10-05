import { expect, test } from "@playwright/test";

// tests/e2e/realtime-invalidation.spec.ts
// End-to-end proof that mock pub/sub + consumer wiring refreshes the UI.
// The chain under test:
//   KanbanCard status change
//     → useSetTaskStatus mutation
//     → PATCH /api/tasks/:id/status
//     → server setTaskStatus → supabase.from("tasks").update(...)
//     → MockFrom.update broadcasts UPDATE to subscribers
//     → subscriptions.tsx's debounced invalidator
//     → qc.invalidateQueries({queryKey:["tasks"]})
//     → useTasks refetches /api/tasks
//     → KanbanBoard re-renders with fresh counts
//
// We move `t2` (seed: status="todo") to "in_progress" and assert both
// column counts shift in the same render. The mutation also self-invalidates
// in `onSettled`; the test therefore proves the full path runs, not just
// the in-hook invalidation.

test.describe("Realtime invalidation (mock pub/sub)", () => {
  // The v2 surface removed the /tasks?view=board kanban layout — the
  // realtime invalidation chain (mutation → mock pub/sub → debounced
  // invalidate → re-fetch) is now exercised by tests/e2e/animated-table.spec.ts
  // and tests/e2e/task-modal.spec.ts via the list view + task modal. The
  // dedicated kanban assertion below is skipped until a board view returns.
  test.skip("kanban column counts move when a task status changes", async ({
    page,
  }) => {
    await page.goto("/tasks?view=board");

    // Each column header is an <h3> with the status label; its sibling span
    // holds the count badge. Scope to the h3's parent <div> so we only
    // match the count for the right column.
    async function columnCount(label: string): Promise<number> {
      const heading = page.getByRole("heading", { name: label, level: 3 });
      await expect(heading).toBeVisible();
      const badge = heading
        .locator("..")
        .locator("span.tabular-nums")
        .first();
      const text = (await badge.textContent()) ?? "";
      return Number.parseInt(text.trim(), 10);
    }

    const todoBefore = await columnCount("To do");
    const inProgressBefore = await columnCount("In progress");

    // Change t2's status from "todo" to "in_progress" via its card's select.
    const t2Card = page.locator('[data-task-id="t2"]');
    await expect(t2Card).toBeVisible();
    const select = t2Card.getByLabel(/^status$/i);
    await select.selectOption("in_progress");

    // Both column counts must move in the same render frame. We wait on
    // the destination count to rise (the more deterministic assertion)
    // and then re-read the source count to confirm it fell.
    await expect
      .poll(
        async () => columnCount("In progress"),
        { timeout: 5000, message: "In progress count should rise after move" },
      )
      .toBe(inProgressBefore + 1);
    await expect
      .poll(
        async () => columnCount("To do"),
        { timeout: 5000, message: "To do count should fall after move" },
      )
      .toBe(todoBefore - 1);
  });
});
