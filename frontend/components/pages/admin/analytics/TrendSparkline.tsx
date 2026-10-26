"use client";

import type { DotItemDotProps } from "recharts";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/types/dashboard";
import AnalyticsCard from "./AnalyticsCard";

interface TrendSparklineProps {
  data: TrendPoint[];
  from: string;
  to: string;
}

function fillDates(data: TrendPoint[], from: string, to: string) {
  const dateMap = new Map<string, number>();
  data.forEach((point) => dateMap.set(point.day, point.count));

  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const filled: { day: string; count: number }[] = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return filled;
  }

  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const key = day.toISOString().split("T")[0];
    filled.push({ day: key, count: dateMap.get(key) ?? 0 });
  }

  return filled;
}

function formatDay(value: string): string {
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TrendDot({ cx, cy, payload }: DotItemDotProps) {
  const count = Number((payload as TrendPoint | undefined)?.count ?? 0);

  if (typeof cx !== "number" || typeof cy !== "number" || count <= 0) {
    return <g />;
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="var(--app-blue)" opacity={0.16} />
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill="var(--app-blue)"
        stroke="var(--app-card)"
        strokeWidth={2}
      />
    </g>
  );
}

export default function TrendSparkline({
  data,
  from,
  to,
}: TrendSparklineProps) {
  const filled = fillDates(data, from, to);
  const totalCount = filled.reduce((sum, point) => sum + point.count, 0);
  const maxCount = Math.max(1, ...filled.map((point) => point.count));

  return (
    <AnalyticsCard title="Orders trend">
      {filled.length === 0 || totalCount === 0 ? (
        <div className="flex h-[144px] items-center justify-center rounded-control bg-app-soft px-4 text-center">
          <p className="text-xs font-normal text-app-muted">
            No orders in this range
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={144}>
          <LineChart
            data={filled}
            margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--app-line)"
              strokeDasharray="3 6"
            />
            <XAxis dataKey="day" hide />
            <YAxis
              hide
              domain={[0, Math.max(1, Math.ceil(maxCount * 1.25))]}
            />
            <Tooltip
              cursor={{ stroke: "var(--app-blue)", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--app-line)",
                background: "var(--app-card)",
                boxShadow: "var(--shadow-card)",
                fontSize: 11,
                color: "var(--app-ink)",
              }}
              labelStyle={{ color: "var(--app-muted)", fontWeight: 600 }}
              formatter={(value) => [Number(value), "Orders"]}
              labelFormatter={(label) => {
                const day = String(label);
                const date = new Date(day + "T00:00:00");
                if (Number.isNaN(date.getTime())) return day;

                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--app-blue)"
              strokeWidth={2.5}
              strokeLinecap="round"
              dot={TrendDot}
              activeDot={{
                r: 5,
                fill: "var(--app-blue)",
                stroke: "var(--app-card)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-app-muted">
        <span>{formatDay(from)}</span>
        <span>{formatDay(to)}</span>
      </div>
    </AnalyticsCard>
  );
}
