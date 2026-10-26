"use client";
import OrderItem from "@/components/pages/admin/order-item/OrderItem";
import { customerApi } from "@/lib/api/customer";
import { transportApi } from "@/lib/api/transport";
import { toastError, toastSuccess } from "@/lib/toast";
import { CustomerResponse } from "@/types/customer";
import {
  ChevronLeft,
  Plus,
  User,
  ShoppingBag,
  AlertTriangle,
  MapPin,
  Package,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { orderApi } from "@/lib/api/order";
import { OrderResponse, PlaceOrderResponse, PlaceOrderShortfall } from "@/types/order";
import { formatMeters, toMeters } from "@/types/item";
import { PageLoading } from "@/components/ui/Loading";
import Button from "@/components/ui/app/Button";
import { AxiosError } from "axios";
import { OrderTotals } from "@/components/order";
import PriceOverrideDialog from "@/components/order/PriceOverrideDialog";
import { useBackButton } from "@/util/useBackButton";
import { Modal, ModalButton } from "@/components/ui/custom/Modals";
import { useOrderFlow } from "@/context/OrderFlowContext";
import { persistDraftOrderId, readDraftOrderId } from "@/lib/draftOrder";
import { extractErrorMessage } from "@/lib/orderFlow";

type LoadError = { kind: "notfound" | "error"; message?: string };

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { basePath, isAdmin, afterPlacePath } = useOrderFlow();

  const [data, setData] = useState<CustomerResponse>();
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orders, setOrders] = useState<OrderResponse>();
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Placing an order records demand; it never fails for want of cloth. Oversubscribed
  // lines come back as a report, and packing decides who gets what.
  const [showShortfallModal, setShowShortfallModal] = useState(false);
  const [shortfallLines, setShortfallLines] = useState<PlaceOrderShortfall[]>([]);
  const [shortfallNotice, setShortfallNotice] = useState<string | null>(null);
  const [showMergeWarning, setShowMergeWarning] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [savingTotal, setSavingTotal] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
  const [preferredTransportID, setPreferredTransportID] = useState<
    number | null
  >(null);
  const [transports, setTransports] = useState<
    { value: number; label: string }[]
  >([]);
  const [loadingTransports, setLoadingTransports] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [notes, setNotes] = useState<string>("");

  useBackButton({
    onBack: useCallback(() => {
      setShowLeaveConfirm(true);
    }, []),
  });

  const isReady = useRef(false);

  // The order this screen is working on, already validated against the customer
  // in the route. Everything below addresses the order through this rather than
  // re-reading storage, which can be repointed between render and click.
  const activeOrderId = orders?.id ?? null;

  useEffect(() => {
    if (!isReady.current) return; // skip until data is loaded
    if (activeOrderId === null) return;

    const timer = setTimeout(() => {
      orderApi
        .update(activeOrderId, {
          expected_delivery_date: expectedDeliveryDate || null,
          preferred_transport: preferredTransportID || null,
          notes: notes || null,
        })
        .catch(console.error);
    }, 600);

    return () => clearTimeout(timer);
  }, [expectedDeliveryDate, preferredTransportID, notes, activeOrderId]);

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
  // Bill what the order is actually worth, which is the agreed total once one
  // is set, not the raw line arithmetic.
  const totalMoney = Number(orders?.totals.effective_total ?? 0);
  const computedTotal = Number(orders?.totals.computed_total ?? 0);
  const isPriceOverridden = orders?.totals.is_price_overridden ?? false;
  // The total may only be set while the order is still a draft, and only while
  // there is something to bill -- an empty order has nothing to discount.
  const canSetTotal = orders?.status === "DRAFT" && totalMetres > 0;

  /**
   * Agree a total with the customer before the order is placed. The server caps
   * an agent at the line arithmetic; this only relays the number and refetches
   * so the summary reflects what was actually saved.
   */
  const handleSaveTotal = async (total: number, reason: string) => {
    if (activeOrderId === null) return;

    setSavingTotal(true);
    try {
      await orderApi.setPrice(activeOrderId, {
        final_total: total.toFixed(2),
        ...(reason ? { reason } : {}),
      });
      setShowPriceDialog(false);
      setOrders(await orderApi.getOne(activeOrderId));
      toastSuccess(
        Math.abs(total - computedTotal) < 0.005
          ? "Order total reset"
          : "Order total updated",
      );
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; detail?: string }>;
      toastError(
        extractErrorMessage(
          axiosError.response?.data,
          "Could not update the order total",
        ),
      );
    } finally {
      setSavingTotal(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (activeOrderId === null) return;
    if (duplicateGroups.length > 0) {
      setShowMergeWarning(true);
      return;
    }
    setPlacingOrder(true);
    try {
      const result = await orderApi.placeOrder(activeOrderId, {
        expected_delivery_date: expectedDeliveryDate || null,
        preferred_transport: preferredTransportID || null,
        notes: notes || null,
      });
      // The order is placed either way. Oversubscription is a packing decision,
      // so say so plainly and send the agent to the order.
      if (result.shortfall_lines?.length) {
        setShortfallLines(result.shortfall_lines);
        setShortfallNotice(result.notice);
        setShowShortfallModal(true);
        return;
      }
      toastSuccess("Order placed successfully!");
      router.push(afterPlacePath(activeOrderId));
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; detail?: string }>;
      toastError(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.detail ||
          "Failed to place order",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleProceedWithPlaceOrder = async () => {
    setShowMergeWarning(false);
    if (activeOrderId === null) return;
    setPlacingOrder(true);
    try {
      // Fold each duplicate set into one line. The server sums the metres in
      // Decimal and does the whole group in a single transaction -- summing in
      // JS gives values like 0.30000000000000004 that the serializer rejects,
      // and a failure halfway through a per-line loop leaves the order billing
      // for metres twice.
      for (const group of duplicateGroups) {
        await orderApi.mergeItems(activeOrderId, {
          keep_item_id: group.items[0].id,
          drop_item_ids: group.items.slice(1).map((i) => i.id),
        });
      }
      const res = await orderApi.getOne(activeOrderId);
      setOrders(res);
      const result: PlaceOrderResponse = await orderApi.placeOrder(
        activeOrderId,
        {
          expected_delivery_date: expectedDeliveryDate || null,
          preferred_transport: preferredTransportID || null,
          notes: notes || null,
        },
      );
      if (result.shortfall_lines?.length) {
        setShortfallLines(result.shortfall_lines);
        setShortfallNotice(result.notice);
        setShowShortfallModal(true);
        return;
      }
      toastSuccess("Order placed successfully!");
      router.push(afterPlacePath(activeOrderId));
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; detail?: string }>;
      toastError(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.detail ||
          "Failed to place order",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // Drop the previous order before fetching. Without this, `orders` keeps the
    // last order's value for the whole fetch, so any non-happy path renders
    // another customer's lines.
    setOrders(undefined);
    isReady.current = false;
    const fetchData = async () => {
      try {
        const numericId = parseInt(id, 10);
        const response = await customerApi.getOne(numericId);
        setData(response);
        const orderId = readDraftOrderId();
        if (orderId) {
          const res2 = await orderApi.getOne(orderId);
          // The route names the customer; storage names the order. If they
          // disagree the stored order belongs to somebody else, so refuse it
          // rather than editing (or emptying) it. See createDraftOrder.
          //
          // `customer` is write-only on the serializer, so it never comes back
          // in a response -- the owning customer only arrives nested as
          // customer_details. Reading res2.customer here would be undefined
          // and refuse every legitimate draft.
          if (res2.customer_details?.id !== numericId) {
            persistDraftOrderId(null);
            setLoadError({ kind: "notfound" });
            return;
          }
          setOrders(res2);
          setPreferredTransportID(
            res2.preferred_transport || response.preferred_transport,
          );
          setExpectedDeliveryDate(res2.expected_delivery_date || "");
          setNotes(res2.notes || "");
          isReady.current = true;
        } else {
          // No draft in storage at all, so there is nothing to edit. Say so
          // rather than rendering an empty order whose every save would fail.
          setLoadError({ kind: "notfound" });
        }
      } catch (e) {
        console.error("Error fetching order details:", e);
        const axiosError = e as AxiosError<{ error?: string; detail?: string }>;
        const status = axiosError.response?.status;
        console.error("Order details load failed:", status ?? "network error");
        if (status === 404) {
          // A reaped or removed draft leaves a dead id in storage, which would
          // make this page fail forever. Clear it so picking a customer again
          // starts from a clean slate.
          persistDraftOrderId(null);
          setLoadError({ kind: "notfound" });
        } else {
          setLoadError({
            kind: "error",
            message: extractErrorMessage(
              axiosError.response?.data,
              "Something went wrong",
            ),
          });
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchTransports = async () => {
      setLoadingTransports(true);
      try {
        const response = await transportApi.getActive();
        const formattedTransports = response.map((transport) => ({
          value: transport.id,
          label: transport.name,
        }));
        setTransports(formattedTransports);
      } catch (error) {
        console.error("Error fetching transports:", error);
      } finally {
        setLoadingTransports(false);
      }
    };

    fetchData();
    fetchTransports();
  }, [id, isAdmin, reloadKey]);

  const handleDeleteItem = (itemId: number) => {
    setOrders((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      };
    });
  };

  useEffect(() => {
    if (loadError && !isAdmin) {
      // Both roles now get the recovery screen below, so this banner is a
      // nudge only -- do not bounce the agent off a page they can act on.
      toastError("That order is no longer available.");
    }
  }, [loadError, isAdmin, router, basePath]);

  if (loading) return <PageLoading />;

  if (loadError) {
    const isNotFound = loadError.kind === "notfound";
    // An agent has no customer picker to hand, so their way back is the customer
    // list rather than a prefilled screen.
    const startOverPath = isAdmin
      ? `/admin/order/new?customer=${id}`
      : `${basePath}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-status-pending/15">
            <AlertTriangle
              size={26}
              className="text-[color:var(--status-pending-text)]"
            />
          </div>
          <h1 className="text-xl font-extrabold text-app-ink">
            {isNotFound ? "Order unavailable" : "Something went wrong"}
          </h1>
          <p className="mt-2 mb-6 text-sm font-medium text-app-muted">
            {isNotFound
              ? "This order draft has expired or was removed. You can start a new order for this customer."
              : loadError.message}
          </p>
          {isNotFound ? (
            <Button
              onClick={() => router.push(startOverPath)}
              className="w-full"
            >
              Start new order
            </Button>
          ) : (
            <Button
              onClick={() => {
                setLoadError(null);
                setReloadKey((k) => k + 1);
              }}
              className="w-full"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg pb-36">
      <header className="sticky top-0 z-20 border-b border-app-line/70 bg-app-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLeaveConfirm(true)}
            aria-label="Leave order"
            className="-ml-2 shrink-0"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold leading-tight text-app-ink">
              Order Details
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-app-muted">
              Step 2 — Add Fabrics
            </p>
          </div>
          {orders && orders.items.length > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-navy/15 bg-brand-navy/8 px-3 py-1.5">
              <Package
                size={12}
                className="text-brand-navy"
                aria-hidden="true"
              />
              <span className="text-xs font-bold text-brand-navy">
                {orders.items.length}
              </span>
            </div>
          )}
        </div>
      </header>

      {isAdmin && (
        <div className="border-b border-brand-navy/10 bg-brand-navy/5 px-4 py-2">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 text-[11px]">
            <span className="truncate font-semibold text-app-ink">
              Order for {data?.name ?? "—"}
            </span>
            <span className="shrink-0 font-medium text-app-muted">
              Agent: {data?.agent_name || "—"}
            </span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 sm:space-y-6 sm:pt-6">
        {/* Customer Card */}
        <div className="app-card overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 pb-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-navy/10">
                <User
                  size={20}
                  className="text-brand-navy"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-app-muted">
                  Customer
                </p>
                <h3 className="truncate text-base font-bold text-app-ink">
                  {data?.name}
                </h3>
              </div>
            </div>
            {data?.address && (
              <div className="flex items-start gap-2 rounded-control border border-app-line/60 bg-app-soft/60 px-3 py-2.5">
                <MapPin
                  size={12}
                  className="mt-0.5 shrink-0 text-app-muted"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed text-app-muted">
                  {data.address}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-app-line/70 p-4">
            <h3 className="text-sm font-bold text-app-ink">Delivery Options</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="expected-delivery-date"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
                >
                  Expected Delivery Date
                </label>
                <input
                  id="expected-delivery-date"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="app-focus h-12 w-full rounded-control border border-app-line bg-app-card px-2 text-base font-medium text-app-ink outline-none transition-colors focus:border-brand-navy sm:text-sm"
                />
                <p className="mt-1 text-[10px] font-medium text-app-muted">
                  Leave empty for &quot;Whenever&quot;
                </p>
              </div>

              <div>
                <label
                  htmlFor="preferred-transport"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
                >
                  Preferred Transport
                </label>
                <select
                  id="preferred-transport"
                  value={preferredTransportID || ""}
                  onChange={(e) =>
                    setPreferredTransportID(Number(e.target.value))
                  }
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
            <div>
              <label
                htmlFor="order-notes"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-muted"
              >
                Notes
              </label>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or remarks..."
                rows={3}
                className="app-focus w-full resize-none rounded-control border border-app-line bg-app-card px-3 py-3 text-base font-medium text-app-ink outline-none transition-colors placeholder:text-app-subtle focus:border-brand-navy sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-app-ink">Fabric Lines</h2>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-app-muted">
                {orders?.items.length
                  ? `${orders.items.length} line${orders.items.length !== 1 ? "s" : ""} · ${formatMeters(totalMetres)} m`
                  : "No fabrics yet"}
              </p>
            </div>
            <Button
              onClick={() => router.push(`${basePath}/${id}/scanner`)}
              className="shrink-0"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add Fabric
            </Button>
          </div>

          {!orders || orders.items.length === 0 ? (
            <button
              type="button"
              onClick={() => router.push(`${basePath}/${id}/scanner`)}
              className="app-focus flex w-full flex-col items-center justify-center rounded-card border-2 border-dashed border-app-line bg-app-card py-14 text-center transition-all hover:border-brand-navy/30 hover:bg-brand-navy/5"
            >
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-app-soft transition-colors">
                <ShoppingBag
                  size={26}
                  className="text-app-subtle"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-bold text-app-muted">
                No fabrics added yet
              </p>
              <p className="mt-1 text-xs font-medium text-app-muted">
                Tap to scan or search fabrics
              </p>
            </button>
          ) : (
            <div className="app-card overflow-hidden">
              <OrderItem
                orderId={orders.id}
                items={orders.items}
                isDeletable={true}
                isEditable={true}
                onDeleteItem={handleDeleteItem}
              />
            </div>
          )}
        </section>

        {orders && orders.items.length > 0 && (
          <OrderTotals
            totalMetres={totalMetres}
            totalLines={orders.items.length}
            totalPrice={totalMoney}
            onPlaceOrder={handlePlaceOrder}
            isLoading={placingOrder}
            buttonText="Place Order"
            computedTotal={computedTotal}
            isPriceOverridden={isPriceOverridden}
            onEditTotal={canSetTotal ? () => setShowPriceDialog(true) : undefined}
          />
        )}
      </main>

      {/* ── Modals ── */}

      {/* Agreed total -- only reachable while the order is still a draft */}
      {showPriceDialog && (
        <PriceOverrideDialog
          computedTotal={computedTotal}
          currentTotal={totalMoney}
          isOverridden={isPriceOverridden}
          canRaise={isAdmin}
          isSaving={savingTotal}
          onSave={handleSaveTotal}
          onClose={() => setShowPriceDialog(false)}
        />
      )}

      {/* Shortfall report -- the order is placed, packing decides the split */}
      {showShortfallModal && (
        <Modal
          icon={
            <AlertTriangle
              size={18}
              className="text-[color:var(--status-pending-text)]"
            />
          }
          iconBg="bg-status-pending/15"
          title="Order placed"
          description={
            shortfallNotice ??
            "Some of this order asks for more cloth than we hold. Packing will allocate what is available."
          }
          onClose={() => {
            setShowShortfallModal(false);
            if (activeOrderId !== null) router.push(afterPlacePath(activeOrderId));
          }}
          actions={
            <>
              <ModalButton
                variant="ghost"
                onClick={() => {
                  setShowShortfallModal(false);
                  if (activeOrderId !== null) router.push(afterPlacePath(activeOrderId));
                }}
              >
                View order
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={() => {
                  setShowShortfallModal(false);
                  if (activeOrderId !== null) router.push(afterPlacePath(activeOrderId));
                }}
              >
                Got it
              </ModalButton>
            </>
          }
        >
          <div className="space-y-2">
            {shortfallLines.map((line) => (
              <div
                key={line.order_item_id}
                className="rounded-control border border-status-pending/20 bg-status-pending/10 p-3"
              >
                <p className="text-sm font-bold text-app-ink">
                  {line.fabric_name}
                </p>
                {line.variant_display_order && (
                  <p className="mt-0.5 text-xs font-medium text-app-muted">
                    {line.variant_display_order}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-app-muted">
                  <span>
                    You asked:{" "}
                    <span className="font-bold text-app-ink">
                      {formatMeters(line.required)} m
                    </span>
                  </span>
                  <span>
                    Everyone wants:{" "}
                    <span className="font-bold text-app-ink">
                      {formatMeters(line.total_demand)} m
                    </span>
                  </span>
                  <span>
                    We hold:{" "}
                    <span className="font-bold text-[color:var(--status-pending-text)]">
                      {formatMeters(line.available)} m
                    </span>
                  </span>
                  <span>
                    Short by:{" "}
                    <span className="font-bold text-brand-red">
                      {formatMeters(line.shortfall)} m
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Merge Warning Modal */}
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
          description="The same colour was scanned more than once. They'll be combined into one line with the total metres."
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
                onClick={handleProceedWithPlaceOrder}
                disabled={placingOrder}
              >
                {placingOrder ? "Merging…" : "Proceed"}
              </ModalButton>
            </>
          }
        >
          {duplicateGroups.map((group, idx) => (
            <div
              key={idx}
              className="rounded-control border border-status-pending/20 bg-status-pending/10 p-3"
            >
              <p className="text-sm font-bold text-app-ink">
                {group.fabric_name}
              </p>
              {group.variant_display_order && (
                <p className="mt-0.5 text-xs font-medium text-app-muted">
                  {group.variant_display_order}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {group.items.map((item, i) => (
                  <span key={item.id} className="flex items-center gap-1.5">
                    <span className="rounded-lg border border-status-pending/20 bg-app-card px-2 py-1 text-xs font-bold text-[color:var(--status-pending-text)]">
                      {formatMeters(item.metres)} m
                    </span>
                    {i < group.items.length - 1 && (
                      <span className="text-xs text-app-muted">+</span>
                    )}
                  </span>
                ))}
                <span className="mx-0.5 text-xs text-app-muted">=</span>
                <span className="rounded-lg border border-status-pending/20 bg-status-pending/20 px-2 py-1 text-xs font-bold text-[color:var(--status-pending-text)]">
                  {formatMeters(group.totalMetres)} m
                </span>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <Modal
          icon={
            <AlertTriangle
              size={18}
              className="text-[color:var(--status-pending-text)]"
            />
          }
          iconBg="bg-status-pending/15"
          title="Leave Order?"
          description="Your current order progress may be lost if you go back."
          onClose={() => setShowLeaveConfirm(false)}
          actions={
            <>
              <ModalButton
                variant="ghost"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Stay
              </ModalButton>

              <ModalButton
                variant="primary"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  router.push(basePath);
                }}
              >
                Leave
              </ModalButton>
            </>
          }
        >
          <div className="rounded-control border border-status-pending/20 bg-status-pending/10 p-3">
            <p className="text-sm font-medium text-[color:var(--status-pending-text)]">
              Are you sure you want to leave this page?
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
