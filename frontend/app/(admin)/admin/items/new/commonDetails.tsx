"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/app/Button";
import { ArrowLeft } from "lucide-react";
import type { FabricDetails } from "@/types/item";

interface Props {
  value: FabricDetails;
  onChange: (v: FabricDetails) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step1CommonDetails({ value, onChange, onNext, onBack }: Props) {
  const set = <K extends keyof FabricDetails>(key: K, val: FabricDetails[K]) =>
    onChange({ ...value, [key]: val });

  const rate = Number(value.price_per_meter);
  const priceValid = value.price_per_meter.trim() !== "" && rate >= 0;
  const isValid = value.name.trim() !== "" && priceValid;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col bg-app-bg px-4 py-4 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="app-focus flex size-11 shrink-0 items-center justify-center rounded-full bg-app-soft text-app-muted transition-colors hover:bg-brand-navy hover:text-white"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-app-subtle">
            Step 1 of 2
          </p>
          <h1 className="truncate text-xl font-bold leading-tight text-app-ink">
            Fabric Details
          </h1>
        </div>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-app-muted">
        These details are shared across all the colours you&apos;ll add next.
      </p>

      <div className="flex-1 rounded-card border border-app-line bg-app-card p-4 sm:p-5">
        <div className="space-y-5">
          <Field>
            <FieldLabel>Fabric name *</FieldLabel>
            <Input
              placeholder="e.g. Cotton Lawn, Rayon Cambric"
              value={value.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Design number</FieldLabel>
            <Input
              placeholder="e.g. RJ-1042"
              value={value.design_number}
              onChange={(e) => set("design_number", e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Category</FieldLabel>
            <Input
              placeholder="e.g. Cotton, Rayon"
              value={value.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              placeholder="Composition, weight, feel…"
              value={value.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Price per metre (₹) *</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={value.price_per_meter}
              onChange={(e) => set("price_per_meter", e.target.value)}
              aria-invalid={value.price_per_meter.trim() !== "" && !priceValid}
            />
            {value.price_per_meter.trim() !== "" && !priceValid && (
              <p className="mt-1.5 text-xs font-medium text-brand-red">
                Enter a price of zero or more.
              </p>
            )}
          </Field>
        </div>
      </div>

      <div className="mt-auto pt-6 pb-2">
        <Button
          size="lg"
          fullWidth
          disabled={!isValid}
          onClick={onNext}
        >
          Next — Add Colours
        </Button>
      </div>
    </div>
  );
}
