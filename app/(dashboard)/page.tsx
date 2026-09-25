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
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projects, tasks, getKpis, findUser } from "@/lib/data";
import { daysUntil, formatDate, formatPercent, formatRelative } from "@/lib/format";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/lib/semantic";
import { ArrowRight, Download, FlameKindling, ListChecks, Users2 } from "lucide-react";
import Link from "next/link";

const TODAY = "September 25, 2026";

export default function DashboardPage() {
  const kpis = getKpis();
  const attention = kpis.find((k) => k.id === "overdue");
  const upcoming = tasks
    .filter((t) => t.status !== "done" && daysUntil(t.dueDate) <= 14)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
  const blockers = tasks.filter((t) => t.blocked).slice(0, 4);
  const atRisk = projects
    .filter((p) => p.status === "active" || p.status === "on_hold")
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero — editorial headline */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-status-good" aria-hidden />
            Operations · {TODAY}
          </p>
          <h1 className="font-display text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-foreground md:text-[52px]">
            Good afternoon, <span className="italic text-primary">Minh Anh</span>.
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {attention && attention.value > 0
              ? `${attention.value} task${attention.value === 1 ? "" : "s"} need${attention.value === 1 ? "s" : ""} attention, ${upcoming.length} deadlines inside the next two weeks.`
              : "All clear — every active project is on track."}{" "}
            Team velocity is up{" "}
            <span className="font-medium text-foreground">8%</span> against last week.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="size-3.5" />
            Export
          </Button>
          <Button size="sm">
            <ListChecks className="size-3.5" />
            Plan week
          </Button>
        </div>
      </header>

      {/* KPI bento — asymmetric, first tile spans 2 cols to anchor the row */}
      <section
        className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-12"
        aria-label="Key metrics"
      >
        <div className="col-span-2 md:col-span-4 lg:col-span-6">
          <KpiTile
            kpi={kpis[0]!}
            href="/projects"
            icon={<Users2 className="size-4" />}
            delay={0}
          />
        </div>
        {kpis.slice(1).map((k, i) => (
          <div key={k.id} className="col-span-1 md:col-span-2 lg:col-span-3">
            <KpiTile
              kpi={k}
              href={
                k.id === "overdue"
                  ? "/tasks"
                  : k.id === "upcoming-deadlines"
                    ? "/calendar"
                    : k.id === "active-projects"
                      ? "/projects"
                      : k.id === "tasks-completed"
                        ? "/tasks?status=done"
                        : "/tasks?status=in_progress"
              }
              icon={
                k.id === "overdue" ? (
                  <FlameKindling className="size-4" />
                ) : undefined
              }
              delay={i + 1}
            />
          </div>
        ))}
      </section>

      {/* Primary bento — health + workload */}
      <section className="grid gap-3 lg:grid-cols-3">
        {/* Project health — tall, editorial spread */}
        <Card className="lg:col-span-2 lg:row-span-2 animate-fade-up opacity-0" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Project health
                </p>
                <CardTitle className="mt-1 font-display text-2xl font-normal tracking-tight">
                  Active work this quarter
                </CardTitle>
                <CardDescription className="mt-1">
                  Progress, budget burn, and team allocation across the four most pressing initiatives.
                </CardDescription>
              </div>
              <Link
                href="/projects"
                className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                All projects <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {atRisk.map((p) => {
                const owner = findUser(p.ownerId);
                const burn = (p.spent / p.budget) * 100;
                const health =
                  p.progress > burn + 15
                    ? "good"
                    : p.progress > burn - 5
                      ? "warning"
                      : "critical";
                const dueIn = daysUntil(p.dueDate);
                return (
                  <li key={p.id} className="group py-5 first:pt-2 last:pb-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/projects/${p.id}`}
                            className="text-[15px] font-medium leading-snug tracking-tight hover:text-primary"
                          >
                            {p.name}
                          </Link>
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
                        </div>
                        <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-1">
                          {p.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-[28px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
                          {formatPercent(p.progress)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {dueIn < 0
                            ? `${Math.abs(dueIn)}d overdue`
                            : dueIn === 0
                              ? "Due today"
                              : `${dueIn}d left`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Progress</span>
                          <span className="tabular-nums">{formatPercent(p.progress)}</span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Budget burn</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Dot tone={health} />
                            {formatPercent(burn)}
                          </span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full transition-all ${
                              health === "good"
                                ? "bg-status-good"
                                : health === "warning"
                                  ? "bg-status-warning"
                                  : "bg-status-critical"
                            }`}
                            style={{ width: `${Math.min(100, burn)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Owner {owner?.name.split(" ").slice(-1)[0]} · {p.memberIds.length} on team
                      </span>
                      <span className="font-mono">
                        ${(p.spent / 1000).toFixed(0)}k / ${(p.budget / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Team workload — stacked, concise */}
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "160ms" }}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Team load
                </p>
                <CardTitle className="mt-1 font-display text-xl font-normal tracking-tight">
                  Capacity this week
                </CardTitle>
              </div>
              <Link
                href="/team"
                className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Roster <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <WorkloadTable />
          </CardContent>
        </Card>

        {/* Status distribution — quiet secondary */}
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "200ms" }}>
          <CardHeader className="pb-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Flow
            </p>
            <CardTitle className="mt-1 font-display text-xl font-normal tracking-tight">
              Tasks by status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusChart />
          </CardContent>
        </Card>
      </section>

      {/* Secondary bento — deadlines, blockers, activity */}
      <section className="grid gap-3 lg:grid-cols-12">
        {/* Deadlines — wide */}
        <Card className="lg:col-span-7 animate-fade-up opacity-0" style={{ animationDelay: "240ms" }}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Next two weeks
                </p>
                <CardTitle className="mt-1 font-display text-xl font-normal tracking-tight">
                  Upcoming deadlines
                </CardTitle>
              </div>
              <Link
                href="/calendar"
                className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
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
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-secondary/60 py-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {formatDate(t.dueDate, "MMM")}
                      </span>
                      <span className="font-display text-[22px] font-normal leading-none tabular-nums text-foreground">
                        {formatDate(t.dueDate, "d")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium leading-snug">
                        {t.title}
                      </p>
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
                        {assignee?.name.split(" ").slice(-1)[0]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Blockers — narrow, urgent */}
        <Card className="lg:col-span-5 animate-fade-up opacity-0" style={{ animationDelay: "280ms" }}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-status-critical">
                  Needs intervention
                </p>
                <CardTitle className="mt-1 font-display text-xl font-normal tracking-tight">
                  Blockers & risks
                </CardTitle>
                <CardDescription className="mt-1">
                  Work that won&rsquo;t move without an explicit unblocker.
                </CardDescription>
              </div>
              <Badge tone="critical" size="sm">
                {blockers.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {blockers.length === 0 ? (
                <li className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Nothing blocked. Smooth sailing.
                </li>
              ) : (
                blockers.map((t) => {
                  const assignee = findUser(t.assigneeId);
                  return (
                    <li
                      key={t.id}
                      className="rounded-md border border-status-critical/20 bg-status-critical/[0.04] p-3"
                    >
                      <p className="text-sm font-medium leading-snug">{t.title}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                        {t.blockerNote ?? "Awaiting unblock."}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Owner: {assignee?.name.split(" ").slice(-1)[0]}
                        </span>
                        <span className="font-mono tabular-nums text-status-critical">
                          {formatRelative(t.updatedAt)}
                        </span>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Tertiary bento — priority + activity */}
      <section className="grid gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-5 animate-fade-up opacity-0" style={{ animationDelay: "320ms" }}>
          <CardHeader className="pb-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Backlog shape
            </p>
            <CardTitle className="mt-1 font-display text-xl font-normal tracking-tight">
              Open work by priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7 animate-fade-up opacity-0" style={{ animationDelay: "360ms" }}>
          <CardHeader>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Last 24 hours
            </p>
            <CardTitle className="mt-1 font-display text-xl font-normal tracking-tight">
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
