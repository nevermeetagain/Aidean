import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { MatrixItem } from "./types";

/**
 * ladder 天梯图域 repository（Task L.3.2/L.3.3）：Prisma 数据访问层；仅被本域 service 调用。
 * 所有方法支持末位注入 PrismaClient（默认 lib/db/prisma 单例），便于测试隔离与环境替换。
 * Decimal/Float 统一转 number；缺失关联行（无 isCurrent 评分/价格）折叠为 null。
 */

const numOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export const ladderRepository = {
  /**
   * models 矩阵数据源：ai_models(isActive & status=ACTIVE & 未软删)
   * ⋈ vendors(tierLevel/nameCn 素材) ⋈ model_scores(isCurrent 取1) ⋈ model_prices(isCurrent 取1)，
   * 组装为平铺 MatrixItem 行。
   */
  async getModelsForMatrix(client: PrismaClient = prisma): Promise<MatrixItem[]> {
    const rows = await client.aiModel.findMany({
      where: { isActive: true, status: "ACTIVE", deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        vendor: { select: { code: true, name: true, tierLevel: true, brandColor: true, country: true, priority: true } },
        scores: {
          where: { isCurrent: true },
          take: 1,
          select: {
            compositeScore: true,
            officialScore: true,
            actualScore: true,
            reviewScore: true,
            selfTestScore: true,
          },
        },
        prices: {
          where: { isCurrent: true },
          take: 1,
          select: { priceInput: true, priceOutput: true },
        },
      },
    });

    return rows.map((m) => {
      const score = m.scores[0];
      const price = m.prices[0];
      return {
        modelId: m.id,
        modelName: m.nameDisplay,
        slug: m.slug,
        vendorId: m.vendorId,
        vendorName: m.vendor.name,
        vendorCode: m.vendor.code,
        vendorTierLevel: m.vendor.tierLevel,
        vendorBrandColor: m.vendor.brandColor ?? null,
        vendorCountry: m.vendor.country ?? null,
        vendorPriority: m.vendor.priority,
        score: {
          composite: Number(score?.compositeScore ?? 0),
          official: numOrNull(score?.officialScore),
          actual: numOrNull(score?.actualScore),
          review: numOrNull(score?.reviewScore),
          selfTest: numOrNull(score?.selfTestScore),
        },
        price: {
          priceInput: numOrNull(price?.priceInput),
          priceOutput: numOrNull(price?.priceOutput),
        },
        modelType: String(m.modelType),
        protocol: String(m.protocol),
        publishedAt: m.publishedAt ? m.publishedAt.toISOString() : null,
        isOpenSource: m.isOpenSource,
        contextLength: m.contextLength ?? null,
        avgLatency: null,
        uptime: null,
      };
    });
  },

  /**
   * stations 矩阵数据源：api_stations（isVerified 或 uptime 非空），
   * 平铺为同一 MatrixItem 形状：stationId→modelId、name→modelName、name 兼任 vendor 分组键（每站一列）、
   * rating（0–5 星级）→ composite（×20 归一到 0–100，见下）。
   */
  async getStationsForMatrix(client: PrismaClient = prisma): Promise<MatrixItem[]> {
    const rows = await client.aPIStation.findMany({
      where: { deletedAt: null, OR: [{ isVerified: true }, { uptime: { not: null } }] },
      orderBy: { rating: "desc" },
    });

    return rows.map((s) => ({
      modelId: s.id,
      modelName: s.name,
      slug: null,
      vendorId: s.name,
      vendorName: s.name,
      vendorCode: null,
      vendorTierLevel: 0,
      vendorBrandColor: null,
      vendorCountry: null,
      vendorPriority: 50,
      // 站点 rating 为 0–5 星级量纲；天梯矩阵的分带窗口（顶带 [100-pct,100]）、区段阈值（high80/mid60）
      // 与性能轴均按 0–100 建模。故在数据边界 ×20 归一到 0–100（单调映射不改名次序），
      // 否则 stations 综合分恒 <pct 阈值 → 顶带空 → /ladder 整页塌成「暂无数据」。
      score: { composite: Math.min(100, Math.max(0, Number(s.rating ?? 0) * 20)), official: null, actual: null, review: null, selfTest: null },
      price: { priceInput: null, priceOutput: null },
      modelType: null,
      protocol: null,
      publishedAt: null,
      isOpenSource: null,
      contextLength: null,
      avgLatency: s.avgLatency ?? null,
      uptime: s.uptime ?? null,
    }));
  },

  // ==================== L.3.3 models 三端点数据支撑 ====================

  /**
   * 模型分页列表（简表）：page/pageSize + 可选 modelType/protocol（枚举名不匹配即忽略）/keyword(ilike nameDisplay)。
   */
  async listModels(
    client: PrismaClient,
    input: { skip: number; take: number; modelType?: string; protocol?: string; keyword?: string }
  ) {
    const where = {
      isActive: true,
      status: "ACTIVE" as const,
      deletedAt: null as null,
      ...(input.modelType ? { modelType: input.modelType as never } : {}),
      ...(input.protocol ? { protocol: input.protocol as never } : {}),
      ...(input.keyword ? { nameDisplay: { contains: input.keyword, mode: "insensitive" as const } } : {}),
    };

    const [rows, total] = await Promise.all([
      client.aiModel.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        skip: input.skip,
        take: input.take,
        select: {
          id: true,
          slug: true,
          nameDisplay: true,
          modelType: true,
          protocol: true,
          isOpenSource: true,
          contextLength: true,
          vendor: { select: { name: true, brandColor: true } },
        },
      }),
      client.aiModel.count({ where }),
    ]);

    return {
      rows: rows.map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.nameDisplay,
        vendor: m.vendor.name,
        vendorBrandColor: m.vendor.brandColor ?? null,
        modelType: String(m.modelType),
        protocol: String(m.protocol),
        isOpenSource: m.isOpenSource,
        contextLength: m.contextLength ?? null,
      })),
      total,
    };
  },

  /**
   * 按 slug 或 cuid 双查模型详情聚合：vendor / 当前价(取1) / 当前评分(取1) / 基准测试(取3)。
   */
  async findModelByIdentifier(client: PrismaClient, identifier: string) {
    return client.aiModel.findFirst({
      where: { OR: [{ slug: identifier }, { id: identifier }], deletedAt: null },
      include: {
        vendor: { select: { code: true, name: true, brandColor: true, tierLevel: true } },
        prices: { where: { isCurrent: true }, take: 1, orderBy: { effectiveFrom: "desc" } },
        scores: { where: { isCurrent: true }, take: 1, orderBy: { calcVersion: "desc" } },
        benchmarks: { where: { verifiedStatus: 1 }, take: 3, orderBy: { createdAt: "desc" } },
        offerings: {
          where: { isActive: true },
          include: {
            provider: { select: { id: true, code: true, name: true, nameCn: true, rechargeRatio: true, priceCurrency: true, rechargeCurrency: true } },
          },
          orderBy: { listedAt: "desc" },
        },
      },
    });
  },

  /** 服务某模型的站台列表（pg 数组 contains → Prisma has）；空数组容忍返回 []，pricing JSON 宽松透传 */
  async listStationsServingModel(client: PrismaClient, modelName: string) {
    return client.aPIStation.findMany({
      where: { deletedAt: null, models: { has: modelName } },
      orderBy: { rating: "desc" },
    });
  },
} as const;
