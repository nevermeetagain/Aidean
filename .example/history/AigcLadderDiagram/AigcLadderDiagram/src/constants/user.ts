/**
 * 用户相关常量
 */

// 用户角色
export const USER_ROLES = [
  { value: "USER", label: "普通用户", description: "基础功能访问" },
  { value: "ADMIN", label: "管理员", description: "后台管理权限" },
  { value: "SUPER_ADMIN", label: "超级管理员", description: "全站管理权限" },
] as const;

// 用户状态
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  PENDING: "pending",
} as const;

// 性别选项
export const GENDER_OPTIONS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
  { value: "secret", label: "保密" },
] as const;

// 语言选项
export const LANGUAGE_OPTIONS = [
  { value: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { value: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  { value: "en-US", label: "English", flag: "🇺🇸" },
  { value: "ja-JP", label: "日本語", flag: "🇯🇵" },
] as const;

// 时区选项（常用）
export const TIMEZONE_OPTIONS = [
  { value: "Asia/Shanghai", label: "北京时间 (UTC+8)" },
  { value: "Asia/Tokyo", label: "东京时间 (UTC+9)" },
  { value: "America/New_York", label: "纽约时间 (UTC-5)" },
  { value: "America/Los_Angeles", label: "洛杉矶时间 (UTC-8)" },
  { value: "Europe/London", label: "伦敦时间 (UTC+0)" },
  { value: "Europe/Paris", label: "巴黎时间 (UTC+1)" },
] as const;
