# TDD evidence: consistent overview widget counts + fresh Planner cache

**Source plan:** inline `/ecc:plan` in session (2026-10-16), approved "Yes".
**Commits:** `4ec689d` (RED) → `2bb20cc` (GREEN). No refactor commit needed.

## User journeys

1. As a manager filtering team "3 - Tech" / "DEV Manage Task", the KPI cards add up to "Tổng công việc".
2. As a manager, "Công việc cần chú ý" lists every unfinished task, including not-started ones.
3. As a manager, the project table follows the same team/period/search filters as the KPI cards, with one health rule.
4. As a manager, tasks I add or edit in Planner show on the dashboard within minutes.

## Task report

| Task | RED evidence | GREEN evidence |
|---|---|---|
| Shared state counting (`countStates`, `inAttention`, `projectHealth`, `projectStats`) | `h.countStates is not a function` etc. (14 tests) | `tests/unit/v2-core.test.ts` 14/14 pass |
| `snapshotAt` / `computeTrend` count "todo" | snapshot lacked `todo`; `trend.spark.todo` undefined (3 tests) | `tests/unit/v2-model.test.ts` pass |
| Cache tag + `cacheLife("minutes")` | `cacheTag` not called with `planner-dataset` | `tests/unit/sx-view-dataset.test.ts` pass |
| PATCH revalidates the tag | `revalidateTag` not called with `("planner-dataset","max")` | `tests/integration/api/planner.test.ts` pass |

Commands: `npx vitest run tests/unit/v2-core.test.ts tests/unit/v2-model.test.ts tests/unit/sx-view-dataset.test.ts tests/integration/api/planner.test.ts`
(RED: 19 failed; GREEN: 66/66), then `npm run test:unit` (632/632), `npx tsc --noEmit` (exit 0), `npm run build` (exit 0).

Live check (read-only Graph, team "3 - Tech" / "DEV Manage Task"):
`KPI { total: 9, done: 3, working: 0, overdue: 0, blocked: 0, todo: 6 }`, attention rows 6, project 3/9 on track.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Every task is in exactly one state; states sum to total | `v2-core.test.ts › countStates` | unit | PASS |
| 2 | Attention rows = total − done | `v2-core.test.ts › inAttention` | unit | PASS |
| 3 | One health rule: blocked if any blocked or ≥30% overdue; at risk if any overdue | `v2-core.test.ts › projectHealth` | unit | PASS |
| 4 | Project rows come from the filtered list; empty projects dropped | `v2-core.test.ts › projectStats` | unit | PASS |
| 5 | Trend snapshots include not-started tasks and sum to total | `v2-model.test.ts › snapshotAt`, `computeTrend` | unit | PASS |
| 6 | Planner dataset cache is tagged and refreshes within minutes | `sx-view-dataset.test.ts` | unit | PASS |
| 7 | Successful PATCH revalidates the tag; failed PATCH does not | `api/planner.test.ts › PATCH` | integration | PASS |

## Coverage and known gaps

- `npm run test:unit:coverage`: all files 96.43% lines / 90.42% branches.
- Coverage config only measures `lib/**` and `app/api/**`; `components/v2/v2-core.ts` helpers are tested but not counted.
- DOM rendering in `v2-overview.ts` (6th KPI card, grid layout) has no automated test; checked by build and manual localhost review.
- "Bị chặn" KPI and Blocker panel stay 0: Planner has no blocked concept (out of scope).
