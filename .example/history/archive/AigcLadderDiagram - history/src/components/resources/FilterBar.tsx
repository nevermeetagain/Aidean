"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterBarProps {
  categories: FilterOption[];
  selectedCategory?: string;
  onCategoryChange?: (value: string) => void;
  sortOptions?: FilterOption[];
  selectedSort?: string;
  onSortChange?: (value: string) => void;
  additionalFilters?: FilterOption[];
  selectedAdditional?: string;
  onAdditionalChange?: (value: string) => void;
  additionalLabel?: string;
}

export function FilterBar({
  categories,
  selectedCategory = "all",
  onCategoryChange,
  sortOptions,
  selectedSort,
  onSortChange,
  additionalFilters,
  selectedAdditional,
  onAdditionalChange,
  additionalLabel = "filter",
}: FilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onCategoryChange?.(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat.value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort Dropdown */}
      {sortOptions && onSortChange && (
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setSortOpen(!sortOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span>
              {sortOptions.find((s) => s.value === selectedSort)?.label || "sort"}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-gray-100 bg-white shadow-lg py-1 z-20">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.value);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedSort === opt.value
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Additional Filter Dropdown */}
      {additionalFilters && onAdditionalChange && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setAdditionalOpen(!additionalOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span>{additionalLabel}: </span>
            <span>
              {additionalFilters.find((f) => f.value === selectedAdditional)?.label || "all"}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${additionalOpen ? "rotate-180" : ""}`} />
          </button>
          {additionalOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-gray-100 bg-white shadow-lg py-1 z-20">
              {additionalFilters.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onAdditionalChange(opt.value);
                    setAdditionalOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedAdditional === opt.value
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
