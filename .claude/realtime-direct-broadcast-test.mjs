// .claude/realtime-direct-broadcast-test.mjs
// Pure Node test: open a raw WS to the realtime gateway, subscribe via
// Phoenix channel protocol, then UPDATE a row via psql and observe
// whether the broadcast frame arrives.
//
// This isolates the WS-level subscription path from the Next.js client
// (no supabase-js, no React Query).
//
// ANON_KEY is read from .env.compose at runtime — never embedded.

import WebSocket from "ws";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_FILE = join(process.cwd(), ".env.compose");
function loadEnv() {
  const out = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}
const env = loadEnv();
const ANON_KEY = env.ANON_KEY;
if (!ANON_KEY) {
  console.error("ANON_KEY missing from .env.compose");
  process.exit(1);
}
const TASK_ID = "00000000-0000-0000-0000-0000000000b2";

const ws = new WebSocket(
  `ws://127.0.0.1:54321/realtime/v1/websocket?vsn=2.0.0&apikey=${encodeURIComponent(ANON_KEY)}`,
);
const frames = [];

ws.on("open", () => {
  console.log("[open]");
  // Try the same channel name the dashboard subscribes to: tasks:{workspaceId}.
  // The full Phoenix topic is `realtime:tasks:{workspaceId}` per
  // channelNames.tasks() in components/realtime/subscriptions.tsx.
  const topic = `realtime:tasks:00000000-0000-0000-0000-000000000001`;
  const joinRef = "1";
  ws.send(
    JSON.stringify([
      joinRef,
      joinRef,
      topic,
      "phx_join",
      {
        config: {
          postgres_changes: [{ event: "*", schema: "public", table: "tasks" }],
        },
        access_token: ANON_KEY,
      },
    ]),
  );
});

ws.on("message", (data) => {
  const txt = data.toString();
  frames.push(txt);
  console.log("[recv]", txt.slice(0, 400));
});

ws.on("error", (e) => console.error("[err]", e.message));
ws.on("close", (code) => console.log("[close]", code));

setTimeout(() => {
  console.log("[snapshot] frames so far:", frames.length);
  console.log("[UPDATE] via psql");
  const r = execSync(
    `docker exec sunext-db psql -U supabase_admin -d postgres -t -c ` +
      `"UPDATE public.tasks SET updated_at=now() WHERE id='${TASK_ID}'"`,
  ).toString();
  console.log("    psql:", r.trim());
}, 2000);

setTimeout(() => {
  console.log("[final] frames total:", frames.length);
  ws.close();
  process.exit(0);
}, 8000);