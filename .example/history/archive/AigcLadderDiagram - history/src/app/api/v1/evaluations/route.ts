/**
 * GET /api/v1/evaluations
 * POST /api/v1/evaluations
 * 测评列表（公开）/ 创建测评（需认证+扣费）
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, error } from "@/lib/api/response";
import { AuthenticationError, ValidationError, InternalError, ConflictError } from "@/lib/api/errors";
import { withOptionalAuth, withAuth } from "@/lib/auth/middleware";
import { UserRoleInfo } from "@/lib/auth/rbac";

// GET - 获取测评列表（公开）
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId"); // 筛选特定用户的测评
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    const [evaluations, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
            },
          },
          models: {
            select: {
              id: true,
              modelId: true,
              score: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.evaluation.count({ where }),
    ]);
    
    return success(evaluations, {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    });
  } catch (e) {
    console.error("获取测评列表失败:", e);
    return error(new InternalError("A4CM-007", "获取测评列表失败"));
  }
}

// POST - 创建测评（需认证）
async function postHandler(req: NextRequest) {
  try {
    const user = (req as any).user as UserRoleInfo;
    
    if (!user) {
      return error(new AuthenticationError("A3AU-018", "请先登录"));
    }

    const body = (await req.json().catch(() => null)) as null | {
      name?: string;
      prompt?: string;
      modelIds?: string[];
      deductBalance?: boolean;
    };

    // 验证输入
    if (!body?.name || !body.name.trim()) {
      return error(new ValidationError([{ field: "name", message: "请输入测评名称" }]));
    }
    if (!body?.prompt || !body.prompt.trim()) {
      return error(new ValidationError([{ field: "prompt", message: "请输入测评提示词" }]));
    }
    if (!body?.modelIds || !Array.isArray(body.modelIds) || body.modelIds.length === 0) {
      return error(new ValidationError([{ field: "modelIds", message: "请至少选择一个模型" }]));
    }
    if (body.modelIds.length > 5) {
      return error(new ValidationError([{ field: "modelIds", message: "一次最多选择5个模型" }]));
    }

    // 验证模型存在
    const models = await prisma.aiModel.findMany({
      where: {
        id: { in: body.modelIds },
        status: "ACTIVE",
      },
      select: { id: true, nameDisplay: true },
    });

    if (models.length !== body.modelIds.length) {
      return error(new ValidationError([{ field: "modelIds", message: "部分模型不存在或已下架" }]));
    }

    // 计算费用（¥2/模型）
    const costPerModel = 2;
    const totalCost = costPerModel * body.modelIds.length;

    // 检查余额并扣费（使用事务）
    if (body.deductBalance !== false) {
      try {
        await prisma.$transaction(async (tx) => {
          // 获取当前用户余额
          const currentUser = await tx.user.findUnique({
            where: { id: user.userId },
            select: { balance: true, version: true },
          });

          if (!currentUser || Number(currentUser.balance) < totalCost) {
            throw new Error("余额不足");
          }

          // 乐观锁扣费
          const updated = await tx.user.updateMany({
            where: {
              id: user.userId,
              version: currentUser.version,
            },
            data: {
              balance: { decrement: totalCost },
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            throw new Error("并发冲突，请重试");
          }

          // 记录交易
          await tx.transaction.create({
            data: {
              userId: user.userId,
              type: "CHARGE",
              amount: -totalCost,
              balance: Number(currentUser.balance) - totalCost,
              description: `测评消费: ${body.name}`,
            },
          });
        });
      } catch (err: any) {
        if (err.message === "余额不足") {
          return error(new ValidationError([{ field: "balance", message: "余额不足，请先充值" }]));
        }
        if (err.message === "并发冲突，请重试") {
          return error(new ConflictError("A3CM-009", "并发冲突，请重试"));
        }
        throw err;
      }
    }

    // 创建测评记录
    const evaluation = await prisma.evaluation.create({
      data: {
        title: body.name.trim(),
        prompt: body.prompt.trim(),
        userId: user.userId,
        status: "PENDING",
        models: {
          create: body.modelIds.map((modelId) => ({
            modelId,
            status: "PENDING",
          })),
        },
      },
      include: {
        models: {
          include: {
            model: {
              select: { nameDisplay: true },
            },
          },
        },
      },
    });

    // TODO: 加入测评队列，异步执行
    // await evaluationQueue.add({ evaluationId: evaluation.id });

    return success({
      evaluation: {
        id: evaluation.id,
        name: evaluation.title,
        status: evaluation.status,
        models: evaluation.models?.map((r: any) => ({
          id: r.modelId,
          name: r.model?.nameDisplay,
          status: r.status,
        })) || [],
      },
      message: "测评已创建，正在排队执行",
    });
  } catch (e) {
    console.error("创建测评失败:", e);
    return error(new InternalError("A4CM-008", "创建测评失败"));
  }
}

export const GET = (req: NextRequest) => withOptionalAuth(req, getHandler);
export const POST = (req: NextRequest) => withAuth(req, postHandler);
