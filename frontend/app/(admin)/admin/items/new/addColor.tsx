"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Button from "@/components/ui/app/Button";
import CropModal from "./cropModal";
import CommonDetailsBadge from "./commonDetailsBadge";
import { ColorVariant, FabricDetails } from "@/types/item";
import { formatMeters } from "@/types/item";
import { Modal, ModalButton } from "@/components/ui/custom/Modals";
import { normalizeImageFile } from "@/lib/image-utils";
import ReceiveRollsDialog from "@/components/items/receiveRollsDialog";
import { Package, Plus } from "lucide-react";

interface Props {
  initial: ColorVariant;
  common: FabricDetails;
  isEdit: boolean;
  variantIndex: number; // for the "Colour #N" header label
  onSave: (v: ColorVariant) => void;
  onBack: () => void;
}

/**
 * Opening stock initializes order stock; optional named rolls initialize
 * on-hand stock independently.
 */
export default function Step2AddColor({
  initial,
  common,
  isEdit,
  variantIndex,
  onSave,
  onBack,
}: Props) {
  const [variant, setVariant] = useState<ColorVariant>({ ...initial });
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState(initial.stockMeters || "0");
  const [stockError, setStockError] = useState<string | null>(null);
  const [rollsOpen, setRollsOpen] = useState(false);

  const rolls = variant.rolls ?? [];
  const rollTotal = rolls.reduce((sum, roll) => {
    const metres = Number(roll.meters);
    return sum + (Number.isFinite(metres) ? metres : 0);
  }, 0);
  const hasRolls = rolls.length > 0;
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  const isMobile =
    typeof window !== "undefined" &&
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const set = <K extends keyof ColorVariant>(key: K, val: ColorVariant[K]) =>
    setVariant((v) => ({ ...v, [key]: val }));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const normalisedFile = await normalizeImageFile(f);
    setCropSrc(URL.createObjectURL(normalisedFile));
    e.target.value = "";
  };

  const handleCropDone = async (file: File) => {
    setVariant((v) => ({
      ...v,
      image: file,
      imagePreview: URL.createObjectURL(file),
    }));
    setCropSrc(null);
  };

  const handleStockChange = (raw: string) => {
    setStockInput(raw);
    set("stockMeters", raw);
    if (stockError) setStockError(null);
  };

  const handleStockBlur = () => {
    const metres = Number(stockInput);
    if (stockInput === "" || Number.isNaN(metres) || metres < 0) {
      setStockError("Enter opening stock, zero or more.");
      setStockInput("0");
      set("stockMeters", "0");
    }
  };

  const handleSave = () => {
    const metres = Number(stockInput);
    if (stockInput === "" || Number.isNaN(metres) || metres < 0) {
      setStockError("Enter opening stock, zero or more.");
      return;
    }
    onSave({ ...variant, stockMeters: stockInput });
  };

  const handlePickerOpen = () => {
    if (!isMobile) {
      galleryRef.current?.click();
    } else {
      setShowPicker(true);
    }
  };

  return (
    <>
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onConfirm={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}

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
              {isEdit ? "Edit colour" : "Step 2 of 2"}
            </p>
            <h1 className="truncate text-xl font-bold leading-tight text-app-ink">
              Colour #{variantIndex}
            </h1>
          </div>
        </div>

        <CommonDetailsBadge common={common} />

        <div className="mt-4 flex-1 rounded-card border border-app-line bg-app-card p-4 sm:p-5">
          <div className="space-y-5">
            <Field>
              <FieldLabel>Colour photo</FieldLabel>
              <button
                type="button"
                onClick={handlePickerOpen}
                className="app-focus relative flex w-full items-center justify-center overflow-hidden rounded-control border-2 border-dashed border-app-line bg-app-soft/60 transition-colors hover:border-brand-navy hover:bg-brand-navy/5"
                style={{ height: variant.imagePreview ? 220 : 120 }}
              >
                {variant.imagePreview ? (
                  <Image
                    src={variant.imagePreview}
                    fill
                    className="object-cover"
                    alt="preview"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <ImagePlus className="size-6 text-app-subtle" aria-hidden="true" />
                    <span className="text-sm text-app-muted">
                      Tap to upload &amp; crop
                    </span>
                  </div>
                )}
              </button>
              {variant.imagePreview && (
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePickerOpen}
                    className="app-focus inline-flex h-11 items-center rounded-control px-2 text-xs font-semibold text-brand-navy hover:bg-app-soft"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setVariant((v) => ({
                        ...v,
                        image: null,
                        imagePreview: null,
                      }))
                    }
                    className="app-focus inline-flex h-11 items-center gap-1 rounded-control px-2 text-xs font-semibold text-brand-red hover:bg-brand-red/5"
                  >
                    <X className="size-3.5" aria-hidden="true" /> Remove
                  </button>
                </div>
              )}
            </Field>

            <input
              ref={galleryRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={handleFile}
            />

            <input
              ref={cameraRef}
              type="file"
              accept="image/*,.heic,.heif"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />

            {/* Colour number — auto-assigned, editable here and on the edit page */}
            <Field>
              <FieldLabel>Colour number</FieldLabel>
              <Input
                placeholder="e.g. 1"
                value={variant.displayOrder}
                onChange={(e) => set("displayOrder", e.target.value)}
              />
            </Field>

            {/* Opening stock */}
            <Field>
              <FieldLabel>Opening stock (available-to-order base)</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                value={stockInput}
                placeholder="0"
                onChange={(e) => handleStockChange(e.target.value)}
                onBlur={handleStockBlur}
                onFocus={(e) => e.target.select()}
                aria-invalid={Boolean(stockError)}
              />
              {stockError ? (
                <p className="mt-1.5 text-xs font-medium text-brand-red">
                  {stockError}
                </p>
              ) : hasRolls ? (
                // Opening stock and physical rolls initialize separate quantities.
                <p className="mt-1.5 text-xs leading-relaxed text-app-muted">
                  Available to order starts at {formatMeters(stockInput)} m.
                  On-hand rolls are {formatMeters(String(rollTotal))} m; the two
                  figures are managed separately.
                </p>
              ) : (
                <p className="mt-1.5 text-xs leading-relaxed text-app-muted">
                  Available to order starts at {formatMeters(stockInput)} m. For
                  a roll-less colour, physical stock also starts at this figure.
                </p>
              )}
            </Field>

            {/* Physical rolls -- optional. Reuses the receive-delivery dialog so the
                rows, the running total and the validation are the same ones used
                for a colour that already exists. */}
            <Field>
              <FieldLabel>Physical rolls</FieldLabel>
              {hasRolls ? (
                <div className="rounded-control border border-brand-navy/20 bg-brand-navy/5 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Package
                      className="mt-0.5 size-4 shrink-0 text-brand-navy"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-app-ink">
                        {rolls.length} roll{rolls.length === 1 ? "" : "s"} ·{" "}
                        {formatMeters(String(rollTotal))} m total
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {rolls.map((roll, i) => (
                          <li
                            key={i}
                            className="truncate text-[11px] text-app-muted"
                          >
                            Roll {i + 1}: {formatMeters(roll.meters)} m
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setRollsOpen(true)}
                        className="app-focus mt-1 inline-flex h-11 items-center text-xs font-semibold text-brand-navy hover:underline"
                      >
                        Edit rolls
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRollsOpen(true)}
                  className="app-focus flex h-14 w-full items-center justify-center gap-2 rounded-control border-2 border-dashed border-app-line text-xs font-semibold text-app-muted transition-colors hover:border-brand-navy hover:bg-brand-navy/5 hover:text-brand-navy"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add the rolls this colour arrives on
                </button>
              )}
              <p className="mt-1.5 text-xs leading-relaxed text-app-muted">
                Optional. Rolls initialize on-hand stock only. The opening stock
                above initializes available-to-order stock and is not replaced
                by rolls.
              </p>
            </Field>
          </div>
        </div>

        <div className="mt-auto pt-6 pb-2">
          <Button size="lg" fullWidth onClick={handleSave}>
            {isEdit ? "Save Changes" : "Add Colour"}
          </Button>
        </div>
      </div>

      {/* The same dialog the rolls panel uses on an existing colour, so the rows,
          running total and validation are shared rather than reinvented. */}
      <ReceiveRollsDialog
        open={rollsOpen}
        onClose={() => setRollsOpen(false)}
        onConfirm={async (drafts) => {
          set("rolls", drafts);
        }}
        // Reseeded from what is already typed in, so reopening the dialog to
        // correct the third roll does not start from a blank sheet.
        initialRolls={rolls}
        label={`${common.name} — ${variant.displayOrder || `Colour #${variantIndex}`}`}
      />

      {showPicker && (
        <Modal
          icon={<ImagePlus className="size-5 text-brand-navy" />}
          iconBg="bg-brand-navy/10"
          title="Select Image Source"
          description="Choose how you want to add the colour photo."
          onClose={() => setShowPicker(false)}
          actions={
            <div className="flex w-full gap-2">
              <ModalButton
                variant="ghost"
                onClick={() => {
                  setShowPicker(false);
                  cameraRef.current?.click();
                }}
              >
                Open Camera
              </ModalButton>
              <ModalButton
                variant="ghost"
                onClick={() => {
                  setShowPicker(false);
                  galleryRef.current?.click();
                }}
              >
                Choose from Gallery
              </ModalButton>
            </div>
          }
        />
      )}
    </>
  );
}
