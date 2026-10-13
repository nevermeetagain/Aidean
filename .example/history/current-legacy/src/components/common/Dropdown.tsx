"use client";

import * as React from "react";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type DropdownItem = {
  label: string;
  href: string;
  description?: string;
};

export function Dropdown({
  label,
  items,
  className
}: {
  label: string;
  items: DropdownItem[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  }, []);

  React.useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!open) return;
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-black/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      >
        <span>{label}</span>
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute left-0 top-full z-50 mt-2 min-w-56 overflow-hidden rounded border border-black/10 bg-[rgb(var(--bg))] shadow-sm"
          )}
          onKeyDown={onKeyDown}
        >
          <div className="py-1">
            {items.map((item) => (
              <Link
                key={item.href}
                role="menuitem"
                href={item.href}
                className={cn(
                  "block px-3 py-2 text-sm hover:bg-black/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                )}
                onClick={() => setOpen(false)}
              >
                <div className="font-medium">{item.label}</div>
                {item.description ? (
                  <div className="text-xs text-black/60">{item.description}</div>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

