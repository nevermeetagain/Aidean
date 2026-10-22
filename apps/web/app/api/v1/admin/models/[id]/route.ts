/**
 * /api/v1/admin/models/[id] — 模型编辑 + 软删（T-2.2.1 / T-2.2.2）。
 *
 * PATCH：requireAdminApi → AdminModelPatchSchema 白名单
 *        （nameDisplay/isActive/visibility/isFeatured/sortOrder）；
 *        isActive 变更后 revalidatePath("/models")（前台 SSR 即时生效）；
 *        写 AuditLog(tableName="ai_models", action=2)。
 * DELETE：requireAdminApi → 软删（deletedAt = now()，isActive = false）；
 *        revalidatePath + ladderService.invalidateLadderCache；
 *        写 AuditLog(tableName="ai_models", action=3)。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ladderService } from "../../../../../../lib/features/ladder/service";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { writeModelChangeLog } from "../../../../../../lib/features/admin/model-change-log";
import { AdminModelPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.models.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminModelPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const before = await prisma.aiModel.findUnique({
      where: { id },
      select: {
        id: true,
        nameDisplay: true,
        isActive: true,
        visibility: true,
        isFeatured: true,
        sortOrder: true,
        deletedAt: true,
      },
    });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");
    }

    const model = await prisma.aiModel.update({
      where: { id },
      data: {
        ...(parsed.data.nameDisplay !== undefined ? { nameDisplay: parsed.data.nameDisplay } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.visibility !== undefined ? { visibility: parsed.data.visibility } : {}),
        ...(parsed.data.isFeatured !== undefined ? { isFeatured: parsed.data.isFeatured } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      },
      select: { id: true, modelCode: true, isActive: true, nameDisplay: true },
    });

    // 上下架即时影响前台 /models SSR（缓存失效）。
    // ⚠️ 两层缓存都要失效（RW-3 浏览器取证实测出的第二层缺口）：
    //   ① revalidatePath —— Next ISR 页缓存（.next 内）；
    //   ② ladderService.invalidateLadderCache —— Redis 矩阵缓存 ladder:matrix:v6:*（TTL 3600s）。
    //   只失效 ① 时，SSR 重渲染仍会从 Redis 读到**含已下架模型**的旧排行（热缓存下必现，
    //   QA-COV-01 取证时 Redis 冷、恰好未暴露）；下架「即时消失」验收依赖两层同时清。
    //   nameDisplay 变更同理想失效（排行 entries 携带展示名）；此处以 isActive 变化为主触发，
    //   nameDisplay 变化一并清（成本为一次 SCAN+UNLINK，低频管理操作可接受）。
    if (
      (parsed.data.isActive !== undefined && parsed.data.isActive !== before.isActive) ||
      (parsed.data.nameDisplay !== undefined && parsed.data.nameDisplay !== before.nameDisplay)
    ) {
      revalidatePath("/models");
      revalidatePath("/ladder");
      // try/catch 而非 .catch()：被 mock/异常返回 undefined 时链式 .catch 会炸（单测 resetAllMocks 场景）
      try {
        await ladderService.invalidateLadderCache();
      } catch {
        /* 失效失败静默：Redis 侧 TTL 3600s 兜底过期，不影响本次下架落库 */
      }
    }

    await writeAudit({
      actorId: session.userId,
      tableName: "ai_models",
      recordId: id,
      action: 2,
      changedFields: Object.keys(parsed.data),
      oldData: before,
      newData: model,
      requestId: req.headers.get("x-request-id"),
    });

    // T-1.4.2: admin 写操作留痕 ModelChangeLog
    await writeModelChangeLog({
      modelId: id,
      changeType: 'UPDATE',
      beforeData: before as Record<string, unknown>,
      afterData: model as Record<string, unknown>,
      changedFields: Object.keys(parsed.data),
      operatorId: session.userId,
      sourceIp: req.headers.get("x-forwarded-for"),
    });

    return { model: { ...model, isActive: model.isActive } };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.models.write");
    const { id } = await ctx.params;

    const before = await prisma.aiModel.findUnique({
      where: { id },
      select: {
        id: true,
        modelCode: true,
        nameDisplay: true,
        isActive: true,
        deletedAt: true,
      },
    });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");
    }

    // 软删：标记 deletedAt + 下架
    const model = await prisma.aiModel.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: { id: true, modelCode: true, nameDisplay: true, deletedAt: true },
    });

    // 与 PATCH 同理：两层缓存失效
    revalidatePath("/models");
    revalidatePath("/ladder");
    try {
      await ladderService.invalidateLadderCache();
    } catch {
      /* Redis 侧 TTL 兜底 */
    }

    await writeAudit({
      actorId: session.userId,
      tableName: "ai_models",
      recordId: id,
      action: 3, // DELETE
      changedFields: ["deletedAt", "isActive"],
      oldData: before,
      newData: model,
      requestId: req.headers.get("x-request-id"),
    });

    // T-1.4.2: admin 写操作留痕 ModelChangeLog
    await writeModelChangeLog({
      modelId: id,
      changeType: 'DELETE',
      beforeData: before as Record<string, unknown>,
      afterData: model as Record<string, unknown>,
      changedFields: ["deletedAt", "isActive"],
      operatorId: session.userId,
      sourceIp: req.headers.get("x-forwarded-for"),
    });

    return { model: { id: model.id, deletedAt: model.deletedAt?.toISOString() ?? null } };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
