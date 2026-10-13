/**
 * 变更记录器
 * 记录模型变更历史到日志表
 */

import { prisma } from '@/lib/db/prisma';
import type { ModelDiff, ModelChangeLog } from './types/sync';

function toChangeLog(log: Awaited<ReturnType<typeof prisma.modelChangeLog.findFirst>>): ModelChangeLog | null {
  if (!log) return null;
  return {
    id: log.id,
    modelId: log.modelId,
    batchId: log.syncBatchId || '',
    changeType: log.changeType as ModelChangeLog['changeType'],
    beforeData: log.beforeData as Record<string, any> | undefined,
    afterData: log.afterData as Record<string, any> | undefined,
    changedFields: log.changedFields,
    createdAt: log.createdAt,
  };
}

/**
 * 记录模型变更
 */
export async function recordChange(
  modelId: string,
  diff: ModelDiff,
  batchId: string
): Promise<ModelChangeLog> {
  const log = await prisma.modelChangeLog.create({
    data: {
      modelId,
      syncBatchId: batchId,
      changeType: diff.type,
      beforeData: diff.before,
      afterData: diff.after,
      changedFields: diff.changedFields || [],
      source: 'sync_script',
      validationStatus: 'valid',
    },
  });
  console.log(`[ChangeRecorder] Recorded ${diff.type} for model ${modelId}`);
  return toChangeLog(log)!;
}

/**
 * 批量记录变更
 */
export async function recordChanges(
  diffs: ModelDiff[],
  batchId: string,
  modelIdResolver: (modelCode: string) => string | undefined
): Promise<ModelChangeLog[]> {
  const logs: ModelChangeLog[] = [];
  for (const diff of diffs) {
    const modelId = modelIdResolver(diff.modelCode);
    if (!modelId) {
      console.warn(`[ChangeRecorder] Could not resolve modelId for ${diff.modelCode}`);
      continue;
    }
    const log = await recordChange(modelId, diff, batchId);
    logs.push(log);
  }
  console.log(`[ChangeRecorder] Recorded ${logs.length} changes`);
  return logs;
}

/**
 * 获取模型的变更历史
 */
export async function getModelChangeHistory(
  modelId: string,
  limit: number = 20
): Promise<ModelChangeLog[]> {
  const logs = await prisma.modelChangeLog.findMany({
    where: { modelId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return logs.map((log) => toChangeLog(log)!).filter(Boolean);
}

/**
 * 获取批次的变更记录
 */
export async function getBatchChanges(batchId: string): Promise<ModelChangeLog[]> {
  const logs = await prisma.modelChangeLog.findMany({
    where: { syncBatchId: batchId },
    orderBy: { createdAt: 'asc' },
  });
  return logs.map((log) => toChangeLog(log)!).filter(Boolean);
}

/**
 * 获取最近的变更记录
 */
export async function getRecentChanges(
  limit: number = 50,
  filter?: { modelId?: string; changeType?: string }
): Promise<ModelChangeLog[]> {
  const logs = await prisma.modelChangeLog.findMany({
    where: {
      ...(filter?.modelId ? { modelId: filter.modelId } : {}),
      ...(filter?.changeType ? { changeType: filter.changeType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return logs.map((log) => toChangeLog(log)!).filter(Boolean);
}

/**
 * 统计变更类型分布
 */
export async function getChangeTypeDistribution(): Promise<Record<string, number>> {
  const groups = await prisma.modelChangeLog.groupBy({
    by: ['changeType'],
    _count: { changeType: true },
  });
  return Object.fromEntries(groups.map((group) => [group.changeType, group._count.changeType]));
}

/**
 * 清理旧变更记录
 */
export async function cleanupOldChanges(keepCount: number = 1000): Promise<number> {
  const logs = await prisma.modelChangeLog.findMany({
    orderBy: { createdAt: 'desc' },
    skip: keepCount,
    select: { id: true },
  });
  if (logs.length === 0) return 0;
  const result = await prisma.modelChangeLog.deleteMany({
    where: { id: { in: logs.map((log) => log.id) } },
  });
  console.log(`[ChangeRecorder] Cleaned up ${result.count} old change logs`);
  return result.count;
}

/**
 * 生成变更摘要报告
 */
export function generateChangeSummary(diffs: ModelDiff[]): string {
  const counts = {
    NEW: diffs.filter(d => d.type === 'NEW').length,
    UPDATED: diffs.filter(d => d.type === 'UPDATED').length,
    UNCHANGED: diffs.filter(d => d.type === 'UNCHANGED').length,
    DEPRECATED: diffs.filter(d => d.type === 'DEPRECATED').length,
  };
  const parts: string[] = [];
  if (counts.NEW > 0) parts.push(`${counts.NEW} new`);
  if (counts.UPDATED > 0) parts.push(`${counts.UPDATED} updated`);
  if (counts.DEPRECATED > 0) parts.push(`${counts.DEPRECATED} deprecated`);
  if (counts.UNCHANGED > 0) parts.push(`${counts.UNCHANGED} unchanged`);
  return parts.join(', ') || 'no changes';
}
