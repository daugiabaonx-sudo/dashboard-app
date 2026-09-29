"use client";

// components/team/team-grid.tsx
// Roster of workspace members as a card grid. Reads the live team and
// workload via TanStack Query so realtime invalidations from the
// stats / tasks channels refresh the per-user bars + counts. `initialUsers`
// is the SSR seed; once queries resolve the live data overlays it.

import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
import type { BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Dot } from "@/components/ui/badge";
import { utilizationTone } from "@/lib/semantic";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { useTeam } from "@/hooks/use-team";
import { useWorkload } from "@/hooks/use-stats";
import type { User, UserRole } from "@/lib/types";

const ROLE_TONE: Record<UserRole, NonNullable<BadgeProps["tone"]>> = {
  owner: "primary",
  admin: "serious",
  manager: "primary",
  member: "outline",
  viewer: "outline",
};

interface TeamGridProps {
  initialUsers: User[];
}

export function TeamGrid({ initialUsers }: TeamGridProps) {
  const { data: liveUsers } = useTeam();
  const { data: workload } = useWorkload();
  const users = liveUsers ?? initialUsers;
  const workloadByUser = new Map((workload ?? []).map((w) => [w.userId, w]));

  return (
    <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
      {users.map((u, i) => {
        const w = workloadByUser.get(u.id);
        const utilization = w?.utilization ?? 0;
        const tone = utilizationTone(utilization);
        const assigned = w?.assignedTasks ?? 0;
        const done = w?.completedTasks ?? 0;
        const overdue = w?.overdueTasks ?? 0;
        return (
          <Link
            key={u.id}
            href={`/team/${u.id}`}
            className="group block animate-fade-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Card className="h-full rounded-xl border bg-card p-5 space-y-4 transition-all duration-200 group-hover:border-foreground/15 group-hover:shadow-lifted">
              <div className="flex items-start gap-3">
                <Avatar color={u.avatarColor} className="size-12">
                  <span className="text-sm">{u.initials}</span>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {u.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{u.department}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge tone={ROLE_TONE[u.role]} size="sm" className={cn("capitalize", u.role !== "member" && u.role !== "viewer" && "border-transparent font-medium")}>
                    {u.role}
                  </Badge>
                  <ChevronRight aria-hidden className="size-4 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-200 motion-reduce:transition-none group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Mail className="size-3" />
                <span className="truncate">{u.email}</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Dot tone={tone} />
                    Capacity
                  </span>
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      tone === "critical" && "text-status-critical",
                      tone === "warning" && "text-status-warning",
                      tone === "good" && "text-foreground",
                    )}
                  >
                    {formatPercent(utilization)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full transition-all",
                      tone === "critical" && "bg-status-critical",
                      tone === "warning" && "bg-status-warning",
                      tone === "good" && "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <div>
                  <p className="font-display text-xl font-normal leading-none tabular-nums text-foreground">
                    {assigned}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Assigned
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl font-normal leading-none tabular-nums text-status-good">
                    {done}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Done
                  </p>
                </div>
                <div>
                  <p
                    className={cn(
                      "font-display text-xl font-normal leading-none tabular-nums",
                      overdue > 0 ? "text-status-critical" : "text-muted-foreground",
                    )}
                  >
                    {overdue}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Overdue
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </section>
  );
}
