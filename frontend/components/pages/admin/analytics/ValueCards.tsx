"use client";

import type { AnalyticsKPIs } from "@/types/dashboard";
import { formatMeters, toMeters } from "@/types/item";
import AnalyticsCard from "./AnalyticsCard";

interface ValueCardsProps {
  kpis: AnalyticsKPIs;
}

function formatInr(value: number): string {
  return (
    "₹" +
    value.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

export default function ValueCards({ kpis }: ValueCardsProps) {
  const { total, total_value, total_metres_ordered, total_metres_shipped } = kpis;
  const ordered = toMeters(total_metres_ordered);
  const shipped = toMeters(total_metres_shipped);
  const shippedPct =
    ordered > 0 ? Math.min(100, Math.max(0, (shipped / ordered) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <AnalyticsCard className="flex min-h-[126px] flex-col">
        <p className="text-[11px] font-medium text-app-muted">
          Total order value
        </p>
        <p className="mt-2 text-[22px] font-bold leading-none tracking-tight text-app-ink tabular-nums sm:text-2xl">
          {formatInr(total_value)}
        </p>
        <p className="mt-auto pt-3 text-[11px] font-normal text-app-muted">
          Across {total} {total === 1 ? "order" : "orders"}
        </p>
      </AnalyticsCard>

      <AnalyticsCard className="flex min-h-[126px] flex-col">
        <p className="text-[11px] font-medium text-app-muted">Metres ordered</p>
        <p className="mt-2 text-[22px] font-bold leading-none tracking-tight text-app-ink tabular-nums sm:text-2xl">
          {formatMeters(ordered)} m
        </p>
        <div className="mt-auto pt-3">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-app-soft"
            role="progressbar"
            aria-label="Metres shipped against metres ordered"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(shippedPct)}
          >
            <div
              className="h-full rounded-full bg-brand-blue transition-[width] duration-500"
              style={{ width: `${shippedPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-normal text-app-muted">
            {formatMeters(shipped)} m shipped
          </p>
        </div>
      </AnalyticsCard>
    </div>
  );
}
