// tests/unit/auth/remembered-email.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  REMEMBERED_EMAIL_KEY,
  readRememberedEmail,
  persistRememberedEmail,
  type KeyValueStore,
} from "@/lib/auth/remembered-email";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("readRememberedEmail", () => {
  it("returns the stored email when it is valid", () => {
    const store = memoryStore({ [REMEMBERED_EMAIL_KEY]: "a@sunext.io" });
    expect(readRememberedEmail(store)).toBe("a@sunext.io");
  });

  it("returns null when nothing is stored", () => {
    expect(readRememberedEmail(memoryStore())).toBeNull();
  });

  it("returns null and clears a malformed value", () => {
    const store = memoryStore({ [REMEMBERED_EMAIL_KEY]: "<script>" });
    expect(readRememberedEmail(store)).toBeNull();
    expect(store.data[REMEMBERED_EMAIL_KEY]).toBeUndefined();
  });

  it("returns null when storage is unavailable", () => {
    expect(readRememberedEmail(null)).toBeNull();
  });

  it("returns null when storage throws", () => {
    const store: KeyValueStore = {
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    expect(readRememberedEmail(store)).toBeNull();
  });
});

describe("persistRememberedEmail", () => {
  it("stores the trimmed, lower-cased email when remember is on", () => {
    const store = memoryStore();
    persistRememberedEmail(store, "  QuocBao@Sunext.io ", true);
    expect(store.data[REMEMBERED_EMAIL_KEY]).toBe("quocbao@sunext.io");
  });

  it("removes the stored email when remember is off", () => {
    const store = memoryStore({ [REMEMBERED_EMAIL_KEY]: "a@sunext.io" });
    persistRememberedEmail(store, "a@sunext.io", false);
    expect(store.data[REMEMBERED_EMAIL_KEY]).toBeUndefined();
  });

  it("does not store an invalid email even when remember is on", () => {
    const store = memoryStore({ [REMEMBERED_EMAIL_KEY]: "old@sunext.io" });
    persistRememberedEmail(store, "not-an-email", true);
    expect(store.data[REMEMBERED_EMAIL_KEY]).toBeUndefined();
  });

  it("is a no-op when storage is unavailable", () => {
    expect(() => persistRememberedEmail(null, "a@sunext.io", true)).not.toThrow();
  });

  it("swallows storage quota errors", () => {
    const store: KeyValueStore = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
      removeItem: vi.fn(),
    };
    expect(() => persistRememberedEmail(store, "a@sunext.io", true)).not.toThrow();
  });
});
