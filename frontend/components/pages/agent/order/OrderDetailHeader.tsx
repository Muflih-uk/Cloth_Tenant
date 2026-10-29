"use client";

import { ChevronLeft, FileText } from "lucide-react";
import Link from "next/link";

import Button from "@/components/ui/app/Button";

interface OrderDetailHeaderProps {
  orderId: string;
  backHref: string;
  onViewInvoice?: () => void;
}

export default function OrderDetailHeader({
  orderId,
  backHref,
  onViewInvoice,
}: OrderDetailHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-app-line/70 bg-app-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 lg:max-w-7xl lg:px-6">
        <Link
          href={backHref}
          className="app-focus -ml-2 inline-flex h-11 items-center gap-0.5 rounded-control px-2 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy/10"
        >
          <ChevronLeft size={20} aria-hidden="true" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-3">
          {onViewInvoice ? (
            <Button onClick={onViewInvoice}>
              <FileText className="size-4" aria-hidden="true" />
              PO
            </Button>
          ) : (
            <div className="rounded-full bg-app-soft px-3 py-1.5 text-sm font-bold text-app-muted">
              #{orderId}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
