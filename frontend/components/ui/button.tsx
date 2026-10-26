import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "app-focus inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-navy text-white hover:bg-brand-navy/90",
        destructive:
          "bg-brand-red text-white hover:bg-brand-red/90 focus-visible:ring-destructive/20",
        outline:
          "border border-app-line bg-app-card text-app-ink hover:bg-app-soft",
        secondary:
          "bg-app-soft text-app-ink hover:bg-app-line/60",
        ghost: "text-app-muted hover:bg-app-soft hover:text-app-ink",
        link: "text-brand-navy underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        xs: "h-11 gap-1.5 rounded-control px-3 text-xs has-[>svg]:px-2.5",
        sm: "h-11 gap-1.5 rounded-control px-3.5 has-[>svg]:px-3",
        lg: "h-12 rounded-button px-6 has-[>svg]:px-4",
        icon: "size-11",
        "icon-xs": "size-11 rounded-control",
        "icon-sm": "size-11 rounded-control",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
