"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, X, ShieldAlert } from "lucide-react";

import Button from "@/components/ui/app/Button";

interface PinDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void>;
  title?: string;
  description?: string;
}

export default function PinDeleteDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm delete",
  description = "This action cannot be undone.",
}: PinDeleteDialogProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 100);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || loading) return;
      setPin(["", "", "", "", "", ""]);
      setError("");
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose, open]);

  if (!open) return null;

  const handleClose = () => {
    if (loading) return;
    setPin(["", "", "", "", "", ""]);
    setError("");
    onClose();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (pin[index]) {
        const next = [...pin];
        next[index] = "";
        setPin(next);
        setError("");
      } else if (index > 0) {
        const next = [...pin];
        next[index - 1] = "";
        setPin(next);
        inputRefs.current[index - 1]?.focus();
        setError("");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      handleConfirm();
    }
  };

  const handleInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const next = [...pin];
    next[index] = digit;
    setPin(next);
    setError("");

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = [...pin];
    pasted.split("").forEach((digit, i) => {
      if (i < 6) next[i] = digit;
    });
    setPin(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleConfirm = async () => {
    const fullPin = pin.join("");
    if (fullPin.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm(fullPin);
      setPin(["", "", "", "", "", ""]);
      setError("");
      onClose();
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { error?: string; detail?: string } };
      };
      const msg =
        apiError?.response?.data?.error ||
        apiError?.response?.data?.detail ||
        "Incorrect PIN. Try again.";
      setError(msg);
      setPin(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const filledCount = pin.filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/35 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-delete-title"
        aria-describedby="pin-delete-description"
        className="w-full overflow-hidden rounded-card border border-app-line bg-app-card pb-safe shadow-float animate-in slide-in-from-bottom-4 duration-200 sm:max-w-sm sm:slide-in-from-bottom-0"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-red/10">
              <ShieldAlert className="size-5 text-brand-red" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="pin-delete-title"
                className="truncate text-base font-bold text-app-ink"
              >
                {title}
              </h2>
              <p
                id="pin-delete-description"
                className="mt-0.5 text-xs text-app-muted"
              >
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
            className="app-focus flex size-11 shrink-0 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-5 h-px bg-app-line" />

        <div className="px-5 pb-5 pt-5">
          <p className="mb-4 text-center text-xs font-semibold text-app-muted">
            Enter your 6-digit PIN
          </p>

          <div className="mb-2 flex justify-center gap-1.5" onPaste={handlePaste}>
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                aria-label={`PIN digit ${i + 1}`}
                className={`app-focus h-14 w-11 rounded-control border-2 bg-app-soft text-center text-xl font-bold outline-none transition-colors ${
                  error
                    ? "border-brand-red/40 bg-brand-red/5 text-brand-red"
                    : digit
                      ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                      : "border-app-line text-app-ink focus:border-brand-navy"
                } disabled:opacity-50`}
              />
            ))}
          </div>

          <div className="mb-4 flex justify-center gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-150 ${
                  i < filledCount
                    ? "size-2 bg-brand-navy"
                    : "size-1.5 bg-app-line"
                }`}
              />
            ))}
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-control bg-brand-red/10 px-3 py-2 text-center text-xs font-semibold text-brand-red"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
              className="h-12 flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              loading={loading}
              loadingText="Deleting..."
              disabled={filledCount < 6}
              className="h-12 flex-1"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
