"use client";

import { Trash2, ImagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { EditableVariant } from "@/types/item";
import { toMeters } from "@/types/item";
import { ImagePreview } from "@/components/pages/ImagePreview";

interface Props {
  variant: EditableVariant;
  index: number; // 0-based
  isOnly: boolean;
  /** New colours initialize physical stock from their opening figure. */
  isNew: boolean;
  onChange: (updated: EditableVariant) => void;
  onDelete: () => void;
  onPickImage: () => void;
}

/**
 * The editable figure is the opening order-stock base. Physical stock is shown
 * separately and remains controlled by rolls or packing.
 */
export default function EditVariantRow({
  variant,
  index,
  isOnly,
  isNew,
  onChange,
  onDelete,
  onPickImage,
}: Props) {
  const set = <K extends keyof EditableVariant>(
    key: K,
    val: EditableVariant[K],
  ) => onChange({ ...variant, [key]: val });

  const imageSrc = variant.imagePreview ?? variant.imageUrl;
  const label = variant.displayOrder.trim();
  const rollTracked = !isNew && variant.isRollTracked === true;
  const available =
    toMeters(variant.availableMeters ?? variant.baseOpening) +
    toMeters(variant.baseOpening) -
    toMeters(variant.initialBaseOpening ?? variant.baseOpening);
  const physicalStock =
    isNew && !rollTracked ? variant.baseOpening : variant.stockMeters;

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onPickImage}
        className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative"
        aria-label="Change photo"
      >
        {imageSrc ? (
          <>
            <ImagePreview src={imageSrc} alt={label || `Colour ${index + 1}`} />
            <span className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
              <ImagePlus size={13} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
            </span>
          </>
        ) : (
          <ImagePlus size={15} className="text-gray-300" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1.5">
        <Input
          value={variant.displayOrder}
          placeholder="Colour / finish"
          onChange={(e) => set("displayOrder", e.target.value)}
          className="h-8 text-sm"
        />

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            Opening stock (order-stock base)
          </span>
          <Input
            type="number"
            min={0}
            step="0.5"
            inputMode="decimal"
            value={variant.baseOpening}
            placeholder="0"
            onChange={(e) => set("baseOpening", e.target.value)}
            onFocus={(e) => e.target.select()}
            className="h-8 text-sm w-24"
          />
          <span className="text-[11px] text-gray-400">m</span>
        </div>
        <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-500">
          <span className={available < 0 ? "text-red-600 font-semibold" : ""}>
            Available to order: {toMeters(variant.baseOpening) === 0 && isNew
              ? "0"
              : available.toLocaleString()} m
          </span>
          <span>
            {rollTracked ? "On rolls" : "Physical stock"}: {toMeters(physicalStock).toLocaleString()} m
          </span>
          {toMeters(variant.untrackedStockMeters ?? "0") > 0 && (
            <span className="text-amber-700">
              Untracked physical (not packable):{" "}
              {toMeters(variant.untrackedStockMeters ?? "0").toLocaleString()} m
            </span>
          )}
          {rollTracked && (
            <span>{variant.rollCount ?? 0} physical roll{variant.rollCount === 1 ? "" : "s"}</span>
          )}
        </div>
      </div>

      {imageSrc && (
        <button
          type="button"
          onClick={() => onChange({ ...variant, imageUrl: null, imagePreview: null, newImage: null })}
          className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Remove photo"
          title="Remove photo"
        >
          <X size={14} />
        </button>
      )}

      {!isOnly && (
        <button
          type="button"
          onClick={onDelete}
          className="flex-shrink-0 p-1.5 rounded-md text-red-400 hover:text-white hover:bg-red-400 transition-colors"
          aria-label="Remove colour"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

/** Kept for the callers that still import it; metres live on the row itself now. */
export function stockMetersOf(variant: EditableVariant): number {
  return toMeters(variant.stockMeters);
}
