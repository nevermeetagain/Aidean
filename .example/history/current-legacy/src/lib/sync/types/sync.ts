/**
 * 模型同步核心类型定义
 */

// 同步上下文
export interface SyncContext {
  batchId: string;
  source: 'openrouter' | 'arena' | 'both';
  timestamp: Date;
  config: SyncConfig;
}

// 同步配置
export interface SyncConfig {
  dryRun?: boolean;           // 是否仅预览不写入
  forceUpdate?: boolean;      // 是否强制更新
  sources?: ('openrouter' | 'arena')[];  // 要同步的数据源
  limit?: number;             // 限制处理的模型数量
  timeout?: number;           // API 请求超时时间
  retryCount?: number;        // 重试次数
}

// 同步阶段
export interface SyncPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  stats?: {
    processed: number;
    succeeded: number;
    failed: number;
  };
  errors?: string[];
}

// 同步结果
export interface SyncResult {
  success: boolean;
  batchId: string;
  phases?: SyncPhase[];
  stats: {
    modelsFound: number;
    modelsNew: number;
    modelsUpdated: number;
    modelsDeprecated: number;
    modelsUnchanged: number;
    errors: number;
    duration: number;
  };
  errors?: string[];
  startedAt: Date;
  completedAt: Date;
}

// 同步错误
export interface SyncError {
  modelCode?: string;
  stage: 'fetch' | 'transform' | 'validate' | 'write';
  message: string;
  rawData?: any;
}

// 模型差异类型
export type ModelDiffType = 'NEW' | 'UPDATED' | 'UNCHANGED' | 'DEPRECATED';

// 模型差异
export interface ModelDiff {
  type: ModelDiffType;
  modelCode: string;
  before?: Record<string, any>;   // 变更前的数据
  after?: Record<string, any>;    // 变更后的数据
  changedFields?: string[];       // 变更的字段列表
}

// Batch 状态
export type BatchStatus = 'pending' | 'running' | 'success' | 'completed' | 'failed' | 'partial';

// SyncBatch 记录
export interface SyncBatch {
  id: string;
  batchCode: string;          // 格式: SYNC-{source}-{YYYYMMDD}-{seq}
  source: string;
  status: BatchStatus;
  modelsFetched: number;
  modelsCreated: number;
  modelsUpdated: number;
  modelsDeleted: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  config?: SyncConfig;
}

// 变更日志
export interface ModelChangeLog {
  id: string;
  modelId: string;
  batchId: string;
  changeType: ModelDiffType;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  changedFields?: string[];
  createdAt: Date;
}
