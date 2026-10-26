"use client";

import { ArrowLeft } from "lucide-react";

import Button from "@/components/ui/app/Button";

interface ProductHeaderProps {
  isEditMode: boolean;
  onBack: () => void;
}

export default function ProductHeader({ isEditMode, onBack }: ProductHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-app-line/70 bg-app-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back to order"
          className="-ml-2 shrink-0"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-xl font-extrabold leading-tight text-app-ink">
            Item Details
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
            {isEditMode ? "Editing Item" : "Step 4: Configure Item"}
          </p>
        </div>
      </div>
    </header>
  );
}
