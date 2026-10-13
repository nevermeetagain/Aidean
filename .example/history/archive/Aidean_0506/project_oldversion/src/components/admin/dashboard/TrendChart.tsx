"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendData {
  date: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: TrendData[];
  color?: string;
  height?: number;
}

export function TrendChart({ title, data, color = "#3b82f6", height = 200 }: TrendChartProps) {
  return (
    <div className="bg-[rgb(var(--admin-bg-sidebar))] rounded-xl border border-[rgb(var(--admin-border))] p-4 shadow-[var(--admin-shadow-sm)]">
      <h3 className="text-sm font-medium text-[rgb(var(--admin-text-primary))] mb-3">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgb(var(--admin-border-light))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "rgb(var(--admin-text-muted))" }}
            axisLine={{ stroke: "rgb(var(--admin-border))" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "rgb(var(--admin-text-muted))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(var(--admin-bg-sidebar))",
              border: "1px solid rgb(var(--admin-border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "rgb(var(--admin-text-secondary))" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
