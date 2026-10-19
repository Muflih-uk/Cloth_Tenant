"use client";
import StatusBadge from "@/components/ui/custom/StatusBadge";
import { SimpleAgent, SimpleCustomer } from "@/types/order";

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

function DeliverySummary({
  expectedDeliveryDate,
  preferredTransport,
  dispatchTransport,
  notes,
}: {
  expectedDeliveryDate?: string;
  preferredTransport?: string;
  dispatchTransport?: string;
  notes?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Delivery Info Row */}
      <div className="w-full grid grid-cols-2 gap-y-4 gap-x-6">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Expected Delivery
          </p>
          <h3 className="text-sm font-semibold text-gray-800">
            {expectedDeliveryDate || "Not specified"}
          </h3>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Preferred Transport
          </p>
          <h3 className="text-sm font-semibold text-gray-800">
            {preferredTransport || "Not specified"}
          </h3>
        </div>
      </div>
      {notes && (
        <div className="w-full flex flex-col gap-1">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Notes
          </p>
          <h3 className="text-sm font-semibold text-gray-800 break-words whitespace-pre-wrap w-full">
            {notes}
          </h3>
        </div>
      )}
      {dispatchTransport && (
        <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-[14px] text-gray-500 font-medium">
            Transported by{" "}
            <span className="text-[14px] font-semibold text-gray-800">
              {dispatchTransport}
            </span>
          </p>
        </div>
      )}
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
    <div className="flex flex-col bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] gap-y-4">
      <h2 className="text-xl font-extrabold text-gray-900 mb-4">
        Order Summary
      </h2>
      <div className="grid grid-cols-2 gap-y-4 gap-x-6 border-b pb-4">
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
            Customer
          </p>
          <h3 className="text-sm font-semibold text-gray-800">
            {customer.name}
          </h3>
          <h3 className="text-sm font-semibold text-gray-500">
            {customer.address}
          </h3>
          <h3 className="text-sm font-semibold text-gray-500">
            {customer.contact}
          </h3>
          <h3 className="text-sm font-semibold text-gray-500">
            {customer.gst}
          </h3>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
            Agent
          </p>
          <h3 className="text-sm font-semibold text-gray-800">
            {agent.username}
          </h3>
          <h3 className="text-sm font-semibold text-gray-500">
            {agent.contact}
          </h3>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
            Order Date
          </p>
          <h3 className="text-sm font-semibold text-gray-800">{orderDate}</h3>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
            Current Status
          </p>
          <StatusBadge status={status} />
        </div>
      </div>
      <DeliverySummary
        expectedDeliveryDate={expectedDeliveryDate}
        preferredTransport={preferredTransport}
        dispatchTransport={dispatchTransport}
        notes={notes}
      />
    </div>
  );
}
