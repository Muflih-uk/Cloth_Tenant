import { Spinner } from "./spinner";

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Loading…" }: PageLoadingProps) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-app-muted"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-8 text-brand-navy" />
      {text && (
        <p className="animate-pulse text-sm font-medium text-app-muted">
          {text}
        </p>
      )}
    </div>
  );
}
