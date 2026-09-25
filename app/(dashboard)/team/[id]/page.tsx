import { notFound } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { findUser, tasks } from "@/lib/data";
import { formatDate, formatPercent, formatRelative } from "@/lib/format";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/lib/semantic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberPage({ params }: PageProps) {
  const { id } = await params;
  const user = findUser(id);
  if (!user) {
    notFound();
  }
  const mine = tasks.filter((t) => t.assigneeId === user.id);
  const done = mine.filter((t) => t.status === "done").length;
  const overdue = mine.filter(
    (t) => t.status !== "done" && new Date(t.dueDate) < new Date(),
  ).length;
  const utilization = user.capacityHours > 0
    ? Math.round(
        (mine.reduce((acc, t) => acc + t.loggedHours, 0) / user.capacityHours) * 100,
      )
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/team"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Team
        </Link>
        <header className="mt-3 flex flex-wrap items-start gap-4">
          <Avatar color={user.avatarColor} className="size-16">
            <span className="text-lg">{user.initials}</span>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.department} · {user.role} · Joined {formatDate(user.joinedAt)}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-3.5" />
              {user.email}
            </div>
          </div>
        </header>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assigned</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{mine.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-status-good">
              {done}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle
              className={`text-3xl tabular-nums ${
                overdue > 0 ? "text-status-critical" : "text-foreground"
              }`}
            >
              {overdue}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Utilization</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatPercent(utilization)}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Active tasks</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {mine.map((t) => {
            const days = Math.round(
              (new Date(t.dueDate).getTime() - Date.now()) / 86400000,
            );
            const isOverdue = days < 0 && t.status !== "done";
            return (
              <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge tone={statusTone[t.status]} size="sm">
                      {statusLabel[t.status]}
                    </Badge>
                    <Badge tone={priorityTone[t.priority]} size="sm">
                      {priorityLabel[t.priority]}
                    </Badge>
                  </div>
                </div>
                <Badge
                  tone={isOverdue ? "critical" : days <= 3 ? "warning" : "neutral"}
                  size="sm"
                >
                  {isOverdue
                    ? `${Math.abs(days)}d late`
                    : days === 0
                    ? "Today"
                    : formatRelative(t.dueDate)}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
