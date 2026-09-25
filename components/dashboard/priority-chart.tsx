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

// Priority uses the serious/critical escalation — disjoint from the
// status chart's review/done semantic accents so an "In review" task
// at "Urgent" priority never reads as two of the same hue.
const COLUMNS: { priority: TaskPriority; color: string }[] = [
  { priority: "urgent", color: "var(--status-critical)" },
  { priority: "high", color: "var(--status-serious)" },
  { priority: "medium", color: "var(--primary)" },
  { priority: "low", color: "var(--status-neutral-strong)" },
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
