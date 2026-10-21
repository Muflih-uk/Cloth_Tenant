import Image from "next/image";

export function AuthBranding() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg">
        <Image
          src="/brand-logo.png"
          alt="R JOGHANI logo"
          width={56}
          height={56}
          className="rounded-2xl"
          priority
        />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--color-heading)] mb-0">
          R JOGHANI
        </h1>
        <p className="text-[11px] text-[var(--color-text)] uppercase tracking-widest font-medium">
          Order Management
        </p>
      </div>
    </div>
  );
}
