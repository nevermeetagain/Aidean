// 占位简化版:受控原生按钮;不引入 cva,零业务逻辑,MVP 可用性优先
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
}

// 变体契约（N6 悬停可读性铁律）：
// - ghost/outline 仅用于「透明/描边幽灵按钮」，文字恒为深色（显式 text-foreground），
//   其 hover 反馈走近白 --muted 叠底；严禁再用 ghost/outline 叠加 bg-primary/bg-foreground
//   「重皮肤」做实心按钮——那会让 ghost 的 hover:bg-[var(--muted)] 经 :hover 特异性逃逸覆盖，
//   悬停时浅字落近白底不可见。实心按钮一律用 primary（主色底）/ dark（深色底）/ danger（危险底）。
const variantCls: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-105",
  outline: "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110",
  // dark：深底浅字实心按钮（添加渠道/创建 Key 等），hover 走亮度而非翻白底，根治悬停不可见
  dark: "bg-[var(--foreground)] text-[var(--background)] hover:brightness-125",
};

const sizeCls: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...rest}
    />
  ),
);
Button.displayName = "Button";