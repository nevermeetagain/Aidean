// 占位简化版:纯展示徽标
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "destructive";
  children?: ReactNode;
}

const variantCls: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  secondary: "bg-[var(--muted)] text-[var(--foreground)]",
  success: "bg-emerald-100 text-emerald-700",
  destructive: "bg-red-100 text-red-700",
};

export function Badge({ className, variant = "default", ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantCls[variant],
        className,
      )}
      {...rest}
    />
  );
}