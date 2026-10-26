"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ImagePreview } from "@/components/pages/ImagePreview";
import { fabricApi } from "@/lib/api/item";
import { customerApi } from "@/lib/api/customer";
import { PageLoading } from "@/components/ui/Loading";
import { toastError } from "@/lib/toast";
import { createDraftOrder } from "@/lib/draftOrder";
import { extractErrorMessage } from "@/lib/orderFlow";
import Button from "@/components/ui/app/Button";
import EmptyState from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  QrCode,
  Package,
  Check,
  X,
  ShoppingCart,
} from "lucide-react";
import type { FabricQRResponse, FabricVariant } from "@/types/item";
import { formatMeters, toMeters } from "@/types/item";
import type { CustomerAllResponse } from "@/types/customer";

export default function PriceCheckScannerPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<FabricQRResponse | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<FabricVariant | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customers, setCustomers] = useState<CustomerAllResponse>([]);
  const [scanned, setScanned] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerApi.getAll();
        setCustomers(data.results);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  const handleScan = async (data: { rawValue: string }[]) => {
    if (scanned || !data[0]?.rawValue) return;

    setScanned(true);
    setLoading(true);

    try {
      const result = await fabricApi.byQr(data[0].rawValue);
      setScanResult(result);
      if (result.matched_variant_id) {
        const matched = result.variants.find(
          (v) => v.id === result.matched_variant_id,
        );
        setSelectedVariant(matched || result.variants[0] || null);
      } else {
        setSelectedVariant(result.variants[0] || null);
      }
    } catch (err) {
      console.error("Error fetching fabric:", err);
      toastError(
        extractErrorMessage(
          (err as { response?: { data?: unknown } })?.response?.data,
          "Fabric not found",
        ),
        err,
      );
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customerId: number) => {
    if (creating) return;
    const qrCode = selectedVariant?.qr_code;
    if (!scanResult || !qrCode) return;
    // Create the draft here. Pushing straight to the add-item page left it
    // resolving the target order from session storage, so a quick order from the
    // price-check scanner could append its line to a placed order left over
    // from earlier in the session.
    setCreating(true);
    try {
      await createDraftOrder(customerId);
      router.push(`/agent/order/new/${customerId}/${qrCode}`);
    } catch (err) {
      console.error("Error creating order:", err);
      toastError(
        extractErrorMessage(
          (err as { response?: { data?: unknown } })?.response?.data,
          "Error creating order. Please try again.",
        ),
        err,
      );
      setCreating(false);
    }
  };

  const handleQuickOrder = () => {
    setShowCustomerSelect(true);
  };

  const handleCloseCustomerSelect = () => {
    setShowCustomerSelect(false);
  };

  const handleScanAnother = () => {
    setScanResult(null);
    setSelectedVariant(null);
    setScanned(false);
  };

  const onHand = selectedVariant ? toMeters(selectedVariant.stock_meters) : 0;
  /**
   * What is still unclaimed rather than what is on the shelf. Falls back to the
   * shelf figure if the response predates the field, so this never reads zero
   * for a colour that plainly has cloth.
   */
  const available =
    selectedVariant?.available_meters !== undefined
      ? toMeters(selectedVariant.available_meters)
      : onHand;

  if (loading) return <PageLoading />;

  if (showCustomerSelect) {
    return (
      <div className="min-h-full bg-app-bg pb-20">
        <div className="sticky top-0 z-10 border-b border-app-line bg-app-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCloseCustomerSelect}
              aria-label="Back to scanned item"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-tight text-app-ink">
                Select Customer
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                For quick order
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-4">
          {customers.length === 0 ? (
            <EmptyState
              title="No customers found"
              description="Add a customer before placing a quick order."
            />
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer.id)}
                  disabled={creating}
                  className="app-focus flex w-full items-center gap-3 rounded-card border border-app-line bg-app-card p-3 text-left transition-colors hover:border-brand-navy/30 hover:bg-app-soft/50 active:scale-[0.99] disabled:opacity-60 sm:gap-4 sm:p-4"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-control border border-brand-navy/10 bg-brand-navy/5">
                    <span className="text-lg font-bold text-brand-navy">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-app-ink">
                      {customer.name}
                    </h2>
                    <p className="mt-1 truncate text-xs font-medium leading-tight text-app-muted">
                      {customer.address || "No address"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (scanResult) {
    return (
      <div className="min-h-full bg-app-bg pb-20">
        <div className="sticky top-0 z-10 border-b border-app-line bg-app-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => router.push("/agent/items")}
              aria-label="Close price check"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
            <div className="min-w-0 text-center">
              <h1 className="truncate text-lg font-bold leading-tight text-app-ink">
                Price Check
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                Item Details
              </p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleScanAnother}
              aria-label="Scan another fabric"
            >
              <QrCode className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-xl space-y-4 px-4 pt-4">
          <div className="relative aspect-square overflow-hidden rounded-card border border-app-line bg-app-card">
            {selectedVariant?.image ? (
              <ImagePreview src={selectedVariant.image} alt={scanResult.name} />
            ) : (
              <div className="flex size-full items-center justify-center bg-app-soft">
                <Package className="size-16 text-app-subtle" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {scanResult.variants.map((v) => {
              const selected = selectedVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  aria-pressed={selected}
                  className={`app-focus relative size-20 shrink-0 overflow-hidden rounded-card border-2 transition-all ${
                    selected
                      ? "border-brand-navy ring-2 ring-brand-navy/20"
                      : "border-app-line hover:border-brand-navy/30"
                  }`}
                >
                  {v.image ? (
                    <ImagePreview
                      src={v.image}
                      alt={v.display_order || `Colour ${v.id}`}
                      enlargeDisabled={true}
                    />
                  ) : (
                    <div className="size-full bg-app-soft" />
                  )}
                  {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-navy/20">
                      <Check
                        className="size-6 text-white"
                        strokeWidth={4}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-center">
            <h2 className="mb-1 text-2xl font-bold text-app-ink">
              {scanResult.name}
            </h2>
            {selectedVariant?.display_order && (
              <span className="inline-block rounded-full bg-brand-navy/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-navy">
                {selectedVariant.display_order}
              </span>
            )}
          </div>

          <div className="rounded-card border border-brand-green/20 bg-brand-green/5 p-4 sm:p-6">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              Price
            </p>
            <p className="text-4xl font-bold text-brand-green">
              ₹{Number(scanResult.price_per_meter).toLocaleString("en-IN")}
              <span className="text-lg text-brand-green/70">/m</span>
            </p>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-app-subtle">
              Availability
            </p>
            {available > 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-control border border-brand-green/20 bg-brand-green/5 px-4 py-3">
                <div className="min-w-0">
                  <span className="text-sm font-bold text-brand-green">
                    {formatMeters(available)} m available
                  </span>
                  <span className="block text-[11px] font-medium text-brand-green/80">
                    On hand: {formatMeters(onHand)} m
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium text-brand-green">
                  worth ₹
                  {(
                    available * Number(scanResult.price_per_meter)
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            ) : (
              <div className="rounded-control border border-brand-red/20 bg-brand-red/5 px-4 py-3">
                <span className="text-sm font-bold text-brand-red">
                  {available < 0
                    ? `Oversold by ${formatMeters(Math.abs(available))} m against existing orders`
                    : "Nothing available"}
                </span>
                <span className="block text-[11px] font-medium text-brand-red/80">
                  On hand: {formatMeters(onHand)} m
                </span>
              </div>
            )}
          </div>

          <Button size="lg" fullWidth onClick={handleQuickOrder}>
            <ShoppingCart className="size-5" aria-hidden="true" />
            Order for Customer
          </Button>

          <Button variant="secondary" fullWidth onClick={handleScanAnother}>
            <QrCode className="size-4" aria-hidden="true" />
            Scan Another Fabric
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-app-bg pb-20">
      <div className="sticky top-0 z-10 border-b border-app-line bg-app-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.push("/agent/items")}
            aria-label="Back to items"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight text-app-ink">
              Scan Fabric
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
              Check price
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-4">
        <div className="relative aspect-square w-full max-w-[280px]">
          <div className="absolute -left-2 -top-2 z-20 size-8 rounded-tl-2xl border-l-4 border-t-4 border-brand-navy" />
          <div className="absolute -right-2 -top-2 z-20 size-8 rounded-tr-2xl border-r-4 border-t-4 border-brand-navy" />
          <div className="absolute -bottom-2 -left-2 z-20 size-8 rounded-bl-2xl border-b-4 border-l-4 border-brand-navy" />
          <div className="absolute -bottom-2 -right-2 z-20 size-8 rounded-br-2xl border-b-4 border-r-4 border-brand-navy" />

          <div className="relative size-full overflow-hidden rounded-card bg-brand-navy shadow-float ring-8 ring-app-card/50">
            <Scanner
              constraints={{
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
              onScan={handleScan}
              onError={(err) => console.error(err)}
              classNames={{
                container: "w-full h-full",
                video: "w-full h-full object-cover",
              }}
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-navy/20 bg-brand-navy/10 px-4 py-2 text-brand-navy">
            <QrCode className="size-4" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Price Check
            </span>
          </div>
          <h2 className="text-lg font-bold text-app-ink">Scan Fabric QR</h2>
          <p className="mx-auto mt-2 max-w-[220px] text-sm font-medium leading-relaxed text-app-muted">
            Scan a fabric QR to see its rate and stock
          </p>
        </div>
      </div>
    </div>
  );
}
