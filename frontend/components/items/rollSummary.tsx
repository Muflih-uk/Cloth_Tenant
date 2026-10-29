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
export default function RollSummary({
  roll,
  desktopInline = false,
}: {
  roll: FabricRoll;
  /** Keep code, metres and status on one line at desktop instead of stacking. */
  desktopInline?: boolean;
}) {
  const remaining = toMeters(roll.remaining_meters);
  const status = remaining > 0 && roll.is_active ? "Available" : "Used";
  const statusClass =
    status === "Available"
      ? "bg-brand-green/10 text-brand-green"
      : "bg-brand-red/10 text-brand-red";

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        desktopInline ? "" : "lg:flex-col lg:items-start lg:gap-0"
      }`}
    >
      <p
        className={`min-w-0 flex-1 truncate text-xs font-bold text-app-ink ${
          desktopInline
            ? "lg:text-[11px] lg:font-semibold"
            : "lg:w-full lg:flex-none lg:text-[11px] lg:leading-tight"
        }`}
      >
        {roll.roll_number}
      </p>
      <div
        className={`flex shrink-0 items-center gap-2 ${
          desktopInline ? "" : "lg:mt-0.5"
        }`}
      >
        <p className="shrink-0 text-[11px] font-bold text-app-muted lg:text-[10px]">
          {formatMeters(roll.remaining_meters)} m
        </p>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusClass} ${
            desktopInline
              ? "lg:inline-flex lg:items-center lg:gap-1 lg:rounded-full lg:px-2 lg:py-0.5 lg:text-[9px] lg:font-semibold lg:normal-case lg:tracking-normal"
              : ""
          }`}
        >
          {desktopInline && (
            <span
              className="hidden size-1.5 shrink-0 rounded-full bg-current lg:block"
              aria-hidden="true"
            />
          )}
          {status}
        </span>
      </div>
    </div>
  );
}