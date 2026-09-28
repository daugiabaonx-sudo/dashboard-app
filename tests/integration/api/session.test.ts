// tests/integration/api/session.test.ts
// Integration tests for GET /api/session.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireUser: vi.fn(),
  getCurrentWorkspaceId: vi.fn(),
  getMockSignedInUserId: vi.fn(),
}));

import { getSession } from "@/lib/auth/session";
import { GET } from "@/app/api/session/route";

describe("GET /api/session", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset();
  });

  it("returns 401 when there is no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "unauthenticated" });
  });

  it("returns 200 + the session JSON when authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      email: "alice@example.com",
      fullName: "Alice",
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      userId: "u1",
      email: "alice@example.com",
      fullName: "Alice",
    });
  });
});
