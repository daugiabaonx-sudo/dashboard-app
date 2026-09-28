<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

- **Middleware lives in `proxy.ts`**, not `middleware.ts`. Next 16 renamed
  the entrypoint. Do not add `middleware.ts`.
- **All API write endpoints require a CSRF header.** Use
  `csrfFetch()` from `lib/csrf-client.ts` instead of the global
  `fetch` for `POST`/`PATCH`/`PUT`/`DELETE`. Auth routes
  (`/api/auth/*`) are CSRF-exempt.
- **State-changing client calls use `csrfFetch`**, not raw `fetch`.
- **Mock Supabase mode is the default.** Set `MOCK_SUPABASE=0` only
  after `npm run db:reset` succeeds. See `README.md`.
- **Don't lint-clean up pre-existing warnings without scoping** —
  there are ~15 unused-import warnings in `lib/supabase/mock.ts` and
  three files have `Date.now()` purity warnings. Those are owned by
  their original authors; touch only when editing that file.
- **Security headers live in `next.config.ts`.** Don't re-declare
  them per-route in `proxy.ts` or route handlers.
- **Lint is not gating CI** (see `.github/workflows/ci.yml`).
  Typecheck + unit + build is.
