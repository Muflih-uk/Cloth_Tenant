"use client";

import { useState, useMemo, useCallback } from "react"; // ✅ added useCallback
import { Plus, ShoppingBag, Search, QrCode, X } from "lucide-react";
import { OutstandingDemandRow, toMeters, UIItem } from "@/types/item";
import ItemCard from "./ItemCard";
import OrderedItemList from "./OrderedItemList";
import QRScanModal from "./QRScanModal";
import {
    isItemOutOfStock,
    isItemPartiallyOutOfStock,
    isVariantOutOfStock,
} from "@/util/stockValidators";
import { PageLoading } from "../ui/Loading";

export type StockTab = "in_stock" | "out_of_stock" | "ordered";

interface ItemListProps {
    items: UIItem[];
    loading: boolean;
    context: "admin" | "agent";
    initialTab?: StockTab;
    onAddItem?: () => void;
    onEdit?: (id: number) => void;
    onPrintAll?: (id: number) => void;
    onPrintQR?: (qr: string, id: number) => void;
    onOrder?: (variantId: number) => void;
    onPriceCheck?: () => void;
    title?: string;
    outstandingDemand?: OutstandingDemandRow[];
    onOutstandingClick?: (fabricId: number) => void;
}

function filterItems(
    items: UIItem[],
    tab: StockTab,
    searchQuery: string,
    qrFilter: string | null,
): UIItem[] {
    let filtered = [...items];

    if (tab === "in_stock") {
        filtered = filtered.filter((item) => !isItemOutOfStock(item));
        filtered = filtered.map((item) => ({
            ...item,
            variants: item.variants.filter((v) => !isVariantOutOfStock(v)),
        }));
    } else if (tab === "out_of_stock") {
        filtered = filtered.filter(
            (item) =>
                isItemOutOfStock(item) ||
                isItemPartiallyOutOfStock(item),
        );
        filtered = filtered.map((item) => ({
            ...item,
            variants: item.variants.filter((v) => isVariantOutOfStock(v)),
        }));
    }

    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((item) =>
            [item.name, item.design_number, item.category]
                .filter((value): value is string => Boolean(value))
                .some((value) => value.toLowerCase().includes(query)),
        );
    }

    if (qrFilter) {
        const qr = qrFilter.toLowerCase();
        filtered = filtered.filter((item) =>
            item.variants.some((v) => v.qr_code?.toLowerCase().includes(qr)),
        );
    }

    return filtered;
}

export default function ItemList({
    items,
    loading,
    context,
    initialTab = "in_stock",
    onAddItem,
    onEdit,
    onPrintAll,
    onPrintQR,
    onOrder,
    onPriceCheck,
    title,
    outstandingDemand = [],
    onOutstandingClick,
}: ItemListProps) {
    const [activeTab, setActiveTab] = useState<StockTab>(initialTab);
    const [searchQuery, setSearchQuery] = useState("");
    const [qrFilter, setQrFilter] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [visibleCount, setVisibleCount] = useState(40);

    // ✅ memoized
    const toggleExpanded = useCallback((itemId: number) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    }, []);

    // ✅ memoized
    const handleQRScan = useCallback((qr: string) => {
        setQrFilter(qr);
        setShowQRScanner(false);
    }, []);

    // ✅ memoized
    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setQrFilter(null);
    }, []);

    // ✅ memoized
    const handleCloseScanner = useCallback(() => {
        setShowQRScanner(false);
    }, []);

    // ✅ memoized
    const handleShowScanner = useCallback(() => {
        setShowQRScanner(true);
    }, []);

    // ✅ memoized
    const handleShowMore = useCallback(() => {
        setVisibleCount((prev) => prev + 40);
    }, []);

    const filteredItems = useMemo(() => {
        return filterItems(items ?? [], activeTab, searchQuery, qrFilter);
    }, [items, activeTab, searchQuery, qrFilter]);

    const filteredOutstanding = useMemo(() => {
        const rowsWithDemand = outstandingDemand.filter(
            (row) => toMeters(row.outstanding_meters) > 0,
        );
        if (!searchQuery.trim()) return rowsWithDemand;
        const query = searchQuery.toLowerCase();
        return rowsWithDemand.filter((row) =>
            row.fabric.toLowerCase().includes(query),
        );
    }, [outstandingDemand, searchQuery]);

    const visibleItems = filteredItems.slice(0, visibleCount);

    const inStockCount = useMemo(
        () => items.filter((item) => !isItemOutOfStock(item)).length,
        [items],
    );
    const outOfStockCount = useMemo(
        () =>
            items.filter(
                (item) =>
                    isItemOutOfStock(item) || isItemPartiallyOutOfStock(item),
            ).length,
        [items],
    );

    const headerTitle =
        title || (context === "admin" ? "Inventory" : "My Items");
    const totalItemCount = context === "admin" ? items.length : inStockCount;
    const headerMeta =
        context === "admin"
            ? `${totalItemCount} item${totalItemCount === 1 ? "" : "s"}`
            : `${totalItemCount} available to order`;

    const hasActiveFilters = searchQuery || qrFilter;
    const tabGridClass =
        context === "admin" ? "grid-cols-3" : "grid-cols-2";

    if (loading) {
        return <PageLoading />;
    }

    return (
        <div>
            <QRScanModal
                isOpen={showQRScanner}
                onClose={handleCloseScanner}
                onScan={handleQRScan}
            />

            <div className="pb-2 sm:px-4 sm:pb-3 sm:pt-2">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-extrabold text-gray-900">
                            {headerTitle}
                        </h1>
                        <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                            {headerMeta}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        {context === "agent" && onPriceCheck && (
                            <button
                                type="button"
                                onClick={onPriceCheck}
                                aria-label="Check price"
                                className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-600 transition-colors hover:border-primary/30 hover:text-primary active:scale-95"
                            >
                                <QrCode size={16} />
                                Price
                            </button>
                        )}
                        {context === "admin" && onAddItem && (
                            <button
                                type="button"
                                onClick={onAddItem}
                                className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
                            >
                                <Plus size={16} />
                                Add
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-2 pb-2 sm:px-4 sm:pb-3">
                <div className="flex h-10 items-center rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                    <Search
                        size={16}
                        className="ml-3 flex-shrink-0 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder={
                            activeTab === "ordered"
                                ? "Search outstanding demand..."
                                : "Search name, code or fabric"
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                            className="mr-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleShowScanner}
                        aria-label="Scan QR code"
                        title="Scan QR code"
                        className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                        <QrCode size={16} />
                    </button>
                </div>

                {qrFilter && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-[11px] text-primary">
                        <span className="min-w-0 truncate font-medium">
                            QR filter: {qrFilter}
                        </span>
                        <button
                            type="button"
                            onClick={clearFilters}
                            aria-label="Clear QR filter"
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-primary/10"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                <div
                    className={`grid ${tabGridClass} gap-1 rounded-xl bg-gray-100 p-1`}
                >
                    <button
                        type="button"
                        onClick={() => setActiveTab("in_stock")}
                        aria-pressed={activeTab === "in_stock"}
                        className={`min-w-0 truncate rounded-lg px-1.5 py-2 text-[11px] font-bold transition-all ${
                            activeTab === "in_stock"
                                ? "bg-primary text-white shadow-sm"
                                : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                        }`}
                    >
                        In Stock ({inStockCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("out_of_stock")}
                        aria-pressed={activeTab === "out_of_stock"}
                        className={`min-w-0 truncate rounded-lg px-1.5 py-2 text-[11px] font-bold transition-all ${
                            activeTab === "out_of_stock"
                                ? "bg-primary text-white shadow-sm"
                                : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                        }`}
                    >
                        Out ({outOfStockCount})
                    </button>
                    {context === "admin" && (
                        <button
                            type="button"
                            onClick={() => setActiveTab("ordered")}
                            aria-pressed={activeTab === "ordered"}
                            className={`min-w-0 truncate rounded-lg px-1.5 py-2 text-[11px] font-bold transition-all ${
                                activeTab === "ordered"
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                            }`}
                        >
                            Outstanding ({filteredOutstanding.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-2 px-0 pb-6 sm:px-4 sm:pb-8">
                {activeTab === "ordered" ? (
                    filteredOutstanding.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                            <ShoppingBag size={40} className="mb-3" />
                            <h2 className="text-base font-bold text-gray-400">
                                No items found
                            </h2>
                            <p className="mt-1 text-xs text-gray-400">
                                {searchQuery.trim()
                                    ? "Try a different search"
                                    : "No fabric is awaiting packing"}
                            </p>
                            {searchQuery.trim() && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="mt-3 text-xs font-semibold text-primary hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <OrderedItemList
                            items={filteredOutstanding}
                            onItemClick={onOutstandingClick}
                        />
                    )
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                        <ShoppingBag size={40} className="mb-3" />
                        <h2 className="text-base font-bold text-gray-400">
                            No items found
                        </h2>
                        <p className="mt-1 text-xs text-gray-400">
                            {hasActiveFilters
                                ? "Try a different search"
                                : "No items in this category"}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="mt-3 text-xs font-semibold text-primary hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {visibleItems.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                context={context}
                                isExpanded={expandedItems.has(item.id)}
                                onToggle={() => toggleExpanded(item.id)}
                                onEdit={
                                    context === "admin" ? onEdit : undefined
                                }
                                onPrintAll={
                                    context === "admin" ? onPrintAll : undefined
                                }
                                onPrintQR={
                                    context === "admin" ? onPrintQR : undefined
                                }
                                onOrder={
                                    context === "agent" ? onOrder : undefined
                                }
                            />
                        ))}

                        {visibleCount < filteredItems.length && (
                            <button
                                onClick={handleShowMore}
                                className="w-full rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                                Show More ({filteredItems.length - visibleCount}{" "}
                                remaining)
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
