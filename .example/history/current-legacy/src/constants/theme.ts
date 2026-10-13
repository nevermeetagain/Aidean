/**
 * 主题相关常量
 */

// 主题配色方案
export const THEME_COLORS = {
  blue: {
    primary: "#3B82F6",
    secondary: "#60A5FA",
    accent: "#93C5FD",
    background: "#EFF6FF",
  },
  purple: {
    primary: "#8B5CF6",
    secondary: "#A78BFA",
    accent: "#C4B5FD",
    background: "#F5F3FF",
  },
  green: {
    primary: "#10B981",
    secondary: "#34D399",
    accent: "#6EE7B7",
    background: "#ECFDF5",
  },
  orange: {
    primary: "#F59E0B",
    secondary: "#FBBF24",
    accent: "#FCD34D",
    background: "#FFFBEB",
  },
  red: {
    primary: "#EF4444",
    secondary: "#F87171",
    accent: "#FCA5A5",
    background: "#FEF2F2",
  },
  slate: {
    primary: "#64748B",
    secondary: "#94A3B8",
    accent: "#CBD5E1",
    background: "#F8FAFC",
  },
} as const;

// 暗色模式颜色
export const DARK_THEME_COLORS = {
  background: "#0F172A",
  surface: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
} as const;

// 主题字体
export const THEME_FONTS = {
  sans: [
    "Inter",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ].join(","),
  mono: ["JetBrains Mono", "Fira Code", "Consolas", "Monaco", "monospace"].join(","),
} as const;

// 圆角大小
export const BORDER_RADIUS = {
  NONE: "0",
  SM: "0.25rem",
  DEFAULT: "0.375rem",
  MD: "0.5rem",
  LG: "0.75rem",
  XL: "1rem",
  FULL: "9999px",
} as const;

// 阴影层级
export const SHADOWS = {
  SM: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  MD: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  LG: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  XL: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;
