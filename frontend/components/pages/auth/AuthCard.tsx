import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  shake?: boolean;
  onShakeEnd?: () => void;
}

export function AuthCard({
  shake,
  onShakeEnd,
  children,
  className,
  ...props
}: Props) {
  return (
    <div
      className={cn(
        "w-full max-w-sm bg-white shadow-xl rounded-2xl px-4 py-6 flex flex-col gap-5 sm:rounded-3xl sm:px-8 sm:py-10 sm:gap-8",
        shake && "animate-shake",
        className,
      )}
      onAnimationEnd={onShakeEnd}
      {...props}
    >
      {children}
    </div>
  );
}
