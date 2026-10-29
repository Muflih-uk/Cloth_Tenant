"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { orderApi } from "@/lib/api/order";
import { formatApiError } from "@/lib/toast";
import { OrderAllResponse } from "@/types/order";
import { OrderCard } from "@/components/order";
import type { OrderFilters } from "./types";
import {
  getUnreadIds,
  fetchViewedOrderIds,
  clearViewedCache,
} from "@/lib/viewedOrders";
import Button from "@/components/ui/app/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { SkeletonCard } from "@/components/ui/app/Skeleton";
import useSessionStorage from "@/hooks/useSessionStorage";
import { PaginatedResponse } from "@/types/global";

type OrderStatus = "ALL" | "PENDING" | "PACKED" | "DISPATCHED";

interface Props {
  status: OrderStatus;
  filters?: OrderFilters;
  search?: string;
  showUnreadOnly?: boolean;
  refreshKey?: number;
  onTotalCountChange?: (total: number) => void;
  onPageChange?: (page: number) => void;
}

const EMPTY_LABELS: Record<OrderStatus, string> = {
  ALL: "No orders yet",
  PENDING: "No pending orders",
  PACKED: "No packed orders",
  DISPATCHED: "No dispatched orders",
};

const EMPTY_DESCRIPTIONS: Record<OrderStatus, string> = {
  ALL: "Orders will show up here as soon as they are created.",
  PENDING: "Everything is packed. New pending orders will appear here.",
  PACKED: "Orders that are ready to dispatch will appear here.",
  DISPATCHED: "Orders will appear here once they leave the warehouse.",
};

const OrderList: React.FC<Props> = ({
  status,
  filters,
  search,
  showUnreadOnly,
  refreshKey,
  onTotalCountChange,
  onPageChange,
}) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const key = status.charAt(0) + status.slice(1).toLowerCase();

  const [data, setData] = useState<OrderAllResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [currentPage, setCurrentPage] = useSessionStorage(
    `admin_${key}_currentPage`,
    1,
  );
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useSessionStorage(
    `admin_${key}_pageSize`,
    50,
  );
  const [viewedIds, setViewedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchViewedOrderIds().then(setViewedIds).catch(console.error);
    return () => clearViewedCache();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response: PaginatedResponse<OrderAllResponse[number]> =
          await orderApi.getAll({
            ...filters,
            page: currentPage,
            page_size: pageSize,
            search,
            status:
              status === "ALL"
                ? []
                : status === "DISPATCHED"
                  ? ["DISPATCHED", "PARTIALLY_DISPATCHED"]
                  : [status],
          });

        const results = response.results.filter(
          (order) => order.status != "DRAFT",
        );

        setData(results);
        setTotalCount(response.count);
        setTotalPages(Math.ceil(response.count / pageSize));
      } catch (fetchError) {
        setData([]);
        setTotalCount(0);
        setTotalPages(1);
        setError(formatApiError(fetchError));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    isAuthenticated,
    filters,
    search,
    currentPage,
    pageSize,
    refreshKey,
    retryKey,
    status,
  ]);

  // Reading the order list updates `viewedIds`. That is a presentation change,
  // not a reason to fetch the orders again: recompute the unread total from the
  // cards already on screen instead of reloading them.
  useEffect(() => {
    onTotalCountChange?.(
      showUnreadOnly
        ? getUnreadIds(
            data
              .filter((order) => order.status !== "DISPATCHED")
              .map((order) => order.id),
            viewedIds,
          ).length
        : totalCount,
    );
  }, [data, totalCount, showUnreadOnly, viewedIds, onTotalCountChange]);

  useEffect(() => {
    const saved = sessionStorage.getItem(`admin_${key}_scrollY`);
    if (saved) setTimeout(() => window.scrollTo(0, parseInt(saved)), 0);
    let timeout: NodeJS.Timeout;
    const saveScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        sessionStorage.setItem(
          `admin_${key}_scrollY`,
          window.scrollY.toString(),
        );
      }, 100);
    };
    window.addEventListener("scroll", saveScroll);
    return () => {
      window.removeEventListener("scroll", saveScroll);
      clearTimeout(timeout);
    };
  }, [key]);

  const filtered = showUnreadOnly
    ? data.filter(
        (order) =>
          order.status !== "DISPATCHED" &&
          getUnreadIds([order.id], viewedIds).length > 0,
      )
    : data;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    onPageChange?.(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading orders">
        {[0, 1, 2].map((index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="size-5" aria-hidden="true" />}
        title="Could not load orders"
        description={error}
        action={
          <Button onClick={() => setRetryKey((value) => value + 1)}>
            Try again
          </Button>
        }
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={
          showUnreadOnly
            ? "No unread orders"
            : search
              ? "No matching orders"
              : EMPTY_LABELS[status]
        }
        description={
          showUnreadOnly
            ? "You have caught up. New orders will show here."
            : search
              ? "Try a different name or order number."
              : EMPTY_DESCRIPTIONS[status]
        }
      />
    );
  }

  return (
    <div className="space-y-3 pb-24">
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {filtered.map((order) => (
          <OrderCard
            key={`${order.id}-${refreshKey}`}
            order={order}
            viewed={
              order.status === "DISPATCHED" ? true : viewedIds.has(order.id)
            }
            onClick={() => {
              router.push(`/admin/order/status/${order.id}`);
            }}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default OrderList;
