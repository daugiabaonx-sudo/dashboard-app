import Link from "next/link";
import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { users, getTeamWorkload, tasks } from "@/lib/data";
import { formatPercent } from "@/lib/format";

export default function TeamPage() {
  const workload = getTeamWorkload();
  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} members across {new Set(users.map((u) => u.department)).size} departments
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((u) => {
          const w = workload.find((x) => x.userId === u.id);
          const utilization = w?.utilization ?? 0;
          const tone =
            utilization > 90
              ? "bg-status-critical"
              : utilization > 75
              ? "bg-status-warning"
              : "bg-primary";
          return (
            <Link key={u.id} href={`/team/${u.id}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-elevated">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar color={u.avatarColor} className="size-12">
                      <span className="text-sm">{u.initials}</span>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {u.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {u.department}
                      </CardDescription>
                    </div>
                    <Badge tone="outline" size="sm" className="capitalize">
                      {u.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3" />
                    <span className="truncate">{u.email}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-semibold tabular-nums">
                        {formatPercent(utilization)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full ${tone}`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <div>
                      <div className="text-base font-semibold tabular-nums">
                        {w?.assignedTasks ?? 0}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Assigned
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-semibold tabular-nums text-status-good">
                        {w?.completedTasks ?? 0}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Done
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-base font-semibold tabular-nums ${
                          (w?.overdueTasks ?? 0) > 0
                            ? "text-status-critical"
                            : "text-muted-foreground"
                        }`}
                      >
                        {w?.overdueTasks ?? 0}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Overdue
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
