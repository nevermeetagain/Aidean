/**
 * 公开模型详情API
 * GET /api/v1/models/:id - 返回单个模型的详细信息（含评分、价格）
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

const MODEL_TYPE_MAP: Record<string, string> = {
  CHAT: "对话", REASONING: "推理", MULTIMODAL: "多模态", CODE: "代码",
  VISION: "视觉", AUDIO: "语音", EMBEDDING: "嵌入", RERANK: "排序",
  ASR: "语音识别", TTS: "语音合成", IMAGE_GEN: "图像生成", VIDEO: "视频",
  SYSTEM: "系统级",
};

const PROTOCOL_MAP: Record<string, string> = {
  OPENAI: "API", ANTHROPIC: "API", GOOGLE: "API", CUSTOM: "混合",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const model = await prisma.aiModel.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id },
          { modelCode: params.id },
        ],
        deletedAt: null,
        visibility: "PUBLIC",
      },
      include: {
        vendor: { select: { id: true, name: true, brandColor: true } },
        scores: {
          where: { calcVersion: { gte: 1 } },
          orderBy: { calcVersion: "desc" },
          take: 1,
        },
        prices: {
          where: { isCurrent: true },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });

    if (!model) {
      return errorResponse("模型不存在");
    }

    const score = (model as any).scores?.[0];
    const price = (model as any).prices?.[0];
    const vendor = (model as any).vendor;
    const vendorName = vendor?.name || "未知";
    const vendorColor = vendor?.brandColor || "#6366f1";

    const result = {
      id: model.id,
      name: model.nameDisplay,
      vendor: vendorName,
      vendorColor,
      type: MODEL_TYPE_MAP[model.modelType] || "对话",
      protocol: model.isOpenSource ? "开源" : (PROTOCOL_MAP[model.protocol] || "闭源"),
      score: score?.compositeScore ? Number(score.compositeScore) : (model.benchmarkScore ?? 0),
      contextK: model.contextLength ? Math.round(model.contextLength / 1000) : 0,
      speed: score?.efficiencyScore ? Number(score.efficiencyScore) : 50,
      price: price?.priceInput ? Number(price.priceInput) : 0,
      openSource: model.isOpenSource,
      tags: model.tags || [],
      summary: model.nameCn || model.nameDisplay,
      highlights: [] as string[],
      slug: model.slug,
      modelCode: model.modelCode,
      parameterCount: model.parameterCount,
      contextLength: model.contextLength,
      maxOutputTokens: model.maxOutputTokens,
      isMultiModal: model.isMultiModal,
      isReasoning: model.isReasoning,
      isCodingOptimized: model.isCodingOptimized,
      officialUrl: model.officialUrl,
      docsUrl: model.docsUrl,
      githubUrl: model.githubUrl,
      paperUrl: model.paperUrl,
      publishedAt: model.publishedAt?.toISOString() || null,
      description: model.nameCn || model.nameDisplay,
      nameCn: model.nameCn,
      nameEn: model.nameEn,
      vendorLogo: vendor?.logoUrl || null,
      vendorCode: vendor?.code || null,
      scores: score ? {
        official: Number(score.officialScore || 0),
        actual: Number(score.actualScore || 0),
        review: Number(score.reviewScore || 0),
        selfTest: Number(score.selfTestScore || 0),
        reasoning: Number(score.reasoningScore || 0),
        coding: Number(score.codingScore || 0),
        math: Number(score.mathScore || 0),
        multilingual: Number(score.multilingualScore || 0),
        creativity: Number(score.creativityScore || 0),
        instruction: Number(score.instructionScore || 0),
        safety: Number(score.safetyScore || 0),
        efficiency: Number(score.efficiencyScore || 0),
        value: Number(score.valueScore || 0),
        composite: Number(score.compositeScore || 0),
      } : null,
      priceInfo: price ? {
        input: Number(price.priceInput),
        output: Number(price.priceOutput),
        cache: price.priceCache ? Number(price.priceCache) : null,
        currency: price.billingCurrency,
      } : null,
    };

    return successResponse(result);
  } catch (error) {
    console.error("[Model Detail API Error]", error);
    return errorResponse("获取模型详情失败");
  }
}
