/**
 * Sync Orchestrator — manages the full sync lifecycle.
 *
 * State machine: running → completed | failed | partial
 *
 * Flow:
 * 1. Create SyncBatch record (status=running)
 * 2. Adapter.fetch() → RawModelData[]
 * 3. Mapper.mapModel() → NormalizedModelData[]
 * 4. [if additionalAdapters] Fetch+map each, run CrossValidator → ConflictReport
 * 5. Writer.writeBatch() → SyncBatchResult
 * 6. Update SyncBatch record with results + validationSummary (status=completed|failed|partial)
 *
 * R-43: CrossValidator 接线——即使当前仅 1 个 adapter，框架也已就绪。
 * 当 additionalAdapters 非空时，自动执行多源交叉验证，冲突报告写入 validationSummary。
 */

import { prisma } from '../db/prisma';
import type { SyncAdapter } from './adapters/base';
import { mapModel } from './mappers';
import { writeBatch } from './writers';
import { crossValidator } from './cross-validator';
import type { SyncConfig, SyncBatchResult, NormalizedModelData } from './types/sync';

export class SyncOrchestrator {
  /**
   * @param adapter 主数据源 adapter
   * @param additionalAdapters 额外数据源（用于交叉验证，R-43）
   */
  constructor(
    private adapter: SyncAdapter,
    private additionalAdapters: SyncAdapter[] = [],
  ) {}

  /**
   * Execute a full sync batch.
   * @param config Sync configuration
   * @returns SyncBatchResult
   */
  async execute(config: SyncConfig): Promise<SyncBatchResult> {
    // 1. Create batch record
    const batch = await prisma.syncBatch.create({
      data: {
        batchCode: `SYNC-${Date.now()}`,
        source: config.source,
        sourceUrl: config.sourceUrl,
        status: 'running',
        totalRecords: 0,
        successRecords: 0,
        failedRecords: 0,
        operatorId: null,
      },
    });

    try {
      // 2. Fetch raw data from primary adapter
      const rawData = await this.adapter.fetch(config);

      if (config.dryRun) {
        // Dry run — 只统计不写入；批次状态必须落库，否则永远停在 running
        await prisma.syncBatch.update({
          where: { id: batch.id },
          data: {
            totalRecords: rawData.length,
            failedRecords: 0,
            status: 'completed',
            validationSummary: { dryRun: true, adapter: this.adapter.name },
          },
        });
        return {
          batchId: batch.id,
          totalRecords: rawData.length,
          successRecords: 0,
          failedRecords: 0,
          skippedRecords: rawData.length,
          status: 'completed',
          errors: [],
        };
      }

      // 3. Map raw → normalized
      const normalized = rawData.map(r => mapModel(r));

      // 4. Cross-validation (R-43)
      let conflictReport: import('./cross-validator').ConflictReport | null = null;

      if (this.additionalAdapters.length > 0) {
        const multiSourceData: Record<string, NormalizedModelData[]> = {
          [this.adapter.name]: normalized,
        };

        for (const extraAdapter of this.additionalAdapters) {
          try {
            const extraRaw = await extraAdapter.fetch(config);
            const extraNormalized = extraRaw.map(r => mapModel(r));
            multiSourceData[extraAdapter.name] = extraNormalized;
          } catch (err) {
            // Extra adapter failure shouldn't block the main sync
            console.warn(`[CrossValidator] adapter "${extraAdapter.name}" fetch failed:`, err);
          }
        }

        conflictReport = crossValidator.validate(multiSourceData);
      }

      // 5. Write batch
      const result = await writeBatch(normalized, batch.id);

      // 6. Build validation summary (R-43: cross-validation report)
      const validationSummary = {
        skipped: result.skippedRecords,
        adapter: this.adapter.name,
      };
      if (conflictReport) {
        ;(validationSummary as Record<string, unknown>).crossValidation = {
          totalModels: conflictReport.totalModels,
          modelsWithConflicts: conflictReport.modelsWithConflicts,
          totalConflicts: conflictReport.totalConflicts,
          conflicts: conflictReport.conflicts.slice(0, 50),
        };
      }

      // 7. Update batch record
      await prisma.syncBatch.update({
        where: { id: batch.id },
        data: {
          totalRecords: result.totalRecords,
          successRecords: result.successRecords,
          failedRecords: result.failedRecords,
          status: result.status,
          errorSamples: result.errors.length > 0
            ? result.errors.slice(0, 10)
            : undefined,
          validationSummary,
        },
      });

      return result;
    } catch (err) {
      // Mark batch as failed
      await prisma.syncBatch.update({
        where: { id: batch.id },
        data: {
          status: 'failed',
          errorSamples: {
            error: err instanceof Error ? err.message : String(err),
          },
        },
      });

      return {
        batchId: batch.id,
        totalRecords: 0,
        successRecords: 0,
        failedRecords: 1,
        skippedRecords: 0,
        status: 'failed',
        errors: [{
          modelCode: 'N/A',
          error: err instanceof Error ? err.message : String(err),
        }],
      };
    }
  }
}
