/**
 * PATCH  /api/v1/admin/free-quotas/[id] — update (quotaTokens/refreshCycle)
 * DELETE /api/v1/admin/free-quotas/[id] — delete
 *
 * #18 L4: 免费额度配置 admin CRUD。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.free-quotas.write");
    const { id } = await ctx.params;

    const existing = await prisma.userFreeQuota.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "免费额度配置不存在");
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const { quotaTokens, refreshCycle } = body;

    const validCycles = ["DAY", "WEEK", "MONTH"];
    if (refreshCycle !== undefined && !validCycles.includes(String(refreshCycle))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `refreshCycle 必须为 ${validCycles.join("/")} 之一`);
    }

    if (quotaTokens !== undefined) {
      const tokens = Number(quotaTokens);
      if (!Number.isFinite(tokens) || tokens < 0) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "quotaTokens 必须为非负数");
      }
    }

    const updated = await prisma.userFreeQuota.update({
      where: { id },
      data: {
        ...(quotaTokens !== undefined ? { quotaTokens: Number(quotaTokens) } : {}),
        ...(refreshCycle !== undefined ? { refreshCycle: String(refreshCycle) as "DAY" | "WEEK" | "MONTH" } : {}),
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "user_free_quotas",
      recordId: id,
      action: 2,
      changedFields: Object.keys(body),
      oldData: { quotaTokens: existing.quotaTokens, refreshCycle: existing.refreshCycle },
      newData: { quotaTokens: updated.quotaTokens, refreshCycle: updated.refreshCycle },
      requestId: req.headers.get("x-request-id"),
    });

    return { item: updated };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.free-quotas.write");
    const { id } = await ctx.params;

    const existing = await prisma.userFreeQuota.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "免费额度配置不存在");
    }

    await prisma.userFreeQuota.delete({ where: { id } });

    await writeAudit({
      actorId: session.userId,
      tableName: "user_free_quotas",
      recordId: id,
      action: 3,
      changedFields: ["deleted"],
      oldData: { tier: existing.tier, modelId: existing.modelId, quotaTokens: existing.quotaTokens },
      requestId: req.headers.get("x-request-id"),
    });

    return { deleted: true, id };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
