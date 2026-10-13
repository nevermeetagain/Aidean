/**
 * 表格/列表相关常量
 */

// 默认分页配置
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
} as const;

// 表格列宽预设
export const COLUMN_WIDTHS = {
  XS: 60,
  SM: 80,
  MD: 120,
  LG: 160,
  XL: 200,
  XXL: 280,
  AUTO: "auto",
} as const;

// 表格对齐方式
export const COLUMN_ALIGN = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
} as const;

// 表格列固定方式
export const COLUMN_FIXED = {
  LEFT: "left",
  RIGHT: "right",
  NONE: false,
} as const;

// 表格行高
export const ROW_HEIGHTS = {
  COMPACT: 40,
  DEFAULT: 48,
  COMFORTABLE: 56,
  LOOSE: 64,
} as const;
