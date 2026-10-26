"use client";

interface ProductInfoProps {
  name: string | undefined;
}

export default function ProductInfo({ name }: ProductInfoProps) {
  return (
    <div className="mb-6">
      <h2 className="mb-1 text-2xl font-extrabold text-app-ink">{name}</h2>
      <p className="text-[10px] font-semibold uppercase leading-tight tracking-widest text-app-muted">
        Premium Collection
      </p>
    </div>
  );
}
