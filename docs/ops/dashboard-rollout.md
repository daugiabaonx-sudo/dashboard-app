# Dashboard rollout runbook

The home page (`app/(dashboard)/page.tsx`) renders the v2 composition (sidebar +
top-bar + KPI strip + featured + donut + blockers) and is the only dashboard
surface. There is no v1 fallback, no feature flag, no env-var switch — the page
is v2 by construction.

## Verification commands

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Unit + integration
npx vitest run

# 3. Build
npm run build

# 4. E2E (start server first or use the playwright webServer)
MOCK_SUPABASE=1 NEXT_PUBLIC_MOCK_SUPABASE=1 \
  npx playwright test tests/e2e/dashboard-v2.spec.ts --project=chromium
```

All four gates must be green before pushing to `main`. CI runs 1–4 on every
push and PR via `.github/workflows/ci.yml`.

## Rolling back

The v2 composition is the only home page render. There is no v1 in the tree.
If the production dashboard needs to be reverted:

### Option A — Revert the offending commit (preferred)

```bash
git revert <bad-sha>
git push origin main
```

Vercel auto-rebuilds. The revert PR restores the previous good state in a
single atomic commit.

### Option B — Promote a previous Vercel deployment

1. Open the Vercel dashboard for `dashboard-app`.
2. **Deployments** → click the previous good Production build.
3. Click **⋯** → **Promote to Production**.
4. The Production alias flips instantly — no rebuild, no env-var change.

### Option C — Force a no-op rebuild

If a build cache or env-var issue is suspected:

```bash
git commit --allow-empty -m "chore: retrigger production build"
git push origin main
```

Vercel rebuilds from the current HEAD with a fresh cache.

## Production URL

- Production alias: `https://dashboard-app-sigma-six.vercel.app`
- Branch: `main`
- Auto-deploy: every push to `main` rebuilds Production

## What NOT to do

- **Do not** add a v1/v2 feature flag back. The flag-based rollout was the
  source of repeated "still v1" symptoms. The current code is v2 by
  construction; reintroducing a flag recreates the failure mode.
- **Do not** add `NEXT_PUBLIC_DASHBOARD_V2` to Vercel env vars. It is not
  read by any source file (`grep -r NEXT_PUBLIC_DASHBOARD_V2 app/ components/`
  returns empty).
- **Do not** delete or rename `app/(dashboard)/page.tsx` without first moving
  its composition into a new file — this is the only home page render.

## Cleanup backlog (post-monitoring, 24-48h)

- [ ] Remove `NEXT_PUBLIC_DASHBOARD_V2` from Vercel Project Settings → Environment Variables (both scopes, now dead config)
- [ ] Rotate the dev JWTs in `.env.local` (still safe under `MOCK_SUPABASE=1`, but the SERVICE_ROLE_KEY has been in `.env.local` since initial setup)
