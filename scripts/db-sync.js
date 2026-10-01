#!/usr/bin/env node
// scripts/db-sync.js
// Flattens supabase/migrations/*.sql + supabase/seed.sql into /tmp/sunext-initdb/
// so the postgres:16-alpine entrypoint processes them at first init.
// (The entrypoint ignores subdirectories of docker-entrypoint-initdb.d.)

import { mkdirSync, copyFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const SEED_FILE = join(ROOT, "supabase", "seed.sql");
const TARGET_DIR = "/tmp/sunext-initdb";

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`Missing ${MIGRATIONS_DIR}`);
  process.exit(1);
}
if (!existsSync(SEED_FILE)) {
  console.error(`Missing ${SEED_FILE}`);
  process.exit(1);
}

rmSync(TARGET_DIR, { recursive: true, force: true });
mkdirSync(TARGET_DIR, { recursive: true });

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const f of files) {
  copyFileSync(join(MIGRATIONS_DIR, f), join(TARGET_DIR, f));
  console.log(`  + migrations/${f}`);
}

const SEED_USERS_FILE = join(ROOT, "supabase", "seed-users.sql");
if (existsSync(SEED_USERS_FILE)) {
  copyFileSync(SEED_USERS_FILE, join(TARGET_DIR, "seed-users.sql"));
  console.log("  + seed-users.sql");
}

copyFileSync(SEED_FILE, join(TARGET_DIR, "seed.sql"));
console.log("  + seed.sql");
copyFileSync(join(ROOT, ".env.compose"), join(TARGET_DIR, ".env.compose"));
console.log("  + .env.compose");

console.log(`Synced ${files.length} migrations + seed-users.sql + seed.sql → ${TARGET_DIR}`);
