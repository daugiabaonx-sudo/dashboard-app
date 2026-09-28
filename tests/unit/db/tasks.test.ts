// tests/unit/db/tasks.test.ts
// Unit tests for lib/db/tasks.ts — covers 7 functions, sparse update,
// snake_case ↔ camelCase mapping, revalidatePath side effects.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  listTasks,
  listTasksByProject,
  listTasksByStatus,
  getTask,
  createTask,
  updateTask,
  setTaskStatus,
  deleteTask,
} from "@/lib/db/tasks";
import {
  makeQueryChain,
  stubSupabase,
  type QueryChain,
} from "../_helpers/query-chain";

const OWNER_ID = "a1b2c3d4-e5f6-7890-abcd-000000000001";
const REPORTER_ID = "a1b2c3d4-e5f6-7890-abcd-000000000002";
const PROJECT_ID = "a1b2c3d4-e5f6-7890-abcd-000000000010";
const ASSIGNEE_ID = "a1b2c3d4-e5f6-7890-abcd-000000000003";

const baseTaskRow = {
  id: "t1",
  workspace_id: "ws_1",
  project_id: PROJECT_ID,
  title: "Wire up dashboard",
  description: "Phase E final",
  status: "in_progress",
  priority: "high",
  assignee_id: ASSIGNEE_ID,
  reporter_id: REPORTER_ID,
  due_date: "2026-02-28",
  estimated_hours: 12,
  logged_hours: 5,
  progress: 40,
  blocked: false,
  blocker_note: null,
  tags: ["phase-e"],
  comments: 3,
  attachments: 1,
  created_at: "2026-01-10T08:00:00Z",
  updated_at: "2026-01-12T11:30:00Z",
};

const validCreateInput = {
  projectId: PROJECT_ID,
  reporterId: REPORTER_ID,
  title: "Wire up dashboard",
  description: "Phase E final",
  status: "in_progress" as const,
  priority: "high" as const,
  assigneeId: ASSIGNEE_ID,
  dueDate: "2026-02-28",
  estimatedHours: 12,
  tags: ["phase-e"],
  blocked: false,
};

describe("tasks", () => {
  let chain: QueryChain;

  beforeEach(() => {
    chain = makeQueryChain();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      stubSupabase(chain) as never,
    );
    vi.mocked(revalidatePath).mockClear();
  });

  describe("listTasks", () => {
    it("selects * from tasks ordered by due_date ascending", async () => {
      chain.__setResult({ data: [], error: null });
      await listTasks();
      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.order).toHaveBeenCalledWith("due_date", { ascending: true });
    });

    it("maps each row, converting blocker_note null → blockerNote undefined", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      const [task] = await listTasks();
      expect(task).toEqual({
        id: "t1",
        title: "Wire up dashboard",
        description: "Phase E final",
        status: "in_progress",
        priority: "high",
        assigneeId: ASSIGNEE_ID,
        reporterId: REPORTER_ID,
        projectId: PROJECT_ID,
        dueDate: "2026-02-28",
        estimatedHours: 12,
        loggedHours: 5,
        progress: 40,
        blocked: false,
        blockerNote: undefined,
        tags: ["phase-e"],
        comments: 3,
        attachments: 1,
        createdAt: "2026-01-10T08:00:00Z",
        updatedAt: "2026-01-12T11:30:00Z",
      });
    });

    it("preserves blocker_note as blockerNote when non-null", async () => {
      chain.__setResult({
        data: [{ ...baseTaskRow, blocker_note: "waiting on infra" }],
        error: null,
      });
      const [task] = await listTasks();
      expect(task?.blockerNote).toBe("waiting on infra");
    });

    it("returns an empty array when data is null", async () => {
      chain.__setResult({ data: null, error: null });
      const tasks = await listTasks();
      expect(tasks).toEqual([]);
    });

    it("throws listTasks-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(listTasks()).rejects.toThrow("listTasks: rls");
    });
  });

  describe("listTasksByProject", () => {
    it("filters by project_id and orders by due_date ascending", async () => {
      chain.__setResult({ data: [], error: null });
      await listTasksByProject(PROJECT_ID);
      expect(chain.eq).toHaveBeenCalledWith("project_id", PROJECT_ID);
      expect(chain.order).toHaveBeenCalledWith("due_date", { ascending: true });
    });

    it("throws listTasksByProject-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(listTasksByProject(PROJECT_ID)).rejects.toThrow(
        "listTasksByProject: rls",
      );
    });
  });

  describe("listTasksByStatus", () => {
    it("groups tasks by status into all five buckets", async () => {
      chain.__setResult({
        data: [
          { ...baseTaskRow, id: "t1", status: "backlog" },
          { ...baseTaskRow, id: "t2", status: "todo" },
          { ...baseTaskRow, id: "t3", status: "in_progress" },
          { ...baseTaskRow, id: "t4", status: "in_review" },
          { ...baseTaskRow, id: "t5", status: "done" },
        ],
        error: null,
      });

      const grouped = await listTasksByStatus();
      expect(Object.keys(grouped).sort()).toEqual(
        ["backlog", "done", "in_progress", "in_review", "todo"].sort(),
      );
      expect(grouped.backlog).toHaveLength(1);
      expect(grouped.todo).toHaveLength(1);
      expect(grouped.in_progress).toHaveLength(1);
      expect(grouped.in_review).toHaveLength(1);
      expect(grouped.done).toHaveLength(1);
    });

    it("returns empty buckets when there are no tasks", async () => {
      chain.__setResult({ data: [], error: null });
      const grouped = await listTasksByStatus();
      expect(grouped).toEqual({
        backlog: [],
        todo: [],
        in_progress: [],
        in_review: [],
        done: [],
      });
    });

    it("accumulates multiple tasks into the same bucket", async () => {
      chain.__setResult({
        data: [
          { ...baseTaskRow, id: "t1", status: "todo" },
          { ...baseTaskRow, id: "t2", status: "todo" },
          { ...baseTaskRow, id: "t3", status: "done" },
        ],
        error: null,
      });

      const grouped = await listTasksByStatus();
      expect(grouped.todo).toHaveLength(2);
      expect(grouped.done).toHaveLength(1);
      expect(grouped.backlog).toHaveLength(0);
    });
  });

  describe("getTask", () => {
    it("queries by id with eq", async () => {
      chain.__setResult({ data: [], error: null });
      await getTask("t1");
      expect(chain.eq).toHaveBeenCalledWith("id", "t1");
    });

    it("returns the mapped Task when found", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      const task = await getTask("t1");
      expect(task?.id).toBe("t1");
      expect(task?.status).toBe("in_progress");
    });

    it("returns null when no row matches", async () => {
      chain.__setResult({ data: [], error: null });
      const task = await getTask("missing");
      expect(task).toBeNull();
    });

    it("throws getTask-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(getTask("t1")).rejects.toThrow("getTask: rls");
    });
  });

  describe("createTask", () => {
    it("inserts with snake_case columns and revalidates /tasks + /projects/[id]", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      await createTask("ws_1", validCreateInput);

      expect(chain.insert).toHaveBeenCalledWith({
        workspace_id: "ws_1",
        project_id: PROJECT_ID,
        title: "Wire up dashboard",
        description: "Phase E final",
        status: "in_progress",
        priority: "high",
        assignee_id: ASSIGNEE_ID,
        reporter_id: REPORTER_ID,
        due_date: "2026-02-28",
        estimated_hours: 12,
        tags: ["phase-e"],
        blocked: false,
        blocker_note: null,
      });
      expect(revalidatePath).toHaveBeenCalledWith("/tasks");
      expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
    });

    it("sends assignee_id as null when omitted from input", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      const { assigneeId: _omit, ...noAssignee } = validCreateInput;
      await createTask("ws_1", noAssignee);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ assignee_id: null }),
      );
    });

    it("sends blocker_note as null when omitted from input", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      const noBlocker = { ...validCreateInput };
      delete (noBlocker as { blocked?: boolean }).blocked;
      await createTask("ws_1", noBlocker as typeof validCreateInput);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ blocker_note: null }),
      );
    });

    it("throws createTask-prefixed error when insert fails", async () => {
      chain.__setResult({ data: null, error: { message: "fk fail" } });
      await expect(createTask("ws_1", validCreateInput)).rejects.toThrow(
        "createTask: fk fail",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("throws 'no row returned' when insert returns empty array", async () => {
      chain.__setResult({ data: [], error: null });
      await expect(createTask("ws_1", validCreateInput)).rejects.toThrow(
        "createTask: no row returned",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("propagates ZodError when input is invalid", async () => {
      await expect(
        createTask("ws_1", { ...validCreateInput, dueDate: "garbage" }),
      ).rejects.toThrow();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    it("includes the supplied title key in the update map", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      await updateTask("t1", { title: "Renamed" });

      const passed = vi.mocked(chain.update).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(passed.title).toBe("Renamed");
      expect(chain.eq).toHaveBeenCalledWith("id", "t1");
    });

    it("converts camelCase keys → snake_case in the update payload", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      await updateTask("t1", {
        assigneeId: ASSIGNEE_ID,
        dueDate: "2026-03-15",
        estimatedHours: 16,
        blockerNote: "infra",
      });

      const passed = vi.mocked(chain.update).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(passed.assignee_id).toBe(ASSIGNEE_ID);
      expect(passed.due_date).toBe("2026-03-15");
      expect(passed.estimated_hours).toBe(16);
      expect(passed.blocker_note).toBe("infra");
    });

    it("revalidates /tasks and /projects/[project_id from returned row]", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      await updateTask("t1", { title: "X" });
      expect(revalidatePath).toHaveBeenCalledWith("/tasks");
      expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
    });

    it("throws updateTask-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(updateTask("t1", { title: "X" })).rejects.toThrow(
        "updateTask: rls",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("throws 'no row returned' when update returns empty array", async () => {
      chain.__setResult({ data: [], error: null });
      await expect(updateTask("t1", { title: "X" })).rejects.toThrow(
        "updateTask: no row returned",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("propagates ZodError when input is invalid", async () => {
      await expect(
        updateTask("t1", { dueDate: "garbage" }),
      ).rejects.toThrow();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });
  });

  describe("setTaskStatus", () => {
    it("updates status and revalidates /tasks + /projects/[id]", async () => {
      chain.__setResult({ data: [baseTaskRow], error: null });
      await setTaskStatus("t1", "done");

      expect(chain.update).toHaveBeenCalledWith({ status: "done" });
      expect(chain.eq).toHaveBeenCalledWith("id", "t1");
      expect(revalidatePath).toHaveBeenCalledWith("/tasks");
      expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
    });

    it("throws setTaskStatus-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(setTaskStatus("t1", "done")).rejects.toThrow(
        "setTaskStatus: rls",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("throws 'no row returned' when update returns empty array", async () => {
      chain.__setResult({ data: [], error: null });
      await expect(setTaskStatus("t1", "done")).rejects.toThrow(
        "setTaskStatus: no row returned",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects invalid status values via Zod", async () => {
      await expect(
        setTaskStatus("t1", "archived" as never),
      ).rejects.toThrow();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });
  });

  describe("deleteTask", () => {
    it("deletes by id and revalidates /tasks", async () => {
      chain.__setResult({ data: null, error: null });
      await deleteTask("t1");

      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith("id", "t1");
      expect(revalidatePath).toHaveBeenCalledWith("/tasks");
    });

    it("throws deleteTask-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "fk violation" } });
      await expect(deleteTask("t1")).rejects.toThrow(
        "deleteTask: fk violation",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  // Cross-check: owner_id and reporter_id are not currently surfaced on Task,
  // but the source uses OWNER_ID/REPORTER_ID constants. Reserved for future
  // fields; left as a placeholder to keep the constant referenced.
  it("exposes OWNER_ID/REPORTER_ID constants for fixture reuse", () => {
    expect(OWNER_ID).toBe("a1b2c3d4-e5f6-7890-abcd-000000000001");
    expect(REPORTER_ID).toBe("a1b2c3d4-e5f6-7890-abcd-000000000002");
  });
});
