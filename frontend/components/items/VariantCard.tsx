"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, QrCode } from "lucide-react";

import Button from "@/components/ui/app/Button";
import { ImagePreview } from "@/components/pages/ImagePreview";
import { variantColorLabel } from "@/lib/colorLabel";
import { primeRolls } from "@/lib/rollsCache";
import { UIVariant } from "@/types/item";
import { isVariantOutOfStock } from "@/util/stockValidators";

import StockMetresRow from "./StockMetresRow";
import VariantRollsList from "./variantRollsList";

interface VariantCardProps {
  variant: UIVariant;
  index: number;
  context: "admin" | "agent";
  isCompact?: boolean;
  onPrintQR?: (qr: string, id: number) => void;
  onOrder?: (variantId: number) => void;
  isReadonly?: boolean;
}

export default function VariantCard({
  variant,
  index,
  context,
  onPrintQR,
  onOrder,
  isReadonly = false,
}: VariantCardProps) {
  const isOutOfStock = isVariantOutOfStock(variant);
  const qrCode = variant.qr_code;
  const colorLabel = variantColorLabel(variant.display_order, index + 1);
  const [showRolls, setShowRolls] = useState(false);
  const canShowRolls = context === "admin" && !isReadonly;

  return (
    <div
      className={`rounded-control border p-2.5 sm:p-3 ${
        context === "admin" ? "lg:relative" : ""
      } ${
        isOutOfStock && !isReadonly
          ? "border-brand-red/20 bg-brand-red/5"
          : "border-app-line bg-app-card"
      }`}
    >
      <div
        className="mb-2 flex items-center gap-2"
        onMouseEnter={() => canShowRolls && primeRolls(variant.id)}
        onFocus={() => canShowRolls && primeRolls(variant.id)}
      >
        <div className="relative size-9 shrink-0 overflow-hidden rounded-md border border-app-line bg-app-soft">
          {variant.image ? (
            <ImagePreview
              src={variant.image}
              alt={`Variant ${index + 1}`}
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowRolls((value) => !value)}
          disabled={!canShowRolls}
          aria-expanded={canShowRolls ? showRolls : undefined}
          className={`app-focus flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left ${
            context === "admin" && qrCode && !isReadonly ? "lg:pr-16" : ""
          } ${canShowRolls ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-app-ink">
              {colorLabel}
            </p>
            {qrCode && (
              <p className="truncate text-[10px] text-app-subtle">
                {qrCode.slice(0, 10)}...
              </p>
            )}
          </div>
          {canShowRolls &&
            (showRolls ? (
              <ChevronUp
                className="size-4 shrink-0 text-app-muted"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="size-4 shrink-0 text-app-muted"
                aria-hidden="true"
              />
            ))}
        </button>
      </div>

      <div
        className={`flex gap-1.5 overflow-x-auto pb-1 scrollbar-none ${
          context === "admin" ? "lg:block lg:overflow-visible lg:pb-0" : ""
        }`}
      >
        <StockMetresRow
          stockMeters={variant.stock_meters}
          availableMeters={variant.available_meters}
          isRollTracked={variant.is_roll_tracked}
          untrackedStockMeters={variant.untracked_stock_meters}
          desktopLayout={context === "admin"}
        />
      </div>

      <div
        className={`mt-2 flex items-center justify-end gap-2 ${
          context === "admin"
            ? "lg:absolute lg:right-3 lg:top-3 lg:mt-0"
            : ""
        }`}
      >
        {context === "admin" && qrCode && !isReadonly && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onPrintQR?.(qrCode, variant.id)}
            aria-label={`Print QR code for ${colorLabel}`}
            className="lg:size-10 lg:min-h-10 lg:w-10"
          >
            <QrCode className="size-4" aria-hidden="true" />
          </Button>
        )}
        {context === "agent" && (
          <Button onClick={() => onOrder?.(variant.id)}>Order</Button>
        )}
      </div>

      {showRolls && canShowRolls && (
        <VariantRollsList variantId={variant.id} label={colorLabel} />
      )}
    </div>
  );
}
