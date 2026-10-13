// 旧 @aidean/shared-types 收编评估结论（SubTask 1.1.2）
// 并入: User / Model / ModelPricing / ModelCapabilities / BenchmarkScore /
//       LadderEntry / LadderData(type 收敛为 models|stations) / ErrorCode(enum 转 const)
// 不并入(已被新契约取代或平台私有):
//   ApiResponse,PaginatedResponse -> schemas/common.schema.ts 的 envelope/PaginationMeta
//   EnvConfig -> 平台启动期配置,不属跨端契约
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

export interface ModelPricing {
  input: number; // per 1M tokens
  output: number; // per 1M tokens
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

export interface BenchmarkScore {
  benchmark: string;
  score: number;
  percentile?: number;
}

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
  type: "models" | "stations";
  category: string;
  entries: LadderEntry[];
  lastUpdated: Date;
  version: string;
}

/** 错误码定义（原 enum 改 const 对象,isolatedModules/tree-shaking 友好） */
export const ErrorCode = {
  USER_NOT_FOUND: 10001,
  INVALID_CREDENTIALS: 10002,
  TOKEN_EXPIRED: 10003,
  TOKEN_INVALID: 10004,
  PERMISSION_DENIED: 10005,
  MODEL_NOT_FOUND: 20001,
  LADDER_NOT_FOUND: 20002,
  STATION_UNAVAILABLE: 30001,
  STATION_UNREACHABLE: 30002,
  GATEWAY_ROUTE_FAILED: 30003,
  INSUFFICIENT_BALANCE: 40001,
  PAYMENT_FAILED: 40002,
  INTERNAL_ERROR: 50001,
  SERVICE_UNAVAILABLE: 50002,
  RATE_LIMITED: 50003,
} as const;
export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];