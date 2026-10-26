"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export default function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full items-center gap-1 rounded-full border border-app-line/70 bg-app-soft p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "app-focus flex h-11 min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors",
              selected
                ? "bg-brand-navy text-white shadow-card"
                : "text-app-muted hover:bg-app-card hover:text-app-ink",
            )}
          >
            <span className="truncate">{option.label}</span>
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  selected
                    ? "bg-white/15 text-white"
                    : "bg-app-card text-app-muted",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
