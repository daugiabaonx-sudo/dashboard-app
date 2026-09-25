"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tasks } from "@/lib/data";
import { priorityLabel } from "@/lib/semantic";
import type { TaskPriority } from "@/lib/types";

const COLUMNS: { priority: TaskPriority; color: string }[] = [
  { priority: "urgent", color: "oklch(0.62 0.22 27)" },
  { priority: "high", color: "oklch(0.72 0.17 35)" },
  { priority: "medium", color: "oklch(0.62 0.16 268)" },
  { priority: "low", color: "oklch(0.65 0.012 270)" },
];

export function PriorityChart() {
  const data = COLUMNS.map(({ priority, color }) => ({
    priority,
    label: priorityLabel[priority],
    value: tasks.filter((t) => t.priority === priority && t.status !== "done").length,
    color,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={64}
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
            formatter={(value) => [`${value} open tasks`, "Count"]}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {data.map((d) => (
              <Cell key={d.priority} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
