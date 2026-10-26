"use client";

import { markOrderAsViewed } from "@/lib/viewedOrders";
import { formatMeters, toMeters } from "@/types/item";
import { OrderAllResponse } from "@/types/order";

import StatusBadge from "@/components/ui/custom/StatusBadge";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";

interface OrderCardProps {
  order: OrderAllResponse[number];
  onClick: () => void;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

export default function OrderCard({ order, onClick }: OrderCardProps) {
  const viewed = true;

  const handleClick = () => {
    markOrderAsViewed(order.id);
    onClick();
  };

  const totalOrderedMeters = toMeters(order.totals?.total_ordered_meters);
  const totalOutstandingMeters = toMeters(
    order.totals?.total_outstanding_meters,
  );
  const hasItems = (order.items?.length ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="app-focus app-card relative w-full overflow-hidden p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-navy/20 active:translate-y-0"
    >
      {!viewed && (
        <span className="absolute right-3 top-3 size-2.5 rounded-full bg-brand-green">
          <span className="sr-only">Unread order</span>
        </span>
      )}

      <div className="flex items-start gap-3">
        <StockflowAvatar user={order.customer_details} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-app-ink">
                {order.customer_details?.name || "Unknown Customer"}
              </h3>
              <p className="mt-0.5 truncate text-xs font-medium text-app-muted">
                {order.agent_details?.username ?? "Unassigned"}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={order.status} />
              <span className="text-[11px] font-semibold tabular-nums text-app-subtle">
                {formatDate(order.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 rounded-control border border-app-line/60 bg-app-card/80 p-3">
        <div className="min-w-0">
          {hasItems ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-lg font-extrabold tracking-tight text-app-ink">
                {formatMeters(totalOrderedMeters)}
                <span className="ml-0.5 text-xs font-semibold text-app-muted">
                  m
                </span>
              </span>
              {totalOutstandingMeters > 0 && (
                <span className="text-xs font-semibold text-brand-red">
                  {formatMeters(totalOutstandingMeters)} m to pack
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs font-semibold text-brand-red">
              No items on this order
            </span>
          )}
        </div>

        <p className="shrink-0 text-sm font-extrabold tracking-tight text-brand-navy">
          ₹
          {Number(order.totals?.effective_total || 0).toLocaleString("en-IN")}
        </p>
      </div>
    </button>
  );
}
