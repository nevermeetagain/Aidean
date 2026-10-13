/**
 * GET /api/v1/models
 * 获取模型列表（公开API）
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, error } from "@/lib/api/response";
import { InternalError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 解析查询参数
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const type = searchParams.get("type"); // 模型类型过滤
    const vendor = searchParams.get("vendor"); // 厂商过滤
    const isOpenSource = searchParams.get("isOpenSource"); // 是否开源
    const search = searchParams.get("search"); // 搜索关键词
    
    // 构建查询条件
    const where: any = {
      status: "ACTIVE",
    };
    
    if (type) {
      // 兼容常见别名: LLM→CHAT, 对话→CHAT 等
      const TYPE_MAP: Record<string, string> = {
        LLM: 'CHAT',
        CHAT: 'CHAT',
        对话: 'CHAT',
        REASONING: 'REASONING',
        推理: 'REASONING',
        MULTIMODAL: 'MULTIMODAL',
        多模态: 'MULTIMODAL',
        CODE: 'CODE',
        代码: 'CODE',
        VISION: 'VISION',
        视觉: 'VISION',
        AUDIO: 'AUDIO',
        语音: 'AUDIO',
        EMBEDDING: 'EMBEDDING',
        嵌入: 'EMBEDDING',
        IMAGE_GEN: 'IMAGE_GEN',
        图像生成: 'IMAGE_GEN',
        VIDEO: 'VIDEO',
        视频: 'VIDEO',
      };
      where.modelType = TYPE_MAP[type.toUpperCase()] || type.toUpperCase();
    }
    
    if (vendor) {
      where.vendorId = vendor;
    }
    
    if (isOpenSource !== null) {
      where.isOpenSource = isOpenSource === "true";
    }
    
    if (search) {
      where.OR = [
        { nameDisplay: { contains: search, mode: "insensitive" } },
        { nameCn: { contains: search, mode: "insensitive" } },
      ];
    }
    
    // 查询模型列表
    const [models, total] = await Promise.all([
      prisma.aiModel.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aiModel.count({ where }),
    ]);
    
    // 格式化响应
    const data = models.map((model: any) => ({
      id: model.id,
      name: model.nameDisplay,
      slug: model.slug,
      type: model.modelType,
      description: model.nameCn,
      isOpenSource: model.isOpenSource,
      contextWindow: model.contextLength,
      parameters: model.parameterCount,
      vendor: model.vendor,
      favorites: 0, // TODO: 实现收藏计数
      publishedAt: model.publishedAt,
    }));
    
    return success(data, {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    });
  } catch (e) {
    console.error("获取模型列表失败:", e);
    return error(new InternalError("A4CM-003", "获取模型列表失败"));
  }
}

// 缓存配置：10分钟
export const revalidate = 600;
