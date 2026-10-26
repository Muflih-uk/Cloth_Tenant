"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Info, Users, AlertTriangle } from "lucide-react";
import { fabricApi } from "@/lib/api/item";
import { CustomerRequirementResponse, formatMeters, toMeters } from "@/types/item";
import { ImagePreview } from "@/components/pages/ImagePreview";
import { PageLoading } from "@/components/ui/Loading";
import Button from "@/components/ui/app/Button";
import EmptyState from "@/components/ui/EmptyState";

export default function CustomerRequirementsPage() {
  const params = useParams();
  const router = useRouter();
  const fabricId = Number(params.id);

  const [data, setData] = useState<CustomerRequirementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fabricId) return;

    const fetchData = async () => {
      try {
        const result = await fabricApi.getCustomerRequirements(fabricId);
        setData(result);
      } catch (e) {
        console.error("Error fetching customer requirements:", e);
        setError("Failed to load fabric details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fabricId]);

  if (loading) {
    return <PageLoading text="Loading demand…" />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-full flex-col bg-app-bg">
        <div className="mx-auto w-full max-w-3xl p-4">
          <Button
            variant="secondary"
            onClick={() => router.replace("/admin/items?tab=ordered")}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-app-muted">
          <AlertTriangle className="mb-4 size-10 text-app-subtle" aria-hidden="true" />
          <h2 className="text-lg font-bold text-app-ink">
            {error || "Fabric not found"}
          </h2>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.replace("/admin/items?tab=ordered")}
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const totalOutstanding = data.customers.reduce(
    (sum, customer) => sum + toMeters(customer.outstanding_quantity),
    0,
  );

  return (
    <div className="min-h-full bg-app-bg pb-8">
      <div className="sticky top-0 z-10 border-b border-app-line bg-app-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 p-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.replace("/admin/items?tab=ordered")}
            aria-label="Back to outstanding items"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-app-ink">
              {data.fabric.name}
            </h1>
            <p className="text-xs text-app-muted">
              ₹{Number(data.fabric.price_per_meter).toLocaleString("en-IN")}/m
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-3 px-4 py-4 sm:space-y-4">
        {/* Summary Card */}
        <div className="rounded-card border border-app-line bg-app-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-brand-navy" aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted">
                Open demand
              </h2>
            </div>
            <div className="rounded-full border border-brand-navy/20 bg-brand-navy/10 px-3 py-0.5">
              <span className="text-xs font-bold text-brand-navy">
                {data.customers.length}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-app-line pt-3">
            <div>
              <p className="text-[10px] font-medium uppercase text-app-subtle">
                Still to pack
              </p>
              <p className="text-sm font-bold text-app-ink">
                {formatMeters(totalOutstanding)} m
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase text-app-subtle">
                Colours waiting
              </p>
              <p className="text-sm font-bold text-app-ink">
                {new Set(data.customers.map((c) => c.variant_display_order)).size}
              </p>
            </div>
          </div>
        </div>

        {/* Customer lines */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Info className="size-4 text-brand-navy" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted">
              Waiting on
            </h2>
          </div>

          {data.customers.length === 0 ? (
            <EmptyState
              icon={<Info className="size-5" aria-hidden="true" />}
              title="No open demand"
              description="No customer is waiting on this fabric."
            />
          ) : (
            <div className="space-y-2">
              {data.customers.map((customer, index) => (
                <div
                  key={`${customer.order_id}-${index}`}
                  className="flex items-center gap-3 rounded-card border border-app-line bg-app-card p-3"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-control border border-app-line bg-app-soft">
                    {customer.variant_image ? (
                      <ImagePreview
                        src={customer.variant_image}
                        alt={customer.customer_name}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Info className="size-4 text-app-subtle" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-app-ink">
                      {customer.customer_name}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-app-muted">
                        {customer.variant_display_order
                          ? `Colour #${customer.variant_display_order}`
                          : "No colour"}
                      </span>
                      {customer.agent && (
                        <>
                          <span className="text-app-subtle">·</span>
                          <span className="text-[10px] text-app-muted">
                            {customer.agent}
                          </span>
                        </>
                      )}
                      <span className="text-app-subtle">·</span>
                      <span className="text-[10px] text-app-muted">
                        Order #{customer.order_id}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="rounded-control bg-app-soft px-3 py-1.5">
                      <span className="text-sm font-bold text-app-ink">
                        {formatMeters(customer.outstanding_quantity)} m
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-app-muted">
                      of {formatMeters(customer.ordered_quantity)} m
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
