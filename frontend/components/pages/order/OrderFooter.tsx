"use client";

import { CheckCircle2, Info, PackageCheck, Truck } from "lucide-react";

import { formatMeters } from "@/types/item";
import { cn } from "@/lib/utils";

interface OrderFooterProps {
  status?: string;
  /** True when every metre on the order has been allocated by a packing round. */
  fullyPacked: boolean;
  /** Metres already allocated, even when the order is not fully packed. */
  allocatedMeters: number;
  /**
   * How many sealed bundles are still sitting in the warehouse, if any is known.
   * This is what a box to send out actually looks like, so the bar counts boxes
   * rather than orderings.
   */
  pendingBundles?: number;
  /** How many of those boxes have already gone out. */
  dispatchedBundles?: number;
  /** True once every bundle on the order has gone and nothing is still owed. */
  fullyDispatched?: boolean;
}

const TONES = {
  success:
    "border-brand-green/25 bg-brand-green/10 text-[color:var(--status-dispatched-text)]",
  info: "border-brand-navy/15 bg-brand-navy/5 text-brand-navy",
  warning:
    "border-status-pending/30 bg-status-pending/10 text-[color:var(--status-pending-text)]",
} as const;

function FooterBanner({
  icon,
  tone = "info",
  children,
}: {
  icon: React.ReactNode;
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] z-40 px-4">
      <div
        role="status"
        className={cn(
          "mx-auto flex max-w-2xl items-center gap-3 rounded-card border bg-app-card/95 p-3 shadow-float backdrop-blur-xl",
          TONES[tone],
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-app-card/70">
          {icon}
        </span>
        <div className="min-w-0 text-xs font-semibold leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function OrderFooter({
  status,
  fullyPacked,
  allocatedMeters,
  pendingBundles = 0,
  dispatchedBundles = 0,
  fullyDispatched = false,
}: OrderFooterProps) {
  if (fullyDispatched || status === "DISPATCHED") {
    return (
      <FooterBanner
        tone="success"
        icon={<CheckCircle2 size={18} aria-hidden="true" />}
      >
        Order has been dispatched
      </FooterBanner>
    );
  }

  if (pendingBundles > 0) {
    return (
      <FooterBanner
        tone={fullyPacked ? "info" : "warning"}
        icon={<PackageCheck size={18} aria-hidden="true" />}
      >
        {pendingBundles} sealed bundle{pendingBundles === 1 ? "" : "s"} ready to
        dispatch
        {dispatchedBundles > 0 && (
          <span className="font-medium text-app-muted">
            {" · "}
            {dispatchedBundles} already gone
          </span>
        )}
        {!fullyPacked && (
          <span className="font-medium text-app-muted">
            {" · "}
            {formatMeters(allocatedMeters)} m packed, rest is still owed
          </span>
        )}
      </FooterBanner>
    );
  }

  if (!fullyPacked) {
    if (status === "DRAFT") return null;

    // Some cloth is cut and ready, the rest is still owed: say so, rather than
    // stranding what is already packed with no indication of where it went.
    if (allocatedMeters > 0) {
      return (
        <FooterBanner
          tone="warning"
          icon={<Info size={18} aria-hidden="true" />}
        >
          {formatMeters(allocatedMeters)} m packed, rest is still owed
        </FooterBanner>
      );
    }

    return (
      <FooterBanner
        tone="warning"
        icon={<Info size={18} aria-hidden="true" />}
      >
        Waiting on a packing round
      </FooterBanner>
    );
  }

  // Fully packed with no sealed bundle to send. Should not happen -- packing always
  // produces a bundle -- so it is reported rather than offered as an action.
  return (
    <FooterBanner
      tone="info"
      icon={<Truck size={18} aria-hidden="true" />}
    >
      All metres are packed and waiting to be sealed into a bundle
    </FooterBanner>
  );
}
