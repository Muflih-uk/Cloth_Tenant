"use client";

import { formatMeters, toMeters } from "@/types/item";
import Button from "@/components/ui/app/Button";
import { EditTotalButton } from "./PriceOverrideDialog";

interface OrderTotalsProps {
  /** Total metres across every line, as a display string from the API. */
  totalMetres: string | number;
  totalLines: number;
  totalPrice: number;
  onPlaceOrder?: () => void;
  isLoading?: boolean;
  buttonText?: string;
  showButton?: boolean;
  /** The line arithmetic, shown struck through when the total was adjusted. */
  computedTotal?: number;
  isPriceOverridden?: boolean;
  /** Omitted when the order is not in a state where the total may be set. */
  onEditTotal?: () => void;
  isEditTotalDisabled?: boolean;
}

export default function OrderTotals({
  totalMetres,
  totalLines,
  totalPrice,
  onPlaceOrder,
  isLoading = false,
  buttonText = "Place Order",
  showButton = true,
  computedTotal,
  isPriceOverridden = false,
  onEditTotal,
  isEditTotalDisabled = false,
}: OrderTotalsProps) {
  return (
    <div className="rounded-card border border-brand-navy/15 bg-brand-navy/5 p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-app-muted">
        Order Summary
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold leading-none text-app-ink">
              {formatMeters(totalMetres)}
            </span>
            <span className="text-xs font-medium text-app-muted">m</span>
          </div>

          <span className="text-app-line">|</span>

          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold leading-none text-app-ink">
              {totalLines}
            </span>
            <span className="text-xs font-medium text-app-muted">
              {totalLines === 1 ? "line" : "lines"}
            </span>
          </div>

          <span className="text-app-line">|</span>

          <div className="flex items-baseline gap-2">
            {isPriceOverridden && computedTotal !== undefined && (
              <span className="text-sm font-semibold text-app-subtle line-through">
                ₹{Number(computedTotal).toLocaleString("en-IN")}
              </span>
            )}
            <span className="text-xl font-extrabold leading-none text-brand-navy">
              ₹{Number(totalPrice || 0).toLocaleString("en-IN")}
            </span>
            {onEditTotal && (
              <EditTotalButton
                onClick={onEditTotal}
                isOverridden={isPriceOverridden}
                disabled={isEditTotalDisabled}
              />
            )}
          </div>
        </div>

        {showButton && onPlaceOrder && (
          <Button
            onClick={onPlaceOrder}
            disabled={isLoading || toMeters(totalMetres) === 0}
            loading={isLoading}
            className="shrink-0 whitespace-nowrap"
          >
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
}
