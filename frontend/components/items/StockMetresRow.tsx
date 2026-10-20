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
      className={`flex-shrink-0 px-3 py-2 rounded-lg min-w-[88px] ${
        available < 0 ? "bg-red-100 border border-red-200" : "bg-gray-50"
      }`}
    >
      <span className="text-[10px] uppercase tracking-wider font-bold block text-gray-400">
        Available to order
      </span>
      <span
        className={`text-sm font-black block ${
          isNonPositive
            ? "text-red-600"
            : "text-gray-900"
        }`}
      >
        {formatMeters(available)} m
      </span>
      {/* Keep on-hand stock visible alongside the independent order balance. */}
      <span className="text-[10px] text-gray-400 block">
        {isRollTracked ? "On rolls" : "Physical stock"}:{" "}
        {formatMeters(toMeters(stockMeters))} m
      </span>
      {toMeters(untrackedStockMeters ?? "0") > 0 && (
        <span className="text-[10px] text-amber-700 block">
          Untracked physical (not packable):{" "}
          {formatMeters(toMeters(untrackedStockMeters ?? "0"))} m
        </span>
      )}
    </div>
  );
}