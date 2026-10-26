"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";

import { orderApi, type OrderLog } from "@/lib/api/order";
import { cn } from "@/lib/utils";

interface OrderLogsProps {
  orderId: number;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  ITEM_DELETED: { label: "Item Deleted", color: "bg-brand-red/10 text-brand-red" },
  ORDER_DELETED: { label: "Order Deleted", color: "bg-brand-red/10 text-brand-red" },
  ORDER_EDITED: { label: "Order Edited", color: "bg-brand-navy/10 text-brand-navy" },
  DISPATCHED: {
    label: "Dispatched",
    color:
      "bg-brand-green/10 text-[color:var(--status-dispatched-text)]",
  },
};

export default function OrderLogs({ orderId }: OrderLogsProps) {
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await orderApi.getOrderLogs(orderId);
        setLogs(data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };

    if (expanded) {
      fetchLogs();
    }
  }, [expanded, orderId]);

  if (logs.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="mt-6 border-t border-app-line/60 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="app-focus flex h-11 items-center gap-2 rounded-control px-1 text-sm font-semibold text-app-muted transition-colors hover:text-app-ink"
      >
        <History size={16} aria-hidden="true" />
        <span>View Activity Logs</span>
        {expanded ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-xs font-medium text-app-muted">Loading logs...</p>
          ) : (
            logs.map((log) => {
              const actionInfo = actionLabels[log.action] || {
                label: log.action,
                color: "bg-app-soft text-app-muted",
              };
              const date = new Date(log.created_at);
              const formattedDate = date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={log.id}
                  className="rounded-control border border-app-line/60 bg-app-soft/50 p-3"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                        actionInfo.color,
                      )}
                    >
                      {actionInfo.label}
                    </span>
                    <span className="text-[11px] font-medium text-app-subtle">
                      {formattedDate}
                    </span>
                  </div>

                  {log.performed_by && (
                    <p className="text-xs text-app-muted">
                      By: {log.performed_by}
                    </p>
                  )}

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 space-y-0.5 text-xs text-app-muted">
                      {Object.entries(log.details).map(([key, value]) => (
                        <p key={key}>
                          {key.replace(/_/g, " ")}: {String(value)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
