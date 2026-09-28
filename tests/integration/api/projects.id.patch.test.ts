// tests/integration/api/projects.id.patch.test.ts
// Integration tests for PATCH /api/projects/[id].
// Mirrors the validation/error-response shape established by
// `app/api/tasks/[id]/status/route.ts`. Cases below cover every meaningful
// branch of `updateProjectSchema = createProjectSchema.partial()`.
//
// Note: `updateProject` (lib/db/projects.ts) currently sends every column
// whose parsed value is `undefined` along to Supabase as part of `.update({...})`.
// That predates this test and is a follow-up concern — these tests assert
// current behaviour, not desired PATCH semantics.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentWorkspaceId: vi.fn(),
}));
vi.mock("@/lib/db/projects", () => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { updateProject } from "@/lib/db/projects";
import { PATCH } from "@/app/api/projects/[id]/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const PATCHHandler = PATCH as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

const PROJECT_ID = "p1";

function throwNextRedirect(): Promise<never> {
  const err = new Error("redirect") as Error & { digest?: string };
  err.digest = "NEXT_REDIRECT;replace;/login;307";
  throw err;
}

describe("PATCH /api/projects/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(updateProject).mockReset();
  });

  it("returns 401 when requireUser throws (no session)", async () => {
    vi.mocked(requireUser).mockImplementation(throwNextRedirect);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { name: "Renamed" },
    });
    expect(response.status).toBe(401);
    expect(response.redirected).toBe(true);
    expect(response.location).toBe("/login");
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("returns 200 + updated project on a minimal partial body", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateProject).mockResolvedValue({
      id: PROJECT_ID,
      name: "Renamed",
    } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { name: "Renamed" },
    });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ id: PROJECT_ID, name: "Renamed" });
    // updateProjectSchema.partial() preserves create-schema defaults, so the
    // payload includes defaulted fields alongside the supplied `name`. Assert
    // on the supplied-key presence rather than full equality.
    expect(updateProject).toHaveBeenCalledTimes(1);
    const [, payload] = vi.mocked(updateProject).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.name).toBe("Renamed");
  });

  it("returns 200 + passes multiple partial fields through (snake-case path)", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateProject).mockResolvedValue({ id: PROJECT_ID } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: {
        name: "Phase F",
        status: "active",
        priority: "critical",
        startDate: "2026-04-01",
        dueDate: "2026-06-30",
      },
    });
    expect(response.status).toBe(200);
    const [, payload] = vi.mocked(updateProject).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.name).toBe("Phase F");
    expect(payload.status).toBe("active");
    expect(payload.priority).toBe("critical");
    expect(payload.startDate).toBe("2026-04-01");
    expect(payload.dueDate).toBe("2026-06-30");
  });

  it("returns 200 on empty body — updateProjectSchema is .partial() so {} parses", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateProject).mockResolvedValue({ id: PROJECT_ID } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: {},
    });
    expect(response.status).toBe(200);
    // Empty body → parsed.data has no supplied keys. Defaults may fill some
    // (description="", status="planning", priority="medium", etc) but the
    // handler still forwards the parsed object to updateProject. Just assert
    // the call happened.
    expect(updateProject).toHaveBeenCalledTimes(1);
  });

  it("returns 400 on invalid JSON body", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      headers: { "content-type": "application/json" },
      body: "nope{",
    });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "Invalid JSON" });
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod issues on invalid status enum", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { status: "launched" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod issues on invalid priority enum", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { priority: "blocker" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 with Zod issues on invalid ISO date", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { startDate: "2026/04/01" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 with Zod issues on invalid ownerId UUID", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { ownerId: "not-a-uuid" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 with Zod issues on empty name (min(1))", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { name: "" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 with Zod issues on negative budget (min(0))", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { budget: -1 },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 500 when updateProject throws", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateProject).mockRejectedValue(new Error("updateProject: rls blocked"));

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { name: "X" },
    });
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "updateProject: rls blocked" });
  });

  it("returns 500 with no-row-returned message when db returns empty array", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateProject).mockRejectedValue(
      new Error("updateProject: no row returned"),
    );

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: PROJECT_ID },
      body: { name: "X" },
    });
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "updateProject: no row returned" });
  });
});
