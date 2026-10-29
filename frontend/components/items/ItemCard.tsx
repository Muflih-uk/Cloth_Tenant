"use client";

import { ChevronDown, ChevronUp, Edit, Info, QrCode } from "lucide-react";

import { ImagePreview } from "@/components/pages/ImagePreview";
import { compareByVariantOrder } from "@/lib/sortVariants";
import { UIItem } from "@/types/item";
import { archiveCountdownLabel } from "@/util/archiveLabel";
import { isItemOutOfStock } from "@/util/stockValidators";

import VariantCard from "./VariantCard";

interface ItemCardProps {
  item: UIItem;
  context: "admin" | "agent";
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (id: number) => void;
  onPrintAll?: (id: number) => void;
  onPrintQR?: (qr: string, id: number) => void;
  onOrder?: (variantId: number) => void;
  isReadonly?: boolean;
  countdownDays?: number | null;
}

function getItemImage(item: UIItem): string | null {
  return item.variants[0]?.image || null;
}

export default function ItemCard({
  item,
  context,
  isExpanded,
  onToggle,
  onEdit,
  onPrintAll,
  onPrintQR,
  onOrder,
  isReadonly = false,
  countdownDays,
}: ItemCardProps) {
  const image = getItemImage(item);
  const pricePerMeter = item.price_per_meter;
  const itemStockOut = isItemOutOfStock(item);
  const colourCount = item.variants.length;
  const detailsId = `item-details-${item.id}`;
  const itemCode = item.design_number || `Item #${item.id}`;

  return (
    <article
      className={`min-w-0 overflow-hidden rounded-card border transition-colors ${
        itemStockOut
          ? "border-brand-red/20 bg-brand-red/5"
          : isExpanded
            ? "border-brand-navy/20 bg-app-card shadow-card"
            : "border-app-line bg-app-card"
      }`}
    >
      <div className="flex items-stretch gap-1.5 p-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${isExpanded ? "Hide" : "Show"} details for ${item.name}`}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          className="app-focus flex min-w-0 flex-1 items-center gap-2.5 rounded-control text-left transition-colors hover:bg-app-soft/70"
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-control border border-app-line bg-app-soft">
            {image ? (
              <ImagePreview src={image} alt={item.name} enlargeDisabled />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Info className="size-5 text-app-subtle" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3
                title={item.name}
                className="min-w-0 truncate text-sm font-bold leading-tight text-app-ink"
              >
                {item.name}
              </h3>
              {countdownDays != null && countdownDays >= 0 && (
                <span
                  className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight ${
                    countdownDays <= 7
                      ? "border-status-pending/20 bg-status-pending/10 text-[color:var(--status-pending-text)]"
                      : "border-app-line bg-app-soft text-app-muted"
                  }`}
                >
                  {archiveCountdownLabel(countdownDays)}
                </span>
              )}
            </div>

            <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-app-muted">
              <span className="max-w-[55%] truncate font-semibold text-app-muted">
                {itemCode}
              </span>
              {item.category && (
                <>
                  <span aria-hidden="true" className="text-app-subtle">
                    •
                  </span>
                  <span className="min-w-0 truncate">{item.category}</span>
                </>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-app-muted">
              <span className="font-medium">
                {colourCount} colour{colourCount !== 1 ? "s" : ""}
              </span>
              {pricePerMeter && context === "agent" && (
                <>
                  <span aria-hidden="true" className="text-app-subtle">
                    •
                  </span>
                  <span className="font-bold text-brand-navy">
                    ₹{Number(pricePerMeter).toLocaleString("en-IN")}/m
                  </span>
                </>
              )}
              {itemStockOut && (
                <span className="rounded-full bg-brand-red/10 px-1.5 py-0.5 font-bold uppercase tracking-wide text-brand-red">
                  Out of stock
                </span>
              )}
            </div>
          </div>

          <span className="flex h-11 w-5 shrink-0 items-center justify-center text-app-muted">
            {isExpanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </span>
        </button>

        {context === "admin" && !isReadonly && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(item.id);
              }}
              aria-label={`Edit ${item.name}`}
              className="app-focus flex size-11 items-center justify-center rounded-control bg-app-soft text-app-muted transition-colors hover:bg-brand-navy hover:text-white active:scale-95"
            >
              <Edit className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPrintAll?.(item.id);
              }}
              aria-label={`Print QR codes for ${item.name}`}
              className="app-focus flex size-11 items-center justify-center rounded-control bg-app-soft text-app-muted transition-colors hover:bg-brand-navy hover:text-white active:scale-95"
            >
              <QrCode className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          id={detailsId}
          className={`border-t border-app-line/70 bg-app-soft/50 px-2 pb-2.5 pt-2 sm:px-3 sm:pb-3 ${
            context === "admin" ? "lg:px-4 lg:pb-4 lg:pt-3" : ""
          }`}
        >
          <div
            className={
              context === "admin"
                ? "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] lg:items-start lg:gap-3"
                : "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {[...item.variants]
              .sort(compareByVariantOrder)
              .map((variant, index) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  index={index}
                  context={context}
                  onPrintQR={
                    context === "admin" ? onPrintQR : undefined
                  }
                  onOrder={context === "agent" ? onOrder : undefined}
                  isReadonly={isReadonly}
                />
              ))}
          </div>
        </div>
      )}
    </article>
  );
}
