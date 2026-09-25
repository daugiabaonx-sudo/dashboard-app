import type { TaskPriority, TaskStatus } from "@/lib/types";

export const statusLabel: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

export const statusTone: Record<
  TaskStatus,
  "neutral" | "primary" | "good" | "warning" | "serious" | "critical"
> = {
  backlog: "neutral",
  todo: "neutral",
  in_progress: "primary",
  in_review: "warning",
  done: "good",
};

export const priorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const priorityTone: Record<
  TaskPriority,
  "neutral" | "primary" | "good" | "warning" | "serious" | "critical"
> = {
  low: "neutral",
  medium: "primary",
  high: "warning",
  urgent: "critical",
};
