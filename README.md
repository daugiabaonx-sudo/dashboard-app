This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Phase F real-Supabase mode

The app defaults to in-memory mock mode (`MOCK_SUPABASE=1` in `.env.local`). The local
docker-compose stack runs only Postgres + PostgREST — auth, realtime, storage, and meta
are intentionally NOT included because their per-image config drifts (env vars like
`DATABASE_URL`, `API_EXTERNAL_URL`, `METRICS_JWT_SECRET`, `SECRET_KEY_BASE`, `APP_NAME`,
`DB_SSL` change between tags). For those concerns, point `NEXT_PUBLIC_SUPABASE_URL` at a
real Supabase Cloud project (or your own GoTrue + Realtime + Storage instances).

To exercise the real backend locally:

1. Run `npm run db:reset` — this wipes the compose volume, brings Postgres + PostgREST
   back up, and applies the migrations (0001-0009 + 0010). RPCs `workspace_kpis` and
   `workspace_workload`, the anon/authenticated/service_role roles, and RLS policies
   are all live after this command.
2. With Cloud (or a remote GoTrue): set `MOCK_SUPABASE=0` in `.env.local` and paste
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from your project. Restart `npm run dev` and sign in
   via `/login` instead of relying on mock auto-login.
3. To seed 8 deterministic test users against a remote GoTrue, run `npm run db:seed-auth`
   after exporting `GOTRUE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or paste them into
   `.env.compose`).

To roll back to in-memory mock mode: set `MOCK_SUPABASE=1` (or any other value). Leave
`.env.compose` alone — the app ignores it; only `.env.local` is read.
