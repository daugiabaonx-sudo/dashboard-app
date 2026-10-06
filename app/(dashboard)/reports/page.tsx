"use client";

import { useEffect, useState } from "react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { projects, tasks } from "@/lib/data";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKpis } from "@/hooks/use-stats";

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
  const { data: kpis } = useKpis();
  const completionRate = Math.round(
    (tasks.filter((t) => t.status === "done").length / tasks.length) * 100,
  );
  const totalSpent = projects.reduce((acc, p) => acc + p.spent, 0);
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const openCount = tasks.filter((t) => t.status !== "done").length;
  const blocked = tasks.filter((t) => t.blocked).length;

  // Client-only timestamp to avoid SSR/CSR hydration mismatch (React #418).
  // Initial render on both server and client uses `null` so the markup matches;
  // after hydration we read the real `Date.now()` in an effect. This is the
  // exact "external-system sync after mount" pattern React docs recommend for
  // client-only values — the lint rule fires because it can't tell that
  // `now` is genuinely non-local state, not derived data. See
  // https://react.dev/reference/react/useSyncExternalStore for the long-form
  // rationale (useSyncExternalStore is the principled alternative, but its
  // snapshot must return a stable value, which `Date.now()` doesn't).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);
  const updatedLabel = now !== null
    ? new Date(now).toLocaleString("vi-VN", { dateStyle: "medium" })
    : "";

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow={`8 tuần gần nhất · Cập nhật ${updatedLabel}`}
        title="Báo cáo"
        description="Kết quả bàn giao, chi phí và những điểm đang chậm tiến độ của team."
        actions={null}
      />

      {/* Stat strip — editorial numbers */}
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "60ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Completion rate
            </p>
            <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {formatPercent(completionRate)}
            </p>
            <p className="text-[11px] text-status-good inline-flex items-center gap-1">
              <span aria-hidden>↑</span> 6% vs previous 8 weeks
            </p>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "120ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Tasks completed
            </p>
            <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {formatNumber(kpis?.[1]?.value ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">this week</p>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "180ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Budget used
            </p>
            <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {formatPercent((totalSpent / totalBudget) * 100)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)}
            </p>
          </CardContent>
        </Card>
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "240ms" }}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Open work
            </p>
            <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
              {openCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              tasks in flight{blocked > 0 ? ` · ${blocked} blocked` : ""}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="animate-fade-up opacity-0" style={{ animationDelay: "300ms" }}>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <div>
              <CardTitle className="font-display text-xl font-normal tracking-tight">
                Velocity
              </CardTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Tasks completed vs created each week — gap should stay positive.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                8 weeks
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})}
                aria-label="Copy report URL"
              >
                <Share2 className="size-3.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VELOCITY} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-completed)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-completed)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-created)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-created)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)", style: { fontVariantNumeric: "tabular-nums" } }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 30]}
                  tickCount={6}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)", style: { fontVariantNumeric: "tabular-nums" } }}
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
                  stroke="var(--chart-created)"
                  fill="url(#createdFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="var(--chart-completed)"
                  fill="url(#completedFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "360ms" }}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Project health
            </CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Health based on progress vs time elapsed.
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {projects.map((p) => {
              // `now` is null on the server and during hydration so SSR and the
              // first client render produce identical markup. After mount, the
              // effect above populates `now` and the real "expected" value
              // appears without ever diverging from the server output.
              const expected = (() => {
                if (now === null) return p.progress;
                const start = new Date(p.startDate).getTime();
                const end = new Date(p.dueDate).getTime();
                const span = end - start;
                if (span <= 0) return p.progress;
                return Math.min(
                  100,
                  Math.max(0, ((now - start) / span) * 100),
                );
              })();
              const variance = p.progress - expected;
              const tone =
                variance > 10 ? "good" : variance > -10 ? "warning" : "critical";
              return (
                <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <Badge
                        tone={tone === "good" ? "good" : tone === "warning" ? "warning" : "critical"}
                        size="sm"
                      >
                        {tone === "good" ? "On track" : tone === "warning" ? "Behind" : "Critical"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground shrink-0">
                        {formatPercent(p.progress)} / {formatPercent(expected)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "420ms" }}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Top blockers
            </CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Tasks stuck the longest this month.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks
              .filter((t) => t.blocked)
              .slice(0, 5)
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-status-critical/20 bg-status-critical/[0.04] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{t.title}</p>
                    <Badge tone="critical" size="sm">
                      Blocked
                    </Badge>
                  </div>
                  {t.blockerNote && (
                    <p className="mt-1.5 text-[12px] text-muted-foreground">
                      {t.blockerNote}
                    </p>
                  )}
                </div>
              ))}
            {tasks.filter((t) => t.blocked).length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                <Dot tone="good" />
                No active blockers this week.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
