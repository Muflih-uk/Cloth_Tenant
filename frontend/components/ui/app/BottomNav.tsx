"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BottomNavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  active?: boolean;
  highlighted?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  ariaLabel: string;
  onNavigate: (path: string) => void;
  loadingPath?: string | null;
  className?: string;
}

export default function BottomNav({
  items,
  ariaLabel,
  onNavigate,
  loadingPath,
  className,
}: BottomNavProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]",
        className,
      )}
    >
      <nav
        aria-label={ariaLabel}
        className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-[22px] border border-app-line/80 bg-app-card/95 p-2 shadow-float backdrop-blur-xl"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isLoading = loadingPath === item.path;
          const highlighted = item.active || item.highlighted || isLoading;

          return (
            <button
              key={item.path}
              type="button"
              aria-current={item.active ? "page" : undefined}
              aria-busy={isLoading || undefined}
              onClick={() => onNavigate(item.path)}
              disabled={Boolean(loadingPath) && !isLoading}
              className={cn(
                "app-focus flex h-12 min-h-12 flex-1 flex-col items-center justify-center rounded-control transition-colors active:scale-95 disabled:cursor-not-allowed",
                highlighted
                  ? "bg-brand-navy text-white shadow-card"
                  : "text-app-muted hover:bg-app-soft hover:text-app-ink",
                isLoading && "opacity-75",
              )}
            >
              <span className="flex h-5 items-center justify-center">
                {isLoading ? (
                  <Loader2 className="size-[18px] animate-spin" />
                ) : (
                  <Icon
                    size={item.active ? 20 : 19}
                    strokeWidth={item.active ? 2.5 : 2}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span
                className={cn(
                  "mt-1 max-w-full truncate px-0.5 text-[10px] leading-none",
                  item.active ? "font-bold" : "font-semibold",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
