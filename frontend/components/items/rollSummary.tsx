"use client";

import { formatMeters, toMeters } from "@/types/item";
import type { FabricRoll } from "@/types/item";

/**
 * How one roll reads in a list: its warehouse label, whatever the admin noted
 * about it, and how much of it is left of what arrived.
 *
 * This is the display half of a roll row, lifted out of the Physical Rolls panel
 * so that the Inventory page can show a colour's rolls in exactly the words the
 * panel uses. The panel's own row keeps its History / Print / Adjust buttons
 * around it, and this list adds none: reading the rolls is all the inventory page
 * is for.
 */
export default function RollSummary({ roll }: { roll: FabricRoll }) {
  const used = roll.is_exhausted || toMeters(roll.consumed_meters) > 0;
  const usedUp = roll.is_exhausted;

  return (
    <div className="flex-1 min-w-0">
      <p
        className={`text-xs font-black ${
          used ? "text-red-700" : "text-gray-700"
        }`}
      >
        {roll.roll_number}
        {roll.note && (
          <span className="ml-2 font-normal text-gray-400">{roll.note}</span>
        )}
      </p>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <p className="text-[11px] text-gray-400">
          {formatMeters(roll.remaining_meters)} m left of{" "}
          {formatMeters(roll.original_meters)}
        </p>
        {used && (
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              "bg-red-100 text-red-700"
            }`}
          >
            {usedUp ? "Used up" : "Used"}
          </span>
        )}
      </div>
    </div>
  );
}