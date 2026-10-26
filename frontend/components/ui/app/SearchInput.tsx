"use client";

import { Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  ariaLabel?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  isLoading = false,
  ariaLabel = "Search",
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      {isLoading ? (
        <Loader2
          className="absolute left-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-app-muted"
          aria-hidden="true"
        />
      ) : (
        <Search
          className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-app-muted"
          aria-hidden="true"
        />
      )}
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="app-focus h-12 w-full rounded-button border border-app-line bg-app-card pl-11 pr-12 text-[16px] font-medium text-app-ink outline-none transition-colors placeholder:text-app-subtle hover:border-app-line sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="app-focus absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
