// 占位简化版:受控原生 <select>;不引 cva/radix,零业务逻辑,MVP 可用性优先
// B11-04a:为 admin 表单原生 <select> 50 处迁移提供规范件（消解 DEF-011-07）
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

// 原生 <select size> 是"多选可见行数"（number），语义与本组件的 scale 变体不同；
// 沿用 shadcn 惯例 Omit 掉原生 size,把 `size` 名字让给 scale 三档（sm/md/lg）。
// 迁移方若确需行数,改用 `multiple` + className 覆写高度即可。
export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
}

// 基线契约（与 Button/Input 一致）：
// - 焦点：focus-visible:ring-2 ring-[var(--ring)]（N6 悬停可读性铁律：不叠实心底，保持 --background 面板）
// - 禁用：disabled:pointer-events-none disabled:opacity-50
// - 错误：invalid → aria-invalid=true + border-[var(--danger)]（同 Input 的 a11y 映射）
// - 尺寸：sm/md/lg 三档，与 Button 同 scale
const sizeCls: Record<NonNullable<SelectProps["size"]>, string> = {
  sm: "h-8 px-2 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-4 text-base",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, size = "md", children, ...rest }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-md border bg-[var(--background)] outline-none transition-colors focus-visible:ring-2 ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        invalid ? "border-[var(--danger)]" : "border-[var(--border)]",
        sizeCls[size],
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
