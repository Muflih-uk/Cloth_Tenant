"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import PageHeader from "@/components/ui/app/PageHeader";
import FormField from "@/components/ui/custom/FormField";
import { Input } from "@/components/ui/input";
import { agentApi } from "@/lib/api/agents";
import { toastError, toastSuccess } from "@/lib/toast";
import { deriveUsername } from "@/lib/utils/deriveUsername";

export default function NewAgentPage() {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    contactNumber: "",
    password: "",
  });
  const [existingUsernames, setExistingUsernames] = useState<Set<string>>(
    new Set(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    agentApi
      .getAll()
      .then((agents) => {
        setExistingUsernames(new Set(agents.map((agent) => agent.user.username)));
      })
      .catch(() => {});
  }, []);

  const router = useRouter();

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
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
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const username = deriveUsername(formData.displayName, existingUsernames);
      const payload = {
        username,
        display_name: formData.displayName,
        email: formData.email,
        contact: formData.contactNumber,
        password: formData.password,
      };
      const newAgent = await agentApi.create(payload);
      toastSuccess("Agent created successfully");
      router.push(`/admin/users/agents/${newAgent.id}`);
    } catch (error: unknown) {
      toastError(error);
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
        title="New agent"
        subtitle="Create a new field agent account."
        className="mb-4"
      />

      <Card className="mb-5">
        <div className="space-y-5">
          <FormField
            label="Display name"
            htmlFor="agent-display-name"
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
              id="agent-display-name"
              placeholder="e.g. John Doe"
              value={formData.displayName}
              onChange={(event) =>
                handleChange("displayName", event.target.value)
              }
              aria-invalid={Boolean(errors.displayName)}
            />
          </FormField>

          <FormField
            label="Email address"
            htmlFor="agent-email"
            error={errors.email}
            required
          >
            <Input
              id="agent-email"
              type="email"
              inputMode="email"
              placeholder="agent@example.com"
              value={formData.email}
              onChange={(event) => handleChange("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </FormField>

          <FormField
            label="Secure password"
            htmlFor="agent-password"
            error={errors.password}
            required
            hint="Use at least 6 characters."
          >
            <Input
              id="agent-password"
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
            label="Contact detail"
            htmlFor="agent-contact"
            error={errors.contactNumber}
            required
          >
            <Input
              id="agent-contact"
              inputMode="tel"
              placeholder="+91 xxxxx xxxxx"
              value={formData.contactNumber}
              onChange={(event) =>
                handleChange("contactNumber", event.target.value)
              }
              aria-invalid={Boolean(errors.contactNumber)}
            />
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
          Create Agent
        </Button>
      </div>
    </div>
  );
}
