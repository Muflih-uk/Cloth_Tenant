"use client";

import { Printer } from "lucide-react";

import { ImagePreview } from "@/components/pages/ImagePreview";
import { FabricVariant } from "@/types/item";

import StockBadge from "./StockBadge";

interface VariantRowProps {
  variant: FabricVariant;
  index: number;
  onPrintQR?: (qr: string) => void;
}

export default function VariantRow({
  variant,
  index,
  onPrintQR,
}: VariantRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-app-line bg-app-soft/50 p-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-control border border-app-line bg-app-card shadow-card">
        {variant.image ? (
          <ImagePreview src={variant.image} alt={`Variant ${index + 1}`} />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Printer className="size-4 text-app-subtle" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-app-ink">
          {variant.display_order || `Variant #${index + 1}`}
        </p>
        <p className="text-xs text-app-muted">
          QR: {variant.qr_code?.slice(0, 8) || "N/A"}...
        </p>
      </div>

      <StockBadge
        total={Number(
          variant.is_roll_tracked
            ? variant.roll_stock_meters ?? variant.stock_meters
            : variant.stock_meters,
        )}
        available={
          variant.available_meters === undefined
            ? undefined
            : Number(variant.available_meters)
        }
        unit="m"
        physicalLabel={variant.is_roll_tracked ? "On rolls" : "Physical stock"}
        untrackedPhysical={Number(variant.untracked_stock_meters ?? 0)}
      />

      <button
        type="button"
        onClick={() => {
          if (variant.qr_code && onPrintQR) onPrintQR(variant.qr_code);
        }}
        disabled={!variant.qr_code}
        className="app-focus flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-navy text-white transition-colors hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
        title="Print QR"
        aria-label="Print QR code"
      >
        <Printer className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
