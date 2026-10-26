"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Scale,
} from "lucide-react";
import { rollApi } from "@/lib/api/item";
import { toastError, toastSuccess } from "@/lib/toast";
import { formatMeters } from "@/types/item";
import type {
  FabricRoll,
  VariantRollDraft,
  VariantRollsResponse,
} from "@/types/item";
import ReceiveRollsDialog from "./receiveRollsDialog";
import RollLabelDialog from "./rollLabelDialog";
import RollSummary from "./rollSummary";

interface Props {
  variantId: number;
  embedded?: boolean;
  /** Colour label, used in headings and dialogs. */
  label: string;
  /**
   * Called after a roll change so the row's roll and carryover figures stay current.
   *
   * The roll count travels with it because the badge above the panel quotes the
   * same number: sending only the metres left the badge reading the count the
   * page loaded with, so it said "0 rolls" over a panel showing one.
   */
  onStockChanged?: (
    stockMeters: string,
    rollCount: number,
    untrackedStockMeters: string,
    isRollTracked: boolean,
  ) => void;
  onData?: (data: VariantRollsResponse) => void;
  receiveOpen?: boolean;
  onReceiveOpenChange?: (open: boolean) => void;
}

/**
 * The physical rolls of one colour.
 *
 * This is the only place a roll-tracked colour's metre total changes: receiving
 * a delivery, correcting a miscount, printing the label that goes on the roll, and
 * seeing what is left on each roll. A colour that has no rolls keeps the plain
 * editable figure on the fabric form, so this panel is exactly the physical-roll
 * view and nothing else.
 */
export default function PhysicalRollsPanel({
  variantId,
  embedded = false,
  label,
  onStockChanged,
  onData,
  receiveOpen,
  onReceiveOpenChange,
}: Props) {
  const [data, setData] = useState<VariantRollsResponse | null>(null);
  /**
   * Which colour the figures on screen belong to. Comparing it with the colour
   * being asked about is what drives the spinner, so switching colour shows it
   * again without a state write inside the effect.
   */
  const [shownVariant, setShownVariant] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [localReceiveOpen, setLocalReceiveOpen] = useState(false);
  const [labelFor, setLabelFor] = useState<FabricRoll | null>(null);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [syncingStock, setSyncingStock] = useState(false);

  /**
   * The parent's callback, held in a ref so it is not an effect dependency.
   *
   * The inventory page passes an inline arrow, so a new function arrives on every
   * render. Listed as a dependency it would restart this effect after every
   * load, and the load reports the figure back up, and the page re-renders --
   * an endless refetch. Reading it through a ref breaks that circle: the effect
   * depends on the colour alone, and still reaches the latest callback.
   */
  const notifyStock = useRef(onStockChanged);
  useEffect(() => {
    notifyStock.current = onStockChanged;
  }, [onStockChanged]);

  const notifyData = useRef(onData);
  useEffect(() => {
    notifyData.current = onData;
  }, [onData]);

  const isReceiveOpen = receiveOpen ?? localReceiveOpen;
  const setReceiveOpen = (open: boolean) => {
    if (onReceiveOpenChange) onReceiveOpenChange(open);
    else setLocalReceiveOpen(open);
  };

  const fetchRolls = useCallback(
    () => rollApi.getForVariant(variantId),
    [variantId],
  );

  useEffect(() => {
    let cancelled = false;
    fetchRolls()
      .then((rolls) => {
        if (cancelled) return;
        setData(rolls);
        notifyStock.current?.(
          rolls.stock_meters,
          rolls.roll_count,
          rolls.untracked_stock_meters ?? "0",
          rolls.is_roll_tracked,
        );
        notifyData.current?.(rolls);
      })
      .catch((e) => {
        if (!cancelled) toastError("Failed to load rolls", e);
      })
      .finally(() => {
        if (!cancelled) setShownVariant(variantId);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRolls, variantId]);

  /** The same read again, for the refresh button. */
  const load = async () => {
    try {
      const rolls = await fetchRolls();
      setData(rolls);
      notifyStock.current?.(
        rolls.stock_meters,
        rolls.roll_count,
        rolls.untracked_stock_meters ?? "0",
        rolls.is_roll_tracked,
      );
      notifyData.current?.(rolls);
    } catch (e) {
      toastError("Failed to load rolls", e);
    } finally {
      setShownVariant(variantId);
    }
  };

  const syncStock = async () => {
    setSyncingStock(true);
    try {
      const result = await rollApi.syncStock(variantId);
      setData((current) =>
        current ? { ...current, stock_meters: result.stock_meters } : current,
      );
      notifyStock.current?.(
        result.stock_meters,
        result.roll_count,
        result.untracked_stock_meters ?? "0",
        result.is_roll_tracked,
      );
      toastSuccess("On-hand stock synced from rolls");
    } catch (e) {
      toastError("Could not sync on-hand stock", e);
    } finally {
      setSyncingStock(false);
    }
  };

  const submitReceive = async (drafts: VariantRollDraft[]) => {
    if (drafts.length === 1) {
      await rollApi.receive(variantId, { meters: drafts[0].meters });
      toastSuccess(`Received ${formatMeters(drafts[0].meters)} m`);
    } else {
      const result = await rollApi.bulkReceive(variantId, drafts);
      toastSuccess(
        `Received ${result.created} rolls, ${formatMeters(result.total_meters)} m`,
      );
    }
    await load();
  };

  /**
   * Receiving always adds. A colour opened with a plain metre figure keeps it --
   * the API records that figure as a roll of its own, so it can still be cut and
   * still counts towards the roll total.
   */
  const handleReceive = async (drafts: VariantRollDraft[]) => {
    try {
      await submitReceive(drafts);
    } catch (e) {
      // Re-throw so the dialog can show the message beside the rows it came from.
      throw e;
    }
  };

  const handleAdjust = async (roll: FabricRoll) => {
    const delta = adjustValue.trim();
    if (Number(delta) === 0) {
      toastError("Enter a different figure to adjust this roll");
      return;
    }
    try {
      await rollApi.adjust(roll.id, delta);
      toastSuccess(`${roll.roll_number} adjusted`);
      setAdjusting(null);
      setAdjustValue("");
      await load();
    } catch (e) {
      toastError("Could not adjust this roll", e);
    }
  };

  if (shownVariant !== variantId) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading rolls…
      </div>
    );
  }

  if (!data) return null;

  const rolls = data.rolls ?? [];
  const hasRolls = rolls.length > 0;

  return (
    <div
      className={
        embedded
          ? "border-t border-gray-200 bg-white/70"
          : "border border-gray-100 rounded-2xl bg-white overflow-hidden"
      }
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center gap-2.5 text-left transition-colors hover:bg-gray-50 sm:gap-3 ${
          embedded ? "px-3 py-2.5" : "px-3 py-2.5 sm:px-4 sm:py-3"
        }`}
        aria-expanded={expanded}
      >
        <Package className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Physical Rolls
          </p>
          <p className="truncate text-[13px] font-semibold text-gray-700 sm:text-sm">
            {hasRolls
              ? `Total: ${formatMeters(data.roll_stock_meters)} m · ${data.roll_count} roll${data.roll_count === 1 ? "" : "s"}`
              : "No rolls received yet"}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div
          className={`space-y-3 border-t border-gray-100 pb-3 sm:pb-4 ${
            embedded ? "px-3" : "px-3 sm:px-4"
          }`}
        >
          {hasRolls &&
            Number(data.stock_meters) !== Number(data.roll_stock_meters) && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-800">
                  Inventory on hand ({formatMeters(data.stock_meters)} m) does
                  not match these rolls ({formatMeters(data.roll_stock_meters)} m).
                </p>
                <button
                  type="button"
                  onClick={syncStock}
                  disabled={syncingStock}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
                >
                  {syncingStock ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync on hand
                </button>
              </div>
            )}
          {hasRolls && (
            <div className="grid grid-cols-2 gap-2 pt-3 text-center">
              <Stat
                label="On hand"
                metres={data.roll_stock_meters}
                hint="on the rolls"
              />
              <Stat
                label="Packed out"
                metres={data.packed_meters ?? data.consumed_meters}
                hint="cut for orders"
              />
            </div>
          )}

          {hasRolls ? (
            <div className="space-y-1.5">
              {rolls.map((roll) => (
                <div
                  key={roll.id}
                  className="rounded-xl border border-gray-100 px-2.5 py-2 sm:px-3"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <RollSummary roll={roll} />
                    <button
                      type="button"
                      onClick={() => setLabelFor(roll)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-primary/5 hover:text-primary sm:h-8 sm:w-8"
                      aria-label={`Print label for ${roll.roll_number}`}
                      title="View/print label"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjusting(adjusting === roll.id ? null : roll.id);
                        setAdjustValue("");
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-primary/5 hover:text-primary sm:h-8 sm:w-8"
                      aria-label={`Adjust ${roll.roll_number}`}
                      title="Adjust metres"
                    >
                      <Scale className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {adjusting === roll.id && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-dashed border-gray-100 pt-2 sm:gap-2">
                      <input
                        type="number"
                        step="0.001"
                        inputMode="decimal"
                        placeholder="e.g. -12.5 to correct, 10 to add"
                        value={adjustValue}
                        onChange={(e) => setAdjustValue(e.target.value)}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 text-xs outline-none focus:border-primary sm:px-3"
                        aria-label={`Adjustment for ${roll.roll_number}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleAdjust(roll)}
                        className="h-9 shrink-0 rounded-lg bg-primary px-2.5 text-xs font-bold text-white disabled:opacity-40 sm:px-3"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjusting(null)}
                        className="h-9 shrink-0 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-500 sm:px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setReceiveOpen(true)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-white shadow-lg shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Receive Rolls
            </button>
            <button
              type="button"
              onClick={load}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500"
              aria-label="Refresh rolls"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <ReceiveRollsDialog
        open={isReceiveOpen}
        onClose={() => setReceiveOpen(false)}
        onConfirm={handleReceive}
        label={label}
      />

      {labelFor && (
        <RollLabelDialog
          roll={labelFor}
          fabric={data.fabric || label}
          displayOrder={data.display_order}
          onClose={() => setLabelFor(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, metres, hint }: { label: string; metres: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-gray-50 px-1.5 py-2 sm:px-2">
      <p className="truncate text-[8px] uppercase tracking-wide text-gray-400 sm:text-[9px] sm:tracking-widest">
        {label}
      </p>
      <p className="truncate text-[13px] font-black text-gray-700 sm:text-sm">
        {formatMeters(metres)}
      </p>
      <p className="truncate text-[9px] text-gray-400 sm:text-[10px]">{hint}</p>
    </div>
  );
}
