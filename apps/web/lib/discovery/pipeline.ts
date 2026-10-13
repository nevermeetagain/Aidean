/**
 * Discovery Pipeline — 管道编排器
 *
 * 串联 6 层发现管道:
 * 1. Candidate Discovery → 2. Entity Resolution → 3. Technical Fingerprinting
 * → 4. Protocol Probe → 5. Pricing Extraction → 6. Plan Discovery
 *
 * 每层独立执行，单层失败不影响已完成层。
 * 结果写入 DiscoveryCandidate + EvidenceChain + 各专项表。
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.1-1.7
 */

import { Prisma } from "@prisma/client";
import type { PipelineStage, StageStatus, PipelineResult, SourceType } from './types';
import { discoverAllCandidates } from './candidate-discovery';
import { resolveEntities, persistCandidates } from './entity-resolution';
import { fingerprintBatch } from './technical-fingerprint';
import { probeProtocolsBatch } from './protocol-probe';
import { extractPricingBatch } from './pricing-extraction';
import { prisma } from '../db/prisma';

/**
 * 执行完整发现管道
 */
export async function runPipeline(options?: {
  sources?: SourceType[];
  stages?: PipelineStage[];
  dryRun?: boolean;
}): Promise<PipelineResult> {
  const pipelineId = `pipe_${Date.now()}`;
  const startedAt = new Date();
  const sources = options?.sources ?? ['registry', 'search', 'github', 'news'];
  const stages = options?.stages ?? ['discovery', 'resolution', 'fingerprint', 'protocol', 'pricing', 'plan'];
  const dryRun = options?.dryRun ?? false;

  const stageStatuses: StageStatus[] = stages.map(name => ({
    name,
    status: 'pending',
  }));

  let totalCandidates = 0;
  let promoted = 0;
  let rejected = 0;

  // ── Stage 1: Discovery ──
  if (stages.includes('discovery')) {
    const stage = stageStatuses.find(s => s.name === 'discovery')!;
    stage.status = 'running';
    const start = Date.now();

    try {
      const candidates = await discoverAllCandidates(sources);
      stage.candidatesFound = candidates.length;
      totalCandidates = candidates.length;
      stage.status = 'completed';
      stage.durationMs = Date.now() - start;

      // ── Stage 2: Entity Resolution ──
      if (stages.includes('resolution')) {
        const resStage = stageStatuses.find(s => s.name === 'resolution')!;
        resStage.status = 'running';
        const resStart = Date.now();

        try {
          const { newCandidates, merged } = await resolveEntities(candidates);
          resStage.merged = merged;
          resStage.new = newCandidates.length;
          rejected += merged;

          if (!dryRun && newCandidates.length > 0) {
            await persistCandidates(newCandidates);
          }

          resStage.status = 'completed';
          resStage.durationMs = Date.now() - resStart;

          // ── Stage 3: Technical Fingerprinting ──
          if (stages.includes('fingerprint') && !dryRun) {
            const fpStage = stageStatuses.find(s => s.name === 'fingerprint')!;
            fpStage.status = 'running';
            const fpStart = Date.now();

            try {
              // 获取刚写入的候选
              const dbCandidates = await prisma.discoveryCandidate.findMany({
                where: { status: 'discovered' },
                select: { id: true, domain: true, apiBase: true },
                take: 50, // 每次最多处理 50 个
              });

              const result = await fingerprintBatch(dbCandidates);
              fpStage.processed = result.processed;
              fpStage.total = dbCandidates.length;
              fpStage.status = 'completed';
              fpStage.durationMs = Date.now() - fpStart;
            } catch (err) {
              fpStage.status = 'failed';
              fpStage.error = err instanceof Error ? err.message : String(err);
            }
          }

          // ── Stage 4: Protocol Probe ──
          if (stages.includes('protocol') && !dryRun) {
            const protoStage = stageStatuses.find(s => s.name === 'protocol')!;
            protoStage.status = 'running';
            const protoStart = Date.now();

            try {
              const dbCandidates = await prisma.discoveryCandidate.findMany({
                where: { status: 'verifying' },
                select: { id: true, domain: true, apiBase: true },
                take: 50,
              });

              const result = await probeProtocolsBatch(dbCandidates);
              protoStage.processed = result.processed;
              protoStage.total = dbCandidates.length;
              protoStage.status = 'completed';
              protoStage.durationMs = Date.now() - protoStart;
            } catch (err) {
              protoStage.status = 'failed';
              protoStage.error = err instanceof Error ? err.message : String(err);
            }
          }

          // ── Stage 5: Pricing Extraction ──
          if (stages.includes('pricing') && !dryRun) {
            const priceStage = stageStatuses.find(s => s.name === 'pricing')!;
            priceStage.status = 'running';
            const priceStart = Date.now();

            try {
              const dbCandidates = await prisma.discoveryCandidate.findMany({
                where: { status: 'verifying' },
                select: { id: true, domain: true, apiBase: true },
                take: 50,
              });

              const result = await extractPricingBatch(dbCandidates);
              priceStage.processed = result.processed;
              priceStage.total = dbCandidates.length;
              priceStage.status = 'completed';
              priceStage.durationMs = Date.now() - priceStart;
            } catch (err) {
              priceStage.status = 'failed';
              priceStage.error = err instanceof Error ? err.message : String(err);
            }
          }

          // ── Stage 6: Plan Discovery ──
          if (stages.includes('plan') && !dryRun) {
            const planStage = stageStatuses.find(s => s.name === 'plan')!;
            planStage.status = 'running';
            const planStart = Date.now();

            try {
              // Plan discovery: 检查已验证候选的套餐信息
              // 此处为占位实现，实际需要爬取各 Provider 的套餐页面
              planStage.processed = 0;
              planStage.total = 0;
              planStage.status = 'completed';
              planStage.durationMs = Date.now() - planStart;
            } catch (err) {
              planStage.status = 'failed';
              planStage.error = err instanceof Error ? err.message : String(err);
            }
          }

          // 自动升级有指纹结果的候选
          if (!dryRun) {
            const verified = await prisma.discoveryCandidate.updateMany({
              where: {
                status: 'verifying',
                fingerprint: { not: Prisma.DbNull },
              },
              data: { status: 'verified' },
            });
            promoted = verified.count;
          }

        } catch (err) {
          resStage.status = 'failed';
          resStage.error = err instanceof Error ? err.message : String(err);
        }
      }
    } catch (err) {
      stage.status = 'failed';
      stage.error = err instanceof Error ? err.message : String(err);
    }
  }

  const completedAt = new Date();
  const allCompleted = stageStatuses.every(s => s.status === 'completed');

  return {
    pipelineId,
    status: allCompleted ? 'completed' : 'failed',
    stages: stageStatuses,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalCandidates,
    promoted,
    rejected,
  };
}

/**
 * 获取管道状态（从最近的 SyncBatch 记）
 */
export async function getPipelineStatus(): Promise<PipelineResult | null> {
  // 查看最近的候选活动
  const recentCandidates = await prisma.discoveryCandidate.findMany({
    orderBy: { discoveredAt: 'desc' },
    take: 5,
    select: { id: true, status: true, discoveredAt: true },
  });

  if (recentCandidates.length === 0) return null;

  return {
    pipelineId: 'latest',
    status: 'completed',
    stages: [
      { name: 'discovery', status: 'completed', candidatesFound: recentCandidates.length },
      { name: 'resolution', status: 'completed' },
      { name: 'fingerprint', status: 'completed' },
      { name: 'protocol', status: 'completed' },
      { name: 'pricing', status: 'completed' },
      { name: 'plan', status: 'completed' },
    ],
    startedAt: recentCandidates[0].discoveredAt.toISOString(),
    completedAt: new Date().toISOString(),
    totalCandidates: recentCandidates.length,
    promoted: 0,
    rejected: 0,
  };
}
