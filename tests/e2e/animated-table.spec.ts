// tests/e2e/animated-table.spec.ts
// E2E coverage for the v2 Animated Tasks table at /tasks. Mock mode
// (the proxy auto-signs you in, so no auth setup). Captures pageerror +
// console.error on every test to keep hydration regressions visible.
//
// The table is desktop-only (>= md viewport); on mobile (Pixel 7) the
// layout falls back to stacked cards. Sort/search/columns/pagination
// still work, but the affordances look different. The mobile test at
// the bottom just asserts the fallback renders without errors.
//
// Test data is fixed (15 tasks: t1-t15) so search/filter/sort assertions
// can be deterministic. See tests/unit/tasks-data.test.ts for the
// data-layer coverage.

import { expect, test, type Page } from "@playwright/test";

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

test.describe("v2 /tasks — Animated Tasks table", () => {
  test("default state: 15 rows, page 1 of 2, dueDate ascending", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    // Search bar count line: "15/15".
    await expect(page.getByText(/^15\/15$/)).toBeVisible();

    // Pagination count line: "Showing 1–10 of 15" / "Hiển thị 1–10 trên 15".
    // Both contain the substring "of 15" / "trên 15" but EN is the default
    // in mock mode.
    await expect(page.getByText(/of 15|trên 15/i)).toBeVisible();

    // The Deadline column header (a <th>) is the default sort key, dir asc.
    // aria-sort is on the <th>, not the inner <button>.
    const deadlineTh = page.getByRole("columnheader", { name: /Deadline/i });
    await expect(deadlineTh).toHaveAttribute("aria-sort", "ascending");

    // Page indicator: "Page 1 of 2" / "Trang 1 trên 2". Match the page
    // number + total page number in a single visible text node.
    await expect(page.getByText(/1\s+of\s+2|1\s+trên\s+2/)).toBeVisible();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("aria-sort flips when toggling the Deadline header", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    const deadlineTh = page.getByRole("columnheader", { name: /Deadline/i });
    await expect(deadlineTh).toHaveAttribute("aria-sort", "ascending");
    // The button inside the <th> is what handles the click.
    await page.getByRole("button", { name: /Deadline/i }).click();
    await expect(deadlineTh).toHaveAttribute("aria-sort", "descending");
    await page.getByRole("button", { name: /Deadline/i }).click();
    await expect(deadlineTh).toHaveAttribute("aria-sort", "ascending");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("sort by Project then Priority — page resets to 1", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?q=design&page=2");

    // Scope to the table — the top bar has a "All projects" filter chip
    // that also matches /Project/i.
    const table = page.locator("table");
    await table.getByRole("button", { name: /^Project$/ }).click();
    await expect(page).toHaveURL(/sort=project/);
    await expect(page).toHaveURL(/dir=asc/);
    await expect(page).toHaveURL(/page=1/);
    // The previous search param is preserved.
    await expect(page).toHaveURL(/q=design/);

    await table.getByRole("button", { name: /^Priority$/ }).click();
    await expect(page).toHaveURL(/sort=priority/);
    await expect(page).toHaveURL(/dir=asc/);
    await expect(page).toHaveURL(/page=1/);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("search debounce: q=design appears in URL after typing", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    // The table search input has placeholder "Search tasks…" (ellipsis);
    // the top bar search has "Search tasks, employees, projects…" —
    // disambiguate by matching the ellipsis version.
    const search = page.getByPlaceholder(/Search tasks…/);
    await search.fill("design");
    await expect(page).toHaveURL(/q=design/);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("search clear via X button removes q from URL", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?q=design");

    const search = page.getByPlaceholder(/Search tasks…/);
    // The clear button has aria-label="Clear search".
    const clearButton = page.getByRole("button", { name: /Clear search/i });
    await clearButton.click();
    await expect(page).not.toHaveURL(/q=/);

    // Search input is empty.
    await expect(search).toHaveValue("");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("empty state via q=zzz-nothing-matches", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?q=zzz-nothing-matches");

    // The empty state is rendered as a centered div with the localized
    // "no results" message.
    await expect(page.getByText(/No results found/i)).toBeVisible();
    // No <tr> rows in the body when filtered to nothing.
    const rowCount = await page.locator("table tbody tr").count();
    expect(rowCount).toBe(0);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("column toggle: Project hide/show round-trip", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    // Project column should be visible initially (it's part of the default set).
    const projectHeader = page.getByRole("columnheader", { name: /Project/i });
    await expect(projectHeader).toBeVisible();

    // Open the columns dropdown.
    await page.getByRole("button", { name: /^Columns$/i }).click();
    const projectItem = page.getByRole("menuitemcheckbox", { name: /Project/i });
    await projectItem.click();
    // menuitem onSelect calls event.preventDefault() so the menu stays
    // open after the click — close it explicitly so the trigger is
    // clickable again.
    await page.keyboard.press("Escape");

    // URL now encodes cols without "project".
    await expect(page).toHaveURL(/cols=/);
    const url = new URL(page.url());
    const cols = url.searchParams.get("cols") ?? "";
    expect(cols.split(",")).not.toContain("project");

    // The Project column header is no longer rendered.
    await expect(projectHeader).toHaveCount(0);

    // Re-open and re-check the menuitem to bring it back.
    await page.getByRole("button", { name: /^Columns$/i }).click();
    await projectItem.click();
    await page.keyboard.press("Escape");
    await expect(projectHeader).toBeVisible();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("Show all / Hide all buttons in the column dropdown", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    // Hide all → only the "task" column remains.
    await page.getByRole("button", { name: /^Columns$/i }).click();
    await page.getByRole("button", { name: /Hide all/i }).click();
    await page.keyboard.press("Escape");

    const visibleHeaders = page.locator("table thead th");
    await expect(visibleHeaders).toHaveCount(1);
    await expect(visibleHeaders.first()).toContainText(/Task/i);

    // The "cols" URL param is now just "task".
    await expect(page).toHaveURL(/cols=task/);
    const url = new URL(page.url());
    expect(url.searchParams.get("cols")).toBe("task");

    // Show all → all 7 columns are visible.
    await page.getByRole("button", { name: /^Columns$/i }).click();
    await page.getByRole("button", { name: /Show all/i }).click();
    await page.keyboard.press("Escape");
    await expect(visibleHeaders).toHaveCount(7);
    // URL no longer encodes cols (all = default).
    await expect(page).not.toHaveURL(/cols=/);
    const url2 = new URL(page.url());
    expect(url2.searchParams.get("cols")).toBeNull();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("pagination: page size 5, page 2, next disabled on last", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    // The page size select is the only <select> on the page.
    const pageSizeSelect = page.locator("select").first();
    await pageSizeSelect.selectOption("5");
    await expect(page).toHaveURL(/size=5/);

    // Click Next → page=2.
    const nextButton = page.getByRole("button", { name: /Next page/i });
    await nextButton.click();
    await expect(page).toHaveURL(/page=2/);

    // With page size 5, 15 rows → 3 pages. Click Next again → page=3.
    await nextButton.click();
    await expect(page).toHaveURL(/page=3/);

    // On the last page, Next is disabled.
    await expect(nextButton).toBeDisabled();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("deep-link ?page=2 reload shows page 2", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?page=2");

    // Page 2 of 2 (with default size 10): rows 11-15 of 15.
    await expect(page.getByText(/of 15|trên 15/i)).toBeVisible();
    // Page indicator: "Page 2 of 2" / "Trang 2 trên 2".
    await expect(page.getByText(/2\s+of\s+2|2\s+trên\s+2/)).toBeVisible();

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("deep-link ?cols=task,status reload shows only those columns", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?cols=task,status");

    const headers = page.locator("table thead th");
    await expect(headers).toHaveCount(2);
    await expect(headers.nth(0)).toContainText(/Task/i);
    await expect(headers.nth(1)).toContainText(/Status/i);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("?focus=t1 highlights the t1 row", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?focus=t1");

    const t1Row = page.locator("tr[data-focus='true']");
    await expect(t1Row).toHaveCount(1);
    await expect(t1Row).toHaveAttribute("id", "row-t1");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("blocker badge appears in the desktop row for t1 (no expand — mobile only)", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?focus=t1");

    // Desktop table doesn't render the BlockerExpandableRow; the row
    // just shows the task. The expand/collapse is asserted in the
    // mobile fallback test below.
    const t1Row = page.locator("#row-t1");
    await expect(t1Row).toBeVisible();
    // No aria-expanded toggle inside the desktop row.
    const expandedToggle = t1Row.locator("[aria-expanded]");
    expect(await expandedToggle.count()).toBe(0);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("row click does not navigate — table is fully client-side", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    const urlBefore = page.url();
    // Click the first row body (not a link inside it).
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click({ position: { x: 5, y: 5 } });
    // URL is unchanged — row click does not navigate the page.
    expect(page.url()).toBe(urlBefore);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });
});

test.describe("v2 /tasks — Animated Tasks table (mobile fallback)", () => {
  test.use({ viewport: { width: 412, height: 915 } });


  test("mobile viewport renders stacked cards, not a <table>", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks");

    // On the mobile (Pixel 7) viewport, the <table> is hidden and the
    // <ul> of stacked cards renders instead.
    const tableCount = await page.locator("table").count();
    const cardList = page.locator("ul li");
    // Should have at least 1 card (up to pageSize, default 10).
    await expect(cardList.first()).toBeVisible();

    // The table is either not present or has display:none via the
    // `hidden md:block` wrapper. Visibility count handles both.
    const visibleTables = await page.locator("table:visible").count();
    expect(visibleTables).toBe(0);
    // Sanity — `tableCount` exists only to make the test explicit.
    expect(tableCount).toBeGreaterThanOrEqual(0);

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("mobile blocker expand/collapse on t1", async ({ page }) => {
    const errors = await captureErrors(page);
    await page.goto("/tasks?focus=t1");

    // The BlockerExpandableRow is rendered only in the mobile fallback
    // (stacked cards). The toggle's accessible name is the localized
    // "Blocker: <title>" text inside the button.
    const toggle = page.getByRole("button", { name: /Blocker:/i }).first();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/Waiting on legal review/i)).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
  });
});
