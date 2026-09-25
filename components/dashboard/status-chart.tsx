"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { tasks } from "@/lib/data";
import { statusLabel } from "@/lib/semantic";
import type { TaskStatus } from "@/lib/types";

// Brand ramp for the workflow stages (backlog → in_progress), then
// semantic accents for review and done. Status uses design tokens so it
// respects the theme automatically instead of hard-coded oklch.
const COLUMNS: { status: TaskStatus; color: string }[] = [
  { status: "backlog", color: "var(--status-neutral)" },
  { status: "todo", color: "var(--status-neutral-strong)" },
  { status: "in_progress", color: "var(--primary)" },
  { status: "in_review", color: "var(--status-warning)" },
  { status: "done", color: "var(--status-good)" },
];

export function StatusChart() {
  const data = COLUMNS.map(({ status, color }) => ({
    status,
    label: statusLabel[status],
    value: tasks.filter((t) => t.status === status).length,
    color,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
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
            cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(value) => [`${value} tasks`, "Count"]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={42}>
            {data.map((d) => (
              <Cell key={d.status} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
