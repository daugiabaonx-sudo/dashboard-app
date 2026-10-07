// lib/planner/token.ts
// App-only access token for Microsoft Graph via the OAuth 2.0 client
// credentials grant. Tokens are cached in-process until 5 minutes before
// expiry, and concurrent callers share a single in-flight request.
//
// Docs: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow

import "server-only";
import { readPlannerConfig, type PlannerConfig } from "./config";
import { TokenError } from "./errors";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const REFRESH_SKEW_MS = 5 * 60 * 1000;

const FRIENDLY_AAD_ERRORS: Readonly<Record<string, string>> = {
  AADSTS7000215:
    "Invalid client secret. Use the secret Value, not the Secret ID.",
  AADSTS7000222: "Client secret has expired. Create a new one in Certificates & secrets.",
  AADSTS700016: "Application (client) ID was not found in this tenant.",
  AADSTS90002: "Tenant ID was not found.",
  AADSTS900023: "Tenant ID is malformed.",
};

interface CachedToken {
  readonly accessToken: string;
  readonly expiresAt: number;
  readonly key: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  error_codes?: number[];
}

let cached: CachedToken | null = null;
let inflight: Promise<CachedToken> | null = null;

/** Test hook — clears the in-process token cache. */
export function resetTokenCache(): void {
  cached = null;
  inflight = null;
}

function aadCode(body: TokenResponse, status: number): string {
  if (body.error_codes?.length) return `AADSTS${body.error_codes[0]}`;
  const fromText = body.error_description?.match(/AADSTS\d+/)?.[0];
  return fromText ?? body.error ?? `http_${status}`;
}

async function requestToken(cfg: PlannerConfig): Promise<CachedToken> {
  const url = `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: GRAPH_SCOPE,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !body.access_token) {
    const code = aadCode(body, res.status);
    throw new TokenError(
      FRIENDLY_AAD_ERRORS[code] ?? `Token request failed (${code})`,
      code,
    );
  }
  return {
    accessToken: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3599) * 1000,
    key: `${cfg.tenantId}:${cfg.clientId}`,
  };
}

export async function getGraphToken(
  cfg: PlannerConfig = readPlannerConfig(),
): Promise<string> {
  const key = `${cfg.tenantId}:${cfg.clientId}`;
  if (cached && cached.key === key && cached.expiresAt - REFRESH_SKEW_MS > Date.now()) {
    return cached.accessToken;
  }
  if (!inflight) {
    inflight = requestToken(cfg)
      .then((token) => {
        cached = token;
        return token;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return (await inflight).accessToken;
}

/**
 * Application permissions granted to the token (the JWT `roles` claim).
 * Empty when admin consent has not been granted yet. Diagnostic only —
 * the signature is not verified here; Graph verifies it on every call.
 */
export function readTokenRoles(accessToken: string): string[] {
  const payload = accessToken.split(".")[1];
  if (!payload) return [];
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      roles?: unknown;
    };
    return Array.isArray(claims.roles)
      ? claims.roles.filter((r): r is string => typeof r === "string")
      : [];
  } catch {
    return [];
  }
}
