"use client";

import { ReactNode } from "react";

interface AdminCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
  className?: string;
  headerBorder?: boolean;
}

export function AdminCard({
  children,
  title,
  subtitle,
  action,
  footer,
  padding = "md",
  shadow = "sm",
  className = "",
  headerBorder = true,
}: AdminCardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const shadowStyles = {
    none: "",
    sm: "shadow-[var(--admin-shadow-sm)]",
    md: "shadow-[var(--admin-shadow-md)]",
    lg: "shadow-[var(--admin-shadow-lg)]",
  };

  const showHeader = title || subtitle || action;

  return (
    <div
      className={`
        bg-[rgb(var(--admin-bg-sidebar))]
        rounded-xl
        border border-[rgb(var(--admin-border))]
        ${shadowStyles[shadow]}
        ${className}
      `}
    >
      {/* 头部 */}
      {showHeader && (
        <div
          className={`
            px-4 py-3
            ${headerBorder ? "border-b border-[rgb(var(--admin-border-light))]" : ""}
            ${padding === "sm" ? "px-3 py-2" : ""}
            ${padding === "lg" ? "px-6 py-4" : ""}
          `}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              {title && (
                <h3 className="text-base font-semibold text-[rgb(var(--admin-text-primary))]">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-[rgb(var(--admin-text-muted))]">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        </div>
      )}

      {/* 内容 */}
      <div className={paddingStyles[padding]}>{children}</div>

      {/* 底部 */}
      {footer && (
        <div className="px-4 py-3 border-t border-[rgb(var(--admin-border-light))] bg-[rgb(var(--admin-bg))] rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}

// 统计卡片变体
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  loading?: boolean;
}

export function AdminStatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  loading = false,
}: StatCardProps) {
  const changeStyles = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-[rgb(var(--admin-text-muted))]",
  };

  const changeBgStyles = {
    positive: "bg-green-50",
    negative: "bg-red-50",
    neutral: "bg-[rgb(var(--admin-bg-hover))]",
  };

  return (
    <div className="bg-[rgb(var(--admin-bg-sidebar))] rounded-xl border border-[rgb(var(--admin-border))] shadow-[var(--admin-shadow-sm)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[rgb(var(--admin-text-secondary))]">
            {title}
          </p>
          {loading ? (
            <div className="mt-2 h-8 w-24 bg-[rgb(var(--admin-bg-hover))] rounded animate-pulse" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-[rgb(var(--admin-text-primary))]">
              {value}
            </p>
          )}
          {change && !loading && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${changeBgStyles[changeType]} ${changeStyles[changeType]}`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-[rgb(var(--admin-primary-light))] text-[rgb(var(--admin-primary))]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
