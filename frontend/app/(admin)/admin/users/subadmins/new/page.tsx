"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import PageHeader from "@/components/ui/app/PageHeader";
import FormField from "@/components/ui/custom/FormField";
import { Input } from "@/components/ui/input";
import SubAdminPermissions, {
  EMPTY_FLAGS,
} from "@/components/pages/admin/subadmins/SubAdminPermissions";
import { useAuth } from "@/context/AuthContext";
import { adminApi, subAdminApi } from "@/lib/api/admin";
import { toastError, toastSuccess } from "@/lib/toast";
import { deriveUsername } from "@/lib/utils/deriveUsername";
import type { PermissionFlags } from "@/types/auth";

export default function NewSubAdminPage() {
  const router = useRouter();
  const { role } = useAuth();
  const [existingUsernames, setExistingUsernames] = useState<Set<string>>(
    new Set(),
  );
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    pin: "",
  });
  const [permissions, setPermissions] =
    useState<PermissionFlags>(EMPTY_FLAGS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.getAll(), subAdminApi.getAll()])
      .then(([admins, subAdmins]) => {
        setExistingUsernames(
          new Set(
            [...admins, ...subAdmins].map((account) => account.username),
          ),
        );
      })
      .catch(() => {});
  }, []);

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
    if (!formData.displayName.trim()) {
      nextErrors.displayName = "Name is required";
    }
    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = "Invalid email format";
    }
    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      nextErrors.password = "Minimum 8 characters required";
    }
    if (
      (permissions.orders_delete || permissions.items_delete) &&
      formData.pin.length !== 6
    ) {
      nextErrors.pin = "A 6-digit PIN is required for delete access";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const username = deriveUsername(
        formData.displayName,
        existingUsernames,
      );
      await subAdminApi.create({
        username,
        display_name: formData.displayName,
        email: formData.email,
        password: formData.password,
        pin: formData.pin || undefined,
        ...permissions,
      });
      toastSuccess("Sub admin created successfully");
      router.push("/admin/users/");
    } catch (error: unknown) {
      toastError("Failed to create sub admin", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (role !== "ADMIN") return null;

  const derivedUsername = formData.displayName.trim()
    ? deriveUsername(formData.displayName, existingUsernames)
    : "";

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-2 pb-32 pt-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        aria-label="Go back"
        className="-ml-2 mb-2"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Button>

      <PageHeader
        title="New sub admin"
        subtitle="Create a limited account and choose its access."
        className="mb-4"
      />

      <Card className="mb-5">
        <div className="space-y-5">
          <FormField
            label="Display name"
            htmlFor="subadmin-display-name"
            error={errors.displayName}
            required
            hint={
              derivedUsername ? (
                <>
                  Username:{" "}
                  <span className="font-mono font-semibold text-app-ink">
                    {derivedUsername}
                  </span>
                </>
              ) : undefined
            }
          >
            <Input
              id="subadmin-display-name"
              placeholder="e.g. Jane Smith"
              value={formData.displayName}
              onChange={(event) =>
                handleChange("displayName", event.target.value)
              }
              aria-invalid={Boolean(errors.displayName)}
            />
          </FormField>

          <FormField
            label="Email address"
            htmlFor="subadmin-email"
            error={errors.email}
            required
          >
            <Input
              id="subadmin-email"
              type="email"
              inputMode="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(event) => handleChange("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="subadmin-password"
            error={errors.password}
            required
            hint="Use at least 8 characters."
          >
            <Input
              id="subadmin-password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(event) =>
                handleChange("password", event.target.value)
              }
              aria-invalid={Boolean(errors.password)}
            />
          </FormField>

          <FormField
            label="Delete PIN"
            htmlFor="subadmin-pin"
            error={errors.pin}
            hint="Required only when this account may delete orders or stock."
          >
            <div className="relative">
              <Input
                id="subadmin-pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="6-digit PIN"
                value={formData.pin}
                onChange={(event) => handleChange("pin", event.target.value)}
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
      <div className="mb-5">
        <SubAdminPermissions
          value={permissions}
          onChange={setPermissions}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          size="lg"
          onClick={handleSubmit}
          loading={isSubmitting}
          loadingText="Creating..."
          className="flex-[2]"
        >
          Create Sub Admin
        </Button>
      </div>
    </div>
  );
}
