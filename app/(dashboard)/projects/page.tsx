import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  completed: "primary",
} as const;

const priorityTone = {
  low: "neutral",
  medium: "primary",
  high: "warning",
  critical: "critical",
} as const;

export default function ProjectsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length} total · {projects.filter((p) => p.status === "active").length} active
          </p>
        </div>
        <Button>
          <Plus />
          New project
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => {
          const owner = findUser(p.ownerId);
          const budgetPct = (p.spent / p.budget) * 100;
          const budgetTone =
            budgetPct > 90 ? "critical" : budgetPct > 75 ? "warning" : "good";
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group"
            >
              <Card className="h-full transition-shadow hover:shadow-elevated">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {p.name}
                    </CardTitle>
                    <Badge tone={statusTone[p.status]} size="sm">
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {p.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold tabular-nums">
                        {formatPercent(p.progress)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="tabular-nums">
                        {formatCurrency(p.spent)} / {formatCurrency(p.budget)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full",
                          budgetTone === "critical"
                            ? "bg-status-critical"
                            : budgetTone === "warning"
                            ? "bg-status-warning"
                            : "bg-status-good",
                        )}
                        style={{ width: `${Math.min(100, budgetPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Badge tone={priorityTone[p.priority]} size="sm">
                        {p.priority}
                      </Badge>
                      <span>{p.memberIds.length} members</span>
                    </div>
                    <span>Due {formatRelative(p.dueDate)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3 -mx-5 px-5 -mb-5 pb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Owner: {owner?.name.split(" ")[0]}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Started {formatDate(p.startDate, "MMM d")}
                    </span>
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
