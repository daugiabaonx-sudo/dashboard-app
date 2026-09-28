// tests/unit/db/projects.test.ts
// Unit tests for lib/db/projects.ts — covers list/get/create/update/delete + revalidatePath side effects.

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
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/db/projects";
import {
  makeQueryChain,
  stubSupabase,
  type QueryChain,
} from "../_helpers/query-chain";

const baseProjectRow = {
  id: "p1",
  workspace_id: "ws_1",
  name: "Q3 Launch",
  description: "Major release",
  status: "active",
  priority: "high",
  owner_id: "a1b2c3d4-e5f6-7890-abcd-000000000001",
  member_ids: [
    "a1b2c3d4-e5f6-7890-abcd-000000000001",
    "a1b2c3d4-e5f6-7890-abcd-000000000002",
  ],
  start_date: "2026-01-01",
  due_date: "2026-03-31",
  progress: 42,
  budget: 100000,
  spent: 30000,
  tags: ["launch", "q3"],
};

const validInput = {
  name: "Q3 Launch",
  description: "Major release",
  status: "active" as const,
  priority: "high" as const,
  ownerId: "a1b2c3d4-e5f6-7890-abcd-000000000001",
  memberIds: [
    "a1b2c3d4-e5f6-7890-abcd-000000000001",
    "a1b2c3d4-e5f6-7890-abcd-000000000002",
  ],
  startDate: "2026-01-01",
  dueDate: "2026-03-31",
  budget: 100000,
  tags: ["launch", "q3"],
};

describe("projects", () => {
  let chain: QueryChain;

  beforeEach(() => {
    chain = makeQueryChain();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      stubSupabase(chain) as never,
    );
    vi.mocked(revalidatePath).mockClear();
  });

  describe("listProjects", () => {
    it("selects * from projects ordered by due_date ascending", async () => {
      chain.__setResult({ data: [], error: null });
      await listProjects();
      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.order).toHaveBeenCalledWith("due_date", { ascending: true });
    });

    it("maps each row snake_case → camelCase Project", async () => {
      chain.__setResult({ data: [baseProjectRow], error: null });
      const [project] = await listProjects();
      expect(project).toEqual({
        id: "p1",
        name: "Q3 Launch",
        description: "Major release",
        status: "active",
        priority: "high",
        ownerId: "a1b2c3d4-e5f6-7890-abcd-000000000001",
        memberIds: [
          "a1b2c3d4-e5f6-7890-abcd-000000000001",
          "a1b2c3d4-e5f6-7890-abcd-000000000002",
        ],
        startDate: "2026-01-01",
        dueDate: "2026-03-31",
        progress: 42,
        budget: 100000,
        spent: 30000,
        tags: ["launch", "q3"],
      });
    });

    it("returns an empty array when data is null", async () => {
      chain.__setResult({ data: null, error: null });
      const projects = await listProjects();
      expect(projects).toEqual([]);
    });

    it("throws listProjects-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(listProjects()).rejects.toThrow("listProjects: rls");
    });
  });

  describe("getProject", () => {
    it("queries by id with eq", async () => {
      chain.__setResult({ data: [], error: null });
      await getProject("p1");
      expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    });

    it("returns the mapped Project when found", async () => {
      chain.__setResult({ data: [baseProjectRow], error: null });
      const project = await getProject("p1");
      expect(project?.id).toBe("p1");
      expect(project?.tags).toEqual(["launch", "q3"]);
    });

    it("returns null when no row matches", async () => {
      chain.__setResult({ data: [], error: null });
      const project = await getProject("missing");
      expect(project).toBeNull();
    });

    it("throws getProject-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(getProject("p1")).rejects.toThrow("getProject: rls");
    });
  });

  describe("createProject", () => {
    it("inserts with snake_case columns and revalidates /projects", async () => {
      chain.__setResult({ data: [baseProjectRow], error: null });
      const project = await createProject("ws_1", validInput);

      expect(chain.insert).toHaveBeenCalledWith({
        workspace_id: "ws_1",
        name: "Q3 Launch",
        description: "Major release",
        status: "active",
        priority: "high",
        owner_id: "a1b2c3d4-e5f6-7890-abcd-000000000001",
        member_ids: [
          "a1b2c3d4-e5f6-7890-abcd-000000000001",
          "a1b2c3d4-e5f6-7890-abcd-000000000002",
        ],
        start_date: "2026-01-01",
        due_date: "2026-03-31",
        budget: 100000,
        tags: ["launch", "q3"],
      });
      expect(revalidatePath).toHaveBeenCalledWith("/projects");
      expect(project.id).toBe("p1");
    });

    it("throws createProject-prefixed error when the insert errors", async () => {
      chain.__setResult({ data: null, error: { message: "duplicate" } });
      await expect(createProject("ws_1", validInput)).rejects.toThrow(
        "createProject: duplicate",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("throws 'no row returned' when the insert returns an empty array", async () => {
      chain.__setResult({ data: [], error: null });
      await expect(createProject("ws_1", validInput)).rejects.toThrow(
        "createProject: no row returned",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("propagates ZodError when input is invalid", async () => {
      await expect(
        createProject("ws_1", { ...validInput, budget: -1 }),
      ).rejects.toThrow();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });
  });

  describe("updateProject", () => {
    it("updates with the full snake_case column set and revalidates /projects + /projects/[id]", async () => {
      chain.__setResult({ data: [baseProjectRow], error: null });
      await updateProject("p1", validInput);

      expect(chain.update).toHaveBeenCalledWith({
        name: "Q3 Launch",
        description: "Major release",
        status: "active",
        priority: "high",
        owner_id: "a1b2c3d4-e5f6-7890-abcd-000000000001",
        member_ids: [
          "a1b2c3d4-e5f6-7890-abcd-000000000001",
          "a1b2c3d4-e5f6-7890-abcd-000000000002",
        ],
        start_date: "2026-01-01",
        due_date: "2026-03-31",
        budget: 100000,
        tags: ["launch", "q3"],
      });
      expect(chain.eq).toHaveBeenCalledWith("id", "p1");
      expect(revalidatePath).toHaveBeenCalledWith("/projects/p1");
      expect(revalidatePath).toHaveBeenCalledWith("/projects");
    });

    it("only forwards supplied fields — partial PATCH does not overwrite columns with create-schema defaults", async () => {
      chain.__setResult({ data: [baseProjectRow], error: null });
      await updateProject("p1", { name: "Renamed" });

      const passed = vi.mocked(chain.update).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(passed).toEqual({ name: "Renamed" });
      // Every other writable column must be absent — sending defaults back
      // through Supabase would clobber real existing row values.
      expect("description" in passed).toBe(false);
      expect("status" in passed).toBe(false);
      expect("priority" in passed).toBe(false);
      expect("owner_id" in passed).toBe(false);
      expect("member_ids" in passed).toBe(false);
      expect("start_date" in passed).toBe(false);
      expect("due_date" in passed).toBe(false);
      expect("budget" in passed).toBe(false);
      expect("tags" in passed).toBe(false);
      expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    });

    it("forwards a multi-field sparse PATCH with snake_case mapping", async () => {
      chain.__setResult({ data: [baseProjectRow], error: null });
      await updateProject("p1", {
        priority: "critical",
        dueDate: "2026-06-30",
      });

      const passed = vi.mocked(chain.update).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(passed).toEqual({
        priority: "critical",
        due_date: "2026-06-30",
      });
      expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    });

    it("throws updateProject-prefixed error when the update errors", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(updateProject("p1", validInput)).rejects.toThrow(
        "updateProject: rls",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("throws 'no row returned' when the update returns an empty array", async () => {
      chain.__setResult({ data: [], error: null });
      await expect(updateProject("p1", validInput)).rejects.toThrow(
        "updateProject: no row returned",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("propagates ZodError when input is invalid", async () => {
      await expect(
        updateProject("p1", { ...validInput, dueDate: "not-a-date" }),
      ).rejects.toThrow();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });
  });

  describe("deleteProject", () => {
    it("deletes by id and revalidates /projects", async () => {
      chain.__setResult({ data: null, error: null });
      await deleteProject("p1");

      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith("id", "p1");
      expect(revalidatePath).toHaveBeenCalledWith("/projects");
    });

    it("throws deleteProject-prefixed error when the delete errors", async () => {
      chain.__setResult({ data: null, error: { message: "fk violation" } });
      await expect(deleteProject("p1")).rejects.toThrow(
        "deleteProject: fk violation",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
