/**
 * /api/v1/admin/sync/changes/[id]/revert — 回滚单条 ModelChangeLog（T-1.4.3）。
 *
 * POST：requireAdminApi → 查 ModelChangeLog by id →
 *   校验 !isReverted → 恢复 beforeData 到 AiModel（仅 UPDATE 类型可回滚）→
 *   标记 isReverted=true + revertedAt + revertReason →
 *   写 AuditLog(tableName="model_change_logs", action=2)。
 *
 * 注意：
 * - CREATE 类型回滚 = 软删模型（反向操作）
 * - DELETE 类型回滚 = 恢复模型（deletedAt=null）
 * - SYNC 类型回滚 = 恢复 beforeData（同 UPDATE）
 */

import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";
import { writeAudit } from "../../../../../_lib/audit";
import { writeModelChangeLog } from "../../../../../../../../lib/features/admin/model-change-log";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const POST = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.sync.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    const reason = body.reason ?? "管理员手动回滚";

    // 查变更记录
    const changeLog = await prisma.modelChangeLog.findUnique({
      where: { id },
      include: { model: { select: { id: true, deletedAt: true } } },
    });
    if (!changeLog) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "变更记录不存在");
    }
    if (changeLog.isReverted) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "该变更已回滚，不可重复操作");
    }

    // 根据变更类型执行回滚
    const beforeData = changeLog.beforeData as Record<string, unknown> | null;
    const modelId = changeLog.modelId;

    if (changeLog.changeType === "CREATE") {
      // CREATE 回滚 = 软删
      await prisma.aiModel.update({
        where: { id: modelId },
        data: { deletedAt: new Date(), isActive: false },
      });
    } else if (changeLog.changeType === "DELETE") {
      // DELETE 回滚 = 恢复
      await prisma.aiModel.update({
        where: { id: modelId },
        data: { deletedAt: null, isActive: true },
      });
    } else {
      // UPDATE / SYNC 回滚 = 恢复 beforeData 中的字段
      if (beforeData && typeof beforeData === "object") {
        const restoreData: Record<string, unknown> = {};
        for (const field of changeLog.changedFields) {
          if (field in beforeData) {
            restoreData[field] = beforeData[field];
          }
        }
        // Prisma update with restored fields — cast as needed
        if (Object.keys(restoreData).length > 0) {
          await prisma.aiModel.update({
            where: { id: modelId },
            data: restoreData as Prisma.AiModelUpdateInput,
          });
        }
      }
    }

    // 标记回滚
    const reverted = await prisma.modelChangeLog.update({
      where: { id },
      data: {
        isReverted: true,
        revertedAt: new Date(),
        revertReason: reason,
      },
      select: { id: true, isReverted: true, revertedAt: true },
    });

    // 写审计日志
    await writeAudit({
      actorId: session.userId,
      tableName: "model_change_logs",
      recordId: id,
      action: 2, // UPDATE
      changedFields: ["isReverted", "revertedAt", "revertReason"],
      oldData: { isReverted: false },
      newData: reverted,
      requestId: req.headers.get("x-request-id"),
    });

    // 回滚操作本身也留痕
    await writeModelChangeLog({
      modelId,
      changeType: "UPDATE",
      beforeData: { reverted: false },
      afterData: { reverted: true, reason },
      changedFields: ["isReverted"],
      operatorId: session.userId,
      sourceIp: req.headers.get("x-forwarded-for"),
    });

    return {
      reverted: true,
      changeLogId: id,
      modelId,
      revertedAt: reverted.revertedAt?.toISOString() ?? null,
      reason,
    };
  }
);
