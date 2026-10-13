/**
 * Sync type definitions
 * D-2=C: Field ownership matrix — sync writers only touch sync-owned fields.
 * @see docs/product/design/功能设计文档.md §五 字段所有权矩阵
 */

/** Fields that sync is allowed to write (per field ownership matrix) */
export const SYNC_OWNED_MODEL_FIELDS = [
  'contextLength',
  'parameterCount',
  'isOpenSource',
  'isMultiModal',
  'isReasoning',
  'isCodingOptimized',
  'officialUrl',
  'docsUrl',
  'apiUrl',
  'githubUrl',
  'paperUrl',
  'publishedAt',
  'deprecatedAt',
  'benchmarkScore',
  'popularityScore',
  'status',
] as const;

/** Source types for sync batches */
export type SyncSource = 'official_api' | 'crawler' | 'manual';

/** Batch status state machine: running → completed | failed | partial */
export type SyncBatchStatus = 'running' | 'completed' | 'failed' | 'partial';

/** Raw model data from an upstream source (before mapping) */
export interface RawModelData {
  modelCode: string;
  nameDisplay?: string;
  vendorName?: string;
  contextLength?: number;
  parameterCount?: string;
  isOpenSource?: boolean;
  isMultiModal?: boolean;
  isReasoning?: boolean;
  isCodingOptimized?: boolean;
  officialUrl?: string;
  docsUrl?: string;
  apiUrl?: string;
  githubUrl?: string;
  paperUrl?: string;
  publishedAt?: Date;
  deprecatedAt?: Date;
  status?: string;
  // Aggregate scores (sync-owned per D-2=C)
  benchmarkScore?: number;
  popularityScore?: number;
  // Pricing
  inputPrice?: number;
  outputPrice?: number;
  currency?: string;
  unit?: string;
  // Benchmarks
  benchmarks?: RawBenchmarkData[];
}

export interface RawBenchmarkData {
  benchmarkType: string;
  totalScore: number;
  testDate?: Date;
  sourceName?: string;
  scores?: Record<string, number>;
}

/** Normalized model data after mapping (ready for writer) */
export interface NormalizedModelData {
  modelCode: string;
  /** Vendor name from upstream source — used by writer to resolve vendorId (D1 fix)
   * Extracted from adapter data; mapper preserves it from RawModelData.vendorName.
   * Writer resolves to existing Vendor by code, or creates a new one if not found.
   */
  vendorName?: string;
  contextLength?: number;
  parameterCount?: string;
  isOpenSource?: boolean;
  isMultiModal?: boolean;
  isReasoning?: boolean;
  isCodingOptimized?: boolean;
  officialUrl?: string;
  docsUrl?: string;
  apiUrl?: string;
  githubUrl?: string;
  paperUrl?: string;
  publishedAt?: Date;
  deprecatedAt?: Date;
  status?: string;
  // Aggregate scores (sync-owned per D-2=C, R-42 fix)
  benchmarkScore?: number;
  popularityScore?: number;
  prices?: NormalizedPriceData[];
  benchmarks?: NormalizedBenchmarkData[];
  /** Checksum for dedup — if unchanged, skip UPSERT */
  checksum: string;
}

export interface NormalizedPriceData {
  inputPrice: number;
  outputPrice: number;
  currency: string;
  unit: string;
  effectiveAt: Date;
}

export interface NormalizedBenchmarkData {
  benchmarkType: string;
  totalScore: number;
  testDate: Date;
  sourceName: string;
  scores: Record<string, number>;
}

/** Sync configuration */
export interface SyncConfig {
  source: SyncSource;
  sourceUrl?: string;
  dryRun?: boolean;
  /** Max records per batch (batch ≤ 500 per audit requirement) */
  batchSize?: number;
  /** Adapter-specific options */
  options?: Record<string, unknown>;
}

/** Result of a single model sync operation */
export interface SyncModelResult {
  modelCode: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  error?: string;
}

/** Result of a full sync batch */
export interface SyncBatchResult {
  batchId: string;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  skippedRecords: number;
  status: SyncBatchStatus;
  errors: Array<{ modelCode: string; error: string }>;
}
