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

const COLUMNS: { status: TaskStatus; color: string }[] = [
  { status: "backlog", color: "oklch(0.7 0.01 270)" },
  { status: "todo", color: "oklch(0.65 0.05 268)" },
  { status: "in_progress", color: "oklch(0.62 0.18 268)" },
  { status: "in_review", color: "oklch(0.78 0.15 80)" },
  { status: "done", color: "oklch(0.62 0.16 152)" },
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
