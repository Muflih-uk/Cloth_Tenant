import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DetailListProps {
  children: ReactNode;
  className?: string;
}

interface DetailRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function DetailList({ children, className }: DetailListProps) {
  return (
    <dl className={cn("divide-y divide-app-line", className)}>{children}</dl>
  );
}

export function DetailRow({ label, children, className }: DetailRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0",
        className,
      )}
    >
      <dt className="shrink-0 text-xs font-medium text-app-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold text-app-ink">
        {children}
      </dd>
    </div>
  );
}
