"use client";

import { useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, Camera } from "lucide-react";

import Button from "@/components/ui/app/Button";
import { Input } from "@/components/ui/input";

interface QRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qr: string) => void;
}

const SCAN_COOLDOWN_MS = 1500;

export default function QRScanModal({
  isOpen,
  onClose,
  onScan,
}: QRScanModalProps) {
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const lastScanRef = useRef({ code: "", at: 0 });

  if (!isOpen) return null;

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();

      // Low, punchy fundamental tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "square"; // fuller/heavier than sine
      osc1.frequency.value = 440; // lower pitch = heavier feel
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Slight higher layer for "click" presence
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.value = 660;
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error("Beep failed:", e);
    }
  };

  const acceptScan = (rawValue: string) => {
    const now = Date.now();
    if (
      rawValue === lastScanRef.current.code &&
      now - lastScanRef.current.at < SCAN_COOLDOWN_MS
    ) {
      return;
    }
    lastScanRef.current = { code: rawValue, at: now };
    playBeep();
    onScan(rawValue);
  };

  const handleScan = (data: { rawValue: string }[]) => {
    if (data[0]?.rawValue) {
      acceptScan(data[0].rawValue);
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      acceptScan(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-card border border-app-line bg-app-card shadow-float">
        <div className="flex items-center justify-between border-b border-app-line p-3">
          <div className="flex min-w-0 items-center gap-2">
            <Camera className="size-5 shrink-0 text-brand-navy" aria-hidden="true" />
            <span className="truncate font-bold text-app-ink">Scan QR Code</span>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
            aria-label="Close QR scanner"
            className="rounded-full"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="p-4">
          <div className="relative mb-4 aspect-square overflow-hidden rounded-control bg-brand-navy">
            <Scanner
              onScan={handleScan}
              constraints={{
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
              classNames={{
                container: "w-full h-full",
                video: "w-full h-full object-cover",
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            aria-expanded={showManualInput}
            className="app-focus flex h-11 w-full items-center justify-center text-sm font-medium text-app-muted transition-colors hover:text-brand-navy"
          >
            {showManualInput ? "Hide manual input" : "Or enter QR manually"}
          </button>

          {showManualInput && (
            <div className="mt-2 flex gap-2">
              <Input
                type="text"
                placeholder="Enter QR code..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                aria-label="QR code"
              />
              <Button
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
              >
                Go
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
