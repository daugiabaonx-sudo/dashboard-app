import type {
  Activity,
  DashboardKpi,
  Notification,
  Project,
  Task,
  TaskStatus,
  TeamWorkload,
  User,
} from "./types";

export const users: User[] = [
  {
    id: "u1",
    name: "Nguyen Minh Anh",
    email: "minhanh@sunext.io",
    role: "owner",
    avatarColor: "#6366f1",
    initials: "MA",
    department: "Leadership",
    joinedAt: "2024-01-15",
    capacityHours: 32,
  },
  {
    id: "u2",
    name: "Tran Quoc Bao",
    email: "quocbao@sunext.io",
    role: "admin",
    avatarColor: "#8b5cf6",
    initials: "QB",
    department: "Engineering",
    joinedAt: "2024-02-20",
    capacityHours: 40,
  },
  {
    id: "u3",
    name: "Le Hoang Phuong",
    email: "phuong.le@sunext.io",
    role: "manager",
    avatarColor: "#06b6d4",
    initials: "LP",
    department: "Product",
    joinedAt: "2024-03-05",
    capacityHours: 40,
  },
  {
    id: "u4",
    name: "Pham Thanh Dat",
    email: "thanhdat@sunext.io",
    role: "member",
    avatarColor: "#10b981",
    initials: "TD",
    department: "Engineering",
    joinedAt: "2024-04-12",
    capacityHours: 40,
  },
  {
    id: "u5",
    name: "Vu Kim Tuyen",
    email: "kimtuyen@sunext.io",
    role: "member",
    avatarColor: "#f59e0b",
    initials: "KT",
    department: "Design",
    joinedAt: "2024-05-01",
    capacityHours: 40,
  },
  {
    id: "u6",
    name: "Dao Bich Ngoc",
    email: "bichngoc@sunext.io",
    role: "member",
    avatarColor: "#ec4899",
    initials: "BN",
    department: "Marketing",
    joinedAt: "2024-05-22",
    capacityHours: 36,
  },
  {
    id: "u7",
    name: "Hoang Gia Khanh",
    email: "giakhanh@sunext.io",
    role: "member",
    avatarColor: "#ef4444",
    initials: "GK",
    department: "Engineering",
    joinedAt: "2024-06-15",
    capacityHours: 40,
  },
  {
    id: "u8",
    name: "Bui Thi Mai Linh",
    email: "mailinh@sunext.io",
    role: "viewer",
    avatarColor: "#14b8a6",
    initials: "ML",
    department: "Sales",
    joinedAt: "2024-07-08",
    capacityHours: 32,
  },
];

export const projects: Project[] = [
  {
    id: "p1",
    name: "Customer Portal v2",
    description:
      "Rebuild of the customer-facing dashboard with realtime notifications and self-service billing.",
    status: "active",
    priority: "critical",
    ownerId: "u2",
    memberIds: ["u2", "u3", "u4", "u5", "u7"],
    startDate: "2026-08-01",
    dueDate: "2026-10-31",
    progress: 62,
    budget: 180000,
    spent: 124500,
    tags: ["frontend", "billing", "realtime"],
  },
  {
    id: "p2",
    name: "Q4 Marketing Campaign",
    description:
      "Multi-channel campaign for the November product launch: paid social, email, content partnerships.",
    status: "active",
    priority: "high",
    ownerId: "u6",
    memberIds: ["u3", "u5", "u6", "u8"],
    startDate: "2026-09-01",
    dueDate: "2026-11-15",
    progress: 34,
    budget: 95000,
    spent: 41200,
    tags: ["marketing", "growth", "q4"],
  },
  {
    id: "p3",
    name: "Mobile App Rewrite",
    description:
      "Migrate the legacy iOS/Android app to a shared React Native codebase with new offline-first sync.",
    status: "active",
    priority: "high",
    ownerId: "u4",
    memberIds: ["u2", "u4", "u7"],
    startDate: "2026-07-15",
    dueDate: "2027-01-20",
    progress: 41,
    budget: 220000,
    spent: 89500,
    tags: ["mobile", "react-native", "platform"],
  },
  {
    id: "p4",
    name: "Data Warehouse Migration",
    description:
      "Move analytics pipeline from Postgres + Airflow to a Snowflake + dbt stack with proper observability.",
    status: "planning",
    priority: "medium",
    ownerId: "u7",
    memberIds: ["u2", "u7"],
    startDate: "2026-10-15",
    dueDate: "2027-02-28",
    progress: 8,
    budget: 75000,
    spent: 4200,
    tags: ["data", "infrastructure"],
  },
  {
    id: "p5",
    name: "Onboarding Refresh",
    description:
      "Redesign the first-run experience to lift activation by 15%. Includes new tutorials and in-app guides.",
    status: "on_hold",
    priority: "low",
    ownerId: "u3",
    memberIds: ["u3", "u5", "u6"],
    startDate: "2026-06-01",
    dueDate: "2026-09-30",
    progress: 22,
    budget: 42000,
    spent: 9800,
    tags: ["ux", "growth"],
  },
];

const TASK_TEMPLATES: Array<{
  title: string;
  description: string;
  tags: string[];
}> = [
  {
    title: "Design billing summary component",
    description:
      "Create a reusable component that displays invoice history and current plan status with consistent spacing.",
    tags: ["design", "billing"],
  },
  {
    title: "Implement websocket auth handshake",
    description:
      "Use short-lived JWTs validated against the realtime gateway, rotate on disconnect.",
    tags: ["backend", "realtime"],
  },
  {
    title: "Write integration tests for payment flow",
    description:
      "Cover happy path plus the 3 most common failure modes (declined card, expired session, currency mismatch).",
    tags: ["testing", "billing"],
  },
  {
    title: "Set up Meta Pixel + GA4 for landing pages",
    description:
      "Wire conversion events through GTM, double-check consent mode v2 defaults for EU.",
    tags: ["marketing", "analytics"],
  },
  {
    title: "Refactor auth middleware to use opaque tokens",
    description:
      "Stop storing session data in JWTs; move to a Redis-backed lookup keyed by token id.",
    tags: ["backend", "security"],
  },
  {
    title: "Audit accessibility of the new dashboard",
    description:
      "Run through the 5 critical flows with VoiceOver and keyboard only. Document any failures.",
    tags: ["a11y", "ux"],
  },
  {
    title: "Spike: offline-first sync strategy",
    description:
      "Compare CRDT vs operational transform approaches for the new mobile sync layer. One-week decision doc.",
    tags: ["mobile", "research"],
  },
  {
    title: "Prepare launch announcement blog post",
    description:
      "Draft + iterate with PM, finalize by EOD Wednesday for marketing review.",
    tags: ["marketing", "content"],
  },
  {
    title: "Fix flaky notification test in CI",
    description:
      "The 'reconnect after server restart' test is green locally, red on CI 30% of runs.",
    tags: ["backend", "testing"],
  },
  {
    title: "Migrate onboarding copy to CMS",
    description:
      "Pull all hardcoded strings into Contentful so localization can ship without a release.",
    tags: ["frontend", "i18n"],
  },
  {
    title: "Draft RFC: dbt project structure",
    description:
      "Propose a 3-package layout (staging, marts, snapshots) with naming conventions and ownership rules.",
    tags: ["data", "docs"],
  },
  {
    title: "Design empty states for tasks view",
    description:
      "Three empty states: no projects, no tasks, all tasks completed. Each needs a different nudge.",
    tags: ["design", "ux"],
  },
  {
    title: "Add error boundary to dashboard routes",
    description:
      "Currently a render error takes down the whole shell. Wrap each route segment independently.",
    tags: ["frontend", "reliability"],
  },
  {
    title: "Review API rate-limit thresholds",
    description:
      "Are our current limits matching real usage? Pull last 30d of 429s by endpoint.",
    tags: ["backend", "ops"],
  },
  {
    title: "Build usage telemetry for new feature",
    description:
      "Define 3 events, get PM sign-off, instrument in code, validate in staging before release.",
    tags: ["product", "analytics"],
  },
];

const STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_progress",
  "in_review",
  "done",
  "done",
] as const;
const PRIORITIES = [
  "low",
  "medium",
  "medium",
  "high",
  "high",
  "urgent",
] as const;

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const tasks: Task[] = TASK_TEMPLATES.flatMap((template, i) => {
  const projectIdx = i % projects.length;
  const project = projects[projectIdx];
  if (!project) {
    return [];
  }
  const assignee = project.memberIds[i % project.memberIds.length] ?? "u4";
  const reporter = project.ownerId;
  const status = STATUSES[i % STATUSES.length];
  const priority = PRIORITIES[i % PRIORITIES.length];
  const baseCreated = -10 - i * 2;
  const baseUpdated = -1 - (i % 5);
  const dueOffset =
    status === "done"
      ? -Math.abs(i - 4)
      : i % 7 === 0
      ? -2
      : i % 5 === 0
      ? 1
      : 3 + (i % 12);
  const blocked = i % 9 === 0;
  return [
    {
      id: `t${i + 1}`,
      title: template.title,
      description: template.description,
      status,
      priority,
      assigneeId: assignee,
      reporterId: reporter,
      projectId: project.id,
      dueDate: isoOffset(dueOffset),
      createdAt: isoOffset(baseCreated),
      updatedAt: isoOffset(baseUpdated),
      tags: template.tags,
      estimatedHours: 2 + (i % 6) * 2,
      loggedHours: status === "done" ? 2 + (i % 6) * 2 : i % 4,
      progress: status === "done" ? 100 : status === "in_review" ? 85 : status === "in_progress" ? 40 + (i % 30) : 0,
      blocked,
      blockerNote: blocked ? "Waiting on legal review of new T&Cs" : undefined,
      comments: i % 6,
      attachments: i % 4,
    } satisfies Task,
  ];
});

export const activities: Activity[] = [
  {
    id: "a1",
    actorId: "u2",
    type: "task_completed",
    targetType: "task",
    targetId: "t6",
    targetTitle: "Audit accessibility of the new dashboard",
    message: "marked complete",
    createdAt: isoOffset(-0.05),
  },
  {
    id: "a2",
    actorId: "u4",
    type: "task_assigned",
    targetType: "task",
    targetId: "t13",
    targetTitle: "Add error boundary to dashboard routes",
    message: "assigned to Pham Thanh Dat",
    createdAt: isoOffset(-0.2),
  },
  {
    id: "a3",
    actorId: "u6",
    type: "comment_added",
    targetType: "task",
    targetId: "t8",
    targetTitle: "Prepare launch announcement blog post",
    message: "left 3 comments",
    createdAt: isoOffset(-0.5),
  },
  {
    id: "a4",
    actorId: "u7",
    type: "deadline_missed",
    targetType: "task",
    targetId: "t9",
    targetTitle: "Fix flaky notification test in CI",
    message: "missed the deadline by 2 days",
    createdAt: isoOffset(-0.8),
  },
  {
    id: "a5",
    actorId: "u3",
    type: "status_changed",
    targetType: "project",
    targetId: "p1",
    targetTitle: "Customer Portal v2",
    message: "moved to in-review phase",
    createdAt: isoOffset(-1.1),
  },
  {
    id: "a6",
    actorId: "u5",
    type: "task_created",
    targetType: "task",
    targetId: "t12",
    targetTitle: "Design empty states for tasks view",
    message: "created a new task",
    createdAt: isoOffset(-1.5),
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    type: "deadline",
    title: "Task overdue",
    body: "Fix flaky notification test in CI was due 2 days ago.",
    createdAt: isoOffset(-0.1),
    read: false,
    link: "/tasks",
  },
  {
    id: "n2",
    type: "mention",
    title: "Phuong Le mentioned you",
    body: "On 'Audit accessibility of the new dashboard' — can you take a look at the keyboard order?",
    createdAt: isoOffset(-0.4),
    read: false,
    link: "/tasks",
  },
  {
    id: "n3",
    type: "assigned",
    title: "New task assigned",
    body: "Add error boundary to dashboard routes — due Friday.",
    createdAt: isoOffset(-1.2),
    read: true,
    link: "/tasks",
  },
  {
    id: "n4",
    type: "blocked",
    title: "Task blocked",
    body: "Prepare launch announcement blog post is waiting on legal review.",
    createdAt: isoOffset(-1.6),
    read: true,
    link: "/tasks",
  },
];

export function getKpis(): DashboardKpi[] {
  const overdue = tasks.filter((t) => t.status !== "done" && new Date(t.dueDate) < new Date()).length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const upcoming = tasks.filter((t) => {
    const d = (new Date(t.dueDate).getTime() - Date.now()) / 86400000;
    return t.status !== "done" && d >= 0 && d <= 7;
  }).length;
  return [
    {
      id: "active-projects",
      label: "Active projects",
      value: projects.filter((p) => p.status === "active").length,
      delta: 12,
      deltaLabel: "vs last month",
      trend: "up",
      intent: "neutral",
    },
    {
      id: "tasks-completed",
      label: "Tasks completed",
      value: completed,
      delta: 8,
      deltaLabel: "this week",
      trend: "up",
      intent: "good",
    },
    {
      id: "in-progress",
      label: "In progress",
      value: inProgress,
      delta: 3,
      deltaLabel: "vs yesterday",
      trend: "up",
      intent: "neutral",
    },
    {
      id: "overdue",
      label: "Overdue",
      value: overdue,
      delta: overdue > 0 ? 1 : 0,
      deltaLabel: "needs attention",
      trend: overdue > 0 ? "up" : "flat",
      intent: overdue > 0 ? "critical" : "good",
    },
    {
      id: "upcoming-deadlines",
      label: "Upcoming deadlines",
      value: upcoming,
      delta: 0,
      deltaLabel: "next 7 days",
      trend: "flat",
      intent: upcoming > 3 ? "warning" : "neutral",
    },
  ];
}

export function getTeamWorkload(): TeamWorkload[] {
  return users.map((u) => {
    const mine = tasks.filter((t) => t.assigneeId === u.id);
    return {
      userId: u.id,
      assignedTasks: mine.length,
      completedTasks: mine.filter((t) => t.status === "done").length,
      overdueTasks: mine.filter(
        (t) => t.status !== "done" && new Date(t.dueDate) < new Date(),
      ).length,
      utilization: u.capacityHours > 0
        ? Math.min(
            100,
            Math.round(
              (mine.reduce((acc, t) => acc + t.loggedHours, 0) / u.capacityHours) * 100,
            ),
          )
        : 0,
    };
  });
}

export function findUser(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function findProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function findTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function projectTasks(projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

// ─── Dashboard v2 helpers ──────────────────────────────────────────────

export interface DashboardKpiStripItem {
  id: string;
  label: string;
  value: number;
  delta: number;
  deltaLabel: string;
  trend: "up" | "down" | "flat";
  intent: "neutral" | "good" | "warning" | "critical";
  sparkline: number[];
}

const SPARKLINE_WEEK = [12, 18, 16, 22, 19, 26, 24];
const SPARKLINE_GROW = [4, 6, 5, 9, 12, 14, 18];
const SPARKLINE_STEADY = [10, 11, 10, 12, 11, 13, 12];
const SPARKLINE_DECAY = [22, 19, 15, 14, 12, 10, 8];
const SPARKLINE_ALERT = [1, 2, 1, 3, 2, 4, 6];

export function getKpiStrip(): DashboardKpiStripItem[] {
  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdue = tasks.filter(
    (t) => t.status !== "done" && new Date(t.dueDate) < new Date(),
  ).length;
  const blocked = tasks.filter((t) => t.blocked).length;
  return [
    {
      id: "total",
      label: "Tổng công việc",
      value: tasks.length,
      delta: 12,
      deltaLabel: "so với tuần trước",
      trend: "up",
      intent: "neutral",
      sparkline: SPARKLINE_WEEK,
    },
    {
      id: "completed",
      label: "Đã hoàn thành",
      value: completed,
      delta: 8,
      deltaLabel: "tuần này",
      trend: "up",
      intent: "good",
      sparkline: SPARKLINE_GROW,
    },
    {
      id: "inProgress",
      label: "Đang thực hiện",
      value: inProgress,
      delta: 5,
      deltaLabel: "tổng công việc",
      trend: "down",
      intent: "neutral",
      sparkline: SPARKLINE_STEADY,
    },
    {
      id: "overdue",
      label: "Trễ hạn",
      value: overdue,
      delta: 3,
      deltaLabel: "tổng công việc",
      trend: "up",
      intent: "critical",
      sparkline: SPARKLINE_ALERT,
    },
    {
      id: "blocked",
      label: "Bị chặn",
      value: blocked,
      delta: 20,
      deltaLabel: "tổng công việc",
      trend: "down",
      intent: "good",
      sparkline: SPARKLINE_DECAY,
    },
  ];
}

export interface StatusDonutSlice {
  status: TaskStatus;
  label: string;
  count: number;
  colorToken: "status-good" | "status-warning" | "primary" | "status-neutral";
}

export function getStatusDonut(): {
  slices: StatusDonutSlice[];
  total: number;
} {
  const order: TaskStatus[] = ["done", "in_review", "in_progress", "todo", "backlog"];
  const colorToken: Record<TaskStatus, StatusDonutSlice["colorToken"]> = {
    done: "status-good",
    in_review: "status-warning",
    in_progress: "primary",
    todo: "status-neutral",
    backlog: "status-neutral",
  };
  const slices = order.map((status) => ({
    status,
    label: statusLabel(status),
    count: tasks.filter((t) => t.status === status).length,
    colorToken: colorToken[status],
  }));
  return {
    slices,
    total: slices.reduce((acc, s) => acc + s.count, 0),
  };
}

export interface BlockerRow {
  task: Task;
  projectName: string;
  assigneeName: string;
  dueRelative: string;
}

export function getBlockers(): BlockerRow[] {
  const now = Date.now();
  return tasks
    .filter((t) => t.blocked)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      const assignee = users.find((u) => u.id === task.assigneeId);
      const daysUntilDue = Math.round(
        (new Date(task.dueDate).getTime() - now) / 86400000,
      );
      const dueRelative =
        daysUntilDue < 0
          ? `${Math.abs(daysUntilDue)}d overdue`
          : daysUntilDue === 0
            ? "Due today"
            : `${daysUntilDue}d left`;
      return {
        task,
        projectName: project?.name ?? "—",
        assigneeName: assignee?.name ?? "Unassigned",
        dueRelative,
      };
    });
}

export interface FeaturedTaskRow {
  task: Task;
  projectName: string;
  assigneeInitials: string;
  assigneeColor: string;
  assigneeName: string;
  priorityTone: "neutral" | "primary" | "serious" | "critical";
}

export function getFeaturedTasks(limit = 5): FeaturedTaskRow[] {
  const now = Date.now();
  return [...tasks]
    .filter((t) => t.status !== "done")
    .map((task) => {
      const due = new Date(task.dueDate).getTime();
      const daysUntilDue = (due - now) / 86400000;
      // Higher score = featured sooner.
      let score = 0;
      if (task.priority === "urgent") score += 100;
      else if (task.priority === "high") score += 60;
      else if (task.priority === "medium") score += 30;
      if (daysUntilDue < 0) score += 80;
      else if (daysUntilDue <= 3) score += 40;
      else if (daysUntilDue <= 7) score += 20;
      if (task.blocked) score += 50;
      return { task, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ task }) => {
      const project = projects.find((p) => p.id === task.projectId);
      const assignee = users.find((u) => u.id === task.assigneeId);
      return {
        task,
        projectName: project?.name ?? "—",
        assigneeInitials: assignee?.initials ?? "??",
        assigneeColor: assignee?.avatarColor ?? "#94a3b8",
        assigneeName: assignee?.name ?? "Unassigned",
        priorityTone: priorityTone(task.priority),
      };
    });
}

function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "backlog":
      return "Tồn đọng";
    case "todo":
      return "Cần làm";
    case "in_progress":
      return "Đang làm";
    case "in_review":
      return "Đang duyệt";
    case "done":
      return "Hoàn thành";
  }
}

function priorityTone(
  priority: "low" | "medium" | "high" | "urgent",
): "neutral" | "primary" | "serious" | "critical" {
  switch (priority) {
    case "low":
      return "neutral";
    case "medium":
      return "primary";
    case "high":
      return "serious";
    case "urgent":
      return "critical";
  }
}
