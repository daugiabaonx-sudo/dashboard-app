// tests/unit/schemas.test.ts
// Zod schema unit tests. Covers the four contracts the API route
// handlers depend on at the boundary:
//   - signInSchema          (POST /api/auth/sign-in)
//   - createProjectSchema   (POST /api/projects)
//   - createTaskSchema      (POST /api/tasks)
//   - taskStatusUpdateSchema (PATCH /api/tasks/[id]/status)

import { describe, expect, it } from "vitest";
import { signInSchema } from "@/lib/schemas/auth";
import { createProjectSchema } from "@/lib/schemas/project";
import { createTaskSchema, taskStatusUpdateSchema } from "@/lib/schemas/task";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("signInSchema", () => {
  it("accepts a well-formed email and an 8+ char password", () => {
    const parsed = signInSchema.safeParse({
      email: "minhanh@sunext.io",
      password: "test-password-123",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const parsed = signInSchema.safeParse({
      email: "not-an-email",
      password: "longenough-1",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.path.join("."));
      expect(messages).toContain("email");
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    const parsed = signInSchema.safeParse({
      email: "minhanh@sunext.io",
      password: "short",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.path.join("."));
      expect(messages).toContain("password");
    }
  });
});

describe("createProjectSchema", () => {
  const baseProject = {
    ownerId: validUuid,
    startDate: "2026-01-15",
    dueDate: "2026-04-15",
  };

  it("accepts a project with a non-empty name", () => {
    const parsed = createProjectSchema.safeParse({
      ...baseProject,
      name: "Q1 launch",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a project with an empty name", () => {
    const parsed = createProjectSchema.safeParse({
      ...baseProject,
      name: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.path.join("."));
      expect(messages).toContain("name");
    }
  });

  it("rejects a project missing the name field entirely", () => {
    const parsed = createProjectSchema.safeParse({
      ...baseProject,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.path.join("."));
      expect(messages).toContain("name");
    }
  });
});

describe("createTaskSchema", () => {
  const baseTask = {
    title: "Wire up realtime",
    projectId: validUuid,
    reporterId: validUuid,
    dueDate: "2026-02-01",
  };

  it("accepts a task with both projectId and reporterId", () => {
    const parsed = createTaskSchema.safeParse({
      ...baseTask,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a task missing projectId", () => {
    const parsed = createTaskSchema.safeParse({
      ...baseTask,
      projectId: undefined,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.path.join("."));
      expect(messages).toContain("projectId");
    }
  });

  it("rejects a task missing reporterId", () => {
    const parsed = createTaskSchema.safeParse({
      ...baseTask,
      reporterId: undefined,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.path.join("."));
      expect(messages).toContain("reporterId");
    }
  });
});

describe("taskStatusUpdateSchema", () => {
  const validStatuses = [
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
  ] as const;

  it.each(validStatuses)("accepts status=%s", (status) => {
    const parsed = taskStatusUpdateSchema.safeParse({ status });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe(status);
    }
  });

  it("rejects an unknown status", () => {
    const parsed = taskStatusUpdateSchema.safeParse({ status: "archived" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing status field", () => {
    const parsed = taskStatusUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
