"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Copy,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import { DetailList, DetailRow } from "@/components/ui/app/DetailList";
import PageHeader from "@/components/ui/app/PageHeader";
import { SkeletonCard } from "@/components/ui/app/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import DeleteWithTransferDialog from "@/components/ui/deleteWithTransferDialog";
import FormField from "@/components/ui/custom/FormField";
import { Modal } from "@/components/ui/custom/Modals";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import TransferCopyItemsDialog from "@/components/ui/transferItemsDialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ItemAssignment from "@/components/pages/agent/ItemAssignment";
import { useAuth } from "@/context/AuthContext";
import { agentApi } from "@/lib/api/agents";
import { fabricApi } from "@/lib/api/item";
import { toastError, toastSuccess } from "@/lib/toast";
import { deriveUsername } from "@/lib/utils/deriveUsername";
import { AgentResponse, AgentUpdateRequest, AssignedItem } from "@/types/agent";
import type { Fabric } from "@/types/item";

export default function AgentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { role, permissions } = useAuth();
  const canManageAgents = role === "ADMIN";
  const canViewAgentItems = canManageAgents || permissions.items_view;

  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
    email: "",
    contact: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionDialogMode, setActionDialogMode] = useState<"transfer" | "copy">(
    "transfer",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [deletingAllItems, setDeletingAllItems] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const [items, setItems] = useState<Fabric[]>([]);

  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);

  const [savedVariantIds, setSavedVariantIds] = useState<number[]>([]);

  const [savingItems, setSavingItems] = useState(false);

  const [variantCreatedAt, setVariantCreatedAt] = useState<Map<number, string>>(
    new Map(),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const numericId = parseInt(id as string, 10);
        const [agentData, itemsData] = await Promise.all([
          agentApi.getOne(numericId),
          canViewAgentItems ? fabricApi.getAll() : Promise.resolve([]),
        ]);
        setAgent(agentData);
        setItems(itemsData);
        const ids = (agentData.assigned_items || []).flatMap(
          (item: AssignedItem) => item.variants.map((variant) => variant.id),
        );
        const createdAtMap = new Map<number, string>();
        for (const item of agentData.assigned_items || []) {
          for (const variant of item.variants) {
            if (variant.created_at) {
              createdAtMap.set(variant.id, variant.created_at);
            }
          }
        }
        setVariantCreatedAt(createdAtMap);
        setSelectedVariantIds(ids);
        setSavedVariantIds(ids);
        setFormData({
          username: agentData.user.username,
          display_name: agentData.user.display_name || "",
          email: agentData.user.email,
          contact: agentData.contact,
        });
      } catch (error) {
        console.error("Error fetching agent:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, canViewAgentItems]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const numericId = parseInt(id as string, 10);
      const username = deriveUsername(
        formData.display_name || formData.username,
      );
      const payload: AgentUpdateRequest = {
        username,
        display_name: formData.display_name,
        email: formData.email,
        contact: formData.contact,
      };
      await agentApi.update(numericId, payload);
      toastSuccess("Agent details updated");
      setIsEditing(false);
      router.push("/admin/users/");
    } catch (error: unknown) {
      console.error("Error updating agent:", error);
      toastError("Failed to update agent details", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItems = async () => {
    setSavingItems(true);
    try {
      const numericId = parseInt(id as string, 10);
      await agentApi.updateItems(numericId, selectedVariantIds);
      const updatedAgent = await agentApi.getOne(numericId);
      setAgent(updatedAgent);
      const confirmedIds = (updatedAgent.assigned_items || []).flatMap(
        (item: AssignedItem) => item.variants.map((variant) => variant.id),
      );
      const createdAtMap = new Map<number, string>();
      for (const item of updatedAgent.assigned_items || []) {
        for (const variant of item.variants) {
          if (variant.created_at) {
            createdAtMap.set(variant.id, variant.created_at);
          }
        }
      }
      setVariantCreatedAt(createdAtMap);
      setSelectedVariantIds(confirmedIds);
      setSavedVariantIds(confirmedIds);
      toastSuccess("Items updated successfully");
    } catch (error) {
      console.error("Error saving items:", error);
      toastError("Failed to save item assignments", error);
    } finally {
      setSavingItems(false);
    }
  };

  const toggleVariant = (variantId: number) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId)
        ? prev.filter((item) => item !== variantId)
        : [...prev, variantId],
    );
  };

  const hasChanges =
    [...selectedVariantIds].sort().join(",") !==
    [...savedVariantIds].sort().join(",");

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
      await agentApi.delete(
        _id,
        payload.pin,
        payload.action,
        payload.transfer_to_id,
      );
      toastSuccess("Agent deleted successfully");
      router.push("/admin/users/");
    } catch (error) {
      setDeleting(false);
      throw error;
    }
  };

  const handleItemAction = async (targetAgentId: number) => {
    try {
      const numericId = parseInt(id as string, 10);
      if (actionDialogMode === "transfer") {
        await agentApi.transferItems(numericId, targetAgentId);
        toastSuccess("Items transferred successfully");
      } else {
        await agentApi.copyItems(numericId, targetAgentId);
        toastSuccess("Items copied successfully");
      }

      const updatedAgent = await agentApi.getOne(numericId);
      setAgent(updatedAgent);

      const confirmedIds = (updatedAgent.assigned_items || []).flatMap(
        (item: AssignedItem) => item.variants.map((variant) => variant.id),
      );

      const createdAtMap = new Map<number, string>();
      for (const item of updatedAgent.assigned_items || []) {
        for (const variant of item.variants) {
          if (variant.created_at) {
            createdAtMap.set(variant.id, variant.created_at);
          }
        }
      }
      setVariantCreatedAt(createdAtMap);

      setSelectedVariantIds(confirmedIds);
      setSavedVariantIds(confirmedIds);
    } catch (error) {
      console.error(`Error ${actionDialogMode}ing items:`, error);
      throw error;
    }
  };

  const handleDeleteAllItems = async () => {
    setDeletingAllItems(true);
    try {
      const numericId = parseInt(id as string, 10);
      await agentApi.deleteAllItems(numericId);

      const updatedAgent = await agentApi.getOne(numericId);
      setAgent(updatedAgent);

      setSelectedVariantIds([]);
      setSavedVariantIds([]);
      setVariantCreatedAt(new Map());

      toastSuccess("All assigned items deleted successfully");
      setDeleteAllDialogOpen(false);
    } catch (error) {
      console.error("Error deleting all items:", error);
      toastError("Failed to delete all items", error);
    } finally {
      setDeletingAllItems(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl space-y-3 px-2 pb-32 pt-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-2 pb-32 pt-4">
        <EmptyState
          title="Agent not found"
          description="This agent may have been deleted or is no longer available."
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
    <div className="mx-auto min-h-screen w-full max-w-2xl px-2 pb-32 pt-2">
      <DeleteWithTransferDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        entityType="agent"
        entityId={parseInt(id as string, 10)}
        entityName={agent.user.display_name || agent.user.username}
        onFetchDeleteInfo={agentApi.getDeleteInfo}
        onDelete={handleDeleteConfirm}
      />

      <TransferCopyItemsDialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        mode={actionDialogMode}
        sourceAgentId={parseInt(id as string, 10)}
        sourceAgentName={agent.user.display_name || agent.user.username}
        onAction={handleItemAction}
      />

      {deleteAllDialogOpen && (
        <Modal
          icon={<Trash2 className="size-5 text-brand-red" aria-hidden="true" />}
          iconBg="bg-brand-red/10"
          title="Delete all items?"
          description="This will unassign all items currently assigned to this agent. This action cannot be undone."
          onClose={() => {
            if (!deletingAllItems) setDeleteAllDialogOpen(false);
          }}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setDeleteAllDialogOpen(false)}
                disabled={deletingAllItems}
                className="h-12 flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAllItems}
                loading={deletingAllItems}
                loadingText="Deleting..."
                className="h-12 flex-1"
              >
                Delete All
              </Button>
            </>
          }
        />
      )}

      <div className="mb-4 flex items-start gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/users/")}
          aria-label="Back to users"
          className="-ml-2"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Button>
        <PageHeader
          title="Agent profile"
          subtitle="Manage field agent details and stock assignments."
          className="flex-1"
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <StockflowAvatar
          user={agent.user}
          tone="purple"
          size="lg"
          className="size-20 text-2xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-app-ink">
            {agent.user.display_name || agent.user.username}
          </h2>
          <p className="app-secondary mt-1">Field agent</p>
        </div>
      </div>

      {canManageAgents && (
      <div className="mb-5 flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => setIsEditing((value) => !value)}
          aria-pressed={isEditing}
          className="flex-1"
        >
          {isEditing ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <Pencil className="size-4" aria-hidden="true" />
          )}
          {isEditing ? "View details" : "Edit details"}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              aria-label="More agent actions"
              className="data-[state=open]:bg-app-soft"
            >
              <MoreVertical className="size-5" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-52 rounded-card border border-app-line bg-app-card p-1.5 shadow-float"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setActionDialogMode("copy");
                  setActionDialogOpen(true);
                }}
                className="app-focus flex min-h-11 w-full items-center gap-2.5 rounded-control px-3 text-left text-sm font-semibold text-app-ink transition-colors hover:bg-app-soft"
              >
                <Copy
                  className="size-4 text-app-muted"
                  aria-hidden="true"
                />
                Copy Items
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionDialogMode("transfer");
                  setActionDialogOpen(true);
                }}
                className="app-focus flex min-h-11 w-full items-center gap-2.5 rounded-control px-3 text-left text-sm font-semibold text-app-ink transition-colors hover:bg-app-soft"
              >
                <ArrowRightLeft
                  className="size-4 text-app-muted"
                  aria-hidden="true"
                />
                Transfer Items
              </button>
              <div className="mx-2 my-1 h-px bg-app-line" />
              <button
                type="button"
                onClick={() => setDeleteAllDialogOpen(true)}
                disabled={deletingAllItems}
                className="app-focus flex min-h-11 w-full items-center gap-2.5 rounded-control px-3 text-left text-sm font-semibold text-brand-red transition-colors hover:bg-brand-red/10 disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete All Items
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="app-focus flex min-h-11 w-full items-center gap-2.5 rounded-control px-3 text-left text-sm font-semibold text-brand-red transition-colors hover:bg-brand-red/10 disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete Agent
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      )}

      {isEditing && canManageAgents ? (
        <Card className="mb-4">
          <div className="space-y-5">
            <FormField
              label="Display name"
              htmlFor="agent-edit-display-name"
              hint={
                formData.display_name.trim() ? (
                  <>
                    Username:{" "}
                    <span className="font-mono font-semibold text-app-ink">
                      {deriveUsername(formData.display_name)}
                    </span>
                  </>
                ) : undefined
              }
            >
              <Input
                id="agent-edit-display-name"
                value={formData.display_name}
                onChange={(event) =>
                  handleChange("display_name", event.target.value)
                }
              />
            </FormField>

            <FormField
              label="System username"
              htmlFor="agent-edit-username"
              hint="Automatically derived from the display name."
            >
              <Input
                id="agent-edit-username"
                value={deriveUsername(
                  formData.display_name || formData.username,
                )}
                disabled
                className="font-mono"
              />
            </FormField>

            <FormField
              label="Email address"
              htmlFor="agent-edit-email"
            >
              <Input
                id="agent-edit-email"
                type="email"
                inputMode="email"
                value={formData.email}
                onChange={(event) =>
                  handleChange("email", event.target.value)
                }
              />
            </FormField>

            <FormField
              label="Contact number"
              htmlFor="agent-edit-contact"
            >
              <Input
                id="agent-edit-contact"
                inputMode="tel"
                value={formData.contact}
                onChange={(event) =>
                  handleChange("contact", event.target.value)
                }
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
        <Card title="Account details" className="mb-4">
          <DetailList>
            <DetailRow label="Display name">
              {agent.user.display_name || "—"}
            </DetailRow>
            <DetailRow label="Username">
              <span className="font-mono text-[13px]">
                {agent.user.username}
              </span>
            </DetailRow>
            <DetailRow label="Email">{agent.user.email || "—"}</DetailRow>
            <DetailRow label="Contact">
              {agent.contact ? (
                <a
                  href={`tel:${agent.contact}`}
                  className="app-focus rounded-sm text-brand-navy underline-offset-2 hover:underline"
                >
                  {agent.contact}
                </a>
              ) : (
                "—"
              )}
            </DetailRow>
          </DetailList>
        </Card>
      )}

      {canViewAgentItems && (
        <ItemAssignment
          agentId={parseInt(id as string, 10)}
          agentName={agent.user.display_name || agent.user.username}
          items={items}
          selectedVariantIds={selectedVariantIds}
          savedVariantIds={savedVariantIds}
          variantCreatedAt={variantCreatedAt}
          onToggleVariant={toggleVariant}
          onSaveItems={handleSaveItems}
          savingItems={savingItems}
          hasChanges={hasChanges}
          readOnly={!canManageAgents}
        />
      )}
    </div>
  );
}
