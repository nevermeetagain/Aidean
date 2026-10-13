"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import { VersionToggle } from "./VersionToggle";
import { DEMO_VENDORS, DEMO_TAGS, type DemoVendor } from "@/lib/demoModels";

type SortKey = "score" | "contextK" | "speed" | "price";

export function DemoFilterBar({
  searchQuery,
  onSearchChange,
  activeVendor,
  onVendorChange,
  activeTags,
  onTagsChange,
  sortKey,
  onSortChange,
  searchInputId,
  sortSelectId,
  vendorMode = "pills",
  vendorSelectId,
  showClearFilterButton = false,
  onClearFilters,
  variant = "light",
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  activeVendor: DemoVendor | "all";
  onVendorChange: (v: DemoVendor | "all") => void;
  activeTags: string[];
  onTagsChange: (tags: string[]) => void;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  searchInputId?: string;
  sortSelectId?: string;
  vendorMode?: "pills" | "select";
  vendorSelectId?: string;
  showClearFilterButton?: boolean;
  onClearFilters?: () => void;
  variant?: "light" | "dark";
}) {
  const [version, setVersion] = useState<"pro" | "app">("pro");
  const isDark = variant === "dark";

  return (
    <div className={clsx("rounded-xl p-4", isDark ? "bg-slate-800 ring-1 ring-slate-700" : "bg-white ring-1 ring-slate-200 shadow-sm")}>
      {/* Row 1: Version toggle + Search + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <VersionToggle version={version} onChange={setVersion} variant={variant} />

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索模型 / 厂商 / 标签"
            className={clsx(
              "h-9 w-full rounded-lg px-3 pr-9 text-sm focus:outline-none focus:ring-2",
              isDark
                ? "bg-slate-700 text-slate-100 placeholder:text-slate-500 border border-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20"
                : "bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
            )}
            aria-label="搜索"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400">
            <Search className="h-4 w-4" />
          </div>
        </div>

        <div className="ml-auto">
          <select
            id={sortSelectId}
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className={clsx(
              "h-9 rounded-lg px-3 text-xs font-medium focus:outline-none focus:ring-2",
              isDark
                ? "bg-slate-700 text-slate-200 border border-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20"
                : "bg-white text-gray-700 border border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
            )}
            aria-label="排序方式"
          >
            <option value="score">综合评分</option>
            <option value="contextK">上下文长度</option>
            <option value="speed">响应速度</option>
            <option value="price">价格</option>
          </select>
        </div>
      </div>

      {/* Row 2: Vendor pills */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {vendorMode === "select" ? (
          <div className="flex items-center gap-2">
            <select
              id={vendorSelectId}
              value={activeVendor}
              onChange={(e) => onVendorChange(e.target.value as DemoVendor | "all")}
              className={clsx(
                "h-9 rounded-lg px-3 text-xs font-medium focus:outline-none focus:ring-2",
                isDark
                  ? "bg-slate-700 text-slate-200 border border-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20"
                  : "bg-white text-gray-700 border border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              )}
              aria-label="厂商"
            >
              <option value="all">全部</option>
              {DEMO_VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {showClearFilterButton ? (
              <button
                type="button"
                onClick={onClearFilters}
                className={clsx(
                  "h-9 rounded-lg px-3 text-xs font-semibold transition-colors",
                  isDark
                    ? "bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                )}
              >
                清空筛选
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <PillButton
              active={activeVendor === "all"}
              onClick={() => onVendorChange("all")}
              variant={variant}
            >
              全部
            </PillButton>
            {DEMO_VENDORS.map((v) => (
              <PillButton
                key={v}
                active={activeVendor === "all" || activeVendor === v}
                onClick={() => onVendorChange(v)}
                variant={variant}
              >
                {v}
              </PillButton>
            ))}
          </>
        )}
      </div>

      {/* Row 3: Tags */}
      <div className="mt-2 flex flex-wrap gap-2">
        {DEMO_TAGS.map((t) => {
          const active = activeTags.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() =>
                onTagsChange(
                  active ? activeTags.filter((x) => x !== t) : [...activeTags, t]
                )
              }
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                active
                  ? isDark
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-blue-600 text-white shadow-sm"
                  : isDark
                    ? "bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
              aria-pressed={active}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
  variant = "light",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-all",
        active
          ? isDark
            ? "bg-emerald-500 text-white shadow-sm"
            : "bg-blue-600 text-white shadow-sm"
          : isDark
            ? "bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
