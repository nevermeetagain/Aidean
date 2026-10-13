/**
 * SyncBatch 管理器
 * 管理同步批次的创建、完成、失败状态
 */

import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { SyncBatch, BatchStatus, SyncConfig } from './types/sync';

let sequenceCounter = 0;

function toSyncBatch(batch: Awaited<ReturnType<typeof prisma.syncBatch.findUnique>>): SyncBatch | null {
  if (!batch) return null;
  return {
    id: batch.id,
    batchCode: batch.batchCode,
    source: batch.source || 'manual',
    status: batch.status as BatchStatus,
    modelsFetched: batch.totalRecords,
    modelsCreated: batch.successRecords,
    modelsUpdated: 0,
    modelsDeleted: 0,
    errorMessage: Array.isArray(batch.errorSamples) ? JSON.stringify(batch.errorSamples) : undefined,
    startedAt: batch.createdAt,
    completedAt: ['completed', 'success', 'failed', 'partial'].includes(batch.status) ? batch.updatedAt : undefined,
    config: batch.validationSummary as SyncConfig | undefined,
  };
}

/**
 * 生成 Batch Code
 * 格式: SYNC-{source}-{YYYYMMDD}-{seq}
 */
export function generateBatchCode(source: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  sequenceCounter++;
  const seq = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}-${sequenceCounter}`.padStart(8, '0');
  return `SYNC-${source.toUpperCase()}-${dateStr}-${seq}`;
}

/**
 * 创建新的同步批次
 */
export async function createBatch(
  source: string,
  config?: SyncConfig
): Promise<SyncBatch> {
  const batchCode = generateBatchCode(source);
  const batch = await prisma.syncBatch.create({
    data: {
      batchCode,
      source,
      status: 'running',
      validationSummary: config ? JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue : undefined,
    },
  });
  console.log(`[BatchManager] Created batch: ${batchCode}`);
  return toSyncBatch(batch)!;
}

/**
 * 标记批次为运行中
 */
export async function markBatchRunning(batchId: string): Promise<SyncBatch | null> {
  const batch = await prisma.syncBatch.update({
    where: { id: batchId },
    data: { status: 'running' },
  }).catch(() => null);
  if (!batch) {
    console.error(`[BatchManager] Batch not found: ${batchId}`);
    return null;
  }
  console.log(`[BatchManager] Marked batch as running: ${batch.batchCode}`);
  return toSyncBatch(batch);
}

/**
 * 完成批次
 */
export async function completeBatch(
  batchId: string,
  stats: {
    modelsFetched: number;
    modelsCreated: number;
    modelsUpdated: number;
    modelsDeleted: number;
  }
): Promise<SyncBatch | null> {
  const batch = await prisma.syncBatch.update({
    where: { id: batchId },
    data: {
      status: 'completed',
      totalRecords: stats.modelsFetched,
      successRecords: stats.modelsCreated + stats.modelsUpdated,
      failedRecords: 0,
      validationSummary: stats,
    },
  }).catch(() => null);
  if (!batch) {
    console.error(`[BatchManager] Batch not found: ${batchId}`);
    return null;
  }
  console.log(`[BatchManager] Completed batch: ${batch.batchCode}`);
  console.log(`  - Fetched: ${stats.modelsFetched}`);
  console.log(`  - Created: ${stats.modelsCreated}`);
  console.log(`  - Updated: ${stats.modelsUpdated}`);
  console.log(`  - Deleted: ${stats.modelsDeleted}`);
  return toSyncBatch(batch);
}

/**
 * 标记批次失败
 */
export async function failBatch(
  batchId: string,
  errorMessage: string
): Promise<SyncBatch | null> {
  const batch = await prisma.syncBatch.update({
    where: { id: batchId },
    data: {
      status: 'failed',
      failedRecords: 1,
      errorSamples: [{ message: errorMessage, at: new Date().toISOString() }],
    },
  }).catch(() => null);
  if (!batch) {
    console.error(`[BatchManager] Batch not found: ${batchId}`);
    return null;
  }
  console.error(`[BatchManager] Failed batch: ${batch.batchCode}`);
  console.error(`  - Error: ${errorMessage}`);
  return toSyncBatch(batch);
}

/**
 * 获取批次信息
 */
export async function getBatch(batchId: string): Promise<SyncBatch | null> {
  return toSyncBatch(await prisma.syncBatch.findUnique({ where: { id: batchId } }));
}

/**
 * 获取最近的批次列表
 */
export async function getRecentBatches(limit: number = 10): Promise<SyncBatch[]> {
  const batches = await prisma.syncBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return batches.map((batch) => toSyncBatch(batch)!).filter(Boolean);
}

/**
 * 获取批次统计
 */
export async function getBatchStats(): Promise<{
  total: number;
  success: number;
  failed: number;
  running: number;
  pending: number;
}> {
  const [total, success, failed, running, pending] = await Promise.all([
    prisma.syncBatch.count(),
    prisma.syncBatch.count({ where: { status: { in: ['success', 'completed'] } } }),
    prisma.syncBatch.count({ where: { status: 'failed' } }),
    prisma.syncBatch.count({ where: { status: 'running' } }),
    prisma.syncBatch.count({ where: { status: 'pending' } }),
  ]);
  return { total, success, failed, running, pending };
}

/**
 * 清理旧批次数据
 */
export async function cleanupOldBatches(keepCount: number = 100): Promise<number> {
  const batches = await prisma.syncBatch.findMany({
    orderBy: { createdAt: 'desc' },
    skip: keepCount,
    select: { id: true },
  });
  if (batches.length === 0) return 0;
  const result = await prisma.syncBatch.deleteMany({
    where: { id: { in: batches.map((batch) => batch.id) } },
  });
  console.log(`[BatchManager] Cleaned up ${result.count} old batches`);
  return result.count;
}
