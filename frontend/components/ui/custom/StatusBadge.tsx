import { OrderStatus } from "@/types/order";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: OrderStatus | string | undefined;
  className?: string;
}

const LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  EDITING: "Editing",
  PACKED: "Packed",
  PARTIALLY_DISPATCHED: "Partially dispatched",
  DISPATCHED: "Dispatched",
};

export default function StatusBadge({
  status,
  className,
}: StatusBadgeProps) {
  const normalized = status?.toLowerCase().replace(/\s+/g, "_") ?? "draft";
  const safeStatus =
    normalized === "partial" || normalized === "partially-dispatched"
      ? "partially_dispatched"
      : normalized;
  const label =
    LABELS[safeStatus.toUpperCase()] ??
    status ??
    "Unknown";

  return (
    <span
      data-status={safeStatus}
      className={cn("status-badge", className)}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
