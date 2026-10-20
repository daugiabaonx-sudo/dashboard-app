# TDD & Review Evidence — Blocker & Decision Requests (F1 + F3 + F6)

## 1. Objective & Scope

Redesign the **Blocker & Decision** card in Dashboard V2 (`components/v2/*`) around manager and employee psychology with **zero overlap** against the **Công việc cần chú ý** (Attention) card:

- **Zero overlap with Attention (`#attBody`):** Removed `overdue` and `due-soon` auto-derivation from `deriveV2Blockers` (`lib/v2/v2-model.ts`) and `buildPlannerBlockers` (`lib/planner/planner-mapping.ts`). The Blocker & Decision card now exclusively displays:
  1. Human-raised decision/unblock requests (`decision_requests` table),
  2. Tasks explicitly marked `[Bị chặn]` in Microsoft Planner (`legacy_blocked`),
  3. Unassigned tasks (`Chưa giao`) requiring manager assignment (`unassigned`).
- **F1 — Giơ tay (Blameless 15s Raise Blocker):**
  - Header button `+ Báo vướng` (`#btnRaiseBlocker`), Task Modal button `✋ Báo vướng` (`#mRaiseBtn`), and Kanban drag-drop into the `Bị chặn` column open `#raiseModal`.
  - Captures `plannerTaskId`, `type` (`decision`, `waiting_on`, `missing_info`, `missing_resource`, `technical`), `unblockerId` (sorted with `owner`/`admin`/`manager` first), optional `neededBy`, and blameless prompt `need` (*"Để tiếp tục, mình cần…"*).
- **F3 — Đang chờ ai + Wait-Age Clock + Role-Aware Tabs:**
  - 3 role-aware tabs in `#blkTabs`: `Chờ tôi xử lý`, `Vướng của tôi`, and `Toàn team` with live item counts.
  - Default tab is `Chờ tôi xử lý` for `owner`/`admin`/`manager` or when the user has pending unblock items; otherwise `Vướng của tôi`.
  - Wait-age badge (`waitAge`): `< 24h` green (`.p-ok`), `24–48h` amber (`.p-warn`), `>= 48h` red (`.p-bad`).
- **F6 — Khép vòng (Close the loop):**
  - Unblocker or `owner`/`admin`/`manager` clicks `Gỡ xong` (`#resolveModal`), records the decision/resolution (`required` when `type === "decision"`), triggers a notification for the raiser, and strips `[Bị chặn] ` from the Planner task title.

---

## 2. Red-Green-Refactor TDD Trace

| Suite | File | Scenarios Covered | Statement Coverage |
|---|---|---|---|
| Permissions | `tests/unit/auth/permissions.test.ts` | `canRaiseBlocker` across all 5 roles (`owner`, `admin`, `manager`, `member`, `viewer`); `canResolveDecision` for designated unblocker, `owner`/`admin`/`manager` override, non-unblocker `member`, and `viewer` | `100%` (`lib/auth/permissions.ts`) |
| Zod Schemas | `tests/unit/schemas-decision-request.test.ts` | `createDecisionRequestSchema` (all 5 types, trimming, missing/too-short/too-long `need`, invalid `unblockerId`, invalid date format) & `resolveDecisionRequestSchema` (trimming, boundary length) | `100%` (`lib/schemas/decision-request.ts`) |
| Planner Mapping | `tests/unit/planner/planner-mapping.test.ts` | `blockedTitlePatch` idempotent prepend/strip of `[Bị chặn] `; `buildPlannerBlockers` zero-overlap verification (ignores overdue & due-soon tasks, keeps `[Bị chặn]` and unassigned) | `100%` (`lib/planner/planner-mapping.ts`) |
| Planner ETag Sync | `tests/unit/planner/blocker-sync.test.ts` | `syncPlannerBlockedPrefix` no-op when title already matches, 412 ETag conflict retry, graceful failure without throwing | `93.33%` (`lib/planner/blocker-sync.ts`) |
| DB Repository | `tests/unit/db/decision-requests.test.ts` | `listOpenDecisionRequests`, `getDecisionRequestById`, `findOpenDecisionByTask`, `createDecisionRequest`, `resolveDecisionRequest`, and remote schema-cache (`PGRST205`) fallback to `mockClient` | `97.57%` (`lib/db/decision-requests.ts`) |
| API Routes | `tests/integration/api/decision-requests.test.ts` | `GET /api/decision-requests` (401 unauth, 200 list), `POST /api/decision-requests` (403 CSRF, 403 viewer, 400 validation, 409 duplicate open request, 201 create + Planner sync), `PATCH /api/decision-requests/[id]` (403 non-unblocker member, 400 decision without resolution, 200 unblocker resolve, 200 manager override, 409 already resolved) | `86.73%` (`app/api/decision-requests/**`) |
| V2 Model & Decisions | `tests/unit/v2-model.test.ts`, `tests/unit/v2-decisions.test.ts` | `deriveV2Blockers` zero-overlap check; `waitAge` buckets (`ok`, `warn`, `bad`); `sortUnblockerCandidates`; `buildDecisionRows` deduplication; `filterRowsByTab` & `tabCounts`; `defaultDecisionTab` | `100%` (`lib/v2/v2-model.ts`), `97.29%` (`lib/v2/v2-decisions.ts`) |
| V2 DOM Interactions | `tests/unit/v2-decision-ui.test.ts` | Rendering `#blkTabs`, switching tabs, opening `#raiseModal` from `#btnRaiseBlocker` and `#mRaiseBtn`, submitting `POST /api/decision-requests`, opening `#resolveModal` and submitting `PATCH /api/decision-requests/[id]` | Verified in Vitest + Happy-DOM |
| Playwright E2E | `tests/e2e/dashboard-v2.spec.ts` | 6 viewport/theme combinations (`desktop-1440`, `tablet-1024`, `mobile-390` × `light`/`dark`), zero horizontal overflow, zero console errors, tab switching (`mine_to_unblock`, `my_raised`, `team`), and `#raiseModal` keyboard accessibility | Passed |

---

## 3. Code & Security Review Summary

- **CSRF & Rate Limiting:** Both `POST /api/decision-requests` and `PATCH /api/decision-requests/[id]` enforce `verifyCsrfOrigin(request)` and `rateLimit("decision-requests:write:...", 20, 60_000)` before parsing the request body.
- **Authorization & Tenant Isolation:**
  - Server-side `getCurrentSession()` resolves `userId`, `workspaceId`, and `role`.
  - `canRaiseBlocker(role)` blocks `viewer` from creating requests.
  - `canResolveDecision(role, userId, unblockerId)` ensures only the designated unblocker or `owner`/`admin`/`manager` in the same workspace can resolve a request.
  - `unblockerId` is verified against `listUsers(session.workspaceId)` to prevent cross-workspace user probing.
  - Database RLS policies (`decision_requests_select`, `decision_requests_insert`, `decision_requests_update`) enforce `user_in_workspace(workspace_id)` at the PostgreSQL layer.
- **XSS Prevention:** All user-supplied fields (`taskTitle`, `need`, `resolution`, user names) rendered in `components/v2/v2-overview.ts` are escaped through `esc()` before HTML interpolation.
- **Immutability:** State transitions (`ctx.setDecisionRequests`, `buildDecisionRows`, `sortUnblockerCandidates`) return new arrays/objects without mutating inputs.
