// tests/unit/supabase/mock.test.ts
// Unit tests for lib/supabase/mock.ts pub/sub: MockFrom insert/update/delete
// broadcast postgres_changes-shaped payloads to subscribers registered via
// .channel().on().subscribe(). The subscription contract mirrors what
// `components/realtime/subscriptions.tsx` expects — channel-name prefix
// routes to a table, `event: "*"` matches every event type, and the optional
// `filter` (`column=eq.value`) narrows by row.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockClient } from "@/lib/supabase/mock";

type Payload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  new: Record<string, unknown> | undefined;
  old: Record<string, unknown> | undefined;
};

beforeEach(() => {
  // Reset every active channel between tests so subscriber state never leaks.
  void mockClient.removeChannel({
    name: "tasks:test",
    unsubscribe: () => {},
  } as never);
  void mockClient.removeChannel({
    name: "activity:test",
    unsubscribe: () => {},
  } as never);
  void mockClient.removeChannel({
    name: "notifications:test",
    unsubscribe: () => {},
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mockClient pub/sub", () => {
  it("broadcasts INSERT to subscribers on the matching table", async () => {
    const handler = vi.fn();
    mockClient
      .channel("tasks:test")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        handler,
      )
      .subscribe();

    const q = mockClient.from("tasks") as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: () => Promise<{ data: unknown[] | null }>;
      };
    };
    await q.insert({ id: "new-task", workspace_id: "ws_1" }).select();

    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0]![0] as Payload;
    expect(payload).toMatchObject({
      eventType: "INSERT",
      schema: "public",
      table: "tasks",
    });
    expect(payload.new?.id).toBe("new-task");
    expect(payload.old).toBeUndefined();
  });

  it("broadcasts UPDATE with both new and old rows", async () => {
    const handler = vi.fn();
    mockClient
      .channel("tasks:test")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        handler,
      )
      .subscribe();

    const q = mockClient.from("tasks") as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => {
          select: () => Promise<{ data: unknown[] | null }>;
        };
      };
    };
    await q.update({ status: "done" }).eq("id", "new-task").select();

    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0]![0] as Payload;
    expect(payload.eventType).toBe("UPDATE");
    expect(payload.table).toBe("tasks");
    expect(payload.new?.status).toBe("done");
    expect(payload.old?.id).toBe("new-task");
    expect(payload.old?.status).not.toBe("done");
  });

  it("broadcasts DELETE with old populated and new undefined", async () => {
    const handler = vi.fn();
    mockClient
      .channel("tasks:test")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        handler,
      )
      .subscribe();

    const q = mockClient.from("tasks") as unknown as {
      delete: () => {
        eq: (col: string, val: unknown) => Promise<{ error: null }>;
      };
    };
    await q.delete().eq("id", "new-task");

    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0]![0] as Payload;
    expect(payload).toMatchObject({
      eventType: "DELETE",
      schema: "public",
      table: "tasks",
    });
    expect(payload.old?.id).toBe("new-task");
    expect(payload.new).toBeUndefined();
  });

  it("routes channel-name prefix to the right table (activity → activity_log)", () => {
    const handler = vi.fn();
    mockClient
      .channel("activity:test")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_log" },
        handler,
      )
      .subscribe();

    const q = mockClient.from("activity_log") as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: () => Promise<{ data: unknown[] | null }>;
      };
    };
    return q
      .insert({ id: "a1", workspace_id: "ws_1" })
      .select()
      .then(() => {
        expect(handler).toHaveBeenCalledTimes(1);
        expect((handler.mock.calls[0]![0] as Payload).table).toBe(
          "activity_log",
        );
      });
  });

  it("filters by event type — INSERT subscriber does not receive UPDATE", async () => {
    const insertHandler = vi.fn();
    mockClient
      .channel("tasks:test")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        insertHandler,
      )
      .subscribe();

    const q = mockClient.from("tasks") as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => {
          select: () => Promise<{ data: unknown[] | null }>;
        };
      };
    };
    await q.update({ title: "renamed" }).eq("id", "new-task").select();

    expect(insertHandler).not.toHaveBeenCalled();
  });

  it("applies filter (user_id=eq.<uuid>) — only matching rows reach the handler", async () => {
    const userA = "00000000-0000-0000-0000-000000000001";
    const userB = "00000000-0000-0000-0000-000000000002";
    const handler = vi.fn();
    mockClient
      .channel("notifications:test")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userA}`,
        },
        handler,
      )
      .subscribe();

    const q = mockClient.from("notifications") as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: () => Promise<{ data: unknown[] | null }>;
      };
    };
    await q.insert({ id: "n-a", user_id: userA }).select();
    await q.insert({ id: "n-b", user_id: userB }).select();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(
      (handler.mock.calls[0]![0] as Payload).new?.id,
    ).toBe("n-a");
  });

  it("stops delivering after unsubscribe", async () => {
    const handler = vi.fn();
    const channel = mockClient
      .channel("tasks:test")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        handler,
      )
      .subscribe();

    const q = mockClient.from("tasks") as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: () => Promise<{ data: unknown[] | null }>;
      };
    };
    await q.insert({ id: "before-unsub", workspace_id: "ws_1" }).select();
    expect(handler).toHaveBeenCalledTimes(1);

    void mockClient.removeChannel(channel);

    await q.insert({ id: "after-unsub", workspace_id: "ws_1" }).select();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not leak handlers across channels — different channel names isolate subscriptions", () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    mockClient
      .channel("tasks:a")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        handlerA,
      )
      .subscribe();
    mockClient
      .channel("tasks:b")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        handlerB,
      )
      .subscribe();

    const q = mockClient.from("tasks") as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: () => Promise<{ data: unknown[] | null }>;
      };
    };
    return q
      .insert({ id: "broadcast-both", workspace_id: "ws_1" })
      .select()
      .then(() => {
        expect(handlerA).toHaveBeenCalledTimes(1);
        expect(handlerB).toHaveBeenCalledTimes(1);
      });
  });
});
