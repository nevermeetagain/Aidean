import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { ScoreValues, WeightsSnapshot } from "./types";

/**
 * ranking 模型榜单域 repository：Prisma 数据访问层；仅被本域 rankService 调用。
 * 所有方法支持以末位参数注入 PrismaClient（默认取 lib/db/prisma 单例），便于测试隔离与环境替换。
 *
 * R-34：getScores 现在读取 13 维评分（4 主维 + 9 扩展维），
 * bumpScoreVersion 写回 13 维评分 + 13 维权重快照。
 */
export const rankingRepository = {
  /** 生效中的维度权重配置（ranking_weights.isActive=true，按 sortOrder 升序） */
  async listActiveWeights(client: PrismaClient = prisma) {
    return client.rankingWeight.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  },

  /** 全量当前版本评分行（isCurrent=true），携带 13 维原始分供重算 */
  async getScores(client: PrismaClient = prisma) {
    return client.modelScore.findMany({
      where: { isCurrent: true },
      select: {
        modelId: true,
        calcVersion: true,
        officialScore: true,
        actualScore: true,
        reviewScore: true,
        selfTestScore: true,
        reasoningScore: true,
        codingScore: true,
        mathScore: true,
        multilingualScore: true,
        creativityScore: true,
        instructionScore: true,
        safetyScore: true,
        efficiencyScore: true,
        valueScore: true,
        model: { select: { id: true } },
      },
    });
  },

  /**
   * 版本化写回：新建 calcVersion=currentVersion+1 行并置 isCurrent=true，
   * 同事务把该模型其余 current 行置 false；权重快照随行落入 *_weight 冗余列。
   * 若目标版本行已存在（异常残留态），走 update 分支复原为当前行。
   *
   * R-34：现在写回 13 维评分 + 13 维权重。
   */
  async bumpScoreVersion(
    input: {
      modelId: string;
      currentVersion: number;
      compositeScore: number;
      scores: ScoreValues;
      weights: WeightsSnapshot;
    },
    client: PrismaClient = prisma,
  ) {
    const nextVersion = input.currentVersion + 1;
    const now = new Date();
    const w = input.weights;
    const s = input.scores;
    await client.$transaction([
      client.modelScore.updateMany({
        where: { modelId: input.modelId, isCurrent: true },
        data: { isCurrent: false },
      }),
      client.modelScore.upsert({
        where: {
          modelId_calcVersion: { modelId: input.modelId, calcVersion: nextVersion },
        },
        update: {
          compositeScore: input.compositeScore,
          isCurrent: true,
          calcAt: now,
          officialScore: s.official ?? null,
          actualScore: s.actual ?? null,
          reviewScore: s.review ?? null,
          selfTestScore: s.selfTest ?? null,
          reasoningScore: s.reasoning ?? null,
          codingScore: s.coding ?? null,
          mathScore: s.math ?? null,
          multilingualScore: s.multilingual ?? null,
          creativityScore: s.creativity ?? null,
          instructionScore: s.instruction ?? null,
          safetyScore: s.safety ?? null,
          efficiencyScore: s.efficiency ?? null,
          valueScore: s.value ?? null,
          officialWeight: w.official ?? 0,
          actualWeight: w.actual ?? 0,
          reviewWeight: w.review ?? 0,
          selfTestWeight: w.selfTest ?? 0,
          reasoningWeight: w.reasoning ?? 0,
          codingWeight: w.coding ?? 0,
          mathWeight: w.math ?? 0,
          multilingualWeight: w.multilingual ?? 0,
          creativityWeight: w.creativity ?? 0,
          instructionWeight: w.instruction ?? 0,
          safetyWeight: w.safety ?? 0,
          efficiencyWeight: w.efficiency ?? 0,
          valueWeight: w.value ?? 0,
        },
        create: {
          modelId: input.modelId,
          calcVersion: nextVersion,
          officialScore: s.official ?? null,
          actualScore: s.actual ?? null,
          reviewScore: s.review ?? null,
          selfTestScore: s.selfTest ?? null,
          reasoningScore: s.reasoning ?? null,
          codingScore: s.coding ?? null,
          mathScore: s.math ?? null,
          multilingualScore: s.multilingual ?? null,
          creativityScore: s.creativity ?? null,
          instructionScore: s.instruction ?? null,
          safetyScore: s.safety ?? null,
          efficiencyScore: s.efficiency ?? null,
          valueScore: s.value ?? null,
          compositeScore: input.compositeScore,
          officialWeight: w.official ?? 0,
          actualWeight: w.actual ?? 0,
          reviewWeight: w.review ?? 0,
          selfTestWeight: w.selfTest ?? 0,
          reasoningWeight: w.reasoning ?? 0,
          codingWeight: w.coding ?? 0,
          mathWeight: w.math ?? 0,
          multilingualWeight: w.multilingual ?? 0,
          creativityWeight: w.creativity ?? 0,
          instructionWeight: w.instruction ?? 0,
          safetyWeight: w.safety ?? 0,
          efficiencyWeight: w.efficiency ?? 0,
          valueWeight: w.value ?? 0,
          isCurrent: true,
          calcAt: now,
        },
      }),
    ]);
  },
} as const;
