// 旧 @aidean/shared-types 收编评估结论（SubTask 1.1.2）
// 并入: User / Model / ModelPricing / ModelCapabilities / BenchmarkScore /
//       LadderEntry / LadderData(type 收敛为 models|stations)
// 不并入(已被新契约取代或平台私有):
//   ApiResponse,PaginatedResponse -> schemas/common.schema.ts 的 envelope/PaginationMeta
//   EnvConfig -> 平台启动期配置,不属跨端契约
//   ErrorCode/ErrorCodeValue -> 旧冲突表(10002/10003/50001… 与运行时码值冲突)于 TASK-001 删除,
//                              唯一源迁移至 errors.ts(ADR-P001 / REQ-NF-001)
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
