import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const BASE_URL = `http://127.0.0.1:${PORT}`;

// The realmode project runs against a stack that CI (or the developer)
// brings up externally via `npm run db:stack` + `npm run start`. The
// top-level webServer block is therefore conditional: when running only
// the realmode project we skip auto-start so Playwright doesn't fight the
// already-running server for the same port.
const argv = process.argv.join(" ");
const realmodeOnly = /\b--project(?:=|\s+)realmode\b/.test(argv);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup-realmode",
      testMatch: /auth\.setup\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
      },
    },
    {
      // Real-mode project: drives the local docker-compose stack
      // (GoTrue + Realtime v3 + Meta behind the Caddy gateway). The
      // top-level webServer is suppressed when --project=realmode is the
      // only active project (see `realmodeOnly` above) because CI
      // brings the Next.js server up via `npm run start` separately.
      //
      // Local reproduction:
      //   npm run db:stack
      //   MOCK_SUPABASE=0 \
      //     NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
      //     NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep ANON_KEY .env.compose | cut -d= -f2) \
      //     SUPABASE_SERVICE_ROLE_KEY=$(grep SERVICE_ROLE_KEY .env.compose | cut -d= -f2) \
      //     npm run start &
      //   npx playwright test --project=realmode --workers=1
      //
      // Depends on `setup-realmode` so every test starts with the
      // owner session cookie already set — keeps the auth rate-limit
      // bucket happy and lets `goto("/")` land on the dashboard
      // instead of /login (real mode has no proxy auto-login).
      dependencies: ["setup-realmode"],
      name: "realmode",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "test-results/.auth-realmode/state.json",
      },
    },
  ],
  webServer: realmodeOnly
    ? undefined
    : {
        // The Next.js config sets `output: "standalone"` so the proper
        // production entrypoint is `.next/standalone/server.js` (a
        // self-contained Node server with traced deps copied in).
        // Running `next start` against a standalone build emits a
        // warning AND can fail to boot in CI (the standalone copy is
        // missing files `next start` expects to find in the project
        // tree). Use the standalone entry directly.
        //
        // IMPORTANT: `output: "standalone"` does NOT copy `public/` or
        // `.next/static/` into the standalone bundle (those are
        // expected to be served by a CDN in production). Without
        // `cp -r public .next/standalone/ && cp -r .next/static
        // .next/standalone/.next/` after `next build`, every client JS
        // chunk 404s as `text/plain` and React never hydrates — every
        // test that needs an interactive assertion (click, URL update)
        // will fail. CI runs that copy step in the e2e job; run it
        // locally before `playwright test` if you just rebuilt.
        command: `node .next/standalone/server.js`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Playwright spawns webServer with its own env (it does NOT
        // inherit the job env). Pass the mock-mode variables here so the
        // server has the same contract as the test runner.
        // MOCK_SUPABASE=1 is the CI default — realmode launches its own
        // stack and skips this webServer (see `realmodeOnly` above).
        env: {
          MOCK_SUPABASE: "1",
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "mock-anon-key-replace-me",
          PORT,
          HOSTNAME: "127.0.0.1",
        },
      },
});
