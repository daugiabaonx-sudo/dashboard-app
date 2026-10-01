"use client";

// Tiny inline sparkline — used inside KPI tiles. No axes, no grid, no
// tooltip. Pure visual rhythm. Sized by the parent (default 96×28).

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  CHART_PALETTE,
  SPARKLINE_COLOR,
  type SparklineIntent,
} from "@/lib/chart-theme";

interface SparklineProps {
  data: number[];
  intent?: SparklineIntent;
  height?: number;
}

export function Sparkline({
  data,
  intent = "neutral",
  height = 28,
}: SparklineProps) {
  const points = data.map((value, index) => ({ index, value }));
  const stroke = SPARKLINE_COLOR[intent];
  const fillId = `sparkline-fill-${intent}`;

  return (
    <div style={{ width: "100%", height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.5}
            fill={`url(#${fillId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}