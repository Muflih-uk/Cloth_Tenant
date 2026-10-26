"use client";

import { ReactNode } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <Field className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={htmlFor} className="text-xs font-semibold text-app-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-brand-red" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-brand-red">
          <span className="inline-block size-1 shrink-0 rounded-full bg-brand-red" />
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="mt-1 text-[11px] font-medium leading-snug text-app-muted">
          {hint}
        </p>
      )}
    </Field>
  );
}
