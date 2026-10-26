"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer, QrCode } from "lucide-react";
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
    <div className="mt-2 border-t border-app-line pt-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <p className="text-[9px] uppercase tracking-widest text-app-subtle">
          Physical Rolls
        </p>
        <p className="text-[11px] font-bold text-app-muted">
          {rolls.length === 0
            ? "none yet"
            : `${formatMeters(data.roll_stock_meters)} m · ${data.roll_count} roll${
                data.roll_count === 1 ? "" : "s"
              }`}
        </p>
      </div>

      {rolls.length === 0 ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-app-muted">
          This colour has no physical rolls. Receive them from the Edit
          Inventory screen.
        </p>
      ) : (
        <div className="mt-1.5 space-y-1">
          {rolls.map((roll) => (
            <div
              key={roll.id}
              className="flex items-center gap-1.5 rounded-control border border-app-line bg-app-card px-2 py-1.5 sm:gap-2 sm:px-2.5"
            >
              <RollSummary roll={roll} />
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
                className="app-focus flex size-11 shrink-0 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-brand-navy"
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
          className="mt-2"
        >
          <QrCode className="size-3.5" aria-hidden="true" />
          Print all QR labels
          <span className="font-normal text-app-muted">
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