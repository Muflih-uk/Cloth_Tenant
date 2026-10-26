"use client";
import { fabricApi } from "@/lib/api/item";
import { toMeters } from "@/types/item";
import { toastError } from "@/lib/toast";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ArchiveX, QrCode, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal, ModalButton } from "../ui/custom/Modals";

interface ScannerPageProps {
  id: string;
  basePath?: string;
}

const ScannerPage: React.FC<ScannerPageProps> = ({
  id,
  basePath = "/agent/order/new",
}) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [outOfStockFabric, setOutOfStockFabric] = useState("");
  const [validating, setValidating] = useState(false);
  const router = useRouter();

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      <div className="relative w-full aspect-square max-w-[280px]">
        {/* Corner Brackets */}
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-brand-navy rounded-tl-2xl z-20" />
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-brand-navy rounded-tr-2xl z-20" />
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-brand-navy rounded-bl-2xl z-20" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-brand-navy rounded-br-2xl z-20" />

        {/* Scanner Container */}
        <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-black shadow-2xl ring-8 ring-app-line/30">
          <Scanner
            constraints={{
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }}
            onScan={async (data) => {
              if (data[0]?.rawValue && !validating) {
                const qrValue = data[0].rawValue;
                setValidating(true);
                try {
                  // Resolve the roll before sending the agent onward: an
                  // empty roll cannot contribute metres, so stop them here
                  // rather than on a form with nothing to enter.
                  const fabric = await fabricApi.byQr(qrValue);
                  const matched = fabric.variants.find(
                    (variant) => variant.qr_code === qrValue,
                  );

                  if (matched && toMeters(matched.stock_meters) <= 0) {
                    setOutOfStockFabric(fabric.name);
                    setShowLeaveConfirm(true);
                    return;
                  }

                  router.push(`${basePath}/${id}/${qrValue}`);
                } catch (e) {
                  toastError("Invalid QR code", e);
                } finally {
                  setValidating(false);
                }
              }
            }}
            onError={(err) => console.error(err)}
            classNames={{
              container: "w-full h-full",
              video: "w-full h-full object-cover",
            }}
          />
        </div>
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-navy/10 text-brand-navy px-4 py-2 rounded-full border border-brand-navy/20 mb-4">
          <QrCode size={16} />
          <span className="text-xs font-semibold uppercase tracking-widest">
            {validating ? "Checking..." : "Awaiting Scan"}
          </span>
        </div>
        <h2 className="text-lg font-bold text-app-ink">Align QR Code</h2>
        <p className="text-sm text-app-muted mt-2 max-w-[200px] mx-auto leading-relaxed font-medium">
          Position the fabric roll&apos;s QR code within the frame to add it to
          the order
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-brand-navy/40 animate-pulse">
        <Sparkles size={16} />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Auto-detecting
        </span>
      </div>

      {showLeaveConfirm && (
        <Modal
          icon={<ArchiveX size={18} className="text-brand-red" />}
          iconBg="bg-brand-red/10"
          title="Out of Stock"
          description={
            outOfStockFabric
              ? `${outOfStockFabric} has no cloth left in this colour.`
              : "This colour has no cloth left."
          }
          onClose={() => setShowLeaveConfirm(false)}
          actions={
            <>
              <ModalButton
                variant="ghost"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Scan another QR
              </ModalButton>

              <ModalButton
                variant="primary"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  router.push(`${basePath}/${id}`);
                }}
              >
                Back to Orders
              </ModalButton>
            </>
          }
        >
          <div className="rounded-control border border-brand-red/20 bg-brand-red/10 p-3">
            <p className="text-sm font-medium text-brand-red">
              Continue adding other fabrics?
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ScannerPage;

