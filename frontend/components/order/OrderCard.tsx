"use client";

import { useRouter } from "next/navigation";

import type { Order } from "@/types/order";
import { formatMeters, toMeters } from "@/types/item";
import { outstandingMeters } from "@/lib/utils/orderItemSort";
import { markOrderAsViewed } from "@/lib/viewedOrders";
import StatusBadge from "@/components/ui/custom/StatusBadge";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import { cn } from "@/lib/utils";

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  viewed?: boolean;
}

export default function OrderCard({
  order,
  onClick,
  viewed = false,
}: OrderCardProps) {
  const router = useRouter();

  const totalOrderedMeters = toMeters(order.totals?.total_ordered_meters);
  const totalOutstandingMeters = toMeters(order.totals?.total_outstanding_meters);
  const awaitingPackingCount =
    order.items?.filter((item) => outstandingMeters(item) > 0).length ?? 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleClick = () => {
    markOrderAsViewed(order.id);
    if (onClick) {
      onClick();
    } else {
      router.push(`/admin/order/status/${order.id}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "app-focus app-card relative w-full overflow-hidden p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-navy/20 active:translate-y-0",
        !viewed && "border-brand-navy/20 bg-app-soft/40",
      )}
    >
      {!viewed && (
        <span className="absolute right-4 top-4 flex size-2.5 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-green opacity-40" />
          <span className="relative inline-flex size-2.5 rounded-full bg-brand-green" />
          <span className="sr-only">Unread order</span>
        </span>
      )}

      <div className="flex items-start gap-3">
        <StockflowAvatar user={order.customer_details} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn(
                  "truncate text-sm font-bold text-app-ink",
                  !viewed && "font-extrabold",
                )}
              >
                {order.customer_details?.name || "Unknown Customer"}
              </h3>
              <p className="mt-0.5 truncate text-xs font-medium text-app-muted">
                {order.agent_details?.username ?? "Unassigned"}
              </p>
            </div>

            <div className={cn("flex shrink-0 flex-col items-end gap-1", !viewed && "pr-5")}>
              <StatusBadge status={order.status} />
              <span className="text-[11px] font-semibold tabular-nums text-app-subtle">
                #{order.id}
              </span>
            </div>
          </div>

          <p className="mt-2 truncate text-[11px] font-medium text-app-subtle">
            {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 rounded-control border border-app-line/60 bg-app-card/80 p-3">
        <div className="min-w-0">
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

          {awaitingPackingCount > 0 && (
            <p className="mt-1 text-[11px] font-medium text-app-muted">
              {awaitingPackingCount}{" "}
              {awaitingPackingCount === 1 ? "item" : "items"} awaiting packing
            </p>
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
