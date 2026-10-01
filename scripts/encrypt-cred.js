#!/usr/bin/env node
// scripts/encrypt-cred.js
//
// Encrypts a credential using Realtime v3's expected AES-128-ECB + PKCS7 +
// base64 scheme. Realtime calls `Realtime.Crypto.decrypt!` (lib/realtime/
// encryption.ex) on EVERY value in extensions.settings before passing them
// to Postgrex.start_link/1 — the values stored in the `db_host`, `db_port`,
// `db_name`, `db_user`, `db_password` columns must therefore be base64
// AES-128-ECB ciphertext (NOT plaintext), using the same DB_ENC_KEY that
// Realtime reads via Application.get_env(:realtime, :db_enc_key).
//
// Our compose sets DB_ENC_KEY=supabaserealtime (Cloud's default), matching
// tenants.jwt_secret's encryption.
//
// Usage:
//   node scripts/encrypt-cred.js postgres
//   → prints the base64 ciphertext to copy into a SQL UPDATE.
//
// See lib/realtime/encryption.ex:1-30 (def encrypt!/1) for the source
// algorithm — this is a 1:1 port.
//
// Intentionally CommonJS (require) — this script runs standalone via `node`,
// not through the Next.js bundler. Node 20+ supports either, but CJS keeps
// the script runnable from any directory without ESM resolution paths.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");

function pad(data) {
  const toAdd = 16 - (data.length % 16);
  return Buffer.concat([data, Buffer.alloc(toAdd, toAdd)]);
}

function encrypt(text, key) {
  const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(false);
  const padded = pad(Buffer.from(text, "utf8"));
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString(
    "base64",
  );
}

const key = Buffer.from(
  process.env.DB_ENC_KEY || "supabaserealtime",
  "utf8",
);
if (key.length !== 16) {
  console.error(
    `DB_ENC_KEY must be exactly 16 bytes (got ${key.length}). Set DB_ENC_KEY env var to the same value Realtime is configured with.`,
  );
  process.exit(1);
}

const value = process.argv[2];
if (!value) {
  console.error("usage: node scripts/encrypt-cred.js <plaintext>");
  process.exit(1);
}

process.stdout.write(encrypt(value, key));