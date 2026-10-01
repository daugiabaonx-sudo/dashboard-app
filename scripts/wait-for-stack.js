#!/usr/bin/env node
// scripts/wait-for-stack.js
// Polls the Caddy gateway on /auth/v1/health until it returns 200. Used by
// `npm run db:reset` and the e2e-realmode CI job to ensure the full
// Postgres + GoTrue + Realtime + Meta + PostgREST stack is reachable
// before downstream scripts (seed-auth, playwright) run.
//
// Exits with code 0 on success, code 1 on timeout.
//
// Env:
//   GATEWAY_URL       (default http://127.0.0.1:54321)
//   WAIT_TIMEOUT_MS   (default 90000)
//   POLL_INTERVAL_MS  (default 1000)

const GATEWAY_URL = process.env.GATEWAY_URL || "http://127.0.0.1:54321";
const TIMEOUT_MS = Number.parseInt(process.env.WAIT_TIMEOUT_MS || "90000", 10);
const POLL_MS = Number.parseInt(process.env.POLL_INTERVAL_MS || "1000", 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkHealth() {
  try {
    const res = await fetch(`${GATEWAY_URL}/auth/v1/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MS;
  let lastError = "no response yet";

  console.log(`[wait-for-stack] polling ${GATEWAY_URL}/auth/v1/health (timeout ${TIMEOUT_MS}ms)`);

  while (Date.now() < deadline) {
    if (await checkHealth()) {
      console.log(`[wait-for-stack] gateway is healthy`);
      process.exit(0);
    }
    await sleep(POLL_MS);
  }

  console.error(
    `[wait-for-stack] gateway did not become healthy within ${TIMEOUT_MS}ms. Last status: ${lastError}`
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(
    "[wait-for-stack] unexpected error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
