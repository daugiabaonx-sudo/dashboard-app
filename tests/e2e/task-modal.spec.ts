// tests/e2e/task-modal.spec.ts
// E2E coverage for the v2 task modal on /tasks. Mock mode (the proxy
// auto-signs you in, so no auth setup). The modal is opened by clicking
// any task row, edits are persisted to localStorage (`sunext_task_overrides_v1`),
// and a toast confirms the save.
//
// Captures pageerror + console.error on every test to keep hydration
// regressions visible. Step 8 (modal build) is complete, so this spec
// is real (not skipped) — the test plan deferred it until the modal
// was built.

import { expect, test, type Page } from "@playwright/test";
import { setLocaleCookie } from "./_helpers/locale";

async function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

// "Open task" in EN is "Mở task" in VI. The aria-label is generated via
// `interpolate(labels.openTask, { title })`, so match whichever locale the
// page is rendered in.
const OPEN_TASK_PREFIX_EN = /^Open task /;
const OPEN_TASK_PREFIX_VI = /^Mở task /;
function openTaskRegex(locale: "en" | "vi") {
  return locale === "vi" ? OPEN_TASK_PREFIX_VI : OPEN_TASK_PREFIX_EN;
}

test.describe("v2 /tasks — task modal", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any modal storage from a prior run so assertions about saved
    // values are deterministic.
    await page.context().clearCookies();
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
    });
    // Default to English; individual tests can switch to VI via setLocaleCookie.
    await setLocaleCookie(page, "en");
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
  });

  test("opens on row click and shows the task title in the dialog description", async ({
    page,
  }) => {
    const errors = await captureErrors(page);

    // Click the first row. We don't pin a specific title — whichever
    // task sorts first by dueDate-asc, the modal's description shows
    // its full title.
    const firstRow = page
      .getByRole("button", { name: openTaskRegex("en") })
      .first();
    const rowLabel = await firstRow.getAttribute("aria-label");
    expect(rowLabel).toMatch(OPEN_TASK_PREFIX_EN);
    const taskTitle = rowLabel?.replace(OPEN_TASK_PREFIX_EN, "") ?? "";
    await firstRow.click();

    // The dialog opens with the localized "Task details" title and the
    // task description (the row's title text). Scope to the dialog —
    // the task title also appears in the table row + mobile stack.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /Task details/i }),
    ).toBeVisible();
    await expect(dialog.getByText(taskTitle, { exact: true })).toBeVisible();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("saves edits to localStorage and shows a confirmation toast", async ({
    page,
  }) => {
    const errors = await captureErrors(page);

    const firstRow = page
      .getByRole("button", { name: openTaskRegex("en") })
      .first();
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // The status select is the only <select> with name="status" inside
    // the dialog. Pick "in_progress" (localized "In progress" / "Đang làm").
    await page.locator('select[name="status"]').selectOption("in_progress");
    await page.locator('select[name="priority"]').selectOption("high");
    // Append a note so the test exercises a non-empty write.
    await page.locator('textarea[name="notes"]').fill("Reviewed in standup");

    // Submit the form (the Save changes button is the only submit button
    // in the dialog).
    await page.getByRole("button", { name: /Save changes/i }).click();

    // Toast confirmation — localized "Task updated" / "Đã cập nhật".
    await expect(page.getByText(/Task updated|Đã cập nhật/i)).toBeVisible();

    // The localStorage entry exists and has the new values.
    const stored = await page.evaluate(() =>
      localStorage.getItem("sunext_task_overrides_v1"),
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? "{}") as Record<
      string,
      { status?: string; priority?: string; notes?: string }
    >;
    const entries = Object.values(parsed);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const entry = entries.find(
      (e) => e.notes === "Reviewed in standup",
    );
    expect(entry).toBeDefined();
    expect(entry?.status).toBe("in_progress");
    expect(entry?.priority).toBe("high");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("cancel via the Cancel button closes without saving", async ({
    page,
  }) => {
    const errors = await captureErrors(page);

    const firstRow = page
      .getByRole("button", { name: openTaskRegex("en") })
      .first();
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Type a note then cancel — the localStorage should remain empty.
    await page
      .locator('textarea[name="notes"]')
      .fill("This should NOT be saved");
    await page.getByRole("button", { name: /Cancel/i }).click();

    await expect(page.getByRole("dialog")).toBeHidden();

    const stored = await page.evaluate(() =>
      localStorage.getItem("sunext_task_overrides_v1"),
    );
    expect(stored).toBeNull();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("cancel via Escape key closes without saving", async ({ page }) => {
    const errors = await captureErrors(page);

    const firstRow = page
      .getByRole("button", { name: openTaskRegex("en") })
      .first();
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator('textarea[name="notes"]').fill("Nope");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    const stored = await page.evaluate(() =>
      localStorage.getItem("sunext_task_overrides_v1"),
    );
    expect(stored).toBeNull();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("re-opening the same task after save shows the saved override", async ({
    page,
  }) => {
    const errors = await captureErrors(page);

    const firstRow = page
      .getByRole("button", { name: openTaskRegex("en") })
      .first();
    const taskName = await firstRow.getAttribute("aria-label");
    expect(taskName).toMatch(OPEN_TASK_PREFIX_EN);
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator('select[name="status"]').selectOption("done");
    await page.getByRole("button", { name: /Save changes/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Re-open the same row — the status select should now default to "done".
    const sameRow = page.getByRole("button", { name: taskName ?? "" }).first();
    await sameRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator('select[name="status"]')).toHaveValue("done");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });
});
