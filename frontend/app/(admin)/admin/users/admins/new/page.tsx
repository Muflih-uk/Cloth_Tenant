"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import PageHeader from "@/components/ui/app/PageHeader";
import FormField from "@/components/ui/custom/FormField";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api/admin";
import { toastError, toastSuccess } from "@/lib/toast";
import { deriveUsername } from "@/lib/utils/deriveUsername";

export default function NewAdminPage() {
  const router = useRouter();
  const [existingUsernames, setExistingUsernames] = useState<Set<string>>(
    new Set(),
  );
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    pin: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    adminApi
      .getAll()
      .then((admins) => {
        setExistingUsernames(new Set(admins.map((admin) => admin.username)));
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
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim())
      newErrors.displayName = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Minimum 6 characters required";
    }
    if (!formData.pin) {
      newErrors.pin = "PIN is required";
    } else if (formData.pin.length !== 6) {
      newErrors.pin = "PIN must be exactly 6 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const username = deriveUsername(formData.displayName, existingUsernames);
      await adminApi.create({
        username,
        display_name: formData.displayName,
        email: formData.email,
        password: formData.password,
        pin: formData.pin,
      });
      toastSuccess("Admin created successfully");
      router.push("/admin/users/");
    } catch (error: unknown) {
      toastError("Failed to create admin", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        title="New admin"
        subtitle="Create a new system administrator."
        className="mb-4"
      />

      <Card className="mb-5">
        <div className="space-y-5">
          <FormField
            label="Display name"
            htmlFor="admin-display-name"
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
              id="admin-display-name"
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
            htmlFor="admin-email"
            error={errors.email}
            required
          >
            <Input
              id="admin-email"
              type="email"
              inputMode="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={(event) => handleChange("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </FormField>

          <FormField
            label="Secure password"
            htmlFor="admin-password"
            error={errors.password}
            required
            hint="Use at least 6 characters."
          >
            <Input
              id="admin-password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(event) =>
                handleChange("password", event.target.value)
              }
              aria-invalid={Boolean(errors.password)}
            />
          </FormField>

          <FormField
            label="PIN"
            htmlFor="admin-pin"
            error={errors.pin}
            required
            hint={
              <span className="flex items-center justify-between gap-3">
                <span>
                  Required when deleting orders, customers, agents, or items.
                </span>
                <span className="shrink-0 tabular-nums">
                  {formData.pin.length}/6
                </span>
              </span>
            }
          >
            <div className="relative">
              <Input
                id="admin-pin"
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

            {formData.pin.length > 0 && (
              <div className="flex gap-2 pt-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className={`flex size-9 items-center justify-center rounded-control border text-sm font-bold transition-colors ${
                      index < formData.pin.length
                        ? "border-brand-navy/25 bg-brand-navy/5 text-brand-navy"
                        : "border-app-line bg-app-soft text-app-subtle"
                    }`}
                  >
                    {index < formData.pin.length
                      ? showPin
                        ? formData.pin[index]
                        : "•"
                      : ""}
                  </div>
                ))}
              </div>
            )}
          </FormField>
        </div>
      </Card>

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
          Create Admin
        </Button>
      </div>
    </div>
  );
}
