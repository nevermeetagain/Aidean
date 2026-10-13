"use client";
// 占位简化版:受控 Tabs(仅标签栏,面板切换交由消费方按 value 渲染)
import { cn } from "../../lib/cn";

export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("inline-flex items-center gap-1 rounded-md bg-[var(--muted)] p-1", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          disabled={it.disabled}
          onClick={() => onChange(it.value)}
          className={cn(
            "rounded px-3 py-1.5 text-sm transition-colors",
            value === it.value
              ? "bg-[var(--background)] font-medium shadow-sm"
              : "text-slate-500 hover:text-[var(--foreground)]",
            it.disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}