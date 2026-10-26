import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("app-skeleton h-4 w-full", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("app-card space-y-3 p-4", className)} aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[68px] items-center gap-3 rounded-card border border-app-line bg-app-card p-3.5",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}
