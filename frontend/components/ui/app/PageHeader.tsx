import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  right,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 pb-1",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="app-page-title">{title}</h1>
        {subtitle && (
          <div className="app-secondary mt-1.5 max-w-prose">{subtitle}</div>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
