"use client";

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral";
type StatusSize = "sm" | "md";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: StatusSize;
  dot?: boolean;
  pulse?: boolean;
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string }> = {
  success: {
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  error: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  info: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  neutral: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
  },
};

export function StatusBadge({
  status,
  variant = "neutral",
  size = "md",
  dot = true,
  pulse = false,
}: StatusBadgeProps) {
  const styles = variantStyles[variant];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${styles.bg} ${styles.text} ${sizeClasses[size]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${pulse ? "animate-pulse" : ""}`}
        />
      )}
      {status}
    </span>
  );
}

// 布尔状态快捷组件
interface BoolBadgeProps {
  value: boolean;
  trueText?: string;
  falseText?: string;
  size?: StatusSize;
}

export function BoolBadge({
  value,
  trueText = "启用",
  falseText = "禁用",
  size = "md",
}: BoolBadgeProps) {
  return value ? (
    <StatusBadge status={trueText} variant="success" size={size} />
  ) : (
    <StatusBadge status={falseText} variant="neutral" size={size} />
  );
}
