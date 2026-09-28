// tests/integration/api/notifications.test.ts
// Integration tests for GET + PATCH /api/notifications.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));
vi.mock("@/lib/db/notifications", () => ({
  listNotifications: vi.fn(),
  markAllRead: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { listNotifications, markAllRead } from "@/lib/db/notifications";
import { GET, PATCH } from "@/app/api/notifications/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const GETHandler = GET as unknown as RouteHandlerFn;
const PATCHHandler = PATCH as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "u_session_42",
  email: "bob@example.com",
  fullName: "Bob",
};

describe("/api/notifications", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(listNotifications).mockReset();
    vi.mocked(markAllRead).mockReset();
  });

  describe("GET", () => {
    it("returns 200 + filtered notifications for the current user", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(listNotifications).mockResolvedValue([
        { id: "n1", title: "Heads up" },
      ] as never);

      const response = await callRoute(GETHandler);
      expect(response.status).toBe(200);
      expect(response.json).toEqual([{ id: "n1", title: "Heads up" }]);
      expect(listNotifications).toHaveBeenCalledWith("u_session_42");
    });

    it("returns 500 when listNotifications throws", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(listNotifications).mockRejectedValue(new Error("boom"));

      const response = await callRoute(GETHandler);
      expect(response.status).toBe(500);
      expect(response.json).toEqual({ error: "boom" });
    });
  });

  describe("PATCH", () => {
    it("returns 200 + {ok: true} after markAllRead", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(markAllRead).mockResolvedValue(undefined);

      const response = await callRoute(PATCHHandler, { method: "PATCH" });
      expect(response.status).toBe(200);
      expect(response.json).toEqual({ ok: true });
      expect(markAllRead).toHaveBeenCalledWith("u_session_42");
    });

    it("returns 500 when markAllRead throws", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(markAllRead).mockRejectedValue(new Error("permission denied"));

      const response = await callRoute(PATCHHandler, { method: "PATCH" });
      expect(response.status).toBe(500);
      expect(response.json).toEqual({ error: "permission denied" });
    });
  });
});
