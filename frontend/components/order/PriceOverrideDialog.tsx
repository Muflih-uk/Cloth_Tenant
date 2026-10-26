"use client";

import { useMemo, useState } from "react";
import { IndianRupee, Pencil } from "lucide-react";

import { Modal, ModalButton } from "@/components/ui/custom/Modals";
import { Input } from "@/components/ui/input";
import {
  discountPercent,
  formatRupees,
  hasMeaningfulChange,
  validateOverrideReason,
  validatePriceOverride,
} from "@/lib/priceOverride";

interface PriceOverrideDialogProps {
  /** The order total from the line arithmetic. The cap for an agent. */
  computedTotal: number;
  /** The figure currently billed -- the override when one exists. */
  currentTotal: number;
  isOverridden: boolean;
  /** Admins may set any total; agents may only reduce it. */
  canRaise: boolean;
  isSaving?: boolean;
  onSave: (total: number, reason: string) => void;
  onClose: () => void;
}

/**
 * Set the total an order is placed with. Reachable only while the order is
 * still a draft, because once placed the number is a commitment.
 */
export default function PriceOverrideDialog({
  computedTotal,
  currentTotal,
  isOverridden,
  canRaise,
  isSaving = false,
  onSave,
  onClose,
}: PriceOverrideDialogProps) {
  // The parent mounts this only while it is open, so these initialisers are the
  // re-seed: a cancelled or saved edit cannot leak into the next open.
  const [raw, setRaw] = useState(String(round2(currentTotal)));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const check = useMemo(
    () => validatePriceOverride({ raw, computedTotal, canRaise }),
    [raw, computedTotal, canRaise],
  );

  const reasonError = validateOverrideReason(reason);
  const typed = check.ok ? check.total : 0;
  const saving = isSaving || !hasMeaningfulChange(typed, computedTotal, isOverridden);

  return (
    <Modal
      icon={<IndianRupee size={18} className="text-brand-navy" />}
      iconBg="bg-brand-navy/10"
      title={isOverridden ? "Adjust order total" : "Set order total"}
      description={`Order total from the lines is ${formatRupees(computedTotal)}.${canRaise ? "" : " You can reduce it, not increase it."}`}
      onClose={onClose}
      actions={
        <>
          <ModalButton variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            disabled={saving || !!reasonError || !check.ok}
            onClick={() => {
              if (!check.ok) {
                setError(check.error);
                return;
              }
              if (reasonError) {
                setError(reasonError);
                return;
              }
              setError(null);
              onSave(check.total, reason.trim());
            }}
          >
            {isSaving ? "Saving…" : "Save total"}
          </ModalButton>
        </>
      }
    >
      <div className="pt-1">
        <label
          htmlFor="price-override-total"
          className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
        >
          Total
        </label>
        <div className="relative">
          <IndianRupee
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
          />
          <Input
            id="price-override-total"
            type="text"
            inputMode="decimal"
            autoFocus
            value={raw}
            aria-invalid={Boolean(error && !check.ok)}
            onChange={(e) => {
              setRaw(e.target.value);
              setError(null);
            }}
            className="pl-9 font-bold"
          />
        </div>

        {check.ok && discountPercent(check.total, computedTotal) > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-[color:var(--status-dispatched-text)]">
            {discountPercent(check.total, computedTotal)}% discount &middot;{" "}
            {formatRupees(round2(computedTotal - check.total))} off
          </p>
        )}

        <label
          htmlFor="price-override-reason"
          className="mt-3 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
        >
          Reason <span className="font-normal normal-case">(optional)</span>
        </label>
        <Input
          id="price-override-reason"
          type="text"
          value={reason}
          maxLength={220}
          placeholder="Negotiated rate, bulk discount…"
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
        />

        {error && (
          <p className="mt-2 text-xs font-semibold text-brand-red">{error}</p>
        )}
      </div>
    </Modal>
  );
}

/** A small inline trigger, so the wizard does not need its own button styling. */
export function EditTotalButton({
  onClick,
  isOverridden,
  disabled,
}: {
  onClick: () => void;
  isOverridden: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="app-focus inline-flex h-11 min-h-11 items-center gap-1 rounded-control px-2 text-xs font-bold text-brand-navy transition-colors hover:bg-brand-navy/10 disabled:opacity-40"
    >
      <Pencil size={12} />
      {isOverridden ? "Adjusted" : "Edit total"}
    </button>
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
