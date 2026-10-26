"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";

import Button from "@/components/ui/app/Button";

export function Modal({
  icon,
  iconBg,
  title,
  description,
  onClose,
  actions,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  onClose: () => void;
  actions: React.ReactNode;
  children?: React.ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/35 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm overflow-hidden rounded-card border border-app-line bg-app-card shadow-float"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-control ${iconBg}`}
            >
              {icon}
            </div>
            <h2
              id={titleId}
              className="truncate text-base font-bold text-app-ink"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="app-focus -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <p
          id={descriptionId}
          className="px-5 pb-4 pt-3 text-sm leading-relaxed text-app-muted"
        >
          {description}
        </p>

        {children && (
          <div className="max-h-52 space-y-2 overflow-y-auto px-5">
            {children}
          </div>
        )}

        <div className="flex gap-2.5 p-5">{actions}</div>
      </div>
    </div>
  );
}

export function ModalButton({
  variant,
  onClick,
  disabled,
  children,
}: {
  variant: "ghost" | "primary" | "destructive";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={variant === "ghost" ? "secondary" : variant}
      onClick={onClick}
      disabled={disabled}
      className="h-12 flex-1"
    >
      {children}
    </Button>
  );
}
