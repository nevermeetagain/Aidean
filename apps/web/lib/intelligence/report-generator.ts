/**
 * Report Generator — 智能报告生成
 *
 * 生成每日市场智能报告，汇总:
 * - 新发现的平台
 * - 价格变动
 * - 能力变化
 * - 协议兼容性更新
 * - 市场趋势摘要
 *
 * 依据: AI市场发现与智能引擎设计文档.md §3.3
 */

import { prisma } from '../db/prisma';
import { detectChanges, type ChangeEvent } from './change-detector';

export interface IntelligenceReport {
  reportDate: string;
  summary: {
    totalProviders: number;
    totalModels: number;
    totalStations: number;
    pendingCandidates: number;
    newCandidates: number;
    promotedCandidates: number;
    changeEvents: number;
  };
  newProviders: Array<{ name: string; domain?: string | null; source: string }>;
  newModels: Array<{ name: string; providerName?: string }>;
  priceChanges: Array<{ entity: string; detail: Record<string, unknown> }>;
  capabilityUpdates: Array<{ modelId: string; capability: string; supported: boolean }>;
  protocolUpdates: Array<{ entityId: string; protocol: string; supported: boolean }>;
  changes: ChangeEvent[];
  trends: {
    providerGrowth: number;
    modelGrowth: number;
    avgPriceChange: number | null;
  };
}

/**
 * 生成每日智能报告
 */
export async function generateDailyReport(): Promise<IntelligenceReport> {
  const now = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 并行查询各项数据
  const [
    providers, models, stations,
    pendingCandidates, newCandidates, promotedCandidates,
    recentPriceRules, recentCapabilities, recentProtocols,
    changes,
  ] = await Promise.all([
    prisma.modelProvider.count(),
    prisma.aiModel.count(),
    prisma.aPIStation.count(),
    prisma.discoveryCandidate.count({ where: { status: 'discovered' } }),
    prisma.discoveryCandidate.count({
      where: { discoveredAt: { gte: yesterday } },
    }),
    prisma.discoveryCandidate.count({
      where: { status: 'promoted', promotedAt: { gte: yesterday } },
    }),
    prisma.priceRule.findMany({
      where: { createdAt: { gte: yesterday } },
      select: { modelId: true, providerId: true, inputPriceMinor: true, outputPriceMinor: true, source: true },
      take: 50,
    }),
    prisma.capabilityMatrix.findMany({
      where: { detectedAt: { gte: yesterday } },
      select: { modelId: true, capability: true, supported: true },
      take: 50,
    }),
    prisma.protocolCompatibility.findMany({
      where: { probedAt: { gte: yesterday } },
      select: { entityId: true, protocol: true, supported: true },
      take: 50,
    }),
    detectChanges(),
  ]);

  // 新发现的平台
  const newProviders = await prisma.discoveryCandidate.findMany({
    where: {
      status: 'promoted',
      promotedAt: { gte: yesterday },
      candidateType: 'provider',
    },
    select: { name: true, domain: true, sourceType: true },
    take: 20,
  });

  // 新模型（AiModel 使用 nameDisplay + vendor 关系）
  const newModels = await prisma.aiModel.findMany({
    where: { createdAt: { gte: yesterday } },
    select: {
      nameDisplay: true,
      vendor: { select: { name: true } },
    },
    take: 20,
  });

  // 价格变动
  const priceChanges = recentPriceRules.map(p => ({
    entity: p.modelId ?? p.providerId ?? 'unknown',
    detail: {
      inputPrice: p.inputPriceMinor?.toString(),
      outputPrice: p.outputPriceMinor?.toString(),
      source: p.source,
    },
  }));

  // 趋势计算
  const lastSnapshot = await prisma.marketSnapshot.findFirst({
    where: { snapshotType: 'full' },
    orderBy: { snapshotDate: 'desc' },
  });
  const prevSnapshot = await prisma.marketSnapshot.findFirst({
    where: { snapshotType: 'full', id: { not: lastSnapshot?.id } },
    orderBy: { snapshotDate: 'desc' },
  });

  const providerGrowth = lastSnapshot && prevSnapshot
    ? lastSnapshot.providerCount - prevSnapshot.providerCount
    : 0;
  const modelGrowth = lastSnapshot && prevSnapshot
    ? lastSnapshot.modelCount - prevSnapshot.modelCount
    : 0;

  return {
    reportDate: now.toISOString(),
    summary: {
      totalProviders: providers,
      totalModels: models,
      totalStations: stations,
      pendingCandidates,
      newCandidates,
      promotedCandidates,
      changeEvents: changes.length,
    },
    newProviders: newProviders.map(p => ({
      name: p.name,
      domain: p.domain,
      source: p.sourceType,
    })),
    newModels: newModels.map(m => ({
      name: m.nameDisplay,
      providerName: m.vendor?.name,
    })),
    priceChanges,
    capabilityUpdates: recentCapabilities.map(c => ({
      modelId: c.modelId,
      capability: c.capability,
      supported: c.supported,
    })),
    protocolUpdates: recentProtocols.map(p => ({
      entityId: p.entityId,
      protocol: p.protocol,
      supported: p.supported,
    })),
    changes,
    trends: {
      providerGrowth,
      modelGrowth,
      avgPriceChange: null,
    },
  };
}

/**
 * 获取报告列表（从快照摘要）
 */
export async function listReports(limit = 30) {
  return prisma.marketSnapshot.findMany({
    orderBy: { snapshotDate: 'desc' },
    take: limit,
    select: {
      id: true,
      snapshotDate: true,
      summary: true,
      providerCount: true,
      modelCount: true,
      stationCount: true,
    },
  });
}
