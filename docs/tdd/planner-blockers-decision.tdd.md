# TDD Evidence Report — Blocker & Decision Derivation & Two-Way Blocked Status Sync

**Date:** 2026-10-19
**Feature / Scope:** Populate the **Blocker & Decision** card and **Bị chặn** KPI / Kanban column from Microsoft Planner tasks (explicit `[Bị chặn]` / `[BLOCKED]` / `[KẸT]` prefix, overdue tasks, unassigned tasks, and due-soon at-risk tasks), and enable two-way Kanban drag-and-drop into/out of the **Bị chặn** column via `PATCH /api/planner/tasks/:taskId`.

---

## 1. TDD Cycle Summary (RED → GREEN → REFACTOR)

### Phase 1: RED (Failing Tests Written First)
Added unit tests in `tests/unit/planner/planner-mapping.test.ts` and `tests/unit/v2-model.test.ts`:
- `mapPlannerStatus > recognizes [Bị chặn], [BLOCKED], and [KẸT] prefixes as blocked when incomplete`
- `buildPlannerDataset > derives blockers from overdue and unassigned tasks while notifications remain empty`
- `buildPlannerBlockers > creates blockers for blocked, overdue, unassigned, and due-soon at-risk tasks`
- `plannerPatchFromEdit > prefixes [Bị chặn] in title when status changes to blocked, and strips it when leaving blocked`
- `deriveV2Blockers > derives blockers dynamically from filtered tasks and removes completed tasks`

**RED Verification Output:**
- `Test Files: 2 failed (2)`
- `Tests: 5 failed | 48 passed (53)`

### Phase 2: GREEN (Minimal Implementation)
- Implemented `isBlockedPlannerTitle()`, `stripBlockedPlannerPrefix()`, `buildPlannerBlockers()`, and title-prefix sync in `plannerPatchFromEdit()` in `lib/planner/planner-mapping.ts`.
- Implemented `deriveV2Blockers()` in `lib/v2/v2-model.ts` and wired it into `renderBlockers()` in `components/v2/v2-overview.ts`.
- Enabled dropping Kanban cards into the **Bị chặn** (`blocked`) column in `components/v2/v2-tasks.ts`.

**GREEN Verification Output:**
- `Test Files: 59 passed (59)`
- `Tests: 646 passed (646)`

### Phase 3: Coverage Verification
- **All files:** `97.56%` statements, `89.37%` branches, `97.53%` functions, `97.56%` lines.
- **`lib/planner/planner-mapping.ts`:** `100%` statements, `88.23%` branches, `100%` functions, `100%` lines.
- **`lib/v2/v2-model.ts`:** `100%` statements, `86.71%` branches, `100%` functions, `100%` lines.
