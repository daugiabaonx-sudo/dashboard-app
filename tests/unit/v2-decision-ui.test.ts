// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { V2_MARKUP } from "@/components/v2/v2-markup";
import { mountV2 } from "@/components/v2/v2-engine";
import type { V2Model } from "@/lib/v2/v2-model";
import type { DecisionRequest } from "@/lib/types";
import type { V2DecisionMember } from "@/lib/v2/v2-decisions";

const NOW = new Date("2026-10-20T12:00:00.000Z");

const MEMBERS: V2DecisionMember[] = [
  { id: "u-mgr", name: "Bao Dau", initials: "BD", role: "owner", roleLabel: "Owner" },
  { id: "u-emp", name: "Hanh Nguyen", initials: "HN", role: "member", roleLabel: "Thành viên" },
];

const MODEL: V2Model = {
  tasks: [
    {
      id: "T-001",
      pid: "p-1",
      title: "Làm luồng cho các team",
      owner: "Hanh Nguyen",
      team: "1 - Company",
      project: "Sunext Manage Task",
      start: "2026-10-15",
      deadline: "2026-10-21",
      risk: "high",
      status: "working",
      progress: 50,
      createdAt: "2026-10-15",
    },
    {
      id: "T-002",
      pid: "p-2",
      title: "Update skill research",
      owner: "Bao Dau",
      team: "1 - Company",
      project: "Sunext Manage Task",
      start: "2026-10-10",
      deadline: "2026-10-18",
      risk: "high",
      status: "working",
      progress: 50,
      createdAt: "2026-10-10",
    },
  ],
  projects: [
    {
      name: "Sunext Manage Task",
      deadline: "2026-10-25",
      progress: 50,
      done: 0,
      total: 2,
      health: "atRisk",
      group: "1 - Company",
    },
  ],
  blockers: [],
  notifications: [],
  teams: ["1 - Company"],
};

const OPEN_REQ: DecisionRequest = {
  id: "dr-1",
  workspaceId: "ws-1",
  plannerTaskId: "p-1",
  taskTitle: "Làm luồng cho các team",
  projectName: "Sunext Manage Task",
  type: "decision",
  need: "Cần duyệt phương án luồng <script>alert(1)</script>",
  raisedBy: "u-emp",
  unblockerId: "u-mgr",
  neededBy: "2026-10-21",
  status: "open",
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: "2026-10-19T06:00:00.000Z", // 30h ago -> warn
  updatedAt: "2026-10-19T06:00:00.000Z",
};

describe("V2 Blocker & Decision human-raised UI integration", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("renders role-aware tabs, wait-age badge, escapes XSS in need, and supports raising & resolving blockers", async () => {
    const host = document.createElement("div");
    host.innerHTML = V2_MARKUP;
    document.body.appendChild(host);

    const raiseBlocker = vi.fn().mockImplementation(async (input) => ({
      ok: true,
      request: {
        ...OPEN_REQ,
        id: "dr-2",
        plannerTaskId: input.plannerTaskId,
        taskTitle: input.taskTitle,
        projectName: input.projectName,
        type: input.type,
        need: input.need,
        unblockerId: input.unblockerId,
        neededBy: input.neededBy,
        createdAt: NOW.toISOString(),
      },
      plannerSynced: true,
    }));

    const resolveDecision = vi.fn().mockImplementation(async (id, input) => ({
      ok: true,
      request: {
        ...OPEN_REQ,
        id,
        status: input.action === "resolve" ? "resolved" : "cancelled",
        resolution: input.resolution,
      },
      plannerSynced: true,
    }));

    const unmount = mountV2(host, {
      model: MODEL,
      profile: { userId: "u-mgr", name: "Bao Dau", initials: "BD", roleLabel: "Owner" },
      canEdit: true,
      canRaise: true,
      decisions: [OPEN_REQ],
      members: MEMBERS,
      view: "overview",
      now: NOW,
      hooks: {
        saveTask: vi.fn().mockResolvedValue({ ok: true, status: "working", progress: 50 }),
        raiseBlocker,
        resolveDecision,
        signOut: vi.fn().mockResolvedValue(undefined),
        navigate: vi.fn(),
      },
    });

    // 1. Overdue task T-002 appears in Attention card (#tBody) but NOT in Blocker card (#bBody)
    expect(host.querySelector("#tBody")?.textContent).toContain("Update skill research");
    expect(host.querySelector("#bHead")?.textContent).toContain("Công việc");
    expect(host.querySelector("#bHead")?.textContent).toContain("Người phụ trách");
    expect(host.querySelector("#bHead")?.textContent).not.toContain("Cần quyết / gỡ gì");
    expect(host.querySelector("#bHead")?.textContent).not.toContain("Đang chờ");
    const mainRowTtl = host.querySelector("#bBody tr.bk-main .ttl")?.textContent ?? "";
    expect(mainRowTtl).toContain("Làm luồng cho các team");
    expect(mainRowTtl).not.toContain("Cần duyệt phương án luồng");
    const detailText = host.querySelector("#bBody tr.bk-detail .box")?.textContent ?? "";
    expect(detailText).toContain("Nội dung vướng / cần quyết:");
    expect(detailText).toContain("Cần duyệt phương án luồng");
    const bBodyText = host.querySelector("#bBody")?.textContent ?? "";
    expect(bBodyText).not.toContain("Update skill research");
    expect(host.querySelector("#bBody")?.innerHTML).not.toContain("<script>");

    // 2. Wait-age badge shows 1d 6h chờ and tabs show counts
    expect(bBodyText).toContain("1d 6h chờ");
    expect(host.querySelector("#blkTabs")?.textContent).toContain("Chờ tôi xử lý");

    // 3. Raise a new blocker via #btnRaiseBlocker
    const raiseBtn = host.querySelector("#btnRaiseBlocker") as HTMLButtonElement;
    expect(raiseBtn).toBeTruthy();
    expect(raiseBtn.hidden).toBe(false);
    raiseBtn.click();
    expect(host.querySelector("#raiseModal")?.classList.contains("open")).toBe(true);

    (host.querySelector("#rbTask") as HTMLSelectElement).value = "p-2";
    (host.querySelector("#rbType") as HTMLSelectElement).value = "waiting_on";
    (host.querySelector("#rbUnblocker") as HTMLSelectElement).value = "u-mgr";
    (host.querySelector("#rbNeed") as HTMLTextAreaElement).value = "Chờ confirm API từ đối tác";
    (host.querySelector("#rbForm") as HTMLFormElement).dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => {
      expect(raiseBlocker).toHaveBeenCalledWith(
        expect.objectContaining({
          plannerTaskId: "p-2",
          type: "waiting_on",
          need: "Chờ confirm API từ đối tác",
        }),
      );
    });
    expect(host.querySelector("#bBody")?.textContent).toContain("Chờ confirm API từ đối tác");

    // 4. Resolve dr-1 via [data-bact="resolve"]
    const resolveBtn = host.querySelector('[data-bact="resolve"][data-bid="dr-1"]') as HTMLButtonElement;
    expect(resolveBtn).toBeTruthy();
    resolveBtn.click();
    expect(host.querySelector("#resolveModal")?.classList.contains("open")).toBe(true);

    (host.querySelector("#rsResolution") as HTMLTextAreaElement).value = "Đã chốt phương án A";
    (host.querySelector("#rsForm") as HTMLFormElement).dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => {
      expect(resolveDecision).toHaveBeenCalledWith("dr-1", {
        action: "resolve",
        resolution: "Đã chốt phương án A",
      });
    });

    unmount();
    host.remove();
  });
});
