// 占位简化版:受控原生输入框透传,零业务逻辑
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, ...rest }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9 w-full rounded-md border bg-[var(--background)] px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-2 ring-[var(--ring)]",
        invalid ? "border-[var(--danger)]" : "border-[var(--border)]",
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = "Input";