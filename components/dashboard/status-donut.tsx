"use client";

// Status donut. One tool thickener than the previous bar chart — the
// summary number anchors the visual, the legend handles the breakdown.

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { STATUS_COLOR } from "@/lib/chart-theme";
import type { TaskStatus } from "@/lib/types";

interface Slice {
  status: TaskStatus;
  label: string;
  count: number;
}

interface StatusDonutProps {
  slices: Slice[];
  total: number;
  withAmounts?: "count" | "both";
  centerLabel?: string;
}

export function StatusDonut({
  slices,
  total,
  withAmounts = "count",
  centerLabel = "Total",
}: StatusDonutProps) {
  const visible = slices.filter((s) => s.count > 0);
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={60}
              strokeWidth={2}
              stroke="var(--card)"
              paddingAngle={1}
              isAnimationActive={false}
            >
              {visible.map((slice) => (
                <Cell
                  key={slice.status}
                  fill={STATUS_COLOR[slice.status as keyof typeof STATUS_COLOR]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[28px] font-normal leading-none tracking-[-0.02em] text-foreground tabular-nums">
            {total}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5">
        {visible.map((slice) => {
          const pct = total > 0 ? Math.round((slice.count / total) * 100) : 0;
          return (
            <li
              key={slice.status}
              className="flex items-center justify-between gap-3 text-[12px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      STATUS_COLOR[slice.status as keyof typeof STATUS_COLOR],
                  }}
                />
                <span className="truncate text-muted-foreground">{slice.label}</span>
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="font-mono text-foreground">{slice.count}</span>
                {withAmounts === "both" && total > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {pct}%
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}