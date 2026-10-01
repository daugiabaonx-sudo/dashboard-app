// Thin wrapper over `Badge` for the v2 dashboard's status labels.

import { Badge } from "@/components/ui/badge";

export type DashboardStatus =
  | "inProgress"
  | "done"
  | "overdue"
  | "blocked"
  | "notStarted"
  | "todo"
  | "review";

const TONE: Record<DashboardStatus, "neutral" | "good" | "warning" | "serious" | "primary"> = {
  notStarted: "neutral",
  todo: "neutral",
  inProgress: "primary",
  review: "warning",
  done: "good",
  overdue: "serious",
  blocked: "serious",
};

interface StatusBadgeProps {
  status: DashboardStatus;
  label: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, size = "sm" }: StatusBadgeProps) {
  return (
    <Badge tone={TONE[status]} size={size}>
      {label}
    </Badge>
  );
}