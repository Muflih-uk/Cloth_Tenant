"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { orderApi } from "@/lib/api/order";
import { OrderResponse } from "@/types/order";
import OrderDetailHeader from "@/components/pages/agent/order/OrderDetailHeader";
import OrderDetailItems from "@/components/pages/agent/order/OrderDetailItems";
import OrderLogs from "@/components/pages/order/OrderLogs";
import Button from "@/components/ui/app/Button";
import { PageLoading } from "@/components/ui/Loading";
import { Modal, ModalButton } from "@/components/ui/custom/Modals";
import { toastSuccess, toastError } from "@/lib/toast";
import { Package, Pencil, Trash2 } from "lucide-react";
import { formatMeters, toMeters } from "@/types/item";
import { useBackButton } from "@/util/useBackButton";
import OrderSummary from "@/components/pages/order/OrderSummary";
import { transportApi } from "@/lib/api/transport";

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrderResponse>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [startingEdit, setStartingEdit] = useState(false);

  useBackButton({
    onBack: useCallback(() => {
      router.push("/agent/");
    }, [router]),
  });

  const [transports, setTransports] = useState<
    { value: string; label: string }[]
  >([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await orderApi.getOne(Number(id));
      const transportData = await transportApi.getActive();
      const formattedTransports = transportData.map((transport) => ({
        value: transport.id.toString(),
        label: transport.name,
      }));
      setTransports(formattedTransports);
      setData(response);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleViewInvoice = () => {
    localStorage.setItem("orderKey", id);
    router.push("/agent/order/orderform");
  };

  const handleDeleteOrder = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await orderApi.agentDelete(Number(id));
      toastSuccess("Order deleted successfully");
      router.back();
    } catch (err) {
      toastError("Failed to delete order");
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditOrder = async () => {
    if (!id) return;
    setStartingEdit(true);
    try {
      await orderApi.startEdit(Number(id));
      localStorage.setItem("orderKey", id);
      router.push(`/agent/order/edit/${id}`);
    } catch (err) {
      toastError("Failed to start editing");
      console.error(err);
    } finally {
      setStartingEdit(false);
    }
  };

  if (loading) return <PageLoading text="Loading order…" />;

  const isDeletable = data?.status === "PENDING" || data?.status === "EDITING";
  // Agents want to see packing progress as soon as any cloth has moved, not
  // only once the whole order is done.
  const showPackingStatus = (data?.items ?? []).some(
    (item) => toMeters(item.allocated_quantity) > 0,
  );

  const getPreferredTransport = (id: string | number) => {
    return (
      transports.find((transport) => transport.value === id.toString())
        ?.label ?? ""
    );
  };

  return (
    <div className="min-h-screen bg-app-bg pb-24">
      <OrderDetailHeader
        orderId={id}
        backHref="/agent"
        onViewInvoice={handleViewInvoice}
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 pt-4">
        {data?.customer_details && data?.agent_details && (
          <OrderSummary
            customer={data?.customer_details}
            agent={data?.agent_details}
            orderDate={data?.created_at?.slice(0, 10) ?? ""}
            status={data?.status ?? ""}
            preferredTransport={
              data?.preferred_transport
                ? getPreferredTransport(data?.preferred_transport)
                : undefined
            }
            expectedDeliveryDate={
              data?.expected_delivery_date?.slice(0, 10) ?? ""
            }
            dispatchTransport={
              transports.find(
                (transport) =>
                  Number(transport.value) == data?.transport_company,
              )?.label ?? ""
            }
            notes={data?.notes ?? ""}
          />
        )}

        {showPackingStatus && (
          <section className="app-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Package
                size={16}
                className="text-app-muted"
                aria-hidden="true"
              />
              <h2 className="text-sm font-bold text-app-ink">
                Packing Status
              </h2>
            </div>
            <div className="space-y-2">
              {data?.items.map((item) => {
                const ordered = toMeters(item.ordered_quantity);
                const allocated = toMeters(item.allocated_quantity);
                const isFullyPacked = toMeters(item.outstanding_quantity) === 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-app-ink">
                      {item.fabric_name}
                      <span className="font-normal text-app-muted">
                        {item.variant_display_order
                          ? ` · ${item.variant_display_order}`
                          : ""}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-semibold ${
                        isFullyPacked
                          ? "text-[color:var(--status-dispatched-text)]"
                          : "text-[color:var(--status-pending-text)]"
                      }`}
                    >
                      {formatMeters(allocated)} / {formatMeters(ordered)} m
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <OrderDetailItems
            items={data?.items}
            orderId={Number(id)}
            status={data?.status}
            onRefresh={fetchData}
          />
        </section>

        {isDeletable && (
          <div className="flex gap-3 border-t border-app-line/70 pt-4">
            <Button
              variant="secondary"
              onClick={handleEditOrder}
              disabled={startingEdit}
              loading={startingEdit}
              fullWidth
            >
              <Pencil size={16} aria-hidden="true" />
              Edit
            </Button>
          </div>
        )}

        <OrderLogs orderId={Number(id)} />
      </main>

      {showDeleteDialog && (
        <Modal
          icon={<Trash2 size={18} className="text-brand-red" />}
          iconBg="bg-brand-red/10"
          title="Delete Order?"
          description={
            data?.status !== "DRAFT"
              ? "This will return the stock back to the warehouse. This action cannot be undone."
              : "Are you sure you want to delete this order?"
          }
          onClose={() => setShowDeleteDialog(false)}
          actions={
            <>
              <ModalButton
                variant="ghost"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
              >
                Cancel
              </ModalButton>
              <ModalButton
                variant="destructive"
                onClick={handleDeleteOrder}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </ModalButton>
            </>
          }
        />
      )}
    </div>
  );
}
