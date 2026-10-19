# TDD Evidence Report — Filter Legacy Planner Plans & Keep Only Active SUNEXT Plans

**Date:** 2026-10-19
**Feature / Scope:** Remove legacy/test Microsoft Planner plans (`test`, `To do list`, `General Tasks`, `Test 1`) and their 17 tasks from the dashboard project, keeping only `Sunext Manage Task`, `DEV Manage Task`, and `Marketing Manage Task`.

---

## 1. TDD Cycle Summary (RED → GREEN → REFACTOR)

### Phase 1: RED (Failing Tests Written First)
Added 6 unit and integration tests before implementing `filterPlannerPlans`:
- `tests/unit/planner/planner-mapping.test.ts`:
  - `filterPlannerPlans > exports the exact allowed and excluded plan lists`
  - `filterPlannerPlans > removes test, To do list, General Tasks, and Test 1 and keeps only the 3 active plans in canonical order`
  - `filterPlannerPlans > returns empty array when all plans are in the excluded list (case-insensitive and trimmed)`
  - `buildPlannerDataset > excludes legacy plans (test, To do list, General Tasks, Test 1) and their tasks from the dataset`
- `tests/unit/planner/planner-dataset.test.ts`:
  - `loadPlannerSource > excludes test, To do list, General Tasks, and Test 1 before fetching plan tasks`
- `tests/integration/api/planner.test.ts`:
  - `GET /api/planner/plans > filters out test, To do list, General Tasks, and Test 1 and keeps only the 3 active plans`
- Updated test fixtures in `tests/unit/v2-model.test.ts` and `tests/unit/sx-dashboard.test.ts` to replace legacy `"To do list"` fixture names with `"Sunext Manage Task"`.

**RED Verification Output:**
- `Test Files: 3 failed (3)`
- `Tests: 6 failed | 68 passed (74)`

### Phase 2: GREEN (Minimal Implementation)
- Implemented `ALLOWED_PLANNER_PLAN_TITLES`, `EXCLUDED_PLANNER_PLAN_TITLES`, and `filterPlannerPlans()` in `lib/planner/planner-mapping.ts`, and filtered both `plans` and `tasks` inside `buildPlannerDataset()`.
- Applied `filterPlannerPlans()` in `fetchSource()` (`lib/planner/planner-dataset.ts`) so `listPlanTasks()` is never called for excluded plans.
- Applied `filterPlannerPlans()` in `GET /api/planner/plans` (`app/api/planner/plans/route.ts`).
- Deleted all 17 tasks belonging to `test` (1), `To do list` (9), `General Tasks` (6), and `Test 1` (1) on Microsoft Planner via Graph API (`DELETE /planner/tasks/{id}`).

**GREEN Verification Output:**
- `Test Files: 59 passed (59)`
- `Tests: 642 passed (642)`

### Phase 3: Coverage Verification
- **All files:** `97.36%` statements, `90.35%` branches, `97.46%` functions, `97.36%` lines (exceeds 80% minimum threshold).
- **`lib/planner/`:** `97.51%` statements, `93.72%` branches, `96.55%` functions, `97.51%` lines.
- **`app/api/planner/plans/route.ts`:** `100%` across all metrics.
