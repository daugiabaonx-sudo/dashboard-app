#!/usr/bin/env node
// scripts/seed-auth.js
// Provisions 8 deterministic auth.users rows via the GoTrue admin API.
// Use this against a Supabase Cloud project (or any external GoTrue
// instance) — not against the local docker-compose stack, which only
// runs Postgres + PostgREST.
//
// Reads env:
//   GOTRUE_URL               (default http://127.0.0.1:9999)
//   SUPABASE_URL             (default = GOTRUE_URL)
//   SUPABASE_SERVICE_ROLE_KEY (REQUIRED — fails fast if missing)
//
// If SUPABASE_SERVICE_ROLE_KEY is not exported, fall back to the local
// .env.compose file. This lets the script be invoked via `npm run db:seed-auth`
// against Cloud credentials pasted into .env.local.
//
// Uses Node 20+ built-in fetch only. No dependencies.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function loadComposeEnv() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const composePath = join(ROOT, ".env.compose");
  if (!existsSync(composePath)) return;
  const text = readFileSync(composePath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const GOTRUE_URL = process.env.GOTRUE_URL || "http://127.0.0.1:9999";
const SUPABASE_URL = process.env.SUPABASE_URL || GOTRUE_URL;
loadComposeEnv();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[seed-auth] SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Source .env.compose or export it before running this script."
  );
  process.exit(1);
}

const USERS = [
  { id: "00000000-0000-0000-0000-00000000000a", email: "minhanh@sunext.io",   full_name: "Nguyen Minh Anh",  initials: "MA" },
  { id: "00000000-0000-0000-0000-00000000000b", email: "quocbao@sunext.io",   full_name: "Tran Quoc Bao",    initials: "QB" },
  { id: "00000000-0000-0000-0000-00000000000c", email: "phuong.le@sunext.io", full_name: "Le Hoang Phuong",  initials: "LP" },
  { id: "00000000-0000-0000-0000-00000000000d", email: "thanhdat@sunext.io",  full_name: "Pham Thanh Dat",   initials: "TD" },
  { id: "00000000-0000-0000-0000-00000000000e", email: "kimtuyen@sunext.io",  full_name: "Vu Kim Tuyen",     initials: "KT" },
  { id: "00000000-0000-0000-0000-00000000000f", email: "bichngoc@sunext.io",  full_name: "Dao Bich Ngoc",    initials: "BN" },
  { id: "00000000-0000-0000-0000-000000000010", email: "giakhanh@sunext.io",  full_name: "Hoang Gia Khanh",  initials: "GK" },
  { id: "00000000-0000-0000-0000-000000000011", email: "mailinh@sunext.io",   full_name: "Bui Thi Mai Linh", initials: "ML" },
];

const SEED_PASSWORD = "test-password-123";
const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_INTERVAL_MS = 2_000;
const SUCCESS_STATUSES = new Set([200, 201, 409, 422]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealthy() {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let lastError = "no response yet";

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${GOTRUE_URL}/auth/v1/health`);
      if (res.ok) {
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(HEALTH_POLL_INTERVAL_MS);
  }

  console.error(
    `[seed-auth] GoTrue did not become healthy within ${HEALTH_TIMEOUT_MS / 1000}s. Last error: ${lastError}`
  );
  process.exit(1);
}

async function provisionUser(user) {
  // If the stub row already exists from seed-users.sql (id matches),
  // delete it first so GoTrue can re-create with a real password hash.
  // GoTrue's admin POST returns 422 on duplicate; we treat that as a
  // signal to fall through to a DELETE+POST cycle.
  const baseUrl = `${SUPABASE_URL}/auth/v1/admin/users`;
  const headers = {
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  async function create() {
    return fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        password: SEED_PASSWORD,
        email_confirm: true,
        // Cloud-supabase convention: every authenticated user has
        // `role: "authenticated"` on auth.users. Without it, GoTrue's
        // access_token JWT carries `"role": ""` and PostgREST returns
        // `role "" does not exist` on the first SELECT — RLS-scoped
        // tables return [] even for a workspace member.
        role: "authenticated",
        user_metadata: {
          full_name: user.full_name,
          initials: user.initials,
        },
      }),
    });
  }

  async function deleteById() {
    return fetch(`${baseUrl}/${user.id}`, {
      method: "DELETE",
      headers,
    });
  }

  async function ensureRole(userId) {
    // Re-PUT the role for users created before the `role` field was
    // added to the admin POST body (so this script is idempotent on
    // existing stacks whose auth.users.role is still empty).
    const res = await fetch(`${baseUrl}/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ role: "authenticated" }),
    });
    if (!res.ok) {
      const detail = await safeText(res);
      console.error(
        `[seed-auth] failed to set role=authenticated for ${userId}: HTTP ${res.status} — ${detail}`
      );
      process.exit(1);
    }
  }

  let res = await create();
  if (res.status === 422) {
    // Stub row from seed-users.sql exists; delete and retry once.
    const del = await deleteById();
    if (!del.ok && del.status !== 404) {
      const detail = await safeText(del);
      console.error(
        `[seed-auth] failed to delete pre-existing stub for ${user.email}: HTTP ${del.status} — ${detail}`
      );
      process.exit(1);
    }
    res = await create();
  }

  if (SUCCESS_STATUSES.has(res.status)) {
    await ensureRole(user.id);
    console.log(`[seed-auth] user ${user.email} created or already exists`);
    return;
  }

  const detail = await safeText(res);
  console.error(
    `[seed-auth] failed to provision ${user.email}: HTTP ${res.status} — ${detail}`
  );
  process.exit(1);
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "<unreadable response body>";
  }
}

async function fetchAnonKey() {
  // ANON_KEY is generated deterministically by scripts/gen-keys.js and
  // lives next to SERVICE_ROLE_KEY in .env.compose. Reading it directly
  // avoids relying on GoTrue's /auth/v1/settings endpoint, which does
  // not always expose anon_key (v2.177.0 omits it). Falling back to
  // SERVICE_ROLE_KEY would be a security regression — the anon key
  // must be the role:anon JWT, never the role:service_role one.
  const composePath = join(ROOT, ".env.compose");
  if (existsSync(composePath)) {
    const text = readFileSync(composePath, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      if (key === "ANON_KEY") {
        const value = line.slice(eq + 1).trim();
        if (value.length > 0) return value;
      }
    }
  }
  // Last-resort fallback: ask GoTrue's settings endpoint. If that also
  // fails, propagate the service-role key with a warning rather than
  // silently swapping roles — operators must see that the fallback fired.
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn(
        "[seed-auth] .env.compose has no ANON_KEY and /auth/v1/settings returned " +
          `${res.status}; falling back to SERVICE_ROLE_KEY (RDS-bypassing) — ` +
          "this will break RLS. Re-run `npm run db:reset` to regenerate ANON_KEY."
      );
      return SUPABASE_SERVICE_ROLE_KEY;
    }
    const json = await res.json();
    const settings = json && typeof json === "object" ? json : {};
    const candidate =
      settings.anon_key ||
      settings.api_key ||
      settings.public_key ||
      settings.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  } catch {
    // fallthrough
  }
  console.warn(
    "[seed-auth] could not locate ANON_KEY; falling back to SERVICE_ROLE_KEY"
  );
  return SUPABASE_SERVICE_ROLE_KEY;
}

async function main() {
  console.log(`[seed-auth] GoTrue URL: ${GOTRUE_URL}`);
  console.log(`[seed-auth] Supabase URL: ${SUPABASE_URL}`);
  console.log("[seed-auth] waiting for GoTrue to become healthy...");

  await waitForHealthy();

  for (const user of USERS) {
    await provisionUser(user);
  }

  const anonKey = await fetchAnonKey();

  const banner = [
    "------ PASTE INTO .env.local ------",
    "MOCK_SUPABASE=0",
    `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}`,
    "ACTIVE_WORKSPACE_COOKIE=sunext.active_workspace",
    "-------------------------------------",
  ];
  console.log(banner.join("\n"));

  console.log("OK: seed-auth finished");
}

main().catch((error) => {
  console.error(
    "[seed-auth] unexpected error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});