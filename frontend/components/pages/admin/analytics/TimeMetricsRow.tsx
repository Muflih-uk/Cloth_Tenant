"use client";

import type { TimeMetrics } from "@/types/dashboard";
import AnalyticsCard from "./AnalyticsCard";

interface TimeMetricsRowProps {
  metrics: TimeMetrics;
}

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  return hours.toFixed(1);
}

function formatPct(pct: number | null): string {
  if (pct === null) return "—";
  return pct.toFixed(0) + "%";
}

export default function TimeMetricsRow({ metrics }: TimeMetricsRowProps) {
  const cards = [
    {
      label: "Avg dispatch",
      value: formatHours(metrics.avg_dispatch_hours),
      unit: metrics.avg_dispatch_hours !== null ? "hrs" : "",
      hasData: metrics.avg_dispatch_hours !== null,
    },
    {
      label: "Median dispatch",
      value: formatHours(metrics.median_dispatch_hours),
      unit: metrics.median_dispatch_hours !== null ? "hrs" : "",
      hasData: metrics.median_dispatch_hours !== null,
    },
    {
      label: "Within 24h",
      value: formatPct(metrics.dispatched_within_24h_pct),
      unit: "",
      hasData: metrics.dispatched_within_24h_pct !== null,
    },
  ];

  return (
    <AnalyticsCard title="Dispatch speed">
      <div className="grid grid-cols-3 gap-2">
        {cards.map(({ label, value, unit, hasData }) => (
          <div
            key={label}
            className="flex min-h-[76px] flex-col justify-center rounded-control bg-app-soft px-1.5 py-3 text-center"
          >
            <p
              className={`text-xl font-bold leading-none tracking-tight tabular-nums ${
                hasData ? "text-app-ink" : "text-app-subtle"
              }`}
            >
              {value}
              {unit && (
                <span className="ml-0.5 text-[10px] font-semibold text-app-muted">
                  {unit}
                </span>
              )}
            </p>
            <p className="mt-2 text-[10px] font-medium leading-tight text-app-muted">
              {label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] font-normal text-app-muted">
        Shows once an order has shipped.
      </p>
    </AnalyticsCard>
  );
}
