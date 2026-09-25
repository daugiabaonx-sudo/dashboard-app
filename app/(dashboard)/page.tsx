import {
  ActivityFeed,
} from "@/components/dashboard/activity-feed";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { PriorityChart } from "@/components/dashboard/priority-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { WorkloadTable } from "@/components/dashboard/workload-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projects, tasks, getKpis, findUser } from "@/lib/data";
import { daysUntil, formatDate, formatPercent, formatRelative } from "@/lib/format";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/lib/semantic";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const kpis = getKpis();
  const upcoming = tasks
    .filter((t) => t.status !== "done" && daysUntil(t.dueDate) <= 14)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6);
  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Operations dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Tuesday, Sep 25
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            5 active projects · 2 require attention before EOD
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm">
            This week
          </Button>
          <Button size="sm">Export report</Button>
        </div>
      </header>

      <section
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
        aria-label="Key metrics"
      >
        {kpis.map((k) => (
          <KpiTile key={k.id} kpi={k} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workload by status</CardTitle>
                <CardDescription>
                  Tasks across all projects — sorted by Kanban stage
                </CardDescription>
              </div>
              <Badge tone="neutral" size="sm">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <StatusChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open work by priority</CardTitle>
            <CardDescription>Excludes completed tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityChart />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming deadlines</CardTitle>
              <Link
                href="/calendar"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Full calendar <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {upcoming.map((t) => {
                const days = daysUntil(t.dueDate);
                const overdue = days < 0;
                const dueTone = overdue
                  ? "critical"
                  : days <= 1
                  ? "critical"
                  : days <= 3
                  ? "warning"
                  : "neutral";
                const assignee = findUser(t.assigneeId);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col items-center w-12 shrink-0">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {formatDate(t.dueDate, "MMM")}
                      </span>
                      <span className="text-lg font-semibold tabular-nums leading-none">
                        {formatDate(t.dueDate, "d")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={statusTone[t.status]} size="sm">
                          {statusLabel[t.status]}
                        </Badge>
                        <Badge tone={priorityTone[t.priority]} size="sm">
                          {priorityLabel[t.priority]}
                        </Badge>
                        {t.blocked && (
                          <Badge tone="critical" size="sm">
                            Blocked
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                      <Badge tone={dueTone} size="sm">
                        {overdue
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                          ? "Due today"
                          : days === 1
                          ? "Tomorrow"
                          : `In ${days}d`}
                      </Badge>
                      <span className="mt-1 text-[11px] text-muted-foreground">
                        {assignee?.name.split(" ")[0]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team workload</CardTitle>
            <CardDescription>
              Logged hours / capacity (this week)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkloadTable />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active projects</CardTitle>
                <CardDescription>
                  Progress, budget burn, and team allocation
                </CardDescription>
              </div>
              <Link
                href="/projects"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {activeProjects.map((p) => {
                const owner = findUser(p.ownerId);
                return (
                  <li key={p.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/projects/${p.id}`}
                          className="text-sm font-medium hover:text-primary"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(p.dueDate)} ·{" "}
                          {formatRelative(p.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          tone={
                            p.priority === "critical"
                              ? "critical"
                              : p.priority === "high"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {p.priority}
                        </Badge>
                        <span className="text-xs tabular-nums font-semibold">
                          {formatPercent(p.progress)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Owner: {owner?.name.split(" ")[0]}</span>
                      <span>
                        {p.memberIds.length} members · Budget{" "}
                        {formatPercent((p.spent / p.budget) * 100)} used
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
