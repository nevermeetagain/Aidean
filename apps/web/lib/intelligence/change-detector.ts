/**
 * Change Detector — 变更检测
 *
 * 对比最新快照与上一次快照，检测变更并生成变更事件。
 * 变更类型: 新增 Provider/Model、价格变动、能力变化、状态变更
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.9 变更检测
 */

import { prisma } from '../db/prisma';

export interface ChangeEvent {
  type: 'provider_added' | 'provider_removed' | 'model_added' | 'model_removed' | 'price_changed' | 'status_changed';
  entityName: string;
  entityType: 'provider' | 'model' | 'station';
  detail: Record<string, unknown>;
  detectedAt: string;
}

/**
 * 检测最新快照与上一次的变更
 */
export async function detectChanges(): Promise<ChangeEvent[]> {
  const events: ChangeEvent[] = [];
  const now = new Date().toISOString();

  // 获取最近两个快照
  const snapshots = await prisma.marketSnapshot.findMany({
    where: { snapshotType: 'full' },
    orderBy: { snapshotDate: 'desc' },
    take: 2,
  });

  if (snapshots.length < 2) {
    return events; // 不足两个快照，无法比较
  }

  const [latest, previous] = snapshots;
  const diff = latest.diff as Record<string, unknown> | null;

  if (!diff) {
    // 如果没有预计算的 diff，从 data 计算
    return events;
  }

  // 解析 diff 中的变更
  const providerDiff = diff.providers as {
    added: string[];
    removed: string[];
    addedCount: number;
    removedCount: number;
  } | undefined;

  if (providerDiff) {
    for (const name of providerDiff.added) {
      events.push({
        type: 'provider_added',
        entityName: name,
        entityType: 'provider',
        detail: { action: 'added' },
        detectedAt: now,
      });
    }
    for (const name of providerDiff.removed) {
      events.push({
        type: 'provider_removed',
        entityName: name,
        entityType: 'provider',
        detail: { action: 'removed' },
        detectedAt: now,
      });
    }
  }

  const modelDiff = diff.models as {
    added: string[];
    removed: string[];
    addedCount: number;
    removedCount: number;
  } | undefined;

  if (modelDiff) {
    for (const name of modelDiff.added) {
      events.push({
        type: 'model_added',
        entityName: name,
        entityType: 'model',
        detail: { action: 'added' },
        detectedAt: now,
      });
    }
    for (const name of modelDiff.removed) {
      events.push({
        type: 'model_removed',
        entityName: name,
        entityType: 'model',
        detail: { action: 'removed' },
        detectedAt: now,
      });
    }
  }

  // 检测价格变更
  const priceChanges = await detectPriceChanges();
  events.push(...priceChanges);

  // 写入变更日志
  for (const event of events) {
    await prisma.evidenceChain.create({
      data: {
        evidenceType: 'change',
        claim: `${event.type}: ${event.entityName}`,
        source: 'observed',
        confidence: 0.9,
        evidenceData: {
          ...event.detail,
          type: event.type,
          entityType: event.entityType,
          entityName: event.entityName,
        },
      },
    });
  }

  return events;
}

/**
 * 检测价格变更
 * 对比最近两个 PriceRule 的变化
 */
async function detectPriceChanges(): Promise<ChangeEvent[]> {
  const events: ChangeEvent[] = [];
  const now = new Date().toISOString();

  // 获取最近 24 小时内创建或更新的价格规则
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPrices = await prisma.priceRule.findMany({
    where: {
      OR: [
        { createdAt: { gte: yesterday } },
        { updatedAt: { gte: yesterday } },
      ],
    },
    select: {
      id: true,
      modelId: true,
      providerId: true,
      inputPriceMinor: true,
      outputPriceMinor: true,
      source: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  for (const price of recentPrices) {
    // 如果是今天创建的，说明是新价格
    if (price.createdAt >= yesterday) {
      events.push({
        type: 'price_changed',
        entityName: price.modelId ?? price.providerId ?? 'unknown',
        entityType: 'model',
        detail: {
          action: 'price_added',
          inputPrice: price.inputPriceMinor?.toString(),
          outputPrice: price.outputPriceMinor?.toString(),
          source: price.source,
        },
        detectedAt: now,
      });
    }
  }

  return events;
}

/**
 * 获取最近的变更事件
 */
export async function getRecentChanges(limit = 50): Promise<ChangeEvent[]> {
  const evidence = await prisma.evidenceChain.findMany({
    where: { evidenceType: 'change' },
    orderBy: { collectedAt: 'desc' },
    take: limit,
    select: {
      claim: true,
      evidenceData: true,
      collectedAt: true,
    },
  });

  return evidence.map(e => {
    const data = e.evidenceData as Record<string, unknown>;
    return {
      type: data.type as ChangeEvent['type'],
      entityName: data.entityName as string,
      entityType: data.entityType as ChangeEvent['entityType'],
      detail: data,
      detectedAt: e.collectedAt.toISOString(),
    };
  });
}
