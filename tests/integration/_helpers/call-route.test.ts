// tests/integration/_helpers/call-route.test.ts
// Smoke tests for the route-helper itself — proves the helper can drive
// a handler that returns JSON, a handler that uses params, a handler
// that throws NEXT_REDIRECT, and a handler that sets cookies.

import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { callRoute } from "./call-route";

describe("callRoute", () => {
  it("invokes a JSON-returning GET handler", async () => {
    const handler = async () =>
      NextResponse.json({ hello: "world" }, { status: 200 });
    const res = await callRoute(handler, { method: "GET" });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ hello: "world" });
  });

  it("passes the URL, method, and JSON body to the handler", async () => {
    let captured: { method: string; url: string; body: unknown } | null = null;
    const handler = async (request: Request) => {
      captured = {
        method: request.method,
        url: request.url,
        body: await request.clone().json(),
      };
      return NextResponse.json({ ok: true });
    };
    await callRoute(handler, {
      method: "POST",
      url: "http://localhost:3000/api/projects",
      body: { name: "Alpha" },
    });
    expect(captured).not.toBeNull();
    expect(captured!.method).toBe("POST");
    expect(captured!.url).toBe("http://localhost:3000/api/projects");
    expect(captured!.body).toEqual({ name: "Alpha" });
  });

  it("resolves params and forwards them to the handler", async () => {
    let idSeen: string | null = null;
    const handler = async (
      _req: Request,
      ctx: { params: Promise<Record<string, string>> },
    ) => {
      const { id } = await ctx.params;
      idSeen = id;
      return NextResponse.json({ id });
    };
    await callRoute(handler, { params: { id: "abc-123" } });
    expect(idSeen).toBe("abc-123");
  });

  it("translates NEXT_REDIRECT into a 401 with location", async () => {
    const handler = async () => {
      const err = new Error("NEXT_REDIRECT") as Error & { digest?: string };
      err.digest = "NEXT_REDIRECT;replace;/login;307";
      throw err;
    };
    const res = await callRoute(handler);
    expect(res.status).toBe(401);
    expect(res.redirected).toBe(true);
    expect(res.location).toBe("/login");
  });

  it("propagates non-redirect errors instead of swallowing them", async () => {
    const handler = async () => {
      throw new Error("boom");
    };
    await expect(callRoute(handler)).rejects.toThrow("boom");
  });

  it("collects cookies set via res.cookies.set", async () => {
    const handler = async () => {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("session", "abc", { path: "/" });
      return res;
    };
    const res = await callRoute(handler);
    expect(res.cookies).toContainEqual({ name: "session", value: "abc" });
  });

  it("handles a plain Response (no NextResponse) body", async () => {
    const handler = async () =>
      new Response(JSON.stringify({ plain: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const res = await callRoute(handler);
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ plain: true });
  });
});
