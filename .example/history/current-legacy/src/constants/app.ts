/**
 * 应用级常量配置
 */

// 应用信息
export const APP_NAME = "Aidean";
export const APP_FULL_NAME = "AI模型天梯图平台";
export const APP_DESCRIPTION =
  "提供AI模型与工具的天梯图评测平台，让用户扫一眼即完成选型决策";
export const APP_VERSION = "1.0.0";

// 域名与URL
export const DOMAIN = "aidean.com";
export const WWW_DOMAIN = `www.${DOMAIN}`;
export const API_DOMAIN = `api.${DOMAIN}`;

// 联系信息
export const CONTACT_EMAIL = "contact@aidean.com";
export const SUPPORT_EMAIL = "support@aidean.com";
export const BUSINESS_EMAIL = "business@aidean.com";

// 社交链接
export const SOCIAL_LINKS = {
  github: "https://github.com/aidean",
  twitter: "https://twitter.com/aidean",
  wechat: "#",
  zhihu: "https://zhihu.com/org/aidean",
} as const;

// 备案信息
export const ICP = "京ICP备XXXXXXXX号";
export const POLICE = "京公网安备XXXXXXXXXXX号";

// 分页默认值
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// 文件上传限制
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// 本地存储键名
export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "aidean_user",
  THEME: "aidean_theme",
  LANGUAGE: "aidean_language",
  SEARCH_HISTORY: "aidean_search_history",
  RECENT_MODELS: "aidean_recent_models",
  LADDER_FILTERS: "aidean_ladder_filters",
  CART_ITEMS: "aidean_cart_items",
  NOTIFICATIONS: "aidean_notifications",
} as const;

// Cookie键名
export const COOKIE_KEYS = {
  SESSION: "session",
  REFRESH_TOKEN: "refresh_token",
  THEME: "theme",
  LOCALE: "locale",
} as const;
