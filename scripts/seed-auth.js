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
  { id: "00000000-0000-0000-0000-00000000000a", email: "minhanh@sunext.io",    full_name: "Minh Anh",    initials: "MA" },
  { id: "00000000-0000-0000-0000-00000000000b", email: "quochuy@sunext.io",    full_name: "Quoc Huy",    initials: "QH" },
  { id: "00000000-0000-0000-0000-00000000000c", email: "thanhlam@sunext.io",   full_name: "Thanh Lam",   initials: "TL" },
  { id: "00000000-0000-0000-0000-00000000000d", email: "phuongthao@sunext.io", full_name: "Phuong Thao", initials: "PT" },
  { id: "00000000-0000-0000-0000-00000000000e", email: "ductrung@sunext.io",   full_name: "Duc Trung",   initials: "DT" },
  { id: "00000000-0000-0000-0000-00000000000f", email: "thanhha@sunext.io",    full_name: "Thanh Ha",    initials: "TH" },
  { id: "00000000-0000-0000-0000-000000000010", email: "ngocmai@sunext.io",    full_name: "Ngoc Mai",    initials: "NM" },
  { id: "00000000-0000-0000-0000-000000000011", email: "kimanh@sunext.io",     full_name: "Kim Anh",     initials: "KA" },
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
  const body = {
    id: user.id,
    email: user.email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: user.full_name,
      initials: user.initials,
    },
  };

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (SUCCESS_STATUSES.has(res.status)) {
    console.log(`[seed-auth] user ${user.email} created or already exists`);
    return;
  }

  let detail = "";
  try {
    detail = await res.text();
  } catch {
    detail = "<unreadable response body>";
  }
  console.error(
    `[seed-auth] failed to provision ${user.email}: HTTP ${res.status} — ${detail}`
  );
  process.exit(1);
}

async function fetchAnonKey() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      return SUPABASE_SERVICE_ROLE_KEY;
    }
    const json = await res.json();
    const settings = json && typeof json === "object" ? json : {};
    const candidate =
      settings.anon_key ||
      settings.api_key ||
      settings.public_key ||
      settings.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return typeof candidate === "string" && candidate.length > 0
      ? candidate
      : SUPABASE_SERVICE_ROLE_KEY;
  } catch {
    return SUPABASE_SERVICE_ROLE_KEY;
  }
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