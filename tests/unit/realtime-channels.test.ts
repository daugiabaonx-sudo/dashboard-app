// tests/unit/realtime-channels.test.ts
// Channel naming + debounced invalidator for the realtime layer. The
// debouncer collapses bursts into a single invalidation 150ms later;
// call it twice within the window, expect exactly one callback.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  channelNames,
  makeDebouncedInvalidator,
} from "@/lib/realtime/channels";

describe("channelNames", () => {
  it("namespaces channels by resource and id", () => {
    expect(channelNames.tasks("w1")).toBe("tasks:w1");
    expect(channelNames.activity("w1")).toBe("activity:w1");
    expect(channelNames.notifications("u1")).toBe("notifications:u1");
  });

  it("does not collide across workspaces or users", () => {
    expect(channelNames.tasks("a")).not.toBe(channelNames.tasks("b"));
    expect(channelNames.activity("a")).not.toBe(channelNames.notifications("a"));
  });
});

describe("makeDebouncedInvalidator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls invalidate exactly once after the debounce window", () => {
    const qc = new QueryClient();
    const invalidate = vi.fn();
    const fire = makeDebouncedInvalidator(qc, invalidate);

    fire();
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(149);
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("collapses a burst into a single call", () => {
    const qc = new QueryClient();
    const invalidate = vi.fn();
    const fire = makeDebouncedInvalidator(qc, invalidate);

    fire();
    vi.advanceTimersByTime(50);
    fire();
    vi.advanceTimersByTime(50);
    fire();
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("schedules a fresh window after the previous one fires", () => {
    const qc = new QueryClient();
    const invalidate = vi.fn();
    const fire = makeDebouncedInvalidator(qc, invalidate);

    fire();
    vi.advanceTimersByTime(150);
    expect(invalidate).toHaveBeenCalledTimes(1);

    fire();
    vi.advanceTimersByTime(149);
    expect(invalidate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});