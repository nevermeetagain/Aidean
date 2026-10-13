/**
 * 评分数据写入器
 * 处理模型评分的更新操作
 */

import { prisma } from '@/lib/db/prisma';

/**
 * 评分数据
 */
export interface ScoreWriteData {
  modelId: string;
  officialScore?: number;
  actualScore?: number;
  reviewScore?: number;
  selfTestScore?: number;
  reasoningScore?: number;
  codingScore?: number;
  mathScore?: number;
  multilingualScore?: number;
  creativityScore?: number;
  instructionScore?: number;
  safetyScore?: number;
  efficiencyScore?: number;
  valueScore?: number;
  compositeScore?: number;
  overallRank?: number;
  source?: string;
}

/**
 * 写入评分数据
 */
export async function upsertScore(
  data: ScoreWriteData
): Promise<{ id: string; action: 'created' | 'updated' }> {
  try {
    // 查找现有评分记录
    const existing = await prisma.modelScore.findFirst({
      where: {
        modelId: data.modelId,
      },
    });
    
    if (existing) {
      // 更新现有记录
      const score = await prisma.modelScore.update({
        where: { id: existing.id },
        data: {
          officialScore: data.officialScore,
          actualScore: data.actualScore,
          reviewScore: data.reviewScore,
          selfTestScore: data.selfTestScore,
          reasoningScore: data.reasoningScore,
          codingScore: data.codingScore,
          mathScore: data.mathScore,
          multilingualScore: data.multilingualScore,
          creativityScore: data.creativityScore,
          instructionScore: data.instructionScore,
          safetyScore: data.safetyScore,
          efficiencyScore: data.efficiencyScore,
          valueScore: data.valueScore,
          compositeScore: data.compositeScore,
          overallRank: data.overallRank,
          calcAt: new Date(),
        },
      });
      
      console.log(`[ScoreWriter] Updated score for model ${data.modelId}`);
      
      return { id: score.id, action: 'updated' };
    }
    
    // 创建新评分记录
    const score = await prisma.modelScore.create({
      data: {
        modelId: data.modelId,
        officialScore: data.officialScore || 0,
        actualScore: data.actualScore || 0,
        reviewScore: data.reviewScore || 0,
        selfTestScore: data.selfTestScore || 0,
        reasoningScore: data.reasoningScore,
        codingScore: data.codingScore,
        mathScore: data.mathScore,
        multilingualScore: data.multilingualScore,
        creativityScore: data.creativityScore,
        instructionScore: data.instructionScore,
        safetyScore: data.safetyScore,
        efficiencyScore: data.efficiencyScore,
        valueScore: data.valueScore,
        compositeScore: data.compositeScore || 0,
        overallRank: data.overallRank,
        calcAt: new Date(),
      },
    });
    
    console.log(`[ScoreWriter] Created score for model ${data.modelId}`);
    
    return { 
      id: score.id, 
      action: 'created' 
    };
  } catch (error) {
    console.error(`[ScoreWriter] Failed to upsert score for model ${data.modelId}:`, error);
    throw error;
  }
}

/**
 * 批量写入评分
 */
export async function batchUpsertScores(
  dataList: ScoreWriteData[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  const results = { created: 0, updated: 0, errors: [] as string[] };
  
  for (const data of dataList) {
    try {
      const result = await upsertScore(data);
      
      if (result.action === 'created') {
        results.created++;
      } else {
        results.updated++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.errors.push(`Failed to upsert score for ${data.modelId}: ${message}`);
    }
  }
  
  return results;
}

/**
 * 获取模型的当前评分
 */
export async function getCurrentScore(modelId: string) {
  return prisma.modelScore.findFirst({
    where: { modelId },
    orderBy: { calcAt: 'desc' },
  });
}

/**
 * 获取模型的评分历史
 */
export async function getScoreHistory(modelId: string, limit: number = 10) {
  return prisma.modelScore.findMany({
    where: { modelId },
    orderBy: { calcAt: 'desc' },
    take: limit,
  });
}
