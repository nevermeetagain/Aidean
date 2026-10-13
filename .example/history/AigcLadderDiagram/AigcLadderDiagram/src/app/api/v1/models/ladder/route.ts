/**
 * 公开天梯图数据API
 * GET /api/v1/models/ladder - 返回天梯图所需的模型列表（含评分、价格）
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// ModelType枚举→中文映射（与demoModels.ts对齐）
const MODEL_TYPE_MAP: Record<string, string> = {
  CHAT: "对话",
  REASONING: "推理",
  MULTIMODAL: "多模态",
  CODE: "代码",
  VISION: "视觉",
  AUDIO: "语音",
  EMBEDDING: "嵌入",
  RERANK: "排序",
  ASR: "语音识别",
  TTS: "语音合成",
  IMAGE_GEN: "图像生成",
  VIDEO: "视频",
  SYSTEM: "系统级",
};

// 协议映射
const PROTOCOL_MAP: Record<string, string> = {
  OPENAI: "API",
  ANTHROPIC: "API",
  GOOGLE: "API",
  CUSTOM: "混合",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind") || "default"; // default|mobile|image|video|audio
    const keyword = searchParams.get("keyword") || undefined;
    const vendor = searchParams.get("vendor") || undefined;
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);
    const modelType = searchParams.get("modelType") || undefined;
    const isOpenSource = searchParams.get("isOpenSource");
    const sortBy = searchParams.get("sortBy") || "composite"; // composite|score|price|speed|context
    const sortOrder = searchParams.get("sortOrder") || "desc"; // asc|desc
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // 按kind筛选modelType
    const typeFilter: string[] = [];
    if (kind === "image") {
      typeFilter.push("VISION", "IMAGE_GEN", "MULTIMODAL");
    } else if (kind === "video") {
      typeFilter.push("VIDEO", "MULTIMODAL");
    } else if (kind === "audio") {
      typeFilter.push("AUDIO", "ASR", "TTS");
    } else if (kind === "mobile") {
      typeFilter.push("CHAT", "REASONING", "CODE", "MULTIMODAL");
    }
    // modelType参数覆盖kind筛选
    if (modelType) {
      typeFilter.length = 0;
      typeFilter.push(...modelType.split(","));
    }

    const where: any = {
      deletedAt: null,
      visibility: "PUBLIC",
      isActive: true,
    };
    if (typeFilter.length > 0) {
      where.modelType = { in: typeFilter };
    }
    if (keyword) {
      where.OR = [
        { nameDisplay: { contains: keyword, mode: "insensitive" } },
        { nameCn: { contains: keyword, mode: "insensitive" } },
        { modelCode: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (vendor) {
      const vendorNames = vendor.split(",").filter(Boolean);
      where.vendor = {
        is: {
          OR: vendorNames.flatMap((name) => [
            { name: { equals: name, mode: "insensitive" } },
            { nameCn: { equals: name, mode: "insensitive" } },
            { code: { equals: name, mode: "insensitive" } },
          ]),
        },
      };
    }
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }
    if (isOpenSource !== null && isOpenSource !== undefined) {
      where.isOpenSource = isOpenSource === "true";
    }

    // 动态排序
    const orderBy: any = {};
    if (sortBy === "score") orderBy.benchmarkScore = sortOrder;
    else if (sortBy === "context") orderBy.contextLength = sortOrder;
    else orderBy.benchmarkScore = sortOrder; // composite/default

    const [total, models] = await Promise.all([
      prisma.aiModel.count({ where }),
      prisma.aiModel.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
      }),
    ]);

    // 转换为天梯图前端所需格式（与DemoModel对齐）
    let items = models.map((m) => {
      const score = (m as any).scores?.[0];
      const price = (m as any).prices?.[0];
      const vendor = (m as any).vendor;
      const vendorName = vendor?.name || "未知";
      const vendorColor = vendor?.brandColor || "#6366f1";

      return {
        id: m.id,
        name: m.nameDisplay,
        vendor: vendorName,
        vendorColor,
        type: MODEL_TYPE_MAP[m.modelType] || "对话",
        protocol: m.isOpenSource ? "开源" : (PROTOCOL_MAP[m.protocol] || "闭源"),
        score: score?.compositeScore ? Number(score.compositeScore) : (m.benchmarkScore ?? 0),
        contextK: m.contextLength ? Math.round(m.contextLength / 1000) : 0,
        speed: score?.efficiencyScore ? Number(score.efficiencyScore) : 50,
        price: price?.priceInput ? Number(price.priceInput) : 0,
        openSource: m.isOpenSource,
        tags: m.tags || [],
        summary: m.nameCn || m.nameDisplay,
        highlights: [] as string[],
        // 额外字段：详情页需要
        slug: m.slug,
        modelCode: m.modelCode,
        parameterCount: m.parameterCount,
        contextLength: m.contextLength,
        maxOutputTokens: m.maxOutputTokens,
        isMultiModal: m.isMultiModal,
        isReasoning: m.isReasoning,
        isCodingOptimized: m.isCodingOptimized,
        officialUrl: m.officialUrl,
        docsUrl: m.docsUrl,
        githubUrl: m.githubUrl,
        paperUrl: m.paperUrl,
        publishedAt: m.publishedAt?.toISOString() || null,
        nameCn: m.nameCn,
        nameEn: m.nameEn,
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
    });

    if (sortBy === "price") {
      items = items.sort((a, b) => {
        const diff = a.price - b.price;
        return sortOrder === "asc" ? diff : -diff;
      });
    }

    // 提取所有厂商和标签用于筛选
    const allVendors = [...new Set(items.map((m) => m.vendor))];
    const allTags = [...new Set(items.flatMap((m) => m.tags))];

    return successResponse({
      items,
      vendors: allVendors,
      tags: allTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        vendors: allVendors,
        tags: allTags,
      },
    });
  } catch (error) {
    console.error("[Ladder API Error]", error);
    return errorResponse("获取天梯图数据失败");
  }
}
