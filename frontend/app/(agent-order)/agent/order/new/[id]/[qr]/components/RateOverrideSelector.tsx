"use client";

import { Info, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";

interface RateOverrideSelectorProps {
  /** The fabric's catalogue rate — what every other customer pays. */
  catalogRate: string;
  /** Held as a string so a half-rupee rate is never rounded away mid-typing. */
  value: string;
  onChange: (rate: string) => void;
  /** An admin may bill above catalogue; an agent may only discount. */
  canRaiseRate?: boolean;
  /** True once this line already carries an agreed rate. */
  isOverridden?: boolean;
}

const rupees = (raw: string) =>
  Number(raw || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Two rates are the same money when they agree to the paisa. */
const sameRate = (a: string, b: string) =>
  Number(a || 0).toFixed(2) === Number(b || 0).toFixed(2);

export default function RateOverrideSelector({
  catalogRate,
  value,
  onChange,
  canRaiseRate,
  isOverridden,
}: RateOverrideSelectorProps) {
  const overridden = !sameRate(value, catalogRate);
  const difference = Number(value || 0) - Number(catalogRate || 0);
  const tooHigh = !canRaiseRate && difference > 0;

  return (
    <div className="app-card mb-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-app-ink">Rate per metre</h3>
        <span className="text-xs font-medium text-app-muted">
          Catalogue ₹{rupees(catalogRate)}/m
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-sm font-bold text-app-muted">₹</span>
        <input
          type="number"
          inputMode="decimal"
          step={0.5}
          min={0}
          aria-label="Rate per metre"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="app-focus h-12 w-32 rounded-control border border-app-line bg-app-card text-center text-2xl font-extrabold text-app-ink outline-none transition-colors focus:border-brand-navy [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-sm font-bold text-app-muted">/m</span>
      </div>

      {overridden && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs font-bold ${
              difference < 0
                ? "text-[color:var(--status-dispatched-text)]"
                : "text-[color:var(--status-pending-text)]"
            }`}
          >
            {difference < 0 ? (
              <TrendingDown
                size={14}
                className="shrink-0"
                aria-hidden="true"
              />
            ) : (
              <TrendingUp size={14} className="shrink-0" aria-hidden="true" />
            )}
            {difference < 0 ? "−" : "+"}₹
            {rupees(String(Math.abs(difference)))} vs catalogue
          </span>
          <button
            type="button"
            onClick={() => onChange(catalogRate)}
            className="app-focus inline-flex h-11 min-h-11 items-center gap-1.5 rounded-control border border-app-line bg-app-card px-3 text-[11px] font-bold text-app-muted transition-colors hover:border-brand-navy/30 hover:text-brand-navy"
          >
            <RotateCcw size={12} aria-hidden="true" />
            Catalogue rate
          </button>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 text-app-muted">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[11px] font-medium leading-relaxed">
          {isOverridden
            ? "This line is already priced at an agreed rate. Changing it here only affects this order."
            : "Change this to price it for this customer only. The item keeps its catalogue rate for everyone else."}
        </p>
      </div>

      {tooHigh && (
        <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-brand-red">
          An agent cannot charge more than the catalogue rate of ₹
          {rupees(catalogRate)}/m
        </p>
      )}
    </div>
  );
}
