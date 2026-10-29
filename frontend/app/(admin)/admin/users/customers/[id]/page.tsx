"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import { DetailList, DetailRow } from "@/components/ui/app/DetailList";
import ListRow from "@/components/ui/app/ListRow";
import PageHeader from "@/components/ui/app/PageHeader";
import { SkeletonCard } from "@/components/ui/app/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import DeleteWithTransferDialog from "@/components/ui/deleteWithTransferDialog";
import FormField from "@/components/ui/custom/FormField";
import StockFlowSelect from "@/components/ui/custom/stockFlowSelect";
import StatusBadge from "@/components/ui/custom/StatusBadge";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { agentApi } from "@/lib/api/agents";
import { customerApi } from "@/lib/api/customer";
import { orderApi } from "@/lib/api/order";
import { toastError, toastSuccess } from "@/lib/toast";
import { formatMeters } from "@/types/item";
import type { OrderResponse } from "@/types/order";
import { CustomerResponse, CustomerUpdateRequest } from "@/types/customer";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { role, permissions } = useAuth();
  const canWriteCustomers = role === "ADMIN";
  const canSeeOrders =
    role === "ADMIN" || role === "AGENT" || permissions.orders_view;
  const canSeeAgents =
    role === "ADMIN" || role === "AGENT" || permissions.agents_view;

  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [agents, setAgents] = useState<{ value: string; label: string }[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    gst: "",
    agent: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const numericId = parseInt(id as string, 10);
        const emptyOrders = { results: [] as OrderResponse[], count: 0 };
        const [customerData, agentsData, ordersData] = await Promise.all([
          customerApi.getOne(numericId),
          canSeeAgents ? agentApi.getAll() : Promise.resolve([]),
          canSeeOrders
            ? orderApi.getByCustomer(numericId, {
                page: currentPage,
                page_size: pageSize,
              })
            : Promise.resolve(emptyOrders),
        ]);
        const filteredOrders = ordersData.results.filter(
          (eachOrder) => eachOrder.status !== "DRAFT",
        );
        setCustomer(customerData);
        setOrders(filteredOrders);
        setTotalOrders(ordersData.count);
        setTotalPages(Math.ceil(ordersData.count / pageSize));
        setFormData({
          name: customerData.name,
          address: customerData.address,
          contact: customerData.contact,
          agent: customerData.agent?.toString() ?? "",
          gst: customerData.gst,
        });
        setAgents(
          agentsData.map((agent) => ({
            value: agent.id.toString(),
            label: agent.user.username,
          })),
        );
      } catch (error) {
        console.error("Error fetching customer:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentPage, pageSize, canSeeAgents, canSeeOrders]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.contact.trim()) newErrors.contact = "Contact is required";
    if (!formData.gst.trim()) {
      newErrors.gst = "GST number is required";
    } else if (
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        formData.gst.toUpperCase(),
      )
    ) {
      newErrors.gst = "Invalid GST format (e.g. 29ABCDE1234F1Z5)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const numericId = parseInt(id as string, 10);
      const payload: CustomerUpdateRequest = {
        name: formData.name,
        address: formData.address,
        contact: formData.contact,
        agent: formData.agent ? parseInt(formData.agent, 10) : null,
        gst: formData.gst,
      };
      await customerApi.update(numericId, payload);
      toastSuccess("Customer updated successfully");
      setIsEditing(false);
      router.push("/admin/users/");
    } catch (error: unknown) {
      console.error("Error updating customer:", error);
      toastError("Failed to update customer", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (
    _id: number,
    payload: {
      pin: string;
      action: "transfer" | "deactivate";
      transfer_to_id?: number;
    },
  ) => {
    setDeleting(true);
    try {
      await customerApi.delete(_id, payload.pin, payload.action);
      toastSuccess("Customer deleted successfully");
      router.push("/admin/users/");
    } catch (error) {
      setDeleting(false);
      throw error;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    void size;
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl lg:max-w-7xl lg:px-6 space-y-3 px-2 pb-32 pt-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl lg:max-w-7xl lg:px-6 px-2 pb-32 pt-4">
        <EmptyState
          title="Customer not found"
          description="This customer may have been deleted or is no longer available."
          action={
            <Button onClick={() => router.push("/admin/users/")}>
              Back to users
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl lg:max-w-7xl lg:px-6 px-2 pb-32 pt-2">
      <DeleteWithTransferDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        entityType="customer"
        entityId={parseInt(id as string, 10)}
        entityName={customer.name}
        onFetchDeleteInfo={customerApi.getDeleteInfo}
        onDelete={handleDeleteConfirm}
      />

      <div className="mb-4 flex items-start gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Go back"
          className="-ml-2"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Button>
        <PageHeader
          title="Customer profile"
          subtitle="Manage client details and order history."
          className="flex-1"
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <StockflowAvatar
          user={customer}
          size="lg"
          className="size-20 text-2xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-app-ink">
            {customer.name}
          </h2>
          <p className="app-secondary mt-1">Customer ID #{id}</p>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        {canWriteCustomers && (
          <>
            <Button
              onClick={() => router.push(`/admin/order/new?customer=${id}`)}
              className="flex-1"
            >
              <Plus className="size-4" aria-hidden="true" />
              New order
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsEditing((value) => !value)}
              aria-label={isEditing ? "View customer details" : "Edit customer"}
              aria-pressed={isEditing}
            >
              {isEditing ? (
                <Eye className="size-5" aria-hidden="true" />
              ) : (
                <Pencil className="size-5" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleDeleteClick}
              loading={deleting}
              aria-label="Delete customer"
              className="text-brand-red hover:bg-brand-red/10"
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      {isEditing ? (
        <Card>
          <div className="space-y-5">
            <FormField
              label="Customer name"
              htmlFor="customer-edit-name"
              error={errors.name}
            >
              <Input
                id="customer-edit-name"
                value={formData.name}
                onChange={(event) =>
                  handleChange("name", event.target.value)
                }
                aria-invalid={Boolean(errors.name)}
              />
            </FormField>

            <FormField
              label="Assigned agent (optional)"
              htmlFor="customer-edit-agent"
            >
              <StockFlowSelect
                value={formData.agent}
                onChange={(value) => handleChange("agent", value)}
                options={[
                  { value: "", label: "No agent assigned" },
                  ...agents,
                ]}
                disabled={saving}
                placeholder="No agent assigned"
              />
            </FormField>

            <FormField
              label="Shipping address"
              htmlFor="customer-edit-address"
              error={errors.address}
            >
              <Textarea
                id="customer-edit-address"
                rows={3}
                value={formData.address}
                onChange={(event) =>
                  handleChange("address", event.target.value)
                }
                aria-invalid={Boolean(errors.address)}
              />
            </FormField>

            <FormField
              label="Contact detail"
              htmlFor="customer-edit-contact"
              error={errors.contact}
            >
              <Input
                id="customer-edit-contact"
                inputMode="tel"
                value={formData.contact}
                onChange={(event) =>
                  handleChange("contact", event.target.value)
                }
                aria-invalid={Boolean(errors.contact)}
              />
            </FormField>

            <FormField
              label="GST number"
              htmlFor="customer-edit-gst"
              error={errors.gst}
            >
              <Input
                id="customer-edit-gst"
                value={formData.gst}
                onChange={(event) =>
                  handleChange("gst", event.target.value.toUpperCase())
                }
                aria-invalid={Boolean(errors.gst)}
              />
            </FormField>
          </div>

          <Button
            size="lg"
            onClick={handleUpdate}
            loading={saving}
            loadingText="Saving changes..."
            className="mt-6 w-full"
          >
            Save Changes
          </Button>
        </Card>
      ) : (
        <>
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
          <Card title="Contact details" className="mb-4 lg:mb-0">
            <DetailList>
              <DetailRow label="Contact">
                {customer.contact ? (
                  <a
                    href={`tel:${customer.contact}`}
                    className="app-focus rounded-sm text-brand-navy underline-offset-2 hover:underline"
                  >
                    {customer.contact}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Address">{customer.address || "—"}</DetailRow>
              <DetailRow label="GST">
                <span className="font-mono text-[13px]">
                  {customer.gst || "—"}
                </span>
              </DetailRow>
              <DetailRow label="Agent">{customer.agent_name || "—"}</DetailRow>
            </DetailList>
          </Card>

          <Card
            title="Order history"
            subtitle={`${totalOrders} ${totalOrders === 1 ? "order" : "orders"}`}
            action={
              <Button
                variant="secondary"
                size="icon"
                onClick={() =>
                  router.push(`/admin/order/new?customer=${id}`)
                }
                aria-label="Create order"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            }
          >
            {orders.length === 0 ? (
              <EmptyState
                title="No orders yet"
                description="Create the first order for this customer."
                icon={<Package className="size-5" aria-hidden="true" />}
              />
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <ListRow
                    key={order.id}
                    href={`/admin/order/status/${order.id}`}
                    title={`Order #${order.id}`}
                    subtitle={`${formatMeters(order.totals?.total_ordered_meters)} m`}
                    trailing={<StatusBadge status={order.status} />}
                  />
                ))}
              </div>
            )}
          </Card>

          <div className="lg:col-span-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalOrders}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
          </div>
        </>
      )}
    </div>
  );
}
