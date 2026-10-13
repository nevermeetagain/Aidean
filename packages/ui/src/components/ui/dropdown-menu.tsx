"use client";
// 占位简化版:基于原生 details/summary,免手写外部点击逻辑;不支持子菜单与多级
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface DropdownItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect?: (value: string) => void;
  align?: "start" | "end";
  className?: string;
}

export function DropdownMenu({ trigger, items, onSelect, align = "start", className }: DropdownMenuProps) {
  return (
    <details className={cn("relative inline-block", className)}>
      <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        {trigger}
      </summary>
      <ul
        className={cn(
          "absolute z-20 mt-1 min-w-[8rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md",
          align === "end" ? "right-0" : "left-0",
        )}
      >
        {items.map((it) => (
          <li key={it.value}>
            <button
              type="button"
              disabled={it.disabled}
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                onSelect?.(it.value);
              }}
              className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--muted)] disabled:opacity-50"
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}