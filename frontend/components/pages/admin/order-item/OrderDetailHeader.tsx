"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface OrderDetailHeaderProps {
  orderId: string;
  backHref: string;
}

export default function OrderDetailHeader({
  orderId,
  backHref,
}: OrderDetailHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-app-line/70 bg-app-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
        <Link
          href={backHref}
          className="app-focus -ml-2 flex h-11 items-center gap-0.5 rounded-control px-2 text-sm font-semibold text-brand-navy transition-colors hover:bg-app-soft"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          <span>Back</span>
        </Link>

        <div className="min-w-0 truncate rounded-full bg-app-soft px-3 py-1 text-xs font-bold text-app-muted">
          Order #{orderId}
        </div>
      </div>
    </header>
  );
}
