"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
} from "lucide-react";

import { ImagePreview } from "@/components/pages/ImagePreview";
import type { OrderItem } from "@/types/order";
import { formatMeters, toMeters } from "@/types/item";
import { orderItemColorSuffix } from "@/lib/colorLabel";
import { Spinner } from "@/components/ui/spinner";
import { outstandingMeters } from "@/lib/utils/orderItemSort";
import { Modal, ModalButton } from "@/components/ui/custom/Modals";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DeleteConfirmDialogProps {
  item: OrderItem;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  item,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <Modal
      icon={<AlertTriangle className="size-5" aria-hidden="true" />}
      iconBg="bg-brand-red/10 text-brand-red"
      title="Remove this fabric?"
      description="This action cannot be undone."
      onClose={onCancel}
      actions={
        <>
          <ModalButton
            variant="ghost"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </ModalButton>
          <ModalButton
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner className="size-4" />
                <span>Removing…</span>
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden="true" />
                <span>Remove</span>
              </>
            )}
          </ModalButton>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-control border border-app-line bg-app-soft/60 p-3">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-control border border-app-line bg-app-soft">
          {item.variant_image ? (
            <ImagePreview src={item.variant_image} alt={item.fabric_name} />
          ) : (
            <div className="size-full bg-app-soft" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-app-ink">
            {item.fabric_name}
          </p>
          <p className="text-xs text-app-muted">
            {item.variant_display_order || "No colour"}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-app-ink">
          ₹{Number(item.line_total || 0).toLocaleString("en-IN")}
        </span>
      </div>
    </Modal>
  );
}

interface OrderItemRowProps {
  item: OrderItem;
  onDelete?: (itemId: number) => void | Promise<void>;
  onEdit?: (item: OrderItem) => void;
  onTogglePacked?: (itemId: number, packed: boolean) => void;
  showDelete?: boolean;
  showEdit?: boolean;
  showPackedToggle?: boolean;
  isPacked?: boolean;
  isOutOfStock?: boolean;
  isLoading?: boolean;
  /** Show ordered/packed progress instead of the awaiting-packing note. */
  showPackingProgress?: boolean;
  /**
   * Rendered inside this line's card, underneath the summary row. Used by the
   * admin order page to hang the per-line packing control off the same card
   * instead of a second card beside it. Left undefined everywhere else, so
   * every other screen renders exactly as before.
   */
  footer?: ReactNode;
}

export default function OrderItemRow({
  item,
  onDelete,
  onEdit,
  onTogglePacked,
  showDelete = false,
  showEdit = false,
  showPackedToggle = false,
  isPacked = false,
  isOutOfStock = false,
  isLoading = false,
  showPackingProgress = false,
  footer,
}: OrderItemRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const ordered = toMeters(item.ordered_quantity);
  const allocated = toMeters(item.allocated_quantity);
  const outstanding = outstandingMeters(item);

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const actionButtonClass =
    "app-focus flex size-11 min-h-11 min-w-11 items-center justify-center rounded-control transition-colors";

  return (
    <>
      <DeleteConfirmDialog
        item={item}
        isOpen={showDeleteDialog}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <div
        className={cn(
          "border-b border-app-line/60 transition-colors",
          isPacked
            ? "bg-brand-green/5"
            : isOutOfStock
              ? "bg-brand-red/5"
              : "bg-app-card",
        )}
      >
        <div className="flex items-center gap-2 py-3 sm:gap-3">
          {(showEdit && onEdit) || (showDelete && onDelete) ? (
            <div className="flex shrink-0 flex-col">
              {showEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  aria-label={`Edit ${item.fabric_name}`}
                  className={cn(
                    actionButtonClass,
                    "text-brand-navy hover:bg-brand-navy/10",
                  )}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
              )}
              {showDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  aria-label={`Remove ${item.fabric_name}`}
                  className={cn(
                    actionButtonClass,
                    "text-brand-red hover:bg-brand-red/10",
                  )}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : null}

          {showPackedToggle && onTogglePacked && (
            <button
              type="button"
              onClick={() => onTogglePacked(item.id, !isPacked)}
              disabled={isLoading}
              aria-pressed={isPacked}
              aria-label={
                isPacked
                  ? `Mark ${item.fabric_name} unpacked`
                  : `Mark ${item.fabric_name} packed`
              }
              className={cn(
                actionButtonClass,
                "shrink-0 text-app-muted hover:bg-app-soft disabled:cursor-wait",
              )}
            >
              {isLoading ? (
                <Spinner className="size-5" />
              ) : isPacked ? (
                <CheckCircle2
                  className="size-6 text-[color:var(--status-dispatched)]"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="size-6 text-app-subtle transition-colors hover:text-brand-navy/50"
                  aria-hidden="true"
                />
              )}
            </button>
          )}

          <div className="relative size-12 shrink-0 overflow-hidden rounded-control border border-app-line bg-app-soft">
            {item.variant_image ? (
              <ImagePreview src={item.variant_image} alt={item.fabric_name} />
            ) : (
              <div className="size-full bg-app-soft" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate text-sm font-semibold",
                isPacked
                  ? "text-[color:var(--status-dispatched-text)]"
                  : isOutOfStock
                    ? "text-brand-red"
                    : "text-app-ink",
              )}
            >
              {item.fabric_name}
              {orderItemColorSuffix(item.variant_display_order)}
            </h3>

            <p
              className={cn(
                "mt-1 text-xs font-medium",
                isPacked
                  ? "text-[color:var(--status-dispatched-text)]"
                  : isOutOfStock
                    ? "text-brand-red"
                    : "text-app-muted",
              )}
            >
              {showPackingProgress ? (
                <>
                  {formatMeters(ordered)} m ordered ·{" "}
                  {formatMeters(allocated)} m packed
                </>
              ) : (
                <>
                  {formatMeters(ordered)} m ordered
                  {outstanding > 0 ? (
                    <>
                      {" · "}
                      <span className="font-bold text-[color:var(--status-pending-text)]">
                        {formatMeters(outstanding)} m awaiting packing
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-[color:var(--status-dispatched-text)]">
                      {" "}
                      · fully packed
                    </span>
                  )}
                </>
              )}
            </p>

            <p className="mt-0.5 text-[10px] font-medium text-app-subtle">
              ₹{Number(item.rate_per_meter || 0).toLocaleString("en-IN")}/m
              {item.is_rate_overridden && item.original_rate_per_meter && (
                <>
                  {" · "}
                  <span className="line-through">
                    ₹
                    {Number(item.original_rate_per_meter).toLocaleString("en-IN")}
                  </span>
                  <span className="ml-1 font-bold text-[color:var(--status-pending-text)]">
                    agreed
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <span
              className={cn(
                "text-base font-extrabold tracking-tight",
                isOutOfStock ? "text-brand-red" : "text-app-ink",
              )}
            >
              ₹{Number(item.line_total || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {footer}
      </div>
    </>
  );
}
