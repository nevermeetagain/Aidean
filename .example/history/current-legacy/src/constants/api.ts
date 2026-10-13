/**
 * API相关常量
 */

// API基础路径
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
export const API_VERSION = "v1";

// 请求超时时间（毫秒）
export const REQUEST_TIMEOUT = 30000;
export const UPLOAD_TIMEOUT = 120000;

// 重试配置
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000;

// HTTP状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// 业务错误码
export const ERROR_CODES = {
  // 认证相关
  AUTH_INVALID_TOKEN: "AUTH001",
  AUTH_TOKEN_EXPIRED: "AUTH002",
  AUTH_PERMISSION_DENIED: "AUTH003",

  // 用户相关
  USER_NOT_FOUND: "USER001",
  USER_ALREADY_EXISTS: "USER002",
  USER_INVALID_PASSWORD: "USER003",

  // 模型相关
  MODEL_NOT_FOUND: "MODEL001",
  MODEL_ALREADY_EXISTS: "MODEL002",

  // 通用错误
  VALIDATION_ERROR: "COMMON001",
  RESOURCE_NOT_FOUND: "COMMON002",
  OPERATION_FAILED: "COMMON003",
  RATE_LIMIT_EXCEEDED: "COMMON004",
} as const;

// API端点分组
export const API_ENDPOINTS = {
  // 认证
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
  },

  // 模型
  MODELS: {
    LIST: "/models",
    DETAIL: (id: string) => `/models/${id}`,
    LADDER: "/models/ladder",
    COMPARE: "/models/compare",
    BENCHMARKS: "/models/benchmarks",
  },

  // 资源
  RESOURCES: {
    SKILLS: "/tools/skills",
    MCP: "/tools/mcp",
    AGENTS: "/tools/agents",
    NEWS: "/content/news",
  },

  // 系统
  SYSTEM: {
    STATS: "/system/stats",
    CONFIG: "/system/config",
    NAVIGATION: "/system/navigation",
    HEALTH: "/system/health",
  },
} as const;

// 缓存时间（秒）
export const CACHE_TTL = {
  SHORT: 60, // 1分钟
  MEDIUM: 300, // 5分钟
  LONG: 3600, // 1小时
  DAY: 86400, // 1天
} as const;
