export type UserRole = "owner" | "admin" | "manager" | "member" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  initials: string;
  department: string;
  joinedAt: string;
  capacityHours: number;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string;
  memberIds: string[];
  startDate: string;
  dueDate: string;
  progress: number;
  budget: number;
  spent: number;
  tags: string[];
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  reporterId: string;
  projectId: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  estimatedHours: number;
  loggedHours: number;
  progress: number;
  blocked?: boolean;
  blockerNote?: string;
  comments: number;
  attachments: number;
}

export interface Activity {
  id: string;
  actorId: string;
  type:
    | "task_created"
    | "task_completed"
    | "task_assigned"
    | "comment_added"
    | "project_created"
    | "status_changed"
    | "deadline_missed";
  targetType: "task" | "project";
  targetId: string;
  targetTitle: string;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "deadline" | "mention" | "assigned" | "completed" | "blocked";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link: string;
}

export type ViewMode = "list" | "board" | "calendar";

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  delta: number;
  deltaLabel: string;
  trend: "up" | "down" | "flat";
  intent: "neutral" | "good" | "warning" | "critical";
}

export interface TeamWorkload {
  userId: string;
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  utilization: number;
}
