import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { rankingRepository } from "./repository";
import { ALL_DIMENSIONS } from "./types";
import type { RecapResult, ScoreDimension, ScoreValues, WeightsSnapshot } from "./types";

/** dimension 取值归一：兼容 schema 注释里的历史别名 self → selfTest；未识别维度忽略 */
function normalizeDimension(dimension: string): ScoreDimension | null {
  const key = dimension.trim().toLowerCase();
  if (key === "selftest" || key === "self") return "selfTest";
  return ALL_DIMENSIONS.includes(key as ScoreDimension) ? (key as ScoreDimension) : null;
}

/** Prisma Decimal/number → number | undefined（null 不能折算成 0，否则会污染"缺维"语义） */
const toNumber = (value: unknown): number | undefined =>
  value === null || value === undefined ? undefined : Number(value);

/**
 * 纯函数：13 维加权平均 composite = Σ(score_i × w_i) / Σ(w_i)，
 * 仅计入「有分数且权重>0」的维度（缺维跳过并归一化权重和）。
 * 结果保留两位小数，round half up。
 * 无任何可用维度、或有效权重和为零时抛错（fail-fast，防止 0 分污染榜单排序）。
 *
 * R-34 集成：9 维扩展评分（reasoning/coding/math/multilingual/creativity/
 * instruction/safety/efficiency/value）现在参与 composite 计算。
 * 扩展维度默认权重为 0（禁用），管理员可通过权重管理 UI 启用。
 * 4 主维默认权重各 0.25，9 扩展维默认权重各 0，所以默认行为与之前一致。
 */
export function computeComposite(scores: ScoreValues, weights: WeightsSnapshot): number {
  let weighted = 0;
  let weightSum = 0;
  for (const dim of ALL_DIMENSIONS) {
    const score = scores[dim];
    const weight = weights[dim];
    if (score === undefined || !Number.isFinite(score)) continue;
    if (weight === undefined || !(weight > 0)) continue;
    weighted += score * weight;
    weightSum += weight;
  }
  if (!(weightSum > 0)) {
    throw new Error("排名重算失败：无可用评分数值或有效权重为零");
  }
  return Math.round((weighted / weightSum) * 100) / 100;
}

export const rankService = {
  /**
   * 按 ranking_weights(isActive) 对 model_scores(isCurrent) 全量重算 composite_score。
   * 版本化写回：每个模型新建 calcVersion+1 行（isCurrent=true），旧行全部置 false，
   * 权重快照随行落库；同时返回本次使用的权重快照。
   * 个别模型缺失评分数值时跳过（不计入 updated），不中断整批重算。
   *
   * R-34：现在读取 13 维评分（4 主维 + 9 扩展维），但只有权重>0 且有分数的维度参与计算。
   */
  async recap(client: PrismaClient = prisma): Promise<RecapResult> {
    const [weightRows, scoreRows] = await Promise.all([
      rankingRepository.listActiveWeights(client),
      rankingRepository.getScores(client),
    ]);

    const weights: WeightsSnapshot = {};
    for (const row of weightRows) {
      const dim = normalizeDimension(row.dimension);
      const weight = Number(row.weight);
      if (dim !== null && Number.isFinite(weight) && weight > 0) {
        weights[dim] = weight;
      }
    }

    let updated = 0;
    for (const row of scoreRows) {
      const scores: ScoreValues = {
        official: toNumber(row.officialScore),
        actual: toNumber(row.actualScore),
        review: toNumber(row.reviewScore),
        selfTest: toNumber(row.selfTestScore),
        reasoning: toNumber(row.reasoningScore),
        coding: toNumber(row.codingScore),
        math: toNumber(row.mathScore),
        multilingual: toNumber(row.multilingualScore),
        creativity: toNumber(row.creativityScore),
        instruction: toNumber(row.instructionScore),
        safety: toNumber(row.safetyScore),
        efficiency: toNumber(row.efficiencyScore),
        value: toNumber(row.valueScore),
      };
      let composite: number;
      try {
        composite = computeComposite(scores, weights);
      } catch {
        continue; // 缺数模型等待数据补齐后的下一次 recap 收录
      }
      await rankingRepository.bumpScoreVersion(
        {
          modelId: row.modelId,
          currentVersion: row.calcVersion,
          compositeScore: composite,
          scores,
          weights,
        },
        client,
      );
      updated += 1;
    }

    return { updated, weights };
  },
};
