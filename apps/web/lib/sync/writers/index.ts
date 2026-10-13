/**
 * Sync writers — UPSERT normalized data to Prisma.
 * Only sync-owned fields are written (D-2=C).
 * Human-owned fields are never touched in UPDATE.
 *
 * R-09 修复：dedup.shouldSkip() 已接线到 upsertModel() 的 UPDATE 分支。
 * 当 checksum 与上次同步一致时，跳过 UPSERT + 不写 ModelChangeLog，
 * 返回 action='skipped'，由 writeBatch 统计入 skippedRecords。
 *
 * D1 修复：CREATE 分支不再硬编码 vendorId: ''，改为 resolveVendor() 解析真实 Vendor ID。
 * D5 修复：persistPrices 持久化 unit 字段，不再丢弃计价粒度信息。
 */

import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { shouldSkip } from './dedup';
import type { NormalizedModelData, NormalizedPriceData, NormalizedBenchmarkData, SyncBatchResult, SyncModelResult } from '../types/sync';

/**
 * D1 修复：resolveVendor — 按 vendor code 查找或创建 Vendor 记录，返回真实 vendorId。
 * 设计文档要求"vendor 先于 model 落库，vendorId 由 vendor upsert 结果回填"。
 * 之前 CREATE 分支硬编码 vendorId: '' 导致 FK 违约，此处修复。
 *
 * 策略：
 * - 有 vendorName → 归一化为 code（lowercase + slugify），按 code 查找 Vendor
 * - 找到 → 返回 id；未找到 → 创建新 Vendor（name=vendorName, code=slug）
 * - 无 vendorName → 使用 "unknown" 占位 Vendor（自动创建或查找已有）
 */
const UNKNOWN_VENDOR_CODE = 'unknown';

async function resolveVendor(vendorName?: string): Promise<string> {
  const code = vendorName && vendorName.trim()
    ? vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : UNKNOWN_VENDOR_CODE;

  // 查找已有 Vendor（不过滤软删：软删 vendor 的唯一 code 仍占用，须复用而非重建）
  const existing = await prisma.vendor.findFirst({
    where: { code },
    select: { id: true },
  });
  if (existing) return existing.id;

  // 创建新 Vendor
  try {
    const created = await prisma.vendor.create({
      data: {
        code,
        name: vendorName?.trim() || 'Unknown',
        nameEn: vendorName?.trim() || undefined,
        isActive: code !== UNKNOWN_VENDOR_CODE,
      },
    });
    return created.id;
  } catch (err) {
    // 并发竞态：writeBatch 以 Promise.allSettled 并发 upsert，同 code vendor
    // 会被多个模型同时 create（P2002 unique code）。复查并复用竞态胜者。
    const winner = await prisma.vendor.findFirst({
      where: { code },
      select: { id: true },
    });
    if (winner) return winner.id;
    throw err;
  }
}

/**
 * Persist normalized prices for a model.
 * Marks existing current prices as non-current, then inserts new price rows.
 * Only called when data.prices is non-empty.
 *
 * D5 修复：持久化 billingUnit 字段（之前 mapper 提取了 unit 但 writer 丢弃了）。
 */
async function persistPrices(
  modelId: string,
  prices: NormalizedPriceData[],
  batchId: string,
): Promise<void> {
  // Mark existing current prices as non-current (superseded by new sync data)
  await prisma.modelPrice.updateMany({
    where: { modelId, isCurrent: true },
    data: { isCurrent: false, effectiveUntil: new Date() },
  });

  // Insert new price rows
  for (const price of prices) {
    await prisma.modelPrice.create({
      data: {
        modelId,
        priceInput: price.inputPrice,
        priceOutput: price.outputPrice,
        billingCurrency: price.currency || 'CNY',
        billingMode: 'PER_TOKEN',
        billingUnit: price.unit || 'per_1k_tokens',
        effectiveFrom: price.effectiveAt,
        isCurrent: true,
        sourceType: 'CRAWLER',
        sourceName: `sync:${batchId.slice(0, 8)}`,
        notes: `Auto-synced from batch ${batchId}`,
      },
    });
  }
}

/**
 * Persist normalized benchmarks for a model.
 * Inserts new benchmark rows (does not update existing — benchmarks are append-only
 * with verifiedStatus controlling visibility).
 * Only called when data.benchmarks is non-empty.
 *
 * D4 修复：写入前检查是否已存在相同 (modelId, benchmarkType, sourceType, testDate) 记录，
 * 若存在则跳过（配合 schema @@unique 约束防重复）。
 */
async function persistBenchmarks(
  modelId: string,
  benchmarks: NormalizedBenchmarkData[],
  batchId: string,
): Promise<void> {
  for (const bench of benchmarks) {
    // D4: 查重 — 跳过已存在的相同 benchmark 记录
    const dup = await prisma.benchmark.findFirst({
      where: {
        modelId,
        benchmarkType: bench.benchmarkType,
        sourceType: 'THIRD_PARTY',
        testDate: bench.testDate,
      },
      select: { id: true },
    });
    if (dup) continue;

    await prisma.benchmark.create({
      data: {
        modelId,
        benchmarkType: bench.benchmarkType,
        totalScore: bench.totalScore,
        scores: bench.scores,
        testDate: bench.testDate,
        sourceName: bench.sourceName,
        sourceType: 'THIRD_PARTY',
        rawData: {
          syncBatchId: batchId,
          syncedAt: new Date().toISOString(),
        },
        verifiedStatus: 0, // 未审核 — sync 导入的 benchmark 需人工审核后才参与排名
      },
    });
  }
}

/**
 * UPSERT a single model + related prices/benchmarks.
 * Only sync-owned fields are SET in the UPDATE branch.
 * D-2=C R-09: 在 UPDATE 前检查 checksum，未变化则跳过。
 * L3-2 修复：prices → ModelPrice 表、benchmarks → Benchmark 表持久化补齐。
 * D1 修复：CREATE 分支使用 resolveVendor() 解析真实 vendorId。
 */
export async function upsertModel(
  data: NormalizedModelData,
  batchId: string
): Promise<SyncModelResult> {
  try {
    const existing = await prisma.aiModel.findFirst({
      where: { modelCode: data.modelCode, deletedAt: null },
      select: { id: true, contextLength: true, parameterCount: true },
    });

    if (existing) {
      // R-09: dedup 检查 — checksum 一致则跳过
      const skip = await shouldSkip(data.modelCode, data.checksum);
      if (skip) {
        return { modelCode: data.modelCode, action: 'skipped' };
      }

      // UPDATE — only sync-owned fields (D-2=C, R-42: now includes benchmarkScore/popularityScore/deprecatedAt)
      await prisma.aiModel.update({
        where: { id: existing.id },
        data: {
          contextLength: data.contextLength,
          parameterCount: data.parameterCount,
          isOpenSource: data.isOpenSource,
          isMultiModal: data.isMultiModal,
          isReasoning: data.isReasoning,
          isCodingOptimized: data.isCodingOptimized,
          officialUrl: data.officialUrl,
          docsUrl: data.docsUrl,
          apiUrl: data.apiUrl,
          githubUrl: data.githubUrl,
          paperUrl: data.paperUrl,
          publishedAt: data.publishedAt,
          deprecatedAt: data.deprecatedAt,
          status: data.status as 'ACTIVE' | 'INACTIVE' | 'DEPRECATED' | 'BETA' | undefined,
          benchmarkScore: data.benchmarkScore,
          popularityScore: data.popularityScore,
        },
      });

      // Log the change
      await prisma.modelChangeLog.create({
        data: {
          modelId: existing.id,
          syncBatchId: batchId,
          changeType: 'SYNC',
          beforeData: { contextLength: existing.contextLength, parameterCount: existing.parameterCount } as unknown as Prisma.InputJsonValue,
          afterData: data as unknown as Prisma.InputJsonValue,
          changedFields: ['contextLength', 'status', 'officialUrl'],
          source: 'sync_script',
          checksum: data.checksum,
        },
      });

      // L3-2: 持久化 prices → ModelPrice 表 + benchmarks → Benchmark 表
      if (data.prices?.length) {
        await persistPrices(existing.id, data.prices, batchId);
      }
      if (data.benchmarks?.length) {
        await persistBenchmarks(existing.id, data.benchmarks, batchId);
      }

      return { modelCode: data.modelCode, action: 'updated' };
    } else {
      // CREATE — sync creates new models with minimal fields.
      // D1 修复：vendorId 由 resolveVendor() 从 adapter 提供的 vendorName 解析真实 Vendor ID，
      // 不再硬编码空字符串（空字符串违反 FK 约束导致 INSERT 失败）。
      // nameDisplay/slug 仍为占位值，admin 后续可编辑。
      const vendorId = await resolveVendor(data.vendorName);
      const created = await prisma.aiModel.create({
        data: {
          modelCode: data.modelCode,
          nameDisplay: data.modelCode,
          slug: data.modelCode.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          vendorId,
          modelType: 'CHAT',
          protocol: 'OPENAI',
          contextLength: data.contextLength,
          parameterCount: data.parameterCount,
          isOpenSource: data.isOpenSource,
          isMultiModal: data.isMultiModal,
          isReasoning: data.isReasoning,
          isCodingOptimized: data.isCodingOptimized,
          officialUrl: data.officialUrl,
          docsUrl: data.docsUrl,
          apiUrl: data.apiUrl,
          githubUrl: data.githubUrl,
          paperUrl: data.paperUrl,
          publishedAt: data.publishedAt,
          status: 'ACTIVE',
          isActive: true,
          visibility: 'HIDDEN',
        },
      });

      // Log creation
      await prisma.modelChangeLog.create({
        data: {
          modelId: created.id,
          syncBatchId: batchId,
          changeType: 'CREATE',
          beforeData: Prisma.JsonNull,
          afterData: data as unknown as Prisma.InputJsonValue,
          changedFields: ['modelCode', 'contextLength', 'status'],
          source: 'sync_script',
          checksum: data.checksum,
        },
      });

      // L3-2: 新模型也持久化 prices + benchmarks（如有）
      if (data.prices?.length) {
        await persistPrices(created.id, data.prices, batchId);
      }
      if (data.benchmarks?.length) {
        await persistBenchmarks(created.id, data.benchmarks, batchId);
      }

      return { modelCode: data.modelCode, action: 'created' };
    }
  } catch (err) {
    return {
      modelCode: data.modelCode,
      action: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Write a batch of models in chunks (≤500 per audit requirement).
 */
export async function writeBatch(
  models: NormalizedModelData[],
  batchId: string,
  chunkSize = 500
): Promise<SyncBatchResult> {
  const results: SyncModelResult[] = [];

  for (let i = 0; i < models.length; i += chunkSize) {
    const chunk = models.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(
      chunk.map(m => upsertModel(m, batchId))
    );
    for (const r of chunkResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        results.push({
          modelCode: 'unknown',
          action: 'failed',
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }
  }

  const successRecords = results.filter(r => r.action === 'created' || r.action === 'updated').length;
  const skippedRecords = results.filter(r => r.action === 'skipped').length;
  const failedRecords = results.filter(r => r.action === 'failed').length;

  return {
    batchId,
    totalRecords: models.length,
    successRecords,
    failedRecords,
    skippedRecords,
    status: failedRecords === 0 ? 'completed' : failedRecords === models.length ? 'failed' : 'partial',
    errors: results
      .filter(r => r.action === 'failed')
      .map(r => ({ modelCode: r.modelCode, error: r.error ?? 'unknown' })),
  };
}
