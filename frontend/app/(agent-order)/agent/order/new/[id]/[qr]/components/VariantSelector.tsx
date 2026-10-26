"use client";

import { Check } from "lucide-react";

import { ImagePreview } from "@/components/pages/ImagePreview";
import type { FabricVariant } from "@/types/item";
import { formatMeters, toMeters } from "@/types/item";

interface VariantSelectorProps {
  variants: FabricVariant[];
  selectedVariant: FabricVariant | null;
  /** Metres already on the order for this colour, so it can be badged. */
  existingMetresByVariant: Record<number, number>;
  onSelect: (variant: FabricVariant) => void;
}

export default function VariantSelector({
  variants,
  selectedVariant,
  existingMetresByVariant,
  onSelect,
}: VariantSelectorProps) {
  if (variants.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-3 font-bold text-app-ink">Colour</h3>
      <div className="scrollbar-none flex gap-4 overflow-x-auto pb-2">
        {variants.map((v, index) => {
          const alreadyOn = toMeters(existingMetresByVariant[v.id] ?? 0);
          const isSelected = selectedVariant?.id === v.id;
          return (
            <div
              key={v.id}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => onSelect(v)}
                className={`app-focus relative size-20 overflow-hidden rounded-2xl border-2 transition-all ${
                  isSelected
                    ? "scale-105 border-brand-navy"
                    : "border-app-line hover:border-brand-navy/30"
                }`}
                aria-label={v.display_order || `Colour ${index + 1}`}
                aria-pressed={isSelected}
              >
                {v.image ? (
                  <ImagePreview
                    src={v.image}
                    alt={v.display_order || `Colour ${index + 1}`}
                    enlargeDisabled={true}
                  />
                ) : (
                  <div className="size-full bg-app-soft" />
                )}
                {alreadyOn > 0 && (
                  <div className="absolute right-1 bottom-1 rounded-full bg-brand-navy px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {formatMeters(alreadyOn)} m
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-brand-navy/25">
                    <Check
                      className="text-white"
                      size={24}
                      strokeWidth={4}
                      aria-hidden="true"
                    />
                  </div>
                )}
              </button>
              <span className="max-w-20 truncate text-[10px] font-bold text-app-muted">
                {v.display_order || `Colour ${index + 1}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
