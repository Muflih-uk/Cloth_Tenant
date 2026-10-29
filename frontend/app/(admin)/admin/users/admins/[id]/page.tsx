"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Trash2,
} from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import { DetailList, DetailRow } from "@/components/ui/app/DetailList";
import PageHeader from "@/components/ui/app/PageHeader";
import { SkeletonCard } from "@/components/ui/app/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/custom/FormField";
import { Modal } from "@/components/ui/custom/Modals";
import StockFlowSelect from "@/components/ui/custom/stockFlowSelect";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/lib/api/admin";
import { brandApi } from "@/lib/api/brand";
import { toastError, toastSuccess } from "@/lib/toast";
import { deriveUsername } from "@/lib/utils/deriveUsername";
import { AdminResponse } from "@/types/admin";
import type { Brand } from "@/types/brand";

export default function AdminDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const [admin, setAdmin] = useState<AdminResponse | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
    email: "",
    brand_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const [showPinSection, setShowPinSection] = useState(false);
  const [pinData, setPinData] = useState({ pin: "", confirmPin: "" });
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [pinErrors, setPinErrors] = useState<Record<string, string>>({});
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const numericId = parseInt(id as string, 10);
        const data = await adminApi.getOne(numericId);
        setAdmin(data);
        setFormData({
          username: data.username,
          display_name: data.display_name || "",
          email: data.email,
          brand_id: data.brand_id ? String(data.brand_id) : "",
        });
      } catch (error) {
        console.error("Error fetching admin:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (role !== "ADMIN") return;
    brandApi
      .getAll()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, [role]);

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
      await adminApi.update(numericId, {
        username,
        display_name: formData.display_name,
        email: formData.email,
        brand_id: formData.brand_id
          ? parseInt(formData.brand_id)
          : undefined,
      });
      toastSuccess("Admin updated successfully");
      setIsEditing(false);
      router.push("/admin/users/");
    } catch (error: unknown) {
      console.error("Error updating admin:", error);
      toastError("Failed to update admin", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const numericId = parseInt(id as string, 10);
      await adminApi.delete(numericId);
      toastSuccess("Admin deleted successfully");
      router.push("/admin/users/");
    } catch (error: unknown) {
      console.error("Error deleting admin:", error);
      toastError("Failed to delete admin", error);
      setDeleting(false);
    }
  };

  const handlePinChange = (key: string, value: string) => {
    const digit = value.replace(/\D/g, "").slice(0, 6);
    setPinData((prev) => ({ ...prev, [key]: digit }));
    if (pinErrors[key]) setPinErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validatePin = () => {
    const newErrors: Record<string, string> = {};
    if (!pinData.pin) {
      newErrors.pin = "PIN is required";
    } else if (pinData.pin.length !== 6) {
      newErrors.pin = "PIN must be exactly 6 digits";
    }
    if (!pinData.confirmPin) {
      newErrors.confirmPin = "Please confirm the PIN";
    } else if (pinData.pin !== pinData.confirmPin) {
      newErrors.confirmPin = "PINs do not match";
    }
    setPinErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePin = async () => {
    if (!validatePin()) return;
    setSavingPin(true);
    try {
      const numericId = parseInt(id as string, 10);
      await adminApi.update(numericId, {
        pin: pinData.pin,
        brand_id: formData.brand_id
          ? parseInt(formData.brand_id)
          : undefined,
      });
      toastSuccess("PIN updated successfully");
      setPinData({ pin: "", confirmPin: "" });
      setShowPinSection(false);
    } catch (error: unknown) {
      console.error("Error updating PIN:", error);
      toastError("Failed to update PIN", error);
    } finally {
      setSavingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl lg:max-w-7xl lg:px-6 space-y-3 px-2 pb-32 pt-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl lg:max-w-7xl lg:px-6 px-2 pb-32 pt-4">
        <EmptyState
          title="Admin not found"
          description="This administrator may have been deleted or is no longer available."
          action={
            <Button onClick={() => router.push("/admin/users/")}>
              Back to users
            </Button>
          }
        />
      </div>
    );
  }

  const getBrandName = () => {
    if (!admin.brand_id) return null;
    const brand = brands.find((item) => item.id === admin.brand_id);
    return brand?.name || `Brand #${admin.brand_id}`;
  };

  const pinMatches =
    pinData.confirmPin.length > 0 && pinData.pin === pinData.confirmPin;

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl lg:max-w-7xl lg:px-6 px-2 pb-32 pt-2">
      {deleteDialogOpen && (
        <Modal
          icon={<Trash2 className="size-5 text-brand-red" aria-hidden="true" />}
          iconBg="bg-brand-red/10"
          title="Delete administrator?"
          description={`This will permanently delete ${
            admin.display_name || admin.username
          }. This action cannot be undone.`}
          onClose={() => {
            if (!deleting) setDeleteDialogOpen(false);
          }}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="h-12 flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                loading={deleting}
                loadingText="Deleting..."
                className="h-12 flex-1"
              >
                Delete
              </Button>
            </>
          }
        />
      )}

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
          title="Admin profile"
          subtitle="Manage administrator access and security."
          className="flex-1"
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <StockflowAvatar
          user={admin}
          tone="navy"
          size="lg"
          className="size-20 text-2xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-app-ink">
            {admin.display_name || admin.username}
          </h2>
          <p className="app-secondary mt-1">Administrator</p>
        </div>
      </div>

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
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleting}
          aria-label="Delete administrator"
          className="text-brand-red hover:bg-brand-red/10"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {isEditing ? (
        <Card className="mb-4">
          <div className="space-y-5">
            <FormField
              label="Display name"
              htmlFor="admin-edit-display-name"
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
                id="admin-edit-display-name"
                value={formData.display_name}
                onChange={(event) =>
                  handleChange("display_name", event.target.value)
                }
              />
            </FormField>

            <FormField
              label="System username"
              htmlFor="admin-edit-username"
              hint="Automatically derived from the display name."
            >
              <Input
                id="admin-edit-username"
                value={deriveUsername(
                  formData.display_name || formData.username,
                )}
                disabled
                className="font-mono"
              />
            </FormField>

            <FormField
              label="Recovery email"
              htmlFor="admin-edit-email"
            >
              <Input
                id="admin-edit-email"
                type="email"
                inputMode="email"
                value={formData.email}
                onChange={(event) =>
                  handleChange("email", event.target.value)
                }
              />
            </FormField>

            <FormField
              label="Brand"
              htmlFor="admin-edit-brand"
              error={errors.brand_id}
            >
              <StockFlowSelect
                value={formData.brand_id}
                onChange={(value) => handleChange("brand_id", value)}
                options={brands.map((brand) => ({
                  value: String(brand.id),
                  label: brand.name,
                }))}
                disabled={saving}
                placeholder="Select brand"
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
              {admin.display_name || "—"}
            </DetailRow>
            <DetailRow label="Username">
              <span className="font-mono text-[13px]">{admin.username}</span>
            </DetailRow>
            <DetailRow label="Recovery email">
              {admin.email || "—"}
            </DetailRow>
            <DetailRow label="Account type">Administrator</DetailRow>
            {getBrandName() && (
              <DetailRow label="Brand">{getBrandName()}</DetailRow>
            )}
          </DetailList>
        </Card>
      )}

      <Card className="mb-4">
          <button
            type="button"
            onClick={() => {
              setShowPinSection((value) => !value);
              setPinData({ pin: "", confirmPin: "" });
              setPinErrors({});
            }}
            aria-expanded={showPinSection}
            className="app-focus flex min-h-11 w-full items-center justify-between gap-3 rounded-control text-left"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-navy/10">
                <KeyRound
                  className="size-5 text-brand-navy"
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-app-ink">
                  Change delete PIN
                </span>
                <span className="app-secondary mt-0.5 block">
                  Update the 6-digit PIN for this admin.
                </span>
              </span>
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-app-muted transition-transform ${
                showPinSection ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {showPinSection && (
            <div className="mt-5 space-y-5 border-t border-app-line pt-5">
              <FormField
                label="New PIN"
                htmlFor="admin-new-pin"
                error={pinErrors.pin}
                hint={
                  <span className="flex items-center justify-between gap-3">
                    <span>Enter exactly 6 digits.</span>
                    <span className="shrink-0 tabular-nums">
                      {pinData.pin.length}/6
                    </span>
                  </span>
                }
              >
                <div className="relative">
                  <Input
                    id="admin-new-pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    placeholder="6-digit PIN"
                    value={pinData.pin}
                    onChange={(event) =>
                      handlePinChange("pin", event.target.value)
                    }
                    aria-invalid={Boolean(pinErrors.pin)}
                    className="pr-12 font-mono tracking-[0.3em]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((value) => !value)}
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    aria-pressed={showPin}
                    className="app-focus absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
                  >
                    {showPin ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {pinData.pin.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className={`flex size-9 items-center justify-center rounded-control border text-sm font-bold transition-colors ${
                          index < pinData.pin.length
                            ? "border-brand-navy/25 bg-brand-navy/5 text-brand-navy"
                            : "border-app-line bg-app-soft text-app-subtle"
                        }`}
                      >
                        {index < pinData.pin.length
                          ? showPin
                            ? pinData.pin[index]
                            : "•"
                          : ""}
                      </div>
                    ))}
                  </div>
                )}
              </FormField>

              <FormField
                label="Confirm PIN"
                htmlFor="admin-confirm-pin"
                error={pinErrors.confirmPin}
                hint={
                  pinMatches ? (
                    <span className="font-semibold text-brand-green">
                      PINs match.
                    </span>
                  ) : undefined
                }
              >
                <div className="relative">
                  <Input
                    id="admin-confirm-pin"
                    type={showConfirmPin ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    placeholder="Re-enter PIN"
                    value={pinData.confirmPin}
                    onChange={(event) =>
                      handlePinChange("confirmPin", event.target.value)
                    }
                    aria-invalid={Boolean(pinErrors.confirmPin)}
                    className={`pr-12 font-mono tracking-[0.3em] ${
                      pinMatches ? "border-brand-green" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPin((value) => !value)
                    }
                    aria-label={
                      showConfirmPin ? "Hide PIN confirmation" : "Show PIN confirmation"
                    }
                    aria-pressed={showConfirmPin}
                    className="app-focus absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
                  >
                    {showConfirmPin ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>

              <Button
                size="lg"
                onClick={handleSavePin}
                loading={savingPin}
                loadingText="Saving PIN..."
                disabled={
                  savingPin ||
                  pinData.pin.length !== 6 ||
                  pinData.pin !== pinData.confirmPin
                }
                className="w-full"
              >
                Save PIN
              </Button>
            </div>
          )}
        </Card>
    </div>
  );
}
