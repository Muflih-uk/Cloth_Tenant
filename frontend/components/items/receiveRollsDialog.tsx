"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import Button from "@/components/ui/app/Button";
import { formatMeters, roundMetres, type VariantRollDraft } from "@/types/item";

/** One editable row: a length, and how many rolls of that length. */
export interface RollDraft {
  /** Metres entered for this roll; validated before anything is sent. */
  meters: string;
  /** How many rolls of this length. Blank counts as one. */
  count: string;
}

/** Ceilings so one delivery cannot ask for an unbounded number of rolls. */
const MAX_ROLLS_PER_ROW = 500;
const MAX_ROLLS_PER_DELIVERY = 1000;

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * One entry per real roll, the counts already expanded. Callers post this
   * straight to the API, so a row entered as `100 m x5` arrives as five rolls.
   */
  onConfirm: (rolls: VariantRollDraft[]) => Promise<void>;
  /** Shown in the header, e.g. `Cotton Cambric — Natural`. */
  label?: string;
  /**
   * Rolls to start from. Without this the rows always came up blank, so opening
   * a colour that already had its rolls typed in started from nothing.
   */
  initialRolls?: VariantRollDraft[];
}

/** A fresh row: one roll, no length typed yet. */
const blankRow = (): RollDraft => ({ meters: "", count: "1" });

/** Existing rolls become rows of one each, since that is how they were entered. */
const toRows = (rolls?: VariantRollDraft[]): RollDraft[] =>
  rolls?.length ? rolls.map((roll) => ({ ...roll, count: "1" })) : [blankRow()];

/** How many rolls a row stands for. Blank means the one roll it shows. */
export function rollCount(draft: RollDraft): number {
  const raw = draft.count.trim();
  if (raw === "") return 1;
  const count = Number(raw);
  return Number.isFinite(count) ? count : 0;
}

/**
 * Receive a delivery as one roll or several.
 *
 * A row is a length and how many rolls of it, because a factory delivery is
 * usually several rolls of the same length: `100 m x5` rather than five rows of
 * `100 m`. The counts are expanded here into one entry per roll, so the API, the
 * create form and the warehouse all still deal in real rolls.
 *
 * The whole delivery is sent in one request: the backend creates every roll and
 * adds every metre inside a single transaction, so a bad figure halfway down the
 * list leaves the warehouse exactly as it was rather than half-received.
 */
export default function ReceiveRollsDialog({
  open,
  onClose,
  onConfirm,
  label,
  initialRolls,
}: Props) {
  const [rolls, setRolls] = useState<RollDraft[]>(toRows(initialRolls));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /**
   * The rolls to start from, read through a ref so that only opening the dialog
   * reseeds the rows. Depending on the prop itself would also reseed whenever the
   * page rebuilt the array, which on the colour screen happens as the admin types
   * -- wiping the row being typed.
   */
  const seed = useRef(initialRolls);
  useEffect(() => {
    seed.current = initialRolls;
  }, [initialRolls]);

  /**
   * Reseeded on the way in, so reopening the dialog shows the rolls the colour
   * already has rather than the last thing typed into a closed one.
   */
  useEffect(() => {
    if (open) {
      setRolls(toRows(seed.current));
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const setRoll = (index: number, patch: Partial<RollDraft>) => {
    setRolls((prev) =>
      prev.map((roll, i) => (i === index ? { ...roll, ...patch } : roll)),
    );
    setError("");
  };

  const addRoll = () => setRolls((prev) => [...prev, blankRow()]);

  const removeRoll = (index: number) =>
    setRolls((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );

  /** Reject the same figures the backend would, before spending a request. */
  const validate = (): string => {
    let totalRolls = 0;
    for (let i = 0; i < rolls.length; i++) {
      const raw = rolls[i].meters.trim();
      const metres = Number(raw);
      if (raw === "" || !Number.isFinite(metres)) {
        return `Roll ${i + 1}: enter how many metres it holds.`;
      }
      if (metres <= 0) {
        return `Roll ${i + 1}: metres must be greater than zero.`;
      }
      if (metres > 99999999999.999) {
        return `Roll ${i + 1}: that is more metres than a roll can hold.`;
      }
      const rawCount = rolls[i].count.trim();
      if (rawCount !== "") {
        const count = Number(rawCount);
        if (!Number.isFinite(count) || !Number.isInteger(count)) {
          return `Roll ${i + 1}: how many rolls must be a whole number.`;
        }
        if (count < 1) {
          return `Roll ${i + 1}: enter at least one roll.`;
        }
        if (count > MAX_ROLLS_PER_ROW) {
          return `Roll ${i + 1}: that is more rolls than one delivery can hold.`;
        }
      }
      // Blank means the one roll the row shows, so it still counts.
      totalRolls += rollCount(rolls[i]);
    }
    if (totalRolls > MAX_ROLLS_PER_DELIVERY) {
      return `That is ${totalRolls} rolls. Receive at most ${MAX_ROLLS_PER_DELIVERY} at a time.`;
    }
    return "";
  };

  /** The rows expanded into one entry per real roll, for the API. */
  const expanded: VariantRollDraft[] = rolls.flatMap((roll) => {
    const meters = roll.meters.trim();
    return Array.from({ length: Math.max(1, rollCount(roll)) }, () => ({
      meters,
    }));
  });

  const total = roundMetres(
    rolls.reduce((sum, roll) => {
      const metres = Number(roll.meters);
      if (!Number.isFinite(metres)) return sum;
      return sum + metres * Math.max(1, rollCount(roll));
    }, 0),
  );

  const handleConfirm = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(expanded);
      setRolls([blankRow()]);
      onClose();
    } catch (e: unknown) {
      // The server's wording where it gave one, so a refusal reads as a sentence
      // about the delivery rather than a generic failure.
      const data = (
        e as
          | { response?: { data?: { error?: string; detail?: string } } }
          | undefined
      )?.response?.data;
      setError(data?.error || data?.detail || "Could not receive these rolls.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/35 backdrop-blur-sm px-4 pb-8 sm:items-center sm:pb-0"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[calc(100dvh-3rem)] w-full overflow-y-auto rounded-card border border-app-line bg-app-card shadow-float sm:max-h-[calc(100dvh-2rem)] sm:max-w-md">
        <div className="flex items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-app-ink">Receive Rolls</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-app-muted">
              {label ? `${label} — ` : ""}one row per roll length, with how many
              rolls of it. Metres are added only to this colour&apos;s on-hand rolls as soon as
              they are received.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="app-focus -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink disabled:opacity-50"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="h-px bg-app-line" />

        <div className="max-h-[45vh] space-y-2 overflow-y-auto px-4 py-4 sm:max-h-[50vh] sm:px-6 sm:py-5">
          {rolls.map((roll, index) => {
            const count = Math.max(1, rollCount(roll));
            return (
              <div
                key={index}
                className="rounded-control border border-app-line p-2 sm:rounded-none sm:border-0 sm:p-0"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-5 shrink-0 text-xs font-bold text-app-subtle">
                    {index + 1}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    inputMode="decimal"
                    placeholder="Metres"
                    value={roll.meters}
                    onChange={(e) => setRoll(index, { meters: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    disabled={saving}
                    className="min-w-0 flex-1 text-sm"
                    aria-label={`Roll ${index + 1} metres`}
                  />
                  <span className="shrink-0 text-xs text-app-subtle">×</span>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={roll.count}
                    onChange={(e) => setRoll(index, { count: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    disabled={saving}
                    className="w-14 shrink-0 text-sm sm:w-16"
                    aria-label={`Roll ${index + 1} count`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRoll(index)}
                    disabled={saving || rolls.length === 1}
                    className="app-focus flex size-11 shrink-0 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-brand-red/10 hover:text-brand-red disabled:opacity-30"
                    aria-label={`Remove roll ${index + 1}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {count > 1 && (
                  // Only worth saying once a row really is several rolls.
                  <p className="mt-1 pl-7 text-[10px] text-app-muted sm:text-[11px]">
                    = {count} rolls
                  </p>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addRoll}
            disabled={saving}
            className="app-focus flex h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-dashed border-app-line text-xs font-semibold text-app-muted transition-colors hover:border-brand-navy hover:text-brand-navy disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add another length
          </button>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-app-muted">
              {/* Rolls, not rows: one row can stand for several rolls. */}
              {expanded.length} roll{expanded.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs font-semibold text-app-ink">
              {formatMeters(String(total))} m total
            </p>
          </div>

          {error && (
            <p className="rounded-control bg-brand-red/10 px-3 py-2 text-xs font-semibold text-brand-red">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 px-4 pb-5 sm:gap-3 sm:px-6 sm:pb-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            loading={saving}
            className="flex-1"
          >
            {!saving && <Plus className="size-4" aria-hidden="true" />}
            {saving ? "Receiving…" : "Receive"}
          </Button>
        </div>
      </div>
    </div>
  );
}