import Link from "next/link";
import { Mail, Plus, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { users, getTeamWorkload, tasks } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { utilizationTone } from "@/lib/semantic";
import { cn } from "@/lib/cn";

export default function TeamPage() {
  const workload = getTeamWorkload();
  const totalOpen = tasks.filter((t) => t.status !== "done").length;
  const overloaded = workload.filter((w) => w.utilization > 90).length;
  const departments = new Set(users.map((u) => u.department)).size;

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow={`${users.length} members · ${departments} departments`}
        title={<>The people doing the <span className="italic text-primary">work</span>.</>}
        description={`${totalOpen} open tasks, ${overloaded} at over capacity. Watch the bars on the right — anyone in critical needs relief.`}
        actions={
          <>
            <Button variant="outline" size="sm">
              Export roster
            </Button>
            <Button size="sm">
              <UserPlus className="size-3.5" />
              Invite member
            </Button>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
        {users.map((u, i) => {
          const w = workload.find((x) => x.userId === u.id);
          const utilization = w?.utilization ?? 0;
          const tone = utilizationTone(utilization);
          const assigned = w?.assignedTasks ?? 0;
          const done = w?.completedTasks ?? 0;
          const overdue = w?.overdueTasks ?? 0;
          return (
            <Link
              key={u.id}
              href={`/team/${u.id}`}
              className="group block animate-fade-up opacity-0"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Card className="h-full transition-all duration-200 group-hover:border-foreground/15 group-hover:shadow-lifted">
                <CardContent className="p-5 space-y-4">
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
                    <Badge tone="outline" size="sm" className="capitalize">
                      {u.role}
                    </Badge>
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
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
