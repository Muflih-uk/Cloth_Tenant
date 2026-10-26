"use client";

import { AlertTriangle, Info, Minus, Plus } from "lucide-react";
import { formatMeters, toMeters } from "@/types/item";

interface MetresSelectorProps {
  /** Held as a string so a half-metre cut is never rounded away mid-typing. */
  metres: string;
  onChange: (metres: string) => void;
  /** Physical stock in the warehouse; independent from order stock. */
  onHandMetres: number;
  onHandLabel?: string;
  /** Order stock, with this edited line's current reservation added back. */
  availableMetres: number;
  /** Metres already packed on the existing line; never released by under-packing. */
  alreadyPackedMetres?: number;
  isEditMode?: boolean;
}

const STEP = 0.5;

const nudge = (raw: string, delta: number) => {
  const next = toMeters(raw) + delta;
  return next <= 0 ? "0" : String(Number(next.toFixed(3)));
};

export default function MetresSelector({
  metres,
  onChange,
  onHandMetres,
  onHandLabel = "Physical stock",
  availableMetres,
  alreadyPackedMetres = 0,
  isEditMode,
}: MetresSelectorProps) {
  const requested = toMeters(metres);
  /**
   * Warn against what is left rather than what is on the shelf.
   *
   * Stock on hand is what the warehouse holds; availability is what is still
   * unclaimed, so it is the figure that says whether this order can actually be
   * filled. Two orders can each ask for more than remains and both be flagged,
   * which is the point -- packing decides who gets cloth, not this screen. So
   * this stays a note and never blocks the line.
   */
  const reservation = Math.max(requested, alreadyPackedMetres);
  const oversubscribed = reservation > availableMetres;
  const availableNegative = availableMetres < 0;

  return (
    <div>
      {isEditMode && (
        <div className="mb-4 flex items-center gap-3 rounded-control border border-status-pending/20 bg-status-pending/10 p-3 text-[color:var(--status-pending-text)]">
          <Info size={18} className="shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wider">
            This colour is already on the order. Saving changes that line.
          </p>
        </div>
      )}

      <div className="app-card mb-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-bold text-app-ink">Metres needed</h3>
          <div className="text-right">
            <p
              className={`text-xs font-bold ${
                availableNegative ? "text-brand-red" : "text-app-ink"
              }`}
              data-testid="available-metres"
            >
              {formatMeters(availableMetres)} m available to order
            </p>
            <p className="text-[11px] font-medium text-app-muted">
              {onHandLabel}: {formatMeters(onHandMetres)} m
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onChange(nudge(metres, -STEP))}
            disabled={requested <= 0}
            aria-label={`Decrease by ${STEP} metres`}
            className="app-focus flex size-11 items-center justify-center rounded-control border border-app-line bg-app-card font-bold text-app-muted transition-colors hover:bg-app-soft disabled:opacity-40"
          >
            <Minus size={20} aria-hidden="true" />
          </button>

          <div className="flex items-baseline gap-1.5">
            <input
              type="number"
              inputMode="decimal"
              step={STEP}
              min={0}
              aria-label="Metres needed"
              value={metres}
              onChange={(e) => onChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="app-focus h-12 w-24 rounded-control border border-app-line bg-app-card text-center text-2xl font-extrabold text-app-ink outline-none transition-colors focus:border-brand-navy [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-sm font-bold text-app-muted">m</span>
          </div>

          <button
            type="button"
            onClick={() => onChange(nudge(metres, STEP))}
            aria-label={`Increase by ${STEP} metres`}
            className="app-focus flex size-11 items-center justify-center rounded-control bg-brand-navy font-bold text-white transition-colors hover:bg-brand-navy/90"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {[50, 100, 150, 200].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(String(preset))}
              className="app-focus h-11 flex-1 rounded-control border border-app-line bg-app-card text-[11px] font-bold text-app-muted transition-colors hover:border-brand-navy/30 hover:text-brand-navy"
            >
              {preset} m
            </button>
          ))}
        </div>
      </div>

      {oversubscribed && (
        <div className="mb-4 flex items-start gap-3 rounded-control border border-status-pending/20 bg-status-pending/10 p-4 text-[color:var(--status-pending-text)]">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold uppercase leading-relaxed tracking-wider">
            {availableNegative ? (
              <>
                Already oversold by {formatMeters(Math.abs(availableMetres))} m
                against existing orders. Adding {formatMeters(reservation)} m
                takes it further.
              </>
            ) : (
              <>
                More than is free ({formatMeters(reservation)} m asked,{" "}
                {formatMeters(availableMetres)} m available). The order can still
                go ahead — packing will allocate what is available and the rest
                stays owed.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
