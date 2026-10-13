"use client";

import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "h-10 w-full rounded-md bg-white px-3 text-sm text-black ring-1 ring-black/10",
        "placeholder:text-black/40",
        "transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
        className
      )}
    />
  );
}
