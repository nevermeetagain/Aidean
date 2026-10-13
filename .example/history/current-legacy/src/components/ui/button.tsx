"use client";

import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "ghost" | "subtle";
type Size = "sm" | "md";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "px-2.5 py-1.5 text-xs",
        variant === "primary" &&
          "bg-black text-white hover:bg-black/90 active:bg-black/85",
        variant === "ghost" &&
          "bg-transparent text-black hover:bg-black/5 active:bg-black/10",
        variant === "subtle" &&
          "bg-white text-black ring-1 ring-black/10 hover:bg-black/[0.03] active:bg-black/[0.06]",
        className
      )}
    />
  );
}

