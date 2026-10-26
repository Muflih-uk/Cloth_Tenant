"use client";

import { useState, type ReactNode } from "react";
import { ImagePlus, Pencil, Plus, Scale, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import Button from "@/components/ui/app/Button";
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
    <div className="overflow-hidden rounded-card border border-app-line bg-app-card shadow-card">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onPickImage}
              className="app-focus relative flex size-14 items-center justify-center overflow-hidden rounded-control border border-app-line bg-app-soft"
              aria-label="Change colour photo"
            >
              {imageSrc ? (
                <>
                  <ImagePreview
                    src={imageSrc}
                    alt={label}
                    enlargeDisabled
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-brand-navy/0 text-white opacity-0 transition hover:bg-brand-navy/30 hover:opacity-100">
                    <ImagePlus className="size-4" aria-hidden="true" />
                  </span>
                </>
              ) : (
                <ImagePlus
                  className="size-5 text-app-subtle"
                  aria-hidden="true"
                />
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
                className="app-focus absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-app-line bg-app-card text-app-muted shadow-card transition-colors after:absolute after:-inset-2 after:content-[''] hover:text-brand-red"
                aria-label="Remove colour photo"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
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
                  className="h-11 min-w-0 flex-1 px-2 text-sm font-semibold"
                  aria-label="Colour number"
                />
              ) : (
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-app-ink">
                  {label}
                </p>
              )}
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="app-focus flex size-11 shrink-0 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-brand-navy"
                aria-label="Edit colour name"
                title="Edit colour name"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              {!isOnly && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="app-focus flex size-11 shrink-0 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-brand-red/10 hover:text-brand-red"
                  aria-label="Remove colour"
                  title="Remove colour"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
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
            <Button
              onClick={onRequestReceive}
              className="flex-1 sm:flex-none"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Receive Rolls
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setAdjustingStock(true)}
            className="flex-1 sm:flex-none"
          >
            <Scale className="size-3.5" aria-hidden="true" />
            Adjust stock
          </Button>
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
    <div className={`min-w-0 rounded-control bg-app-soft px-2 py-1.5 ${className}`}>
      <p className="truncate text-[9px] uppercase tracking-wide text-app-subtle">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm font-bold ${
          warning ? "text-brand-red" : "text-app-ink"
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
