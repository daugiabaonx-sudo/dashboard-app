// tests/unit/planner/config-token.test.ts
// Unit tests for lib/planner/config.ts and lib/planner/token.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPlannerConfig } from "@/lib/planner/config";
import { PlannerConfigError, TokenError } from "@/lib/planner/errors";
import { getGraphToken, readTokenRoles, resetTokenCache } from "@/lib/planner/token";

const CLIENT_ID = "11111111-2222-3333-4444-555555555555";
const ENV = { MS_TENANT_ID: "tenant-x", MS_CLIENT_ID: CLIENT_ID, MS_CLIENT_SECRET: "abc8Q~secret" };
const CFG = { tenantId: "tenant-x", clientId: CLIENT_ID, clientSecret: "abc8Q~secret" };

export function fakeJwt(claims: Record<string, unknown>): string {
  return `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("readPlannerConfig", () => {
  it("returns trimmed config for valid env", () => {
    expect(readPlannerConfig({ ...ENV, MS_TENANT_ID: " tenant-x " })).toEqual(CFG);
  });

  it("lists every missing key", () => {
    expect(() => readPlannerConfig({})).toThrow(/MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET/);
  });

  it("rejects a non-GUID client id", () => {
    expect(() => readPlannerConfig({ ...ENV, MS_CLIENT_ID: "nope" })).toThrow(PlannerConfigError);
  });

  it("rejects a Secret ID pasted as the secret", () => {
    expect(() => readPlannerConfig({ ...ENV, MS_CLIENT_SECRET: CLIENT_ID })).toThrow(/Secret ID/);
  });

  it("reads process.env by default", () => {
    vi.stubEnv("MS_TENANT_ID", "t");
    vi.stubEnv("MS_CLIENT_ID", CLIENT_ID);
    vi.stubEnv("MS_CLIENT_SECRET", "s~1");
    expect(readPlannerConfig().tenantId).toBe("t");
    vi.unstubAllEnvs();
  });
});

describe("getGraphToken", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    resetTokenCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts a client_credentials grant and caches the token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "tok-1", expires_in: 3600 }));
    expect(await getGraphToken(CFG)).toBe("tok-1");
    expect(await getGraphToken(CFG)).toBe("tok-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://login.microsoftonline.com/tenant-x/oauth2/v2.0/token");
    const body = new URLSearchParams(init.body as URLSearchParams);
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("scope")).toBe("https://graph.microsoft.com/.default");
    expect(body.get("client_id")).toBe(CLIENT_ID);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "tok-2", expires_in: 3600 }));
    const [a, b] = await Promise.all([getGraphToken(CFG), getGraphToken(CFG)]);
    expect([a, b]).toEqual(["tok-2", "tok-2"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes a token that is about to expire", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "old", expires_in: 60 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: "new", expires_in: 3600 }));
    expect(await getGraphToken(CFG)).toBe("old");
    expect(await getGraphToken(CFG)).toBe("new");
  });

  it("maps AADSTS7000215 to a friendly secret message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "invalid_client", error_codes: [7000215] }, 401),
    );
    await expect(getGraphToken(CFG)).rejects.toMatchObject({
      name: "TokenError",
      code: "AADSTS7000215",
      message: expect.stringMatching(/secret Value/),
    });
  });

  it("extracts the AADSTS code from the description when error_codes is absent", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "invalid_request", error_description: "AADSTS90002: Tenant not found" }, 400),
    );
    await expect(getGraphToken(CFG)).rejects.toMatchObject({ code: "AADSTS90002" });
  });

  it("falls back to the http status for non-JSON failures", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    const err = await getGraphToken(CFG).catch((e) => e);
    expect(err).toBeInstanceOf(TokenError);
    expect(err.code).toBe("http_500");
    expect(err.message).toMatch(/http_500/);
  });

  it("uses the oauth error string when no AADSTS code is present", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "unauthorized_client" }, 400));
    await expect(getGraphToken(CFG)).rejects.toMatchObject({ code: "unauthorized_client" });
  });

  it("defaults expiry when expires_in is missing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "tok-3" }));
    expect(await getGraphToken(CFG)).toBe("tok-3");
  });
});

describe("readTokenRoles", () => {
  it("returns the string roles from the payload", () => {
    expect(readTokenRoles(fakeJwt({ roles: ["Tasks.Read.All", 7] }))).toEqual(["Tasks.Read.All"]);
  });

  it("returns [] when consent is missing (no roles claim)", () => {
    expect(readTokenRoles(fakeJwt({ appid: "x" }))).toEqual([]);
  });

  it("returns [] for malformed tokens", () => {
    expect(readTokenRoles("not-a-jwt")).toEqual([]);
    expect(readTokenRoles("a.%%%.b")).toEqual([]);
  });
});
