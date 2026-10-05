// tests/unit/csrf-client.test.ts
// Client-side CSRF helper: reads the readable cookie set by the proxy
// and attaches it as `x-sunext-csrf` on write fetches. JSON bodies are
// stringified and a Content-Type is added when missing.
//
// We stub `globalThis.document` and `globalThis.fetch` per test — the
// module dereferences both at call time, not import time, so a fresh
// stub before each case is enough.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CSRF_COOKIE_READABLE,
  CSRF_HEADER,
} from "@/lib/csrf-constants";
import { csrfFetch, csrfJson } from "@/lib/csrf-client";

type FetchCall = {
  input: RequestInfo | URL;
  init: RequestInit;
};

function stubEnv(cookie: string | undefined) {
  // Cookie string parsing reads `document.cookie` directly.
  (globalThis as { document?: unknown }).document = cookie === undefined
    ? undefined
    : { cookie };
  const calls: FetchCall[] = [];
  const fakeFetch = vi.fn(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch as unknown as typeof fetch;
  return { calls, fakeFetch };
}

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { fetch?: typeof fetch }).fetch;
  vi.restoreAllMocks();
});

describe("csrfFetch", () => {
  it("GET requests pass through without setting the CSRF header", async () => {
    const { calls, fakeFetch } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    const res = await csrfFetch("/api/projects");
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    const headers = calls[0].init.headers as Headers;
    expect(headers.get(CSRF_HEADER)).toBeNull();
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it("HEAD and OPTIONS also skip the CSRF header", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/projects", { method: "HEAD" });
    await csrfFetch("/api/projects", { method: "OPTIONS" });
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      const headers = call.init.headers as Headers;
      expect(headers.get(CSRF_HEADER)).toBeNull();
    }
  });

  it("POST attaches the readable cookie as the CSRF header", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/tasks", {
      method: "POST",
      body: { title: "x" },
    });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get(CSRF_HEADER)).toBe("tok-abc");
  });

  it("PATCH and DELETE also attach the header", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/tasks/1", { method: "PATCH", body: { status: "done" } });
    await csrfFetch("/api/tasks/1", { method: "DELETE" });
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      const headers = call.init.headers as Headers;
      expect(headers.get(CSRF_HEADER)).toBe("tok-abc");
    }
  });

  it("lowercases methods and treats post the same as POST", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/tasks", { method: "post", body: { x: 1 } });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get(CSRF_HEADER)).toBe("tok-abc");
  });

  it("POST without a readable cookie omits the header (does not throw)", async () => {
    const { calls } = stubEnv(undefined);
    await csrfFetch("/api/tasks", { method: "POST", body: { x: 1 } });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get(CSRF_HEADER)).toBeNull();
  });

  it("encodes the cookie value when it contains spaces and url-encoded chars", async () => {
    // Document.cookie would arrive decoded; readCookie decodes via decodeURIComponent.
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=${encodeURIComponent("a b+c")}`);
    await csrfFetch("/api/tasks", { method: "POST", body: {} });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get(CSRF_HEADER)).toBe("a b+c");
  });

  it("finds the CSRF cookie among several cookies", async () => {
    const { calls } = stubEnv(
      `theme=dark; ${CSRF_COOKIE_READABLE}=tok-mixed; next_locale=vi`,
    );
    await csrfFetch("/api/tasks", { method: "POST", body: {} });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get(CSRF_HEADER)).toBe("tok-mixed");
  });

  it("returns undefined for a missing document (SSR safety)", async () => {
    // document is undefined → readCookie returns undefined → no header.
    const { calls } = stubEnv(undefined);
    await csrfFetch("/api/tasks", { method: "POST", body: {} });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get(CSRF_HEADER)).toBeNull();
  });

  it("JSON-stringifies object bodies and adds Content-Type", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/tasks", {
      method: "POST",
      body: { title: "Design", status: "todo" },
    });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(calls[0].init.body).toBe(
      JSON.stringify({ title: "Design", status: "todo" }),
    );
  });

  it("does not overwrite a caller-provided Content-Type", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/tasks", {
      method: "POST",
      body: { x: 1 },
      headers: { "Content-Type": "application/x-custom" },
    });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/x-custom");
  });

  it("preserves caller-provided headers alongside the CSRF header", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/tasks", {
      method: "POST",
      body: { x: 1 },
      headers: { "X-Trace": "abc" },
    });
    const headers = calls[0].init.headers as Headers;
    expect(headers.get("X-Trace")).toBe("abc");
    expect(headers.get(CSRF_HEADER)).toBe("tok-abc");
  });

  it("JSON-stringifies a string body (caller must pre-stringify raw strings)", async () => {
    const { calls } = stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    await csrfFetch("/api/raw", {
      method: "POST",
      body: "raw-text",
    });
    // csrfFetch treats every non-undefined body as JSON — callers that need
    // a raw text body should pre-stringify and pass `null` (or omit body) and
    // set Content-Type themselves.
    expect(calls[0].init.body).toBe(JSON.stringify("raw-text"));
    const headers = calls[0].init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});

describe("csrfJson", () => {
  it("returns the parsed JSON body of the response", async () => {
    stubEnv(`${CSRF_COOKIE_READABLE}=tok-abc`);
    const data = await csrfJson<{ ok: boolean }>("/api/something");
    expect(data).toEqual({ ok: true });
  });

  it("returns an empty object when the response body is not JSON", async () => {
    (globalThis as { document?: unknown }).document = { cookie: "" };
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      new Response("not-json", { status: 500 })) as unknown as typeof fetch;
    const data = await csrfJson<Record<string, unknown>>("/api/oops");
    expect(data).toEqual({});
  });
});