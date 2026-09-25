import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ChevronRight, Users2, Wallet } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { findProject, findUser, projectTasks, users } from "@/lib/data";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import { cn } from "@/lib/cn";
import { TaskRow } from "@/components/tasks/task-row";

interface PageProps {
  params: Promise<{ id: string }>;
}

const projectStatusTone = {
  planning: "neutral",
  active: "good",
  on_hold: "warning",
  completed: "good",
} as const;

const priorityTone = {
  low: "neutral",
  medium: "neutral",
  high: "warning",
  critical: "critical",
} as const;

const statusDot = {
  planning: "neutral",
  active: "good",
  on_hold: "warning",
  completed: "neutral",
} as const;

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = findProject(id);
  if (!project) {
    notFound();
  }
  const owner = findUser(project.ownerId);
  const members = project.memberIds
    .map((mid) => users.find((u) => u.id === mid))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  const projectTaskList = projectTasks(project.id);
  const budgetPct = (project.spent / project.budget) * 100;
  const budgetTone =
    budgetPct > 90 ? "critical" : budgetPct > 75 ? "warning" : "good";
  const openTasks = projectTaskList.filter((t) => t.status !== "done").length;
  const doneTasks = projectTaskList.filter((t) => t.status === "done").length;
  const blocked = projectTaskList.filter((t) => t.blocked).length;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Breadcrumb + hero */}
      <div className="space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Projects
        </Link>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <Dot tone={statusDot[project.status]} />
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {project.status.replace("_", " ")} · {project.tags.join(" · ")}
              </p>
            </div>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-foreground md:text-[48px]">
              {project.name}
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {project.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge tone={projectStatusTone[project.status]} size="sm">
                {project.status.replace("_", " ")}
              </Badge>
              <Badge tone={priorityTone[project.priority]} size="sm">
                {project.priority} priority
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button size="sm">Add task</Button>
          </div>
        </header>
      </div>

      {/* Editorial stats strip */}
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "60ms" }}>
          <CardContent className="p-5 flex h-full flex-col space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Progress
            </p>
            <p className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {formatPercent(project.progress)}
            </p>
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="mt-auto pt-3 border-t border-border/60 text-[11px] text-muted-foreground">&nbsp;</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "120ms" }}>
          <CardContent className="p-5 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground inline-flex items-center gap-1.5">
              <Wallet className="size-3" /> Budget
            </p>
            <p className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {formatPercent(budgetPct)}
            </p>
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full",
                  budgetTone === "critical" && "bg-status-critical",
                  budgetTone === "warning" && "bg-status-warning",
                  budgetTone === "good" && "bg-status-good",
                )}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(project.spent)} of {formatCurrency(project.budget)}
            </p>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "180ms" }}>
          <CardContent className="p-5 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Tasks
            </p>
            <p className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {openTasks}
              <span className="ml-1 text-base text-muted-foreground">/ {projectTaskList.length}</span>
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Dot tone="good" /> {doneTasks} done
              </span>
              {blocked > 0 && (
                <span className="inline-flex items-center gap-1 text-status-critical">
                  <Dot tone="critical" /> {blocked} blocked
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "240ms" }}>
          <CardContent className="p-5 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground inline-flex items-center gap-1.5">
              <Calendar className="size-3" /> Due
            </p>
            <p className="font-display text-[28px] font-normal leading-none tracking-[-0.02em] text-foreground">
              {formatDate(project.dueDate, "MMM d")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatRelative(project.dueDate)} · started {formatDate(project.startDate, "MMM d")}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Tasks + sidebar */}
      <section className="grid gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-8 animate-fade-up opacity-0" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <div className="flex items-end justify-between gap-3">
              <CardTitle className="font-display text-xl font-normal tracking-tight">
                Tasks
              </CardTitle>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {projectTaskList.length} total
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {projectTaskList.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-3">
          <Card className="animate-fade-up opacity-0" style={{ animationDelay: "340ms" }}>
            <CardHeader className="pb-3">
              <div className="flex items-end justify-between gap-3">
                <CardTitle className="font-display text-base font-normal tracking-tight inline-flex items-center gap-2">
                  <Users2 className="size-3.5 text-muted-foreground" />
                  Team
                </CardTitle>
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {members.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {members.map((m) => (
                <Link
                  key={m.id}
                  href={`/team/${m.id}`}
                  className="group/member -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary/50 transition-colors"
                >
                  <Avatar color={m.avatarColor} className="size-8">
                    <span>{m.initials}</span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover/member:text-primary transition-colors">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {m.role} · {m.department}
                    </p>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover/member:opacity-100 group-hover/member:translate-x-0 group-hover/member:text-foreground" aria-hidden />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="animate-fade-up opacity-0" style={{ animationDelay: "380ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-normal tracking-tight">
                Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              {owner && (
                <Link
                  href={`/team/${owner.id}`}
                  className="flex items-center gap-3 group"
                >
                  <Avatar color={owner.avatarColor} className="size-10">
                    <span>{owner.initials}</span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {owner.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{owner.email}</p>
                  </div>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-up opacity-0" style={{ animationDelay: "420ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-normal tracking-tight">
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <Badge key={tag} tone="outline" size="sm">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
