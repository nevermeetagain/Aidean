/**
 * Market Snapshot — 市场快照生成
 *
 * 每日生成全量/增量快照，记录当前市场状态。
 * 全量: 所有 Provider/Model/Station 的完整数据
 * 增量: 与上次快照的差异
 *
 * 依据: AI市场发现与智能引擎设计文档.md §2.2 MarketSnapshot
 */

import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

/**
 * 生成市场快照
 */
export async function generateSnapshot(
  type: 'full' | 'incremental' = 'full',
): Promise<{
  snapshotId: string;
  providerCount: number;
  modelCount: number;
  stationCount: number;
  candidateCount: number;
}> {
  const now = new Date();

  // 查询当前市场数据
  const [providers, models, stations, candidates] = await Promise.all([
    prisma.modelProvider.findMany({
      select: { id: true, name: true, website: true, code: true, isActive: true },
    }),
    prisma.aiModel.findMany({
      select: {
        id: true, nameDisplay: true, vendorId: true, contextLength: true,
        isActive: true, isMultiModal: true,
      },
    }),
    prisma.aPIStation.findMany({
      select: { id: true, name: true, baseUrl: true, isVerified: true, displayName: true },
    }),
    prisma.discoveryCandidate.findMany({
      select: { id: true, name: true, candidateType: true, status: true, domain: true },
    }),
  ]);

  // 构建快照数据
  const snapshotData = {
    generatedAt: now.toISOString(),
    providers: providers.map(p => ({
      id: p.id,
      name: p.name,
      website: p.website,
      code: p.code,
      isActive: p.isActive,
    })),
    models: models.map(m => ({
      id: m.id,
      name: m.nameDisplay,
      vendorId: m.vendorId,
      contextLength: m.contextLength,
      isActive: m.isActive,
      isMultiModal: m.isMultiModal,
    })),
    stations: stations.map(s => ({
      id: s.id,
      name: s.name,
      baseUrl: s.baseUrl,
      isVerified: s.isVerified,
    })),
    candidates: candidates.map(c => ({
      id: c.id,
      name: c.name,
      type: c.candidateType,
      status: c.status,
      domain: c.domain,
    })),
  };

  // 计算与上次快照的差异（增量模式）
  let diff: Prisma.InputJsonValue | undefined = undefined;
  if (type === 'incremental') {
    const lastSnapshot = await prisma.marketSnapshot.findFirst({
      where: { snapshotType: 'full' },
      orderBy: { snapshotDate: 'desc' },
    });
    if (lastSnapshot) {
      diff = computeDiff(
        lastSnapshot.data as Record<string, unknown>,
        snapshotData,
      ) as Prisma.InputJsonValue;
    }
  }

  // 生成摘要
  const summary = {
    totalProviders: providers.length,
    activeProviders: providers.filter(p => p.isActive).length,
    totalModels: models.length,
    activeModels: models.filter(m => m.isActive).length,
    totalStations: stations.length,
    activeStations: stations.filter(s => s.isVerified).length,
    pendingCandidates: candidates.filter(c => c.status === 'discovered').length,
    verifiedCandidates: candidates.filter(c => c.status === 'verified').length,
    promotedCandidates: candidates.filter(c => c.status === 'promoted').length,
  };

  // 写入数据库
  const snapshot = await prisma.marketSnapshot.create({
    data: {
      snapshotDate: now,
      snapshotType: type,
      providerCount: providers.length,
      modelCount: models.length,
      stationCount: stations.length,
      data: snapshotData as Prisma.InputJsonValue,
      diff,
      summary: summary as Prisma.InputJsonValue,
    },
  });

  return {
    snapshotId: snapshot.id,
    providerCount: providers.length,
    modelCount: models.length,
    stationCount: stations.length,
    candidateCount: candidates.length,
  };
}

/**
 * 计算两个快照的差异
 */
function computeDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};

  const oldProviders = (oldData.providers as Array<{ id: string; name: string }>) ?? [];
  const newProviders = (newData.providers as Array<{ id: string; name: string }>) ?? [];
  const oldProviderIds = new Set(oldProviders.map(p => p.id));
  const newProviderIds = new Set(newProviders.map(p => p.id));

  const addedProviders = newProviders.filter(p => !oldProviderIds.has(p.id));
  const removedProviders = oldProviders.filter(p => !newProviderIds.has(p.id));

  const oldModels = (oldData.models as Array<{ id: string; name: string }>) ?? [];
  const newModels = (newData.models as Array<{ id: string; name: string }>) ?? [];
  const oldModelIds = new Set(oldModels.map(m => m.id));
  const newModelIds = new Set(newModels.map(m => m.id));

  const addedModels = newModels.filter(m => !oldModelIds.has(m.id));
  const removedModels = oldModels.filter(m => !newModelIds.has(m.id));

  return {
    providers: {
      added: addedProviders.map(p => p.name),
      removed: removedProviders.map(p => p.name),
      addedCount: addedProviders.length,
      removedCount: removedProviders.length,
    },
    models: {
      added: addedModels.map(m => m.name),
      removed: removedModels.map(m => m.name),
      addedCount: addedModels.length,
      removedCount: removedModels.length,
    },
  };
}

/**
 * 获取快照列表
 */
export async function listSnapshots(limit = 30) {
  return prisma.marketSnapshot.findMany({
    orderBy: { snapshotDate: 'desc' },
    take: limit,
    select: {
      id: true,
      snapshotDate: true,
      snapshotType: true,
      providerCount: true,
      modelCount: true,
      stationCount: true,
      summary: true,
    },
  });
}
