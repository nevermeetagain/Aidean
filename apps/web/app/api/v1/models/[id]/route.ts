/**
 * GET /api/v1/models/[id] — 模型详情端点（Task L.3.3）。
 *
 * 按 slug 或 cuid 双查（findFirst OR）；聚合厂商品牌素材、当前价(isCurrent 取1)、
 * 当前评分(取1)、基准测试(取3)。未命中抛 ApiError(20001「模型不存在」)。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { ladderRepository } from "../../../../../lib/features/ladder/repository";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi, type RouteContext } from "../../_lib/handler";

export const dynamic = "force-dynamic";

async function loadDetail(identifier: string) {
  const m = await ladderRepository.findModelByIdentifier(prisma, identifier);
  if (!m) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");

  const price = m.prices[0];
  const score = m.scores[0];

  return {
    id: m.id,
    slug: m.slug,
    name: m.nameDisplay,
    nameCn: m.nameCn,
    nameEn: m.nameEn,
    modelType: String(m.modelType),
    protocol: String(m.protocol),
    isOpenSource: m.isOpenSource,
    contextLength: m.contextLength,
    maxOutputTokens: m.maxOutputTokens,
    parameterCount: m.parameterCount,
    officialUrl: m.officialUrl,
    docsUrl: m.docsUrl,
    publishedAt: m.publishedAt?.toISOString() ?? null,
    vendor: {
      id: m.vendorId,
      code: m.vendor.code,
      name: m.vendor.name,
      brandColor: m.vendor.brandColor ?? null,
      tierLevel: m.vendor.tierLevel,
    },
    price: price
      ? {
          priceInput: Number(price.priceInput),
          priceOutput: Number(price.priceOutput),
          billingMode: String(price.billingMode),
          billingCurrency: price.billingCurrency,
        }
      : null,
    score: score
      ? {
          compositeScore: Number(score.compositeScore),
          officialScore: score.officialScore === null ? null : Number(score.officialScore),
          actualScore: score.actualScore === null ? null : Number(score.actualScore),
          reviewScore: score.reviewScore === null ? null : Number(score.reviewScore),
          selfTestScore: score.selfTestScore === null ? null : Number(score.selfTestScore),
          calcVersion: score.calcVersion,
        }
      : null,
    benchmarks: m.benchmarks.map((b) => ({
      benchmarkType: b.benchmarkType,
      sourceType: String(b.sourceType),
      sourceName: b.sourceName ?? null,
      verifiedStatus: b.verifiedStatus ?? 0,
      totalScore: Number(b.totalScore),
      testDate: b.testDate?.toISOString() ?? null,
    })),
  };
}

export async function GET(req: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  const handle = withApi(() => loadDetail(id));
  return handle(req);
}
