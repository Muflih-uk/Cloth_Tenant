"use client";

import { formatMeters, toMeters } from "@/types/item";

interface StockMetresRowProps {
  stockMeters: string;
  /** Order stock after reservations; falls back to physical stock if omitted. */
  availableMeters?: string | null;
  isRollTracked?: boolean;
  untrackedStockMeters?: string | null;
}

/**
 * One colour's order stock and on-hand stock.
 *
 * The headline is `available_meters` because that is the figure that answers
 * "can this colour take another order", and it moves as soon as one is placed.
 * The physical total stays underneath so on-hand stock remains visible.
 */
export default function StockMetresRow({
  stockMeters,
  availableMeters,
  isRollTracked = false,
  untrackedStockMeters,
}: StockMetresRowProps) {
  const available =
    availableMeters === undefined || availableMeters === null
      ? toMeters(stockMeters)
      : toMeters(availableMeters);
  const isNonPositive = available <= 0;

  return (
    <div
      className={`min-w-[88px] flex-shrink-0 rounded-control border px-3 py-2 ${
        available < 0
          ? "border-brand-red/20 bg-brand-red/5"
          : "border-app-line/60 bg-app-soft/70"
      }`}
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider text-app-muted">
        Available to order
      </span>
      <span
        className={`block text-sm font-extrabold ${
          isNonPositive ? "text-brand-red" : "text-app-ink"
        }`}
      >
        {formatMeters(available)} m
      </span>
      <span className="block text-[10px] text-app-muted">
        {isRollTracked ? "On rolls" : "Physical stock"}:{" "}
        {formatMeters(toMeters(stockMeters))} m
      </span>
      {toMeters(untrackedStockMeters ?? "0") > 0 && (
        <span className="block text-[10px] text-[color:var(--status-pending-text)]">
          Untracked physical (not packable):{" "}
          {formatMeters(toMeters(untrackedStockMeters ?? "0"))} m
        </span>
      )}
    </div>
  );
}