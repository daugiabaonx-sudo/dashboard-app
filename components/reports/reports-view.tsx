"use client";

// Reports view — numbers come from lib/sx-reports.ts (Microsoft Planner data).
// Client component only because of the recharts velocity chart.

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { formatDeadline, type SxHealth } from "@/lib/sx-dashboard";
import { formatNumber, formatPercent } from "@/lib/format";
import type { SxReport } from "@/lib/sx-reports";

const HEALTH: Record<SxHealth, { label: string; tone: "good" | "warning" | "critical" }> = {
  on_track: { label: "Đúng tiến độ", tone: "good" },
  at_risk: { label: "Có rủi ro", tone: "warning" },
  blocked: { label: "Chậm nghiêm trọng", tone: "critical" },
};

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)", style: { fontVariantNumeric: "tabular-nums" } };

function Stat({ label, value, hint, delay }: { label: string; value: string; hint: string; delay: number }) {
  return (
    <Card className="animate-fade-up opacity-0" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-5 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function VelocityChart({ data }: { data: SxReport["velocity"] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
          <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          <Area type="monotone" dataKey="created" name="Tạo mới" stroke="var(--chart-created)" fill="url(#createdFill)" strokeWidth={2} />
          <Area type="monotone" dataKey="completed" name="Hoàn thành" stroke="var(--chart-completed)" fill="url(#completedFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportsView({ report, note }: { report: SxReport; note?: string }) {
  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow="8 tuần gần nhất · Dữ liệu từ Microsoft Planner"
        title="Báo cáo"
        description={note ?? "Kết quả bàn giao và những điểm đang chậm tiến độ của team."}
        actions={null}
      />

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tỷ lệ hoàn thành" value={formatPercent(report.completionRate)} hint={`${report.completed}/${report.total} công việc`} delay={60} />
        <Stat label="Hoàn thành tuần này" value={formatNumber(report.completedThisWeek)} hint="tính từ thứ Hai" delay={120} />
        <Stat label="Quá hạn" value={formatNumber(report.overdue)} hint="công việc trễ deadline" delay={180} />
        <Stat label="Đang mở" value={formatNumber(report.open)} hint="công việc chưa hoàn thành" delay={240} />
      </section>

      <Card className="animate-fade-up opacity-0" style={{ animationDelay: "300ms" }}>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <div>
              <CardTitle className="font-display text-xl font-normal tracking-tight">Tốc độ</CardTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">Công việc hoàn thành và tạo mới mỗi tuần.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})}
              aria-label="Sao chép đường dẫn báo cáo"
            >
              <Share2 className="size-3.5" />
              Chia sẻ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <VelocityChart data={report.velocity} />
        </CardContent>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "360ms" }}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal tracking-tight">Sức khoẻ dự án</CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">Theo từng bảng Planner: tiến độ và việc đã xong.</p>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {report.projects.length === 0 && <p className="py-6 text-sm text-muted-foreground">Chưa có bảng Planner nào.</p>}
            {report.projects.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <Badge tone={HEALTH[p.health].tone} size="sm">
                      {HEALTH[p.health].label}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full" style={{ width: `${p.progress}%`, background: p.color }} />
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground shrink-0">
                      {formatPercent(p.progress)} · {p.tasksDone}/{p.tasksTotal} việc
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "420ms" }}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal tracking-tight">Quá hạn lâu nhất</CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">Những việc trễ deadline lâu nhất.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.overdueTasks.map((t) => (
              <div key={t.id} className="rounded-md border border-status-critical/20 bg-status-critical/[0.04] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{t.title}</p>
                  <Badge tone="critical" size="sm">
                    {formatDeadline(t.deadline)}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {t.projectName} · {t.employeeName}
                </p>
              </div>
            ))}
            {report.overdueTasks.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                <Dot tone="good" />
                Không có công việc quá hạn.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
