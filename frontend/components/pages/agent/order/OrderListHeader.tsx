"use client";

interface OrderListHeaderProps {
  title: string;
  count: number;
  countColor?: "amber" | "green";
  showFilters?: boolean;
  handleToggleFilters?: () => void;
  pageIndicator?: React.ReactNode;
}

export default function OrderListHeader({
  title,
  count,
  countColor = "amber",
  pageIndicator,
}: OrderListHeaderProps) {
  const badgeColorClasses = {
    amber:
      "border-status-pending/20 bg-status-pending/10 text-[color:var(--status-pending-text)]",
    green:
      "border-status-dispatched/20 bg-status-dispatched/10 text-[color:var(--status-dispatched-text)]",
  };

  return (
    <div className="mb-6 flex flex-row items-center justify-between gap-2 pt-4">
      <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">
            {title}
          </span>
          <div
            className={`rounded-full border px-3 py-0.5 ${badgeColorClasses[countColor]}`}
          >
            <span className="text-xs font-bold tabular-nums">{count}</span>
          </div>
        </div>
        {pageIndicator && (
          <div className="flex mt-1 sm:mt-0">{pageIndicator}</div>
        )}
      </div>
    </div>
  );
}
