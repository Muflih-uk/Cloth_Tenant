import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "app-focus h-12 min-h-12 w-full min-w-0 rounded-control border border-app-line bg-app-card px-3.5 py-2 text-[16px] font-medium text-app-ink shadow-none outline-none transition-colors selection:bg-brand-blue/20 selection:text-app-ink placeholder:text-app-subtle hover:border-app-line disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        "file:mr-3 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-app-ink",
        "aria-invalid:border-brand-red aria-invalid:ring-2 aria-invalid:ring-brand-red/15",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
