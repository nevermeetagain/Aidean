// 占位简化版:受控原生 <textarea>;不引 cva/radix,零业务逻辑,MVP 可用性优先
// B11-04a:为 admin 表单原生 <textarea> 27 处迁移提供规范件（消解 DEF-011-07）
import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

// 基线契约（与 Input 一致）：
// - 焦点：focus-visible:ring-2 ring-[var(--ring)]
// - 禁用：disabled:pointer-events-none disabled:opacity-50
// - 错误：invalid → aria-invalid=true + border-[var(--danger)]
// - 占位符：placeholder:text-slate-400（同 Input）
// 行数默认 rows=3；调用方可覆写 rows/maxLength/onChange 等原生属性
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, rows = 3, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-2 ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        invalid ? "border-[var(--danger)]" : "border-[var(--border)]",
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = "Textarea";
