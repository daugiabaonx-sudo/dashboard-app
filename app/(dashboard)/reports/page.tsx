"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projects, tasks, getKpis } from "@/lib/data";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

const VELOCITY = [
  { week: "W-7", completed: 8, created: 14 },
  { week: "W-6", completed: 11, created: 12 },
  { week: "W-5", completed: 13, created: 15 },
  { week: "W-4", completed: 16, created: 11 },
  { week: "W-3", completed: 18, created: 17 },
  { week: "W-2", completed: 14, created: 13 },
  { week: "W-1", completed: 22, created: 16 },
  { week: "This", completed: 19, created: 14 },
];

export default function ReportsPage() {
  const kpis = getKpis();
  const completionRate = Math.round(
    (tasks.filter((t) => t.status === "done").length / tasks.length) * 100,
  );
  const totalSpent = projects.reduce((acc, p) => acc + p.spent, 0);
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 8 weeks · Updated {new Date().toLocaleString("en-US", { dateStyle: "medium" })}
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion rate</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatPercent(completionRate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-status-good">
              ↑ 6% vs previous 8 weeks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasks completed</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatNumber(kpis[1]?.value ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budget used</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatPercent((totalSpent / totalBudget) * 100)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open work</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {tasks.filter((t) => t.status !== "done").length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">tasks in flight</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Velocity</CardTitle>
          <CardDescription>Tasks completed vs created each week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VELOCITY} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.16 152)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.62 0.16 152)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.18 268)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.62 0.18 268)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="oklch(0.62 0.18 268)"
                  fill="url(#createdFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="oklch(0.62 0.16 152)"
                  fill="url(#completedFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project health</CardTitle>
            <CardDescription>Health based on progress vs time elapsed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((p) => {
              const expected =
                Math.min(
                  100,
                  Math.max(
                    0,
                    ((Date.now() - new Date(p.startDate).getTime()) /
                      (new Date(p.dueDate).getTime() - new Date(p.startDate).getTime())) *
                      100,
                  ),
                );
              const variance = p.progress - expected;
              const healthy = variance > -10;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {p.name}
                      </span>
                      <Badge tone={healthy ? "good" : "warning"} size="sm">
                        {healthy ? "On track" : "Behind"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{formatPercent(p.progress)} actual</span>
                      <span>·</span>
                      <span>{formatPercent(expected)} expected</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top blockers</CardTitle>
            <CardDescription>Tasks stuck the longest this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks
              .filter((t) => t.blocked)
              .slice(0, 5)
              .map((t) => (
                <div key={t.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.blockerNote && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.blockerNote}
                    </p>
                  )}
                </div>
              ))}
            {tasks.filter((t) => t.blocked).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active blockers this week.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
