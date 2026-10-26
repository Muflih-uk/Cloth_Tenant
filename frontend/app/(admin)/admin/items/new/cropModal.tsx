"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, Check, Minus, Plus } from "lucide-react";
import { getCroppedFile, getFitFile } from "@/lib/crop-utils";
import Image from "next/image";
import Button from "@/components/ui/app/Button";

interface Props {
    src: string;
    onConfirm: (file: File) => void;
    onCancel: () => void;
}

const ASPECTS = [
    { label: "Full", value: null },
    { label: "1:1", value: 1 },
    { label: "3:4", value: 3 / 4 },
];

export default function CropModal({ src, onConfirm, onCancel }: Props) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null,
    );
    const [aspect, setAspect] = useState<number | null>(null);

    const onCropComplete = useCallback((_: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleConfirm = async () => {
        if (aspect === null) {
            const file = await getFitFile(src);
            onConfirm(file);
            return;
        }
        if (!croppedAreaPixels) return;
        const file = await getCroppedFile(src, croppedAreaPixels);
        onConfirm(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-app-bg">
            <div className="flex flex-shrink-0 items-center justify-between px-4 pb-4 pt-12">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={onCancel}
                    aria-label="Cancel cropping"
                    className="rounded-full"
                >
                    <X className="size-5" aria-hidden="true" />
                </Button>
                <Button onClick={handleConfirm}>
                    <Check className="size-4" aria-hidden="true" />
                    Use Photo
                </Button>
            </div>

            <div className="relative min-h-0 w-full flex-1">
                {aspect === null ? (
                    <div className="relative flex h-full w-full items-center justify-center">
                        <Image
                            src={src}
                            alt="Preview"
                            fill
                            className="object-contain"
                        />
                    </div>
                ) : (
                    <Cropper
                        image={src}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        style={{
                            containerStyle: {
                                background: "var(--app-bg)",
                            },
                        }}
                    />
                )}
            </div>

            <div className="flex flex-col gap-3 border-t border-app-line bg-app-card px-6 py-6">
                {aspect !== null && (
                    <div className="flex items-center gap-2 py-1">
                        <button
                            type="button"
                            onClick={() =>
                                setZoom((z) =>
                                    Math.max(1, +(z - 0.1).toFixed(2)),
                                )
                            }
                            aria-label="Zoom out"
                            className="app-focus flex size-11 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
                        >
                            <Minus className="size-4" aria-hidden="true" />
                        </button>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            aria-label="Zoom"
                            className="h-1 flex-1 accent-brand-navy"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                setZoom((z) =>
                                    Math.min(3, +(z + 0.1).toFixed(2)),
                                )
                            }
                            aria-label="Zoom in"
                            className="app-focus flex size-11 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
                        >
                            <Plus className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-center gap-2">
                    {ASPECTS.map((a) => {
                        const selected = aspect === a.value;
                        return (
                            <button
                                key={a.label}
                                type="button"
                                onClick={() => setAspect(a.value)}
                                aria-pressed={selected}
                                className={`app-focus inline-flex h-11 min-w-16 items-center justify-center rounded-control px-4 text-sm font-semibold transition-colors ${
                                    selected
                                        ? "bg-brand-navy text-white"
                                        : "border border-app-line bg-app-soft text-app-muted hover:text-app-ink"
                                }`}
                            >
                                {a.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
