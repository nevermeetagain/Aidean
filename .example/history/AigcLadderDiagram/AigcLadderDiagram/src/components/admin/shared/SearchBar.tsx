"use client";

import { useState, FormEvent } from "react";
import { Search, X } from "lucide-react";
import { AdminButton } from "./AdminButton";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch: (value: string) => void;
  onClear?: () => void;
  loading?: boolean;
  width?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = "搜索...",
  value: controlledValue,
  onSearch,
  onClear,
  loading = false,
  width = "w-64",
  autoFocus = false,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue ?? internalValue;
  const setValue = controlledValue !== undefined ? undefined : setInternalValue;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  const handleClear = () => {
    if (setValue) {
      setValue("");
    }
    onClear?.();
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${width}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--admin-text-muted))]" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue?.(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-20 py-2 rounded-lg bg-[rgb(var(--admin-bg))] border border-[rgb(var(--admin-border))] text-sm text-[rgb(var(--admin-text-primary))] placeholder:text-[rgb(var(--admin-text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary-ring))] focus:border-transparent transition-all duration-200"
        />

        {/* 右侧按钮组 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-[rgb(var(--admin-text-muted))] hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-secondary))] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <AdminButton
            type="submit"
            variant="ghost"
            size="sm"
            isLoading={loading}
            className="h-7 px-2 text-xs"
          >
            搜索
          </AdminButton>
        </div>
      </div>
    </form>
  );
}
