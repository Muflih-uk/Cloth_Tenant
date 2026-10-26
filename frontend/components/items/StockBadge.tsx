"use client";

import { formatMeters } from "@/types/item";

interface StockBadgeProps {
  total: number;
  /** Available-to-order metres. Defaults to `total` when omitted. */
  available?: number;
  /** Unit suffix after the figure. Cloth is metres; orders use none. */
  unit?: string;
  physicalLabel?: string;
  untrackedPhysical?: number;
  showLabel?: boolean;
  lowThreshold?: number;
  size?: "sm" | "md" | "lg";
}

/**
 * A colour's inventory: available-to-order metres and on-hand metres.
 *
 * The headline is what is still available, since that is what moves when an
 * order is placed and what an admin scanning the list is actually judging. The
 * warehouse total sits underneath it so the real cloth on the shelf is never
 * lost. A negative figure is styled as an error because it means orders have
 * promised more than exists -- worth spotting on the list rather than only
 * while taking an order.
 */
export default function StockBadge({
  total,
  available,
  unit,
  physicalLabel = "On rolls",
  untrackedPhysical = 0,
  showLabel = true,
  lowThreshold = 50,
  size = "md",
}: StockBadgeProps) {
  const orderable = available === undefined ? total : available;
  const isOversold = orderable < 0;
  const isZero = orderable <= 0;
  const isLow = orderable > 0 && orderable <= lowThreshold;

  const colorClass = isOversold
    ? "text-brand-red"
    : isZero
      ? "text-brand-red"
      : isLow
        ? "text-[color:var(--status-pending-text)]"
        : "text-[color:var(--status-dispatched-text)]";

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  };

  const labelSizeClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1">
        <span className={`font-extrabold ${sizeClasses[size]} ${colorClass}`}>
          {formatMeters(orderable)}
          {unit ? ` ${unit}` : ""}
        </span>
        {showLabel && (
          <span className={`text-app-muted ${labelSizeClasses[size]}`}>
            Available to order
          </span>
        )}
      </div>
      {/* The physical total remains visible beside the order balance. */}
      <p className={`text-app-muted ${labelSizeClasses[size]}`}>
        {physicalLabel}: {formatMeters(total)}
        {unit ? ` ${unit}` : ""}
      </p>
      {untrackedPhysical > 0 && (
        <p
          className={`text-[color:var(--status-pending-text)] ${labelSizeClasses[size]}`}
        >
          Untracked physical (not packable): {formatMeters(untrackedPhysical)}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}