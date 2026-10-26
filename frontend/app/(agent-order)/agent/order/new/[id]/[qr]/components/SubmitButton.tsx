"use client";

import { PackagePlus } from "lucide-react";

import Button from "@/components/ui/app/Button";

interface SubmitButtonProps {
  isEditMode: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function SubmitButton({
  isEditMode,
  loading,
  disabled,
  onClick,
}: SubmitButtonProps) {
  return (
    <Button
      size="lg"
      fullWidth
      loading={loading}
      disabled={loading || disabled}
      onClick={onClick}
      className="mb-6"
    >
      <PackagePlus className="size-4" aria-hidden="true" />
      {isEditMode ? "Update Quantity" : "Add to Order"}
    </Button>
  );
}
