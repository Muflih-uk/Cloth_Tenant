import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  showChevron?: boolean;
  className?: string;
}

export default function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  href,
  onClick,
  ariaLabel,
  showChevron = true,
  className,
}: ListRowProps) {
  const label =
    ariaLabel ??
    (typeof title === "string" ? `Open ${title}` : "Open details");
  const interactive = Boolean(href || onClick);

  return (
    <div
      className={cn(
        "relative flex min-h-[68px] items-center gap-3 rounded-card border border-app-line bg-app-card p-3.5 shadow-card transition-colors",
        interactive && "hover:border-brand-navy/20 hover:bg-app-soft/40",
        className,
      )}
    >
      {href && (
        <Link
          href={href}
          aria-label={label}
          className="app-focus absolute inset-0 z-0 rounded-card"
        />
      )}
      {!href && onClick && (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="app-focus absolute inset-0 z-0 rounded-card"
        />
      )}

      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-3">
        {leading && <div className="shrink-0">{leading}</div>}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight text-app-ink">
            {title}
          </div>
          {subtitle && (
            <div className="app-secondary mt-1 truncate">{subtitle}</div>
          )}
          {meta && <div className="mt-1.5">{meta}</div>}
        </div>

        {trailing && <div className="shrink-0">{trailing}</div>}
        {interactive && showChevron && (
          <ChevronRight
            className="size-4 shrink-0 text-app-subtle"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
