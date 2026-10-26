"use client";

import Card from "@/components/ui/app/Card";
import StatusBadge from "@/components/ui/custom/StatusBadge";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import { DetailList, DetailRow } from "@/components/ui/app/DetailList";
import type { SimpleAgent, SimpleCustomer } from "@/types/order";

interface OrderSummaryProps {
  customer: SimpleCustomer;
  agent: SimpleAgent;
  orderDate: string;
  status: string;
  preferredTransport?: string;
  expectedDeliveryDate?: string;
  dispatchTransport?: string;
  notes?: string;
}

function PartyCard({
  label,
  name,
  contact,
  address,
  gst,
  tone,
}: {
  label: string;
  name: string;
  contact?: string;
  address?: string;
  gst?: string;
  tone: "green" | "purple";
}) {
  return (
    <div className="rounded-control border border-app-line/60 bg-app-soft/50 p-3">
      <div className="flex items-center gap-3">
        <StockflowAvatar
          user={{ id: 0, name, contact: contact ?? "", address: "", gst: "" }}
          tone={tone}
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
            {label}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-app-ink">
            {name}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs font-medium leading-relaxed text-app-muted">
        {contact && <p>{contact}</p>}
        {address && <p>{address}</p>}
        {gst && <p>GST {gst}</p>}
      </div>
    </div>
  );
}

export default function OrderSummary({
  customer,
  agent,
  orderDate,
  status,
  preferredTransport,
  expectedDeliveryDate,
  dispatchTransport,
  notes,
}: OrderSummaryProps) {
  return (
    <Card
      title="Order summary"
      action={<StatusBadge status={status} />}
      className="mb-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PartyCard
          label="Customer"
          name={customer.name}
          contact={customer.contact}
          address={customer.address}
          gst={customer.gst}
          tone="green"
        />
        <PartyCard
          label="Agent"
          name={agent.username}
          contact={agent.contact}
          tone="purple"
        />
      </div>

      <DetailList className="mt-4">
        <DetailRow label="Order date">{orderDate}</DetailRow>
        <DetailRow label="Expected delivery">
          {expectedDeliveryDate || "Not specified"}
        </DetailRow>
        <DetailRow label="Preferred transport">
          {preferredTransport || "Not specified"}
        </DetailRow>
      </DetailList>

      {notes && (
        <div className="mt-3 rounded-control border border-app-line/60 bg-app-soft/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-app-ink">
            {notes}
          </p>
        </div>
      )}

      {dispatchTransport && (
        <div className="mt-3 flex items-center gap-2 rounded-control border border-brand-navy/15 bg-brand-navy/5 px-3 py-2.5 text-sm text-app-muted">
          <span>Transported by</span>
          <span className="font-semibold text-app-ink">
            {dispatchTransport}
          </span>
        </div>
      )}
    </Card>
  );
}
