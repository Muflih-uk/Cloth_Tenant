"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import OrderItem from "@/components/pages/admin/order-item/OrderItem";
import { Modal, ModalButton } from "@/components/ui/custom/Modals";
import { orderApi } from "@/lib/api/order";
import { toastSuccess, toastError } from "@/lib/toast";
import { OrderItem as OrderItemType } from "@/types/order";

interface OrderDetailItemsProps {
  items?: OrderItemType[];
  orderId?: number;
  status?: string;
  onRefresh?: () => void;
}

export default function OrderDetailItems({
  items,
  orderId,
  status,
  onRefresh,
}: OrderDetailItemsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const handleDeleteClick = (itemId: number) => {
    setItemToDelete(itemId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !orderId) return;
    try {
      await orderApi.deleteItem(orderId, itemToDelete);
      toastSuccess("Item deleted successfully");
      setShowDeleteDialog(false);
      setItemToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toastError("Failed to delete item");
      console.error(err);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-end justify-between border-b border-app-line/70 pb-2">
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-app-ink">
            Items
          </h2>
          <p className="text-xs font-medium text-app-muted">
            Order items below
          </p>
        </div>
        {status && status !== "DISPATCHED" && status !== "DRAFT" && (
          <span className="rounded-full bg-app-soft px-2.5 py-1 text-xs font-semibold text-app-muted">
            Packing Status
          </span>
        )}
      </div>

      <div className="app-card overflow-hidden">
        <OrderItem
          items={items}
          isDeletable={false}
          orderId={orderId}
          onDeleteItem={handleDeleteClick}
        />
      </div>

      {showDeleteDialog && (
        <Modal
          icon={<Trash2 size={18} className="text-brand-red" />}
          iconBg="bg-brand-red/10"
          title="Delete Item?"
          description={
            status !== "DRAFT"
              ? "This will return the stock back to the warehouse. This action cannot be undone."
              : "Are you sure you want to remove this item from the order?"
          }
          onClose={() => setShowDeleteDialog(false)}
          actions={
            <>
              <ModalButton
                variant="ghost"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </ModalButton>
              <ModalButton variant="destructive" onClick={confirmDelete}>
                Delete
              </ModalButton>
            </>
          }
        />
      )}
    </>
  );
}
