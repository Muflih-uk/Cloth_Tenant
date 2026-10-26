"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import StockFlowButton from "@/components/ui/custom/stockFlowButton";
import { transportApi } from "@/lib/api/transport";
import { toastErrorFromError, toastSuccess } from "@/lib/toast";
import type { Transport } from "@/types/transport";

interface TransportFormProps {
  /** Omitted means "create a new one". */
  transport?: Transport;
}

/** Back to the list this form was opened from. */
const LIST_HREF = "/admin/profile/settings/transports";

/**
 * The transport form behind both dedicated pages.
 *
 * Transport writes are an admin action, so the admin has to name their PIN
 * here -- the same gate as every other shared record.
 */
export default function TransportForm({ transport }: TransportFormProps) {
  const router = useRouter();
  const editing = transport !== undefined;

  const [name, setName] = useState(transport?.name ?? "");
  const [isActive, setIsActive] = useState(transport?.is_active ?? true);
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Transport name is required";
    else if (name.trim().length > 100) next.name = "Keep it under 100 characters";
    if (pin.length !== 6) next.pin = "Enter your 6-digit PIN";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const payload = { name: name.trim(), is_active: isActive };
      if (editing && transport) {
        await transportApi.update(transport.id, payload, pin);
        toastSuccess("Transport updated");
      } else {
        await transportApi.create(payload, pin);
        toastSuccess("Transport added");
      }
      router.push(LIST_HREF);
    } catch (error) {
      toastErrorFromError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6">
        <FieldGroup className="space-y-5">
          <Field>
            <div className="flex justify-between items-center mb-1.5">
              <FieldLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Transport Name
              </FieldLabel>
              {errors.name && (
                <span className="text-[10px] text-red-500 font-bold">
                  {errors.name}
                </span>
              )}
            </div>
            <Input
              autoFocus
              placeholder="e.g. Sri Travels"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              className={`bg-white border-gray-100 rounded-xl h-12 ${
                errors.name ? "border-red-200" : "focus:border-primary"
              }`}
            />
          </Field>

          <Field>
            <FieldLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Status
            </FieldLabel>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full px-4 py-3 rounded-xl border font-bold text-sm transition-all ${
                isActive
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </button>
            <p className="text-[10px] text-gray-400">
              Only active transports are offered when a bundle is dispatched.
            </p>
          </Field>

          <Field>
              <div className="flex justify-between items-center mb-1.5">
                <FieldLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Admin PIN
                </FieldLabel>
                {errors.pin && (
                  <span className="text-[10px] text-red-500 font-bold">
                    {errors.pin}
                  </span>
                )}
              </div>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  clearError("pin");
                }}
                placeholder="6-digit PIN"
                className={`bg-white border-gray-100 rounded-xl h-12 tracking-[0.4em] ${
                  errors.pin ? "border-red-200" : ""
                }`}
              />
          </Field>
        </FieldGroup>
      </div>

      <div className="flex gap-3 items-center">
        <StockFlowButton
          variant="outline"
          text="Cancel"
          onClick={() => router.push(LIST_HREF)}
          disabled={busy}
          className="flex-1 h-14 rounded-2xl border-gray-200 font-bold text-gray-500 active:scale-95 transition-all text-sm"
        />
        <StockFlowButton
          variant="filled"
          text={
            busy ? "Saving..." : editing ? "Save Changes" : "Add Transport"
          }
          onClick={handleSubmit}
          disabled={busy}
          className="flex-[2] h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 font-bold text-white active:scale-95 transition-all text-sm"
        />
      </div>
    </>
  );
}
