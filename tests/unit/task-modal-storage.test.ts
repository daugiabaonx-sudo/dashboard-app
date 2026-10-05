// tests/unit/task-modal-storage.test.ts
// localStorage helpers for the task modal override map. The module
// must be safe in three contexts: SSR (window undefined), happy path,
// and a broken JSON parse. We stub `globalThis.window` per test.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskOverride, TaskOverrideMap } from "@/lib/task-modal-storage";
import {
  clearTaskOverride,
  readTaskOverrides,
  setTaskOverride,
  writeTaskOverrides,
} from "@/lib/task-modal-storage";

const STORAGE_KEY = "sunext_task_overrides_v1";

function stubStorage(initial?: string) {
  const backing = new Map<string, string>();
  if (initial !== undefined) backing.set(STORAGE_KEY, initial);
  const storage = {
    getItem: (name: string) => backing.get(name) ?? null,
    setItem: (name: string, value: string) => {
      backing.set(name, value);
    },
    removeItem: (name: string) => {
      backing.delete(name);
    },
    clear: () => backing.clear(),
    key: (i: number) => Array.from(backing.keys())[i] ?? null,
    get length() {
      return backing.size;
    },
  };
  (globalThis as { window?: unknown }).window = { localStorage: storage };
  return storage;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("readTaskOverrides", () => {
  it("returns {} on the server (no window)", () => {
    expect(readTaskOverrides()).toEqual({});
  });

  it("returns {} when nothing has been written", () => {
    stubStorage();
    expect(readTaskOverrides()).toEqual({});
  });

  it("returns the parsed map when present", () => {
    const seed: TaskOverrideMap = {
      "t-1": {
        taskId: "t-1",
        status: "done",
        priority: "high",
        notes: "ok",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    };
    stubStorage(JSON.stringify(seed));
    expect(readTaskOverrides()).toEqual(seed);
  });

  it("returns {} when the stored JSON is malformed", () => {
    stubStorage("not json{");
    expect(readTaskOverrides()).toEqual({});
  });

  it("returns {} when the stored value is an array", () => {
    stubStorage(JSON.stringify([1, 2, 3]));
    expect(readTaskOverrides()).toEqual({});
  });

  it("returns {} when the stored value is null", () => {
    stubStorage("null");
    expect(readTaskOverrides()).toEqual({});
  });

  it("returns {} when the stored value is a primitive", () => {
    stubStorage(JSON.stringify("a string"));
    expect(readTaskOverrides()).toEqual({});
  });
});

describe("writeTaskOverrides", () => {
  it("persists the JSON-stringified map", () => {
    const storage = stubStorage();
    const next: TaskOverrideMap = {
      "t-9": {
        taskId: "t-9",
        status: "in_progress",
        priority: "medium",
        notes: "",
        updatedAt: "2026-10-02T00:00:00.000Z",
      },
    };
    writeTaskOverrides(next);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(next));
  });

  it("is a no-op on the server (no window)", () => {
    expect(() =>
      writeTaskOverrides({ "t-1": { taskId: "t-1", status: "todo", priority: "low", notes: "", updatedAt: "" } }),
    ).not.toThrow();
  });

  it("swallows storage errors (does not throw)", () => {
    const brokenStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    (globalThis as { window?: unknown }).window = { localStorage: brokenStorage };
    expect(() => writeTaskOverrides({})).not.toThrow();
  });
});

describe("setTaskOverride", () => {
  it("writes a single entry and returns the merged map", () => {
    const storage = stubStorage();
    const override: TaskOverride = {
      taskId: "t-a",
      status: "done",
      priority: "high",
      notes: "shipped",
      updatedAt: "2026-10-03T00:00:00.000Z",
    };
    const next = setTaskOverride(override);
    expect(next).toEqual({ "t-a": override });
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ "t-a": override }));
  });

  it("merges into existing entries without dropping siblings", () => {
    stubStorage(
      JSON.stringify({
        "t-1": {
          taskId: "t-1",
          status: "done",
          priority: "high",
          notes: "first",
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      }),
    );
    const override: TaskOverride = {
      taskId: "t-2",
      status: "in_review",
      priority: "medium",
      notes: "second",
      updatedAt: "2026-10-02T00:00:00.000Z",
    };
    const next = setTaskOverride(override);
    expect(Object.keys(next).sort()).toEqual(["t-1", "t-2"]);
    expect(next["t-2"]).toEqual(override);
    expect(next["t-1"]?.notes).toBe("first");
  });

  it("overwrites the entry when the same taskId is set twice", () => {
    stubStorage();
    setTaskOverride({
      taskId: "t-x",
      status: "todo",
      priority: "low",
      notes: "old",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    const next = setTaskOverride({
      taskId: "t-x",
      status: "done",
      priority: "high",
      notes: "new",
      updatedAt: "2026-10-02T00:00:00.000Z",
    });
    expect(next["t-x"]?.notes).toBe("new");
    expect(next["t-x"]?.status).toBe("done");
    expect(Object.keys(next)).toEqual(["t-x"]);
  });
});

describe("clearTaskOverride", () => {
  it("removes the entry and persists the rest", () => {
    stubStorage(
      JSON.stringify({
        a: {
          taskId: "a",
          status: "todo",
          priority: "low",
          notes: "",
          updatedAt: "",
        },
        b: {
          taskId: "b",
          status: "in_progress",
          priority: "medium",
          notes: "keep",
          updatedAt: "",
        },
      }),
    );
    const next = clearTaskOverride("a");
    expect(Object.keys(next)).toEqual(["b"]);
    expect(next.b?.notes).toBe("keep");
  });

  it("is a no-op when the taskId is absent", () => {
    stubStorage(
      JSON.stringify({
        a: {
          taskId: "a",
          status: "todo",
          priority: "low",
          notes: "stay",
          updatedAt: "",
        },
      }),
    );
    const next = clearTaskOverride("z");
    expect(Object.keys(next)).toEqual(["a"]);
    expect(next.a?.notes).toBe("stay");
  });

  it("returns an empty map when clearing the last entry", () => {
    stubStorage(
      JSON.stringify({
        only: {
          taskId: "only",
          status: "done",
          priority: "high",
          notes: "",
          updatedAt: "",
        },
      }),
    );
    const next = clearTaskOverride("only");
    expect(next).toEqual({});
  });
});