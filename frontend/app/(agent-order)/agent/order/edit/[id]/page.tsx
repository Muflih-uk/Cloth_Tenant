"use client";
import OrderItem from "@/components/pages/admin/order-item/OrderItem";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  ChevronLeft,
  Plus,
  ShoppingBag,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { orderApi } from "@/lib/api/order";
import { OrderResponse } from "@/types/order";
import { formatMeters, toMeters } from "@/types/item";
import { PageLoading } from "@/components/ui/Loading";
import Button from "@/components/ui/app/Button";
import { AxiosError } from "axios";
import { OrderTotals } from "@/components/order";
import { useEditGuard } from "@/lib/useEditGuard";
import { transportApi } from "@/lib/api/transport";
import { Modal, ModalButton } from "@/components/ui/custom/Modals";

export default function EditOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { handleBack } = useEditGuard(id);

  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orders, setOrders] = useState<OrderResponse>();
  const [loadError, setLoadError] = useState(false);
  const [showMergeWarning, setShowMergeWarning] = useState(false);

  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [preferredTransport, setPreferredTransport] = useState("");

  const [transports, setTransports] = useState<
    { value: string; label: string }[]
  >([]);

  const [loadingTransports, setLoadingTransports] = useState(true);
  const [notes, setNotes] = useState("");
  interface MergeGroup {
    fabric_name: string;
    variant_display_order: string;
    items: Array<{ id: number; metres: number }>;
    totalMetres: number;
  }

  /** The same colour scanned twice is really one line; the totals get combined. */
  const duplicateGroups = (() => {
    if (!orders?.items.length) return [];

    const map = new Map<
      string,
      { id: number; metres: number; fabric_name: string; variant_display_order: string }[]
    >();
    for (const item of orders.items) {
      const key = `${item.fabric ?? "unknown"}-${item.variant ?? "none"}`;
      const group = map.get(key) ?? [];
      group.push({
        id: item.id,
        metres: toMeters(item.ordered_quantity),
        fabric_name: item.fabric_name,
        variant_display_order: item.variant_display_order,
      });
      map.set(key, group);
    }

    const groups: MergeGroup[] = [];
    for (const [, items] of map) {
      if (items.length > 1) {
        groups.push({
          fabric_name: items[0].fabric_name,
          variant_display_order: items[0].variant_display_order,
          items: items.map((i) => ({ id: i.id, metres: i.metres })),
          totalMetres: items.reduce((sum, i) => sum + i.metres, 0),
        });
      }
    }
    return groups;
  })();

  const totalMetres =
    orders?.items.reduce((sum, item) => sum + toMeters(item.ordered_quantity), 0) ?? 0;
  // Show what the order bills. An agreed total set before placing survives the
  // edit, so showing the raw line arithmetic here would contradict the invoice.
  const totalMoney = Number(orders?.totals.effective_total ?? 0);

  const handleSaveChanges = async () => {
    if (duplicateGroups.length > 0) {
      setShowMergeWarning(true);
      return;
    }

    setPlacingOrder(true);
    try {
      await orderApi.saveEdit(Number(id), {
        expected_delivery_date: expectedDeliveryDate || null,
        preferred_transport: preferredTransport
          ? parseInt(preferredTransport)
          : null,
        notes: notes || null,
      });
      toastSuccess("Order saved successfully!");
      router.push(`/agent/order/status/${id}`);
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; detail?: string }>;
      toastError(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.detail ||
          "Failed to save order",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleProceedWithSave = async () => {
    setShowMergeWarning(false);

    setPlacingOrder(true);
    try {
      for (const group of duplicateGroups) {
        const firstItemId = group.items[0].id;
        await orderApi.updateItem(firstItemId, {
          ordered_quantity: String(group.totalMetres),
        });
        for (let i = 1; i < group.items.length; i++) {
          await orderApi.deleteItem(Number(id), group.items[i].id);
        }
      }
      const res = await orderApi.getOne(Number(id));
      setOrders(res);

      await orderApi.saveEdit(Number(id), {
        expected_delivery_date: expectedDeliveryDate || null,
        preferred_transport: preferredTransport
          ? parseInt(preferredTransport)
          : null,
        notes: notes || null,
      });
      toastSuccess("Order saved successfully!");
      router.push(`/agent/order/status/${id}`);
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; detail?: string }>;
      toastError(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.detail ||
          "Failed to save order",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await orderApi.getOne(Number(id));

        setOrders(res);
        setExpectedDeliveryDate(
          res.expected_delivery_date ? res.expected_delivery_date : "",
        );

        setPreferredTransport(
          res.preferred_transport ? String(res.preferred_transport) : "",
        );
        setNotes(res.notes || "");
      } catch (e) {
        console.error("Error fetching order details:", e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchTransports = async () => {
      setLoadingTransports(true);

      try {
        const response = await transportApi.getActive();

        const formatted = response.map((transport) => ({
          value: transport.id.toString(),
          label: transport.name,
        }));

        setTransports(formatted);
      } catch (error) {
        console.error("Error fetching transports:", error);
      } finally {
        setLoadingTransports(false);
      }
    };

    fetchData();
    fetchTransports();
  }, [id]);

  useEffect(() => {
    if (loadError) {
      toastError("Server Error");
      router.push(`/agent/order/status/${id}`);
    }
  }, [loadError, router, id]);

  if (loading) return <PageLoading />;

  return (
    <div className="min-h-screen bg-app-bg pb-32">
      <header className="sticky top-0 z-10 border-b border-app-line/70 bg-app-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Back to order"
            className="-ml-2 shrink-0"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-xl font-extrabold leading-tight text-app-ink">
              Edit Order
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
              Modify Items
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-4 sm:pt-6">
        {orders && orders.items.length > 0 && (
          <section className="app-card p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Package
                size={16}
                className="text-brand-navy"
                aria-hidden="true"
              />
              <h2 className="text-sm font-bold text-app-ink">
                Delivery Options
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="edit-delivery-date"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
                >
                  Expected Delivery Date
                </label>

                <input
                  id="edit-delivery-date"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="app-focus h-12 w-full rounded-control border border-app-line bg-app-card px-2 text-base font-medium text-app-ink outline-none transition-colors focus:border-brand-navy sm:text-sm"
                />

                <p className="mt-1 text-[10px] font-medium text-app-muted">
                  Leave empty for &quot;Whenever&quot;
                </p>
              </div>

              <div>
                <label
                  htmlFor="edit-transport"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
                >
                  Preferred Transport
                </label>

                <select
                  id="edit-transport"
                  value={preferredTransport}
                  onChange={(e) => setPreferredTransport(e.target.value)}
                  disabled={loadingTransports}
                  className="app-focus h-12 w-full appearance-none rounded-control border border-app-line bg-app-card px-3 text-base font-medium text-app-ink outline-none transition-colors focus:border-brand-navy disabled:opacity-60 sm:text-sm"
                >
                  <option value="">None</option>

                  {transports.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label
                htmlFor="edit-notes"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
              >
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or remarks..."
                rows={3}
                className="app-focus w-full resize-none rounded-control border border-app-line bg-app-card px-3 py-3 text-base font-medium text-app-ink outline-none transition-colors placeholder:text-app-subtle focus:border-brand-navy sm:text-sm"
              />
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <h2 className="text-base font-bold text-app-ink">Fabric Lines</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
                  Selected
                </span>
                <div className="rounded-full border border-brand-navy/15 bg-brand-navy/8 px-3 py-0.5">
                  <span className="text-xs font-bold text-brand-navy">
                    {orders?.items.length || 0}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/agent/order/edit/${id}/scanner`)}
              className="shrink-0"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add Fabric
            </Button>
          </div>

          <div className="space-y-4">
            {!orders || orders.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-app-line bg-app-card py-16 text-center">
                <ShoppingBag
                  size={48}
                  className="mb-4 text-app-subtle"
                  aria-hidden="true"
                />
                <p className="font-bold text-app-muted">
                  No fabrics added yet
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-app-muted">
                  Scan a fabric QR to add metres
                </p>
              </div>
            ) : (
              <div className="app-card overflow-hidden">
                <OrderItem
                  orderId={orders.id}
                  items={orders.items}
                  isDeletable={true}
                  isEditable={true}
                />
              </div>
            )}
          </div>
        </section>

        {orders && orders.items.length > 0 && (
          <OrderTotals
            totalMetres={totalMetres}
            totalLines={orders.items.length}
            totalPrice={totalMoney}
            onPlaceOrder={handleSaveChanges}
            isLoading={placingOrder}
            buttonText="Save Changes"
          />
        )}
      </main>

      {showMergeWarning && (
        <Modal
          icon={
            <AlertTriangle
              size={18}
              className="text-[color:var(--status-pending-text)]"
            />
          }
          iconBg="bg-status-pending/15"
          title="Duplicate Fabrics"
          description="The same colour was scanned more than once. They will be combined into one line with the total metres."
          onClose={() => setShowMergeWarning(false)}
          actions={
            <>
              <ModalButton
                variant="ghost"
                onClick={() => setShowMergeWarning(false)}
              >
                Cancel
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={handleProceedWithSave}
                disabled={placingOrder}
              >
                {placingOrder ? "Merging..." : "Proceed"}
              </ModalButton>
            </>
          }
        >
          <div className="max-h-48 space-y-3 overflow-y-auto">
            {duplicateGroups.map((group, idx) => (
              <div
                key={idx}
                className="rounded-control border border-status-pending/20 bg-status-pending/10 p-3"
              >
                <p className="text-sm font-bold text-app-ink">
                  {group.fabric_name}
                  {group.variant_display_order
                    ? ` — ${group.variant_display_order}`
                    : ""}
                </p>
                <p className="mt-1 text-xs font-medium text-app-muted">
                  {group.items.map((item, i) => (
                    <span key={item.id}>
                      <span className="font-semibold text-app-ink">
                        {formatMeters(item.metres)} m
                      </span>
                      {i < group.items.length - 1 && (
                        <span className="text-app-muted"> + </span>
                      )}
                    </span>
                  ))}
                  <span className="text-app-muted"> = </span>
                  <span className="font-bold text-[color:var(--status-pending-text)]">
                    {formatMeters(group.totalMetres)} m
                  </span>
                </p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
