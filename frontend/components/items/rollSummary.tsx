"use client";

import { formatMeters, toMeters } from "@/types/item";
import type { FabricRoll } from "@/types/item";

/**
 * How one roll reads in a list: its warehouse label, what is on it now and
 * whether any usable cloth remains.
 *
 * A roll that was partly packed is still available, and a manual correction
 * changes the length without turning the roll into packing consumption. The
 * original length, received date and adjustment difference therefore have no
 * place here.
 */
export default function RollSummary({ roll }: { roll: FabricRoll }) {
  const remaining = toMeters(roll.remaining_meters);
  const status = remaining > 0 && roll.is_active ? "Available" : "Used";
  const statusClass =
    status === "Available"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-red-100 text-red-700";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-xs font-black text-gray-800">
        {roll.roll_number}
      </p>
      <p className="shrink-0 text-[11px] font-bold text-gray-600">
        {formatMeters(roll.remaining_meters)} m
      </p>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusClass}`}
      >
        {status}
      </span>
    </div>
  );
}