"use client";

import { ArrowLeft, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import ScannerPage from "@/components/pages/ScannerPage";
import Button from "@/components/ui/app/Button";
import { useEditGuard } from "@/lib/useEditGuard";
import { useBackButton } from "@/util/useBackButton";

export default function EditOrderScannerPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { handleBack } = useEditGuard(id);

  useBackButton({
    onBack: () => {
      handleBack();
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-app-bg">
      <header className="sticky top-0 z-10 border-b border-app-line/70 bg-app-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Back to order"
            className="-ml-2 shrink-0"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate text-xl font-extrabold leading-tight text-app-ink">
              Scan Item
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
              Edit Mode
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/agent/order/edit/${id}`)}
            aria-label="Close scanner"
            className="shrink-0 hover:bg-brand-red/10 hover:text-brand-red"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10">
        <ScannerPage id={id} basePath="/agent/order/edit" />
      </main>
    </div>
  );
}
