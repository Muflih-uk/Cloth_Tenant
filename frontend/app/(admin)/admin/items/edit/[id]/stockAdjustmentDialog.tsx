"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import Button from "@/components/ui/app/Button";
import { formatMeters, roundMetres, toMeters } from "@/types/item";

interface Props {
  current: string;
  label: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export default function StockAdjustmentDialog({
  current,
  label,
  onClose,
  onSave,
}: Props) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState("");

  const next = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(next) && next >= 0;
  const delta = roundMetres(toMeters(value) - toMeters(current));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/35 px-4 pb-8 backdrop-blur-sm sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[calc(100dvh-3rem)] w-full max-w-sm overflow-y-auto rounded-card border border-app-line bg-app-card shadow-float sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2
              id="stock-adjustment-title"
              className="text-base font-bold text-app-ink"
            >
              Adjust order stock
            </h2>
            <p className="mt-0.5 truncate text-xs text-app-muted">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-focus -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="h-px bg-app-line" />

        <div className="space-y-4 px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-app-subtle">
              Opening order-stock base
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError("");
                }}
                onFocus={(event) => event.target.select()}
                autoFocus
                className="font-bold"
                aria-label="Opening order-stock base in metres"
              />
              <span className="text-xs font-semibold text-app-muted">m</span>
            </div>
          </label>

          <div className="rounded-control bg-app-soft px-3 py-2.5 text-[11px] leading-relaxed text-app-muted">
            Changes the base used for available-to-order stock. Physical stock
            and rolls stay untouched. Saved with the fabric.
          </div>

          {value.trim() !== "" && valid && delta !== 0 && (
            <p className="text-xs font-semibold text-app-muted">
              Order stock {delta > 0 ? "+" : ""}
              {formatMeters(delta)} m
            </p>
          )}

          {error && (
            <p className="rounded-control bg-brand-red/10 px-3 py-2 text-xs font-semibold text-brand-red">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!valid) {
                setError("Enter zero or more metres.");
                return;
              }
              onSave(value.trim());
              onClose();
            }}
            className="flex-1"
          >
            Save adjustment
          </Button>
        </div>
      </div>
    </div>
  );
}
