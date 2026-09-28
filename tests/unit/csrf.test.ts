import { describe, expect, it } from "vitest";
import {
  CSRF_HEADER,
  CSRF_COOKIE_HTTP_ONLY,
  CSRF_COOKIE_READABLE,
  generateCsrfToken,
  readCsrfPair,
  shouldEnforce,
  verifyCsrfToken,
} from "@/lib/csrf";

describe("csrf helpers", () => {
  describe("shouldEnforce", () => {
    it("skips safe methods", () => {
      expect(shouldEnforce("GET", "/api/projects")).toBe(false);
      expect(shouldEnforce("HEAD", "/api/projects")).toBe(false);
      expect(shouldEnforce("OPTIONS", "/api/projects")).toBe(false);
    });

    it("enforces write methods on non-auth paths", () => {
      expect(shouldEnforce("POST", "/api/projects")).toBe(true);
      expect(shouldEnforce("PATCH", "/api/projects/123")).toBe(true);
      expect(shouldEnforce("DELETE", "/api/projects/123")).toBe(true);
      expect(shouldEnforce("PUT", "/api/projects/123")).toBe(true);
    });

    it("skips auth routes so login flow is unimpeded", () => {
      expect(shouldEnforce("POST", "/api/auth/sign-in")).toBe(false);
      expect(shouldEnforce("POST", "/api/auth/sign-up")).toBe(false);
    });
  });

  describe("generateCsrfToken", () => {
    it("returns 64 hex chars", () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("returns unique tokens on each call", () => {
      const a = generateCsrfToken();
      const b = generateCsrfToken();
      expect(a).not.toBe(b);
    });
  });

  describe("verifyCsrfToken", () => {
    it("accepts a matching token", () => {
      const t = generateCsrfToken();
      expect(verifyCsrfToken(t, t)).toBe(true);
    });

    it("rejects a mismatched token", () => {
      expect(verifyCsrfToken(generateCsrfToken(), generateCsrfToken())).toBe(false);
    });

    it("rejects when provided is missing", () => {
      expect(verifyCsrfToken(null, "abc")).toBe(false);
    });

    it("rejects when expected is missing", () => {
      expect(verifyCsrfToken("abc", undefined)).toBe(false);
    });

    it("rejects differing-length strings without throwing", () => {
      expect(verifyCsrfToken("a", "ab")).toBe(false);
    });
  });

  describe("readCsrfPair", () => {
    it("returns both cookies when present", () => {
      const cookies = {
        get: (name: string) =>
          name === CSRF_COOKIE_HTTP_ONLY
            ? { value: "http_tok" }
            : name === CSRF_COOKIE_READABLE
              ? { value: "read_tok" }
              : undefined,
      };
      const pair = readCsrfPair(cookies);
      expect(pair.httpOnly).toBe("http_tok");
      expect(pair.readable).toBe("read_tok");
    });

    it("returns undefineds when cookies absent", () => {
      const pair = readCsrfPair({ get: () => undefined });
      expect(pair.httpOnly).toBeUndefined();
      expect(pair.readable).toBeUndefined();
    });
  });

  it("exports the expected constants", () => {
    expect(CSRF_HEADER).toBe("x-sunext-csrf");
    expect(CSRF_COOKIE_HTTP_ONLY).toBe("sunext_csrf_token");
    expect(CSRF_COOKIE_READABLE).toBe("sunext_csrf_token_readable");
  });
});
