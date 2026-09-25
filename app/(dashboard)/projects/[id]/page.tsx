import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { findProject, findUser, projectTasks, users } from "@/lib/data";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import { TaskRow } from "@/components/tasks/task-row";
import { cn } from "@/lib/cn";

interface PageProps {
  params: Promise<{ id: string }>;
}

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Projects
        </Link>
        <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {project.name}
              </h1>
              <Badge tone="good" size="sm">
                {project.status.replace("_", " ")}
              </Badge>
              <Badge tone="critical" size="sm">
                {project.priority}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {project.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button size="sm">Add task</Button>
          </div>
        </header>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progress</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatPercent(project.progress)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budget</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatPercent(budgetPct)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(project.spent)} of {formatCurrency(project.budget)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open tasks</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {projectTaskList.filter((t) => t.status !== "done").length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {projectTaskList.filter((t) => t.status === "done").length} done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due</CardDescription>
            <CardTitle className="text-xl">
              {formatDate(project.dueDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatRelative(project.dueDate)}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>{projectTaskList.length} total</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {projectTaskList.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>{members.length} members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar color={m.avatarColor} className="size-8">
                    <span>{m.initials}</span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.role} · {m.department}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent>
              {owner && (
                <div className="flex items-center gap-3">
                  <Avatar color={owner.avatarColor} className="size-10">
                    <span>{owner.initials}</span>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{owner.name}</p>
                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
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
