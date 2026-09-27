# Phase F Progress

> Status snapshot for the real-Supabase cutover. The architecture and verification commands are scoped to the docker-compose-backed mode introduced in Phase F.

## Goal

Promote the dashboard from in-memory mock Supabase to a real local Supabase stack (Postgres + GoTrue + Realtime + Storage + Meta + PostgREST) without changing the public API. The mock remains a one-flag rollback so dev workflows that can't run Docker keep working. Code that only made sense under mock mode is removed; mock helpers that Step C scripts still need are kept but audit-marked.

## What changed

| File | Change | Why |
|------|--------|-----|
| `lib/supabase/env.ts` | Rewrote `isMockMode` predicate — true iff `MOCK_SUPABASE` is `1`/`true`/`yes` (case-insensitive). A real `NEXT_PUBLIC_SUPABASE_URL` no longer opts into mock. | The old predicate also fired when the URL contained "mock" or matched the compose port, which would silently re-mock any future env that points at a real Supabase. |
| `app/api/notifications/route.ts` | Dropped `resolveUserId` helper and the `getMockSignedInUserId` import; `GET` / `PATCH` now use `session.userId` directly. | `requireUser()` already returns the correct user for both modes; the helper was a no-op in real mode and an unnecessary indirection in mock mode. |
| `lib/auth/session.ts` | Added an audit comment above `getMockSignedInUserId`. Function body and exports unchanged. | Step C scripts still depend on it for non-API paths; documenting that every caller is `isMockMode`-gated and audit-verified prevents accidental use in real-mode code paths. |
| `README.md` | Added "Phase F real-Supabase mode" section after the existing dev instructions. | New developers need to know `db:reset` provisions users + where the credentials land; rolling back is just `MOCK_SUPABASE=1`. |
| `docs/PHASE_F_PROGRESS.md` | New — this file. | Mirrors the Phase E progress doc so reviewers have a single place to read the cutover status. |
| `.env.local` | Appended a Phase F cutover comment block at the bottom. Existing `MOCK_SUPABASE` line and placeholder keys left untouched. | Comment block is the at-the-keyboard runbook for the cutover; leaving real values alone means the next developer doesn't lose their config. |

## Verification commands

```bash
# Type check
npx tsc --noEmit 2>&1 | tail -20

# Production build
npm run build 2>&1 | tail -20

# Unit tests (schemas)
npm run test:unit 2>&1 | tail -10
```

E2E suites (`npm run test:e2e`) are out of scope for this step and were not touched.

## Rollback

Set `MOCK_SUPABASE=1` (any other value works too — the predicate is now strict, so anything other than `1`/`true`/`yes` opts into real mode).
