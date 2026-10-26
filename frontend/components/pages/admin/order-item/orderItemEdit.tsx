"use client";

import { useEffect, useState } from "react";
import { Pencil, TriangleAlert } from "lucide-react";
import { Modal, ModalButton } from "@/components/ui/custom/Modals";
import { fabricApi } from "@/lib/api/item";
import { OrderItem } from "@/types/order";
import { VariantAllItem, formatMeters, toMeters } from "@/types/item";
import { Input } from "@/components/ui/input";

interface OrderItemEditModalProps {
  item: OrderItem;
  metres: string;
  variantId: number | null;
  metresError: string | null;
  setMetres: (value: string) => void;
  setVariantId: (value: number | null) => void;
  setMetresError: (value: string | null) => void;
  onClose: () => void;
  onSave: () => void;
  /** True while the save is in flight, so the buttons can lock. */
  saving?: boolean;
  /**
   * Metres of this line's colour still orderable, as the server sees it with the
   * order in its current state. Compared against the retyped quantity to warn
   * about overselling. Omitted when the server did not send it, which just hides
   * the warning rather than guessing.
   */
  availableMeters?: string | null;
}

/**
 * Edit one fabric line: how many metres the customer needs, and which colour.
 * Everything else about the line -- rate, allocation -- follows from those two.
 */
const OrderItemEditModal: React.FC<OrderItemEditModalProps> = ({
  item,
  metres,
  variantId,
  metresError,
  setMetres,
  setVariantId,
  setMetresError,
  onClose,
  onSave,
  saving = false,
  availableMeters,
}) => {
  const [colours, setColours] = useState<VariantAllItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const all = await fabricApi.getAllVariants();
        if (cancelled) return;
        setColours(all.filter((variant) => variant.fabric_id === item.fabric));
      } catch {
        // Leave the colour list empty; the metres field still works.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [item.fabric]);

  const alreadyPacked = toMeters(item.allocated_quantity);
  const selected = colours.find((colour) => colour.id === variantId);
  const currentReservation = Math.max(
    toMeters(item.ordered_quantity),
    alreadyPacked,
  );
  const editCapacity =
    availableMeters === undefined || availableMeters === null
      ? 0
      : toMeters(availableMeters) + currentReservation;
  const nextReservation = Math.max(toMeters(metres), alreadyPacked);

  /**
   * Where this colour's orderable metres land once the typed quantity is saved.
   *
   * The current line reserves the greater of ordered or allocated metres.
   * Under-packing cannot release its allocated portion, and over-packing is
   * reserved through the allocated figure.
   */
  const projectedAvailability =
    availableMeters === undefined || availableMeters === null
      ? 0
      : editCapacity - nextReservation;

  return (
    <Modal
      icon={<Pencil size={18} className="text-brand-navy" />}
      iconBg="bg-brand-navy/10"
      title={`Edit ${item.fabric_name}`}
      description={
        alreadyPacked > 0
          ? `${formatMeters(alreadyPacked)} m already packed. The order cannot be reduced below that.`
          : "Set the metres this customer needs."
      }
      onClose={onClose}
      actions={
        <>
          <ModalButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </ModalButton>
          <ModalButton variant="primary" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="line-metres"
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
          >
            Metres required
          </label>
          <Input
            id="line-metres"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            autoFocus
            value={metres}
            aria-invalid={Boolean(metresError)}
            onChange={(event) => {
              setMetres(event.target.value);
              if (metresError) setMetresError(null);
            }}
          />
          {metresError ? (
            <p className="mt-1.5 text-xs font-medium text-brand-red">
              {metresError}
            </p>
          ) : availableMeters !== undefined && availableMeters !== null ? (
            /* Advisory only. Demand outrunning supply is a real, allowed state
               here -- the shortage is arbitrated at packing -- so this says so
               and never blocks the save. It uses the amber triangle already
               used for order warnings rather than inventing a style. */
            projectedAvailability < 0 ? (
              <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-[color:var(--status-pending-text)]">
                <TriangleAlert size={13} className="mt-px flex-shrink-0" />
                <span>
                  {editCapacity < 0
                    ? `Already oversold by ${formatMeters(
                        Math.abs(editCapacity),
                      )} m on other orders. `
                    : `Only ${formatMeters(editCapacity)} m available to this line. `}
                  This line would take it to {formatMeters(projectedAvailability)}{" "}
                  m. You can still proceed.
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-xs font-medium text-app-muted">
                {formatMeters(editCapacity)} m of this colour
                available for ordering
              </p>
            )
          ) : selected ? (
            <p className="mt-1.5 text-xs font-medium text-app-muted">
              {formatMeters(selected.stock_meters)} m of this colour in stock
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="line-colour"
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
          >
            Colour
          </label>
          {loading ? (
            <p className="text-xs font-medium text-app-muted">
              Loading colours…
            </p>
          ) : (
            <select
              id="line-colour"
              value={variantId ?? ""}
              onChange={(event) =>
                setVariantId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="app-focus h-12 w-full rounded-control border border-app-line bg-app-card px-3.5 text-sm font-medium text-app-ink outline-none transition-colors"
            >
              {colours.map((colour) => (
                <option key={colour.id} value={colour.id}>
                  {colour.display_order || `Colour #${colour.id}`} ·{" "}
                  {formatMeters(colour.stock_meters)} m
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OrderItemEditModal;
