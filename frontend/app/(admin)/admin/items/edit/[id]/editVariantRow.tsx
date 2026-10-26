"use client";

import { useState, type ReactNode } from "react";
import { ImagePlus, Pencil, Plus, Scale, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ImagePreview } from "@/components/pages/ImagePreview";
import { colorLabel } from "@/lib/color-number";
import { toMeters, type EditableVariant } from "@/types/item";
import StockAdjustmentDialog from "./stockAdjustmentDialog";

interface Props {
  variant: EditableVariant;
  index: number;
  isOnly: boolean;
  isNew: boolean;
  onChange: (updated: EditableVariant) => void;
  onDelete: () => void;
  onPickImage: () => void;
  onRequestReceive?: () => void;
  children?: ReactNode;
}

export default function EditVariantRow({
  variant,
  index,
  isOnly,
  isNew,
  onChange,
  onDelete,
  onPickImage,
  onRequestReceive,
  children,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(false);

  const set = <K extends keyof EditableVariant>(
    key: K,
    val: EditableVariant[K],
  ) => onChange({ ...variant, [key]: val });

  const imageSrc = variant.imagePreview ?? variant.imageUrl;
  const label = colorLabel(variant.displayOrder, index);
  const rollTracked = !isNew && variant.isRollTracked === true;
  const available =
    toMeters(variant.availableMeters ?? variant.baseOpening) +
    toMeters(variant.baseOpening) -
    toMeters(variant.initialBaseOpening ?? variant.baseOpening);
  const physicalStock =
    isNew && !rollTracked ? variant.baseOpening : variant.stockMeters;
  const activeRolls =
    variant.activeRollCount ?? (rollTracked ? undefined : 0);
  const displayMetres = (value: string | number) =>
    toMeters(value).toLocaleString(undefined, { maximumFractionDigits: 3 });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="p-2.5 sm:p-3">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onPickImage}
              className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gray-100 sm:h-14 sm:w-14"
              aria-label="Change colour photo"
            >
              {imageSrc ? (
                <>
                  <ImagePreview
                    src={imageSrc}
                    alt={label}
                    enlargeDisabled
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/25 hover:opacity-100">
                    <ImagePlus size={14} />
                  </span>
                </>
              ) : (
                <ImagePlus size={17} className="text-gray-300" />
              )}
            </button>
            {imageSrc && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...variant,
                    imageUrl: null,
                    imagePreview: null,
                    newImage: null,
                  })
                }
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:text-red-500"
                aria-label="Remove colour photo"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {editingName ? (
                <Input
                  value={variant.displayOrder}
                  placeholder="Colour number"
                  inputMode="numeric"
                  autoFocus
                  onChange={(event) => set("displayOrder", event.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === "Escape") {
                      setEditingName(false);
                    }
                  }}
                  className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-black shadow-none focus-visible:ring-0"
                  aria-label="Colour number"
                />
              ) : (
                <p className="min-w-0 flex-1 truncate text-[13px] font-black text-gray-800 sm:text-sm">
                  {label}
                </p>
              )}
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-50 hover:text-primary sm:h-6 sm:w-6"
                aria-label="Edit colour name"
                title="Edit colour name"
              >
                <Pencil size={12} />
              </button>
              {!isOnly && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 sm:h-6 sm:w-6"
                  aria-label="Remove colour"
                  title="Remove colour"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
              <Metric
                label="Available to order"
                value={`${displayMetres(available)} m`}
                warning={available < 0}
              />
              <Metric
                label="Physical stock"
                value={`${displayMetres(physicalStock)} m`}
              />
              <Metric
                className="col-span-2 sm:col-span-1"
                label="Active rolls"
                value={activeRolls === undefined ? "—" : String(activeRolls)}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onRequestReceive && (
            <button
              type="button"
              onClick={onRequestReceive}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15 sm:h-8 sm:flex-none sm:px-2.5"
            >
              <Plus size={13} />
              Receive Rolls
            </button>
          )}
          <button
            type="button"
            onClick={() => setAdjustingStock(true)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 text-[11px] font-semibold text-gray-500 transition-colors hover:border-gray-200 hover:text-gray-700 sm:h-8 sm:flex-none sm:px-2.5"
          >
            <Scale size={13} />
            Adjust stock
          </button>
        </div>
      </div>

      {children}

      {adjustingStock && (
        <StockAdjustmentDialog
          current={variant.baseOpening}
          label={label}
          onClose={() => setAdjustingStock(false)}
          onSave={(value) => set("baseOpening", value)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
  className = "",
}: {
  label: string;
  value: string;
  warning?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg bg-gray-50 px-2 py-1.5 ${className}`}>
      <p className="truncate text-[9px] uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm font-black ${
          warning ? "text-red-600" : "text-gray-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function stockMetersOf(variant: EditableVariant): number {
  return toMeters(variant.stockMeters);
}
