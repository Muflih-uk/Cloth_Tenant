"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Pencil,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import { DetailList, DetailRow } from "@/components/ui/app/DetailList";
import PageHeader from "@/components/ui/app/PageHeader";
import { SkeletonCard } from "@/components/ui/app/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/custom/FormField";
import { Modal } from "@/components/ui/custom/Modals";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import { Input } from "@/components/ui/input";
import SubAdminPermissions, {
  EMPTY_FLAGS,
} from "@/components/pages/admin/subadmins/SubAdminPermissions";
import { useAuth } from "@/context/AuthContext";
import { subAdminApi } from "@/lib/api/admin";
import { toastError, toastSuccess } from "@/lib/toast";
import type { PermissionFlags } from "@/types/auth";
import type { SubAdminResponse } from "@/types/admin";

export default function SubAdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuth();

  const [account, setAccount] = useState<SubAdminResponse | null>(null);
  const [permissions, setPermissions] =
    useState<PermissionFlags>(EMPTY_FLAGS);
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    password: "",
    pin: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    subAdminApi
      .getOne(Number(id))
      .then((data) => {
        setAccount(data);
        setPermissions({
          orders_view: data.orders_view,
          orders_edit: data.orders_edit,
          orders_delete: data.orders_delete,
          items_view: data.items_view,
          items_edit: data.items_edit,
          items_delete: data.items_delete,
          agents_view: data.agents_view,
        });
        setFormData({
          display_name: data.display_name ?? "",
          email: data.email,
          password: "",
          pin: "",
        });
      })
      .catch((error) => toastError("Failed to load sub admin", error))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (key: string, value: string) => {
    if (key === "pin") {
      value = value.replace(/\D/g, "").slice(0, 6);
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.display_name.trim()) {
      nextErrors.display_name = "Name is required";
    }
    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = "Invalid email format";
    }
    if (formData.password && formData.password.length < 8) {
      nextErrors.password = "Minimum 8 characters required";
    }
    if (formData.pin && formData.pin.length !== 6) {
      nextErrors.pin = "PIN must be exactly 6 digits";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const updated = await subAdminApi.update(Number(id), {
        display_name: formData.display_name,
        email: formData.email,
        ...(formData.password ? { password: formData.password } : {}),
        ...(formData.pin ? { pin: formData.pin } : {}),
        ...permissions,
      });
      setAccount(updated);
      setFormData((prev) => ({ ...prev, password: "", pin: "" }));
      setIsEditing(false);
      toastSuccess("Sub admin updated");
    } catch (error: unknown) {
      toastError("Failed to update sub admin", error);
    } finally {
      setSaving(false);
    }
  };

  const handleActiveChange = async (isActive: boolean) => {
    setSaving(true);
    try {
      const updated = await subAdminApi.update(Number(id), {
        is_active: isActive,
      });
      setAccount(updated);
      setDeactivateOpen(false);
      toastSuccess(isActive ? "Sub admin reactivated" : "Sub admin deactivated");
    } catch (error: unknown) {
      toastError("Failed to update sub admin", error);
    } finally {
      setSaving(false);
    }
  };

  if (role !== "ADMIN") return null;

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl space-y-3 px-2 pb-32 pt-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-2 pb-32 pt-4">
        <EmptyState
          title="Sub admin not found"
          description="This account may have been removed or deactivated."
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
      {deactivateOpen && (
        <Modal
          icon={<UserX className="size-5 text-brand-red" aria-hidden="true" />}
          iconBg="bg-brand-red/10"
          title="Deactivate sub admin?"
          description={`${account.display_name || account.username} will be signed out on their next request. Their access can be restored later.`}
          onClose={() => {
            if (!saving) setDeactivateOpen(false);
          }}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setDeactivateOpen(false)}
                disabled={saving}
                className="h-12 flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleActiveChange(false)}
                loading={saving}
                loadingText="Deactivating..."
                className="h-12 flex-1"
              >
                Deactivate
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
          title="Sub admin profile"
          subtitle="Manage access, security, and account status."
          className="flex-1"
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <StockflowAvatar
          user={account}
          tone="navy"
          size="lg"
          className="size-20 text-2xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-app-ink">
            {account.display_name || account.username}
          </h2>
          <p className="app-secondary mt-1">
            {account.is_active ? "Sub admin" : "Sub admin · Inactive"}
          </p>
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
          onClick={() =>
            account.is_active
              ? setDeactivateOpen(true)
              : handleActiveChange(true)
          }
          disabled={saving}
          className="flex-1"
        >
          {account.is_active ? (
            <UserX className="size-4" aria-hidden="true" />
          ) : (
            <UserCheck className="size-4" aria-hidden="true" />
          )}
          {account.is_active ? "Deactivate" : "Reactivate"}
        </Button>
      </div>

      {isEditing ? (
        <>
          <Card className="mb-4">
            <div className="space-y-5">
              <FormField
                label="Display name"
                htmlFor="subadmin-edit-name"
                error={errors.display_name}
                required
              >
                <Input
                  id="subadmin-edit-name"
                  value={formData.display_name}
                  onChange={(event) =>
                    handleChange("display_name", event.target.value)
                  }
                  aria-invalid={Boolean(errors.display_name)}
                />
              </FormField>

              <FormField
                label="System username"
                htmlFor="subadmin-edit-username"
              >
                <Input
                  id="subadmin-edit-username"
                  value={account.username}
                  disabled
                  className="font-mono"
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="subadmin-edit-email"
                error={errors.email}
                required
              >
                <Input
                  id="subadmin-edit-email"
                  type="email"
                  inputMode="email"
                  value={formData.email}
                  onChange={(event) =>
                    handleChange("email", event.target.value)
                  }
                  aria-invalid={Boolean(errors.email)}
                />
              </FormField>

              <FormField
                label="New password"
                htmlFor="subadmin-edit-password"
                error={errors.password}
                hint="Leave blank to keep the current password."
              >
                <Input
                  id="subadmin-edit-password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(event) =>
                    handleChange("password", event.target.value)
                  }
                  aria-invalid={Boolean(errors.password)}
                />
              </FormField>

              <FormField
                label="New delete PIN"
                htmlFor="subadmin-edit-pin"
                error={errors.pin}
                hint="Leave blank to keep the current PIN."
              >
                <div className="relative">
                  <Input
                    id="subadmin-edit-pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    placeholder={account.has_pin ? "PIN is set" : "No PIN set"}
                    value={formData.pin}
                    onChange={(event) =>
                      handleChange("pin", event.target.value)
                    }
                    aria-invalid={Boolean(errors.pin)}
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
              </FormField>
            </div>
          </Card>

          <h2 className="app-section-title mb-2">Access</h2>
          <div className="mb-4">
            <SubAdminPermissions
              value={permissions}
              onChange={setPermissions}
              disabled={saving}
            />
          </div>

          <Button
            size="lg"
            onClick={handleSave}
            loading={saving}
            loadingText="Saving..."
            className="w-full"
          >
            Save Changes
          </Button>
        </>
      ) : (
        <Card title="Account details" className="mb-4">
          <DetailList>
            <DetailRow label="Display name">
              {account.display_name || "—"}
            </DetailRow>
            <DetailRow label="Username">
              <span className="font-mono text-[13px]">{account.username}</span>
            </DetailRow>
            <DetailRow label="Email">{account.email || "—"}</DetailRow>
            <DetailRow label="Status">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                {account.is_active ? "Active" : "Inactive"}
              </span>
            </DetailRow>
            <DetailRow label="Delete PIN">
              {account.has_pin ? "Set" : "Not set"}
            </DetailRow>
            <DetailRow label="Orders access">
              {[
                account.orders_view && "View",
                account.orders_edit && "Edit",
                account.orders_delete && "Delete",
              ]
                .filter(Boolean)
                .join(", ") || "None"}
            </DetailRow>
            <DetailRow label="Stock access">
              {[
                account.items_view && "View",
                account.items_edit && "Edit",
                account.items_delete && "Delete",
              ]
                .filter(Boolean)
                .join(", ") || "None"}
            </DetailRow>
            <DetailRow label="Agents access">
              {account.agents_view ? "View" : "None"}
            </DetailRow>
          </DetailList>
        </Card>
      )}
    </div>
  );
}
