"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-8 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[calc(100dvh-3rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div>
            <h2 id="stock-adjustment-title" className="text-base font-black">
              Adjust order stock
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="space-y-4 px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
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
                className="h-11 text-base font-bold"
                aria-label="Opening order-stock base in metres"
              />
              <span className="text-xs font-semibold text-gray-400">m</span>
            </div>
          </label>

          <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] leading-relaxed text-gray-500">
            Changes the base used for available-to-order stock. Physical stock
            and rolls stay untouched. Saved with the fabric.
          </div>

          {value.trim() !== "" && valid && delta !== 0 && (
            <p className="text-xs font-semibold text-gray-500">
              Order stock {delta > 0 ? "+" : ""}
              {formatMeters(delta)} m
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-500">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!valid) {
                setError("Enter zero or more metres.");
                return;
              }
              onSave(value.trim());
              onClose();
            }}
            className="h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20"
          >
            Save adjustment
          </button>
        </div>
      </div>
    </div>
  );
}
