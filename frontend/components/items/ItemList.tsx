"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, QrCode, ShoppingBag, X } from "lucide-react";

import OrderedItemList from "./OrderedItemList";
import ItemCard from "./ItemCard";
import QRScanModal from "./QRScanModal";
import Button from "@/components/ui/app/Button";
import PageHeader from "@/components/ui/app/PageHeader";
import SearchInput from "@/components/ui/app/SearchInput";
import SegmentedControl from "@/components/ui/app/SegmentedControl";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton, SkeletonRow } from "@/components/ui/app/Skeleton";
import {
  isItemOutOfStock,
  isItemPartiallyOutOfStock,
  isVariantOutOfStock,
} from "@/util/stockValidators";
import { OutstandingDemandRow, toMeters, UIItem } from "@/types/item";

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
      (item) => isItemOutOfStock(item) || isItemPartiallyOutOfStock(item),
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

function ItemListSkeleton() {
  return (
    <div
      className="mx-auto min-h-screen w-full max-w-5xl bg-app-bg px-4 pb-24 pt-4 lg:max-w-7xl lg:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-20 rounded-control" />
      </div>
      <Skeleton className="h-12 rounded-full" />
      <Skeleton className="mt-3 h-12 rounded-full" />
      <div className="mt-4 space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="app-card space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-control" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-8 rounded-control" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SkeletonRow className="min-h-20" />
              <SkeletonRow className="min-h-20" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading items</span>
    </div>
  );
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

  const toggleExpanded = useCallback((itemId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handleQRScan = useCallback((qr: string) => {
    setQrFilter(qr);
    setShowQRScanner(false);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setQrFilter(null);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setShowQRScanner(false);
  }, []);

  const handleShowScanner = useCallback(() => {
    setShowQRScanner(true);
  }, []);

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + 40);
  }, []);

  const filteredItems = useMemo(
    () => filterItems(items ?? [], activeTab, searchQuery, qrFilter),
    [items, activeTab, searchQuery, qrFilter],
  );

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

  const headerTitle = title || (context === "admin" ? "Inventory" : "My Items");
  const totalItemCount = context === "admin" ? items.length : inStockCount;
  const headerMeta =
    context === "admin"
      ? `${totalItemCount} item${totalItemCount === 1 ? "" : "s"}`
      : `${totalItemCount} available to order`;

  const hasActiveFilters = Boolean(searchQuery || qrFilter);

  if (loading) return <ItemListSkeleton />;

  return (
    <div className="mx-auto min-h-full max-w-5xl bg-app-bg px-4 pb-24 pt-4 lg:max-w-7xl lg:px-6">
      <QRScanModal
        isOpen={showQRScanner}
        onClose={handleCloseScanner}
        onScan={handleQRScan}
      />

      <PageHeader
        title={headerTitle}
        subtitle={headerMeta}
        right={
          <div className="flex items-center gap-2">
            {context === "agent" && onPriceCheck && (
              <Button variant="secondary" onClick={onPriceCheck}>
                <QrCode className="size-4" aria-hidden="true" />
                Price
              </Button>
            )}
            {context === "admin" && onAddItem && (
              <Button onClick={onAddItem}>
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={
              activeTab === "ordered"
                ? "Search outstanding demand..."
                : "Search name, code or fabric"
            }
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={handleShowScanner}
            aria-label="Scan QR code"
            title="Scan QR code"
          >
            <QrCode className="size-5" aria-hidden="true" />
          </Button>
        </div>

        {qrFilter && (
          <div className="flex items-center justify-between gap-2 rounded-control border border-brand-navy/15 bg-brand-navy/5 px-3 py-2 text-xs text-brand-navy">
            <span className="min-w-0 truncate font-medium">
              QR filter: {qrFilter}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Clear QR filter"
              className="app-focus flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-brand-navy/10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <SegmentedControl
          ariaLabel="Filter items by stock status"
          value={activeTab}
          onChange={setActiveTab}
          options={
            context === "admin"
              ? [
                  {
                    value: "in_stock",
                    label: "In stock",
                    count: inStockCount,
                  },
                  {
                    value: "out_of_stock",
                    label: "Out",
                    count: outOfStockCount,
                  },
                  {
                    value: "ordered",
                    label: "Outstanding",
                    count: filteredOutstanding.length,
                  },
                ]
              : [
                  {
                    value: "in_stock",
                    label: "In stock",
                    count: inStockCount,
                  },
                  {
                    value: "out_of_stock",
                    label: "Out",
                    count: outOfStockCount,
                  },
                ]
          }
        />
      </div>

      <div className="mt-4 space-y-3">
        {activeTab === "ordered" ? (
          filteredOutstanding.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="size-5" aria-hidden="true" />}
              title="No outstanding demand"
              description={
                searchQuery.trim()
                  ? "Try a different search."
                  : "No fabric is awaiting packing."
              }
              action={
                searchQuery.trim() ? (
                  <Button variant="secondary" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <OrderedItemList
              items={filteredOutstanding}
              onItemClick={onOutstandingClick}
            />
          )
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="size-5" aria-hidden="true" />}
            title="No items found"
            description={
              hasActiveFilters
                ? "Try a different search or clear the QR filter."
                : "No items in this category."
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div
              className={
                context === "admin"
                  ? "space-y-3"
                  : "space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0"
              }
            >
              {visibleItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  context={context}
                  isExpanded={expandedItems.has(item.id)}
                  onToggle={() => toggleExpanded(item.id)}
                  onEdit={context === "admin" ? onEdit : undefined}
                  onPrintAll={context === "admin" ? onPrintAll : undefined}
                  onPrintQR={context === "admin" ? onPrintQR : undefined}
                  onOrder={context === "agent" ? onOrder : undefined}
                />
              ))}
            </div>

            {visibleCount < filteredItems.length && (
              <Button variant="secondary" fullWidth onClick={handleShowMore}>
                Show more ({filteredItems.length - visibleCount} remaining)
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
