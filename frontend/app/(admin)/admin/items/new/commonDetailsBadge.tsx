"use client";

import { Pencil } from "lucide-react";
import type { FabricDetails } from "@/types/item";

interface Props {
  common: FabricDetails;
  onEdit?: () => void; // if provided, shows edit button
}

export default function CommonDetailsBadge({ common, onEdit }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-app-line bg-app-soft/60 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-app-ink">
          {common.name || (
            <span className="font-normal text-app-subtle">No name</span>
          )}
        </p>
        {(common.design_number || common.category) && (
          <p className="truncate text-xs text-app-muted">
            {[common.design_number, common.category].filter(Boolean).join(" • ")}
          </p>
        )}
        <p className="text-xs text-app-muted">
          {common.price_per_meter ? `₹${common.price_per_meter}/m` : "—"}
          {common.description && (
            <span className="ml-2 hidden truncate text-app-subtle sm:inline">
              {common.description}
            </span>
          )}
        </p>
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="app-focus flex size-11 shrink-0 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-card hover:text-app-ink"
          aria-label="Edit common details"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
