"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import ListCustomer from "@/components/pages/ListCustomer";
import Button from "@/components/ui/app/Button";
import { useBackButton } from "@/util/useBackButton";

export default function NewOrder() {
  const router = useRouter();

  useBackButton({
    onBack: () => {
      router.push("/agent");
    },
  });

  return (
    <div className="min-h-screen bg-app-bg pb-32">
      <header className="sticky top-0 z-10 border-b border-app-line/70 bg-app-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/agent")}
            aria-label="Back to dashboard"
            className="-ml-2 shrink-0"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-xl font-extrabold leading-tight text-app-ink">
              Create Order
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
              Step 1: Select Customer
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl">
        <ListCustomer />
      </main>
    </div>
  );
}
