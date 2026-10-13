/**
 * Aidean 环境变量配置
 * 集中管理所有环境变量，提供类型安全访问
 */

// ============================================
// 数据库配置
// ============================================

export const DATABASE_CONFIG = {
  // PostgreSQL
  POSTGRES_URL: process.env.DATABASE_URL || 'postgresql://root:NewPassword123!@localhost:5432/aidean',
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || '5432'),
  POSTGRES_USER: process.env.POSTGRES_USER || 'root',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'NewPassword123!',
  POSTGRES_DB: process.env.POSTGRES_DB || 'aidean',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB || '0'),
} as const;

// ============================================
// 认证配置
// ============================================

export const AUTH_CONFIG = {
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'aidean-jwt-secret-min-32-characters',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // 加密
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  
  // 会话
  SESSION_SECRET: process.env.SESSION_SECRET || 'aidean-session-secret',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '7200'), // 2小时
  
  // Cookie
  COOKIE_NAME: process.env.COOKIE_NAME || 'aidean.sid',
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  COOKIE_HTTP_ONLY: true,
  COOKIE_SAME_SITE: 'lax' as const,
  
  // API Key
  API_KEY_HEADER: 'X-API-Key',
} as const;

// ============================================
// 应用配置
// ============================================

export const APP_CONFIG = {
  // 基础
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  HOST: process.env.HOST || '0.0.0.0',
  
  // 站点
  SITE_NAME: process.env.SITE_NAME || 'Aidean',
  SITE_URL: process.env.SITE_URL || 'http://localhost:3000',
  
  // 国际化
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE || 'zh-CN',
  SUPPORTED_LOCALES: ['zh-CN', 'en-US'],
  
  // 分页
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================
// 缓存配置
// ============================================

export const CACHE_CONFIG = {
  // TTL配置（秒）
  TTL: {
    USER_PROFILE: 1800,    // 30分钟
    USER_SESSION: 7200,    // 2小时
    MODEL_DETAIL: 3600,    // 1小时
    MODEL_LIST: 3600,      // 1小时
    LADDER_RANKING: 300,   // 5分钟
    LADDER_TOP100: 60,     // 1分钟
    FEATURE_FLAGS: 0,      // 永久
    DICT: 0,               // 永久
    API_RESPONSE: 60,      // 1分钟
  },
  
  // Key前缀
  KEY_PREFIX: 'aidean:',
  
  // 锁配置
  LOCK: {
    DEFAULT_TTL: 30,       // 30秒
    EVALUATION_TTL: 300,   // 5分钟
    RANKING_TTL: 600,    // 10分钟
  },
} as const;

// ============================================
// 限流配置
// ============================================

export const RATE_LIMIT_CONFIG = {
  // API限流
  API: {
    WINDOW_MS: 60000,      // 1分钟窗口
    MAX_REQUESTS: 100,     // 每窗口最大请求数
  },
  
  // 登录限流
  LOGIN: {
    WINDOW_MS: 900000,     // 15分钟窗口
    MAX_ATTEMPTS: 5,       // 最大尝试次数
    LOCK_DURATION: 3600,   // 锁定时长（秒）
  },
  
  // 充值限流
  RECHARGE: {
    WINDOW_MS: 86400000,   // 24小时窗口
    MAX_REQUESTS: 10,      // 每窗口最大请求数
  },
} as const;

// ============================================
// 安全配置
// ============================================

export const SECURITY_CONFIG = {
  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // CSRF
  CSRF_COOKIE_NAME: 'aidean.csrf',
  
  // 请求限制
  MAX_BODY_SIZE: '10mb',
  MAX_JSON_SIZE: '10mb',
  
  // 敏感字段
  SENSITIVE_FIELDS: ['password', 'token', 'secret', 'apiKey'],
} as const;

// ============================================
// 第三方服务配置
// ============================================

export const EXTERNAL_CONFIG = {
  // 支付
  WECHAT_PAY: {
    APP_ID: process.env.WECHAT_PAY_APP_ID || '',
    MCH_ID: process.env.WECHAT_PAY_MCH_ID || '',
    API_KEY: process.env.WECHAT_PAY_API_KEY || '',
    NOTIFY_URL: process.env.WECHAT_PAY_NOTIFY_URL || '',
  },
  
  ALIPAY: {
    APP_ID: process.env.ALIPAY_APP_ID || '',
    PRIVATE_KEY: process.env.ALIPAY_PRIVATE_KEY || '',
    PUBLIC_KEY: process.env.ALIPAY_PUBLIC_KEY || '',
    NOTIFY_URL: process.env.ALIPAY_NOTIFY_URL || '',
  },
  
  // 邮件
  EMAIL: {
    SMTP_HOST: process.env.EMAIL_SMTP_HOST || '',
    SMTP_PORT: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    SMTP_USER: process.env.EMAIL_SMTP_USER || '',
    SMTP_PASS: process.env.EMAIL_SMTP_PASS || '',
    FROM_ADDRESS: process.env.EMAIL_FROM || 'noreply@aidean.com',
  },
  
  // 存储
  STORAGE: {
    TYPE: process.env.STORAGE_TYPE || 'local',
    REGION: process.env.STORAGE_REGION || '',
    BUCKET: process.env.STORAGE_BUCKET || '',
    ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || '',
    SECRET_KEY: process.env.STORAGE_SECRET_KEY || '',
    CDN_URL: process.env.STORAGE_CDN_URL || '',
  },
} as const;

// ============================================
// 日志配置
// ============================================

export const LOG_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  FORMAT: process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'json' : 'pretty'),
  OUTPUT: process.env.LOG_OUTPUT || 'console', // console | file | both
  FILE_PATH: process.env.LOG_FILE_PATH || './logs/app.log',
  MAX_SIZE: process.env.LOG_MAX_SIZE || '10m',
  MAX_FILES: parseInt(process.env.LOG_MAX_FILES || '5'),
} as const;

// ============================================
// 验证函数
// ============================================

/**
 * 验证环境变量配置
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查必需的环境变量
  if (!AUTH_CONFIG.JWT_SECRET || AUTH_CONFIG.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }
  
  if (!AUTH_CONFIG.SESSION_SECRET || AUTH_CONFIG.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters');
  }
  
  if (APP_CONFIG.NODE_ENV === 'production') {
    if (AUTH_CONFIG.JWT_SECRET === 'aidean-jwt-secret-min-32-characters') {
      errors.push('Default JWT_SECRET should not be used in production');
    }
    
    if (AUTH_CONFIG.COOKIE_SECURE === false) {
      errors.push('COOKIE_SECURE should be true in production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// 导出
// ============================================

export default {
  database: DATABASE_CONFIG,
  auth: AUTH_CONFIG,
  app: APP_CONFIG,
  cache: CACHE_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  security: SECURITY_CONFIG,
  external: EXTERNAL_CONFIG,
  log: LOG_CONFIG,
  validate: validateEnv,
};
