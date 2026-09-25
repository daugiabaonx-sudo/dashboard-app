import type { TaskPriority, TaskStatus } from "@/lib/types";

export const statusLabel: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

// Status is a workflow progression (neutral → brand → review → complete).
// Priority is orthogonal (neutral → brand → serious → critical escalation).
// They must NEVER share the same tone at the same level — otherwise
// "Medium priority" and "In progress status" look identical on a row.
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
  high: "serious",
  urgent: "critical",
};

// Utilization is orthogonal to status/priority — capacity-0 should read as
// "no data" (neutral), not as "good" because the bar is empty.
export function utilizationTone(
  u: number,
): "neutral" | "good" | "warning" | "critical" {
  if (u === 0) return "neutral";
  if (u > 90) return "critical";
  if (u > 75) return "warning";
  return "good";
}
