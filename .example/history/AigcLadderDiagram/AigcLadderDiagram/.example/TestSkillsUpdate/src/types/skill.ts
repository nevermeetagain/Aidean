/**
 * Skill 同步脚本 - 类型定义 v2.0
 * 参考：Skills同步方案_优化版_v2.md 场景化验证驱动设计
 */

// ==================== 数据分层 ====================

/**
 * 数据分层枚举
 * L0: 原始源（npm/github）→ 需清洗过滤
 * L1: 社区源（skillsmp/smithery）→ 基本可信
 * L2: 聚合源（LMSYS等）→ 高可信
 * L3: 权威源（官方API）→ 100%可信
 */
export enum DataLayer {
  L0_RAW = 0,
  L1_COMMUNITY = 1,
  L2_AGGREGATOR = 2,
  L3_AUTHORITY = 3,
}

// ==================== 字段级变更 ====================

/**
 * 字段变更级别
 * 控制变更检测粒度和通知策略
 */
export enum FieldChangeLevel {
  METRIC = 'METRIC',       // 频繁变化指标（install_count等），不记录历史
  CONTENT = 'CONTENT',     // 内容字段（description等），记录历史
  RELEASE = 'RELEASE',     // 发布信息（version等），记录历史+通知
  PRICING = 'PRICING',     // 定价（关键），记录历史+实时通知
  IDENTITY = 'IDENTITY',   // 身份信息（author/name等），记录历史+通知+人工审核
}

/**
 * 字段→变更级别映射
 */
export const FIELD_LEVEL_MAP: Record<string, FieldChangeLevel> = {
  'downloadCount': FieldChangeLevel.METRIC,
  'stars': FieldChangeLevel.METRIC,
  'description': FieldChangeLevel.CONTENT,
  'category': FieldChangeLevel.CONTENT,
  'tags': FieldChangeLevel.CONTENT,
  'version': FieldChangeLevel.RELEASE,
  'lastUpdated': FieldChangeLevel.RELEASE,
  'installCommand': FieldChangeLevel.RELEASE,
  'npmPackage': FieldChangeLevel.RELEASE,
  'pricing': FieldChangeLevel.PRICING,
  'author': FieldChangeLevel.IDENTITY,
  'name': FieldChangeLevel.IDENTITY,
  'displayName': FieldChangeLevel.IDENTITY,
  'sourceUrl': FieldChangeLevel.IDENTITY,
};

/**
 * 变更级别配置
 */
export const CHANGE_LEVEL_CONFIG: Record<FieldChangeLevel, {
  level: number;
  logHistory: boolean;
  notify: boolean;
  requireReview: boolean;
}> = {
  [FieldChangeLevel.METRIC]:   { level: 0, logHistory: false, notify: false, requireReview: false },
  [FieldChangeLevel.CONTENT]:  { level: 1, logHistory: true,  notify: false, requireReview: false },
  [FieldChangeLevel.RELEASE]:  { level: 2, logHistory: true,  notify: true,  requireReview: false },
  [FieldChangeLevel.PRICING]:  { level: 3, logHistory: true,  notify: true,  requireReview: false },
  [FieldChangeLevel.IDENTITY]: { level: 4, logHistory: true,  notify: true,  requireReview: true },
};

// ==================== 数据源配置 ====================

export interface DataSourceConfig {
  sourceCode: 'skillsmp' | 'smithery' | 'skills_sh' | 'npm' | 'github';
  sourceName: string;
  baseUrl: string;
  apiKey?: string;
  rateLimitRequests: number;
  rateLimitWindow: number;
  /** v2.0: 数据分层 */
  dataLayer: DataLayer;
  /** v2.0: 数据可信度 0-100 */
  trustScore: number;
  /** v2.0: 同步优先级，数值越小越高 */
  syncPriority?: number;
}

// ==================== 数据质量评分 ====================

/**
 * 数据质量评分卡
 */
export interface DataQualityScore {
  /** 字段完整度 0-100 */
  completeness: number;
  /** 数据新鲜度 0-100 */
  freshness: number;
  /** 来源权威度 0-100 */
  authority: number;
  /** 多源一致性 0-100 */
  consistency: number;
  /** 综合评分 0-100 */
  overall: number;
}

/** 质量评分阈值：低于此值的数据进入"待完善"队列 */
export const QUALITY_THRESHOLD = 60;

// ==================== 原始数据 ====================

export interface RawSkillRecord {
  id: string;
  name: string;
  description?: string;
  author?: string;
  repo?: string;
  url?: string;
  stars?: number;
  installs?: number;
  category?: string;
  tags?: string[];
  version?: string;
  lastUpdated?: string;
  installCommand?: string;
  npmPackage?: string;
  [key: string]: any;
}

// ==================== 标准化数据 ====================

export interface SkillSyncRecord {
  skillKey: string;
  name: string;
  displayName: string;
  description: string;
  author: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  stars: number;
  downloadCount: number;
  category: string;
  tags: string[];
  version: string;
  lastUpdated: Date;
  installCommand?: string;
  npmPackage?: string;
  rawHash: string;
  /** v2.0: 字段级哈希 */
  fieldHashes: Record<string, string>;
  /** v2.0: 数据质量评分 */
  qualityScore: number;
  /** v2.0: 数据分层 */
  dataLayer: DataLayer;
}

// ==================== 数据库Skill ====================

export interface Skill {
  id: number;
  skillKey: string;
  name: string;
  displayName: string;
  description: string;
  author: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  stars: number;
  downloadCount: number;
  category: string;
  tags: string;
  version: string;
  lastUpdated: Date;
  installCommand?: string;
  npmPackage?: string;
  rawHash: string;
  /** v2.0: 字段级哈希 */
  fieldHashes: string;            // JSON字符串
  /** v2.0: 数据质量评分 */
  qualityScore: number;
  /** v2.0: 数据分层 */
  dataLayer: number;
  /** v2.0: 多源关联数 */
  multiSourceCount: number;
  /** v2.0: 最近变更级别 */
  lastFieldChangeLevel: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 字段级变更 ====================

export interface FieldChange {
  field: string;
  changeLevel: FieldChangeLevel;
  oldValue: any;
  newValue: any;
  detectedAt: Date;
}

// ==================== 同步任务 ====================

export interface SyncTask {
  id: number;
  dataSourceId: number;
  taskType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  skippedRecords: number;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface SyncResult {
  taskId: number;
  status: 'success' | 'failed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  skippedRecords: number;
  /** v2.0: 字段级变更列表 */
  fieldChanges?: FieldChange[];
  errorMessage?: string;
}

// ==================== 冲突解决 ====================

export interface FieldMapping {
  [targetField: string]: string | ((data: any) => any);
}

export interface MergeRule {
  field: string;
  strategy: 'priority_wins' | 'newer_wins' | 'merge' | 'max_wins' | 'authority_wins' | 'custom';
  customResolver?: (existing: any, incoming: any) => any;
}

export interface FieldConflict {
  field: string;
  existing: any;
  incoming: any;
  chosen: any;
  reason: string;
  /** v2.0: 变更级别 */
  changeLevel: FieldChangeLevel;
}

export interface ResolutionResult {
  action: 'create' | 'update' | 'merge' | 'skip' | 'review';
  mergedData?: Partial<Skill>;
  conflicts?: FieldConflict[];
  /** v2.0: 需要人工审核的字段 */
  requiresReview?: string[];
}

// ==================== 变更类型 ====================

export type ChangeType = 'create' | 'update' | 'delete' | 'no_change';

// ==================== 获取参数 ====================

export interface FetchParams {
  page?: number;
  limit?: number;
  since?: string;
}

// ==================== 错误类型 ====================

/**
 * v2.0: 结构化错误码
 */
export enum SyncErrorCode {
  // 1xx: 网络相关
  NETWORK_TIMEOUT = 'SYNC_101',
  API_RATE_LIMIT = 'SYNC_102',
  CONNECTION_REFUSED = 'SYNC_103',
  
  // 2xx: 数据相关
  DATA_FORMAT_INVALID = 'SYNC_201',
  REQUIRED_FIELD_MISSING = 'SYNC_202',
  VALIDATION_FAILED = 'SYNC_203',
  SCHEMA_MISMATCH = 'SYNC_204',
  
  // 3xx: 数据库相关
  DB_CONNECTION_FAILED = 'SYNC_301',
  DUPLICATE_KEY = 'SYNC_302',
  TRANSACTION_FAILED = 'SYNC_303',
  
  // 4xx: 业务相关
  CONFLICT_RESOLUTION_FAILED = 'SYNC_401',
  CIRCUIT_BREAKER_OPEN = 'SYNC_402',
  QUALITY_BELOW_THRESHOLD = 'SYNC_403',
  IDENTITY_REVIEW_REQUIRED = 'SYNC_404',
}

export const SYNC_ERROR_MESSAGES: Record<SyncErrorCode, string> = {
  [SyncErrorCode.NETWORK_TIMEOUT]: '网络连接超时，请检查数据源地址和防火墙设置',
  [SyncErrorCode.API_RATE_LIMIT]: 'API请求频率超限，正在自动重试',
  [SyncErrorCode.CONNECTION_REFUSED]: '数据源拒绝连接，可能服务不可用',
  [SyncErrorCode.DATA_FORMAT_INVALID]: '数据格式不符合预期，请检查数据源格式',
  [SyncErrorCode.REQUIRED_FIELD_MISSING]: '必填字段缺失',
  [SyncErrorCode.VALIDATION_FAILED]: '数据验证失败',
  [SyncErrorCode.SCHEMA_MISMATCH]: '数据源Schema变更，需更新映射配置',
  [SyncErrorCode.DB_CONNECTION_FAILED]: '数据库连接失败',
  [SyncErrorCode.DUPLICATE_KEY]: '数据重复，已存在相同记录',
  [SyncErrorCode.TRANSACTION_FAILED]: '数据库事务执行失败',
  [SyncErrorCode.CONFLICT_RESOLUTION_FAILED]: '冲突解决失败，需人工审核',
  [SyncErrorCode.CIRCUIT_BREAKER_OPEN]: '断路器已熔断，数据源暂时不可用',
  [SyncErrorCode.QUALITY_BELOW_THRESHOLD]: '数据质量低于阈值',
  [SyncErrorCode.IDENTITY_REVIEW_REQUIRED]: '身份信息变更，需人工审核',
};

export class AdapterError extends Error {
  constructor(message: string, public code: SyncErrorCode = SyncErrorCode.DATA_FORMAT_INVALID, public cause?: Error) {
    super(message);
    this.name = 'AdapterError';
  }
}

export class SyncError extends Error {
  constructor(message: string, public code: SyncErrorCode = SyncErrorCode.CONFLICT_RESOLUTION_FAILED, public taskId?: number) {
    super(message);
    this.name = 'SyncError';
  }
}
