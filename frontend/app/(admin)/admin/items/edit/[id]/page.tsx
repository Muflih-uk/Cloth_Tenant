"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, Trash2, AlertCircle, Plus } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePreview } from "@/components/pages/ImagePreview";
import Button from "@/components/ui/app/Button";
import { fabricApi } from "@/lib/api/item";
import { updateFabric } from "@/lib/updateItem";
import { nextColorNumber } from "@/lib/color-number";
import { toastError, toastSuccess } from "@/lib/toast";
import EditVariantRow from "./editVariantRow";
import CropModal from "../../new/cropModal";
import PhysicalRollsPanel from "@/components/items/physicalRollsPanel";
import type {
  EditableVariant,
  FabricDetails,
  VariantRollsResponse,
} from "@/types/item";
import { formatMeters, toMeters } from "@/types/item";
import { useAuth } from "@/context/AuthContext";
import PinDeleteDialog from "@/components/ui/pinDeleteDialog";
import { normalizeImageFile } from "@/lib/image-utils";
import { PageLoading } from "@/components/ui/Loading";

const uid = () => Math.random().toString(36).slice(2, 9);

const ALLOWED_IMAGE_EXT = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "bmp",
  "tiff",
  "tif",
  "heic",
  "heif",
];

export default function FabricEditPage() {
  const { role, permissions } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fabricId = Number(id);
  const nextTempId = useRef(-1);
  const canEdit = role === "ADMIN" || permissions.items_edit;
  const canDelete = role === "ADMIN" || permissions.items_delete;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    localId: string;
    label: string;
  } | null>(null);
  const [variantCrop, setVariantCrop] = useState<{
    src: string;
    localId: string;
  } | null>(null);
  const [receiveOpenFor, setReceiveOpenFor] = useState<string | null>(null);

  const [common, setCommon] = useState<FabricDetails>({
    name: "",
    design_number: "",
    category: "",
    description: "",
    price_per_meter: "",
  });
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canEdit) router.replace("/admin/items");
  }, [canEdit, router]);

  useEffect(() => {
    if (!fabricId) return;
    fabricApi
      .getOne(fabricId)
      .then((data) => {
        setCommon({
          name: data.name,
          design_number: data.design_number ?? "",
          category: data.category ?? "",
          description: data.description ?? "",
          price_per_meter: data.price_per_meter,
        });
        setVariants(
          data.variants.map((variant) => ({
            backendId: variant.id,
            localId: uid(),
            // The opening order-stock base is edited; physical stock is shown
            // separately and remains owned by rolls or packing.
            baseOpening: variant.base_opening ?? variant.stock_meters,
            initialBaseOpening: variant.base_opening ?? variant.stock_meters,
            stockMeters: variant.stock_meters,
            availableMeters: variant.available_meters,
            untrackedStockMeters: variant.untracked_stock_meters,
            displayOrder: variant.display_order ?? "",
            imageUrl: variant.image ?? null,
            newImage: null,
            imagePreview: null,
            // A colour whose metres live on physical rolls: the figure above is
            // read-only and its only way to change is through the roll panel.
            isRollTracked: variant.is_roll_tracked ?? false,
            rollCount: variant.roll_count ?? 0,
          })),
        );
      })
      .catch((e) => toastError("Failed to load fabric", e))
      .finally(() => setLoading(false));
  }, [fabricId]);

  // ── Variant helpers ───────────────────────────────────────────────────────

  const updateVariant = (localId: string, updated: EditableVariant) =>
    setVariants((prev) =>
      prev.map((v) => (v.localId === localId ? updated : v)),
    );

  const deleteVariant = (localId: string) =>
    setVariants((prev) => prev.filter((v) => v.localId !== localId));

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        backendId: nextTempId.current--,
        localId: uid(),
        baseOpening: "0",
        initialBaseOpening: "0",
        stockMeters: "0",
        displayOrder: nextColorNumber(prev),
        imageUrl: null,
        newImage: null,
        imagePreview: null,
        // A colour being created has no rolls yet, so its opening figure is set
        // here in the ordinary way.
        isRollTracked: false,
        rollCount: 0,
      },
    ]);
  };

  /**
   * A roll received, cut or adjusted moves the colour's on-hand total, so the
   * read-only figure beside the colour has to follow it without a page reload.
   *
   * The roll count comes back with it so the row updates alongside the panel.
   */
  const handleRollStockChanged = (
    localId: string,
    stockMeters: string,
    rollCount: number,
    untrackedStockMeters: string,
    isRollTracked: boolean,
  ) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.localId === localId
          ? {
              ...v,
              stockMeters,
              untrackedStockMeters,
              isRollTracked,
              rollCount,
            }
          : v,
      ),
    );

  const handleRollData = (localId: string, data: VariantRollsResponse) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.localId === localId
          ? { ...v, activeRollCount: data.active_roll_count }
          : v,
      ),
    );

  const handleVariantImageUpload = async (
    localId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_IMAGE_EXT.includes(ext)) {
      toastError("Invalid file type", `".${ext}" is not an allowed image format`);
      e.target.value = "";
      return;
    }

    const normalisedFile = await normalizeImageFile(f);
    setVariantCrop({ src: URL.createObjectURL(normalisedFile), localId });
    e.target.value = "";
  };

  const handleVariantCropConfirm = (localId: string, file: File) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.localId === localId
          ? { ...v, newImage: file, imagePreview: URL.createObjectURL(file) }
          : v,
      ),
    );
    setVariantCrop(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateFabric(fabricId, common, variants);
      toastSuccess("Fabric updated");
      router.push("/admin/items");
    } catch (e) {
      toastError("Failed to update fabric", e);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async (pin: string) => {
    setDeleting(true);
    try {
      await fabricApi.remove(fabricId, pin);
      toastSuccess("Fabric deleted");
      router.push("/admin/items");
    } catch (e) {
      setDeleting(false);
      // Re-throw so PinDeleteDialog can show the error inside the dialog.
      throw e;
    }
  };

  const handleDelete = () => {
    setPinDialogOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const rate = Number(common.price_per_meter);
  const isValid =
    common.name.trim() !== "" &&
    common.price_per_meter.trim() !== "" &&
    rate >= 0 &&
    variants.length > 0 &&
    variants.some((v) => v.displayOrder.trim() !== "" || v.newImage);

  if (loading) return <PageLoading />;
  if (!canEdit) return null;

  const totalMetres = variants.reduce(
    (sum, v) =>
      sum +
      toMeters(v.stockMeters) +
      toMeters(v.untrackedStockMeters ?? "0"),
    0,
  );
  const heroImage = variants[0]?.imagePreview ?? variants[0]?.imageUrl;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col bg-app-bg px-4 py-4 sm:px-6 sm:py-8">
      <PinDeleteDialog
        open={pinDialogOpen}
        onClose={() => setPinDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Fabric"
        description="This fabric and all its colours will be removed."
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/35 px-3 pb-6 backdrop-blur-sm sm:items-center sm:px-4 sm:pb-8">
          <div className="w-full max-w-sm space-y-4 rounded-card border border-app-line bg-app-card p-4 shadow-float sm:p-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-app-ink">
                Remove {deleteConfirm.label}?
              </h3>
              <p className="text-sm leading-relaxed text-app-muted">
                The colour and its {formatMeters(
                  variants.find((v) => v.localId === deleteConfirm.localId)
                    ?.stockMeters,
                )}{" "}
                m of physical stock will be removed. Existing order history is kept.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteVariant(deleteConfirm.localId);
                  setDeleteConfirm(null);
                }}
                className="flex-1"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-2 sm:mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="app-focus -ml-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-app-soft text-app-muted transition-colors hover:bg-brand-navy hover:text-white"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-lg font-bold text-app-ink sm:text-xl">Edit Fabric</h1>
          <p className="truncate text-[10px] uppercase tracking-widest text-app-subtle">
            ID #{id}
          </p>
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="app-focus flex size-11 shrink-0 items-center justify-center rounded-full bg-app-soft text-brand-red transition-colors hover:bg-brand-red/10 disabled:opacity-50"
            aria-label="Delete fabric"
          >
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <div className="size-11 shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* Hero */}
      <div className="mb-6 flex flex-col items-center sm:mb-8">
        <div className="relative mb-3 flex size-16 items-center justify-center overflow-hidden rounded-card border border-app-line bg-brand-navy/10 sm:size-20">
          {heroImage ? (
            <ImagePreview src={heroImage} alt={common.name} />
          ) : (
            <Package className="size-8 text-brand-navy sm:size-9" aria-hidden="true" />
          )}
        </div>
        <h2 className="max-w-full truncate px-2 text-center text-lg font-bold text-app-ink sm:text-xl">
          {common.name || "—"}
        </h2>
        <p className="px-2 text-center text-xs font-medium text-app-muted sm:text-sm">
          {formatMeters(totalMetres)} m on hand across {variants.length} colour
          {variants.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* ── Fabric details ── */}
        <div className="space-y-4 rounded-card border border-app-line bg-app-card px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-app-subtle">
            Fabric Details
          </p>

          <Field>
            <FieldLabel>Name *</FieldLabel>
            <Input
              value={common.name}
              onChange={(e) =>
                setCommon((p) => ({ ...p, name: e.target.value }))
              }
            />
          </Field>

          <Field>
            <FieldLabel>Design number</FieldLabel>
            <Input
              value={common.design_number}
              onChange={(e) =>
                setCommon((p) => ({ ...p, design_number: e.target.value }))
              }
            />
          </Field>

          <Field>
            <FieldLabel>Category</FieldLabel>
            <Input
              value={common.category}
              onChange={(e) =>
                setCommon((p) => ({ ...p, category: e.target.value }))
              }
            />
          </Field>

          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={common.description}
              onChange={(e) =>
                setCommon((p) => ({ ...p, description: e.target.value }))
              }
            />
          </Field>

          <Field>
            <FieldLabel>Price per metre (₹) *</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={common.price_per_meter}
              onChange={(e) =>
                setCommon((p) => ({ ...p, price_per_meter: e.target.value }))
              }
            />
            {common.price_per_meter.trim() !== "" && rate < 0 && (
              <p className="mt-1.5 text-xs font-medium text-brand-red">
                Enter a price of zero or more.
              </p>
            )}
          </Field>
        </div>

        {/* ── Colours ── */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h2 className="min-w-0 text-sm font-bold text-app-ink">
              Colours &amp; Fabric Inventory
            </h2>
            <span className="shrink-0 text-[10px] uppercase tracking-widest text-app-subtle">
              {variants.length} colour{variants.length !== 1 ? "s" : ""}
            </span>
          </div>

          {variants.length === 0 && (
            <div className="flex items-center gap-2 rounded-control border border-status-pending/20 bg-status-pending/10 px-4 py-3 text-xs font-medium text-[color:var(--status-pending-text)]">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              At least one colour is required.
            </div>
          )}

          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div key={variant.localId}>
                <input
                  ref={(el) => {
                    fileRefs.current[variant.localId] = el;
                  }}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.tiff,.tif,.svg"
                  className="hidden"
                  onChange={(e) =>
                    handleVariantImageUpload(variant.localId, e)
                  }
                />
                <EditVariantRow
                  variant={variant}
                  index={index}
                  isOnly={variants.length === 1}
                  isNew={variant.backendId < 0}
                  onChange={(updated) => updateVariant(variant.localId, updated)}
                  onDelete={() =>
                    setDeleteConfirm({
                      localId: variant.localId,
                      label: variant.displayOrder.trim() || `Colour #${index + 1}`,
                    })
                  }
                  onPickImage={() =>
                    fileRefs.current[variant.localId]?.click()
                  }
                  onRequestReceive={
                    variant.backendId > 0
                      ? () => setReceiveOpenFor(variant.localId)
                      : undefined
                  }
                >
                  {variant.backendId > 0 && (
                    <PhysicalRollsPanel
                      variantId={variant.backendId}
                      label={`${common.name || "Fabric"} — ${variant.displayOrder || "Colour"}`}
                      embedded
                      receiveOpen={receiveOpenFor === variant.localId}
                      onReceiveOpenChange={(open) =>
                        setReceiveOpenFor(open ? variant.localId : null)
                      }
                      onStockChanged={(stock, rollCount, untracked, tracked) =>
                        handleRollStockChanged(
                          variant.localId,
                          stock,
                          rollCount,
                          untracked,
                          tracked,
                        )
                      }
                      onData={(data) => handleRollData(variant.localId, data)}
                    />
                  )}
                </EditVariantRow>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="app-focus mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-dashed border-app-line text-sm font-semibold text-app-muted transition-colors hover:border-brand-navy hover:bg-brand-navy/5 hover:text-brand-navy"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Colour
          </button>

          <p className="mt-3 text-[11px] leading-relaxed text-app-muted">
            Use Adjust stock to change order availability. Receive Rolls adds
            physical cloth without changing the order-stock base; packing cuts
            from the oldest roll first.
          </p>

          {variantCrop && (
            <CropModal
              src={variantCrop.src}
              onConfirm={(file) =>
                handleVariantCropConfirm(variantCrop.localId, file)
              }
              onCancel={() => setVariantCrop(null)}
            />
          )}
        </div>
      </div>

      <div className="mb-10 mt-6 sm:mb-24 sm:mt-8">
        <Button
          size="lg"
          fullWidth
          loading={saving}
          loadingText="Saving…"
          disabled={!isValid}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
