import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  className?: string;
}

export default function StatCard({
  label,
  value,
  note,
  icon,
  progress,
  className,
}: StatCardProps) {
  const percent = progress
    ? Math.min(
        100,
        Math.max(0, (progress.value / Math.max(progress.max, 1)) * 100),
      )
    : 0;

  return (
    <div className={cn("app-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-app-muted">{label}</p>
        {icon && <div className="shrink-0 text-app-muted">{icon}</div>}
      </div>
      <div className="app-stat mt-2">{value}</div>
      {note && <div className="mt-1.5 text-[11px] text-app-muted">{note}</div>}
      {progress && (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-app-soft"
            role="progressbar"
            aria-label={progress.label ?? label}
            aria-valuemin={0}
            aria-valuemax={progress.max}
            aria-valuenow={progress.value}
          >
            <div
              className="h-full rounded-full bg-brand-blue transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
