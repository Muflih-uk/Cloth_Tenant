"use client";

import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import type { ColorVariant } from "@/types/item";
import { formatMeters } from "@/types/item";
import { colorLabel } from "@/lib/color-number";
import { ImagePreview } from "@/components/pages/ImagePreview";

interface Props {
  variant: ColorVariant;
  index: number; // 0-based
  onEdit: () => void;
  onDelete: () => void;
  isOnly: boolean;
}

export default function ColorCard({ variant, index, onEdit, onDelete, isOnly }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-app-line bg-app-card px-3 py-3 shadow-card">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-app-line bg-app-soft">
        {variant.imagePreview ? (
          <ImagePreview src={variant.imagePreview} alt={`Colour ${index + 1}`} />
        ) : (
          <ImagePlus className="size-4 text-app-subtle" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-app-ink">
          {colorLabel(variant.displayOrder, index)}
        </p>
        <p className="mt-0.5 text-[11px] text-app-muted">
          Available to order: {formatMeters(variant.stockMeters)} m
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="app-focus flex size-11 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
          aria-label="Edit"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        {!isOnly && (
          <button
            type="button"
            onClick={onDelete}
            className="app-focus flex size-11 items-center justify-center rounded-control text-brand-red transition-colors hover:bg-brand-red/10"
            aria-label="Delete"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
