"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { getRolls, peekRolls } from "@/lib/rollsCache";
import { toastError } from "@/lib/toast";
import { formatMeters } from "@/types/item";
import type { FabricRoll, VariantRollsResponse } from "@/types/item";
import Button from "@/components/ui/app/Button";
import RollSummary from "./rollSummary";
import RollLabelDialog, { RollLabelsDialog } from "./rollLabelDialog";

interface Props {
  variantId: number;
  /** Colour label, used in the headings. */
  label: string;
}

/**
 * One colour's physical rolls, as read from the Inventory page.
 *
 * This is a reading of the rolls, not a place to change them: the rows are the
 * Physical Rolls panel's own, and the labels are its own label, so what the
 * warehouse reads here is the same wording as on the Edit Inventory screen. What
 * it does not bring with it is any of the panel's editing -- receiving and
 * adjusting stay where they are, on the fabric form, because this list is for
 * looking up a roll number and printing its label.
 *
 * The stock list that builds this page carries no roll counts, so the rolls are
 * read once when the colour is opened rather than guessed at from the metre
 * figure. Fetched on mount and left alone afterwards, which is the same read the
 * panel makes.
 */
/**
 * What the read has got so far. The colour's identity is carried in the state
 * rather than cleared on a new colour, so asking about one colour never writes to
 * the screen on the way to the spinner.
 */
type RollsState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "loaded"; variant: number; rolls: VariantRollsResponse };

export default function VariantRollsList({ variantId, label }: Props) {
  // Seeded from the shared cache: a colour re-opened within its lifetime renders
  // on this line rather than after a round trip, which is the whole point of the
  // spinner being rare rather than absent.
  const [state, setState] = useState<RollsState>(() => {
    const cached = peekRolls(variantId);
    return cached
      ? { status: "loaded", variant: variantId, rolls: cached }
      : { status: "loading" };
  });
  const [printing, setPrinting] = useState(false);
  /** The one roll whose label is open, when a single roll is being printed. */
  const [printingRoll, setPrintingRoll] = useState<FabricRoll | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Both paths go through the cache, so a colour already in memory resolves on
    // the microtask rather than blocking on the network -- and the spinner is only
    // ever reached when there is genuinely nothing to show yet.
    getRolls(variantId)
      .then((rolls) => {
        if (!cancelled) setState({ status: "loaded", variant: variantId, rolls });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ status: "failed" });
        toastError("Failed to load rolls", e);
      });
    return () => {
      cancelled = true;
    };
  }, [variantId]);

  if (state.status === "failed") {
    return (
      <p className="mt-2 text-[11px] text-app-muted">
        Could not load this colour&apos;s rolls.
      </p>
    );
  }

  // Still reading, or reading a colour other than the one on screen.
  if (state.status !== "loaded" || state.variant !== variantId) {
    return (
      <div className="mt-2 flex items-center gap-2 text-[11px] text-app-muted">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        Loading rolls…
      </div>
    );
  }

  const data = state.rolls;
  const rolls = data.rolls ?? [];
  // The label is scanned to pick one exact roll into a packing round, so a roll
  // that has been cut to zero has nothing left to pick and is not labelled.
  const activeRolls: FabricRoll[] = rolls.filter(
    (roll) => roll.is_active && !roll.is_exhausted,
  );

  return (
    <div className="mt-2 border-t border-app-line pt-2 lg:mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-3 lg:gap-y-2 lg:pt-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 lg:col-start-1 lg:row-start-1 lg:min-w-0 lg:flex-col lg:items-start lg:gap-0">
        <p className="text-[9px] uppercase tracking-widest text-app-subtle lg:text-[10px]">
          Physical Rolls
        </p>
        <p className="text-[11px] font-bold text-app-muted lg:text-xs">
          <span className={rolls.length === 0 ? "lg:hidden" : ""}>
            {rolls.length === 0
              ? "none yet"
              : `${formatMeters(data.roll_stock_meters)} m · ${data.roll_count} roll${
                  data.roll_count === 1 ? "" : "s"
                }`}
          </span>
          {rolls.length === 0 && (
            <span className="hidden lg:inline">0 m · 0 rolls</span>
          )}
        </p>
      </div>

      {rolls.length === 0 ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-app-muted lg:col-span-2 lg:row-start-2 lg:mt-0 lg:rounded-control lg:bg-app-soft/60 lg:px-3 lg:py-4 lg:text-center">
          This colour has no physical rolls. Receive them from the Edit
          Inventory screen.
        </p>
      ) : (
        <div className="mt-1.5 space-y-1 lg:col-span-2 lg:row-start-2 lg:mt-0 lg:block lg:max-h-[15.5rem] lg:space-y-0 lg:divide-y lg:divide-app-line lg:overflow-y-auto lg:pr-1">
          {rolls.map((roll) => (
            <div
              key={roll.id}
              className="flex items-center gap-1.5 rounded-control border border-app-line bg-app-card px-2 py-1.5 sm:gap-2 sm:px-2.5 lg:h-10 lg:flex-nowrap lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-1 lg:py-0"
            >
              <RollSummary roll={roll} desktopInline />
              {/*
                One roll's label, on request. This is offered on every roll
                including a used-up one, unlike the print-all button: printing a
                specific roll is a deliberate ask for that roll -- a replacement
                label for a roll being re-tagged, or the warehouse's record of one
                that is done -- whereas a sheet of every roll is only worth printing
                for cloth that can still be picked.
              */}
              <button
                type="button"
                onClick={() => setPrintingRoll(roll)}
                className="app-focus flex size-11 shrink-0 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-brand-navy lg:ml-auto lg:size-8"
                aria-label={`Print label for ${roll.roll_number}`}
                title="View/print label"
              >
                <Printer className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Nothing to print without a roll, so the button only exists when there is
          at least one that could still be picked. */}
      {activeRolls.length > 0 && !printing && (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => setPrinting(true)}
          aria-label="Print all QR labels"
          title="Print all QR labels"
          className="mt-2 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:h-8 lg:min-h-8 lg:w-auto lg:justify-self-end lg:gap-1 lg:px-2.5 lg:text-[11px]"
        >
          <Printer className="size-4 lg:size-3.5" aria-hidden="true" />
          <span className="lg:hidden">Print all QR labels</span>
          <span className="font-normal text-app-muted lg:hidden">
            ({activeRolls.length})
          </span>
          <span className="hidden lg:inline">Print all</span>
          <span className="hidden text-[10px] font-normal text-app-muted lg:inline">
            ({activeRolls.length})
          </span>
        </Button>
      )}

      {printing && (
        <RollLabelsDialog
          rolls={activeRolls}
          fabric={data.fabric || label}
          displayOrder={data.display_order}
          onClose={() => setPrinting(false)}
        />
      )}

      {printingRoll && (
        <RollLabelDialog
          roll={printingRoll}
          fabric={data.fabric || label}
          displayOrder={data.display_order}
          onClose={() => setPrintingRoll(null)}
        />
      )}
    </div>
  );
}