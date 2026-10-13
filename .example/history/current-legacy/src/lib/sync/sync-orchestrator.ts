/**
 * 同步编排器 (Sync Orchestrator)
 * 协调完整的模型数据同步流程
 */

import { getOpenRouterClient } from './adapters/openrouter';
import { getArenaClient } from './adapters/arena';
import { mapToStandardizedModels } from './mappers/openrouter-mapper';
import { mapToStandardizedScores } from './mappers/arena-mapper';
import { createBatch, completeBatch, failBatch } from './batch-manager';
import { computeDiff } from './diff-engine';
import { recordChanges } from './change-recorder';
import { batchUpsertModels } from './writers/model-writer';
import { batchUpsertPrices } from './writers/price-writer';
import { prisma } from '@/lib/db/prisma';
import type { SyncConfig, SyncResult, SyncPhase, ModelDiff } from './types/sync';
import type { StandardizedModel } from './types/openrouter';
import type { StandardizedScore } from './types/arena';

const DEFAULT_CONFIG: SyncConfig = {
  dryRun: false,
  sources: ['openrouter', 'arena'],
  timeout: 30000,
  retryCount: 3,
};

/**
 * 执行完整同步流程
 */
export async function executeFullSync(config: Partial<SyncConfig> = {}): Promise<SyncResult> {
  const startTime = new Date();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const phases: SyncPhase[] = [];
  
  console.log('[SyncOrchestrator] Starting full sync...');
  
  const batch = await createBatch('full', finalConfig);
  
  try {
    // 获取本地现有模型
    const localModels = (await prisma.aiModel.findMany({
      where: { deletedAt: null },
      include: {
        prices: {
          where: { isCurrent: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    })).map((model) => ({
      ...model,
      priceInput: model.prices[0] ? Number(model.prices[0].priceInput) : 0,
      priceOutput: model.prices[0] ? Number(model.prices[0].priceOutput) : 0,
    }));
    const localModelMap = new Map(localModels.map(m => [m.modelCode, m]));
    
    // 远程数据容器
    const remoteModels: StandardizedModel[] = [];
    const remoteScores: Map<string, StandardizedScore> = new Map();
    
    // OpenRouter数据获取
    if (finalConfig.sources?.includes('openrouter')) {
      const phase = await syncOpenRouter(finalConfig, remoteModels);
      phases.push(phase);
    }
    
    // Arena数据获取
    if (finalConfig.sources?.includes('arena')) {
      const phase = await syncArena(finalConfig, remoteScores);
      phases.push(phase);
    }
    
    // 合并数据
    const mergedModels = mergeModelData(remoteModels, remoteScores);
    
    // 执行比对
    const diffs = computeDiff(
      mergedModels as Record<string, any>[],
      Array.from(localModelMap.values()) as Record<string, any>[]
    );
    
    console.log(`[SyncOrchestrator] Diff results: ${diffs.length} changes detected`);
    
    // 执行写入
    let errors: string[] = [];
    let writeStats = { created: 0, updated: 0, deprecated: 0, errors: [] as string[] };
    let priceStats = { created: 0, updated: 0, errors: [] as string[] };
    if (!finalConfig.dryRun) {
      const writableDiffs = diffs.filter((diff) => diff.type !== 'UNCHANGED');
      const dataMap = new Map(mergedModels.map((model) => [model.modelCode, model as any]));
      writeStats = await batchUpsertModels(writableDiffs, dataMap);
      errors.push(...writeStats.errors);

      const persistedModels = await prisma.aiModel.findMany({
        where: { modelCode: { in: mergedModels.map((model) => model.modelCode) } },
        select: { id: true, modelCode: true },
      });
      const modelIdMap = new Map(persistedModels.map((model) => [model.modelCode, model.id]));
      const priceData = mergedModels
        .map((model) => {
          const modelId = modelIdMap.get(model.modelCode);
          if (!modelId) return null;
          return {
            modelId,
            priceInput: model.priceInput || 0,
            priceOutput: model.priceOutput || 0,
            pricePerRequest: model.pricePerRequest || 0,
            source: 'openrouter',
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      priceStats = await batchUpsertPrices(priceData);
      errors.push(...priceStats.errors);
      await recordChanges(writableDiffs, batch.id, (modelCode) => modelIdMap.get(modelCode));
    } else {
      console.log('[SyncOrchestrator] Dry run mode, skipping write phase');
    }
    
    // 完成批次
    const endTime = new Date();
    const result: SyncResult = {
      success: true,
      batchId: batch.id,
      phases,
      stats: {
        modelsFound: mergedModels.length,
        modelsNew: diffs.filter((d: ModelDiff) => d.type === 'NEW').length,
        modelsUpdated: diffs.filter((d: ModelDiff) => d.type === 'UPDATED').length,
        modelsDeprecated: diffs.filter((d: ModelDiff) => d.type === 'DEPRECATED').length,
        modelsUnchanged: diffs.filter((d: ModelDiff) => d.type === 'UNCHANGED').length,
        errors: errors.length,
        duration: endTime.getTime() - startTime.getTime(),
      },
      startedAt: startTime,
      completedAt: endTime,
    };
    
    await completeBatch(batch.id, {
      modelsFetched: result.stats.modelsFound,
      modelsCreated: writeStats.created,
      modelsUpdated: writeStats.updated,
      modelsDeleted: writeStats.deprecated,
    });
    
    console.log('[SyncOrchestrator] Full sync completed successfully');
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SyncOrchestrator] Sync failed:', errorMessage);
    
    await failBatch(batch.id, errorMessage);
    
    return {
      success: false,
      batchId: batch.id,
      phases,
      stats: {
        modelsFound: 0,
        modelsNew: 0,
        modelsUpdated: 0,
        modelsDeprecated: 0,
        modelsUnchanged: 0,
        errors: 1,
        duration: new Date().getTime() - startTime.getTime(),
      },
      errors: [errorMessage],
      startedAt: startTime,
      completedAt: new Date(),
    };
  }
}

/**
 * 同步OpenRouter数据
 */
async function syncOpenRouter(
  config: SyncConfig,
  remoteModels: StandardizedModel[]
): Promise<SyncPhase> {
  console.log('[SyncOrchestrator] Fetching OpenRouter data...');
  
  const start = Date.now();
  
  try {
    const client = getOpenRouterClient();
    const response = await client.fetchModels({ timeout: config.timeout });
    const mappedModels = mapToStandardizedModels(response);
    
    remoteModels.push(...mappedModels);
    
    const duration = Date.now() - start;
    console.log(`[SyncOrchestrator] OpenRouter: ${mappedModels.length} models fetched in ${duration}ms`);
    
    return {
      name: 'openrouter-fetch',
      status: 'completed',
      startedAt: new Date(start),
      completedAt: new Date(),
      stats: { processed: mappedModels.length, succeeded: mappedModels.length, failed: 0 },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SyncOrchestrator] OpenRouter fetch failed:', errorMessage);
    
    return {
      name: 'openrouter-fetch',
      status: 'failed',
      startedAt: new Date(start),
      completedAt: new Date(),
      errors: [errorMessage],
    };
  }
}

/**
 * 同步Arena数据
 */
async function syncArena(
  config: SyncConfig,
  remoteScores: Map<string, StandardizedScore>
): Promise<SyncPhase> {
  console.log('[SyncOrchestrator] Fetching Arena leaderboard...');
  
  const start = Date.now();
  
  try {
    const client = getArenaClient();
    const entries = await client.fetchLeaderboard({ timeout: config.timeout });
    const mappedScores = mapToStandardizedScores(entries);
    
    mappedScores.forEach((score: StandardizedScore) => {
      if (score.modelName) {
        remoteScores.set(score.modelName, score);
      }
    });
    
    const duration = Date.now() - start;
    console.log(`[SyncOrchestrator] Arena: ${mappedScores.length} scores fetched in ${duration}ms`);
    
    return {
      name: 'arena-fetch',
      status: 'completed',
      startedAt: new Date(start),
      completedAt: new Date(),
      stats: { processed: mappedScores.length, succeeded: mappedScores.length, failed: 0 },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SyncOrchestrator] Arena fetch failed:', errorMessage);
    
    return {
      name: 'arena-fetch',
      status: 'failed',
      startedAt: new Date(start),
      completedAt: new Date(),
      errors: [errorMessage],
    };
  }
}

/**
 * 合并模型数据与评分数据
 */
function mergeModelData(
  models: StandardizedModel[],
  scores: Map<string, StandardizedScore>
): StandardizedModel[] {
  return models.map(model => {
    const score = scores.get(model.modelCode);
    if (score) {
      return {
        ...model,
        rankingScore: score.actualScore,
      };
    }
    return model;
  });
}

/**
 * 获取同步状态
 */
export async function getSyncStatus(): Promise<{
  isRunning: boolean;
  lastBatch: any;
  stats: { totalBatches: number; successCount: number; failureCount: number };
}> {
  const [runningCount, lastBatch, totalBatches, successCount, failureCount] = await Promise.all([
    prisma.syncBatch.count({ where: { status: 'running' } }),
    prisma.syncBatch.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.syncBatch.count(),
    prisma.syncBatch.count({ where: { status: { in: ['success', 'completed'] } } }),
    prisma.syncBatch.count({ where: { status: 'failed' } }),
  ]);
  return {
    isRunning: runningCount > 0,
    lastBatch,
    stats: { totalBatches, successCount, failureCount },
  };
}
