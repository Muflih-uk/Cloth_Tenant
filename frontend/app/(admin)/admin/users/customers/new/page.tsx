"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Button from "@/components/ui/app/Button";
import Card from "@/components/ui/app/Card";
import PageHeader from "@/components/ui/app/PageHeader";
import FormField from "@/components/ui/custom/FormField";
import StockFlowSelect from "@/components/ui/custom/stockFlowSelect";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { agentApi } from "@/lib/api/agents";
import { customerApi } from "@/lib/api/customer";
import { transportApi } from "@/lib/api/transport";
import { toastError, toastSuccess } from "@/lib/toast";
import { CustomerCreateRequest } from "@/types/customer";

export default function NewCustomerPage() {
  const [formData, setFormData] = useState({
    agent: "",
    customerName: "",
    address: "",
    contactNumber: "",
    gst: "",
    preferredTransport: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { isAuthenticated } = useAuth();
  const [agents, setAgents] = useState<{ value: string; label: string }[]>([]);
  const [transports, setTransports] = useState<
    { value: string; label: string }[]
  >([]);
  const router = useRouter();
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingTransports, setLoadingTransports] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      setLoadingAgents(true);
      try {
        const response = await agentApi.getAll();
        const formattedAgents = response.map((agent) => ({
          value: agent.id.toString(),
          label: agent.user.username,
        }));
        setAgents(formattedAgents);
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setLoadingAgents(false);
      }
    };

    const fetchTransports = async () => {
      setLoadingTransports(true);
      try {
        const response = await transportApi.getActive();
        const formattedTransports = response.map((transport) => ({
          value: transport.id.toString(),
          label: transport.name,
        }));
        setTransports(formattedTransports);
      } catch (error) {
        console.error("Error fetching transports:", error);
      } finally {
        setLoadingTransports(false);
      }
    };

    fetchAgents();
    fetchTransports();
  }, [isAuthenticated, router]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.agent) newErrors.agent = "Please select an agent";
    if (!formData.customerName.trim())
      newErrors.customerName = "Customer name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = "Invalid contact number format";
    }
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

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CustomerCreateRequest = {
        name: formData.customerName,
        address: formData.address,
        contact: formData.contactNumber,
        agent: parseInt(formData.agent),
        gst: formData.gst.toUpperCase(),
        preferred_transport: formData.preferredTransport
          ? parseInt(formData.preferredTransport)
          : null,
      };
      await customerApi.create(payload);
      toastSuccess("Customer created successfully");
      router.push("/admin/users/");
    } catch (error: unknown) {
      console.error("Error creating customer:", error);
      toastError("Failed to create customer", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        title="New customer"
        subtitle="Register a new client in the system."
        className="mb-4"
      />

      <Card className="mb-5">
        <div className="space-y-5">
          <FormField
            label="Assigned agent"
            htmlFor="customer-agent"
            error={errors.agent}
            required
          >
            <StockFlowSelect
              value={formData.agent}
              onChange={(value) => handleChange("agent", value)}
              options={agents}
              disabled={loadingAgents || isSubmitting}
              placeholder={loadingAgents ? "Loading agents..." : "Select agent"}
              className={errors.agent ? "border-brand-red" : ""}
            />
          </FormField>

          <FormField
            label="Customer / shop name"
            htmlFor="customer-name"
            error={errors.customerName}
            required
          >
            <Input
              id="customer-name"
              placeholder="e.g. Fashion Hub"
              value={formData.customerName}
              onChange={(event) =>
                handleChange("customerName", event.target.value)
              }
              aria-invalid={Boolean(errors.customerName)}
            />
          </FormField>

          <FormField
            label="Shipping address"
            htmlFor="customer-address"
            error={errors.address}
            required
          >
            <Textarea
              id="customer-address"
              rows={3}
              placeholder="Full mailing address..."
              value={formData.address}
              onChange={(event) =>
                handleChange("address", event.target.value)
              }
              aria-invalid={Boolean(errors.address)}
            />
          </FormField>

          <FormField
            label="Contact detail"
            htmlFor="customer-contact"
            error={errors.contactNumber}
            required
          >
            <Input
              id="customer-contact"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={formData.contactNumber}
              onChange={(event) =>
                handleChange("contactNumber", event.target.value)
              }
              aria-invalid={Boolean(errors.contactNumber)}
            />
          </FormField>

          <FormField
            label="GST number"
            htmlFor="customer-gst"
            error={errors.gst}
            required
          >
            <Input
              id="customer-gst"
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={formData.gst}
              onChange={(event) =>
                handleChange("gst", event.target.value.toUpperCase())
              }
              aria-invalid={Boolean(errors.gst)}
            />
          </FormField>

          <FormField label="Preferred transport" htmlFor="customer-transport">
            <StockFlowSelect
              value={formData.preferredTransport}
              onChange={(value) =>
                handleChange("preferredTransport", value)
              }
              options={[{ value: "", label: "None" }, ...transports]}
              disabled={loadingTransports || isSubmitting}
              placeholder={
                loadingTransports ? "Loading transports..." : "Select transport"
              }
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
          Add Customer
        </Button>
      </div>
    </div>
  );
}
