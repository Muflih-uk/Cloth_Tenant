"use client";

import { useMemo } from "react";
import { AlertTriangle, Info } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";
import { OutstandingDemandRow, formatMeters, toMeters } from "@/types/item";

interface OutstandingFabricGroup {
  fabric: string;
  fabricId: number;
  outstandingMeters: number;
  stockMeters: number;
  colours: OutstandingDemandRow[];
  backordered: boolean;
}

interface OrderedItemListProps {
  items: OutstandingDemandRow[];
  onItemClick?: (fabricId: number) => void;
}

export default function OrderedItemList({
  items,
  onItemClick,
}: OrderedItemListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, OutstandingFabricGroup>();
    for (const row of items) {
      const existing = map.get(row.fabric);
      if (existing) {
        existing.outstandingMeters += toMeters(row.outstanding_meters);
        existing.stockMeters += toMeters(row.stock_meters);
        existing.backordered = existing.backordered || row.is_backordered;
        existing.colours.push(row);
      } else {
        map.set(row.fabric, {
          fabric: row.fabric,
          fabricId: row.fabric_id,
          outstandingMeters: toMeters(row.outstanding_meters),
          stockMeters: toMeters(row.stock_meters),
          backordered: row.is_backordered,
          colours: [row],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.backordered !== b.backordered) return a.backordered ? -1 : 1;
      return b.outstandingMeters - a.outstandingMeters;
    });
  }, [items]);

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={<Info className="size-5" aria-hidden="true" />}
        title="Nothing outstanding"
        description="Every order has been fully packed."
      />
    );
  }

  return (
    <div className="space-y-2">
      {grouped.map((group) => (
        <button
          key={group.fabricId}
          type="button"
          onClick={() => onItemClick?.(group.fabricId)}
          className="app-focus app-card w-full p-4 text-left transition-colors hover:border-brand-navy/20"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-app-ink">
              {group.fabric}
            </h3>
            {group.backordered && (
              <span className="inline-flex items-center gap-1 rounded-md border border-brand-red/20 bg-brand-red/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-brand-red">
                <AlertTriangle className="size-2.5" aria-hidden="true" />
                Oversubscribed
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-app-muted">
            <span>
              <span className="font-bold text-app-ink">
                {formatMeters(group.outstandingMeters)} m
              </span>{" "}
              owed
            </span>
            <span aria-hidden="true" className="text-app-subtle">
              •
            </span>
            <span>
              <span className="font-bold text-app-ink">
                {formatMeters(group.stockMeters)} m
              </span>{" "}
              in stock
            </span>
            <span aria-hidden="true" className="text-app-subtle">
              •
            </span>
            <span>
              {group.colours.length} colour
              {group.colours.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.colours.map((row) => (
              <span
                key={row.variant}
                className={`rounded-md border px-2 py-1 text-[11px] ${
                  row.is_backordered
                    ? "border-brand-red/20 bg-brand-red/10 text-brand-red"
                    : "border-app-line bg-app-soft text-app-muted"
                }`}
              >
                {row.display_order || `Variant #${row.variant}`}:{" "}
                <span className="font-bold">
                  {formatMeters(row.outstanding_meters)} m
                </span>{" "}
                owed
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
