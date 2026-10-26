import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
type ButtonSize = "md" | "lg" | "icon";

export interface AppButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-navy text-white hover:bg-brand-navy/90",
  secondary:
    "border border-app-line bg-app-card text-app-ink hover:bg-app-soft",
  destructive: "bg-brand-red text-white hover:bg-brand-red/90",
  ghost: "bg-transparent text-app-muted hover:bg-app-soft hover:text-app-ink",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-11 min-h-11 px-4",
  lg: "h-12 min-h-12 px-5",
  icon: "h-11 min-h-11 w-11 p-0",
};

export default function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  fullWidth = false,
  disabled,
  children,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "app-focus inline-flex shrink-0 items-center justify-center gap-2 rounded-button text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && (
        <Loader2
          className="size-4 animate-spin"
          aria-hidden="true"
        />
      )}
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
