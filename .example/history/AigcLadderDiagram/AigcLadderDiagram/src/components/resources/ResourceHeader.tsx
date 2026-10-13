"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

export interface ResourceHeaderProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  searchQuery?: string;
}

export function ResourceHeader({
  title,
  description,
  backHref = "/resources",
  backLabel = " resources",
  searchPlaceholder = "搜索...",
  onSearch,
  searchQuery = "",
}: ResourceHeaderProps) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div className="flex-1">
        {/* Back Link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </Link>

        {/* Title & Description */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      {/* Search Input */}
      {onSearch && (
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      )}
    </div>
  );
}

