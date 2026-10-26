"use client";

import type { AnalyticsKPIs } from "@/types/dashboard";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import AnalyticsCard from "./AnalyticsCard";

interface StatusDonutChartProps {
  kpis: AnalyticsKPIs;
}

const STATUSES = [
  { key: "draft", label: "Draft", color: "var(--status-draft)" },
  { key: "pending", label: "Pending", color: "var(--status-pending)" },
  { key: "editing", label: "Editing", color: "var(--status-editing)" },
  { key: "packed", label: "Packed", color: "var(--status-packed)" },
  {
    key: "partially_dispatched",
    label: "Partly dispatched",
    color: "var(--status-partial)",
  },
  { key: "dispatched", label: "Dispatched", color: "var(--status-dispatched)" },
] as const;

export default function StatusDonutChart({ kpis }: StatusDonutChartProps) {
  const statuses = STATUSES.map((status) => ({
    ...status,
    value: kpis[status.key] ?? 0,
  }));
  const total = statuses.reduce((sum, status) => sum + status.value, 0);
  const slices = statuses.filter((status) => status.value > 0);

  return (
    <AnalyticsCard
      title="Order status"
      subtitle={total === 0 ? "No orders in this range" : undefined}
    >
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="relative size-[136px] shrink-0 sm:size-[152px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ value: 1 }]}
                dataKey="value"
                innerRadius="64%"
                outerRadius="92%"
                fill="var(--app-soft)"
                stroke="none"
                isAnimationActive={false}
              />
              {slices.length > 0 && (
                <Pie
                  data={slices}
                  dataKey="value"
                  innerRadius="64%"
                  outerRadius="92%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={3}
                  cornerRadius={5}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
              )}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[25px] font-bold leading-none tracking-tight text-app-ink tabular-nums">
              {total}
            </span>
            <span className="mt-1 text-[10px] font-medium text-app-muted">
              {total === 1 ? "order" : "orders"}
            </span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-2">
          {statuses.map((status) => (
            <li
              key={status.key}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: status.color,
                    opacity: status.value > 0 ? 1 : 0.25,
                  }}
                />
                <span
                  className={`truncate text-[11px] font-medium ${
                    status.value > 0 ? "text-app-ink" : "text-app-subtle"
                  }`}
                >
                  {status.label}
                </span>
              </span>
              <span
                className={`shrink-0 text-[11px] font-semibold tabular-nums ${
                  status.value > 0 ? "text-app-ink" : "text-app-subtle"
                }`}
              >
                {status.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AnalyticsCard>
  );
}
