import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AppCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export default function Card({
  title,
  subtitle,
  action,
  children,
  className,
  padded = true,
}: AppCardProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <section
      className={cn(
        "app-card",
        padded && "p-4 sm:p-[18px]",
        className,
      )}
    >
      {hasHeader && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold leading-tight text-app-ink">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-[11px] font-normal leading-snug text-app-muted">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
