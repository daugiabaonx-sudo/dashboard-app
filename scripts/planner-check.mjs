#!/usr/bin/env node
// Verify the Microsoft Planner (Graph) connection from the terminal.
//
//   node scripts/planner-check.mjs [groupId]
//
// Reads MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET (and optional
// PLANNER_GROUP_ID) from .env.local, then:
//   1. requests an app-only token (client credentials grant)
//   2. prints the application permissions granted to it (JWT `roles`)
//   3. if a group id is available, lists that group's plans + task counts
//
// Standalone on purpose (lib/planner/* is `server-only`). Never prints
// the secret or the token.

import fs from "node:fs";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
const groupId = process.argv[2] || process.env.PLANNER_GROUP_ID;
const GRAPH = "https://graph.microsoft.com/v1.0";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!MS_TENANT_ID || !MS_CLIENT_ID || !MS_CLIENT_SECRET) {
  fail("Set MS_TENANT_ID, MS_CLIENT_ID and MS_CLIENT_SECRET in .env.local");
}

async function getToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    const first = (body.error_description ?? "").split("\n")[0];
    fail(`Token request failed: ${body.error ?? res.status} — ${first}`);
  }
  return body.access_token;
}

async function graph(token, path) {
  const res = await fetch(`${GRAPH}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`GET ${path} → ${res.status} ${body.error?.code ?? ""}: ${body.error?.message ?? ""}`);
  return body;
}

const token = await getToken();
console.log("✓ Access token issued (credentials are valid)");

const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
const roles = Array.isArray(claims.roles) ? claims.roles : [];
console.log(`  App: ${claims.app_displayname ?? MS_CLIENT_ID}`);
console.log(`  Roles: ${roles.length ? roles.join(", ") : "(none)"}`);

if (!roles.some((r) => r === "Tasks.Read.All" || r === "Tasks.ReadWrite.All")) {
  fail(
    "No Tasks.* application permission in the token. A Global Administrator (or Privileged Role Administrator) must click “Grant admin consent” in App registrations → API permissions.",
  );
}
console.log("✓ Planner permission granted");

if (!groupId) {
  console.log("ℹ Pass a Microsoft 365 group id (or set PLANNER_GROUP_ID) to list its plans.");
  process.exit(0);
}

const plans = await graph(token, `/groups/${encodeURIComponent(groupId)}/planner/plans`);
console.log(`✓ Group ${groupId}: ${plans.value.length} plan(s)`);
for (const plan of plans.value) {
  const tasks = await graph(token, `/planner/plans/${encodeURIComponent(plan.id)}/tasks`);
  console.log(`  • ${plan.title}  [planId=${plan.id}]  — ${tasks.value.length} task(s)`);
}
