"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface ResourceHeaderProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export function ResourceHeader({
  title,
  description,
  backHref = "/resources",
  backLabel = " resources",
  searchPlaceholder = "search...",
  onSearch,
  searchQuery = "",
}: ResourceHeaderProps) {
  const [internalSearch, setInternalSearch] = useState(searchQuery);

  const handleSearch = (value: string) => {
    setInternalSearch(value);
    onSearch?.(value);
  };

  return (
    <div className="mb-8">
      {/* Back Link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{backLabel}</span>
      </Link>

      {/* Title & Description */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>

        {/* Search Box */}
        {onSearch && (
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-4 pr-10 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400">
              <Search className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
