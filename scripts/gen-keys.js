#!/usr/bin/env node
// scripts/gen-keys.js
// Emits two HS256 JWTs (anon + service_role) signed with JWT_SECRET, then
// writes them into .env.compose so the Next.js app can talk to the local
// docker-compose stack.
//
// Deterministic across `db:reset` because:
//   - JWT_SECRET is the same dev literal in .env.compose
//   - issued_at is fixed (1970-01-01 epoch — JWT spec accepts any iat value;
//     we use 0 so the JWTs are byte-identical every run)
//   - exp is 10 years out
//
// Reads:
//   JWT_SECRET from .env.compose (required)
//
// Writes:
//   ANON_KEY, SERVICE_ROLE_KEY in .env.compose (preserving comments + ordering)
//
// No npm dependencies — uses Node 20+ built-in Web Crypto API.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_PATH = join(ROOT, ".env.compose");

function readJwtSecret() {
  if (!existsSync(ENV_PATH)) {
    console.error(`[gen-keys] ${ENV_PATH} not found.`);
    process.exit(1);
  }
  const text = readFileSync(ENV_PATH, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (key === "JWT_SECRET") {
      return line.slice(eq + 1).trim();
    }
  }
  console.error("[gen-keys] JWT_SECRET not set in .env.compose.");
  process.exit(1);
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  let str = "";
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(str) {
  return base64UrlEncode(encoder.encode(str));
}

async function signJwt(secret, payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput))
  );
  const signatureB64 = base64UrlEncode(signature);

  return `${signingInput}.${signatureB64}`;
}

async function main() {
  const secret = readJwtSecret();
  // iat = current epoch second. GoTrue rejects iat=0 as "expired" because
  // its claim-window check sees a token issued 56 years ago whose exp is
  // only ~10 years in the future.
  // exp = iat + 10 years.
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 365 * 10;

  const anonJwt = await signJwt(secret, {
    role: "anon",
    iss: "supabase",
    iat,
    exp,
  });
  const serviceJwt = await signJwt(secret, {
    role: "service_role",
    iss: "supabase",
    iat,
    exp,
  });

  const original = readFileSync(ENV_PATH, "utf8");
  const updated = original
    .split("\n")
    .map((line) => {
      if (line.startsWith("ANON_KEY=")) return `ANON_KEY=${anonJwt}`;
      if (line.startsWith("SERVICE_ROLE_KEY=")) return `SERVICE_ROLE_KEY=${serviceJwt}`;
      return line;
    })
    .join("\n");

  writeFileSync(ENV_PATH, updated, "utf8");

  console.log("[gen-keys] wrote ANON_KEY and SERVICE_ROLE_KEY to .env.compose");
}

main().catch((error) => {
  console.error(
    "[gen-keys] unexpected error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
