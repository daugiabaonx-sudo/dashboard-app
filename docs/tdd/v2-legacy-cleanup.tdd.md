# TDD evidence: V2 root layout cleanup, dead UI component removal & E2E alignment

**Source plan:** inline `/plan` in session (2026-10-19), approved "Yes".
**Commits:** `2a2c82c` (RED) → GREEN checkpoint commit.

## User journeys

1. As a dashboard operator, opening `/` or `/tasks` does not mount legacy `<QueryProvider>` or `<RealtimeSubscriptions />` in `app/layout.tsx` and does not poll `/api/session` or open background Supabase WebSocket channels.
2. As a developer, `lib/sx-shell-data.ts` defines `SxProfile` and `SxShellData` directly without importing from `components/sunext/*`, and all unreferenced Generation 1 & Generation 2 UI folders (`components/sunext`, `app/(dashboard)/_components`, `components/layout`, `components/tasks`, `components/reports`, `components/calendar`, `components/realtime`, `components/ui`, `hooks`, and `lib/sx-page-data.ts`) are removed.
3. As a QA engineer, `tests/e2e/auth.spec.ts` and `tests/e2e/dashboard-v2.spec.ts` verify the shipped V2 Indigo Care DOM (`#profBtn` → `#profMenu button[data-prof="logout"]`, `#v-overview`, `#v-tasks`, view switcher, `data-theme="light|dark"`), and obsolete legacy E2E specs are removed.

## Task report

| Task | RED evidence | GREEN evidence |
|---|---|---|
| Remove `QueryProvider` & `RealtimeSubscriptions` from `app/layout.tsx` | `AssertionError: expected 'import type { Metadata }...' not to contain 'QueryProvider'` | `tests/unit/sx-shell-data.test.ts` pass + `dashboard-v2.spec.ts` verifies `sessionCalls === []` |
| Self-contained `SxProfile` & `SxShellData` in `lib/sx-shell-data.ts` | `AssertionError: expected '// lib/sx-shell-data.ts...' not to contain '@/components/sunext'` | `tests/unit/sx-shell-data.test.ts` pass |
| Delete 59 unreferenced legacy UI/hook files & `lib/sx-page-data.ts` | `AssertionError: lib/sx-page-data.ts should be removed: expected true to be false` | `tests/unit/sx-shell-data.test.ts` pass + `npx tsc --noEmit` exit 0 |
| Remove 12 obsolete E2E files & align `auth.spec.ts` + `dashboard-v2.spec.ts` | `AssertionError: tests/e2e/animated-table.spec.ts should be removed: expected true to be false` | `tests/unit/sx-shell-data.test.ts` pass + `PORT=3100 npx playwright test --project=chromium` 16/16 pass |

Commands:
- RED: `npx vitest run tests/unit/sx-shell-data.test.ts` (4 failed, 7 passed)
- GREEN:
  - `npx vitest run tests/unit/sx-shell-data.test.ts` (11/11 passed)
  - `npx tsc --noEmit` (exit 0)
  - `npm run test:unit:coverage` (61/61 test files, 636/636 tests passed, 97.33% lines / 90.5% branches)
  - `npm run build` (exit 0)
  - `PORT=3100 npx playwright test --project=chromium` (16/16 passed in 7.6s)

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | `app/layout.tsx` renders `<ThemeProvider>{children}</ThemeProvider>` without `QueryProvider` or `RealtimeSubscriptions` | `sx-shell-data.test.ts › V2 layout & legacy cleanup contract` | unit | PASS |
| 2 | `lib/sx-shell-data.ts` exports `SxProfile` and `SxShellData` without importing from `@/components/sunext` | `sx-shell-data.test.ts › V2 layout & legacy cleanup contract` | unit | PASS |
| 3 | All 10 legacy UI/hook directories & `lib/sx-page-data.ts` are removed from disk | `sx-shell-data.test.ts › V2 layout & legacy cleanup contract` | unit | PASS |
| 4 | All 12 obsolete E2E files are removed while the 5 active V2/auth/security E2E files remain | `sx-shell-data.test.ts › V2 layout & legacy cleanup contract` | unit | PASS |
| 5 | V2 overview renders across 3 viewports × 2 themes (`data-theme="light\|dark"`) with 0 console/page errors, 0 horizontal overflow, and 0 background `/api/session` requests | `dashboard-v2.spec.ts` | e2e | PASS |
| 6 | V2 `/tasks` loads `#v-tasks` and switches across `table`, `kanban`, `list`, `gantt`, and `cards` views and toggles theme | `dashboard-v2.spec.ts › v2 /tasks — multi-view workspace` | e2e | PASS |
| 7 | V2 topbar profile menu (`#profBtn` → `#profMenu button[data-prof="logout"]`) signs out and redirects to `/login` | `auth.spec.ts › header sign-out button returns to /login` | e2e | PASS |

## Coverage and known gaps

- `npm run test:unit:coverage`: All files **97.33% lines / 90.50% branches / 97.44% functions / 97.33% statements** (up from 96.43% after removing untested dead file `lib/sx-page-data.ts`).
