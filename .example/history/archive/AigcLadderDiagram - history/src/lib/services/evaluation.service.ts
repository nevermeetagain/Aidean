/**
 * 评测Service
 * 模型评测业务逻辑层
 */

import { evaluationRepo } from '@/lib/repositories';
import { Errors } from '@/lib/api/errors';
import type { EvalStatus } from '@prisma/client';

class EvaluationService {
  /**
   * 获取评测详情
   */
  async getEvaluation(evaluationId: string) {
    const evaluation = await evaluationRepo.findWithModels(evaluationId);
    if (!evaluation) throw Errors.notFound('评测');
    return evaluation;
  }

  /**
   * 获取用户评测列表
   */
  async listUserEvaluations(userId: string, options?: { page?: number; limit?: number }) {
    return evaluationRepo.findByUser(userId, options);
  }

  /**
   * 获取公开评测列表
   */
  async listPublicEvaluations(options?: { page?: number; limit?: number }) {
    return evaluationRepo.findPublic(options);
  }

  /**
   * 创建评测
   */
  async createEvaluation(data: {
    userId: string;
    prompt: string;
    evalType?: string;
    comparisonMode?: string;
    config?: object;
    criteria?: object;
  }) {
    return evaluationRepo.create({
      ...data,
      status: 'PENDING',
    });
  }

  /**
   * 更新评测状态
   */
  async updateStatus(evaluationId: string, status: EvalStatus, progress?: number) {
    const evaluation = await evaluationRepo.findById(evaluationId);
    if (!evaluation) throw Errors.notFound('评测');
    return evaluationRepo.updateStatus(evaluationId, status, progress);
  }

  /**
   * 保存评测结果
   */
  async saveResults(evaluationId: string, results: object, winnerModelId?: string) {
    const evaluation = await evaluationRepo.findById(evaluationId);
    if (!evaluation) throw Errors.notFound('评测');
    return evaluationRepo.saveResults(evaluationId, results, winnerModelId);
  }

  /**
   * 删除评测（软删除）
   */
  async deleteEvaluation(evaluationId: string) {
    const evaluation = await evaluationRepo.findById(evaluationId);
    if (!evaluation) throw Errors.notFound('评测');
    return evaluationRepo.softDelete(evaluationId);
  }
}

export const evaluationService = new EvaluationService();
