"use client";

import { PackagePlus } from "lucide-react";

import { ImagePreview } from "@/components/pages/ImagePreview";

interface ProductImageProps {
  image: string | null | undefined;
  alt: string;
}

export default function ProductImage({ image, alt }: ProductImageProps) {
  return (
    <div className="app-card relative mb-6 aspect-square overflow-hidden p-0">
      {image ? (
        <ImagePreview src={image} alt={alt} />
      ) : (
        <div className="flex size-full items-center justify-center bg-app-soft">
          <PackagePlus
            size={64}
            className="text-app-subtle"
            aria-hidden="true"
          />
        </div>
      )}
      <div className="absolute top-4 right-4 rounded-control border border-app-line/50 bg-app-card/90 px-3 py-2 shadow-sm backdrop-blur-md">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-navy">
          Live Preview
        </span>
      </div>
    </div>
  );
}
