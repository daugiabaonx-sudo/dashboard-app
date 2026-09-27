import Link from "next/link";
import { Plus, Filter } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { NewProjectTrigger } from "@/components/projects/new-project-trigger";
import { projects, findUser } from "@/lib/data";
import {
  formatDate,
  formatPercent,
  formatRelative,
  formatCurrency,
} from "@/lib/format";
import { cn } from "@/lib/cn";

const statusTone = {
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

const projectStatusDot = {
  planning: "neutral",
  active: "good",
  on_hold: "warning",
  completed: "good",
} as const;

export default function ProjectsPage() {
  const totalActive = projects.filter((p) => p.status === "active").length;
  const featured = projects[0];
  const rest = projects.slice(1);

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow={`${projects.length} initiatives · ${totalActive} active`}
        title={<>The portfolio, <span className="italic text-primary">in motion</span>.</>}
        description="Every active initiative, ranked by attention needed. Burn, progress, and team load at a glance — click into any project for the full spread."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="size-3.5" />
              Filter
            </Button>
            <NewProjectTrigger />
          </>
        }
      />

      {/* Featured project — editorial spread */}
      {featured && (
        <section
          className="animate-fade-up opacity-0 rounded-lg border border-border bg-card shadow-soft overflow-hidden"
          style={{ animationDelay: "80ms" }}
        >
          <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
            <div className="p-7 lg:p-9 space-y-5">
              <div className="flex items-center gap-2">
                <Dot tone={projectStatusDot[featured.status]} />
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Featured · {featured.status.replace("_", " ")}
                </p>
              </div>
              <Link href={`/projects/${featured.id}`} className="group block">
                <h2 className="font-display text-[34px] font-normal leading-[1.05] tracking-[-0.02em] text-foreground group-hover:text-primary transition-colors">
                  {featured.name}
                </h2>
              </Link>
              <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                {featured.description}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone[featured.status]} size="sm">
                  {featured.status.replace("_", " ")}
                </Badge>
                <Badge tone={priorityTone[featured.priority]} size="sm">
                  {featured.priority} priority
                </Badge>
                {featured.tags.slice(0, 3).map((t) => (
                  <Badge key={t} tone="outline" size="sm">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                {featured.memberIds.slice(0, 4).map((mid, i) => {
                  const u = findUser(mid);
                  return u ? (
                    <Avatar
                      key={mid}
                      color={u.avatarColor}
                      className={cn("size-8 ring-2 ring-card", i > 0 && "-ml-3")}
                    >
                      <span className="text-[10px]">{u.initials}</span>
                    </Avatar>
                  ) : null;
                })}
                <span className="text-[12px] text-muted-foreground">
                  {featured.memberIds.length} on team · Owner {findUser(featured.ownerId)?.name.split(" ").slice(-1)[0]}
                </span>
              </div>
            </div>
            <div className="bg-secondary/40 p-7 lg:p-9 flex flex-col justify-center gap-5 border-t border-border lg:border-t-0 lg:border-l">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Progress
                  </p>
                  <p className="font-display text-[44px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
                    {formatPercent(featured.progress)}
                  </p>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${featured.progress}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Budget
                </p>
                <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">
                  {formatCurrency(featured.spent)}
                  <span className="text-sm text-muted-foreground"> / {formatCurrency(featured.budget)}</span>
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {formatPercent((featured.spent / featured.budget) * 100)} used
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4 text-[12px]">
                <span className="text-muted-foreground">Due {formatDate(featured.dueDate, "MMM d")}</span>
                <span className="text-muted-foreground">{formatRelative(featured.dueDate)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Remaining projects — refined grid */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            All projects · {rest.length}
          </p>
          <div className="flex items-center gap-1 text-[12px]">
            <span className="text-muted-foreground">Sort</span>
            <span className="font-medium text-foreground">Most urgent</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rest.map((p, i) => {
            const owner = findUser(p.ownerId);
            const budgetPct = (p.spent / p.budget) * 100;
            const budgetTone =
              budgetPct > 90 ? "critical" : budgetPct > 75 ? "warning" : "good";
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group block animate-fade-up opacity-0"
                style={{ animationDelay: `${160 + i * 60}ms` }}
              >
                <Card className="h-full transition-all duration-200 group-hover:border-foreground/15 group-hover:shadow-lifted">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Dot tone={projectStatusDot[p.status]} />
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {p.status.replace("_", " ")}
                        </span>
                      </div>
                      <Badge tone={priorityTone[p.priority]} size="sm">
                        {p.priority}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-medium leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatPercent(p.progress)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Budget</span>
                        <span
                          className={cn(
                            "font-mono tabular-nums",
                            budgetTone === "critical" && "text-status-critical",
                            budgetTone === "warning" && "text-status-warning",
                            budgetTone === "good" && "text-status-good",
                          )}
                        >
                          {formatPercent(budgetPct)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
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
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Avatar color={owner?.avatarColor} className="size-5">
                          <span className="text-[9px]">{owner?.initials}</span>
                        </Avatar>
                        {owner?.name.split(" ").slice(-1)[0]}
                      </span>
                      <span>{p.memberIds.length} on team · {formatRelative(p.dueDate)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
