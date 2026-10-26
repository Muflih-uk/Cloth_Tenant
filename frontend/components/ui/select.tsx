"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Context ──────────────────────────────────────────────────────────────────

interface SelectContextValue {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

const useSelect = () => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select compound component used outside <Select>");
  return ctx;
};

// ── Select (Root) ─────────────────────────────────────────────────────────────

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleValueChange = (val: string) => {
    if (!isControlled) setInternalValue(val);
    onValueChange?.(val);
    setOpen(false);
  };

  // Close on outside click
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      <div ref={ref} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

// ── SelectGroup ───────────────────────────────────────────────────────────────

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <div role="group">{children}</div>;
}

// ── SelectValue ───────────────────────────────────────────────────────────────

interface SelectValueProps {
  placeholder?: string;
}

function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelect();
  // The displayed label is provided by SelectTrigger via context — see below
  return (
    <span className={cn("truncate", !value && "text-muted-foreground")}>
      {value || placeholder}
    </span>
  );
}

// ── Label registry — lets SelectValue show the item's label not its value ─────

const LabelContext = React.createContext<Record<string, string>>({});

// ── SelectTrigger ─────────────────────────────────────────────────────────────

interface SelectTriggerProps {
  className?: string;
  size?: "sm" | "default";
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
}

function SelectTrigger({
  className,
  size = "default",
  placeholder,
  disabled,
}: SelectTriggerProps) {
  const { open, setOpen, value } = useSelect();
  const labels = React.useContext(LabelContext);

  const displayLabel = value ? (labels[value] ?? value) : placeholder;

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      disabled={disabled}
      className={cn(
        "app-focus flex w-full items-center justify-between gap-2 rounded-control border border-app-line bg-app-card px-3.5 py-2 text-sm font-medium text-app-ink shadow-none outline-none transition-colors hover:border-app-line",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" ? "h-12 min-h-12" : "h-11 min-h-11",
        !value && "text-app-subtle",
        className,
      )}
    >
      <span className="truncate">{displayLabel}</span>
      <ChevronDownIcon
        className={cn(
          "size-4 flex-shrink-0 text-app-muted transition-transform",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

// ── SelectContent ─────────────────────────────────────────────────────────────

interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

function SelectContent({ className, children }: SelectContentProps) {
  const { open } = useSelect();
  const labelMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const c = child as React.ReactElement<SelectItemProps>;
        if (c.props.value && c.props.children) {
          map[c.props.value] = String(c.props.children);
        }
      }
    });
    return map;
  }, [children]);

  if (!open) return null;

  return (
    <LabelContext.Provider value={labelMap}>
      <div
        className={cn(
          "absolute z-50 mt-1.5 w-full overflow-hidden rounded-control border border-app-line bg-app-card text-app-ink shadow-float",
          "animate-in fade-in-0 zoom-in-95",
          "max-h-60 overflow-y-auto",
          className,
        )}
      >
        <div className="p-1">{children}</div>
      </div>
    </LabelContext.Provider>
  );
}

// ── SelectLabel ───────────────────────────────────────────────────────────────

function SelectLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}>
      {children}
    </div>
  );
}

// ── SelectItem ────────────────────────────────────────────────────────────────

interface SelectItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function SelectItem({ value, className, children, disabled }: SelectItemProps) {
  const { value: selectedValue, onValueChange } = useSelect();
  const isSelected = selectedValue === value;

  return (
    <div
      role="option"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      aria-disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onValueChange(value);
        }
      }}
      className={cn(
        "app-focus relative flex min-h-11 w-full cursor-pointer select-none items-center gap-2 rounded-control py-2 pl-3 pr-9 text-sm font-medium outline-none",
        "hover:bg-app-soft",
        "focus:bg-app-soft",
        isSelected && "bg-app-soft text-app-ink",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {isSelected && (
        <span className="absolute right-3 flex size-4 items-center justify-center text-brand-navy">
          <CheckIcon className="size-4" />
        </span>
      )}
      {children}
    </div>
  );
}

// ── SelectSeparator ───────────────────────────────────────────────────────────

function SelectSeparator({ className }: { className?: string }) {
  return <div className={cn("bg-border -mx-1 my-1 h-px", className)} />;
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
