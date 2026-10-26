"use client";

import { PackageOpen } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-app-line bg-app-soft/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-app-line bg-app-card text-app-muted shadow-card">
        {icon ?? <PackageOpen className="size-5" aria-hidden="true" />}
      </div>
      <h2 className="text-sm font-semibold text-app-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-xs text-xs font-medium leading-relaxed text-app-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
