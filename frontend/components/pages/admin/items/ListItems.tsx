"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fabricApi } from "@/lib/api/item";
import { invalidateRolls } from "@/lib/rollsCache";
import { FabricStockEntry, OutstandingDemandRow, UIItem } from "@/types/item";
import { ItemList, StockTab } from "@/components/items";

interface ListItemsProps {
  initialTab?: StockTab;
}

export function normalizeAdminItem(item: FabricStockEntry): UIItem {
  return {
    id: item.id,
    name: item.name,
    design_number: item.design_number,
    category: item.category,
    price_per_meter: item.price_per_meter,
    variants: item.variants.map((variant) => ({
      id: variant.id,
      image: variant.image,
      qr_code: variant.qr_code,
      display_order: variant.display_order,
      stock_meters: variant.stock_meters,
      available_meters: variant.available_meters,
      untracked_stock_meters: variant.untracked_stock_meters,
      is_roll_tracked: variant.is_roll_tracked,
      roll_stock_meters: variant.roll_stock_meters,
    })),
  };
}

const ListItems: React.FC<ListItemsProps> = ({ initialTab }) => {
  const { isAuthenticated, role, permissions } = useAuth();
  const router = useRouter();
  const canEdit = role === "ADMIN" || permissions.items_edit;
  const searchParams = useSearchParams();
  const createdToken = searchParams.get("created");
  const [data, setData] = useState<UIItem[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingDemandRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    const fetchData = async () => {
      try {
        const [stockResult, demandResult] = await Promise.all([
          fabricApi.getStockList(),
          fabricApi.getOutstandingDemand(),
        ]);
        if (cancelled) return;
        setData(stockResult.map(normalizeAdminItem));
        setOutstanding(demandResult);
      } catch (e) {
        console.error("Error fetching fabrics:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();

    const handleFocus = () => {
      // Coming back to the tab means something may have been received or packed on
      // another device, so any colour's rolls held in memory are dropped rather
      // than trusted for the rest of their lifetime.
      invalidateRolls();
      void fetchData();
    };

    window.addEventListener("focus", handleFocus);

    const interval = setInterval(() => void fetchData(), 30000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [isAuthenticated, createdToken]);

  const handleEdit = (id: number) => {
    router.push(`/admin/items/edit/${id}`);
  };

  const handlePrintAll = (id: number) => {
    router.push(`/admin/items/qr-print?item=${id}`);
  };

  const handlePrintQR = (qr: string, id: number) => {
    router.push(`/admin/items/qr-print?qr=${qr}&id=${id}`);
  };

  return (
    <ItemList
      items={data}
      loading={loading}
      context="admin"
      initialTab={initialTab}
      onAddItem={canEdit ? () => router.push("/admin/items/new") : undefined}
      onEdit={canEdit ? handleEdit : undefined}
      onPrintAll={canEdit ? handlePrintAll : undefined}
      onPrintQR={handlePrintQR}
      outstandingDemand={outstanding}
      onOutstandingClick={(fabricId) =>
        router.push(`/admin/items/ordered/${fabricId}`)
      }
    />
  );
};

export default ListItems;
