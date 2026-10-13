"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    // 基础样式
    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

    // 变体样式
    const variantStyles: Record<ButtonVariant, string> = {
      primary: `bg-[rgb(var(--admin-primary))] text-white hover:bg-[rgb(var(--admin-primary-hover))] focus:ring-[rgb(var(--admin-primary-ring))]`,
      secondary: `bg-[rgb(var(--admin-bg-sidebar))] text-[rgb(var(--admin-text-primary))] border border-[rgb(var(--admin-border))] hover:bg-[rgb(var(--admin-bg-hover))] focus:ring-[rgb(var(--admin-border))]`,
      danger: `bg-[rgb(var(--admin-danger))] text-white hover:bg-[rgb(var(--admin-danger-hover))] focus:ring-[rgb(var(--admin-danger))]`,
      ghost: `bg-transparent text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-primary))] focus:ring-transparent`,
      link: `bg-transparent text-[rgb(var(--admin-primary))] hover:underline focus:ring-transparent p-0 h-auto`,
    };

    // 尺寸样式
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-2.5 text-base",
    };

    // 加载状态图标尺寸
    const loaderSizes: Record<ButtonSize, string> = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    const classes = [
      baseStyles,
      variantStyles[variant],
      variant !== "link" && sizeStyles[size],
      fullWidth && "w-full",
      isLoading && "opacity-80",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className={`${loaderSizes[size]} animate-spin`} />
        )}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

AdminButton.displayName = "AdminButton";
