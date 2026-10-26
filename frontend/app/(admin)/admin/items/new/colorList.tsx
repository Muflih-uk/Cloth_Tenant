"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Button from "@/components/ui/app/Button";
import EmptyState from "@/components/ui/EmptyState";
import ColorCard from "./colorCard";
import CommonDetailsBadge from "./commonDetailsBadge";
import type { ColorVariant, FabricDetails } from "@/types/item";

interface Props {
  common: FabricDetails;
  variants: ColorVariant[];
  loading: boolean;
  onEditCommon: () => void;
  onAddColor: () => void;
  onEditColor: (id: string) => void;
  onDeleteColor: (id: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export default function ColorListScreen({
  common,
  variants,
  loading,
  onEditCommon,
  onAddColor,
  onEditColor,
  onDeleteColor,
  onSubmit,
  onBack,
}: Props) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col bg-app-bg px-4 py-4 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="app-focus flex size-11 shrink-0 items-center justify-center rounded-full bg-app-soft text-app-muted transition-colors hover:bg-brand-navy hover:text-white"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-app-subtle">
            Step 2 of 2
          </p>
          <h1 className="truncate text-xl font-bold leading-tight text-app-ink">
            Colors
          </h1>
        </div>
      </div>

      {/* Common details — read-only with edit shortcut */}
      <CommonDetailsBadge common={common} onEdit={onEditCommon} />

      {/* Color list */}
      <div className="mt-4 flex-1 space-y-3">
        {variants.length === 0 && (
          <EmptyState
            icon={<Plus className="size-5" aria-hidden="true" />}
            title="No colors added yet"
            description="Add your first colour variant to continue."
          />
        )}

        {variants.map((v, i) => (
          <ColorCard
            key={v.id}
            variant={v}
            index={i}
            isOnly={variants.length === 1}
            onEdit={() => onEditColor(v.id)}
            onDelete={() => onDeleteColor(v.id)}
          />
        ))}

        <button
          type="button"
          onClick={onAddColor}
          className="app-focus flex h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-dashed border-app-line text-sm font-semibold text-app-muted transition-colors hover:border-brand-navy hover:bg-brand-navy/5 hover:text-brand-navy"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add New Color
        </button>
      </div>

      <div className="mt-auto pt-6 pb-2">
        <Button
          size="lg"
          fullWidth
          loading={loading}
          loadingText="Creating…"
          disabled={variants.length === 0}
          onClick={onSubmit}
        >
          Create Fabric
        </Button>
      </div>
    </div>
  );
}
