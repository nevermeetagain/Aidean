/**
 * 评测Repository
 * 模型评测相关数据访问层
 */

import { prisma } from '@/lib/db/prisma';
import { BaseRepository, FindManyOptions, FindManyResult } from './base.repository';
import type { Evaluation, EvalStatus } from '@prisma/client';

class EvaluationRepository extends BaseRepository<Evaluation> {
  protected model = prisma.evaluation;

  /**
   * 按用户查找评测
   */
  async findByUser(userId: string, options?: FindManyOptions): Promise<FindManyResult<Evaluation>> {
    return this.findMany({
      ...options,
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 按状态查找评测
   */
  async findByStatus(status: EvalStatus, options?: FindManyOptions): Promise<FindManyResult<Evaluation>> {
    return this.findMany({
      ...options,
      where: { status, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取评测详情（含模型结果）
   */
  async findWithModels(evaluationId: string) {
    return prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        models: {
          include: {
            model: { select: { id: true, nameDisplay: true, modelCode: true } },
          },
        },
      },
    });
  }

  /**
   * 更新评测状态
   */
  async updateStatus(evaluationId: string, status: EvalStatus, progress?: number): Promise<Evaluation> {
    return prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status,
        ...(progress !== undefined ? { progress } : {}),
      } as any,
    });
  }

  /**
   * 保存评测结果
   */
  async saveResults(evaluationId: string, results: object, winnerModelId?: string): Promise<Evaluation> {
    return prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        results: results as any,
        ...(winnerModelId ? { winnerModelId } : {}),
        status: 'COMPLETED',
      },
    });
  }

  /**
   * 获取公开评测列表
   */
  async findPublic(options?: FindManyOptions): Promise<FindManyResult<Evaluation>> {
    return this.findMany({
      ...options,
      where: { status: 'COMPLETED', deletedAt: null },
      include: {
        user: { select: { id: true, nickname: true } },
        models: { select: { id: true, modelId: true, score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const evaluationRepo = new EvaluationRepository();
