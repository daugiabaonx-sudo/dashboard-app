// Thin wrapper over `Badge` so callers don't depend on the Badge tone tokens
// for the new dashboard. Renders a priority as one of three tones.

import { Badge } from "@/components/ui/badge";
import type { DashboardPriority } from "@/lib/dashboard-data";

const TONE: Record<DashboardPriority, "neutral" | "primary" | "serious"> = {
  low: "neutral",
  medium: "primary",
  high: "serious",
};

interface PriorityBadgeProps {
  priority: DashboardPriority;
  label: string;
  size?: "sm" | "md";
}

export function PriorityBadge({ priority, label, size = "sm" }: PriorityBadgeProps) {
  return (
    <Badge tone={TONE[priority]} size={size}>
      {label}
    </Badge>
  );
}