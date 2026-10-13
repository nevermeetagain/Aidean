// Aidean 共享类型定义
// 供 web、synapse 等平台复用

// 用户相关
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "user" | "admin";
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

// 模型相关
export interface Model {
  id: string;
  name: string;
  provider: string;
  category: "chat" | "embedding" | "image" | "audio" | "video";
  pricing: ModelPricing;
  capabilities: ModelCapabilities;
  benchmarks?: BenchmarkScore[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelPricing {
  input: number;   // per 1M tokens
  output: number;  // per 1M tokens
  cached?: number; // cache hit
  currency: "USD" | "CNY";
}

export interface ModelCapabilities {
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
}

export interface BenchmarkScore {
  benchmark: string;
  score: number;
  percentile?: number;
}

// 天梯图相关
export interface LadderEntry {
  rank: number;
  modelId: string;
  modelName: string;
  provider: string;
  score: number;
  category: string;
  trend: "up" | "down" | "stable";
  change: number;
}

export interface LadderData {
  type: "models" | "tools" | "stations" | "skills";
  category: string;
  entries: LadderEntry[];
  lastUpdated: Date;
  version: string;
}

// API 响应通用类型
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  requestId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 错误码定义（与 API接口文档 §4 保持一致）
export enum ErrorCode {
  // 1xxxx 用户/认证
  USER_NOT_FOUND = 10001,
  INVALID_CREDENTIALS = 10002,
  TOKEN_EXPIRED = 10003,
  TOKEN_INVALID = 10004,
  PERMISSION_DENIED = 10005,
  
  // 2xxxx 模型/天梯
  MODEL_NOT_FOUND = 20001,
  LADDER_NOT_FOUND = 20002,
  
  // 3xxxx 模型站/统一API
  STATION_UNAVAILABLE = 30001,
  STATION_UNREACHABLE = 30002,
  GATEWAY_ROUTE_FAILED = 30003,
  
  // 4xxxx 财务
  INSUFFICIENT_BALANCE = 40001,
  PAYMENT_FAILED = 40002,
  
  // 5xxxx 系统
  INTERNAL_ERROR = 50001,
  SERVICE_UNAVAILABLE = 50002,
  RATE_LIMITED = 50003,
}

// 环境变量类型
export interface EnvConfig {
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  NODE_ENV: "development" | "production" | "test";
  NEXT_PUBLIC_APP_URL: string;
}
