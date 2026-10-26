"use client";

import { useCallback } from "react";
import { AlertTriangle, Scissors } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { outstandingMeters } from "@/lib/utils/orderItemSort";
import { OrderItem as OrderItemType, OrderStatus } from "@/types/order";
import { formatMeters, toMeters } from "@/types/item";
import OrderItem from "@/components/pages/admin/order-item/OrderItem";
import PackingBundlePanel from "@/components/pages/order/PackingBundlePanel";

interface OrderItemsSectionProps {
  items?: OrderItemType[];
  status?: string;
  orderId?: number;
  onItemsChange: () => void;
  /** Lets the page move its own status badge when a pack fills the order. */
  onOrderStatusChange?: (status: OrderStatus) => void;
  /** Reports the sealed/dispatched bundle counts up to the page. */
  onBundlesChange?: (counts: {
    pending: number;
    dispatched: number;
  }) => void;
  /**
   * Transport already chosen for the order, and what the customer asked for. Passed
   * to the bundle panel so the first bundle to leave can offer the preference
   * instead of making the packer hunt for it.
   */
  transportCompanyId?: number | null;
  preferredTransportId?: number | null;
}

/**
 * The fabric lines on an order, with a running picture of what the warehouse
 * still owes.
 *
 * Packing starts at the bundle panel above the list: the admin scans a roll label,
 * confirms how many metres to cut, and the server fills the line that roll's
 * colour belongs to. There are no per-line metre controls, because cloth only
 * leaves the shelf against a specific scanned roll.
 *
 * The banner that used to sit above the list and point at `/admin/packing` is
 * parked behind a `false` below rather than deleted, in case the round-screen
 * entry point wants bringing back.
 */
export default function OrderItemsSection({
  items,
  status,
  orderId,
  onItemsChange,
  onOrderStatusChange,
  onBundlesChange,
  transportCompanyId,
  preferredTransportId,
}: OrderItemsSectionProps) {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";

  // Packing is a warehouse action, so it is offered to admins only. The route
  // group is already admin-gated; this keeps the control off the screen if this
  // list is ever reused somewhere an agent can reach.
  const canPack = isAdmin && orderId !== undefined;

  const liveItems = items ?? [];

  const outstanding = liveItems.reduce(
    (sum, i) => sum + toMeters(i.outstanding_quantity),
    0,
  );
  const ordered = liveItems.reduce((sum, i) => sum + toMeters(i.ordered_quantity), 0);
  const allocated = liveItems.reduce(
    (sum, i) => sum + toMeters(i.allocated_quantity),
    0,
  );

  // Lines can only be edited while the order is still open for changes, and
  // never once cloth has moved against them.
  const isEditable = status === "DRAFT" || status === "PENDING" || status === "EDITING";
  const isDeletable = isEditable;
  const awaitingPacking = outstanding > 0 && status !== "DISPATCHED";

  // A line packing has finished belongs with the box that carried it, so the list
  // below carries only what is still owed. That only holds while the bundles are
  // actually on screen to receive those lines: without the panel there would be
  // nowhere for a settled line to be shown, so the list stays whole.
  const bundlesVisible = canPack && orderId !== undefined;
  const outstandingLines = bundlesVisible
    ? liveItems.filter((line) => outstandingMeters(line) > 0)
    : liveItems;

  // Packing is offered while the order is still open for cloth, mirroring the
  // engine's OPEN_STATUSES. There is no cancelled order status to guard against;
  // DISPATCHED is the point of no return, and a DRAFT has no cloth against it yet.
  //
  // PARTIALLY_DISPATCHED is still open for cloth: some bundles have gone on a truck
  // and others have not, so the order still needs packing and still needs its
  // remaining bundles dispatched. Locking packing here would strand the boxes that
  // have not left.
  const canEditPacking =
    canPack &&
    (status === "PENDING" ||
      status === "PACKED" ||
      status === "PARTIALLY_DISPATCHED");

  /**
   * Cloth left the shelf through a bundle. The lines and the figures on this page
   * both moved, so re-read them rather than leaving the panel's own view of the
   * order as the only current one.
   */
  const handleBundleChanged = useCallback(() => {
    onItemsChange?.();
  }, [onItemsChange]);

  return (
    <>
      <div className="mb-4 border-b border-gray-100 pb-2">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 leading-tight">
            Fabric lines
          </h2>
          <p className="text-xs text-gray-400 font-medium">
            {formatMeters(ordered)} m ordered · {formatMeters(allocated)} m packed
          </p>
        </div>
      </div>

      {false && awaitingPacking && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-900">
              {formatMeters(outstanding)} m still to pack
            </p>
            <p className="text-[11px] text-amber-700">
              Share the roll out in a packing round, or fill a line below.
            </p>
          </div>
          <Link
            href="/admin/packing"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-amber-600 transition-colors"
          >
            <Scissors size={13} />
            Pack
          </Link>
        </div>
      )}

      {canPack && orderId !== undefined && (
        <PackingBundlePanel
          orderId={orderId}
          enabled={canEditPacking}
          items={liveItems}
          onChanged={handleBundleChanged}
          onOrderStatusChange={onOrderStatusChange}
          onBundlesChange={onBundlesChange}
          transportCompanyId={transportCompanyId}
          preferredTransportId={preferredTransportId}
        />
      )}

      <div className="bg-white rounded-2xl overflow-hidden">
        {bundlesVisible && outstandingLines.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs font-medium text-gray-400">
            All items packed — see the bundles above.
          </p>
        ) : (
        <OrderItem
          items={outstandingLines}
          isDeletable={isDeletable}
          isEditable={isEditable}
          orderId={orderId}
          showPackingProgress
          onAllocationChange={onItemsChange}
          onDeleteItem={onItemsChange}
        />
        )}
      </div>
    </>
  );
}
