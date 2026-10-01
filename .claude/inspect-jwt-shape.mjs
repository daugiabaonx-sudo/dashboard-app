// inspect-jwt-shape.mjs
// Safe: decode the user JWT payload and emit ONLY the claim keys (no values).
// Lets us verify whether GoTrue issues `sub` / `user_id` / `email` so we can
// understand what realtime.subscription.claims will look like after
// client.realtime.setAuth(userAccessToken).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_FILE = join(process.cwd(), ".env.compose");
const env = Object.fromEntries(
  readFileSync(ENV_FILE, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const ANON_KEY = env.ANON_KEY;
if (!ANON_KEY) { console.error("no ANON_KEY"); process.exit(1); }

const resp = await fetch("http://127.0.0.1:9999/auth/v1/token?grant_type=password", {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: ANON_KEY },
  body: JSON.stringify({ email: "minhanh@sunext.io", password: "test-password-123" }),
});
const json = await resp.json();
const token = json.access_token;
const payloadB64 = token.split(".")[1];
const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
const decoded = Buffer.from(padded, "base64url").toString("utf8");
const claims = JSON.parse(decoded);

// Print only the keys, sorted.
console.log("claim keys:", JSON.stringify(Object.keys(claims).sort()));
console.log("claim count:", claims ? Object.keys(claims).length : 0);
