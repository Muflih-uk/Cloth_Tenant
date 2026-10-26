"use client";

import { ChevronDown, ChevronUp, Info, Edit, QrCode } from "lucide-react";
import { ImagePreview } from "@/components/pages/ImagePreview";
import { UIItem } from "@/types/item";
import { archiveCountdownLabel } from "@/util/archiveLabel";
import VariantCard from "./VariantCard";
import { isItemOutOfStock } from "@/util/stockValidators";
import { compareByVariantOrder } from "@/lib/sortVariants";

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
            className={`overflow-hidden rounded-xl border transition-colors ${
                itemStockOut
                    ? "border-red-200 bg-red-50/60"
                    : isExpanded
                      ? "border-primary/20 bg-white"
                      : "border-gray-200 bg-white"
            }`}
        >
            <div className="flex items-stretch gap-1.5 p-2">
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={`${isExpanded ? "Hide" : "Show"} details for ${item.name}`}
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-gray-50/80 active:bg-gray-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {image ? (
                            <ImagePreview
                                src={image}
                                alt={item.name}
                                enlargeDisabled
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <Info size={20} className="text-gray-300" />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <h3
                                title={item.name}
                                className="min-w-0 truncate text-sm font-bold leading-tight text-gray-900"
                            >
                                {item.name}
                            </h3>
                            {countdownDays != null && countdownDays >= 0 && (
                                <span
                                    className={`flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight ${
                                        countdownDays <= 7
                                            ? "border-amber-200 bg-amber-100 text-amber-700"
                                            : "border-gray-200 bg-gray-100 text-gray-500"
                                    }`}
                                >
                                    {archiveCountdownLabel(countdownDays)}
                                </span>
                            )}
                        </div>

                        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-gray-500">
                            <span className="max-w-[55%] truncate font-semibold text-gray-600">
                                {itemCode}
                            </span>
                            {item.category && (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="text-gray-300"
                                    >
                                        •
                                    </span>
                                    <span className="min-w-0 truncate">
                                        {item.category}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-gray-500">
                            <span className="font-medium">
                                {colourCount} colour
                                {colourCount !== 1 ? "s" : ""}
                            </span>
                            {pricePerMeter && context === "agent" && (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="text-gray-200"
                                    >
                                        •
                                    </span>
                                    <span className="font-bold text-primary">
                                        ₹
                                        {Number(
                                            pricePerMeter,
                                        ).toLocaleString("en-IN")}
                                        /m
                                    </span>
                                </>
                            )}
                            {itemStockOut && (
                                <span className="rounded-full bg-red-100 px-1.5 py-0.5 font-bold uppercase tracking-wide text-red-600">
                                    Out of stock
                                </span>
                            )}
                        </div>
                    </div>

                    <span className="flex h-8 w-5 flex-shrink-0 items-center justify-center text-gray-400">
                        {isExpanded ? (
                            <ChevronUp size={16} />
                        ) : (
                            <ChevronDown size={16} />
                        )}
                    </span>
                </button>

                {context === "admin" && !isReadonly && (
                    <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(item.id);
                            }}
                            aria-label={`Edit ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-primary hover:text-white active:scale-95"
                        >
                            <Edit size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPrintAll?.(item.id);
                            }}
                            aria-label={`Print QR codes for ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-primary hover:text-white active:scale-95"
                        >
                            <QrCode size={15} />
                        </button>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div
                    id={detailsId}
                    className="border-t border-gray-100 bg-gray-50/50 px-2 pb-2.5 pt-2 sm:px-3 sm:pb-3"
                >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {[...item.variants]
                            .sort(compareByVariantOrder)
                            .map((variant, index) => (
                                <VariantCard
                                    key={variant.id}
                                    variant={variant}
                                    index={index}
                                    context={context}
                                    onPrintQR={
                                        context === "admin"
                                            ? onPrintQR
                                            : undefined
                                    }
                                    onOrder={
                                        context === "agent" ? onOrder : undefined
                                    }
                                    isReadonly={isReadonly}
                                />
                            ))}
                    </div>
                </div>
            )}
        </article>
    );
}
