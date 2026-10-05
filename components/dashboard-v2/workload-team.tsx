// components/dashboard-v2/workload-team.tsx
// Team workload: top 6 members by assigned task count with avatar, name,
// active task count, and a utilization meter. Pure server component.

import { users, getTeamWorkload, findUser } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";

interface WorkloadTeamLabels {
  title: string;
  subtitle: string;
  activeTasks: string;
  utilization: string;
}

interface WorkloadTeamProps {
  labels: WorkloadTeamLabels;
}

function utilizationTone(pct: number): "good" | "warning" | "critical" {
  if (pct > 90) return "critical";
  if (pct > 75) return "warning";
  return "good";
}

const TONE_COLOR: Record<"good" | "warning" | "critical", string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
};

export function WorkloadTeam({ labels }: WorkloadTeamProps) {
  const workload = getTeamWorkload()
    .map((w) => ({ ...w, user: findUser(w.userId) }))
    .filter((w): w is typeof w & { user: NonNullable<typeof w.user> } => Boolean(w.user))
    .sort((a, b) => b.assignedTasks - a.assignedTasks)
    .slice(0, 6);

  return (
    <div className="glass-card rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {labels.subtitle}
          </p>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {users.length}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {workload.map((w) => {
          const tone = utilizationTone(w.utilization);
          const initial = w.user.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <li key={w.userId} className="flex items-center gap-3">
              <Avatar color={w.user.avatarColor} className="size-8 shrink-0">
                <span className="text-[10px]">{initial}</span>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {w.user.name}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {w.assignedTasks} {labels.activeTasks}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${w.utilization}%`,
                        background: TONE_COLOR[tone],
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {w.utilization}%
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}