"use client";

import SearchInput from "./app/SearchInput";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  isLoading = false,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      isLoading={isLoading}
      placeholder={placeholder}
    />
  );
}
