// tests/unit/v2-decisions.test.ts
// Unit tests for pure view-model lib/v2/v2-decisions.ts.

import { describe, expect, it } from "vitest";
import type { DecisionRequest } from "@/lib/types";
import type { V2Task } from "@/lib/v2/v2-model";
import {
  DECISION_TYPE_LABELS,
  buildDecisionRows,
  defaultDecisionTab,
  filterRowsByTab,
  isManagerOrAbove,
  sortUnblockerCandidates,
  tabCounts,
  waitAge,
  type V2DecisionMember,
} from "@/lib/v2/v2-decisions";

const NOW = new Date("2026-10-20T12:00:00.000Z");

const MEMBERS: V2DecisionMember[] = [
  { id: "u-mem", name: "Hanh Nguyen", initials: "HN", role: "member", roleLabel: "Thành viên" },
  { id: "u-mgr", name: "Bao Dau", initials: "BD", role: "owner", roleLabel: "Owner" },
  { id: "u-view", name: "Khach Xem", initials: "KX", role: "viewer", roleLabel: "Người xem" },
];

const TASKS: V2Task[] = [
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
    status: "blocked",
    progress: 50,
  },
  {
    id: "T-002",
    pid: "p-unassigned",
    title: "Việc chưa ai nhận",
    owner: "Chưa giao",
    team: "1 - Company",
    project: "Sunext Manage Task",
    start: "2026-10-18",
    deadline: "2026-10-25",
    risk: "medium",
    status: "todo",
    progress: 0,
  },
];

const REQ_1: DecisionRequest = {
  id: "dr-1",
  workspaceId: "ws-1",
  plannerTaskId: "p-1",
  taskTitle: "Làm luồng cho các team",
  projectName: "Sunext Manage Task",
  type: "decision",
  need: "Cần chốt quy trình duyệt giữa Dev và Marketing",
  raisedBy: "u-mem",
  unblockerId: "u-mgr",
  neededBy: "2026-10-21",
  status: "open",
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: "2026-10-19T06:00:00.000Z", // 30 hours before NOW
  updatedAt: "2026-10-19T06:00:00.000Z",
};

describe("waitAge", () => {
  it("classifies <24h as fresh (with minute precision), 24-48h as warn, and >=48h as stale", () => {
    expect(waitAge("2026-10-20T11:59:30.000Z", NOW)).toEqual({
      hours: 0,
      minutes: 0,
      tone: "fresh",
      label: "Vừa báo",
    });
    expect(waitAge("2026-10-20T11:45:00.000Z", NOW)).toEqual({
      hours: 0,
      minutes: 15,
      tone: "fresh",
      label: "15p chờ",
    });
    expect(waitAge("2026-10-20T10:40:00.000Z", NOW)).toEqual({
      hours: 1,
      minutes: 80,
      tone: "fresh",
      label: "1h 20p chờ",
    });
    expect(waitAge("2026-10-20T06:00:00.000Z", NOW)).toEqual({
      hours: 6,
      minutes: 360,
      tone: "fresh",
      label: "6h chờ",
    });
    expect(waitAge("2026-10-19T06:00:00.000Z", NOW)).toEqual({
      hours: 30,
      minutes: 1800,
      tone: "warn",
      label: "1d 6h chờ",
    });
    expect(waitAge("2026-10-18T12:00:00.000Z", NOW)).toEqual({
      hours: 48,
      minutes: 2880,
      tone: "stale",
      label: "2d chờ",
    });
  });
});

describe("sortUnblockerCandidates", () => {
  it("excludes viewers and orders owner/admin/manager before regular members", () => {
    const sorted = sortUnblockerCandidates(MEMBERS);
    expect(sorted.map((m) => m.id)).toEqual(["u-mgr", "u-mem"]);
  });
});

describe("buildDecisionRows, filterRowsByTab & tabCounts", () => {
  it("combines human-raised requests with unassigned tasks and computes role-aware flags", () => {
    const rowsForMgr = buildDecisionRows({
      requests: [REQ_1],
      tasks: TASKS,
      members: MEMBERS,
      currentUserId: "u-mgr",
      canEdit: true,
      now: NOW,
    });

    expect(rowsForMgr).toHaveLength(2);
    expect(rowsForMgr[0]).toMatchObject({
      id: "dr-1",
      kind: "request",
      taskCode: "T-001",
      typeLabel: DECISION_TYPE_LABELS.decision,
      unblockerName: "Bao Dau",
      raisedByName: "Hanh Nguyen",
      isWaitingOnMe: true,
      isMine: false,
      canResolve: true,
      canCancel: true,
    });
    expect(rowsForMgr[1]).toMatchObject({
      id: "unassigned-p-unassigned",
      kind: "unassigned",
      taskCode: "T-002",
      typeLabel: "Cần phân công",
      isWaitingOnMe: true,
    });

    expect(tabCounts(rowsForMgr)).toEqual({ waiting: 2, mine: 0, team: 2 });
    expect(defaultDecisionTab(rowsForMgr)).toBe("waiting");
    expect(filterRowsByTab(rowsForMgr, "waiting")).toHaveLength(2);
    expect(filterRowsByTab(rowsForMgr, "mine")).toHaveLength(0);
  });

  it("shows raised requests under 'mine' tab for the employee who raised them", () => {
    const rowsForEmp = buildDecisionRows({
      requests: [REQ_1],
      tasks: TASKS,
      members: MEMBERS,
      currentUserId: "u-mem",
      canEdit: false,
      now: NOW,
    });
    expect(tabCounts(rowsForEmp)).toEqual({ waiting: 0, mine: 1, team: 2 });
    expect(defaultDecisionTab(rowsForEmp)).toBe("mine");
    expect(rowsForEmp[0]?.canResolve).toBe(false);
    expect(rowsForEmp[0]?.canCancel).toBe(true);
    expect(filterRowsByTab(rowsForEmp, "team")).toHaveLength(2);
    expect(defaultDecisionTab([])).toBe("team");
    expect(isManagerOrAbove("manager")).toBe(true);
    expect(isManagerOrAbove("member")).toBe(false);

    // When a Planner task is blocked without a DecisionRequest, use its owner as unblockerName
    // and prefer task.notes from Teams Planner as `need`
    const rowsWithoutReq = buildDecisionRows({
      requests: [],
      tasks: [
        { ...TASKS[0]!, notes: "chưa tìm được link" },
        TASKS[1]!,
        {
          id: "T-003",
          pid: "p-blk-unassigned",
          title: "Tes1 des ui",
          owner: "Chưa giao",
          team: "1 - Company",
          project: "Sunext Manage Task",
          start: "2026-10-20",
          createdAt: "2026-10-20",
          createdDateTime: "2026-10-20T11:42:00.000Z",
          deadline: "2026-10-22",
          risk: "medium",
          status: "blocked",
          progress: 0,
          notes: "chưa tìm được link",
        },
      ],
      members: MEMBERS,
      currentUserId: "u-mgr",
      canEdit: true,
      now: NOW,
    });
    const blockedOwned = rowsWithoutReq.find((r) => r.id === "blocked-p-1");
    expect(blockedOwned?.unblockerName).toBe("Hanh Nguyen");
    expect(blockedOwned?.need).toBe("chưa tìm được link");
    expect(blockedOwned?.typeLabel).toBe("Bị chặn trên Planner");

    const blockedUnassigned = rowsWithoutReq.find((r) => r.id === "blocked-p-blk-unassigned");
    expect(blockedUnassigned?.typeLabel).toBe("Bị chặn trên Planner");
    expect(blockedUnassigned?.need).toBe("chưa tìm được link");
    expect(blockedUnassigned?.unblockerName).toBe("Chưa giao");
    expect(blockedUnassigned?.wait.label).toBe("18p chờ");

    expect(rowsWithoutReq.find((r) => r.id === "unassigned-p-unassigned")?.unblockerName).toBe("Chưa giao");
  });
});
