import { getTeamWorkload, users } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";

export function WorkloadTable() {
  const rows = getTeamWorkload()
    .map((w) => ({ ...w, user: users.find((u) => u.id === w.userId) }))
    .filter((r) => r.user)
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 5);

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const tone =
          r.utilization > 90
            ? "bg-status-critical"
            : r.utilization > 75
            ? "bg-status-warning"
            : "bg-primary";
        return (
          <li key={r.userId} className="flex items-center gap-3">
            <Avatar color={r.user?.avatarColor} className="size-8">
              <span>{r.user?.initials}</span>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.user?.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {r.utilization}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full transition-all", tone)}
                  style={{ width: `${Math.min(100, r.utilization)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>
                  <span className="font-mono tabular-nums">{r.assignedTasks}</span> assigned
                </span>
                {r.overdueTasks > 0 && (
                  <span className="text-status-critical">
                    <span className="font-mono tabular-nums">{r.overdueTasks}</span> overdue
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
