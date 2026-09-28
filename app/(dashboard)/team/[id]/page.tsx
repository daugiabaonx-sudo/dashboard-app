import { notFound } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findUser, tasks } from "@/lib/data";
import { formatDate, formatPercent, formatRelative } from "@/lib/format";
import { priorityLabel, priorityTone, statusLabel, statusTone, utilizationTone } from "@/lib/semantic";
import { cn } from "@/lib/cn";

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
  const now = new Date();
  const overdue = mine.filter(
    (t) => t.status !== "done" && new Date(t.dueDate) < now,
  ).length;
  const inFlight = mine.filter((t) => t.status !== "done").length;
  const utilization = user.capacityHours > 0
    ? Math.round(
        (mine.reduce((acc, t) => acc + t.loggedHours, 0) / user.capacityHours) * 100,
      )
    : 0;
  const tone = utilizationTone(utilization);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Breadcrumb + hero */}
      <div className="space-y-4">
        <Link
          href="/team"
          className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Team
        </Link>
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <Avatar color={user.avatarColor} className="size-20 shrink-0">
              <span className="text-xl">{user.initials}</span>
            </Avatar>
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {user.department} · {user.role}
              </p>
              <h1 className="font-display text-[36px] font-normal leading-[1.05] tracking-[-0.02em] text-foreground md:text-[40px]">
                {user.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3" /> {user.email}
                </span>
                <span>Joined {formatDate(user.joinedAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">Message</Button>
            <Button size="sm">Assign task</Button>
          </div>
        </header>
      </div>

      {/* Stat strip */}
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "60ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Capacity
            </p>
            <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {utilization === 0 ? "—" : formatPercent(utilization)}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Dot tone={tone} />
              <span>{utilization > 0 ? `${user.capacityHours}h/wk` : "no logged time yet"}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "120ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              In flight
            </p>
            <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {inFlight}
            </p>
            <p className="text-[11px] text-muted-foreground">tasks open</p>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "180ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Completed
            </p>
            <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-status-good">
              {done}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatPercent(Math.round((done / Math.max(1, mine.length)) * 100))} of all assigned
            </p>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "240ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Overdue
            </p>
            <p
              className={cn(
                "font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums",
                overdue > 0 ? "text-status-critical" : "text-foreground",
              )}
            >
              {overdue}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {overdue === 0 ? "nothing slipping" : "needs follow-up"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Tasks list */}
      <Card className="animate-fade-up opacity-0" style={{ animationDelay: "300ms" }}>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Active tasks
            </CardTitle>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {mine.length} total
            </span>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing assigned right now.</p>
          ) : (
            mine.map((t) => {
              const days = Math.round(
                (new Date(t.dueDate).getTime() - now.getTime()) / 86400000,
              );
              const isOverdue = days < 0 && t.status !== "done";
              const isDone = t.status === "done";
              return (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}#task-${t.id}`}
                  className="group/task -mx-3 flex items-center gap-3 rounded-md px-3 py-3 first:pt-0 last:pb-0 hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate transition-colors group-hover/task:text-primary",
                        isDone && "line-through decoration-muted-foreground/40 opacity-60",
                      )}
                    >
                      {t.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
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
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
