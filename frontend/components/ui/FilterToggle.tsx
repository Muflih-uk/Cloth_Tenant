"use client";

import { Filter } from "lucide-react";

interface FilterToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function FilterToggle({ isOpen, onToggle }: FilterToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="app-focus flex h-12 min-h-12 shrink-0 items-center gap-2 rounded-button border border-app-line bg-app-card px-3 text-xs font-semibold text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
    >
      <span>{isOpen ? "Hide filters" : "Show filters"}</span>
      <Filter className="size-4" aria-hidden="true" />
    </button>
  );
}
