// lib/planner/config.ts
// Reads + validates the Microsoft Entra app credentials used for the
// app-only (OAuth 2.0 client credentials) connection to Microsoft Graph.
//
// Required env (server-only — never prefix with NEXT_PUBLIC_):
//   MS_TENANT_ID      Directory (tenant) ID
//   MS_CLIENT_ID      Application (client) ID
//   MS_CLIENT_SECRET  Client secret *Value* (NOT the "Secret ID")

import "server-only";
import { z } from "zod";
import { PlannerConfigError } from "./errors";

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const envSchema = z.object({
  MS_TENANT_ID: z.string().trim().min(1),
  MS_CLIENT_ID: z.string().trim().regex(GUID_RE),
  MS_CLIENT_SECRET: z.string().trim().min(1),
});

export interface PlannerConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

type Env = Record<string, string | undefined>;

export function readPlannerConfig(env: Env = process.env): PlannerConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))];
    throw new PlannerConfigError(
      `Planner is not configured — missing or invalid: ${keys.join(", ")}`,
    );
  }
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = parsed.data;
  // Entra secret IDs are GUIDs; secret values never are. Catch the most
  // common setup mistake before it turns into an opaque AADSTS7000215.
  if (GUID_RE.test(MS_CLIENT_SECRET)) {
    throw new PlannerConfigError(
      "MS_CLIENT_SECRET looks like the Secret ID. Use the secret Value shown once when the secret was created.",
    );
  }
  return {
    tenantId: MS_TENANT_ID,
    clientId: MS_CLIENT_ID,
    clientSecret: MS_CLIENT_SECRET,
  };
}

/** True when the MS_* credentials are present and well-formed (no network call). */
export function isPlannerConfigured(env: Env = process.env): boolean {
  try {
    readPlannerConfig(env);
    return true;
  } catch {
    return false;
  }
}
