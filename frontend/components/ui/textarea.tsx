import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "app-focus flex min-h-28 w-full rounded-control border border-app-line bg-app-card px-3.5 py-3 text-[16px] font-medium text-app-ink shadow-none outline-none transition-colors field-sizing-content placeholder:text-app-subtle disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        "aria-invalid:border-brand-red aria-invalid:ring-2 aria-invalid:ring-brand-red/15",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
